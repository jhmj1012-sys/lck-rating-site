import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { TopSiteNav } from "@/components/TopSiteNav";
import { getScheduleHubData, getSeasonPredictionListData } from "@/lib/service";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export default async function SeasonPredictionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;
  const category = Array.isArray(params.category) ? params.category[0] : params.category;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;

  const [data, hubData] = await Promise.all([
    getSeasonPredictionListData(session?.user?.id ?? null, { category, status }),
    getScheduleHubData(session?.user?.id ?? null),
  ]);

  return (
    <div>
      <TopSiteNav
        active="season"
        notifications={hubData.notifications}
        unreadNotificationCount={hubData.unreadNotificationCount}
      />

      <main className="app-shell px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Season Predictions</div>
              <h1 className="mt-2 text-3xl font-black text-slate-950">시즌예측</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">시즌 전체 흐름을 읽고 마감 전 예측에 참여해 보세요.</p>
            </div>
            <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700">
              홈으로 돌아가기
            </Link>
          </div>

          <form className="grid gap-3 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:grid-cols-2">
            <select name="category" defaultValue={data.selectedCategory} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <option value="all">전체 카테고리</option>
              {data.categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select name="status" defaultValue={data.selectedStatus} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <option value="all">전체 상태</option>
              <option value="open">진행중</option>
              <option value="locked">마감</option>
              <option value="resolved">결과확정</option>
              <option value="canceled">취소</option>
            </select>
            <div className="sm:col-span-2">
              <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-sky-500 px-5 text-sm font-semibold text-white">
                필터 적용
              </button>
            </div>
          </form>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.items.map((item) => (
              <article key={item.id} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">{item.category}</div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{item.status}</div>
                </div>
                <h2 className="mt-4 text-xl font-black text-slate-950">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                <div className="mt-4 space-y-2 text-sm text-slate-500">
                  <div>{item.season}</div>
                  <div>마감 {formatDate(item.closeAt)}</div>
                  <div>참여 {item.totalEntries}명</div>
                  <div>{item.mySelectionLabel ? `내 선택: ${item.mySelectionLabel}` : "아직 참여하지 않음"}</div>
                </div>
                <Link href={`/season-predictions/${item.id}`} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-2xl bg-sky-500 px-5 text-sm font-semibold text-white">
                  {item.isParticipating ? "내 예측 보기" : "선택하기"}
                </Link>
              </article>
            ))}
            {data.items.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-sm text-slate-500 md:col-span-2 xl:col-span-3">
                조건에 맞는 시즌예측이 없습니다.
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}

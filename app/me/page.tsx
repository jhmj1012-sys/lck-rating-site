import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/authz";
import { getMyPageData } from "@/lib/service";
import { equipStoreItemAction, purchaseStoreItemAction, saveNicknameAction } from "./actions";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export default async function MyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }

  const data = await getMyPageData(user.id);
  const params = await searchParams;
  const setupMode = params.setup === "1";
  const success = typeof params.success === "string" ? decodeURIComponent(params.success) : null;
  const error = typeof params.error === "string" ? decodeURIComponent(params.error) : null;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">My Page</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">내 계정과 활동 기록</h1>
          </div>
          <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700">
            일정으로 돌아가기
          </Link>
        </div>

        {success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div> : null}
        {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div> : null}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-sm font-semibold text-sky-700">
                  {data.profile.selectedBadge ?? (data.profile.hasNickname ? "대표 배지 없음" : "닉네임 설정 필요")}
                </div>
                <h2 className="mt-2 text-3xl font-black text-slate-950">{data.profile.nickname}</h2>
                <p className="mt-2 text-sm text-slate-600">{data.profile.bio ?? "아직 자기소개가 없습니다."}</p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
                  <span>포인트 {data.profile.points.toLocaleString()}P</span>
                  <span>레벨 Lv.{data.profile.level}</span>
                  <span>테마 {data.profile.selectedProfileTheme ?? "기본"}</span>
                </div>
              </div>

              <div className="grid min-w-[220px] grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">적중</div>
                  <div className="mt-2 text-2xl font-black text-slate-950">{data.profile.predictionStats.hit}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">연속 적중</div>
                  <div className="mt-2 text-2xl font-black text-slate-950">{data.profile.predictionStats.streak}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-700">Nickname</div>
            <h2 className="mt-2 text-2xl font-black text-slate-950">{setupMode || !data.profile.hasNickname ? "닉네임 설정" : "닉네임 변경"}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              공개 화면에서는 Google 실명이 아니라 닉네임만 노출됩니다. 한글, 영문, 숫자, 점, 밑줄, 하이픈을 사용할 수 있습니다.
            </p>

            <form action={saveNicknameAction} className="mt-5 space-y-3">
              <input
                type="text"
                name="nickname"
                defaultValue={user.nickname ?? ""}
                placeholder="2-16자 닉네임"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
              />
              <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-sky-500 px-5 text-sm font-semibold text-white">
                닉네임 저장
              </button>
            </form>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            <h2 className="text-xl font-bold text-slate-950">내 예측</h2>
            <div className="mt-4 space-y-3">
              {data.predictions.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-slate-950">{item.matchLabel}</div>
                    <div className="text-sm text-slate-500">{item.resultLabel}</div>
                  </div>
                  <div className="mt-2 text-sm text-slate-600">선택 팀 {item.selectedTeam}</div>
                  <div className="mt-2 text-xs text-slate-500">마지막 저장 {formatDateTime(item.updatedAt)}</div>
                </div>
              ))}
              {data.predictions.length === 0 ? <div className="text-sm text-slate-500">아직 남긴 예측이 없습니다.</div> : null}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            <h2 className="text-xl font-bold text-slate-950">내 평점</h2>
            <div className="mt-4 space-y-3">
              {data.ratings.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-slate-950">
                      {item.matchLabel}
                      {item.setNumber ? ` · 세트 ${item.setNumber}` : ""}
                    </div>
                    <div className="text-sm font-semibold text-slate-700">{item.score.toFixed(1)}점</div>
                  </div>
                  <div className="mt-2 text-sm text-slate-600">{item.team} {item.playerName}</div>
                  <div className="mt-2 text-xs text-slate-500">마지막 저장 {formatDateTime(item.updatedAt)}</div>
                </div>
              ))}
              {data.ratings.length === 0 ? <div className="text-sm text-slate-500">아직 남긴 평점이 없습니다.</div> : null}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            <h2 className="text-xl font-bold text-slate-950">내 댓글</h2>
            <div className="mt-4 space-y-3">
              {data.comments.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-slate-950">{item.matchLabel}</div>
                    <div className="text-sm text-slate-500">{item.hidden ? "숨김 처리됨" : "공개 중"}</div>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{item.text}</p>
                  <div className="mt-2 text-xs text-slate-500">{formatDateTime(item.createdAt)}</div>
                </div>
              ))}
              {data.comments.length === 0 ? <div className="text-sm text-slate-500">아직 작성한 댓글이 없습니다.</div> : null}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
            <h2 className="text-xl font-bold text-slate-950">포인트 장부</h2>
            <div className="mt-4 space-y-3">
              {data.pointLedger.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <div className="font-semibold text-slate-950">{item.reason}</div>
                    <div className="mt-1 text-xs text-slate-500">{formatDateTime(item.createdAt)}</div>
                  </div>
                  <div className="text-right">
                    <div className={item.type === "earn" ? "text-sm font-semibold text-emerald-700" : "text-sm font-semibold text-rose-700"}>
                      {item.type === "earn" ? "+" : "-"}
                      {item.amount}P
                    </div>
                    <div className="mt-1 text-xs text-slate-500">잔액 {item.balanceAfter}P</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-950">프로필 꾸미기 상점</h2>
              <p className="mt-2 text-sm text-slate-600">포인트로 배지와 프로필 테마를 구매하고 바로 장착할 수 있습니다.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              현재 포인트 {data.profile.points.toLocaleString()}P
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.storeItems.map((item) => (
              <div key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.type}</div>
                    <div className="mt-1 text-lg font-bold text-slate-950">{item.label}</div>
                  </div>
                  <div className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700">{item.price}P</div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
                <div className="mt-4 flex gap-2">
                  {item.owned ? (
                    <form action={equipStoreItemAction}>
                      <input type="hidden" name="storeItemId" value={item.id} />
                      <button
                        type="submit"
                        className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700"
                      >
                        {item.equipped ? "장착 중" : "장착하기"}
                      </button>
                    </form>
                  ) : (
                    <form action={purchaseStoreItemAction}>
                      <input type="hidden" name="storeItemId" value={item.id} />
                      <button
                        type="submit"
                        className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-sky-500 px-4 text-sm font-semibold text-white"
                      >
                        구매하기
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

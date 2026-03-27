import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/authz";
import { getMyPageData } from "@/lib/service";
import { saveNicknameAction } from "./actions";
import { AccountActions } from "./AccountActions";

const PAGE_SIZE = 5;

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositivePage(value: string | undefined) {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function buildPageHref(
  baseParams: URLSearchParams,
  key: "predPage" | "ledgerPage" | "commentPage",
  page: number,
) {
  const params = new URLSearchParams(baseParams.toString());
  if (page <= 1) {
    params.delete(key);
  } else {
    params.set(key, String(page));
  }

  const query = params.toString();
  return query ? `/me?${query}` : "/me";
}

function paginate<T>(items: T[], page: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  return {
    items: items.slice(start, start + PAGE_SIZE),
    page: safePage,
    totalPages,
  };
}

function Pagination({
  page,
  totalPages,
  hrefForPage,
}: {
  page: number;
  totalPages: number;
  hrefForPage: (nextPage: number) => string;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {Array.from({ length: totalPages }, (_, index) => index + 1).map((value) => (
        <Link
          key={value}
          href={hrefForPage(value)}
          className={
            value === page
              ? "inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-slate-900 px-3 text-sm font-semibold text-white"
              : "inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          }
        >
          {value}
        </Link>
      ))}
    </div>
  );
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
  const setupMode = readParam(params.setup) === "1";
  const success = readParam(params.success);
  const error = readParam(params.error);

  const baseParams = new URLSearchParams();
  const setupValue = readParam(params.setup);
  if (setupValue) {
    baseParams.set("setup", setupValue);
  }

  const predictionPage = parsePositivePage(readParam(params.predPage));
  const ledgerPage = parsePositivePage(readParam(params.ledgerPage));
  const commentPage = parsePositivePage(readParam(params.commentPage));

  const predictionSlice = paginate(data.predictions, predictionPage);
  const ledgerSlice = paginate(data.pointLedger, ledgerPage);
  const commentSlice = paginate(data.comments, commentPage);

  return (
    <main className="app-shell px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">My Page</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">내 예측 기록</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              홈으로 돌아가기
            </Link>
            <Link
              href="/notifications"
              className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              알림 보기
            </Link>
            <AccountActions hasNickname={Boolean(data.profile.hasNickname)} />
          </div>
        </div>

        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {decodeURIComponent(success)}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {decodeURIComponent(error)}
          </div>
        ) : null}

        {setupMode || !data.profile.hasNickname ? (
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Nickname</div>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  {data.profile.hasNickname ? "닉네임 변경" : "닉네임 설정"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  공개 화면에는 Google 실명이 아닌 닉네임만 노출됩니다. 한글, 영문, 숫자, 밑줄, 하이픈을 사용할 수 있습니다.
                </p>
              </div>
              <form action={saveNicknameAction} className="flex w-full max-w-xl flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  name="nickname"
                  required
                  minLength={2}
                  maxLength={16}
                  defaultValue={data.profile.hasNickname ? data.profile.nickname : ""}
                  placeholder="닉네임을 입력해 주세요"
                  className="min-h-12 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition focus:border-sky-400 focus:bg-white"
                />
                <button
                  type="submit"
                  className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-2xl bg-sky-600 px-5 text-sm font-semibold text-white transition hover:bg-sky-700"
                >
                  닉네임 저장
                </button>
              </form>
            </div>
          </section>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_320px]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-sky-700">
                  {data.profile.selectedBadge ?? (data.profile.hasNickname ? "장착한 팀 배지 없음" : "닉네임 설정 필요")}
                </div>
                <h2 className="mt-2 truncate text-3xl font-black text-slate-950">{data.profile.nickname}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{data.profile.bio ?? "아직 소개 문구가 없습니다."}</p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
                  <span>보유 코인 {data.profile.points.toLocaleString()}</span>
                  <span>레벨 Lv.{data.profile.level}</span>
                  <span>예측 성향 {data.predictionStyleLabel}</span>
                </div>
              </div>

              <div className="grid min-w-[240px] grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">총 예측</div>
                  <div className="mt-2 text-2xl font-black text-slate-950">{data.profile.predictionStats.total}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">적중률</div>
                  <div className="mt-2 text-2xl font-black text-slate-950">{data.profile.predictionAccuracy}%</div>
                </div>
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

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <div className="rounded-[24px] border border-sky-100 bg-sky-50 px-5 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Earn</div>
                <div className="mt-2 font-bold text-slate-950">예측 참여 +10 Coin</div>
                <div className="mt-2 text-sm leading-6 text-slate-600">마감 후 확정 배당 기준으로 적중 추가 보상이 지급됩니다.</div>
              </div>
              <div className="rounded-[24px] border border-sky-100 bg-sky-50 px-5 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Track</div>
                <div className="mt-2 font-bold text-slate-950">정산 결과를 기록으로 확인</div>
                <div className="mt-2 text-sm leading-6 text-slate-600">예측 기록과 코인 내역에서 어떤 경기로 보상을 받았는지 볼 수 있습니다.</div>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Flow</div>
                <div className="mt-2 font-bold text-slate-950">예측 성향과 평균 비교</div>
                <div className="mt-2 text-sm leading-6 text-slate-600">참여자 평균과 비교해 내 예측 스타일을 확인할 수 있습니다.</div>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Account</div>
              <h2 className="mt-2 text-xl font-black text-slate-950">내 활동 요약</h2>
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs text-slate-500">보유 코인</div>
                  <div className="mt-1 text-2xl font-black text-slate-950">{data.profile.points.toLocaleString()}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs text-slate-500">읽지 않은 알림</div>
                  <div className="mt-1 text-2xl font-black text-slate-950">{data.unreadNotificationCount}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs text-slate-500">사용 중인 테마</div>
                  <div className="mt-1 text-base font-bold text-slate-950">{data.profile.selectedProfileTheme ?? "기본 테마"}</div>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Prediction Insights</div>
            <h2 className="mt-2 text-2xl font-black text-slate-950">내 예측 지표</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {data.predictionInsights.map((item) => (
                <div key={item.label} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="text-sm text-slate-500">{item.label}</div>
                  <div className="mt-2 text-2xl font-black text-slate-950">{item.value}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">{item.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Compare</div>
            <h2 className="mt-2 text-2xl font-black text-slate-950">내 예측 vs 참여자 평균</h2>
            <div className="mt-4 space-y-3">
              {data.predictionComparison.map((item) => (
                <div key={item.label} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-950">{item.label}</div>
                      <div className="mt-2 text-sm leading-6 text-slate-600">{item.summary}</div>
                    </div>
                    <div className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-sky-700">{item.delta}</div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                      <div className="text-xs text-slate-500">내 기록</div>
                      <div className="mt-1 font-bold text-slate-950">{item.myValue}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                      <div className="text-xs text-slate-500">참여자 평균</div>
                      <div className="mt-1 font-bold text-slate-950">{item.averageValue}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Prediction History</div>
                <h2 className="mt-2 text-xl font-black text-slate-950">최근 예측 기록</h2>
              </div>
              <div className="text-sm text-slate-500">{data.predictions.length}개</div>
            </div>
            <div className="mt-4 space-y-2.5">
              {predictionSlice.items.map((prediction) => (
                <div key={prediction.id} className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="font-semibold text-slate-950">{prediction.matchLabel}</div>
                  <div className="mt-1 text-sm text-slate-600">{prediction.selectedTeam} 선택 · {prediction.resultLabel}</div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>{formatDateTime(prediction.submittedAt)}</span>
                    {prediction.lockedOddsPercent ? <span>확정 배당 {prediction.lockedOddsPercent}%</span> : null}
                    {prediction.wasUnderdogPick ? <span>언더독 선택</span> : null}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-emerald-700">+{10 + prediction.settlementCoins} Coin</div>
                </div>
              ))}
              {data.predictions.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  아직 참여한 예측 기록이 없습니다.
                </div>
              ) : null}
            </div>
            <Pagination
              page={predictionSlice.page}
              totalPages={predictionSlice.totalPages}
              hrefForPage={(page) => buildPageHref(baseParams, "predPage", page)}
            />
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Coin Ledger</div>
                <h2 className="mt-2 text-xl font-black text-slate-950">최근 코인 내역</h2>
              </div>
              <div className="text-sm text-slate-500">{data.pointLedger.length}개</div>
            </div>
            <div className="mt-4 space-y-2.5">
              {ledgerSlice.items.map((entry) => (
                <div key={entry.id} className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-950">{entry.reason}</div>
                      <div className="mt-1 text-xs text-slate-500">{formatDateTime(entry.createdAt)}</div>
                    </div>
                    <div className={entry.type === "earn" ? "text-sm font-black text-emerald-700" : "text-sm font-black text-rose-600"}>
                      {entry.type === "earn" ? "+" : "-"}
                      {entry.amount} Coin
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">반영 후 잔액 {entry.balanceAfter}</div>
                </div>
              ))}
              {data.pointLedger.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  아직 코인 내역이 없습니다.
                </div>
              ) : null}
            </div>
            <Pagination
              page={ledgerSlice.page}
              totalPages={ledgerSlice.totalPages}
              hrefForPage={(page) => buildPageHref(baseParams, "ledgerPage", page)}
            />
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">My Comments</div>
                <h2 className="mt-2 text-xl font-black text-slate-950">내 댓글 내역</h2>
              </div>
              <div className="text-sm text-slate-500">{data.comments.length}개</div>
            </div>
            <div className="mt-4 space-y-2.5">
              {commentSlice.items.map((comment) => (
                <div key={comment.id} className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-slate-950">{comment.matchLabel}</div>
                    <div className="text-xs text-slate-500">{formatDateTime(comment.createdAt)}</div>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{comment.text}</p>
                </div>
              ))}
              {data.comments.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  아직 작성한 댓글이 없습니다.
                </div>
              ) : null}
            </div>
            <Pagination
              page={commentSlice.page}
              totalPages={commentSlice.totalPages}
              hrefForPage={(page) => buildPageHref(baseParams, "commentPage", page)}
            />
          </div>
        </section>
      </div>
    </main>
  );
}


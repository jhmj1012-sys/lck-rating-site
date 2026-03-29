import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/authz";
import { getMyPageData } from "@/lib/service";
import { saveNicknameAction } from "./actions";
import { AccountActions } from "./AccountActions";

const PAGE_SIZE = 5;

type TabKey = "profile" | "metrics" | "predictions" | "season" | "coins" | "history";
type HistoryType = "all" | "rating" | "comment";

type HistoryItem = {
  kind: "rating" | "comment";
  id: string;
  matchLabel: string;
  createdAt: string;
  score?: number;
  playerName?: string;
  team?: string;
  text?: string;
};

const TAB_LIST: Array<{ key: TabKey; label: string; description: string }> = [
  { key: "profile", label: "프로필", description: "핵심 요약" },
  { key: "metrics", label: "예측 지표", description: "내 지표와 평균 비교" },
  { key: "predictions", label: "내 예측 기록", description: "경기별 예측 이력" },
  { key: "season", label: "시즌예측 내역", description: "장기 예측 참여 내역" },
  { key: "coins", label: "코인 내역", description: "적립/사용 내역" },
  { key: "history", label: "히스토리", description: "평점 + 댓글" },
];

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

function normalizeTab(value: string | undefined): TabKey {
  if (!value) {
    return "profile";
  }
  return TAB_LIST.some((tab) => tab.key === value) ? (value as TabKey) : "profile";
}

function normalizeHistoryType(value: string | undefined): HistoryType {
  if (value === "rating" || value === "comment") {
    return value;
  }
  return "all";
}

function toParamsObject(raw: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    const normalized = readParam(value);
    if (!normalized) {
      continue;
    }
    params.set(key, normalized);
  }
  return params;
}

function buildHref(base: URLSearchParams, patch: Record<string, string | null | undefined>) {
  const params = new URLSearchParams(base.toString());
  for (const [key, value] of Object.entries(patch)) {
    if (!value) {
      params.delete(key);
      continue;
    }
    params.set(key, value);
  }
  const query = params.toString();
  return query ? `/me?${query}` : "/me";
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
              ? "inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-slate-950 bg-slate-950 px-3 text-sm font-semibold !text-white shadow-[0_8px_20px_rgba(15,23,42,0.16)]"
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

  const rawParams = await searchParams;
  const urlParams = toParamsObject(rawParams);
  const data = await getMyPageData(user.id);

  const setupMode = readParam(rawParams.setup) === "1";
  const success = readParam(rawParams.success);
  const error = readParam(rawParams.error);

  const currentTab = normalizeTab(readParam(rawParams.tab));
  const seasonFilter = readParam(rawParams.seasonFilter) ?? "all";
  const historyType = normalizeHistoryType(readParam(rawParams.historyType));

  const predictionPage = parsePositivePage(readParam(rawParams.predPage));
  const seasonPredictionPage = parsePositivePage(readParam(rawParams.seasonPredPage));
  const ledgerPage = parsePositivePage(readParam(rawParams.ledgerPage));
  const historyPage = parsePositivePage(readParam(rawParams.historyPage));

  const predictionSlice = paginate(data.predictions, predictionPage);

  const filteredSeasonPredictions = data.seasonPredictions.filter((item) => {
    if (seasonFilter === "all") return true;
    if (seasonFilter === "open") return item.status === "open";
    if (seasonFilter === "locked") return item.status === "locked";
    if (seasonFilter === "hit") return item.hitStatus === "hit";
    if (seasonFilter === "miss") return item.hitStatus === "miss";
    return true;
  });
  const seasonPredictionSlice = paginate(filteredSeasonPredictions, seasonPredictionPage);

  const ledgerSlice = paginate(data.pointLedger, ledgerPage);

  const mergedHistory = [
    ...data.ratings.map((rating): HistoryItem => ({
      kind: "rating",
      id: rating.id,
      matchLabel: rating.matchLabel,
      createdAt: rating.updatedAt ?? rating.createdAt,
      score: rating.score,
      playerName: rating.playerName,
      team: rating.team,
    })),
    ...data.comments.map((comment): HistoryItem => ({
      kind: "comment",
      id: comment.id,
      matchLabel: comment.matchLabel,
      createdAt: comment.createdAt,
      text: comment.text,
    })),
  ]
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredHistory = mergedHistory.filter((item) => {
    if (historyType === "all") return true;
    return item.kind === historyType;
  });
  const historySlice = paginate(filteredHistory, historyPage);

  const tabHref = (tab: TabKey) =>
    buildHref(urlParams, {
      tab,
    });

  return (
    <main className="app-shell px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">My Page</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">내 활동</h1>
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
          <section className="rounded-[22px] border border-sky-100 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">Nickname</div>
                <div className="mt-1 text-base font-black text-slate-950">
                  {data.profile.hasNickname ? "닉네임 변경" : "닉네임 설정"}
                </div>
                <p className="mt-1 text-xs text-slate-500">2~16자 · 한글/영문/숫자/밑줄/하이픈</p>
              </div>
              <form action={saveNicknameAction} className="flex w-full gap-2 sm:max-w-[520px]">
                <input
                  type="text"
                  name="nickname"
                  required
                  minLength={2}
                  maxLength={16}
                  defaultValue={data.profile.hasNickname ? data.profile.nickname : ""}
                  placeholder="새 닉네임 입력"
                  className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-sky-400"
                />
                <button
                  type="submit"
                  className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700"
                >
                  저장
                </button>
                {setupMode ? (
                  <Link
                    href="/me"
                    className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    닫기
                  </Link>
                ) : null}
              </form>
            </div>
          </section>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="space-y-3 xl:sticky xl:top-28 xl:self-start">
            <div className="hidden rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_18px_36px_rgba(15,23,42,0.08)] xl:block">
              <div className="space-y-1.5">
                {TAB_LIST.map((tab) => (
                  <Link
                    key={tab.key}
                    href={tabHref(tab.key)}
                    className={
                      currentTab === tab.key
                        ? "block rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2.5"
                        : "block rounded-2xl border border-transparent px-3 py-2.5 transition hover:border-slate-200 hover:bg-slate-50"
                    }
                  >
                    <div className={currentTab === tab.key ? "text-sm font-bold text-sky-800" : "text-sm font-semibold text-slate-800"}>{tab.label}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{tab.description}</div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 xl:hidden">
              {TAB_LIST.map((tab) => (
                <Link
                  key={tab.key}
                  href={tabHref(tab.key)}
                  className={
                    currentTab === tab.key
                      ? "shrink-0 rounded-full border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-semibold !text-white"
                      : "shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
                  }
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          </aside>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-6">
            {currentTab === "profile" ? (
              <div className="space-y-5">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Profile</div>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">프로필 핵심 요약</h2>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5">
                  <div className="text-sm font-semibold text-sky-700">{data.profile.hasNickname ? "공개 프로필" : "닉네임 설정 필요"}</div>
                  <div className="mt-2 text-3xl font-black text-slate-950">{data.profile.nickname}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{data.profile.bio ?? "아직 소개 문구가 없습니다."}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-xs text-slate-500">보유 코인</div>
                    <div className="mt-1 text-2xl font-black text-slate-950">{data.profile.points.toLocaleString()}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-xs text-slate-500">레벨</div>
                    <div className="mt-1 text-2xl font-black text-slate-950">Lv.{data.profile.level}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-xs text-slate-500">총 예측</div>
                    <div className="mt-1 text-2xl font-black text-slate-950">{data.profile.predictionStats.total}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-xs text-slate-500">적중률</div>
                    <div className="mt-1 text-2xl font-black text-slate-950">{data.profile.predictionAccuracy}%</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-xs text-slate-500">적중</div>
                    <div className="mt-1 text-2xl font-black text-slate-950">{data.profile.predictionStats.hit}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="text-xs text-slate-500">연속 적중</div>
                    <div className="mt-1 text-2xl font-black text-slate-950">{data.profile.predictionStats.streak}</div>
                  </div>
                </div>
              </div>
            ) : null}

            {currentTab === "metrics" ? (
              <div className="space-y-6">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Prediction Insights</div>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">내 예측 지표</h2>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {data.predictionInsights.map((item) => (
                    <div key={item.label} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="text-sm text-slate-500">{item.label}</div>
                      <div className="mt-2 text-2xl font-black text-slate-950">{item.value}</div>
                      <div className="mt-2 text-sm leading-6 text-slate-600">{item.description}</div>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Compare</div>
                  <h3 className="mt-2 text-xl font-black text-slate-950">내 예측 vs 참여자 평균</h3>
                </div>
                <div className="space-y-3">
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
            ) : null}

            {currentTab === "predictions" ? (
              <div>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Prediction History</div>
                    <h2 className="mt-2 text-xl font-black text-slate-950">내 예측 기록</h2>
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
                  hrefForPage={(page) =>
                    buildHref(urlParams, {
                      tab: "predictions",
                      predPage: page > 1 ? String(page) : null,
                    })
                  }
                />
              </div>
            ) : null}

            {currentTab === "season" ? (
              <div>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Season Prediction History</div>
                    <h2 className="mt-2 text-xl font-black text-slate-950">시즌예측 내역</h2>
                  </div>
                  <div className="text-sm text-slate-500">{filteredSeasonPredictions.length}개</div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    ["all", "전체"],
                    ["open", "진행중"],
                    ["locked", "마감"],
                    ["hit", "적중"],
                    ["miss", "미적중"],
                  ].map(([value, label]) => (
                    <Link
                      key={value}
                      href={buildHref(urlParams, {
                        tab: "season",
                        seasonFilter: value === "all" ? null : value,
                        seasonPredPage: null,
                      })}
                      className={
                        seasonFilter === value
                          ? "rounded-full border border-slate-950 bg-slate-950 px-3 py-2 text-sm font-semibold !text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]"
                          : "rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                      }
                    >
                      {label}
                    </Link>
                  ))}
                </div>

                <div className="mt-4 space-y-2.5">
                  {seasonPredictionSlice.items.map((item) => (
                    <div key={item.id} className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="font-semibold text-slate-950">{item.title}</div>
                      <div className="mt-1 text-sm text-slate-600">{item.category} · {item.season}</div>
                      <div className="mt-2 text-sm text-slate-700">내 선택 {item.selectedOptionLabel}</div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                        <span>{item.status}</span>
                        <span>{item.resultLabel ? `정답 ${item.resultLabel}` : "결과 대기"}</span>
                        <span>{item.hitStatus === "hit" ? "적중" : item.hitStatus === "miss" ? "미적중" : item.hitStatus === "canceled" ? "취소" : "진행중"}</span>
                        <span>코인 {item.rewardAmount ?? "-"}</span>
                      </div>
                    </div>
                  ))}
                  {filteredSeasonPredictions.length === 0 ? (
                    <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      아직 참여한 시즌예측이 없습니다.
                    </div>
                  ) : null}
                </div>
                <Pagination
                  page={seasonPredictionSlice.page}
                  totalPages={seasonPredictionSlice.totalPages}
                  hrefForPage={(page) =>
                    buildHref(urlParams, {
                      tab: "season",
                      seasonPredPage: page > 1 ? String(page) : null,
                    })
                  }
                />
              </div>
            ) : null}

            {currentTab === "coins" ? (
              <div>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Coin Ledger</div>
                    <h2 className="mt-2 text-xl font-black text-slate-950">코인 내역</h2>
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
                  hrefForPage={(page) =>
                    buildHref(urlParams, {
                      tab: "coins",
                      ledgerPage: page > 1 ? String(page) : null,
                    })
                  }
                />
              </div>
            ) : null}

            {currentTab === "history" ? (
              <div>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">History</div>
                    <h2 className="mt-2 text-xl font-black text-slate-950">히스토리 (평점 + 댓글)</h2>
                  </div>
                  <div className="text-sm text-slate-500">{filteredHistory.length}개</div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    ["all", "전체"],
                    ["rating", "평점"],
                    ["comment", "댓글"],
                  ].map(([value, label]) => (
                    <Link
                      key={value}
                      href={buildHref(urlParams, {
                        tab: "history",
                        historyType: value === "all" ? null : value,
                        historyPage: null,
                      })}
                      className={
                        historyType === value
                          ? "rounded-full border border-slate-950 bg-slate-950 px-3 py-2 text-sm font-semibold !text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]"
                          : "rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                      }
                    >
                      {label}
                    </Link>
                  ))}
                </div>

                <div className="mt-4 space-y-2.5">
                  {historySlice.items.map((item) => (
                    <div key={`${item.kind}_${item.id}`} className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold text-slate-950">{item.matchLabel}</div>
                        <div className="text-xs text-slate-500">{formatDateTime(item.createdAt)}</div>
                      </div>

                      {item.kind === "rating" ? (
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-700">
                          <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">평점</span>
                          <span>{item.playerName}</span>
                          <span className="text-slate-500">{item.team}</span>
                          <span className="font-bold text-slate-950">{item.score?.toFixed(1)}</span>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <span className="inline-flex rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">댓글</span>
                          <p className="mt-2 text-sm leading-6 text-slate-700">{item.text}</p>
                        </div>
                      )}
                    </div>
                  ))}
                  {filteredHistory.length === 0 ? (
                    <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      표시할 히스토리가 없습니다.
                    </div>
                  ) : null}
                </div>

                <Pagination
                  page={historySlice.page}
                  totalPages={historySlice.totalPages}
                  hrefForPage={(page) =>
                    buildHref(urlParams, {
                      tab: "history",
                      historyPage: page > 1 ? String(page) : null,
                    })
                  }
                />
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";

import { TopSiteNav } from "@/components/TopSiteNav";
import { getCurrentUser } from "@/lib/authz";
import { getMyPageData, getScheduleHubData } from "@/lib/service";
import { AccountActions } from "./AccountActions";
import { BioEditor } from "./BioEditor";

const PAGE_SIZE = 5;

type TabKey = "profile" | "metrics" | "predictions" | "season" | "coins" | "history" | "account";
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
  { key: "account", label: "계정관리", description: "닉네임 변경, 회원탈퇴" },
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
    if (key === "success" || key === "error" || key === "setup") {
      continue;
    }
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

function extractNumericValue(value: string) {
  const matched = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  return matched ? Number.parseFloat(matched[0]) : 0;
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
  const [data, hubData] = await Promise.all([
    getMyPageData(user.id),
    getScheduleHubData(user.id),
  ]);
  const welcomeName = data.profile.nickname?.trim() || "소환사";

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
  const keyPredictionMetrics = [
    { label: "적중률", value: `${data.profile.predictionAccuracy}%` },
    { label: "총 예측", value: `${data.profile.predictionStats.total}회` },
    { label: "연속 적중", value: `${data.profile.predictionStats.streak}회` },
  ];
  const accuracyComparison = data.predictionComparison.find((item) => item.label === "적중률") ?? null;
  const hasPredictionData = data.profile.predictionStats.total > 0;
  const accuracyGraphData = hasPredictionData && accuracyComparison
    ? {
        title: accuracyComparison.label,
        summary: accuracyComparison.summary,
        delta: accuracyComparison.delta,
        bars: [
          { label: "내 기록", value: accuracyComparison.myValue, color: "#8B5CF6" },
          { label: "참여자 평균", value: accuracyComparison.averageValue, color: "#7A7A92" },
        ],
        preview: false,
      }
    : {
        title: "적중률",
        summary: "예측에 참여하면 실제 적중률 비교가 여기에 표시됩니다.",
        delta: "미리보기",
        bars: [
          { label: "내 기록", value: "58%", color: "#8B5CF6" },
          { label: "참여자 평균", value: "46%", color: "#7A7A92" },
        ],
        preview: true,
      };

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
    <div>
      <TopSiteNav
        active="match"
        notifications={hubData.notifications}
        unreadNotificationCount={hubData.unreadNotificationCount}
      />
    <main className="mypage-theme min-h-screen bg-[#1C1C1F] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div />
          <div className="flex flex-wrap items-center gap-2">
            <AccountActions
              hasNickname={Boolean(data.profile.hasNickname)}
              showNickname={false}
              showDelete={false}
              showLogout={true}
            />
          </div>
        </div>
        <section className="rounded-2xl bg-[#31313C] px-5 py-4">
          <p className="text-base font-medium text-[#FFFFFF]">환영합니다, {welcomeName}님!</p>
          <p className="mt-1 text-sm text-[#D4DCFF]">오늘도 예측과 평점을 재미있게 즐겨보세요.</p>
        </section>

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
                        ? "group block rounded-2xl border border-[#7C3AED] bg-[#8B5CF6] px-3 py-2.5"
                        : "group block rounded-2xl border border-transparent px-3 py-2.5 transition hover:border-[#6D28D9] hover:bg-[#6D28D9]"
                    }
                  >
                    <div className={currentTab === tab.key ? "text-sm font-bold text-white" : "text-sm font-semibold text-slate-800 group-hover:text-white"}>{tab.label}</div>
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
                      ? "shrink-0 rounded-full border border-[#7C3AED] bg-[#8B5CF6] px-4 py-2 text-sm font-semibold !text-white"
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
                  <h2 className="mt-2 text-2xl font-black text-slate-950">프로필</h2>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5">
                  <div className="text-3xl font-black text-slate-950">{data.profile.nickname}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {data.profile.bio ?? "아직 소개문구가 없습니다. 나를 한 줄로 소개해 보세요."}
                  </p>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5">
                  <div className="text-sm font-semibold text-slate-950">소개문구 작성하기</div>
                  <BioEditor initialBio={data.profile.bio ?? ""} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">보유 코인</div>
                    <div className="mt-2 text-2xl font-black text-slate-950">{data.profile.points.toLocaleString()}</div>
                  </div>
                  <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">레벨</div>
                    <div className="mt-2 text-2xl font-black text-slate-950">Lv.{data.profile.level}</div>
                  </div>
                  <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">총 예측</div>
                    <div className="mt-2 text-2xl font-black text-slate-950">{data.profile.predictionStats.total}</div>
                  </div>
                  <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">적중률</div>
                    <div className="mt-2 text-2xl font-black text-slate-950">{data.profile.predictionAccuracy}%</div>
                  </div>
                  <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">적중</div>
                    <div className="mt-2 text-2xl font-black text-slate-950">{data.profile.predictionStats.hit}</div>
                  </div>
                  <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] uppercase tracking-[0.12em] text-slate-500">연속 적중</div>
                    <div className="mt-2 text-2xl font-black text-slate-950">{data.profile.predictionStats.streak}</div>
                  </div>
                </div>
              </div>
            ) : null}

            {currentTab === "metrics" ? (
              <div className="space-y-6">
                <div>
                  <p className="mt-2 text-sm text-slate-500">중요한 기록만 남기고, 평균과의 차이는 그래프로 정리했어요.</p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  {keyPredictionMetrics.map((item) => (
                    <div key={item.label} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-5">
                      <div className="text-sm text-slate-500">{item.label}</div>
                      <div className="mt-2 text-[30px] font-black leading-none text-slate-950">{item.value}</div>
                    </div>
                  ))}
                </div>

                <div>
                  <h3 className="mt-2 text-xl font-black text-slate-950">내 예측 vs 참여자 평균</h3>
                  <p className="mt-2 text-sm text-slate-500">내 기록과 평균을 같은 기준선에서 비교할 수 있어요.</p>
                </div>
                {accuracyGraphData ? (
                  <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-950">{accuracyGraphData.title}</div>
                        <div className="mt-1 text-sm leading-6 text-slate-600">{accuracyGraphData.summary}</div>
                      </div>
                      <div className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-sky-700">{accuracyGraphData.delta}</div>
                    </div>
                    {accuracyGraphData.preview ? (
                      <div className="mt-3 text-xs font-medium text-slate-500">예측 1회 이상 참여하면 실제 데이터로 자동 변경됩니다.</div>
                    ) : null}
                    <div className="mt-6 flex items-end justify-center gap-10 rounded-[20px] bg-[#3A3A47] px-4 py-6">
                      {accuracyGraphData.bars.map((bar) => {
                        const numericValue = Math.min(Math.max(extractNumericValue(bar.value), 0), 100);

                        return (
                          <div key={bar.label} className="flex w-24 flex-col items-center gap-3">
                            <div className="text-lg font-black text-slate-950">{bar.value}</div>
                            <div className="flex h-40 w-12 items-end overflow-hidden rounded-full bg-[#4A4A5A]">
                              <div
                                className="w-full rounded-full"
                                style={{ height: `${Math.max(numericValue, numericValue > 0 ? 12 : 0)}%`, backgroundColor: bar.color }}
                                aria-label={`${bar.label} ${bar.value}`}
                              />
                            </div>
                            <div className="text-sm font-medium text-slate-500">{bar.label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {currentTab === "predictions" ? (
              <div>
                <div className="flex items-end justify-between gap-3">
                  <div>
      
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

            {currentTab === "account" ? (
              <div className="space-y-5">
                <div>
                  <h2 className="mt-2 text-xl font-black text-slate-950">계정관리</h2>
                  <p className="mt-1 text-sm text-slate-500">닉네임 변경과 회원탈퇴를 이곳에서 진행할 수 있습니다.</p>
                </div>
                <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <AccountActions
                    hasNickname={Boolean(data.profile.hasNickname)}
                    showLogout={false}
                    showNickname={true}
                    showDelete={true}
                    currentNickname={data.profile.nickname ?? ""}
                  />
                </div>
              </div>
            ) : null}

            {currentTab === "history" ? (
              <div>
                <div className="flex items-end justify-between gap-3">
                  <div>
    
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
    </div>
  );
}

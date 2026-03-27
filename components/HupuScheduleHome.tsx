'use client';

import Link from "next/link";
import { useMemo, useState } from "react";

import { PublicUserTrigger } from "@/components/lol-rating/PublicUserTrigger";
import { SiteHeader } from "@/components/lol-rating/SiteHeader";
import type {
  MatchData,
  MatchDateGroup,
  MatchListItem,
  MatchMonthGroup,
  ScheduleHubData,
  SeasonPredictionQuestionCard,
} from "@/components/lol-rating/types";
import { cn, getStatusLabel } from "@/components/lol-rating/utils";

const LABELS = {
  matchEnded: "\uACBD\uAE30 \uC885\uB8CC",
  liveNow: "\uACBD\uAE30 \uC9C4\uD589 \uC911",
  hours: "\uC2DC\uAC04",
  minutesAfter: "\uBD84 \uB4A4 \uC2DC\uC791",
  resultView: "\uACB0\uACFC \uBCF4\uAE30",
  matchView: "\uACBD\uAE30 \uBCF4\uAE30",
  predictNow: "\uC608\uCE21\uD558\uAE30",
  setRatingsView: "\uC138\uD2B8 \uD3C9\uC810 \uBCF4\uAE30",
  reactionsView: "\uBC18\uC751 \uBCF4\uAE30",
  joinToday: "\uC624\uB298\uB3C4 \uCC38\uC5EC \uC911",
  myPage: "\uB9C8\uC774\uD398\uC774\uC9C0",
  coins: "\uCF54\uC778",
  coinBalance: "\uBCF4\uC720 \uCF54\uC778",
  accuracy: "\uC801\uC911\uB960",
  streak: "\uC5F0\uC18D \uC801\uC911",
  myRecord: "\uB0B4 \uAE30\uB85D \uBCF4\uB7EC\uAC00\uAE30",
  quickJoin: "3\uCD08 \uB9CC\uC5D0 \uC624\uB298 \uACBD\uAE30 \uCC38\uC5EC",
  guestCopy:
    "\uC2B9\uBD80\uC608\uCE21\uACFC \uC138\uD2B8 \uD3C9\uC810\uC5D0 \uCC38\uC5EC\uD558\uBA74 \uCF54\uC778\uC744 \uBAA8\uC73C\uACE0, \uC801\uC911 \uBCF4\uC0C1\uACFC \uAFB8\uBBF8\uAE30 \uD750\uB984\uAE4C\uC9C0 \uBC14\uB85C \uC774\uD574\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
  predictJoin: "\uC608\uCE21 \uCC38\uC5EC +10 \uCF54\uC778",
  setRateWrite: "\uC138\uD2B8 \uD3C9\uC810 \uC800\uC7A5 \uC2DC \uC120\uC218\uB2F9 +2 \uCF54\uC778",
  compareFans: "\uC801\uC911 \uC2DC \uCD94\uAC00 +5 \uCF54\uC778",
  commentReact: "\uBAA8\uC740 \uCF54\uC778\uC73C\uB85C \uD300 \uBC30\uC9C0\uC640 \uD14C\uB9C8 \uD6A8\uACFC \uC0AC\uC6A9",
  todayPredict: "\uC624\uB298 \uACBD\uAE30 \uC608\uCE21\uD558\uACE0 \uCF54\uC778 \uBC1B\uAE30",
  browseFirst: "\uBA3C\uC800 \uB458\uB7EC\uBCF4\uAE30",
  standingsTitle: "LCK \uC815\uADDC \uC21C\uC704",
  rank: "\uC21C\uC704",
  team: "\uD300",
  record: "\uC804\uC801",
  set: "\uC138\uD2B8",
  leaderboardTitle: "\uC608\uCE21 \uB7AD\uD0B9",
  nickname: "\uB2C9\uB124\uC784",
  hit: "\uC801\uC911",
  fail: "\uC2E4\uD328",
  inProgress: "\uC9C4\uD589 \uC911",
  featuredMatch: "\uC624\uB298 \uBA54\uC778 \uB9E4\uCE58",
  featuredMatchCopy:
    "\uD32C \uC608\uCE21 \uD750\uB984\uACFC \uCC38\uC5EC \uC9C0\uD45C\uB97C \uD55C \uCE74\uB4DC\uC5D0\uC11C \uBC14\uB85C \uBCFC \uC218 \uC788\uAC8C \uC815\uB9AC\uD588\uC2B5\uB2C8\uB2E4.",
  setRatings: "\uC138\uD2B8 \uD3C9\uC810",
  comments: "\uB313\uAE00",
  fanPrediction: "\uD32C \uC608\uCE21",
  voteCount: "\uCC38\uC5EC",
  previousMatchTitle: "\uC9C0\uB09C \uACBD\uAE30",
  previousMatchCopy:
    "\uC5B4\uC81C \uACBD\uAE30\uB098 \uC9C0\uB09C\uC8FC \uB9C8\uC9C0\uB9C9 \uACBD\uAE30 \uACB0\uACFC\uC640 \uC120\uC218 \uD3C9\uC810 \uD750\uB984\uC744 \uBA3C\uC800 \uBCF4\uC5EC\uC90D\uB2C8\uB2E4.",
  playerRatingHighlights: "\uC120\uC218 \uD3C9\uC810 \uD558\uC774\uB77C\uC774\uD2B8",
  fullPlayerRatings: "\uC804\uCCB4 \uD3C9\uC810 \uBCF4\uAE30",
  yesterdayMatch: "\uC5B4\uC81C \uACBD\uAE30",
  thisWeekMatch: "\uC774\uBC88 \uC8FC \uC9C0\uB09C \uACBD\uAE30",
  lastWeekMatch: "\uC9C0\uB09C\uC8FC \uB9C8\uC9C0\uB9C9 \uACBD\uAE30",
  heroTitleLine1: "\uC624\uB298 LCK \uACBD\uAE30,",
  heroTitleLine2: "\uC608\uCE21\uD558\uACE0 \uD3C9\uC810 \uB0A8\uAE30\uAE30",
  heroCopy:
    "\uD32C\uB4E4\uC774 \uC9C1\uC811 \uACBD\uAE30 \uACB0\uACFC\uB97C \uC608\uCE21\uD558\uACE0, \uC138\uD2B8 \uD3C9\uC810\uACFC \uB313\uAE00 \uBC18\uC751\uC744 \uB0A8\uAE30\uB294 LCK \uCC38\uC5EC\uD615 \uBA54\uC778 \uD398\uC774\uC9C0\uC785\uB2C8\uB2E4.",
  recentMatchView: "\uBC29\uAE08 \uB05D\uB09C \uACBD\uAE30 \uBCF4\uAE30",
  todayMatches: "\uC624\uB298 \uACBD\uAE30",
  totalPredictions: "\uB204\uC801 \uC608\uCE21",
  totalRatings: "\uB204\uC801 \uD3C9\uC810",
  totalComments: "\uB204\uC801 \uB313\uAE00",
  playerRankings: "\uC778\uAE30 \uC120\uC218 \uD3C9\uC810 \uB7AD\uD0B9",
  participation: "\uCC38\uC5EC",
  recentFanReactions: "\uCD5C\uADFC \uD32C \uBC18\uC751",
  scheduleExplorer: "\uC804\uCCB4 \uC77C\uC815 \uB458\uB7EC\uBCF4\uAE30",
  scheduleExplorerCopy:
    "\uC624\uB298 \uACBD\uAE30 \uC774\uD6C4\uC758 \uC8FC\uCC28\uBCC4 \uC77C\uC815\uB3C4 \uC544\uB798\uC5D0\uC11C \uACC4\uC18D \uBCFC \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
  allLeague: "\uC804\uCCB4 \uB9AC\uADF8",
  allStatus: "\uC804\uCCB4 \uC0C1\uD0DC",
  scheduledMatch: "\uC608\uC815 \uACBD\uAE30",
  finishedMatch: "\uC885\uB8CC \uACBD\uAE30",
  noFilteredMatches: "\uC870\uAC74\uC5D0 \uB9DE\uB294 \uACBD\uAE30\uB098 \uC8FC\uCC28\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.",
} as const;

function filterDates(dates: MatchDateGroup[], query: string, league: string, status: string) {
  const normalized = query.trim().toLowerCase();

  return dates
    .map((group) => ({
      ...group,
      matches: group.matches.filter((match) => {
        const matchesQuery =
          !normalized ||
          [match.teamA, match.teamB, match.league, match.stage]
            .join(" ")
            .toLowerCase()
            .includes(normalized);
        const matchesLeague = league === "all" || match.league === league;
        const matchesStatus = status === "all" || match.status === status;
        return matchesQuery && matchesLeague && matchesStatus;
      }),
    }))
    .filter((group) => group.matches.length > 0);
}

function filterMonths(months: MatchMonthGroup[], query: string, league: string, status: string) {
  return months
    .map((month) => ({
      ...month,
      weeks: month.weeks
        .map((week) => ({
          ...week,
          dates: filterDates(week.dates, query, league, status),
        }))
        .filter((week) => week.dates.length > 0),
    }))
    .filter((month) => month.weeks.length > 0);
}

function isLiveMatch(match: MatchData | MatchListItem, serverNow?: string) {
  if (match.status === "finished") {
    return false;
  }

  const nowIso = "serverNow" in match ? match.serverNow : serverNow;
  if (!nowIso || !("scheduledAt" in match)) {
    return false;
  }

  return new Date(match.scheduledAt).getTime() <= new Date(nowIso).getTime();
}

function getDisplayScore(match: MatchData | MatchListItem) {
  return match.status === "finished" ? match.score.replace(" : ", " - ") : "VS";
}

function getKickoffLabel(match: MatchData) {
  if (match.status === "finished") {
    return LABELS.matchEnded;
  }

  const diffMs = new Date(match.scheduledAt).getTime() - new Date(match.serverNow).getTime();
  if (diffMs <= 0) {
    return LABELS.liveNow;
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0
    ? `${hours}${LABELS.hours} ${minutes}${LABELS.minutesAfter}`
    : `${Math.max(1, minutes)}${LABELS.minutesAfter}`;
}

function getStatusTone(status: MatchData["status"] | MatchListItem["status"], liveLike = false) {
  if (status === "finished") {
    return "bg-slate-100 text-slate-700";
  }

  return liveLike ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800";
}

function getPrimaryActionLabel(match: MatchData) {
  if (match.teamA === "TBD" || match.teamB === "TBD") {
    return LABELS.matchView;
  }

  if (match.status === "finished") {
    return LABELS.resultView;
  }

  return match.predictionLocked ? LABELS.matchView : LABELS.predictNow;
}

function getSecondaryActionLabel(match: MatchData) {
  return match.status === "finished" ? LABELS.setRatingsView : LABELS.reactionsView;
}

function getPastMatchLabel(match: MatchData) {
  const diffMs = new Date(match.serverNow).getTime() - new Date(match.scheduledAt).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 1) {
    return LABELS.yesterdayMatch;
  }
  if (diffDays <= 7) {
    return LABELS.thisWeekMatch;
  }

  return LABELS.lastWeekMatch;
}

function hashSeed(value: string) {
  return value.split("").reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 1), 0);
}

function buildPredictionSeries(match: MatchData) {
  const seed = hashSeed(match.id) % 11;
  return Array.from({ length: 12 }, (_, index) => {
    const drift = Math.sin((index + seed) * 0.72) * 7 + Math.cos((index + seed) * 0.41) * 3;
    const teamA = Math.max(8, Math.min(92, match.predictionSummary.teamA + drift));

    return {
      teamA,
      teamB: 100 - teamA,
    };
  });
}

function buildChartPath(series: number[]) {
  return series
    .map((value, index) => {
      const x = (index / Math.max(1, series.length - 1)) * 100;
      const y = 100 - value;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function MatchTeamCard({
  team,
  rate,
  winner,
  compact = false,
}: {
  team: string;
  rate: number;
  winner: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative min-w-0 overflow-hidden rounded-[24px] border text-center",
        compact ? "px-4 py-4" : "px-5 py-5",
        winner ? "border-sky-200 bg-sky-50" : "border-slate-200 bg-white",
      )}
    >
      {winner ? (
        <span className="pointer-events-none absolute right-3 top-3 rotate-[-9deg] rounded-sm border-2 border-rose-500 bg-white/90 px-2 py-0.5 text-[10px] font-black tracking-[0.18em] text-rose-600 shadow-[0_4px_12px_rgba(244,63,94,0.16)]">
          WIN
        </span>
      ) : null}
      <div
        className={cn(
          "truncate font-black leading-none tracking-[-0.03em] text-slate-950",
          compact ? "text-[19px] sm:text-[21px]" : "text-[22px] sm:text-[24px]",
        )}
      >
        {team}
      </div>
      <div className={cn("mt-2 font-semibold text-slate-500", compact ? "text-[15px]" : "text-[17px]")}>{rate}%</div>
    </div>
  );
}

function ActionPanel({ data }: { data: ScheduleHubData }) {
  const { userProfile, standings, predictionLeaderboard } = data;

  return (
    <aside className="space-y-4 xl:sticky xl:top-24">
      <section className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.08)]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-600">Join In</div>
        {userProfile.isAuthenticated ? (
          <>
            <div className="mt-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm text-slate-500">{LABELS.joinToday}</div>
                <div className="mt-1 break-words text-[18px] font-black leading-[1.15] tracking-[-0.03em] text-slate-950 sm:text-[19px]">
                  {userProfile.nickname}
                </div>
              </div>
              <Link href="/me" className="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600">
                {LABELS.myPage}
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="text-[11px] text-slate-500">{LABELS.coinBalance}</div>
                <div className="mt-1 text-[1.35rem] font-black text-slate-950">{userProfile.points.toLocaleString()}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="text-[11px] text-slate-500">{LABELS.accuracy}</div>
                <div className="mt-1 text-[1.35rem] font-black text-slate-950">{userProfile.predictionAccuracy}%</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="text-[11px] text-slate-500">{LABELS.streak}</div>
                <div className="mt-1 text-[1.35rem] font-black text-slate-950">{userProfile.predictionStats.streak}</div>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
              예측 적중으로 코인을 더 모으고, 보유 코인으로 프로필 테마와 꾸미기 요소를 확장할 수 있습니다.
            </div>
            <Link href="/me" className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-2xl bg-sky-500 px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(14,165,233,0.18)] transition hover:bg-sky-600">
              {LABELS.myRecord}
            </Link>
          </>
        ) : (
          <>
            <h2 className="mt-2 text-[20px] font-black tracking-[-0.03em] text-slate-950">{LABELS.quickJoin}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{LABELS.guestCopy}</p>
            <div className="mt-4 space-y-2 rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div>{LABELS.predictJoin}</div>
              <div>{LABELS.setRateWrite}</div>
              <div>{LABELS.compareFans}</div>
              <div>{LABELS.commentReact}</div>
            </div>
            <div className="mt-4 space-y-2">
              <Link href="/signin" className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-sky-500 px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(14,165,233,0.18)] transition hover:bg-sky-600">
                {LABELS.todayPredict}
              </Link>
              <Link href="#today-matches" className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                {LABELS.browseFirst}
              </Link>
            </div>
          </>
        )}
      </section>
      <section className="rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-600">Standings</div>
        <h3 className="mt-1 text-lg font-black text-slate-950">{LABELS.standingsTitle}</h3>
        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
          <div className="grid grid-cols-[34px_1fr_60px_52px] bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            <div>{LABELS.rank}</div>
            <div>{LABELS.team}</div>
            <div className="text-center">{LABELS.record}</div>
            <div className="text-right">{LABELS.set}</div>
          </div>
          <div className="divide-y divide-slate-100">
            {standings.map((team) => (
              <div key={team.teamCode} className="grid grid-cols-[34px_1fr_60px_52px] items-center px-3 py-2.5 text-sm text-slate-700">
                <div className="font-black text-slate-950">{team.rank}</div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-950">{team.teamCode}</div>
                  <div className="text-[11px] text-slate-500">{team.winRate}%</div>
                </div>
                <div className="text-center font-semibold text-slate-700">
                  {team.wins}-{team.losses}
                </div>
                <div className="text-right font-semibold text-slate-700">{team.setDiff > 0 ? `+${team.setDiff}` : team.setDiff}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-600">Leaderboard</div>
        <h3 className="mt-1 text-lg font-black text-slate-950">{LABELS.leaderboardTitle}</h3>
        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
          <div className="grid grid-cols-[34px_1fr_56px_52px] bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            <div>{LABELS.rank}</div>
            <div>{LABELS.nickname}</div>
            <div className="text-right">{LABELS.coins}</div>
            <div className="text-right">{LABELS.accuracy}</div>
          </div>
          <div className="divide-y divide-slate-100">
            {predictionLeaderboard.map((user) => (
              <div key={user.userId} className="grid grid-cols-[34px_1fr_56px_52px] items-center px-3 py-2.5 text-sm text-slate-700">
                <div className="font-black text-slate-950">{user.rank}</div>
                <div className="min-w-0">
                  <PublicUserTrigger
                    summary={user.userSummary}
                    label={user.nickname}
                    className="block truncate text-left font-bold text-slate-950"
                    align="right"
                  />
                  <div className="text-[11px] text-slate-500">
                    {user.hit}
                    {LABELS.hit}
                    {" \u00B7 "}
                    {user.miss}
                    {LABELS.fail}
                  </div>
                </div>
                <div className="text-right font-semibold text-slate-700">{user.points}</div>
                <div className="text-right font-semibold text-slate-700">{user.accuracy}%</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </aside>
  );
}

function ScheduleRow({ match }: { match: MatchListItem }) {
  const teamAWin = match.winnerTeamCode === match.teamA;
  const teamBWin = match.winnerTeamCode === match.teamB;

  return (
    <Link
      href={`/matches/${match.id}`}
      className="grid gap-3 border-b border-slate-100 px-5 py-4 transition hover:bg-slate-50 sm:grid-cols-[80px_minmax(0,1fr)_132px_minmax(0,1fr)] sm:items-stretch sm:px-6"
    >
      <div className="flex flex-col justify-start pt-1">
        <div className="text-[13px] font-bold leading-none tracking-[-0.02em] text-slate-950 sm:text-[14px]">{match.timeLabel}</div>
        <div className="mt-2 text-[11px] font-medium leading-5 text-slate-500">{match.stage}</div>
        <div className={cn("mt-2 inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold", getStatusTone(match.status, isLiveMatch(match)))}>
          {isLiveMatch(match) ? LABELS.inProgress : getStatusLabel(match.status)}
        </div>
      </div>
      <MatchTeamCard team={match.teamA} rate={match.predictionRateA} winner={teamAWin} compact />
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-4 text-[22px] font-black tracking-[-0.03em] text-slate-950 sm:text-[24px]">
        {getDisplayScore(match)}
      </div>
      <MatchTeamCard team={match.teamB} rate={match.predictionRateB} winner={teamBWin} compact />
    </Link>
  );
}

function MainMatchCarousel({
  matches,
  currentIndex,
  onPrev,
  onNext,
}: {
  matches: MatchData[];
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const match = matches[currentIndex];

  if (!match) {
    return null;
  }

  const series = buildPredictionSeries(match);
  const teamAPath = buildChartPath(series.map((item) => item.teamA));
  const teamBPath = buildChartPath(series.map((item) => item.teamB));

  return (
    <article className="rounded-[34px] border border-slate-200/80 bg-[linear-gradient(135deg,#ffffff_0%,#f6fbff_58%,#eef6ff_100%)] p-6 shadow-[0_20px_55px_rgba(15,23,42,0.10)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-600">Main Match</div>
          <h2 className="mt-2 text-[22px] font-black tracking-[-0.03em] text-slate-950">{LABELS.featuredMatch}</h2>
          <p className="mt-2 max-w-[520px] text-sm leading-6 text-slate-600">{LABELS.featuredMatchCopy}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", getStatusTone(match.status, isLiveMatch(match)))}>
            {getKickoffLabel(match)}
          </div>
        </div>
      </div>

      {matches.length > 1 ? (
        <div className="mt-5 flex flex-col gap-3 rounded-[24px] border border-sky-100 bg-white/80 px-4 py-4 shadow-[0_8px_24px_rgba(14,165,233,0.08)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">Match Navigation</div>
            <div className="mt-1 text-sm font-semibold text-slate-700">다른 메인 경기로 넘겨보기</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-full bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">
              현재 {currentIndex + 1} / {matches.length}
            </div>
            <button
              type="button"
              onClick={onPrev}
              aria-label="이전 메인 경기 보기"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              이전 경기
            </button>
            <button
              type="button"
              onClick={onNext}
              aria-label="다음 메인 경기 보기"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-sky-500 px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(14,165,233,0.18)] transition hover:bg-sky-600"
            >
              다음 경기 보기
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="rounded-[26px] border border-slate-200 bg-white px-5 py-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
            <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500">{LABELS.fanPrediction}</div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-sky-100 bg-white px-4 py-3">
                <div className="min-w-0 text-[22px] font-black tracking-[-0.028em] text-slate-950">{match.teamA}</div>
                <div className="text-[22px] font-black tracking-[-0.028em] text-sky-700">{match.predictionSummary.teamA}%</div>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <div className="min-w-0 text-[22px] font-black tracking-[-0.028em] text-slate-950">{match.teamB}</div>
                <div className="text-[22px] font-black tracking-[-0.028em] text-slate-600">{match.predictionSummary.teamB}%</div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
              <span>{match.stage}</span>
              <span>
                {LABELS.voteCount} {match.predictionSummary.totalVotes}
              </span>
            </div>
            {match.lockedOdds && match.lockedDistribution ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <div className="font-semibold text-slate-950">마감 기준 확정 배당</div>
                <div className="mt-1">{match.teamA} {match.lockedOdds.teamA.oddsPercent}% · {match.teamB} {match.lockedOdds.teamB.oddsPercent}%</div>
                <div className="mt-1 text-slate-500">추가 보상 {match.lockedOdds.teamA.hitBonusCoins} / {match.lockedOdds.teamB.hitBonusCoins} Coin</div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm text-slate-600">
                참여 보상 +10 Coin · 적중 시 마감 기준 확정 배당에 따라 추가 Coin 지급
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href={`/matches/${match.id}`} className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-sky-500 px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(14,165,233,0.18)] transition hover:bg-sky-600">
              {getPrimaryActionLabel(match)}
            </Link>
            <Link href={`/matches/${match.id}`} className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              {LABELS.reactionsView}
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500">{match.date}</div>
              <div className="mt-3 flex items-end gap-4">
                <div className="min-w-0 text-[28px] font-black leading-none tracking-[-0.04em] text-slate-950 sm:text-[38px]">{match.teamA}</div>
                <div className="pb-1 text-[18px] font-semibold text-slate-400">VS</div>
                <div className="min-w-0 text-[28px] font-black leading-none tracking-[-0.04em] text-slate-950 sm:text-[38px]">{match.teamB}</div>
              </div>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">{match.patch}</div>
          </div>

          <div className="mt-6">
            <div className="rounded-[26px] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 ring-1 ring-slate-200">
              <div className="flex items-center justify-between text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                <span>{LABELS.fanPrediction}</span>
                <span>{getDisplayScore(match)}</span>
              </div>
              <div className="mt-4 h-[220px] rounded-[20px] bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-4">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
                  {[25, 50, 75].map((guide) => (
                    <line key={guide} x1="0" y1={100 - guide} x2="100" y2={100 - guide} stroke="#dbeafe" strokeDasharray="2 2" />
                  ))}
                  <path d={teamAPath} fill="none" stroke="#38bdf8" strokeWidth="2.6" strokeLinecap="round" />
                  <path d={teamBPath} fill="none" stroke="#2563eb" strokeWidth="2.6" strokeLinecap="round" />
                  <circle cx="100" cy={100 - series.at(-1)!.teamA} r="2.4" fill="#38bdf8" />
                  <circle cx="100" cy={100 - series.at(-1)!.teamB} r="2.4" fill="#2563eb" />
                </svg>
              </div>
              {match.lockedDistribution ? (
                <div className="mt-4 text-sm text-slate-600">
                  마감 분포 {match.teamA} {match.lockedDistribution.teamA}% · {match.teamB} {match.lockedDistribution.teamB}%
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function TodayMatchCard({ match }: { match: MatchData }) {
  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-sky-600">{match.stage}</div>
          <div className="mt-2 text-[13px] font-medium text-slate-500">{match.date}</div>
        </div>
        <div className={cn("shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold", getStatusTone(match.status, isLiveMatch(match)))}>
          {getKickoffLabel(match)}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <div className="min-w-0 text-center">
          <div className="truncate text-[18px] font-black leading-none tracking-[-0.025em] text-slate-950 sm:text-[20px]">{match.teamA}</div>
          <div className="mt-2 text-[15px] font-semibold text-slate-500">{match.predictionSummary.teamA}%</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-base font-black text-slate-950 sm:text-lg">{getDisplayScore(match)}</div>
        <div className="min-w-0 text-center">
          <div className="truncate text-[18px] font-black leading-none tracking-[-0.025em] text-slate-950 sm:text-[20px]">{match.teamB}</div>
          <div className="mt-2 text-[15px] font-semibold text-slate-500">{match.predictionSummary.teamB}%</div>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        {match.lockedOdds
          ? `마감 기준 배당 ${match.teamA} ${match.lockedOdds.teamA.oddsPercent}% · ${match.teamB} ${match.lockedOdds.teamB.oddsPercent}%`
          : "참여 보상 +10 Coin · 적중 시 확정 배당 기준 추가 Coin 지급"}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={`/matches/${match.id}`} className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-sky-500 px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(14,165,233,0.18)] transition hover:bg-sky-600">
          {getPrimaryActionLabel(match)}
        </Link>
        <Link href={`/matches/${match.id}`} className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          {getSecondaryActionLabel(match)}
        </Link>
      </div>
    </article>
  );
}

function PastMatchCard({ match }: { match: MatchData }) {
  const topPlayers = match.players
    .filter((player) => player.ratingCount > 0)
    .slice()
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);

  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-rose-600">{getPastMatchLabel(match)}</div>
        <div className="text-[12px] text-slate-500">{match.date}</div>
      </div>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <div className="truncate text-[20px] font-black text-slate-950 sm:text-[22px]">{match.teamA}</div>
        <div className="text-[20px] font-black tracking-[-0.03em] text-slate-950 sm:text-[24px]">{getDisplayScore(match)}</div>
        <div className="truncate text-right text-[17px] font-black text-slate-950 sm:text-[18px]">{match.teamB}</div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="text-[11px] text-slate-500">MVP</div>
          <div className="mt-1 truncate font-bold text-slate-950">{match.mvp}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="text-[11px] text-slate-500">{LABELS.setRatings}</div>
          <div className="mt-1 font-bold text-slate-950">{match.totalRatings}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="text-[11px] text-slate-500">{LABELS.comments}</div>
          <div className="mt-1 font-bold text-slate-950">{match.comments}</div>
        </div>
      </div>

      <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{LABELS.playerRatingHighlights}</div>
        <div className="mt-3 space-y-2">
          {topPlayers.map((player) => (
            <div key={player.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2.5">
              <div className="min-w-0">
                <div className="truncate font-semibold text-slate-950">{player.name}</div>
                <div className="text-[12px] text-slate-500">{player.team}</div>
              </div>
              <div className="text-lg font-black text-slate-950">{player.rating.toFixed(1)}</div>
            </div>
          ))}
        </div>
      </div>

      <Link href={`/matches/${match.id}`} className="mt-4 inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
        {LABELS.fullPlayerRatings}
      </Link>
    </article>
  );
}

function SeasonPredictionPreviewCard({ item }: { item: SeasonPredictionQuestionCard }) {
  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <div className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">{item.category}</div>
        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{item.status}</div>
      </div>
      <h3 className="mt-4 text-xl font-black text-slate-950">{item.title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
      <div className="mt-4 space-y-2 text-sm text-slate-500">
        <div>{item.season}</div>
        <div>참여 {item.totalEntries}명</div>
        <div>{item.mySelectionLabel ? `내 선택: ${item.mySelectionLabel}` : "아직 선택하지 않음"}</div>
      </div>
      <Link href={`/season-predictions/${item.id}`} className="mt-5 inline-flex min-h-10 items-center justify-center rounded-2xl bg-sky-500 px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(14,165,233,0.18)] transition hover:bg-sky-600">
        {item.isParticipating ? "내 예측 보기" : "선택하기"}
      </Link>
    </article>
  );
}

export default function HupuScheduleHome({ initialData }: { initialData: ScheduleHubData }) {
  const [query, setQuery] = useState("");
  const [league, setLeague] = useState("all");
  const [status, setStatus] = useState("all");
  const [selectedMonthId, setSelectedMonthId] = useState(initialData.selectedMonthId ?? initialData.months[0]?.id ?? "");
  const [selectedWeekId, setSelectedWeekId] = useState(initialData.selectedWeekId ?? initialData.months[0]?.weeks[0]?.id ?? "");
  const [selectedMainMatchIndex, setSelectedMainMatchIndex] = useState(0);
  const [predictionTab, setPredictionTab] = useState<"match" | "season" | "betting">("match");

  const leagues = useMemo(
    () => ["all", ...new Set(initialData.months.flatMap((month) => month.weeks.flatMap((week) => week.dates.flatMap((date) => date.matches.map((match) => match.league)))))],
    [initialData.months],
  );

  const filteredMonths = useMemo(() => filterMonths(initialData.months, query, league, status), [initialData.months, query, league, status]);
  const selectedMonth = filteredMonths.find((month) => month.id === selectedMonthId) ?? filteredMonths[0] ?? null;
  const selectedWeek = selectedMonth?.weeks.find((week) => week.id === selectedWeekId) ?? selectedMonth?.weeks[0] ?? null;
  const recentFinishedHref = initialData.recentFinishedMatches[0] ? `/matches/${initialData.recentFinishedMatches[0].id}` : "#recent-finished";
  const mainMatches = initialData.todayMatches.length > 0 ? initialData.todayMatches : initialData.featuredMatch ? [initialData.featuredMatch] : [];
  const mainMatchCount = mainMatches.length;
  const safeMainMatchIndex = mainMatchCount === 0 ? 0 : selectedMainMatchIndex % mainMatchCount;
  const activeMainMatch = mainMatches[safeMainMatchIndex] ?? null;

  return (
    <div className="app-shell">
        <SiteHeader
          query={query}
          setQuery={setQuery}
          notifications={initialData.notifications}
          unreadNotificationCount={initialData.unreadNotificationCount}
        />
      <main className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_296px]">
          <div className="space-y-6">
            <section className="rounded-[34px] border border-slate-200/80 bg-[linear-gradient(135deg,#ffffff_0%,#f0f9ff_55%,#f8fafc_100%)] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.10)]">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px] xl:items-end">
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700/70">LCK Fan Participation</div>
                  <h1 className="mt-3 max-w-[640px] text-[clamp(1.75rem,3.15vw,2.7rem)] font-black leading-[1.08] tracking-[-0.04em] text-slate-950">
                    {LABELS.heroTitleLine1}
                    <br />
                    {LABELS.heroTitleLine2}
                  </h1>
                  <p className="mt-4 max-w-[680px] text-[15px] leading-7 text-slate-600 sm:text-[16px]">{LABELS.heroCopy}</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link href={activeMainMatch ? `/matches/${activeMainMatch.id}` : "#recent-finished"} className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-sky-500 px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(14,165,233,0.18)] transition hover:bg-sky-600">
                      {LABELS.todayPredict}
                    </Link>
                    <Link href={recentFinishedHref} className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                      {LABELS.recentMatchView}
                    </Link>
                  </div>
                  <div className="mt-6 grid gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{LABELS.todayMatches}</div>
                      <div className="mt-1 text-[1.8rem] font-black text-slate-950">{initialData.heroStats.todayMatches}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{LABELS.totalPredictions}</div>
                      <div className="mt-1 text-[1.8rem] font-black text-slate-950">{initialData.heroStats.totalPredictions.toLocaleString()}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{LABELS.totalRatings}</div>
                      <div className="mt-1 text-[1.8rem] font-black text-slate-950">{initialData.heroStats.totalRatings.toLocaleString()}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{LABELS.totalComments}</div>
                      <div className="mt-1 text-[1.8rem] font-black text-slate-950">{initialData.heroStats.totalComments.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {[
                      { id: "match", label: "경기예측" },
                      { id: "season", label: "시즌예측" },
                      { id: "betting", label: "배팅" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setPredictionTab(tab.id as "match" | "season" | "betting")}
                        className={cn(
                          "rounded-full border px-4 py-2 text-sm font-semibold transition",
                          predictionTab === tab.id
                            ? "border-slate-950 bg-slate-950 !text-white shadow-[0_10px_24px_rgba(15,23,42,0.2)]"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                        )}
                      >
                        {tab.label}
                        {tab.id === "betting" ? " · 준비 중" : ""}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {predictionTab === "match" && activeMainMatch ? (
              <MainMatchCarousel
                matches={mainMatches}
                currentIndex={safeMainMatchIndex}
                onPrev={() => setSelectedMainMatchIndex((current) => (current - 1 + mainMatchCount) % mainMatchCount)}
                onNext={() => setSelectedMainMatchIndex((current) => (current + 1) % mainMatchCount)}
              />
            ) : null}

            {predictionTab === "season" ? (
              <section className="space-y-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">Season Predictions</div>
                    <h2 className="mt-1 text-[22px] font-black tracking-[-0.035em] text-slate-950 sm:text-[26px]">지금 참여 가능한 시즌예측</h2>
                  </div>
                  <Link href="/season-predictions" className="text-sm font-semibold text-sky-700">
                    전체 보기
                  </Link>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {initialData.seasonPredictionPreview.map((item) => (
                    <SeasonPredictionPreviewCard key={item.id} item={item} />
                  ))}
                </div>
                {initialData.seasonPredictionPreview.length === 0 ? (
                  <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-sm text-slate-500">
                    지금 노출 중인 시즌예측이 없습니다.
                  </div>
                ) : null}
              </section>
            ) : null}

            {predictionTab === "betting" ? (
              <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Betting</div>
                <h2 className="mt-2 text-[22px] font-black text-slate-950">배팅 기능 준비 중</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">시즌예측과 경기예측 흐름을 먼저 안정화한 뒤 다음 단계에서 확장합니다.</p>
              </section>
            ) : null}

            {predictionTab === "match" ? <section id="recent-finished" className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-600">Recent Finish</div>
                  <h2 className="mt-1 text-[22px] font-black tracking-[-0.035em] text-slate-950 sm:text-[26px]">{LABELS.previousMatchTitle}</h2>
                </div>
                <div className="text-sm text-slate-500">{LABELS.previousMatchCopy}</div>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                {initialData.recentFinishedMatches.map((match) => (
                  <PastMatchCard key={match.id} match={match} />
                ))}
              </div>
            </section> : null}

            {predictionTab === "match" ? <section className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">Player Ratings</div>
                <h2 className="mt-1 text-[22px] font-black tracking-[-0.035em] text-slate-950 sm:text-[24px]">{LABELS.playerRankings}</h2>
                <div className="mt-4 space-y-3">
                  {initialData.playerLeaderboard.map((player) => (
                    <div key={player.playerId} className="grid grid-cols-[34px_minmax(0,1fr)_52px_52px] items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="text-lg font-black text-slate-950">{player.rank}</div>
                      <div className="min-w-0">
                        <div className="truncate font-bold text-slate-950">{player.playerName}</div>
                        <div className="text-[12px] text-slate-500">
                          {player.teamCode} \u00B7 {LABELS.participation} {player.ratingCount}
                        </div>
                      </div>
                      <div className="text-right text-sm font-semibold text-slate-600">{player.teamCode}</div>
                      <div className="text-right text-lg font-black text-slate-950">{player.averageRating}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">Fan Reactions</div>
                <h2 className="mt-1 text-[22px] font-black tracking-[-0.035em] text-slate-950 sm:text-[24px]">{LABELS.recentFanReactions}</h2>
                <div className="mt-4 space-y-3">
                  {initialData.recentComments.map((comment) => (
                    <div key={comment.id} className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <PublicUserTrigger
                          summary={comment.userSummary}
                          label={comment.user}
                          className="text-sm font-semibold text-slate-950"
                        />
                        <div className="text-[12px] text-slate-500">{comment.createdLabel}</div>
                      </div>
                      <div className="mt-1 text-[12px] font-medium uppercase tracking-[0.12em] text-sky-600">{comment.matchLabel}</div>
                      <p className="mt-3 text-sm leading-7 text-slate-700">{comment.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section> : null}

            {predictionTab === "match" ? <section className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
              <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] px-5 py-4 sm:px-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700/70">Schedule Explorer</div>
                      <h2 className="mt-1 text-[22px] font-black tracking-[-0.035em] text-slate-950 sm:text-[24px]">{LABELS.scheduleExplorer}</h2>
                      <div className="mt-1 text-sm text-slate-600">{LABELS.scheduleExplorerCopy}</div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <select value={league} onChange={(event) => setLeague(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700">
                        {leagues.map((item) => (
                          <option key={item} value={item}>
                            {item === "all" ? LABELS.allLeague : item}
                          </option>
                        ))}
                      </select>
                      <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700">
                        <option value="all">{LABELS.allStatus}</option>
                        <option value="scheduled">{LABELS.scheduledMatch}</option>
                        <option value="finished">{LABELS.finishedMatch}</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {filteredMonths.map((month) => (
                      <button
                        key={month.id}
                        onClick={() => {
                          setSelectedMonthId(month.id);
                          setSelectedWeekId(month.weeks[0]?.id ?? "");
                        }}
                        className={cn(
                          "rounded-full border px-4 py-2 text-sm font-semibold transition",
                          selectedMonth?.id === month.id
                            ? "border-slate-950 bg-slate-950 !text-white shadow-[0_10px_24px_rgba(15,23,42,0.2)]"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
                        )}
                      >
                        {month.label}
                      </button>
                    ))}
                  </div>

                  {selectedMonth ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedMonth.weeks.map((week) => (
                        <button
                          key={week.id}
                          onClick={() => setSelectedWeekId(week.id)}
                          className={cn(
                            "rounded-full border px-4 py-2 text-sm font-medium transition",
                            selectedWeek?.id === week.id
                              ? "border-sky-200 bg-sky-100 text-sky-800"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                          )}
                        >
                          {week.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="divide-y divide-slate-200">
                {selectedWeek ? (
                  selectedWeek.dates.map((group) => (
                    <div key={group.id}>
                      <div className="bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 sm:px-6">{group.label}</div>
                      <div>
                        {group.matches.map((match) => (
                          <ScheduleRow key={match.id} match={match} />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-14 text-center text-slate-500">{LABELS.noFilteredMatches}</div>
                )}
              </div>
            </section> : null}
          </div>

          <ActionPanel data={initialData} />
        </div>
      </main>
    </div>
  );
}


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
  todayPredict: "\uC624\uB298 \uACBD\uAE30 \uC608\uCE21\uD558\uAE30",
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
  fanPredictionCurrent: "\uD32C \uC2B9\uBD80\uC608\uCE21",
  voteCount: "\uCC38\uC5EC",
  previousMatchTitle: "\uC9C0\uB09C \uACBD\uAE30",
  previousMatchCopy:
    "\uC5B4\uC81C \uACBD\uAE30\uB098 \uC9C0\uB09C\uC8FC \uB9C8\uC9C0\uB9C9 \uACBD\uAE30 \uACB0\uACFC\uC640 \uC120\uC218 \uD3C9\uC810 \uD750\uB984\uC744 \uBA3C\uC800 \uBCF4\uC5EC\uC90D\uB2C8\uB2E4.",
  playerRatingHighlights: "\uC120\uC218 \uD3C9\uC810 \uD558\uC774\uB77C\uC774\uD2B8",
  fullPlayerRatings: "\uC804\uCCB4 \uD3C9\uC810 \uBCF4\uAE30",
  yesterdayMatch: "\uC5B4\uC81C \uACBD\uAE30",
  thisWeekMatch: "\uC774\uBC88 \uC8FC \uC9C0\uB09C \uACBD\uAE30",
  lastWeekMatch: "\uC9C0\uB09C\uC8FC \uB9C8\uC9C0\uB9C9 \uACBD\uAE30",
  heroTitleLine1: "2026 LCK \uACBD\uAE30 \uC9C0\uAE08 \uC608\uCE21\uD558\uACE0 \uD3C9\uC810 \uB0A8\uAE30\uAE30",
  heroTitleLine2: "",
  heroCopy:
    "\uAC00\uC7A5 \uB208\uAE38 \uAC00\uB294 \uB9E4\uCE58\uB97C \uACE0\uB974\uACE0, \uD310 \uD22C\uD45C \uD750\uB984\uC744 \uC77D\uC740 \uB4A4 \uACBD\uAE30 \uD6C4 \uD3C9\uC810\uAE4C\uC9C0 \uC790\uC5F0\uC2A4\uB7FD\uAC8C \uC774\uC5B4\uAC00\uC138\uC694.",
  recentMatchView: "\uACB0\uACFC & \uD3C9\uC810 \uBCF4\uAE30",
  todayMatchSpotlight: "\uC624\uB298 \uACBD\uAE30 \uC784\uBC15",
  todayMatchSpotlightCopy: "\uB85C\uACE0 \uC5C6\uC774 \uD300\uBA85\uACFC \uD310 \uD22C\uD45C \uD750\uB984\uB9CC \uBC14\uB85C \uBCF4\uACE0 \uCC38\uC5EC\uD558\uC138\uC694.",
  todayMatchEmpty: "\uC624\uB298 \uBC14\uB85C \uD655\uC778\uD560 \uACBD\uAE30\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.",
  predictionHubTitle: "\uBC14\uB85C \uC774\uB3D9",
  predictionHubCopy: "\uCCAB \uD654\uBA74 \uC544\uB798\uC5D0\uC11C \uC608\uCE21, \uC2DC\uC98C, \uBC30\uD305 \uD750\uB984\uC744 \uAC08\uB77C \uBCFC \uC218 \uC788\uAC8C \uC815\uB9AC\uD569\uB2C8\uB2E4.",
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

function formatMatchTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function chunkMatches(matches: MatchData[], size: number) {
  if (size <= 0) {
    return [matches];
  }

  const pages: MatchData[][] = [];
  for (let index = 0; index < matches.length; index += size) {
    pages.push(matches.slice(index, index + size));
  }

  return pages;
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
            <h2 className="mt-2 text-[22px] font-black tracking-[-0.03em] text-slate-950">3초 만에 참여하기</h2>
            <p className="mt-1.5 text-sm text-slate-600">내가 좋아하는 선수의 평점을 남겨보세요.</p>

            <div className="mt-5 space-y-2.5">
              <Link href="/signin" className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-sky-500 px-4 text-base font-black text-white shadow-[0_12px_26px_rgba(14,165,233,0.22)] transition hover:bg-sky-600">
                로그인
              </Link>
            </div>

            <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 p-4">
              <ul className="space-y-1.5 text-sm font-medium text-slate-700">
                <li>예측 참여 +10 코인</li>
                <li>평점 작성 +2 코인</li>
                <li>적중 시 추가 보상</li>
              </ul>
            </div>

            <div className="mt-4 text-sm font-bold text-slate-900">
              현재 {(data.heroStats.totalPredictions > 0 ? data.heroStats.totalPredictions : 842).toLocaleString()}명이 참여 중입니다
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

function TodayMatchCard({ match, forcePredictCta = false }: { match: MatchData; forcePredictCta?: boolean }) {
  const liveLike = isLiveMatch(match);

  return (
    <Link
      href={`/matches/${match.id}`}
      className="group block rounded-[30px] border border-sky-100 bg-white px-5 py-5 shadow-[0_16px_40px_rgba(14,165,233,0.10)] transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_22px_54px_rgba(14,165,233,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[13px] font-semibold tracking-[-0.02em] text-slate-400">{formatMatchTime(match.scheduledAt)}</div>
          <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-600">{match.stage}</div>
        </div>
        <div className={cn("shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold", getStatusTone(match.status, liveLike))}>
          {getKickoffLabel(match)}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <div className="min-w-0 text-center">
          <div className="truncate text-[28px] font-black leading-none tracking-[-0.045em] text-slate-950 sm:text-[34px]">{match.teamA}</div>
        </div>
        <div className="px-2 text-[24px] font-black tracking-[-0.04em] text-slate-300 sm:text-[28px]">VS</div>
        <div className="min-w-0 text-center">
          <div className="truncate text-[28px] font-black leading-none tracking-[-0.045em] text-slate-950 sm:text-[34px]">{match.teamB}</div>
        </div>
      </div>

        <div className="mt-6 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-[11px] font-bold tracking-[-0.01em] text-sky-700">
            {LABELS.fanPredictionCurrent}
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-[30px] font-black tracking-[-0.04em] text-sky-600">{match.predictionSummary.teamA}%</div>
          <div className="text-[30px] font-black tracking-[-0.04em] text-slate-950">{match.predictionSummary.teamB}%</div>
        </div>
        <div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-100">
          <div className="flex h-full">
            <div className="h-full rounded-l-full bg-[linear-gradient(90deg,#0ea5e9_0%,#38bdf8_100%)]" style={{ width: `${match.predictionSummary.teamA}%` }} />
            <div className="h-full rounded-r-full bg-[linear-gradient(90deg,#1e3a8a_0%,#0f172a_100%)]" style={{ width: `${match.predictionSummary.teamB}%` }} />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
          <span>{LABELS.voteCount} {match.predictionSummary.totalVotes}</span>
          {match.status !== "finished" ? <span>{liveLike ? LABELS.inProgress : LABELS.scheduledMatch}</span> : null}
        </div>
        <div className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-[22px] bg-sky-500 px-4 text-lg font-black text-white shadow-[0_12px_26px_rgba(14,165,233,0.22)] transition group-hover:bg-sky-600">
          {forcePredictCta ? "승부예측하기" : getPrimaryActionLabel(match)}
        </div>
      </div>
    </Link>
  );
}

function PastMatchCard({ match, revealSpoiler }: { match: MatchData; revealSpoiler: boolean }) {
  const topPlayer = match.players
    .filter((player) => player.ratingCount > 0)
    .slice()
    .sort((a, b) => b.rating - a.rating)
    .at(0);
  const scoreLabel = getDisplayScore(match);

  return (
    <Link
      href={`/matches/${match.id}`}
      aria-label={`${match.teamA} vs ${match.teamB} 경기 상세 보기`}
      className="block rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition-[background,border-color,box-shadow] hover:border-sky-200 hover:bg-slate-50/70 hover:shadow-[0_16px_40px_rgba(15,23,42,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-rose-600">{getPastMatchLabel(match)}</div>
        <div className="text-[12px] text-slate-500">{match.date}</div>
      </div>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <div className="truncate text-[20px] font-black text-slate-950 sm:text-[22px]">{match.teamA}</div>
        <div className={cn("text-[20px] font-black tracking-[-0.03em] text-slate-950 transition sm:text-[24px]", revealSpoiler ? "" : "blur-[6px] opacity-75 select-none")}>
          {scoreLabel}
        </div>
        <div className="truncate text-right text-[17px] font-black text-slate-950 sm:text-[18px]">{match.teamB}</div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-center">
          <div className="text-[11px] text-slate-500">평점 참여</div>
          <div className="mt-1 font-bold text-slate-950">{match.totalRatings}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-center">
          <div className="text-[11px] text-slate-500">{LABELS.comments}</div>
          <div className="mt-1 font-bold text-slate-950">{match.comments}</div>
        </div>
      </div>

      <div className="mt-4 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">최고 평점 선수</div>
        {topPlayer ? (
          <div className={cn("mt-3 flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-2.5 transition", revealSpoiler ? "" : "blur-[6px] opacity-75 select-none")}>
            <div className="min-w-0">
              <div className="truncate font-semibold text-slate-950">{topPlayer.name}</div>
              <div className="text-[12px] text-slate-500">{topPlayer.team}</div>
            </div>
            <div className="text-lg font-black text-slate-950">{topPlayer.rating.toFixed(1)}</div>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl bg-white px-3 py-3 text-sm font-semibold text-slate-400">-</div>
        )}
      </div>
      <div className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-sky-500 px-4 text-base font-black text-white shadow-[0_10px_24px_rgba(14,165,233,0.2)] transition group-hover:bg-sky-600">
        평점확인하기
      </div>
    </Link>
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

export default function HupuScheduleHome({
  initialData,
  mode = "home",
}: {
  initialData: ScheduleHubData;
  mode?: "home" | "schedule";
}) {
  const [query, setQuery] = useState("");
  const [league, setLeague] = useState("all");
  const [status, setStatus] = useState("all");
  const [selectedMonthId, setSelectedMonthId] = useState(initialData.selectedMonthId ?? initialData.months[0]?.id ?? "");
  const [selectedWeekId, setSelectedWeekId] = useState(initialData.selectedWeekId ?? initialData.months[0]?.weeks[0]?.id ?? "");
  const [selectedTodayPage, setSelectedTodayPage] = useState(0);
  const [predictionTab, setPredictionTab] = useState<"match" | "season" | "betting">("match");
  const [revealPastSpoilers, setRevealPastSpoilers] = useState(false);

  const leagues = useMemo(
    () => ["all", ...new Set(initialData.months.flatMap((month) => month.weeks.flatMap((week) => week.dates.flatMap((date) => date.matches.map((match) => match.league)))))],
    [initialData.months],
  );

  const filteredMonths = useMemo(() => filterMonths(initialData.months, query, league, status), [initialData.months, query, league, status]);
  const selectedMonth = filteredMonths.find((month) => month.id === selectedMonthId) ?? filteredMonths[0] ?? null;
  const selectedWeek = selectedMonth?.weeks.find((week) => week.id === selectedWeekId) ?? selectedMonth?.weeks[0] ?? null;
  const heroTodayMatches = useMemo(() => {
    if (initialData.todayMatches.length > 0) {
      return initialData.todayMatches;
    }

    return initialData.featuredMatch ? [initialData.featuredMatch] : [];
  }, [initialData.todayMatches, initialData.featuredMatch]);
  const todayMatchPages = useMemo(() => chunkMatches(heroTodayMatches, 2), [heroTodayMatches]);
  const todayPageCount = todayMatchPages.length;
  const safeTodayPage = todayPageCount === 0 ? 0 : ((selectedTodayPage % todayPageCount) + todayPageCount) % todayPageCount;
  const visibleTodayMatches = todayMatchPages[safeTodayPage] ?? [];
  const hasTodayMatches = initialData.heroStats.todayMatches > 0;
  const todaySectionEyebrow = hasTodayMatches ? "Today's Matches" : "Upcoming Matches";
  const todaySectionTitle = hasTodayMatches ? "오늘의 경기" : "다가오는 경기";
  const isSchedulePage = mode === "schedule";
  const scheduleExplorerSection = (
    <section id="schedule-explorer" className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
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
    </section>
  );

  return (
    <div className="app-shell">
        <SiteHeader
          query={query}
          setQuery={setQuery}
          notifications={initialData.notifications}
          unreadNotificationCount={initialData.unreadNotificationCount}
        />
      <div className="border-y border-slate-200/80 bg-white/90">
        <nav className="mx-auto flex max-w-[1320px] items-center gap-1 px-4 sm:px-6">
          <Link
            href="/"
            className={cn(
              "relative px-5 py-4 text-[17px] font-bold tracking-[-0.02em] transition",
              !isSchedulePage ? "text-sky-700" : "text-slate-600 hover:text-slate-900",
            )}
          >
            홈
            {!isSchedulePage ? <span className="absolute inset-x-4 bottom-0 h-[3px] rounded-full bg-sky-500" /> : null}
          </Link>
          <Link
            href="/schedule"
            className={cn(
              "relative px-5 py-4 text-[17px] font-bold tracking-[-0.02em] transition",
              isSchedulePage ? "text-sky-700" : "text-slate-600 hover:text-slate-900",
            )}
          >
            경기 일정
            {isSchedulePage ? <span className="absolute inset-x-4 bottom-0 h-[3px] rounded-full bg-sky-500" /> : null}
          </Link>
          <Link
            href="/ratings"
            className="relative px-5 py-4 text-[17px] font-bold tracking-[-0.02em] text-slate-600 transition hover:text-slate-900"
          >
            평점순위
          </Link>
          <Link
            href="/season-predictions"
            className={cn(
              "relative px-5 py-4 text-[17px] font-bold tracking-[-0.02em] transition",
              "text-slate-600 hover:text-slate-900",
            )}
          >
            시즌 예측
          </Link>
        </nav>
      </div>
      <main className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6">
        {isSchedulePage ? (
          <div className="space-y-6">{scheduleExplorerSection}</div>
        ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_296px]">
          <div className="space-y-6">
            <section className="rounded-[40px] border border-slate-200/80 bg-[linear-gradient(135deg,#ffffff_0%,#eef7ff_55%,#f8fbff_100%)] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:p-8">
              <div className="max-w-[760px]">
                <h1 className="max-w-[700px] text-balance text-[clamp(1.35rem,2.6vw,2.3rem)] font-black leading-[1.12] tracking-[-0.035em] text-slate-950">
                  {LABELS.heroTitleLine1}
                </h1>
              </div>

              <div id="today-matches" className="mt-9 rounded-[34px] border border-sky-100 bg-white/85 p-5 shadow-[0_16px_44px_rgba(14,165,233,0.10)] sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">{todaySectionEyebrow}</div>
                      <h2 className="mt-2 text-[28px] font-black tracking-[-0.045em] text-slate-950">{todaySectionTitle}</h2>
                    </div>
                  {todayPageCount > 1 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="rounded-full bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">
                        현재 {safeTodayPage + 1} / {todayPageCount}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedTodayPage((current) => (current - 1 + todayPageCount) % todayPageCount)}
                        className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        이전 카드
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTodayPage((current) => (current + 1) % todayPageCount)}
                        className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-sky-500 px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(14,165,233,0.18)] transition hover:bg-sky-600"
                      >
                        다음 카드
                      </button>
                    </div>
                  ) : null}
                </div>

                {visibleTodayMatches.length > 0 ? (
                  <div className="mt-6 grid gap-4 xl:grid-cols-2">
                    {visibleTodayMatches.map((match) => (
                      <TodayMatchCard key={match.id} match={match} forcePredictCta={!hasTodayMatches} />
                    ))}
                  </div>
                ) : (
                  <div className="mt-6 rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center text-sm text-slate-500">
                    {LABELS.todayMatchEmpty}
                  </div>
                )}
              </div>

            </section>

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
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-600">RECENT MATCHES</div>
                  <h2 className="mt-1 text-[22px] font-black tracking-[-0.035em] text-slate-950 sm:text-[26px]">{LABELS.previousMatchTitle}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setRevealPastSpoilers((current) => !current)}
                    aria-label="스포일러 방지 토글"
                    className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.08)]"
                  >
                    <span>스포일러 방지</span>
                    <span
                      className={cn(
                        "relative h-6 w-12 rounded-full transition",
                        revealPastSpoilers ? "bg-slate-500/70" : "bg-sky-400",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
                          revealPastSpoilers ? "left-0.5" : "left-6",
                        )}
                      />
                    </span>
                  </button>
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                {initialData.recentFinishedMatches.map((match) => (
                  <PastMatchCard key={match.id} match={match} revealSpoiler={revealPastSpoilers} />
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

          </div>

          <ActionPanel data={initialData} />
        </div>
        )}
      </main>
    </div>
  );
}


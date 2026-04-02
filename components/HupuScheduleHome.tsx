'use client';

import Link from "next/link";
import { useMemo, useState } from "react";

import { PublicUserTrigger } from "@/components/lol-rating/PublicUserTrigger";
import { SiteHeader } from "@/components/lol-rating/SiteHeader";
import { ScheduleFilterBar } from "@/components/schedule/FilterBar";
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
  ratingJoin: "\uD3C9\uC810 \uCC38\uC5EC\uD558\uAE30",
  matchView: "\uACBD\uAE30 \uBCF4\uAE30",
  predictNow: "\uC608\uCE21\uD558\uAE30",
  setRatingsView: "\uC138\uD2B8 \uD3C9\uC810 \uBCF4\uAE30",
  latestRatingComments: "\uCD5C\uC2E0 \uD3C9\uC810 \uCF54\uBA58\uD2B8",
  latestMatchComments: "\uCD5C\uC2E0 \uB313\uAE00",
  noRatingComments: "\uC544\uC9C1 \uB0A8\uACA8\uC9C4 \uD3C9\uC810 \uCF54\uBA58\uD2B8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.",
  noMatchComments: "\uC544\uC9C1 \uB0A8\uACA8\uC9C4 \uB313\uAE00\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.",
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
  standingsTitle: "LCK\uC815\uADDC\uC21C\uC704",
  rank: "\uC21C\uC704",
  team: "\uD300",
  record: "\uC2B9/\uD328",
  set: "\uC138\uD2B8",
  leaderboardTitle: "\uCF54\uC778\uB7AD\uD0B9",
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
  heroTitleLine1: "LCK \uACBD\uAE30 \uC608\uCE21 & \uD3C9\uC810 \uD55C\uB208\uC5D0",
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
    return "bg-[#4A4A59] text-white";
  }

  return liveLike ? "bg-[#6a4b1f] text-white" : "bg-[#4A5978] text-white";
}

function getScheduleStatusTone(status: MatchData["status"] | MatchListItem["status"], liveLike = false) {
  if (status === "finished") {
    return "border border-[#5b5b6c] bg-[#4A4A59] text-white";
  }

  return liveLike
    ? "border border-[#6a4b1f] bg-[#6a4b1f] text-white"
    : "border border-[#4C5D7A] bg-[#4C5D7A] text-white";
}

function LiveBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-transparent text-[#FF5A67]",
        compact ? "gap-1.5 px-2.5 py-1 text-[11px] font-bold" : "gap-2 px-3 py-1.5 text-[12px] font-bold",
      )}
    >
      <span className={cn("live-dot rounded-full bg-[#FF4D5E]", compact ? "h-2 w-2" : "h-2.5 w-2.5")} />
      <span className="tracking-[0.08em]">LIVE</span>
    </span>
  );
}

function getPrimaryActionLabel(match: MatchData) {
  if (match.teamA === "TBD" || match.teamB === "TBD") {
    return LABELS.matchView;
  }

  if (match.status === "finished") {
    return LABELS.ratingJoin;
  }

  return match.predictionLocked ? LABELS.matchView : LABELS.predictNow;
}

function getSecondaryActionLabel(match: MatchData) {
  return match.status === "finished" ? LABELS.setRatingsView : LABELS.reactionsView;
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

function ActionPanel({ data }: { data: ScheduleHubData }) {
  const { standings, predictionLeaderboard } = data;

  return (
    <aside className="space-y-4 xl:sticky xl:top-24">
      <section className="rounded-[24px] bg-[#31313C] p-3 text-white shadow-[0_12px_30px_rgba(2,6,23,0.28)]">
        <h3 className="text-lg font-black text-white">{LABELS.standingsTitle}</h3>
        <div className="mt-3 overflow-hidden rounded-2xl">
          <div className="grid grid-cols-[34px_1fr_70px] bg-[#3A3A47] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
            <div>{LABELS.rank}</div>
            <div>{LABELS.team}</div>
            <div className="text-right">{LABELS.record}</div>
          </div>
          <div className="divide-y divide-[#474756]">
            {standings.map((team) => (
              <div key={team.teamCode} className="grid grid-cols-[34px_1fr_70px] items-center px-3 py-2.5 text-sm text-white">
                <div className="font-black text-white">{team.rank}</div>
                <div className="min-w-0">
                  <div className="font-bold text-white">{team.teamCode}</div>
                </div>
                <div className="text-right font-semibold text-white">
                  {team.wins}/{team.losses}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[24px] bg-[#31313C] p-3 text-white shadow-[0_12px_30px_rgba(2,6,23,0.28)]">
        <h3 className="text-lg font-black text-white">{LABELS.leaderboardTitle}</h3>
        <div className="mt-3 overflow-hidden rounded-2xl">
          <div className="grid grid-cols-[34px_1fr_56px] bg-[#3A3A47] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
            <div>{LABELS.rank}</div>
            <div>{LABELS.nickname}</div>
            <div className="text-right">{LABELS.coins}</div>
          </div>
          <div className="divide-y divide-[#474756]">
            {predictionLeaderboard.map((user) => (
              <div key={user.userId} className="grid grid-cols-[34px_1fr_56px] items-center px-3 py-2.5 text-sm text-white">
                <div className="font-black text-white">{user.rank}</div>
                <div className="min-w-0">
                  <PublicUserTrigger
                    summary={user.userSummary}
                    label={user.nickname}
                    className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-left font-bold text-white"
                    align="right"
                  />
                  <div className="truncate text-[11px] text-[#d6d6e5]">
                    {user.hit}
                    {LABELS.hit}
                    {" \u00B7 "}
                    {user.miss}
                    {LABELS.fail}
                  </div>
                </div>
                <div className="text-right font-semibold text-white">{user.points}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </aside>
  );
}

function ScheduleRow({ match, revealSpoiler }: { match: MatchListItem; revealSpoiler: boolean }) {
  const liveLike = isLiveMatch(match);
  const statusLabel = liveLike ? LABELS.inProgress : getStatusLabel(match.status);
  const hideScore = match.status === "finished" && !revealSpoiler;
  const scoreTokens = match.status === "finished" ? match.score.split(":").map((value) => value.trim()) : ["", ""];
  const leftScore = scoreTokens[0] ?? "";
  const rightScore = scoreTokens[1] ?? "";
  const mobileCenterLabel = match.status === "finished" ? scoreLabelForMobile(leftScore, rightScore) : "VS";

  return (
    <Link
      href={`/matches/${match.id}`}
      className="grid gap-3 border-b border-[#474756] px-5 py-4 transition hover:bg-[#3A3A47] sm:grid-cols-[80px_minmax(0,1fr)] sm:items-stretch sm:px-6"
    >
      <div className="flex flex-col justify-start pt-1">
        <div className="text-[13px] font-bold leading-none tracking-[-0.02em] text-white sm:text-[14px]">{match.timeLabel}</div>
        <div className="mt-2 text-[11px] font-medium leading-5 text-[#d6d6e5]">{match.stage}</div>
      </div>
      <div className="rounded-[24px] bg-[#31313C] px-4 py-4">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:hidden">
          <span className="truncate text-center text-[17px] font-black leading-none tracking-[-0.02em] text-white">{match.teamA}</span>
          <span
            className={cn(
              "px-2 text-[17px] font-black leading-none tracking-[-0.02em] text-white",
              hideScore ? "blur-[5px] opacity-75 select-none" : "",
            )}
          >
            {mobileCenterLabel}
          </span>
          <span className="truncate text-center text-[17px] font-black leading-none tracking-[-0.02em] text-white">{match.teamB}</span>
        </div>
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:hidden">
          <span className="text-left text-[12px] font-semibold text-[#d6d6e5]">{match.predictionRateA}%</span>
          {liveLike ? (
            <LiveBadge compact />
          ) : (
            <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold", getScheduleStatusTone(match.status, liveLike))}>
              {statusLabel}
            </span>
          )}
          <span className="text-right text-[12px] font-semibold text-[#d6d6e5]">{match.predictionRateB}%</span>
        </div>

        <div className="hidden min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center sm:grid">
          <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-5">
            <span className="shrink-0 text-[13px] font-semibold text-[#d6d6e5]">{match.predictionRateA}%</span>
            <span className="truncate text-center text-[21px] font-black leading-none tracking-[-0.03em] text-white">{match.teamA}</span>
            <span
              className={cn(
                "w-9 text-center text-[26px] font-black leading-none tracking-[-0.03em] text-white",
                hideScore ? "blur-[6px] opacity-75 select-none" : "",
              )}
            >
              {leftScore}
            </span>
          </div>
          <div className="px-4">
            {liveLike ? (
              <LiveBadge compact />
            ) : (
              <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold", getScheduleStatusTone(match.status, liveLike))}>
                {statusLabel}
              </span>
            )}
          </div>
          <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-5">
            <span
              className={cn(
                "w-9 text-center text-[26px] font-black leading-none tracking-[-0.03em] text-white",
                hideScore ? "blur-[6px] opacity-75 select-none" : "",
              )}
            >
              {rightScore}
            </span>
            <span className="truncate text-center text-[21px] font-black leading-none tracking-[-0.03em] text-white">{match.teamB}</span>
            <span className="shrink-0 text-[13px] font-semibold text-[#d6d6e5]">{match.predictionRateB}%</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function scoreLabelForMobile(leftScore: string, rightScore: string) {
  if (!leftScore && !rightScore) {
    return "VS";
  }

  return `${leftScore}:${rightScore}`;
}

function getDefaultMonthId(months: MatchMonthGroup[], fallbackId?: string) {
  const monthNumber = new Date().getMonth() + 1;
  const current = months.find((month) => month.label.includes(`${monthNumber}월`));
  return current?.id ?? fallbackId ?? months[0]?.id ?? "";
}

function TodayMatchCard({ match, forcePredictCta = false }: { match: MatchData; forcePredictCta?: boolean }) {
  const liveLike = isLiveMatch(match);
  const ratingCommentPreview = match.ratingComments.slice(0, 3);
  const matchCommentPreview = match.commentsList.filter((comment) => !comment.parentId).slice(0, 3);
  const isFinished = match.status === "finished";

  return (
    <Link
      href={`/matches/${match.id}`}
      className="group block rounded-[30px] bg-[#31313C] px-5 py-5 text-white shadow-[0_16px_40px_rgba(2,6,23,0.28)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_22px_54px_rgba(2,6,23,0.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[13px] font-semibold tracking-[-0.02em] text-[#d6d6e5]">{formatMatchTime(match.scheduledAt)}</div>
          <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">{match.stage}</div>
        </div>
        {liveLike ? (
          <LiveBadge />
        ) : (
          <div className={cn("shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold", getStatusTone(match.status, liveLike))}>
            {getKickoffLabel(match)}
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <div className="min-w-0 text-center">
          <div className="truncate text-[28px] font-black leading-none tracking-[-0.045em] text-white sm:text-[34px]">{match.teamA}</div>
        </div>
        <div className="px-2 text-[24px] font-black tracking-[-0.04em] text-white sm:text-[28px]">VS</div>
        <div className="min-w-0 text-center">
          <div className="truncate text-[28px] font-black leading-none tracking-[-0.045em] text-white sm:text-[34px]">{match.teamB}</div>
        </div>
      </div>

        <div className="mt-6 rounded-[24px] bg-[#31313C] px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex rounded-full border border-[#5b5b6c] bg-[#4A4A59] px-3 py-1 text-[11px] font-bold tracking-[-0.01em] text-white">
            {LABELS.fanPredictionCurrent}
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-[30px] font-black tracking-[-0.04em] text-white">{match.predictionSummary.teamA}%</div>
          <div className="text-[30px] font-black tracking-[-0.04em] text-white">{match.predictionSummary.teamB}%</div>
        </div>
        <div className="relative mt-4 h-4 overflow-hidden rounded-full bg-[#2A2A34]">
          <div className="flex h-full">
            <div className="h-full bg-[#2F9FD8]" style={{ width: `${match.predictionSummary.teamA}%` }} />
            <div className="h-full bg-[#D84040]" style={{ width: `${match.predictionSummary.teamB}%` }} />
          </div>
          {match.predictionSummary.teamA > 0 && match.predictionSummary.teamA < 100 ? (
            <div
              className="pointer-events-none absolute inset-y-0 w-4 -translate-x-1/2"
              style={{
                left: `${match.predictionSummary.teamA}%`,
                background: "linear-gradient(90deg, #2F9FD8 0%, #D84040 100%)",
                filter: "blur(1.6px)",
                opacity: 0.9,
              }}
            />
          ) : null}
        </div>
        <div className="mt-3 flex items-center justify-between text-sm text-[#d6d6e5]">
          <span>{LABELS.voteCount} {match.predictionSummary.totalVotes}</span>
          {match.status !== "finished" ? <span>{liveLike ? LABELS.inProgress : LABELS.scheduledMatch}</span> : null}
        </div>
        <div className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-[22px] bg-[#8B5CF6] px-4 text-lg font-normal text-white shadow-[0_12px_26px_rgba(139,92,246,0.24)] transition group-hover:bg-[#7C3AED]">
          {forcePredictCta ? "승부예측하기" : getPrimaryActionLabel(match)}
        </div>
        <div className="mt-4 rounded-2xl bg-[#3A3A47] px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d6d6e5]">
            {isFinished ? LABELS.latestRatingComments : LABELS.latestMatchComments}
          </div>
          <div className="mt-2 space-y-1.5">
            {isFinished ? (
              ratingCommentPreview.length > 0 ? (
                ratingCommentPreview.map((item) => (
                  <div key={item.id} className="flex min-w-0 items-center gap-2 text-xs text-white">
                    <span className="shrink-0 rounded-full bg-[#4A4A59] px-2 py-0.5 text-[11px] font-semibold text-white">
                      {item.playerName} {item.score.toFixed(1)}
                    </span>
                    <span className="min-w-0 flex-1 truncate whitespace-nowrap">{item.text}</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-[#d6d6e5]">{LABELS.noRatingComments}</div>
              )
            ) : matchCommentPreview.length > 0 ? (
              matchCommentPreview.map((item) => (
                <div key={item.id} className="flex min-w-0 items-center gap-2 text-xs text-white">
                  <span className="min-w-0 flex-1 truncate whitespace-nowrap">{item.text}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-[#d6d6e5]">{LABELS.noMatchComments}</div>
            )}
          </div>
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
      className="block rounded-[28px] bg-[#31313C] p-5 text-white shadow-[0_12px_32px_rgba(2,6,23,0.28)] transition-[background,box-shadow] hover:bg-[#3A3A47] hover:shadow-[0_16px_40px_rgba(2,6,23,0.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 focus-visible:ring-offset-2"
    >
      <div className="flex items-center justify-end">
        <div className="text-[12px] text-[#d6d6e5]">{match.date}</div>
      </div>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <div className="truncate text-[20px] font-black text-white sm:text-[22px]">{match.teamA}</div>
        <div className={cn("text-[20px] font-black tracking-[-0.03em] text-white transition sm:text-[24px]", revealSpoiler ? "" : "blur-[6px] opacity-75 select-none")}>
          {scoreLabel}
        </div>
        <div className="truncate text-right text-[17px] font-black text-white sm:text-[18px]">{match.teamB}</div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-2xl bg-[#3A3A47] px-3 py-3 text-center">
          <div className="text-[11px] text-[#d6d6e5]">평점 참여</div>
          <div className="mt-1 font-bold text-white">{match.totalRatings}</div>
        </div>
        <div className="rounded-2xl bg-[#3A3A47] px-3 py-3 text-center">
          <div className="text-[11px] text-[#d6d6e5]">{LABELS.comments}</div>
          <div className="mt-1 font-bold text-white">{match.comments}</div>
        </div>
      </div>

      <div className="mt-4 rounded-[24px] bg-[#3A3A47] px-4 py-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d6d6e5]">최고 평점 선수</div>
        {topPlayer ? (
          <div className={cn("mt-3 flex items-center justify-between gap-3 rounded-2xl bg-[#31313C] px-3 py-2.5 transition", revealSpoiler ? "" : "blur-[6px] opacity-75 select-none")}>
            <div className="min-w-0">
              <div className="truncate font-semibold text-white">{topPlayer.name}</div>
              <div className="text-[12px] text-[#d6d6e5]">{topPlayer.team}</div>
            </div>
            <div className="text-lg font-black text-white">{topPlayer.rating.toFixed(1)}</div>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl bg-[#31313C] px-3 py-3 text-sm font-semibold text-white">-</div>
        )}
      </div>
      <div className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-[#8B5CF6] px-4 text-base font-normal text-white shadow-[0_10px_24px_rgba(139,92,246,0.22)] transition group-hover:bg-[#7C3AED]">
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
  const initialMonthId = getDefaultMonthId(initialData.months, initialData.selectedMonthId ?? undefined);
  const initialWeekId = initialData.months.find((month) => month.id === initialMonthId)?.weeks[0]?.id ?? "";

  const [league, setLeague] = useState("all");
  const [status, setStatus] = useState<"all" | "scheduled" | "finished">("all");
  const [selectedMonthId, setSelectedMonthId] = useState(initialMonthId);
  const [selectedWeekId, setSelectedWeekId] = useState(initialWeekId);
  const [selectedTodayPage, setSelectedTodayPage] = useState(0);
  const [predictionTab, setPredictionTab] = useState<"match" | "season" | "betting">("match");
  const [revealPastSpoilers, setRevealPastSpoilers] = useState(false);
  const [revealScheduleSpoilers, setRevealScheduleSpoilers] = useState(false);

  const leagues = useMemo(
    () => ["all", ...new Set(initialData.months.flatMap((month) => month.weeks.flatMap((week) => week.dates.flatMap((date) => date.matches.map((match) => match.league)))))],
    [initialData.months],
  );

  const monthOptions = initialData.months;
  const selectedMonth = monthOptions.find((month) => month.id === selectedMonthId) ?? monthOptions[0] ?? null;
  const selectedWeek = selectedMonth?.weeks.find((week) => week.id === selectedWeekId) ?? selectedMonth?.weeks[0] ?? null;
  const visibleWeekDates = useMemo(
    () => (selectedWeek ? filterDates(selectedWeek.dates, "", league, status) : []),
    [selectedWeek, league, status],
  );
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
  const todaySectionTitle = hasTodayMatches ? "오늘의 경기" : "다가오는 경기";
  const isSchedulePage = mode === "schedule";
  const scheduleExplorerSection = (
    <>
      <section id="schedule-explorer" className="mx-auto w-full max-w-5xl overflow-hidden rounded-[20px] bg-[#31313C] text-white shadow-[0_12px_28px_rgba(2,6,23,0.28)]">
        <div className="bg-[#31313C] px-4 py-3 sm:px-5">
          <ScheduleFilterBar
            status={status}
            onStatusChange={(value) => setStatus(value)}
            league={league}
            leagues={leagues}
            onLeagueChange={(value) => setLeague(value)}
            monthOptions={monthOptions}
            selectedMonthId={selectedMonthId}
            onMonthChange={(value) => {
              setSelectedMonthId(value);
              const month = monthOptions.find((item) => item.id === value);
              setSelectedWeekId(month?.weeks[0]?.id ?? "");
            }}
            weekOptions={selectedMonth?.weeks ?? []}
            selectedWeekId={selectedWeekId}
            onWeekChange={(value) => setSelectedWeekId(value)}
          />
        </div>

      <div className="flex justify-end px-4 py-2 sm:px-5">
        <button
          type="button"
          onClick={() => setRevealScheduleSpoilers((current) => !current)}
          aria-label="일정 스코어 스포일러 방지 토글"
          className="inline-flex items-center gap-1.5 rounded-full bg-transparent px-1 py-0.5 text-[10px] font-semibold text-white"
        >
          <span>스포일러 방지</span>
          <span
            className={cn(
              "relative h-4 w-8 rounded-full transition",
              revealScheduleSpoilers ? "bg-slate-500/70" : "bg-sky-400",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition",
                revealScheduleSpoilers ? "left-0.5" : "left-[18px]",
              )}
            />
          </span>
        </button>
      </div>

      <div className="divide-y divide-[#474756]">
        {selectedWeek && visibleWeekDates.length > 0 ? (
          visibleWeekDates.map((group) => (
            <div key={group.id}>
              <div className="bg-[#3A3A47] px-5 py-3 text-sm font-bold text-white sm:px-6">{group.label}</div>
              <div>
                {group.matches.map((match) => (
                  <ScheduleRow key={match.id} match={match} revealSpoiler={revealScheduleSpoilers} />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="px-6 py-14 text-center text-[#d6d6e5]">{LABELS.noFilteredMatches}</div>
        )}
      </div>
      </section>
    </>
  );

  return (
    <div className="min-h-screen bg-[#1C1C1F]">
        <SiteHeader
          notifications={initialData.notifications}
          unreadNotificationCount={initialData.unreadNotificationCount}
        />
      <div className="border-b border-[#6D28D9] bg-[#8B5CF6]">
        <div className="mobile-tab-scroll mx-auto max-w-5xl px-4 sm:px-6">
        <nav className="flex min-w-max items-center gap-1 whitespace-nowrap">
          <Link
            href="/"
            className={cn(
              "relative whitespace-nowrap px-3 py-2 text-[15px] font-bold tracking-[-0.02em] transition sm:px-5 sm:text-[17px]",
              "text-[#F5F3FF]",
            )}
            style={{ color: "#F5F3FF" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color = "#E9D5FF";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color = "#F5F3FF";
            }}
          >
            홈
            {!isSchedulePage ? <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-white sm:inset-x-4" /> : null}
          </Link>
          <Link
            href="/schedule"
            className={cn(
              "relative whitespace-nowrap px-3 py-2 text-[15px] font-bold tracking-[-0.02em] transition sm:px-5 sm:text-[17px]",
              "text-[#F5F3FF]",
            )}
            style={{ color: "#F5F3FF" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color = "#E9D5FF";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color = "#F5F3FF";
            }}
          >
            경기일정
            {isSchedulePage ? <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-white sm:inset-x-4" /> : null}
          </Link>
          <Link
            href="/ratings"
            className="relative whitespace-nowrap px-3 py-2 text-[15px] font-bold tracking-[-0.02em] text-[#F5F3FF] transition sm:px-5 sm:text-[17px]"
            style={{ color: "#F5F3FF" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color = "#E9D5FF";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color = "#F5F3FF";
            }}
          >
            평점순위
          </Link>
          <Link
            href="/season-predictions"
            className={cn(
              "relative whitespace-nowrap px-3 py-2 text-[15px] font-bold tracking-[-0.02em] transition sm:px-5 sm:text-[17px]",
              "text-[#F5F3FF]",
            )}
            style={{ color: "#F5F3FF" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color = "#E9D5FF";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color = "#F5F3FF";
            }}
          >
            시즌예측
          </Link>
          <Link
            href="/games/15-dollar-challenge"
            className="relative whitespace-nowrap px-3 py-2 text-[15px] font-bold tracking-[-0.02em] text-[#F5F3FF] transition sm:px-5 sm:text-[17px]"
            style={{ color: "#F5F3FF" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color = "#E9D5FF";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color = "#F5F3FF";
            }}
          >
            게임
          </Link>
        </nav>
        </div>
      </div>
      <main className="w-full bg-[#1C1C1F] py-6">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {isSchedulePage ? (
          <div className="space-y-6">{scheduleExplorerSection}</div>
        ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_220px]">
          <div className="space-y-6">
            <section className="space-y-4">
              <div id="today-matches" className="rounded-[20px] bg-[#31313C] p-5 text-white shadow-[0_12px_28px_rgba(2,6,23,0.28)] sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <h2 className="text-[28px] font-black tracking-[-0.045em] text-white">{todaySectionTitle}</h2>
                    </div>
                  {todayPageCount > 1 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="rounded-full bg-[#3A3A47] px-3 py-2 text-xs font-semibold text-white">
                        현재 {safeTodayPage + 1} / {todayPageCount}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedTodayPage((current) => (current - 1 + todayPageCount) % todayPageCount)}
                        className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[#5b5b6c] bg-[#3A3A47] px-4 text-sm font-semibold text-white transition hover:bg-[#4A4A59]"
                      >
                        이전 카드
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTodayPage((current) => (current + 1) % todayPageCount)}
                        className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#8B5CF6] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(139,92,246,0.18)] transition hover:bg-[#7C3AED]"
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
                  <div className="mt-6 rounded-[28px] border border-dashed border-[#5b5b6c] bg-[#3A3A47] px-5 py-12 text-center text-sm text-white">
                    {LABELS.todayMatchEmpty}
                  </div>
                )}
              </div>

            </section>

            <section className="rounded-[20px] bg-[#31313C] p-4 text-white shadow-[0_12px_28px_rgba(2,6,23,0.28)] md:hidden">
              <h2 className="text-[18px] font-black tracking-[-0.035em] text-white">빠른 이동</h2>
              <div className="mt-3 grid gap-2">
                <Link
                  href="/schedule"
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#5b5b6c] bg-[#3A3A47] px-3 text-sm font-semibold text-white transition hover:bg-[#4A4A59]"
                >
                  경기일정 바로가기
                </Link>
                <Link
                  href="/season-predictions"
                  className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#8B5CF6] px-3 text-sm font-semibold text-white transition hover:bg-[#7C3AED]"
                >
                  시즌예측 참여하기
                </Link>
                <Link
                  href="/ratings"
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#5b5b6c] bg-[#3A3A47] px-3 text-sm font-semibold text-white transition hover:bg-[#4A4A59]"
                >
                  평점순위 보기
                </Link>
                <Link
                  href="/games/15-dollar-challenge"
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#5b5b6c] bg-[#3A3A47] px-3 text-sm font-semibold text-white transition hover:bg-[#4A4A59]"
                >
                  15달러 챌린지
                </Link>
                <Link
                  href="/teams"
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#5b5b6c] bg-[#3A3A47] px-3 text-sm font-semibold text-white transition hover:bg-[#4A4A59]"
                >
                  팀 로스터
                </Link>
                <Link
                  href="/shop"
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#5b5b6c] bg-[#3A3A47] px-3 text-sm font-semibold text-white transition hover:bg-[#4A4A59]"
                >
                  코인샵
                </Link>
              </div>
            </section>

            <section className="hidden rounded-[28px] bg-[#31313C] p-5 text-white shadow-[0_12px_30px_rgba(2,6,23,0.28)] sm:p-6 md:block">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-[22px] font-black tracking-[-0.035em] text-white sm:text-[24px]">
                    15달러 챌린지
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-white">
                    15달러 예산 안에서 나만의 베스트 팀을 완성해보세요.
                  </p>
                </div>
                <Link
                  href="/games/15-dollar-challenge"
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#8B5CF6] px-4 text-sm font-semibold text-white transition hover:bg-[#7C3AED]"
                >
                  챌린지 하러가기
                </Link>
              </div>
            </section>

            {predictionTab === "season" ? (
              <section className="space-y-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h2 className="text-[22px] font-black tracking-[-0.035em] text-slate-950 sm:text-[26px]">지금 참여 가능한 시즌예측</h2>
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
              <section className="rounded-[18px] border border-[#dfe3ea] bg-white p-6 shadow-[0_10px_24px_rgba(32,45,55,0.08)]">
                <h2 className="text-[22px] font-black text-slate-950">배팅 기능 준비 중</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">시즌예측과 경기예측 흐름을 먼저 안정화한 뒤 다음 단계에서 확장합니다.</p>
              </section>
            ) : null}

            {predictionTab === "match" ? <section id="recent-finished" className="hidden space-y-4 rounded-[18px] bg-[#31313C] p-5 shadow-[0_10px_24px_rgba(2,6,23,0.28)] md:block">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-[22px] font-black tracking-[-0.035em] text-white sm:text-[26px]">{LABELS.previousMatchTitle}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setRevealPastSpoilers((current) => !current)}
                    aria-label="스포일러 방지 토글"
                    className="inline-flex items-center gap-2 rounded-full !border-0 bg-transparent px-2.5 py-1.5 text-xs font-semibold !shadow-none transition hover:bg-transparent"
                    style={{ color: "#FFFFFF" }}
                  >
                    <span style={{ color: "#FFFFFF", fontSize: "0.8rem" }}>스포일러 방지</span>
                    <span
                      className={cn(
                        "relative h-5 w-10 rounded-full transition",
                        revealPastSpoilers ? "bg-slate-500/70" : "bg-sky-400",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition",
                          revealPastSpoilers ? "left-0.5" : "left-[1.35rem]",
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

            {predictionTab === "match" ? <section className="hidden md:block">
              <div className="rounded-[18px] bg-[#31313C] p-5 text-white shadow-[0_10px_24px_rgba(2,6,23,0.28)]">
                <h2 className="text-[22px] font-black tracking-[-0.035em] text-white sm:text-[24px]">실시간 평점 랭킹</h2>
                <div className="mt-5 rounded-[24px] bg-[#3A3A47] px-3 py-4 sm:px-4">
                  <div className="space-y-2">
                    {initialData.playerLeaderboard
                      .filter((player) => player.rank >= 1 && player.rank <= 3)
                      .map((player) => (
                        <Link
                          key={player.playerId}
                          href={`/player/${player.playerSlug}`}
                          className="grid grid-cols-[32px_minmax(0,1fr)_56px_52px] items-center rounded-xl bg-[#31313C] px-3 py-2 text-sm transition hover:bg-[#4A4A59]"
                        >
                          <div className="text-base font-black text-white">{player.rank}</div>
                          <div className="min-w-0 truncate font-semibold text-white">{player.playerName}</div>
                          <div className="text-right text-xs font-semibold text-white">{player.teamCode}</div>
                          <div className="text-right text-base font-black text-white">{player.averageRating.toFixed(1)}</div>
                        </Link>
                      ))}
                  </div>
                  <div className="mt-3 space-y-2">
                    {initialData.playerLeaderboard
                      .filter((player) => player.rank >= 4 && player.rank <= 6)
                      .map((player) => (
                        <Link
                          key={player.playerId}
                          href={`/player/${player.playerSlug}`}
                          className="grid grid-cols-[32px_minmax(0,1fr)_56px_52px] items-center rounded-xl bg-[#31313C] px-3 py-2 text-sm transition hover:bg-[#4A4A59]"
                        >
                          <div className="text-base font-black text-white">{player.rank}</div>
                          <div className="min-w-0 truncate font-semibold text-white">{player.playerName}</div>
                          <div className="text-right text-xs font-semibold text-white">{player.teamCode}</div>
                          <div className="text-right text-base font-black text-white">{player.averageRating.toFixed(1)}</div>
                        </Link>
                      ))}
                  </div>
                </div>
                <div className="mt-4">
                  <Link
                    href="/ratings"
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-[#8B5CF6] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#7C3AED]"
                  >
                    평점 보러가기
                  </Link>
                </div>
              </div>
            </section> : null}

          </div>

          <div className="hidden xl:block">
            <ActionPanel data={initialData} />
          </div>
        </div>
        )}
        </div>
      </main>
    </div>
  );
}





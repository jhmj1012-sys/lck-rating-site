'use client';

import Link from "next/link";
import { useMemo, useState } from "react";

import { TeamLogo } from "@/components/lol-rating/TeamLogo";
import type { HomeMatchData } from "@/components/lol-rating/types";
import { cn } from "@/components/lol-rating/utils";

const LABELS = {
  matchEnded: "경기 종료",
  liveNow: "경기 진행 중",
  hours: "시간",
  minutesAfter: "분 뒤 시작",
  predictNow: "예측하기",
  matchView: "경기 보기",
  ratingJoin: "평점 참여하기",
  setRatingsView: "경기 반응 보기",
  reactionsView: "반응 보기",
  todayMatchEmpty: "오늘 바로 확인할 경기가 없습니다.",
  previousMatchTitle: "지난 경기",
} as const;

function isLiveMatch(match: HomeMatchData) {
  if (match.status === "finished") {
    return false;
  }

  return new Date(match.scheduledAt).getTime() <= new Date(match.serverNow).getTime();
}

function getKickoffLabel(match: HomeMatchData) {
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

function getStatusTone(status: HomeMatchData["status"], liveLike = false) {
  if (status === "finished") {
    return "bg-[#4A4A59] text-[#E2E8F0]";
  }

  return liveLike ? "bg-[#6a4b1f] text-white" : "bg-[#4A5978] text-white";
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

function getPrimaryActionLabel(match: HomeMatchData) {
  if (match.teamA === "TBD" || match.teamB === "TBD") {
    return LABELS.matchView;
  }

  if (match.status === "finished") {
    return LABELS.ratingJoin;
  }

  return match.predictionLocked ? LABELS.matchView : LABELS.predictNow;
}

function getSecondaryActionLabel(match: HomeMatchData) {
  return match.status === "finished" ? LABELS.setRatingsView : LABELS.reactionsView;
}

function formatMatchTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function chunkMatches(matches: HomeMatchData[], size: number) {
  const pages: HomeMatchData[][] = [];
  for (let index = 0; index < matches.length; index += size) {
    pages.push(matches.slice(index, index + size));
  }
  return pages;
}

function TodayMatchCard({ match, forcePredictCta = false }: { match: HomeMatchData; forcePredictCta?: boolean }) {
  const liveLike = isLiveMatch(match);
  const isFinished = match.status === "finished";

  return (
    <article className="min-w-0 rounded-[30px] bg-[#31313C] px-5 py-5 text-white shadow-[0_16px_40px_rgba(2,6,23,0.28)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[13px] font-semibold tracking-[-0.02em] text-[#d6d6e5]">{formatMatchTime(match.scheduledAt)}</div>
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
          <div className="flex flex-col items-center gap-3">
            <TeamLogo team={match.teamA} size={56} imageClassName="p-2" />
            <div className="truncate text-[28px] font-black tracking-[-0.03em] text-white">{match.teamA}</div>
            <div className="text-sm font-semibold text-[#d6d6e5]">{match.predictionSummary.teamA}%</div>
          </div>
        </div>
        <div className="px-2 text-center">
          <div className="text-[26px] font-black tracking-[-0.04em] text-white">{isFinished ? match.score.replace(" : ", " - ") : "VS"}</div>
          <div className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#d6d6e5]">{match.stage}</div>
        </div>
        <div className="min-w-0 text-center">
          <div className="flex flex-col items-center gap-3">
            <TeamLogo team={match.teamB} size={56} imageClassName="p-2" />
            <div className="truncate text-[28px] font-black tracking-[-0.03em] text-white">{match.teamB}</div>
            <div className="text-sm font-semibold text-[#d6d6e5]">{match.predictionSummary.teamB}%</div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          href={`/matches/${match.id}`}
          className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#8B5CF6] px-4 text-sm font-semibold text-white transition hover:bg-[#7C3AED]"
        >
          {forcePredictCta && !isFinished ? LABELS.predictNow : getPrimaryActionLabel(match)}
        </Link>
        <Link
          href={`/matches/${match.id}`}
          className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[#5b5b6c] bg-[#3A3A47] px-4 text-sm font-semibold text-white transition hover:bg-[#4A4A59]"
        >
          {getSecondaryActionLabel(match)}
        </Link>
      </div>
    </article>
  );
}

function PastMatchCard({ match, revealSpoiler }: { match: HomeMatchData; revealSpoiler: boolean }) {
  const hideScore = match.status === "finished" && !revealSpoiler;

  return (
    <Link
      href={`/matches/${match.id}`}
      className="rounded-[24px] bg-[#3A3A47] p-4 text-white transition hover:bg-[#424254]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-medium text-[#d6d6e5]">{formatMatchTime(match.scheduledAt)}</div>
        <div className="text-xs font-semibold text-[#d6d6e5]">{match.stage}</div>
      </div>
      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <div className="text-center">
          <TeamLogo team={match.teamA} size={44} />
          <div className="mt-2 truncate text-lg font-black text-white">{match.teamA}</div>
        </div>
        <div className={cn("px-2 text-[22px] font-black text-white", hideScore ? "select-none blur-[6px] opacity-75" : "")}>
          {match.score.replace(" : ", " - ")}
        </div>
        <div className="text-center">
          <TeamLogo team={match.teamB} size={44} />
          <div className="mt-2 truncate text-lg font-black text-white">{match.teamB}</div>
        </div>
      </div>
    </Link>
  );
}

export function HupuScheduleTodaySection({
  todayMatches,
  featuredMatch,
  todayMatchesCount,
}: {
  todayMatches: HomeMatchData[];
  featuredMatch: HomeMatchData | null;
  todayMatchesCount: number;
}) {
  const [selectedTodayPage, setSelectedTodayPage] = useState(0);

  const heroTodayMatches = useMemo(() => {
    if (todayMatches.length > 0) {
      return todayMatches;
    }

    return featuredMatch ? [featuredMatch] : [];
  }, [todayMatches, featuredMatch]);

  const todayMatchPages = useMemo(() => chunkMatches(heroTodayMatches, 2), [heroTodayMatches]);
  const todayPageCount = todayMatchPages.length;
  const safeTodayPage = todayPageCount === 0 ? 0 : ((selectedTodayPage % todayPageCount) + todayPageCount) % todayPageCount;
  const visibleTodayMatches = todayMatchPages[safeTodayPage] ?? [];
  const hasTodayMatches = todayMatchesCount > 0;
  const todaySectionTitle = hasTodayMatches ? "오늘의 경기" : "다가오는 경기";

  return (
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
  );
}

export function HupuSchedulePastMatches({ matches }: { matches: HomeMatchData[] }) {
  const [revealPastSpoilers, setRevealPastSpoilers] = useState(false);

  return (
    <section id="recent-finished" className="hidden space-y-4 rounded-[18px] bg-[#31313C] p-5 shadow-[0_10px_24px_rgba(2,6,23,0.28)] md:block">
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
            style={{ color: "#d6d6e5" }}
          >
            <span style={{ color: "#d6d6e5", fontSize: "0.8rem" }}>스포일러 방지</span>
            <span className="inline-flex w-[2.2rem] justify-center text-[11px] font-bold text-[#d6d6e5]">
              {revealPastSpoilers ? "OFF" : "ON"}
            </span>
            <span
              className={cn(
                "relative h-5 w-10 rounded-full transition",
                revealPastSpoilers ? "bg-slate-500/70" : "bg-[#8B5CF6]",
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
        {matches.map((match) => (
          <PastMatchCard key={match.id} match={match} revealSpoiler={revealPastSpoilers} />
        ))}
      </div>
    </section>
  );
}

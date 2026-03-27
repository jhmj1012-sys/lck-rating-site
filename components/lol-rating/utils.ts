import type {
  MatchData,
  MatchDetailViewStatus,
  MatchStatus,
  MatchWithWeek,
  PredictionBlockReason,
  PredictionSectionMode,
  PredictionSummary,
  RatingAvailability,
  WeekSchedule,
} from "./types";

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function flattenMatches(schedule: WeekSchedule[]): MatchWithWeek[] {
  return schedule.flatMap((week) =>
    week.matches.map((match) => ({
      ...match,
      weekId: week.id,
      weekLabel: week.label,
    })),
  );
}

export function filterWeeklySchedule(schedule: WeekSchedule[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return schedule;
  }

  return schedule
    .map((week) => ({
      ...week,
      matches: week.matches.filter((match) =>
        [match.teamA, match.teamB, match.league, getStatusLabel(match.status), match.stage]
          .concat(match.players.map((player) => player.name))
          .join(" ")
          .toLowerCase()
          .includes(normalized),
      ),
    }))
    .filter((week) => week.matches.length > 0);
}

export function getStatusLabel(status: MatchStatus) {
  return status === "finished" ? "종료" : "예정";
}

export function getMatchDetailViewStatus(match: Pick<MatchData, "status" | "predictionLocked">): MatchDetailViewStatus {
  if (match.status === "finished") {
    return "POST";
  }

  return match.predictionLocked ? "LIVE" : "PRE";
}

export function getRatingAvailability(status: MatchDetailViewStatus): RatingAvailability {
  return status === "POST" ? "open" : "locked";
}

export function getPredictionSectionMode(status: MatchDetailViewStatus): PredictionSectionMode {
  if (status === "PRE") {
    return "entry";
  }

  if (status === "LIVE") {
    return "locked";
  }

  return "result";
}

export function getPredictionStateLabel(match: MatchData) {
  if (match.teamA === "TBD" || match.teamB === "TBD") {
    return "대진 확정 대기";
  }

  return match.predictionLocked ? "예측 마감" : "예측 가능";
}

export function isPredictionOpen(match: MatchData) {
  return match.status === "scheduled" && !match.predictionLocked && match.teamA !== "TBD" && match.teamB !== "TBD" && !match.myPredictionTeam;
}

export function getPredictionBlockReason(match: MatchData, canWrite: boolean, selectedTeam: string, hasNickname = true): PredictionBlockReason {
  if (!canWrite) {
    return "unauthenticated";
  }

  if (!hasNickname) {
    return "profile-required";
  }

  if (match.teamA === "TBD" || match.teamB === "TBD") {
    return "unavailable";
  }

  if (match.status !== "scheduled" || match.predictionLocked) {
    return "locked";
  }

  if (!selectedTeam) {
    return "needs-selection";
  }

  return null;
}

export function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

export function getTopRatedPlayers(match: MatchData, limit = 3) {
  return match.players
    .filter((player) => player.rating > 0)
    .slice()
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}

export function ratingTone(score: number) {
  if (score >= 9) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (score >= 8) return "border-sky-200 bg-sky-50 text-sky-800";
  if (score >= 7) return "border-violet-200 bg-violet-50 text-violet-800";
  if (score >= 6) return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-rose-200 bg-rose-50 text-rose-800";
}

export function getPredictionLeader(summary: PredictionSummary, match: MatchData) {
  if (summary.teamA === summary.teamB) {
    return "동률";
  }

  return summary.teamA > summary.teamB ? match.teamA : match.teamB;
}

export function getHomeHighlights(matches: MatchWithWeek[]) {
  return {
    upcoming: matches.filter((match) => match.status === "scheduled").slice(0, 2),
    finished: matches.filter((match) => match.status === "finished").slice(0, 2),
  };
}

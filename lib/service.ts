import "server-only";

import { cache } from "react";

import type {
  StoreShape,
  StoredComment,
  StoredMatch,
  StoredMatchSet,
  StoredPointLedgerEntry,
  StoredTeamRosterEntry,
  StoredUser,
} from "@/lib/domain";
import { createId, mutateStore, readStore } from "@/lib/store";
import type {
  DashboardData,
  MatchComment,
  MatchMonthGroup,
  MatchData,
  MatchDateGroup,
  MatchDetailData,
  MatchListItem,
  MatchSetSummary,
  MatchWeekGroup,
  MyCommentItem,
  MyPageData,
  MyPointLedgerItem,
  RosterPlayerItem,
  TeamRosterDetail,
  TeamRosterSummary,
  MyPredictionItem,
  MyRatingItem,
  MyStoreItem,
  PlayerRating,
  PlayerRole,
  ScheduleHubData,
  SetDetailData,
  SetPlayerRating,
  UserProfile,
  WeekSchedule,
} from "@/components/lol-rating/types";

const relativeTime = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });
const roleOrder: Record<PlayerRole, number> = { TOP: 0, JGL: 1, MID: 2, ADC: 3, SUP: 4 };
const POINTS = {
  predictionSubmit: 10,
  predictionHit: 5,
  commentSubmit: 4,
  legacyRatingSubmit: 8,
  setRatingPerPlayer: 2,
} as const;

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(10, Number(value.toFixed(1))));
}

function getPublicName(user: StoredUser | null | undefined) {
  return user?.nickname ?? "닉네임 미설정";
}

function getUserPointBalance(store: StoreShape, userId: string) {
  return store.pointLedger
    .filter((entry) => entry.userId === userId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .at(-1)?.balanceAfter ?? 0;
}

function appendPointLedgerEntry(
  store: StoreShape,
  input: Omit<StoredPointLedgerEntry, "id" | "createdAt" | "balanceAfter">,
) {
  const currentBalance = getUserPointBalance(store, input.userId);
  const delta = input.type === "earn" ? input.amount : -input.amount;
  const nextBalance = currentBalance + delta;
  if (nextBalance < 0) {
    throw new Error("포인트가 부족합니다.");
  }

  store.pointLedger.push({
    id: createId(store, "pointLedger", "ledger"),
    userId: input.userId,
    type: input.type,
    amount: input.amount,
    reason: input.reason,
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    createdAt: new Date().toISOString(),
    balanceAfter: nextBalance,
  });
}

function getPredictionDeadlineAt(scheduledAt: string) {
  return new Date(new Date(scheduledAt).getTime() - 10 * 60 * 1000);
}

function isPredictionLocked(match: StoredMatch) {
  return match.predictionLocked || match.status === "finished" || Date.now() >= getPredictionDeadlineAt(match.scheduledAt).getTime();
}

function formatRelativeLabel(value: string) {
  const target = new Date(value).getTime();
  const minutes = Math.round((target - Date.now()) / 60000);
  if (Math.abs(minutes) < 60) {
    return relativeTime.format(minutes, "minute");
  }

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    return relativeTime.format(hours, "hour");
  }

  return relativeTime.format(Math.round(hours / 24), "day");
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatDayLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(value));
}

function formatTimeLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatDurationLabel(minutes: number | null) {
  if (!minutes) {
    return "-";
  }

  return `${minutes}분`;
}

function getWeekStart(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatWeekLabel(date: Date) {
  return `${date.getMonth() + 1}월 ${Math.ceil(date.getDate() / 7)}주차`;
}

function formatMonthLabel(date: Date) {
  return `${date.getMonth() + 1}월`;
}

function getTeamById(store: StoreShape, teamId: string) {
  return store.teams.find((team) => team.id === teamId) ?? null;
}

function getRosterEntriesForTeam(store: StoreShape, teamId: string) {
  return store.teamRosterEntries
    .filter((entry) => entry.teamId === teamId && entry.season === "2026" && entry.phase === "R1")
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

function buildRosterPlayerItems(store: StoreShape, entries: StoredTeamRosterEntry[]): RosterPlayerItem[] {
  return entries
    .map((entry) => {
      const player = store.players.find((item) => item.id === entry.playerId);
      if (!player) {
        return null;
      }

      return {
        playerId: player.id,
        name: player.name,
        role: player.role,
        isMainRoster: entry.isMainRoster,
        displayOrder: entry.displayOrder,
      } satisfies RosterPlayerItem;
    })
    .filter((item): item is RosterPlayerItem => item !== null)
    .sort((a, b) => a.displayOrder - b.displayOrder || roleOrder[a.role] - roleOrder[b.role]);
}

function getUserById(store: StoreShape, userId: string) {
  return store.users.find((user) => user.id === userId) ?? null;
}

function getSetById(store: StoreShape, setId: string) {
  return store.matchSets.find((set) => set.id === setId) ?? null;
}

function countVisibleComments(comments: StoredComment[], matchId: string) {
  return comments.filter((comment) => comment.matchId === matchId && !comment.hidden).length;
}

function getSetRatings(store: StoreShape, matchSetId: string, playerId: string) {
  return store.setPlayerRatings.filter((rating) => rating.matchSetId === matchSetId && rating.playerId === playerId);
}

function getMatchPlayers(store: StoreShape, matchId: string) {
  const participants = store.matchParticipants.filter((participant) => participant.matchId === matchId);

  return participants
    .map((participant) => {
      const player = store.players.find((candidate) => candidate.id === participant.playerId);
      const team = getTeamById(store, participant.teamId);
      if (!player || !team) {
        return null;
      }

      const ratings = store.playerRatings.filter((rating) => rating.matchId === matchId && rating.playerId === participant.playerId);
      const setRatings = store.setPlayerRatings.filter((rating) => {
        const set = getSetById(store, rating.matchSetId);
        return set?.matchId === matchId && rating.playerId === participant.playerId;
      });
      const allScores = [...ratings.map((rating) => rating.score), ...setRatings.map((rating) => rating.score)];

      return {
        id: player.id,
        name: player.name,
        team: team.code,
        role: player.role,
        rating: Number(average(allScores).toFixed(1)),
        ratingCount: allScores.length,
      } satisfies PlayerRating;
    })
    .filter((player): player is PlayerRating => player !== null)
    .sort((a, b) => {
      if (a.team !== b.team) {
        return a.team.localeCompare(b.team, "en");
      }

      return roleOrder[a.role] - roleOrder[b.role];
    });
}

function buildPredictionSummary(store: StoreShape, match: StoredMatch) {
  const votes = store.predictions.filter((prediction) => prediction.matchId === match.id);
  const totalVotes = votes.length;
  if (totalVotes === 0) {
    return { teamA: 50, teamB: 50, totalVotes: 0 };
  }

  const teamAVotes = votes.filter((prediction) => prediction.teamId === match.teamAId).length;
  const teamA = Math.round((teamAVotes / totalVotes) * 100);

  return {
    teamA,
    teamB: 100 - teamA,
    totalVotes,
  };
}

function buildComments(store: StoreShape, matchId: string): MatchComment[] {
  return store.comments
    .filter((comment) => comment.matchId === matchId && !comment.hidden)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((comment) => {
      const author = getUserById(store, comment.userId);
      return {
        id: comment.id,
        user: getPublicName(author),
        createdLabel: formatRelativeLabel(comment.createdAt),
        likes: Math.max(1, Math.round(comment.text.length / 12)),
        text: comment.text,
        tag: "반응",
      };
    });
}

function buildMvp(players: PlayerRating[]) {
  const best = players
    .filter((player) => player.ratingCount > 0)
    .slice()
    .sort((a, b) => b.rating - a.rating)[0];

  return best?.name ?? "-";
}

function getMatchSets(store: StoreShape, matchId: string) {
  return store.matchSets
    .filter((set) => set.matchId === matchId)
    .slice()
    .sort((a, b) => a.setNumber - b.setNumber);
}

function buildSetTopPerformer(store: StoreShape, set: StoredMatchSet) {
  const participants = store.setParticipants.filter((participant) => participant.matchSetId === set.id);
  const candidates = participants
    .map((participant) => {
      const player = store.players.find((item) => item.id === participant.playerId);
      const ratings = getSetRatings(store, set.id, participant.playerId);
      if (!player || ratings.length === 0) {
        return null;
      }

      return {
        name: player.name,
        average: average(ratings.map((rating) => rating.score)),
      };
    })
    .filter((value): value is { name: string; average: number } => value !== null)
    .sort((a, b) => b.average - a.average);

  return candidates[0]?.name ?? null;
}

function buildSetSummary(store: StoreShape, set: StoredMatchSet): MatchSetSummary {
  const winnerTeam = set.winnerTeamId ? getTeamById(store, set.winnerTeamId)?.code ?? null : null;
  const ratingParticipants = store.setPlayerRatings.filter((rating) => rating.matchSetId === set.id).length;

  return {
    id: set.id,
    setNumber: set.setNumber,
    title: `세트 ${set.setNumber}`,
    winnerTeam,
    durationLabel: formatDurationLabel(set.durationMinutes),
    scoreLabel: `${set.teamAScore} : ${set.teamBScore}`,
    note: set.note,
    ratingParticipants,
    topPerformer: buildSetTopPerformer(store, set),
  };
}

function buildMatchView(store: StoreShape, match: StoredMatch, viewerId: string | null): MatchData {
  const teamA = getTeamById(store, match.teamAId);
  const teamB = getTeamById(store, match.teamBId);
  if (!teamA || !teamB) {
    throw new Error(`Invalid match teams for ${match.id}`);
  }

  const players = getMatchPlayers(store, match.id);
  const comments = buildComments(store, match.id);
  const predictionSummary = buildPredictionSummary(store, match);
  const totalRatings =
    store.playerRatings.filter((rating) => rating.matchId === match.id).length +
    store.setPlayerRatings.filter((rating) => getSetById(store, rating.matchSetId)?.matchId === match.id).length;
  const myPrediction = viewerId
    ? store.predictions.find((prediction) => prediction.matchId === match.id && prediction.userId === viewerId)
    : null;

  return {
    id: match.id,
    league: match.league,
    stage: match.stage,
    patch: match.patch,
    status: match.status,
    date: formatDateLabel(match.scheduledAt),
    serverNow: new Date().toISOString(),
    scheduledAt: match.scheduledAt,
    predictionDeadlineAt: getPredictionDeadlineAt(match.scheduledAt).toISOString(),
    teamA: teamA.code,
    teamB: teamB.code,
    score: match.scoreA === null || match.scoreB === null ? "-" : `${match.scoreA} : ${match.scoreB}`,
    comments: countVisibleComments(store.comments, match.id),
    totalRatings,
    mvp: buildMvp(players),
    predictionLocked: isPredictionLocked(match),
    predictionSummary,
    players,
    commentsList: comments,
    myPredictionTeam: myPrediction?.teamId === match.teamAId ? teamA.code : myPrediction?.teamId === match.teamBId ? teamB.code : null,
  };
}

function isPreferredPredictionMatch(match: MatchData) {
  return match.status === "scheduled" && !match.predictionLocked;
}

function buildWeeks(matches: Array<{ scheduledAt: string; view: MatchData }>): WeekSchedule[] {
  const groups = new Map<string, WeekSchedule>();

  for (const match of matches) {
    const date = new Date(match.scheduledAt);
    const weekStart = getWeekStart(date);
    const key = weekStart.toISOString();
    const current = groups.get(key);
    if (current) {
      current.matches.push(match.view);
      continue;
    }

    groups.set(key, {
      id: `week_${weekStart.toISOString().slice(0, 10)}`,
      label: formatWeekLabel(weekStart),
      matches: [match.view],
    });
  }

  return Array.from(groups.values());
}

function buildProfile(store: StoreShape, viewer: StoredUser | null): UserProfile {
  if (!viewer) {
    return {
      nickname: "게스트",
      email: "",
      image: null,
      isAuthenticated: false,
      hasNickname: false,
      points: 0,
      level: 1,
      teamBadge: "게스트",
      ownedPersonas: ["관전자", "기본 프로필"],
      selectedProfileTheme: null,
      predictionStats: { hit: 0, miss: 0, streak: 0 },
    };
  }

  const userPredictions = store.predictions.filter((prediction) => prediction.userId === viewer.id);
  const resolved = userPredictions.filter((prediction) => {
    const match = store.matches.find((item) => item.id === prediction.matchId);
    return match?.status === "finished";
  });
  const hit = resolved.filter((prediction) => {
    const match = store.matches.find((item) => item.id === prediction.matchId);
    if (!match || match.scoreA === null || match.scoreB === null) {
      return false;
    }

    const winner = match.scoreA > match.scoreB ? match.teamAId : match.teamBId;
    return winner === prediction.teamId;
  }).length;

  const miss = resolved.length - hit;
  const points = getUserPointBalance(store, viewer.id);
  const selectedBadge = viewer.selectedBadge
    ? store.profileStoreItems.find((item) => item.id === viewer.selectedBadge)?.label ?? viewer.selectedBadge
    : null;

  return {
    nickname: viewer.nickname ?? "닉네임 설정 필요",
    email: viewer.email,
    image: viewer.image,
    isAuthenticated: true,
    hasNickname: Boolean(viewer.nickname),
    points,
    level: Math.max(1, Math.floor(points / 120) + 1),
    teamBadge: selectedBadge ?? (viewer.role === "admin" ? "운영자" : "기본 배지"),
    ownedPersonas: ["경기 분석가", viewer.role === "admin" ? "운영자" : "세트 평점러"],
    selectedProfileTheme: viewer.selectedProfileTheme,
    predictionStats: {
      hit,
      miss: Math.max(0, miss),
      streak: hit > 0 ? Math.min(hit, 5) : 0,
    },
  };
}

function buildMatchListItem(store: StoreShape, match: StoredMatch): MatchListItem {
  const teamA = getTeamById(store, match.teamAId);
  const teamB = getTeamById(store, match.teamBId);
  if (!teamA || !teamB) {
    throw new Error(`Invalid match teams for ${match.id}`);
  }

  const winnerTeamCode =
    match.status === "finished" && match.scoreA !== null && match.scoreB !== null
      ? match.scoreA > match.scoreB
        ? teamA.code
        : match.scoreB > match.scoreA
          ? teamB.code
          : null
      : null;

  return {
    id: match.id,
    league: match.league,
    stage: match.stage,
    status: match.status,
    isFinished: match.status === "finished",
    winnerTeamCode,
    dateLabel: formatDayLabel(match.scheduledAt),
    timeLabel: formatTimeLabel(match.scheduledAt),
    teamA: teamA.code,
    teamB: teamB.code,
    score: match.scoreA === null || match.scoreB === null ? "VS" : `${match.scoreA} : ${match.scoreB}`,
    ratingParticipants: store.setPlayerRatings.filter((rating) => getSetById(store, rating.matchSetId)?.matchId === match.id).length,
    predictionVotes: buildPredictionSummary(store, match).totalVotes,
    predictionLocked: isPredictionLocked(match),
  };
}

function buildTeamRosterSummary(store: StoreShape, teamId: string): TeamRosterSummary | null {
  const team = getTeamById(store, teamId);
  if (!team) {
    return null;
  }

  const entries = getRosterEntriesForTeam(store, teamId);
  const players = buildRosterPlayerItems(store, entries);
  return {
    teamCode: team.code,
    teamName: team.name,
    sourceUrl: entries[0]?.sourceUrl ?? "https://lolesports.com/ko-KR/news/2026-r1-roster",
    updatedAt: entries[0]?.updatedAt ?? new Date().toISOString(),
    playerCount: players.length,
    players,
  };
}

function buildTeamRosterDetail(store: StoreShape, teamId: string): TeamRosterDetail | null {
  const summary = buildTeamRosterSummary(store, teamId);
  if (!summary) {
    return null;
  }

  const recentMatches = store.matches
    .filter((match) => match.teamAId === teamId || match.teamBId === teamId)
    .slice()
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    .slice(0, 5)
    .map((match) => buildMatchListItem(store, match));

  return {
    teamCode: summary.teamCode,
    teamName: summary.teamName,
    sourceUrl: summary.sourceUrl,
    updatedAt: summary.updatedAt,
    rosterLabel: "2026 LCK R1 1군 로스터",
    players: summary.players,
    recentMatches,
  };
}

function buildScheduleGroups(store: StoreShape): MatchMonthGroup[] {
  const items = store.matches
    .slice()
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .map((match) => buildMatchListItem(store, match));

  const monthMap = new Map<string, MatchMonthGroup>();
  for (const item of items) {
    const date = new Date(
      store.matches.find((match) => match.id === item.id)?.scheduledAt ?? Date.now(),
    );
    const monthId = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const weekNumber = Math.floor((date.getDate() - 1) / 7) + 1;
    const weekId = `${monthId}-w${weekNumber}`;

    let monthGroup = monthMap.get(monthId);
    if (!monthGroup) {
      monthGroup = {
        id: monthId,
        label: formatMonthLabel(date),
        weeks: [],
      };
      monthMap.set(monthId, monthGroup);
    }

    let weekGroup = monthGroup.weeks.find((week) => week.id === weekId);
    if (!weekGroup) {
      weekGroup = {
        id: weekId,
        label: `${formatMonthLabel(date)} ${weekNumber}주차`,
        dates: [],
      } satisfies MatchWeekGroup;
      monthGroup.weeks.push(weekGroup);
    }

    let dateGroup = weekGroup.dates.find((group) => group.id === item.dateLabel);
    if (!dateGroup) {
      dateGroup = {
        id: item.dateLabel,
        label: item.dateLabel,
        matches: [],
      } satisfies MatchDateGroup;
      weekGroup.dates.push(dateGroup);
    }

    dateGroup.matches.push(item);
  }

  return Array.from(monthMap.values()).map((month) => ({
    ...month,
    weeks: month.weeks
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id, "en"))
      .map((week) => ({
        ...week,
        dates: week.dates.slice(),
      })),
  }));
}

function buildSetSidePlayers(store: StoreShape, set: StoredMatchSet, teamId: string, viewerId: string | null) {
  return store.setParticipants
    .filter((participant) => participant.matchSetId === set.id && participant.teamId === teamId)
    .map((participant) => {
      const player = store.players.find((item) => item.id === participant.playerId);
      const team = getTeamById(store, participant.teamId);
      if (!player || !team) {
        return null;
      }

      const ratings = getSetRatings(store, set.id, participant.playerId);
      const comments = ratings.map((rating) => rating.comment.trim()).filter(Boolean).slice(0, 2);
      const viewerRating = viewerId
        ? ratings.find((rating) => rating.userId === viewerId)?.score ?? null
        : null;

      return {
        playerId: player.id,
        name: player.name,
        team: team.code,
        role: player.role,
        averageRating: Number(average(ratings.map((rating) => rating.score)).toFixed(1)),
        ratingCount: ratings.length,
        commentHighlights: comments,
        viewerRating,
      };
    })
    .filter((value): value is SetPlayerRating & { viewerRating: number | null } => value !== null)
    .sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);
}

function buildSetDetail(store: StoreShape, set: StoredMatchSet, viewerId: string | null): SetDetailData {
  const match = store.matches.find((item) => item.id === set.matchId);
  if (!match) {
    throw new Error("경기를 찾을 수 없습니다.");
  }

  const teamA = getTeamById(store, match.teamAId);
  const teamB = getTeamById(store, match.teamBId);
  if (!teamA || !teamB) {
    throw new Error("경기 팀 정보를 찾을 수 없습니다.");
  }

  const teamAPlayers = buildSetSidePlayers(store, set, match.teamAId, viewerId);
  const teamBPlayers = buildSetSidePlayers(store, set, match.teamBId, viewerId);
  const viewerRatings = Object.fromEntries(
    [...teamAPlayers, ...teamBPlayers]
      .filter((player) => player.viewerRating !== null)
      .map((player) => [player.playerId, player.viewerRating as number]),
  );

  return {
    id: set.id,
    matchId: match.id,
    setNumber: set.setNumber,
    title: `세트 ${set.setNumber}`,
    winnerTeam: set.winnerTeamId ? getTeamById(store, set.winnerTeamId)?.code ?? null : null,
    durationLabel: formatDurationLabel(set.durationMinutes),
    scoreLabel: `${set.teamAScore} : ${set.teamBScore}`,
    note: set.note,
    teamA: teamA.code,
    teamB: teamB.code,
    teamAPlayers: teamAPlayers.map((player) => ({
      playerId: player.playerId,
      name: player.name,
      team: player.team,
      role: player.role,
      averageRating: player.averageRating,
      ratingCount: player.ratingCount,
      commentHighlights: player.commentHighlights,
    })),
    teamBPlayers: teamBPlayers.map((player) => ({
      playerId: player.playerId,
      name: player.name,
      team: player.team,
      role: player.role,
      averageRating: player.averageRating,
      ratingCount: player.ratingCount,
      commentHighlights: player.commentHighlights,
    })),
    viewerRatings,
    canRate: match.status === "finished",
  };
}

export const getDashboardData = cache(async (viewerId: string | null): Promise<DashboardData> => {
  const store = await readStore();
  const viewer = viewerId ? store.users.find((user) => user.id === viewerId) ?? null : null;
  const matchViews = store.matches
    .slice()
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .map((match) => ({
      scheduledAt: match.scheduledAt,
      view: buildMatchView(store, match, viewerId),
    }));

  return {
    weeklySchedule: buildWeeks(matchViews),
    userProfile: buildProfile(store, viewer),
    featuredMatchId:
      matchViews.find((match) => isPreferredPredictionMatch(match.view))?.view.id ??
      matchViews.find((match) => match.view.status === "scheduled" && !match.view.predictionLocked)?.view.id ??
      matchViews[0]?.view.id ??
      null,
  };
});

export const getScheduleHubData = cache(async (viewerId: string | null): Promise<ScheduleHubData> => {
  const store = await readStore();
  const viewer = viewerId ? store.users.find((user) => user.id === viewerId) ?? null : null;
  const months = buildScheduleGroups(store);

  return {
    months,
    selectedMonthId: months[0]?.id ?? null,
    selectedWeekId: months[0]?.weeks[0]?.id ?? null,
    featuredMatchId:
      store.matches.find((match) => match.status === "finished")?.id ??
      store.matches[0]?.id ??
      null,
    userProfile: buildProfile(store, viewer),
  };
});

export const getTeamRosterHubData = cache(async (): Promise<TeamRosterSummary[]> => {
  const store = await readStore();
  return store.teams
    .slice()
    .sort((a, b) => a.code.localeCompare(b.code, "en"))
    .map((team) => buildTeamRosterSummary(store, team.id))
    .filter((item): item is TeamRosterSummary => item !== null && item.playerCount > 0);
});

export async function getTeamRosterDetailData(teamCode: string): Promise<TeamRosterDetail> {
  const store = await readStore();
  const normalizedTeamCode = teamCode.toUpperCase() === "KRX" ? "DRX" : teamCode.toUpperCase();
  const team = store.teams.find((item) => item.code === normalizedTeamCode);
  if (!team) {
    throw new Error("팀을 찾을 수 없습니다.");
  }

  const detail = buildTeamRosterDetail(store, team.id);
  if (!detail) {
    throw new Error("팀 로스터를 찾을 수 없습니다.");
  }

  return detail;
}

export async function getMatchDetailData(matchId: string, viewerId: string | null): Promise<MatchDetailData> {
  const store = await readStore();
  const match = store.matches.find((item) => item.id === matchId);
  if (!match) {
    throw new Error("경기를 찾을 수 없습니다.");
  }

  return {
    match: buildMatchView(store, match, viewerId),
    sets: getMatchSets(store, matchId).map((set) => buildSetSummary(store, set)),
  };
}

export async function getSetDetailData(matchId: string, setNumber: number, viewerId: string | null = null): Promise<SetDetailData> {
  const store = await readStore();
  const set = store.matchSets.find((item) => item.matchId === matchId && item.setNumber === setNumber);
  if (!set) {
    throw new Error("세트를 찾을 수 없습니다.");
  }

  return buildSetDetail(store, set, viewerId);
}

function buildMatchLabel(store: StoreShape, matchId: string) {
  const match = store.matches.find((item) => item.id === matchId);
  if (!match) {
    return matchId;
  }

  const teamA = getTeamById(store, match.teamAId)?.code ?? "?";
  const teamB = getTeamById(store, match.teamBId)?.code ?? "?";
  return `${teamA} vs ${teamB}`;
}

function buildPredictionResultLabel(store: StoreShape, matchId: string, selectedTeamId: string) {
  const match = store.matches.find((item) => item.id === matchId);
  if (!match || match.status !== "finished" || match.scoreA === null || match.scoreB === null) {
    return "결과 대기";
  }

  const winner = match.scoreA > match.scoreB ? match.teamAId : match.teamBId;
  return winner === selectedTeamId ? "적중" : "빗나감";
}

export async function getMyPageData(viewerId: string): Promise<MyPageData> {
  const store = await readStore();
  const viewer = store.users.find((user) => user.id === viewerId);
  if (!viewer) {
    throw new Error("사용자를 찾을 수 없습니다.");
  }

  const storeItemsById = new Map(store.profileStoreItems.map((item) => [item.id, item]));
  const inventoryByItemId = new Map(
    store.userInventory.filter((item) => item.userId === viewerId).map((item) => [item.storeItemId, item]),
  );

  const predictions: MyPredictionItem[] = store.predictions
    .filter((prediction) => prediction.userId === viewerId)
    .slice()
    .sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime())
    .map((prediction) => ({
      id: prediction.id,
      matchId: prediction.matchId,
      matchLabel: buildMatchLabel(store, prediction.matchId),
      selectedTeam: getTeamById(store, prediction.teamId)?.code ?? prediction.teamId,
      status: store.matches.find((item) => item.id === prediction.matchId)?.status ?? "scheduled",
      resultLabel: buildPredictionResultLabel(store, prediction.matchId, prediction.teamId),
      submittedAt: prediction.createdAt,
      updatedAt: prediction.updatedAt ?? prediction.createdAt,
    }));

  const legacyRatings: MyRatingItem[] = store.playerRatings
    .filter((rating) => rating.userId === viewerId)
    .map((rating) => {
      const player = store.players.find((item) => item.id === rating.playerId);
      return {
        id: rating.id,
        matchId: rating.matchId,
        matchLabel: buildMatchLabel(store, rating.matchId),
        setNumber: null,
        playerName: player?.name ?? rating.playerId,
        team: player ? getTeamById(store, player.teamId)?.code ?? "" : "",
        score: rating.score,
        createdAt: rating.createdAt,
        updatedAt: rating.updatedAt ?? rating.createdAt,
      };
    });

  const setRatings: MyRatingItem[] = store.setPlayerRatings
    .filter((rating) => rating.userId === viewerId)
    .map((rating) => {
      const player = store.players.find((item) => item.id === rating.playerId);
      const set = getSetById(store, rating.matchSetId);
      return {
        id: rating.id,
        matchId: set?.matchId ?? rating.matchSetId,
        matchLabel: buildMatchLabel(store, set?.matchId ?? rating.matchSetId),
        setNumber: set?.setNumber ?? null,
        playerName: player?.name ?? rating.playerId,
        team: player ? getTeamById(store, player.teamId)?.code ?? "" : "",
        score: rating.score,
        createdAt: rating.createdAt,
        updatedAt: rating.updatedAt ?? rating.createdAt,
      };
    });

  const comments: MyCommentItem[] = store.comments
    .filter((comment) => comment.userId === viewerId)
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((comment) => ({
      id: comment.id,
      matchId: comment.matchId,
      matchLabel: buildMatchLabel(store, comment.matchId),
      text: comment.text,
      hidden: comment.hidden,
      createdAt: comment.createdAt,
    }));

  const pointLedger: MyPointLedgerItem[] = store.pointLedger
    .filter((entry) => entry.userId === viewerId)
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((entry) => ({
      id: entry.id,
      type: entry.type,
      amount: entry.amount,
      reason: entry.reason,
      balanceAfter: entry.balanceAfter,
      createdAt: entry.createdAt,
    }));

  const storeItems: MyStoreItem[] = store.profileStoreItems.map((item) => {
    const inventory = inventoryByItemId.get(item.id);
    return {
      id: item.id,
      type: item.type,
      label: item.label,
      description: item.description,
      price: item.price,
      previewValue: item.previewValue,
      owned: Boolean(inventory),
      equipped: Boolean(inventory?.equipped),
    };
  });

  const profile = buildProfile(store, viewer);
  return {
    profile: {
      ...profile,
      bio: viewer.bio,
      selectedBadge: storeItemsById.get(viewer.selectedBadge ?? "")?.label ?? viewer.selectedBadge,
      selectedProfileTheme: storeItemsById.get(viewer.selectedProfileTheme ?? "")?.label ?? viewer.selectedProfileTheme,
    },
    predictions,
    ratings: [...legacyRatings, ...setRatings].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    ),
    comments,
    pointLedger,
    storeItems,
  };
}

export async function purchaseProfileStoreItem(input: { userId: string; storeItemId: string }) {
  return mutateStore(async (store) => {
    const user = store.users.find((item) => item.id === input.userId);
    const item = store.profileStoreItems.find((candidate) => candidate.id === input.storeItemId);
    if (!user || !item) {
      throw new Error("구매 대상을 찾을 수 없습니다.");
    }

    const alreadyOwned = store.userInventory.some(
      (inventory) => inventory.userId === input.userId && inventory.storeItemId === input.storeItemId,
    );
    if (alreadyOwned) {
      throw new Error("이미 보유한 아이템입니다.");
    }

    appendPointLedgerEntry(store, {
      userId: input.userId,
      type: "spend",
      amount: item.price,
      reason: `${item.label} 구매`,
      referenceType: "store_purchase",
      referenceId: item.id,
    });

    store.userInventory.push({
      id: createId(store, "userInventory", "inventory"),
      userId: input.userId,
      storeItemId: item.id,
      equipped: false,
      acquiredAt: new Date().toISOString(),
    });
  });
}

export async function equipProfileStoreItem(input: { userId: string; storeItemId: string }) {
  return mutateStore(async (store) => {
    const inventory = store.userInventory.find(
      (item) => item.userId === input.userId && item.storeItemId === input.storeItemId,
    );
    const item = store.profileStoreItems.find((candidate) => candidate.id === input.storeItemId);
    const user = store.users.find((candidate) => candidate.id === input.userId);
    if (!inventory || !item || !user) {
      throw new Error("장착할 수 없는 아이템입니다.");
    }

    for (const entry of store.userInventory.filter((candidate) => candidate.userId === input.userId)) {
      const ownedItem = store.profileStoreItems.find((candidate) => candidate.id === entry.storeItemId);
      if (ownedItem?.type === item.type) {
        entry.equipped = false;
      }
    }

    inventory.equipped = true;
    if (item.type === "badge") {
      user.selectedBadge = item.id;
    }
    if (item.type === "theme") {
      user.selectedProfileTheme = item.id;
    }
    user.updatedAt = new Date().toISOString();
  });
}

export async function getAdminPanelData() {
  const store = await readStore();
  return {
    users: store.users.slice().sort((a, b) => getPublicName(a).localeCompare(getPublicName(b), "ko")),
    teams: store.teams.slice().sort((a, b) => a.code.localeCompare(b.code, "en")),
    players: store.players.slice().sort((a, b) => a.name.localeCompare(b.name, "en")),
    teamRosterEntries: store.teamRosterEntries.slice().sort((a, b) => {
      if (a.teamId !== b.teamId) {
        return a.teamId.localeCompare(b.teamId, "en");
      }

      return a.displayOrder - b.displayOrder;
    }),
    matches: store.matches.slice().sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
    matchParticipants: store.matchParticipants,
    matchSets: store.matchSets.slice().sort((a, b) => {
      if (a.matchId !== b.matchId) {
        return a.matchId.localeCompare(b.matchId, "en");
      }

      return a.setNumber - b.setNumber;
    }),
    setParticipants: store.setParticipants,
    setPlayerRatings: store.setPlayerRatings,
    comments: store.comments.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  };
}

export async function updateTeamRoster(input: {
  teamCode: string;
  players: Array<{ playerId: string; displayOrder: number; isMainRoster: boolean }>;
}) {
  return mutateStore(async (store) => {
    const team = store.teams.find((item) => item.code === input.teamCode);
    if (!team) {
      throw new Error("팀을 찾을 수 없습니다.");
    }

    const allowedIds = new Set(store.players.filter((player) => player.teamId === team.id).map((player) => player.id));
    const nextPlayers = input.players.filter((player) => allowedIds.has(player.playerId));

    store.teamRosterEntries = store.teamRosterEntries.filter(
      (entry) => !(entry.teamId === team.id && entry.season === "2026" && entry.phase === "R1"),
    );

    for (const player of nextPlayers) {
      store.teamRosterEntries.push({
        id: createId(store, "teamRosterEntries", "roster"),
        teamId: team.id,
        playerId: player.playerId,
        season: "2026",
        phase: "R1",
        isMainRoster: player.isMainRoster,
        displayOrder: player.displayOrder,
        sourceUrl: "https://lolesports.com/ko-KR/news/2026-r1-roster",
        isManualOverride: true,
        updatedAt: new Date().toISOString(),
      });
    }
  });
}

export async function submitPrediction(input: {
  viewerId: string;
  matchId: string;
  selectedTeamCode: string;
}) {
  return mutateStore(async (store) => {
    const match = store.matches.find((item) => item.id === input.matchId);
    if (!match) {
      throw new Error("경기를 찾을 수 없습니다.");
    }

    if (match.status !== "scheduled" || isPredictionLocked(match)) {
      throw new Error("이 경기는 더 이상 예측할 수 없습니다.");
    }

    const selectedTeam =
      store.teams.find((team) => team.id === match.teamAId && team.code === input.selectedTeamCode) ??
      store.teams.find((team) => team.id === match.teamBId && team.code === input.selectedTeamCode);
    if (!selectedTeam) {
      throw new Error("유효한 팀 선택이 아닙니다.");
    }

    const existing = store.predictions.find(
      (prediction) => prediction.matchId === input.matchId && prediction.userId === input.viewerId,
    );
    if (existing) {
      existing.teamId = selectedTeam.id;
      existing.updatedAt = new Date().toISOString();
      return;
    }

    const predictionId = createId(store, "predictions", "prediction");
    store.predictions.push({
      id: predictionId,
      userId: input.viewerId,
      matchId: input.matchId,
      teamId: selectedTeam.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    appendPointLedgerEntry(store, {
      userId: input.viewerId,
      type: "earn",
      amount: POINTS.predictionSubmit,
      reason: "경기 예측 참여",
      referenceType: "prediction_submit",
      referenceId: predictionId,
    });
  });
}

export async function submitPlayerRating(input: {
  viewerId: string;
  matchId: string;
  playerId: string;
  score: number;
  comment: string;
}) {
  return mutateStore(async (store) => {
    const match = store.matches.find((item) => item.id === input.matchId);
    if (!match) {
      throw new Error("경기를 찾을 수 없습니다.");
    }
    if (match.status !== "finished") {
      throw new Error("평점은 경기 종료 후에만 작성할 수 있습니다.");
    }

    const participant = store.matchParticipants.find((item) => item.matchId === input.matchId && item.playerId === input.playerId);
    if (!participant) {
      throw new Error("이 경기의 출전 선수가 아닙니다.");
    }

    const existing = store.playerRatings.find(
      (rating) => rating.matchId === input.matchId && rating.playerId === input.playerId && rating.userId === input.viewerId,
    );
    if (existing) {
      existing.score = clampScore(input.score);
      existing.comment = input.comment.trim();
      existing.updatedAt = new Date().toISOString();
      return;
    }

    const ratingId = createId(store, "playerRatings", "rating");
    store.playerRatings.push({
      id: ratingId,
      userId: input.viewerId,
      matchId: input.matchId,
      playerId: input.playerId,
      score: clampScore(input.score),
      comment: input.comment.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    appendPointLedgerEntry(store, {
      userId: input.viewerId,
      type: "earn",
      amount: POINTS.legacyRatingSubmit,
      reason: "경기 평점 작성",
      referenceType: "player_rating_submit",
      referenceId: ratingId,
    });
  });
}

export async function submitSetPlayerRatings(input: {
  viewerId: string;
  matchId: string;
  setNumber: number;
  ratings: Array<{ playerId: string; score: number }>;
}) {
  return mutateStore(async (store) => {
    const match = store.matches.find((item) => item.id === input.matchId);
    if (!match || match.status !== "finished") {
      throw new Error("종료된 경기 세트에서만 평점을 남길 수 있습니다.");
    }

    const set = store.matchSets.find((item) => item.matchId === input.matchId && item.setNumber === input.setNumber);
    if (!set) {
      throw new Error("세트를 찾을 수 없습니다.");
    }

    if (input.ratings.length === 0) {
      throw new Error("저장할 평점이 없습니다.");
    }

    const participantIds = new Set(
      store.setParticipants
        .filter((participant) => participant.matchSetId === set.id)
        .map((participant) => participant.playerId),
    );
    let changedCount = 0;

    for (const ratingInput of input.ratings) {
      if (!participantIds.has(ratingInput.playerId)) {
        throw new Error("세트 출전 선수가 아닌 항목이 포함되어 있습니다.");
      }

      const score = clampScore(ratingInput.score);
      const existing = store.setPlayerRatings.find(
        (rating) => rating.matchSetId === set.id && rating.playerId === ratingInput.playerId && rating.userId === input.viewerId,
      );

      if (existing) {
        existing.score = score;
        existing.updatedAt = new Date().toISOString();
        continue;
      }

      changedCount += 1;
      store.setPlayerRatings.push({
        id: createId(store, "setPlayerRatings", "set_rating"),
        userId: input.viewerId,
        matchSetId: set.id,
        playerId: ratingInput.playerId,
        score,
        comment: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    if (changedCount > 0) {
      appendPointLedgerEntry(store, {
        userId: input.viewerId,
        type: "earn",
        amount: changedCount * POINTS.setRatingPerPlayer,
        reason: `세트 평점 ${changedCount}명 저장`,
        referenceType: "set_rating_submit",
        referenceId: `${set.id}:${input.viewerId}:${Date.now()}`,
      });
    }
  });
}

export async function submitComment(input: {
  viewerId: string;
  matchId: string;
  text: string;
}) {
  return mutateStore(async (store) => {
    const match = store.matches.find((item) => item.id === input.matchId);
    if (!match) {
      throw new Error("경기를 찾을 수 없습니다.");
    }

    const text = input.text.trim();
    if (text.length < 2) {
      throw new Error("댓글은 두 글자 이상 입력해 주세요.");
    }

    const commentId = createId(store, "comments", "comment");
    store.comments.push({
      id: commentId,
      userId: input.viewerId,
      matchId: input.matchId,
      text,
      hidden: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    appendPointLedgerEntry(store, {
      userId: input.viewerId,
      type: "earn",
      amount: POINTS.commentSubmit,
      reason: "경기 댓글 작성",
      referenceType: "comment_submit",
      referenceId: commentId,
    });
  });
}

export async function upsertMatch(input: {
  matchId?: string;
  league: string;
  stage: string;
  patch: string;
  status: "scheduled" | "finished";
  scheduledAt: string;
  teamACode: string;
  teamBCode: string;
  scoreA?: number | null;
  scoreB?: number | null;
  predictionLocked: boolean;
}) {
  return mutateStore(async (store) => {
    const teamA = store.teams.find((team) => team.code === input.teamACode);
    const teamB = store.teams.find((team) => team.code === input.teamBCode);
    if (!teamA || !teamB || teamA.id === teamB.id) {
      throw new Error("유효한 양 팀을 선택해 주세요.");
    }

    const now = new Date().toISOString();
    const match =
      store.matches.find((item) => item.id === input.matchId) ??
      ({
        id: createId(store, "matches", "match"),
        createdAt: now,
      } as StoredMatch);
    const previousTeamAId = match.teamAId;
    const previousTeamBId = match.teamBId;

    match.league = input.league.trim();
    match.stage = input.stage.trim();
    match.patch = input.patch.trim();
    match.status = input.status;
    match.scheduledAt = input.scheduledAt;
    match.teamAId = teamA.id;
    match.teamBId = teamB.id;
    match.scoreA = input.status === "finished" ? input.scoreA ?? 0 : null;
    match.scoreB = input.status === "finished" ? input.scoreB ?? 0 : null;
    match.predictionLocked = input.predictionLocked || input.status === "finished";
    match.updatedAt = now;

    if (!store.matches.some((item) => item.id === match.id)) {
      store.matches.push(match);
    }

    if (!previousTeamAId || !previousTeamBId || previousTeamAId !== teamA.id || previousTeamBId !== teamB.id) {
      store.matchParticipants = store.matchParticipants.filter((participant) => participant.matchId !== match.id);
      const roster = store.players.filter((player) => player.teamId === teamA.id || player.teamId === teamB.id);
      for (const player of roster) {
        store.matchParticipants.push({
          id: createId(store, "matchParticipants", "participant"),
          matchId: match.id,
          playerId: player.id,
          teamId: player.teamId,
        });
      }
    }
  });
}

export async function upsertMatchSet(input: {
  matchId: string;
  setId?: string;
  setNumber: number;
  winnerTeamCode: string;
  durationMinutes: number | null;
  note: string;
}) {
  return mutateStore(async (store) => {
    const match = store.matches.find((item) => item.id === input.matchId);
    if (!match) {
      throw new Error("경기를 찾을 수 없습니다.");
    }

    const winnerTeam = store.teams.find(
      (team) => (team.id === match.teamAId || team.id === match.teamBId) && team.code === input.winnerTeamCode,
    );
    if (!winnerTeam) {
      throw new Error("이 경기의 참가 팀만 세트 승자로 선택할 수 있습니다.");
    }

    const now = new Date().toISOString();
    const set =
      store.matchSets.find((item) => item.id === input.setId) ??
      ({
        id: createId(store, "matchSets", "set"),
        matchId: input.matchId,
        createdAt: now,
      } as StoredMatchSet);

    set.matchId = input.matchId;
    set.setNumber = input.setNumber;
    set.winnerTeamId = winnerTeam.id;
    set.durationMinutes = input.durationMinutes;
    set.teamAScore = winnerTeam.id === match.teamAId ? 1 : 0;
    set.teamBScore = winnerTeam.id === match.teamBId ? 1 : 0;
    set.note = input.note.trim();
    set.updatedAt = now;

    if (!store.matchSets.some((item) => item.id === set.id)) {
      store.matchSets.push(set);
    }

    const existingParticipants = store.setParticipants.filter((participant) => participant.matchSetId === set.id);
    if (existingParticipants.length === 0) {
      const roster = store.matchParticipants.filter((participant) => participant.matchId === input.matchId);
      for (const participant of roster) {
        store.setParticipants.push({
          id: createId(store, "setParticipants", "set_participant"),
          matchSetId: set.id,
          playerId: participant.playerId,
          teamId: participant.teamId,
        });
      }
    }
  });
}

export async function updateMatchRoster(matchId: string, playerIds: string[]) {
  return mutateStore(async (store) => {
    const match = store.matches.find((item) => item.id === matchId);
    if (!match) {
      throw new Error("경기를 찾을 수 없습니다.");
    }

    const allowedPlayers = store.players.filter((player) => player.teamId === match.teamAId || player.teamId === match.teamBId);
    const allowedIds = new Set(allowedPlayers.map((player) => player.id));
    const nextIds = playerIds.filter((playerId) => allowedIds.has(playerId));

    store.matchParticipants = store.matchParticipants.filter((participant) => participant.matchId !== matchId);
    for (const playerId of nextIds) {
      const player = store.players.find((item) => item.id === playerId);
      if (!player) {
        continue;
      }

      store.matchParticipants.push({
        id: createId(store, "matchParticipants", "participant"),
        matchId,
        playerId,
        teamId: player.teamId,
      });
    }
  });
}

export async function updateSetRoster(setId: string, playerIds: string[]) {
  return mutateStore(async (store) => {
    const set = store.matchSets.find((item) => item.id === setId);
    if (!set) {
      throw new Error("세트를 찾을 수 없습니다.");
    }

    const match = store.matches.find((item) => item.id === set.matchId);
    if (!match) {
      throw new Error("경기를 찾을 수 없습니다.");
    }

    const allowedPlayers = store.players.filter((player) => player.teamId === match.teamAId || player.teamId === match.teamBId);
    const allowedIds = new Set(allowedPlayers.map((player) => player.id));
    const nextIds = playerIds.filter((playerId) => allowedIds.has(playerId));

    store.setParticipants = store.setParticipants.filter((participant) => participant.matchSetId !== setId);
    for (const playerId of nextIds) {
      const player = store.players.find((item) => item.id === playerId);
      if (!player) {
        continue;
      }

      store.setParticipants.push({
        id: createId(store, "setParticipants", "set_participant"),
        matchSetId: setId,
        playerId,
        teamId: player.teamId,
      });
    }

    const nextIdSet = new Set(nextIds);
    store.setPlayerRatings = store.setPlayerRatings.filter(
      (rating) => rating.matchSetId !== setId || nextIdSet.has(rating.playerId),
    );
  });
}

export async function saveAdminSetRating(input: {
  userId: string;
  setId: string;
  playerId: string;
  score: number;
  comment: string;
}) {
  return mutateStore(async (store) => {
    const set = store.matchSets.find((item) => item.id === input.setId);
    if (!set) {
      throw new Error("세트를 찾을 수 없습니다.");
    }

    const participant = store.setParticipants.find((item) => item.matchSetId === input.setId && item.playerId === input.playerId);
    if (!participant) {
      throw new Error("이 세트의 출전 선수가 아닙니다.");
    }

    const existing = store.setPlayerRatings.find(
      (rating) => rating.matchSetId === input.setId && rating.playerId === input.playerId && rating.userId === input.userId,
    );

    if (existing) {
      existing.score = clampScore(input.score);
      existing.comment = input.comment.trim();
      existing.updatedAt = new Date().toISOString();
      return;
    }

    store.setPlayerRatings.push({
      id: createId(store, "setPlayerRatings", "set_rating"),
      userId: input.userId,
      matchSetId: input.setId,
      playerId: input.playerId,
      score: clampScore(input.score),
      comment: input.comment.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });
}

export async function setCommentHidden(commentId: string, hidden: boolean) {
  return mutateStore(async (store) => {
    const comment = store.comments.find((item) => item.id === commentId);
    if (!comment) {
      throw new Error("댓글을 찾을 수 없습니다.");
    }

    comment.hidden = hidden;
  });
}





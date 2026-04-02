import "server-only";

import { cache } from "react";

import type {
  NotificationType,
  PredictionSettlementResult,
  SeasonPredictionType,
  StoreShape,
  StoredComment,
  StoredMatch,
  StoredMatchSet,
  StoredNotification,
  StoredPointLedgerEntry,
  StoredSeasonPredictionEntry,
  StoredSeasonPredictionLockedDistribution,
  StoredSeasonPredictionOption,
  StoredSeasonPredictionQuestion,
  StoredTeamRosterEntry,
  StoredUser,
} from "@/lib/domain";
import { createId, mutateStore, readStore } from "@/lib/store";
import type {
  DashboardData,
  GlobalSearchResultData,
  GlobalSearchResultGroup,
  GlobalSearchResultItem,
  GlobalSearchResultType,
  HomeCommentFeedItem,
  HomeHeroStats,
  HomePlayerLeaderboardItem,
  PlayerDetailPageData,
  PlayerRankingItem,
  PlayerRankingPageData,
  MatchComment,
  MatchRatingComment,
  MatchMonthGroup,
  MatchData,
  MatchDateGroup,
  MatchDetailData,
  MatchListItem,
  MatchSetSummary,
  MatchWeekGroup,
  MyCommentItem,
  NotificationItem,
  KeyPlayerInsight,
  MyPageData,
  MyPointLedgerItem,
  PreMatchInsights,
  PublicUserSummary,
  PredictionComparisonItem,
  PredictionInsightItem,
  RosterPlayerItem,
  TeamRosterDetail,
  TeamRosterSummary,
  MyPredictionItem,
  MySeasonPredictionItem,
  MyRatingItem,
  MyStoreItem,
  PlayerRating,
  PlayerRole,
  PredictionLeaderboardItem,
  SeasonPredictionDetail,
  SeasonPredictionListData,
  SeasonPredictionOptionView,
  SeasonPredictionQuestionCard,
  SeasonPredictionQuestionStatus,
  ScheduleHubData,
  SetDetailData,
  SetPlayerRating,
  TeamStandingItem,
  UserProfile,
  WeekSchedule,
} from "@/components/lol-rating/types";

const relativeTime = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });
const roleOrder: Record<PlayerRole, number> = { TOP: 0, JGL: 1, MID: 2, ADC: 3, SUP: 4 };
const ROLE_SEQUENCE: PlayerRole[] = ["TOP", "JGL", "MID", "ADC", "SUP"];
const scheduleWeekdayOrder = [4, 5, 6, 0, 1, 2, 3] as const;
const COINS = {
  predictionSubmit: 10,
  predictionHit: 5,
  commentSubmit: 4,
  legacyRatingSubmit: 8,
  setRatingPerPlayer: 2,
} as const;

function getNowMs() {
  return Date.now();
}

function getNowIso() {
  return new Date().toISOString();
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function createNotification(
  store: StoreShape,
  input: Omit<StoredNotification, "id" | "createdAt"> & { createdAt?: string },
) {
  const duplicate = store.notifications.find(
    (notification) =>
      notification.userId === input.userId &&
      notification.type === input.type &&
      notification.relatedMatchId === input.relatedMatchId &&
      notification.title === input.title &&
      notification.rewardCoins === input.rewardCoins &&
      notification.appliedOddsPercent === input.appliedOddsPercent,
  );
  if (duplicate) {
    return duplicate;
  }

  const created = {
    id: createId(store, "notifications", "notification"),
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    relatedMatchId: input.relatedMatchId,
    createdAt: input.createdAt ?? new Date().toISOString(),
    isRead: input.isRead,
    rewardCoins: input.rewardCoins,
    appliedOddsPercent: input.appliedOddsPercent,
    metadata: input.metadata,
  } satisfies StoredNotification;
  store.notifications.push(created);
  return created;
}

function getMatchResult(match: StoredMatch) {
  if (match.status !== "finished" || match.scoreA === null || match.scoreB === null) {
    return null;
  }

  return match.scoreA > match.scoreB ? match.teamAId : match.teamBId;
}

function buildLockedDistribution(store: StoreShape, match: StoredMatch) {
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

function buildLockedOddsFromDistribution(distribution: { teamA: number; teamB: number; totalVotes: number }) {
  const createSide = (sharePct: number) => {
    const oddsPercent = Math.round(clamp(120 + ((85 - sharePct) / 70) * 80, 120, 200));
    const hitBonusCoins = Math.round(clamp(20 + ((85 - sharePct) / 70) * 40, 20, 60));
    return { oddsPercent, hitBonusCoins };
  };

  return {
    teamA: createSide(distribution.teamA),
    teamB: createSide(distribution.teamB),
  };
}

function getPredictionLifecycleState(match: StoredMatch) {
  if (match.predictionSettledAt) {
    return "settled" as const;
  }
  if (match.predictionLocked || getNowMs() >= getPredictionDeadlineAt(match.scheduledAt).getTime()) {
    return "locked" as const;
  }
  return "open" as const;
}

function getSeasonQuestionOptions(store: StoreShape, questionId: string) {
  return store.seasonPredictionOptions
    .filter((option) => option.questionId === questionId)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function getSeasonQuestionEntries(store: StoreShape, questionId: string) {
  return store.seasonPredictionEntries.filter((entry) => entry.questionId === questionId);
}

function buildSeasonLockedDistribution(store: StoreShape, questionId: string): StoredSeasonPredictionLockedDistribution {
  const entries = getSeasonQuestionEntries(store, questionId);
  const options = getSeasonQuestionOptions(store, questionId);
  const totalEntries = entries.length;

  return {
    totalEntries,
    optionShares: options.map((option) => {
      const voteCount = entries.filter((entry) => entry.selectedOptionId === option.id).length;
      return {
        optionId: option.id,
        voteCount,
        sharePercent: totalEntries > 0 ? Math.round((voteCount / totalEntries) * 100) : 0,
      };
    }),
    capturedAt: new Date().toISOString(),
  };
}

function getSeasonQuestionStatus(question: StoredSeasonPredictionQuestion): SeasonPredictionQuestionStatus {
  if (question.manualStatus === "canceled") {
    return "canceled";
  }
  if (question.manualStatus === "draft" || question.visibility === "private") {
    return "draft";
  }
  if (question.resultOptionId || question.resultValue || question.resolvedAt) {
    return "resolved";
  }
  if (getNowMs() >= new Date(question.closeAt).getTime()) {
    return "locked";
  }
  return "open";
}

function ensureSeasonPredictionLifecycle(store: StoreShape) {
  for (const question of store.seasonPredictionQuestions) {
    const status = getSeasonQuestionStatus(question);
    if (status === "locked" && !question.lockedDistribution) {
      const distribution = buildSeasonLockedDistribution(store, question.id);
      question.lockedDistribution = distribution;
      question.lockedAt = distribution.capturedAt;
      question.updatedAt = distribution.capturedAt;
      for (const entry of getSeasonQuestionEntries(store, question.id)) {
        entry.lockedAt = distribution.capturedAt;
        entry.snapshot = distribution;
        entry.status = "locked";
      }
    }

    if (status === "resolved") {
      const distribution = question.lockedDistribution ?? buildSeasonLockedDistribution(store, question.id);
      question.lockedDistribution = distribution;
      if (!question.lockedAt) {
        question.lockedAt = distribution.capturedAt;
      }
      for (const entry of getSeasonQuestionEntries(store, question.id)) {
        const isHit = question.resultOptionId ? entry.selectedOptionId === question.resultOptionId : false;
        entry.lockedAt = entry.lockedAt ?? question.lockedAt;
        entry.snapshot = entry.snapshot ?? distribution;
        entry.status = "resolved";
        entry.hitStatus = isHit ? "hit" : "miss";
      }
    }

    if (status === "canceled") {
      for (const entry of getSeasonQuestionEntries(store, question.id)) {
        entry.status = "canceled";
        entry.hitStatus = "canceled";
      }
    }
  }
}

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

function getUserPredictionStyleLabel(store: StoreShape, userId: string) {
  const resolvedPredictions = store.predictions.filter(
    (prediction) => prediction.userId === userId && prediction.settlementResult !== null,
  );
  const underdogPickRate =
    resolvedPredictions.length > 0
      ? Math.round((resolvedPredictions.filter((prediction) => prediction.wasUnderdogPick).length / resolvedPredictions.length) * 100)
      : 0;

  return getPredictionStyleLabel(underdogPickRate);
}

function buildPublicUserSummary(store: StoreShape, userId: string | null): PublicUserSummary | null {
  if (!userId) {
    return null;
  }

  const user = getUserById(store, userId);
  if (!user) {
    return null;
  }

  const profile = buildProfile(store, user);

  return {
    userId: user.id,
    nickname: getPublicName(user),
    bio: user.bio ?? "아직 소개 문구가 없습니다.",
    points: profile.points,
    predictionAccuracy: profile.predictionAccuracy,
    predictionStyleLabel: getUserPredictionStyleLabel(store, user.id),
    level: profile.level,
  };
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
    throw new Error("코인이 부족합니다.");
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

function settlePredictionForMatch(store: StoreShape, match: StoredMatch) {
  if (!match.lockedDistribution) {
    match.lockedDistribution = buildLockedDistribution(store, match);
  }
  if (!match.lockedOdds) {
    match.lockedOdds = buildLockedOddsFromDistribution(match.lockedDistribution);
  }
  if (match.predictionSettledAt) {
    return;
  }

  const winnerTeamId = getMatchResult(match);
  if (!winnerTeamId) {
    return;
  }

  const teamA = getTeamById(store, match.teamAId);
  const teamB = getTeamById(store, match.teamBId);
  if (!teamA || !teamB || !match.lockedOdds || !match.lockedDistribution) {
    return;
  }

  const predictions = store.predictions.filter((prediction) => prediction.matchId === match.id);
  for (const prediction of predictions) {
    if (prediction.settledAt) {
      continue;
    }

    const isHit = prediction.teamId === winnerTeamId;
    const pickedTeamCode = prediction.teamId === match.teamAId ? teamA.code : teamB.code;
    const winnerTeamCode = winnerTeamId === match.teamAId ? teamA.code : teamB.code;
    const appliedSide = prediction.teamId === match.teamAId ? match.lockedOdds.teamA : match.lockedOdds.teamB;
    const pickedShare = prediction.teamId === match.teamAId ? match.lockedDistribution.teamA : match.lockedDistribution.teamB;
    const timestamp = new Date().toISOString();

    prediction.settledAt = timestamp;
    prediction.settlementResult = isHit ? "hit" : "miss";
    prediction.appliedOddsPercent = appliedSide.oddsPercent;
    prediction.wasUnderdogPick = pickedShare < 50;

    if (isHit) {
      prediction.settlementCoins = appliedSide.hitBonusCoins;
      const ledgerReferenceId = `${prediction.id}:settlement`;
      const existingLedger = store.pointLedger.some(
        (entry) => entry.referenceType === "prediction_settlement" && entry.referenceId === ledgerReferenceId,
      );
      if (!existingLedger) {
        appendPointLedgerEntry(store, {
          userId: prediction.userId,
          type: "earn",
          amount: appliedSide.hitBonusCoins,
          reason: `예측 적중 추가 코인 (배당 ${appliedSide.oddsPercent}%)`,
          referenceType: "prediction_settlement",
          referenceId: ledgerReferenceId,
        });
      }
      createNotification(store, {
        userId: prediction.userId,
        type: "prediction_hit",
        title: `${teamA.code} vs ${teamB.code} 예측 적중`,
        body: `${pickedTeamCode} 적중. 마감 기준 배당 ${appliedSide.oddsPercent}%가 적용되어 +${appliedSide.hitBonusCoins} Coin을 획득했습니다.`,
        relatedMatchId: match.id,
        isRead: false,
        rewardCoins: appliedSide.hitBonusCoins,
        appliedOddsPercent: appliedSide.oddsPercent,
        metadata: {
          pickedTeam: pickedTeamCode,
          winnerTeam: winnerTeamCode,
          sharePct: pickedShare,
        },
        createdAt: timestamp,
      });
    } else {
      prediction.settlementCoins = 0;
      createNotification(store, {
        userId: prediction.userId,
        type: "prediction_missed",
        title: `${teamA.code} vs ${teamB.code} 예측 결과`,
        body: `${pickedTeamCode} 선택이 빗나갔습니다. 참여 보상은 유지되고, 승리 팀은 ${winnerTeamCode}입니다.`,
        relatedMatchId: match.id,
        isRead: false,
        rewardCoins: 0,
        appliedOddsPercent: appliedSide.oddsPercent,
        metadata: {
          pickedTeam: pickedTeamCode,
          winnerTeam: winnerTeamCode,
          sharePct: pickedShare,
        },
        createdAt: timestamp,
      });
    }
  }

  match.predictionSettledAt = new Date().toISOString();
}

function ensurePredictionLifecycle(store: StoreShape) {
  for (const match of store.matches) {
    const deadlineMs = getPredictionDeadlineAt(match.scheduledAt).getTime();
    const shouldLock = !match.predictionLockedAt && getNowMs() >= deadlineMs;
    if (shouldLock) {
      match.predictionLocked = true;
      match.predictionLockedAt = new Date(deadlineMs).toISOString();
      match.lockedDistribution = buildLockedDistribution(store, match);
      match.lockedOdds = buildLockedOddsFromDistribution(match.lockedDistribution);
      match.updatedAt = new Date().toISOString();
    }

    if (match.status === "finished" && !match.predictionSettledAt) {
      settlePredictionForMatch(store, match);
    }
  }
}

function getPredictionDeadlineAt(scheduledAt: string) {
  return new Date(new Date(scheduledAt).getTime() - 10 * 60 * 1000);
}

function isPredictionLocked(match: StoredMatch) {
  return match.predictionLocked || match.status === "finished" || getNowMs() >= getPredictionDeadlineAt(match.scheduledAt).getTime();
}

function formatRelativeLabel(value: string) {
  const target = new Date(value).getTime();
  const minutes = Math.round((target - getNowMs()) / 60000);
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

function normalizeStageLabel(stage: string, matchId: string) {
  if (!stage || stage.includes("�") || stage.includes("占")) {
    const number = Number(matchId.replace("match_", ""));
    if (number >= 1 && number <= 45) {
      return "정규시즌 1R";
    }
    if (number >= 46 && number <= 90) {
      return "정규시즌 2R";
    }

    const roadToMsiStage: Record<number, string> = {
      91: "Road to MSI 1R",
      92: "Road to MSI 2R",
      93: "Road to MSI 3R",
      94: "Road to MSI 4R",
      95: "Road to MSI 최종전",
    };
    return roadToMsiStage[number] ?? "LCK 2026";
  }

  return stage;
}

function getWeekdaySortOrder(date: Date) {
  return scheduleWeekdayOrder[date.getDay()] ?? 99;
}

function getScheduleWeekStart(date: Date) {
  const copy = new Date(date);
  const daysFromWednesday = (copy.getDay() - 3 + 7) % 7;
  copy.setDate(copy.getDate() - daysFromWednesday);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function getTeamById(store: StoreShape, teamId: string) {
  return store.teams.find((team) => team.id === teamId) ?? null;
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}.:\s-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeSearchQuery(query: string) {
  return normalizeSearchText(query).split(" ").filter(Boolean);
}

function getMatchSearchStatusLabel(match: StoredMatch) {
  if (match.status === "finished") {
    return "종료";
  }
  return new Date(match.scheduledAt).getTime() <= getNowMs() ? "진행중" : "예정";
}

function getSearchScore(haystack: string, rawQuery: string, tokens: string[]) {
  const text = normalizeSearchText(haystack);
  const query = normalizeSearchText(rawQuery);
  if (!text || !query) {
    return 0;
  }

  if (text === query) {
    return 300;
  }
  if (text.startsWith(query)) {
    return 220;
  }
  if (!text.includes(query)) {
    return 0;
  }

  const matchedTokens = tokens.filter((token) => text.includes(token)).length;
  return 150 + matchedTokens * 25;
}

function buildGlobalSearchResultData(
  store: StoreShape,
  query: string,
  limitPerType?: number,
): GlobalSearchResultData {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return { query, totalCount: 0, groups: [] };
  }

  const tokens = tokenizeSearchQuery(normalizedQuery);

  const collect = <T extends GlobalSearchResultType>(
    type: T,
    label: string,
    items: Array<GlobalSearchResultItem & { score: number }>,
  ): GlobalSearchResultGroup => ({
    type,
    label,
    items: items
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "ko"))
      .slice(0, limitPerType && limitPerType > 0 ? limitPerType : undefined)
      .map(({ score: _score, ...rest }) => rest),
  });

  const teamItems = store.teams
    .filter((team) => team.code !== "TBD")
    .map((team) => {
      const title = team.code;
      const subtitle = team.name;
      const score = getSearchScore(`${team.code} ${team.name} ${team.shortName}`, normalizedQuery, tokens);
      return {
        type: "team" as const,
        id: team.id,
        title,
        subtitle,
        href: `/teams?team=${team.code}`,
        score,
      };
    })
    .filter((item) => item.score > 0);

  const playerItems = store.players
    .map((player) => {
      const team = getTeamById(store, player.teamId);
      const teamCode = team?.code ?? "-";
      const roleLabel = player.role;
      const score = getSearchScore(
        `${player.name} ${teamCode} ${team?.name ?? ""} ${roleLabel}`,
        normalizedQuery,
        tokens,
      );
      return {
        type: "player" as const,
        id: player.id,
        title: player.name,
        subtitle: `${teamCode} · ${roleLabel}`,
        href: `/player/${player.slug}`,
        score,
      };
    })
    .filter((item) => item.score > 0);

  const matchItems = store.matches
    .map((match) => {
      const teamA = getTeamById(store, match.teamAId)?.code ?? "TBD";
      const teamB = getTeamById(store, match.teamBId)?.code ?? "TBD";
      const statusLabel = getMatchSearchStatusLabel(match);
      const dateLabel = formatDateLabel(match.scheduledAt);
      const stageLabel = normalizeStageLabel(match.stage, match.id);
      const score = getSearchScore(
        `${teamA} ${teamB} ${teamA} vs ${teamB} ${dateLabel} ${statusLabel} ${stageLabel}`,
        normalizedQuery,
        tokens,
      );
      return {
        type: "match" as const,
        id: match.id,
        title: `${teamA} vs ${teamB}`,
        subtitle: `${dateLabel} · ${statusLabel}`,
        href: `/matches/${match.id}`,
        score,
      };
    })
    .filter((item) => item.score > 0);

  const groups = [
    collect("team", "팀", teamItems),
    collect("player", "선수", playerItems),
    collect("match", "경기", matchItems),
  ].filter((group) => group.items.length > 0);

  return {
    query,
    totalCount: groups.reduce((sum, group) => sum + group.items.length, 0),
    groups,
  };
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
        playerSlug: player.slug,
        name: player.name,
        role: player.role,
        isMainRoster: entry.isMainRoster,
        displayOrder: entry.displayOrder,
      } satisfies RosterPlayerItem;
    })
    .filter((item): item is RosterPlayerItem => item !== null)
    .sort((a, b) => a.displayOrder - b.displayOrder || roleOrder[a.role] - roleOrder[b.role]);
}

function pickDefaultLineupPlayerIds(store: StoreShape, teamId: string): string[] {
  const rosterPlayers = buildRosterPlayerItems(store, getRosterEntriesForTeam(store, teamId));
  const fallbackPlayers = store.players
    .filter((player) => player.teamId === teamId)
    .slice()
    .sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);
  const pickedIds = new Set<string>();
  const lineup: string[] = [];

  for (const role of ROLE_SEQUENCE) {
    const fromRoster = rosterPlayers.find((player) => player.role === role && !pickedIds.has(player.playerId));
    const fromFallback = fallbackPlayers.find((player) => player.role === role && !pickedIds.has(player.id));
    const pickedId = fromRoster?.playerId ?? fromFallback?.id ?? null;
    if (!pickedId) {
      continue;
    }

    pickedIds.add(pickedId);
    lineup.push(pickedId);
  }

  return lineup;
}

function getUserById(store: StoreShape, userId: string) {
  return store.users.find((user) => user.id === userId) ?? null;
}

function getSetById(store: StoreShape, setId: string) {
  return store.matchSets.find((set) => set.id === setId) ?? null;
}

function getMatchById(store: StoreShape, matchId: string) {
  return store.matches.find((match) => match.id === matchId) ?? null;
}

function getPlayerById(store: StoreShape, playerId: string) {
  return store.players.find((player) => player.id === playerId) ?? null;
}

function getPlayerBySlug(store: StoreShape, playerSlug: string) {
  return store.players.find((player) => player.slug === playerSlug) ?? null;
}

function countVisibleComments(comments: StoredComment[], matchId: string) {
  return comments.filter((comment) => comment.matchId === matchId && !comment.hidden).length;
}

function getSetRatings(store: StoreShape, matchSetId: string, playerId: string) {
  return store.setPlayerRatings.filter((rating) => rating.matchSetId === matchSetId && rating.playerId === playerId);
}

function getMatchPlayers(store: StoreShape, matchId: string, viewerId: string | null) {
  const match = getMatchById(store, matchId);
  const participants = store.matchParticipants.filter((participant) => participant.matchId === matchId);
  const fallbackParticipants =
    participants.length > 0 || !match
      ? participants
      : [match.teamAId, match.teamBId].flatMap((teamId) => {
          const pickedPlayerIds = pickDefaultLineupPlayerIds(store, teamId);

          return pickedPlayerIds.map((playerId) => ({
            id: `fallback_${matchId}_${teamId}_${playerId}`,
            matchId,
            teamId,
            playerId,
          }));
        });

  return fallbackParticipants
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
      const fallbackScores =
        allScores.length > 0
          ? allScores
          : [
              ...store.playerRatings.filter((rating) => rating.playerId === participant.playerId).map((rating) => rating.score),
              ...store.setPlayerRatings.filter((rating) => rating.playerId === participant.playerId).map((rating) => rating.score),
            ];
      const viewerRating = viewerId
        ? ratings.find((rating) => rating.userId === viewerId) ?? null
        : null;

      return {
        id: player.id,
        playerSlug: player.slug,
        name: player.name,
        team: team.code,
        role: player.role,
        rating: Number(average(fallbackScores).toFixed(1)),
        ratingCount: fallbackScores.length,
        viewerScore: viewerRating?.score ?? null,
        viewerComment: viewerRating?.comment ?? "",
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

function buildComments(store: StoreShape, matchId: string, viewerId: string | null): MatchComment[] {
  const visible = store.comments.filter((comment) => comment.matchId === matchId && !comment.hidden);
  const replyCountByParent = new Map<string, number>();

  for (const comment of visible) {
    if (!comment.parentId) {
      continue;
    }
    replyCountByParent.set(comment.parentId, (replyCountByParent.get(comment.parentId) ?? 0) + 1);
  }

  return store.comments
    .filter((comment) => comment.matchId === matchId && !comment.hidden)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((comment) => {
      const author = getUserById(store, comment.userId);
      const recommendationCount = comment.recommendUserIds.length;
      return {
        id: comment.id,
        userId: author?.id ?? null,
        parentId: comment.parentId,
        user: getPublicName(author),
        userSummary: buildPublicUserSummary(store, author?.id ?? null),
        createdLabel: formatRelativeLabel(comment.createdAt),
        likes: recommendationCount,
        likedByMe: viewerId ? comment.recommendUserIds.includes(viewerId) : false,
        replyCount: replyCountByParent.get(comment.id) ?? 0,
        text: comment.text,
        tag: "반응",
      };
    });
}

function buildMatchRatingComments(store: StoreShape, matchId: string): MatchRatingComment[] {
  return store.playerRatings
    .filter((rating) => rating.matchId === matchId)
    .filter((rating) => rating.comment.trim().length > 0)
    .slice()
    .sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime())
    .map((rating) => {
      const author = getUserById(store, rating.userId);
      const player = store.players.find((item) => item.id === rating.playerId);
      const teamCode = player ? getTeamById(store, player.teamId)?.code ?? "-" : "-";

      return {
        id: rating.id,
        user: getPublicName(author),
        playerName: player?.name ?? rating.playerId,
        team: teamCode,
        score: rating.score,
        text: rating.comment.trim(),
        createdLabel: formatRelativeLabel(rating.updatedAt ?? rating.createdAt),
      } satisfies MatchRatingComment;
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

function buildSetSummary(store: StoreShape, set: StoredMatchSet, viewerId: string | null): MatchSetSummary {
  const isPlayed = set.winnerTeamId !== null;
  const winnerTeam = set.winnerTeamId ? getTeamById(store, set.winnerTeamId)?.code ?? null : null;
  const ratingParticipants = store.setPlayerRatings.filter((rating) => rating.matchSetId === set.id).length;

  return {
    id: set.id,
    setNumber: set.setNumber,
    title: `세트 ${set.setNumber}`,
    isPlayed,
    winnerTeam,
    durationLabel: isPlayed ? formatDurationLabel(set.durationMinutes) : "-",
    scoreLabel: isPlayed ? `${set.teamAScore} : ${set.teamBScore}` : "미진행",
    note: set.note,
    ratingParticipants,
    topPerformer: isPlayed ? buildSetTopPerformer(store, set) : null,
    viewerHasRated: viewerId ? store.setPlayerRatings.some((rating) => rating.matchSetId === set.id && rating.userId === viewerId) : false,
  };
}

function getTeamRecentMatches(store: StoreShape, teamId: string, beforeIso: string, limit = 5) {
  const cutoff = new Date(beforeIso).getTime();
  return store.matches
    .filter((item) => item.status === "finished")
    .filter((item) => (item.teamAId === teamId || item.teamBId === teamId) && new Date(item.scheduledAt).getTime() < cutoff)
    .slice()
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    .slice(0, limit);
}

function toFormAndStreak(matches: StoredMatch[], teamId: string) {
  const recent = matches
    .map((item) => {
      if (item.scoreA === null || item.scoreB === null) {
        return null;
      }
      const teamScore = item.teamAId === teamId ? item.scoreA : item.scoreB;
      const opponentScore = item.teamAId === teamId ? item.scoreB : item.scoreA;
      return teamScore > opponentScore ? "W" : "L";
    })
    .filter((item): item is "W" | "L" => item !== null);

  if (recent.length === 0) {
    return { recent: [] as Array<"W" | "L">, streakLabel: "최근 데이터 없음" };
  }

  const streakResult = recent[0];
  let streakCount = 0;
  for (const result of recent) {
    if (result !== streakResult) {
      break;
    }
    streakCount += 1;
  }

  return {
    recent,
    streakLabel: streakResult === "W" ? `${streakCount}연승` : `${streakCount}연패`,
  };
}

function buildHeadToHead(store: StoreShape, match: StoredMatch) {
  const cutoff = new Date(match.scheduledAt).getTime();
  const recent = store.matches
    .filter((item) => item.status === "finished")
    .filter((item) => {
      const isSamePair =
        (item.teamAId === match.teamAId && item.teamBId === match.teamBId) ||
        (item.teamAId === match.teamBId && item.teamBId === match.teamAId);
      return isSamePair && new Date(item.scheduledAt).getTime() < cutoff;
    })
    .slice()
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    .slice(0, 5);

  let teamAWins = 0;
  let teamBWins = 0;
  for (const item of recent) {
    if (item.scoreA === null || item.scoreB === null || item.scoreA === item.scoreB) {
      continue;
    }
    const winner = item.scoreA > item.scoreB ? item.teamAId : item.teamBId;
    if (winner === match.teamAId) {
      teamAWins += 1;
    } else if (winner === match.teamBId) {
      teamBWins += 1;
    }
  }

  return { teamAWins, teamBWins, totalMatches: recent.length };
}

function buildRecentHeadToHead(store: StoreShape, match: StoredMatch) {
  const cutoff = new Date(match.scheduledAt).getTime();
  const samePair = store.matches
    .filter((item) => {
      const isSamePair =
        (item.teamAId === match.teamAId && item.teamBId === match.teamBId) ||
        (item.teamAId === match.teamBId && item.teamBId === match.teamAId);
      return isSamePair && new Date(item.scheduledAt).getTime() < cutoff;
    })
    .slice()
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    .slice(0, 3);

  const sourceMatches =
    samePair.length > 0
      ? samePair
      : [
          {
            id: `${match.id}_placeholder`,
            stage: match.stage,
            scheduledAt: match.scheduledAt,
            teamAId: match.teamAId,
            teamBId: match.teamBId,
            scoreA: null,
            scoreB: null,
          } satisfies Pick<StoredMatch, "id" | "stage" | "scheduledAt" | "teamAId" | "teamBId" | "scoreA" | "scoreB">,
        ];

  return sourceMatches
    .map((item) => {
      const rawScoreA = item.teamAId === match.teamAId ? item.scoreA : item.scoreB;
      const rawScoreB = item.teamBId === match.teamBId ? item.scoreB : item.scoreA;
      return {
        id: item.id,
        label: normalizeStageLabel(item.stage, item.id),
        scoreA: rawScoreA ?? null,
        scoreB: rawScoreB ?? null,
        playedAt: item.scheduledAt,
      };
    });
}

function getTeamKeyPlayerInsight(store: StoreShape, match: StoredMatch, teamId: string): KeyPlayerInsight | null {
  const participantIds = store.matchParticipants
    .filter((item) => item.matchId === match.id && item.teamId === teamId)
    .map((item) => item.playerId);
  const fallbackIds = store.players.filter((player) => player.teamId === teamId).map((player) => player.id);
  const candidateIds = participantIds.length > 0 ? participantIds : fallbackIds;

  const candidates = candidateIds
    .map((playerId) => {
      const player = store.players.find((item) => item.id === playerId);
      if (!player) {
        return null;
      }

      const legacyScores = store.playerRatings.filter((rating) => rating.playerId === playerId).map((rating) => rating.score);
      const setScores = store.setPlayerRatings.filter((rating) => rating.playerId === playerId).map((rating) => rating.score);
      const allScores = [...legacyScores, ...setScores];
      if (allScores.length === 0) {
        return null;
      }

      const avgRating = Number(average(allScores).toFixed(1));
      return {
        playerId: player.id,
        name: player.name,
        role: player.role,
        avgRating,
        ratingCount: allScores.length,
      } satisfies KeyPlayerInsight;
    })
    .filter((item): item is KeyPlayerInsight => item !== null)
    .sort((a, b) => {
      if (b.avgRating !== a.avgRating) {
        return b.avgRating - a.avgRating;
      }
      return b.ratingCount - a.ratingCount;
    });

  return candidates[0] ?? null;
}

function buildPreMatchInsights(store: StoreShape, match: StoredMatch): PreMatchInsights {
  const teamARecent = getTeamRecentMatches(store, match.teamAId, match.scheduledAt, 5);
  const teamBRecent = getTeamRecentMatches(store, match.teamBId, match.scheduledAt, 5);

  return {
    teamAForm: toFormAndStreak(teamARecent, match.teamAId),
    teamBForm: toFormAndStreak(teamBRecent, match.teamBId),
    h2h: buildHeadToHead(store, match),
    recentHeadToHead: buildRecentHeadToHead(store, match),
    keyPlayers: {
      teamA: getTeamKeyPlayerInsight(store, match, match.teamAId),
      teamB: getTeamKeyPlayerInsight(store, match, match.teamBId),
    },
  };
}

function buildMatchView(store: StoreShape, match: StoredMatch, viewerId: string | null): MatchData {
  const teamA = getTeamById(store, match.teamAId);
  const teamB = getTeamById(store, match.teamBId);
  if (!teamA || !teamB) {
    throw new Error(`Invalid match teams for ${match.id}`);
  }

  const players = getMatchPlayers(store, match.id, viewerId);
  const comments = buildComments(store, match.id, viewerId);
  const ratingComments = buildMatchRatingComments(store, match.id);
  const predictionSummary = match.lockedDistribution ?? buildPredictionSummary(store, match);
  const totalRatings =
    store.playerRatings.filter((rating) => rating.matchId === match.id).length +
    store.setPlayerRatings.filter((rating) => getSetById(store, rating.matchSetId)?.matchId === match.id).length;
  const averagePlayerRating = players.filter((player) => player.ratingCount > 0);
  const myPrediction = viewerId
    ? store.predictions.find((prediction) => prediction.matchId === match.id && prediction.userId === viewerId)
    : null;

  return {
    id: match.id,
    league: match.league,
    stage: normalizeStageLabel(match.stage, match.id),
    patch: match.patch,
    status: match.status,
    date: formatDateLabel(match.scheduledAt),
    serverNow: getNowIso(),
    scheduledAt: match.scheduledAt,
    predictionDeadlineAt: getPredictionDeadlineAt(match.scheduledAt).toISOString(),
    teamA: teamA.code,
    teamB: teamB.code,
    score: match.scoreA === null || match.scoreB === null ? "-" : `${match.scoreA} : ${match.scoreB}`,
    comments: countVisibleComments(store.comments, match.id),
    totalRatings,
    averagePlayerRating: averagePlayerRating.length > 0 ? Number(average(averagePlayerRating.map((player) => player.rating)).toFixed(1)) : null,
    viewerPlayerRatingCount: viewerId ? store.playerRatings.filter((rating) => rating.matchId === match.id && rating.userId === viewerId).length : 0,
    mvp: buildMvp(players),
    predictionLocked: isPredictionLocked(match),
    predictionLifecycleState: getPredictionLifecycleState(match),
    predictionSummary,
    lockedDistribution: match.lockedDistribution,
    lockedOdds: match.lockedOdds,
    myPredictionOddsPercent:
      myPrediction && match.lockedOdds
        ? myPrediction.teamId === match.teamAId
          ? match.lockedOdds.teamA.oddsPercent
          : match.lockedOdds.teamB.oddsPercent
        : null,
    myPredictionBonusCoins:
      myPrediction && match.lockedOdds
        ? myPrediction.teamId === match.teamAId
          ? match.lockedOdds.teamA.hitBonusCoins
          : match.lockedOdds.teamB.hitBonusCoins
        : null,
    myPredictionSettlementResult: myPrediction?.settlementResult ?? null,
    myPredictionSettlementCoins: myPrediction?.settlementCoins ?? 0,
    players,
    ratingComments,
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
      ownedPersonas: ["관전자", "기본 프로필"],
      selectedProfileTheme: null,
      predictionAccuracy: 0,
      predictionStats: { total: 0, hit: 0, miss: 0, streak: 0 },
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
  const predictionAccuracy = resolved.length > 0 ? Math.round((hit / resolved.length) * 100) : 0;
  const points = getUserPointBalance(store, viewer.id);

  return {
    nickname: viewer.nickname ?? "닉네임 설정 필요",
    email: viewer.email,
    image: viewer.image,
    isAuthenticated: true,
    hasNickname: Boolean(viewer.nickname),
    points,
    level: Math.max(1, Math.floor(points / 120) + 1),
    ownedPersonas: ["경기 분석가", viewer.role === "admin" ? "운영자" : "세트 평점러"],
    selectedProfileTheme: viewer.selectedProfileTheme,
    predictionAccuracy,
    predictionStats: {
      total: resolved.length,
      hit,
      miss: Math.max(0, miss),
      streak: hit > 0 ? Math.min(hit, 5) : 0,
    },
  };
}

function buildTeamStandings(store: StoreShape): TeamStandingItem[] {
  const baseRows = store.teams
    .filter((team) => team.code !== "TBD")
    .map((team) => ({
      teamId: team.id,
      teamCode: team.code,
      wins: 0,
      losses: 0,
      setsWon: 0,
      setsLost: 0,
    }));
  const rowsById = new Map(baseRows.map((row) => [row.teamId, row]));

  for (const match of store.matches) {
    if (match.status !== "finished" || match.scoreA === null || match.scoreB === null) {
      continue;
    }

    const rowA = rowsById.get(match.teamAId);
    const rowB = rowsById.get(match.teamBId);
    if (!rowA || !rowB) {
      continue;
    }

    rowA.setsWon += match.scoreA;
    rowA.setsLost += match.scoreB;
    rowB.setsWon += match.scoreB;
    rowB.setsLost += match.scoreA;

    if (match.scoreA > match.scoreB) {
      rowA.wins += 1;
      rowB.losses += 1;
    } else if (match.scoreB > match.scoreA) {
      rowB.wins += 1;
      rowA.losses += 1;
    }
  }

  return baseRows
    .slice()
    .sort((a, b) =>
      b.wins - a.wins ||
      a.losses - b.losses ||
      (b.setsWon - b.setsLost) - (a.setsWon - a.setsLost) ||
      a.teamCode.localeCompare(b.teamCode, "en"),
    )
    .map((row, index) => {
      const total = row.wins + row.losses;
      return {
        rank: index + 1,
        teamCode: row.teamCode,
        wins: row.wins,
        losses: row.losses,
        setDiff: row.setsWon - row.setsLost,
        winRate: total > 0 ? Math.round((row.wins / total) * 100) : 0,
      };
    });
}

function buildPredictionLeaderboard(store: StoreShape): PredictionLeaderboardItem[] {
  return store.users
    .filter((user) => Boolean(user.nickname))
    .map((user) => {
      const predictions = store.predictions.filter((prediction) => prediction.userId === user.id);
      const resolved = predictions.filter((prediction) => {
        const match = store.matches.find((item) => item.id === prediction.matchId);
        return match?.status === "finished" && match.scoreA !== null && match.scoreB !== null;
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

      return {
        userId: user.id,
        nickname: user.nickname ?? "",
        userSummary: buildPublicUserSummary(store, user.id),
        points: getUserPointBalance(store, user.id),
        accuracy: resolved.length > 0 ? Math.round((hit / resolved.length) * 100) : 0,
        hit,
        miss: Math.max(0, miss),
      };
    })
    .sort((a, b) =>
      b.points - a.points ||
      b.accuracy - a.accuracy ||
      b.hit - a.hit ||
      a.nickname.localeCompare(b.nickname, "ko"),
    )
    .slice(0, 10)
    .map((item, index) => ({
      rank: index + 1,
      ...item,
    }));
}

function buildNotificationItems(store: StoreShape, viewerId: string | null, limit?: number): NotificationItem[] {
  if (!viewerId) {
    return [];
  }

  return store.notifications
    .filter((notification) => notification.userId === viewerId)
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit ?? Number.MAX_SAFE_INTEGER)
    .map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      relatedMatchId: notification.relatedMatchId,
      createdAt: notification.createdAt,
      createdLabel: formatRelativeLabel(notification.createdAt),
      isRead: notification.isRead,
      rewardCoins: notification.rewardCoins,
      appliedOddsPercent: notification.appliedOddsPercent,
    }));
}

function getPredictionStyleLabel(underdogPickRate: number) {
  if (underdogPickRate < 35) {
    return "안정형";
  }
  if (underdogPickRate <= 55) {
    return "균형형";
  }
  return "공격형";
}

function buildPredictionInsights(store: StoreShape, viewerId: string): {
  insights: PredictionInsightItem[];
  comparison: PredictionComparisonItem[];
  styleLabel: string;
} {
  const userPredictions = store.predictions.filter((prediction) => prediction.userId === viewerId && prediction.settledAt);
  const resolvedPredictions = userPredictions.filter((prediction) => prediction.settlementResult !== null);
  const totalPredictions = resolvedPredictions.length;
  const hits = resolvedPredictions.filter((prediction) => prediction.settlementResult === "hit");
  const underdogSelections = resolvedPredictions.filter((prediction) => prediction.wasUnderdogPick);
  const underdogHits = hits.filter((prediction) => prediction.wasUnderdogPick);
  const totalCoins = resolvedPredictions.reduce((sum, prediction) => sum + COINS.predictionSubmit + prediction.settlementCoins, 0);
  const avgBonus = hits.length > 0 ? Math.round(hits.reduce((sum, prediction) => sum + prediction.settlementCoins, 0) / hits.length) : 0;
  const underdogRate = totalPredictions > 0 ? Math.round((underdogSelections.length / totalPredictions) * 100) : 0;
  const accuracy = totalPredictions > 0 ? Math.round((hits.length / totalPredictions) * 100) : 0;
  const styleLabel = getPredictionStyleLabel(underdogRate);

  const rows = resolvedPredictions.flatMap((prediction) => {
    const matchPredictions = store.predictions.filter((item) => item.matchId === prediction.matchId && item.settledAt);
    return matchPredictions.map((item) => ({
      isViewer: item.userId === viewerId,
      hit: item.settlementResult === "hit",
      underdogPick: Boolean(item.wasUnderdogPick),
      underdogHit: Boolean(item.wasUnderdogPick) && item.settlementResult === "hit",
      bonusCoins: item.settlementCoins,
    }));
  });

  const participantRows = rows.length > 0 ? rows : [];
  const participantHits = participantRows.filter((row) => row.hit).length;
  const participantUnderdogPicks = participantRows.filter((row) => row.underdogPick).length;
  const participantUnderdogHits = participantRows.filter((row) => row.underdogHit).length;
  const participantAccuracy = participantRows.length > 0 ? Math.round((participantHits / participantRows.length) * 100) : 0;
  const participantUnderdogPickRate = participantRows.length > 0 ? Math.round((participantUnderdogPicks / participantRows.length) * 100) : 0;
  const participantUnderdogHitRate = participantUnderdogPicks > 0 ? Math.round((participantUnderdogHits / participantUnderdogPicks) * 100) : 0;
  const myUnderdogHitRate = underdogSelections.length > 0 ? Math.round((underdogHits.length / underdogSelections.length) * 100) : 0;
  const participantAvgBonus = participantRows.length > 0 ? Math.round(participantRows.reduce((sum, row) => sum + row.bonusCoins, 0) / participantRows.length) : 0;

  const insights: PredictionInsightItem[] = [
    { label: "총 예측 참여", value: `${totalPredictions}회`, description: "정산이 끝난 경기 기준 참여 횟수" },
    { label: "적중률", value: `${accuracy}%`, description: `${hits.length}적중 / ${Math.max(0, totalPredictions - hits.length)}실패` },
    { label: "예측 코인 총합", value: `${totalCoins} Coin`, description: "참여 코인과 적중 추가 코인 합계" },
    { label: "평균 적중 보상", value: `${avgBonus} Coin`, description: "적중 경기 기준 평균 추가 보상" },
    { label: "역배 적중", value: `${underdogHits.length}회`, description: `역배 선택 비중 ${underdogRate}% · ${styleLabel}` },
    { label: "연속 적중", value: `${Math.min(hits.length, 5)}회`, description: "최근 정산 기준 추정 스트릭" },
  ];

  const comparison: PredictionComparisonItem[] = [
    {
      label: "적중률",
      myValue: `${accuracy}%`,
      averageValue: `${participantAccuracy}%`,
      delta: `${accuracy - participantAccuracy >= 0 ? "+" : ""}${accuracy - participantAccuracy}%p`,
      summary: accuracy >= participantAccuracy ? "평균보다 적중률이 높음" : "평균보다 적중률이 낮음",
    },
    {
      label: "역배 선택 비중",
      myValue: `${underdogRate}%`,
      averageValue: `${participantUnderdogPickRate}%`,
      delta: `${underdogRate - participantUnderdogPickRate >= 0 ? "+" : ""}${underdogRate - participantUnderdogPickRate}%p`,
      summary: underdogRate >= participantUnderdogPickRate ? "평균보다 역배 선택 비중이 높음" : "평균보다 정배 선택 비중이 높음",
    },
    {
      label: "역배 적중률",
      myValue: `${myUnderdogHitRate}%`,
      averageValue: `${participantUnderdogHitRate}%`,
      delta: `${myUnderdogHitRate - participantUnderdogHitRate >= 0 ? "+" : ""}${myUnderdogHitRate - participantUnderdogHitRate}%p`,
      summary: myUnderdogHitRate >= participantUnderdogHitRate ? "언더독 적중 보상이 평균보다 좋음" : "언더독 적중률을 더 끌어올릴 여지가 있음",
    },
    {
      label: "평균 추가 코인",
      myValue: `${avgBonus} Coin`,
      averageValue: `${participantAvgBonus} Coin`,
      delta: `${avgBonus - participantAvgBonus >= 0 ? "+" : ""}${avgBonus - participantAvgBonus} Coin`,
      summary: avgBonus >= participantAvgBonus ? "평균보다 높은 추가 보상을 얻는 편" : "평균보다 보수적인 적중 보상을 얻는 편",
    },
  ];

  return { insights, comparison, styleLabel };
}

function isSameCurrentDay(value: string) {
  const target = new Date(value);
  const currentDate = new Date(getNowMs());
  return (
    target.getFullYear() === currentDate.getFullYear() &&
    target.getMonth() === currentDate.getMonth() &&
    target.getDate() === currentDate.getDate()
  );
}

function buildHeroStats(store: StoreShape): HomeHeroStats {
  const todayMatches = store.matches.filter((match) => isSameCurrentDay(match.scheduledAt)).length;
  const totalRatings = store.playerRatings.length + store.setPlayerRatings.length;
  const totalComments = store.comments.filter((comment) => !comment.hidden).length;

  return {
    todayMatches,
    totalPredictions: store.predictions.length,
    totalRatings,
    totalComments,
    updatedLabel: "방금 업데이트",
  };
}

function buildFeaturedMatch(store: StoreShape, viewerId: string | null) {
  const candidates = store.matches
    .filter((match) => isSameCurrentDay(match.scheduledAt))
    .slice()
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const preferred =
    candidates.find((match) => match.status === "scheduled" && !isPredictionLocked(match)) ??
    candidates.find((match) => match.status === "finished") ??
    store.matches
      .slice()
      .sort((a, b) => Math.abs(new Date(a.scheduledAt).getTime() - getNowMs()) - Math.abs(new Date(b.scheduledAt).getTime() - getNowMs()))[0] ??
    null;

  return preferred ? buildMatchView(store, preferred, viewerId) : null;
}

function buildTodayMatches(store: StoreShape, viewerId: string | null): MatchData[] {
  const todayMatches = store.matches
    .filter((match) => isSameCurrentDay(match.scheduledAt))
    .slice()
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  if (todayMatches.length > 0) {
    return todayMatches.map((match) => buildMatchView(store, match, viewerId));
  }

  const upcomingMatches = store.matches
    .filter((match) => new Date(match.scheduledAt).getTime() > getNowMs())
    .slice()
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  if (upcomingMatches.length === 0) {
    return [];
  }

  const firstUpcomingDate = new Date(upcomingMatches[0].scheduledAt);
  const nextMatchdayMatches = upcomingMatches.filter((match) => {
    const current = new Date(match.scheduledAt);
    return (
      current.getFullYear() === firstUpcomingDate.getFullYear() &&
      current.getMonth() === firstUpcomingDate.getMonth() &&
      current.getDate() === firstUpcomingDate.getDate()
    );
  });

  return nextMatchdayMatches.map((match) => buildMatchView(store, match, viewerId));
}

function buildRecentFinishedMatches(store: StoreShape, viewerId: string | null): MatchData[] {
  return store.matches
    .filter((match) => match.status === "finished" && new Date(match.scheduledAt).getTime() <= getNowMs())
    .slice()
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    .slice(0, 3)
    .map((match) => buildMatchView(store, match, viewerId));
}

function buildRecentCommentsFeed(store: StoreShape): HomeCommentFeedItem[] {
  return store.comments
    .filter((comment) => !comment.hidden)
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4)
    .map((comment) => {
      const author = getUserById(store, comment.userId);
      return {
        id: comment.id,
        userId: author?.id ?? null,
        user: getPublicName(author),
        userSummary: buildPublicUserSummary(store, author?.id ?? null),
        matchLabel: buildMatchLabel(store, comment.matchId),
        text: comment.text,
        createdLabel: formatRelativeLabel(comment.createdAt),
      };
    });
}

function buildPlayerLeaderboard(store: StoreShape): HomePlayerLeaderboardItem[] {
  return store.players
    .map((player) => {
      const team = getTeamById(store, player.teamId);
      const matchScores = store.playerRatings.filter((rating) => rating.playerId === player.id).map((rating) => rating.score);
      const setScores = store.setPlayerRatings.filter((rating) => rating.playerId === player.id).map((rating) => rating.score);
      const scores = [...matchScores, ...setScores];
      if (!team || scores.length === 0) {
        return null;
      }

      return {
        playerId: player.id,
        playerSlug: player.slug,
        playerName: player.name,
        teamCode: team.code,
        averageRating: Number(average(scores).toFixed(1)),
        ratingCount: scores.length,
      };
    })
    .filter((player): player is Omit<HomePlayerLeaderboardItem, "rank"> => player !== null)
    .sort((a, b) =>
      b.averageRating - a.averageRating ||
      b.ratingCount - a.ratingCount ||
      a.playerName.localeCompare(b.playerName, "en"),
    )
    .slice(0, 5)
    .map((player, index) => ({
      rank: index + 1,
      ...player,
    }));
}

type PlayerRatingEntry = {
  playerId: string;
  matchId: string;
  score: number;
  ratedAt: string;
  scheduledAt: string;
};

function getPlayerRatingEntries(store: StoreShape): PlayerRatingEntry[] {
  const entriesFromMatch = store.playerRatings
    .map((rating) => {
      const match = getMatchById(store, rating.matchId);
      if (!match) {
        return null;
      }
      return {
        playerId: rating.playerId,
        matchId: match.id,
        score: rating.score,
        ratedAt: rating.createdAt,
        scheduledAt: match.scheduledAt,
      } satisfies PlayerRatingEntry;
    })
    .filter((entry): entry is PlayerRatingEntry => entry !== null);

  const entriesFromSet = store.setPlayerRatings
    .map((rating) => {
      const set = getSetById(store, rating.matchSetId);
      if (!set) {
        return null;
      }
      const match = getMatchById(store, set.matchId);
      if (!match) {
        return null;
      }
      return {
        playerId: rating.playerId,
        matchId: match.id,
        score: rating.score,
        ratedAt: rating.createdAt,
        scheduledAt: match.scheduledAt,
      } satisfies PlayerRatingEntry;
    })
    .filter((entry): entry is PlayerRatingEntry => entry !== null);

  return [...entriesFromMatch, ...entriesFromSet];
}

function buildPlayerRankingItems(store: StoreShape): PlayerRankingItem[] {
  const entries = getPlayerRatingEntries(store);

  return store.players
    .map((player) => {
      const team = getTeamById(store, player.teamId);
      if (!team || team.code === "TBD") {
        return null;
      }

      const playerEntries = entries.filter((entry) => entry.playerId === player.id);
      if (playerEntries.length === 0) {
        return null;
      }

      const uniqueMatchIds = new Set(playerEntries.map((entry) => entry.matchId));
      const recentEntries = playerEntries
        .slice()
        .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
        .slice(0, 5);
      const averageRating = Number(average(playerEntries.map((entry) => entry.score)).toFixed(2));
      const recentForm = Number(average(recentEntries.map((entry) => entry.score)).toFixed(2));
      const weightedScore = Number((averageRating * 0.7 + recentForm * 0.3).toFixed(2));

      return {
        playerId: player.id,
        playerSlug: player.slug,
        playerName: player.name,
        teamCode: team.code,
        role: player.role,
        seasonLabel: "2026 LCK 정규시즌",
        averageRating,
        recentForm,
        matchCount: uniqueMatchIds.size,
        participationCount: playerEntries.length,
        weightedScore,
      } satisfies PlayerRankingItem;
    })
    .filter((item): item is PlayerRankingItem => item !== null);
}

function buildPlayerDetailPageData(store: StoreShape, playerSlug: string): PlayerDetailPageData | null {
  const player = getPlayerBySlug(store, playerSlug);
  if (!player) {
    return null;
  }

  const team = getTeamById(store, player.teamId);
  if (!team) {
    return null;
  }

  const groupedByMatch = new Map<
    string,
    {
      matchId: string;
      scheduledAt: string;
      ratedAt: string;
      scores: number[];
    }
  >();

  for (const entry of getPlayerRatingEntries(store).filter((item) => item.playerId === player.id)) {
    const current = groupedByMatch.get(entry.matchId);
    if (!current) {
      groupedByMatch.set(entry.matchId, {
        matchId: entry.matchId,
        scheduledAt: entry.scheduledAt,
        ratedAt: entry.ratedAt,
        scores: [entry.score],
      });
      continue;
    }
    current.scores.push(entry.score);
    if (new Date(entry.ratedAt).getTime() > new Date(current.ratedAt).getTime()) {
      current.ratedAt = entry.ratedAt;
    }
  }

  const entries = Array.from(groupedByMatch.values())
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    .slice(0, 5)
    .map((entry) => {
      const match = getMatchById(store, entry.matchId);
      const teamA = match ? getTeamById(store, match.teamAId)?.code ?? "TBD" : "TBD";
      const teamB = match ? getTeamById(store, match.teamBId)?.code ?? "TBD" : "TBD";
      const averageScore = Number(average(entry.scores).toFixed(1));

      let result: "W" | "L" | "-" = "-";
      if (
        match &&
        typeof match.scoreA === "number" &&
        typeof match.scoreB === "number" &&
        match.scoreA !== match.scoreB
      ) {
        const isTeamA = player.teamId === match.teamAId;
        const myScore = isTeamA ? match.scoreA : match.scoreB;
        const opponentScore = isTeamA ? match.scoreB : match.scoreA;
        result = myScore > opponentScore ? "W" : "L";
      }

      return {
        matchId: entry.matchId,
        matchLabel: match ? `${formatDateLabel(match.scheduledAt)} ${teamA} vs ${teamB}` : entry.matchId,
        score: averageScore,
        result,
        ratedAt: entry.ratedAt,
      };
    });

  const allScores = Array.from(groupedByMatch.values()).flatMap((entry) => entry.scores);
  const recentScores = entries.map((entry) => entry.score);

  return {
    playerId: player.id,
    playerSlug: player.slug,
    playerName: player.name,
    teamCode: team.code,
    role: player.role,
    averageRating: Number((allScores.length > 0 ? average(allScores) : 0).toFixed(1)),
    recentForm: Number((recentScores.length > 0 ? average(recentScores) : 0).toFixed(1)),
    matchCount: groupedByMatch.size,
    participationCount: allScores.length,
    recentMatches: entries,
  };
}

function buildSeasonPredictionCard(
  store: StoreShape,
  question: StoredSeasonPredictionQuestion,
  viewerId: string | null,
): SeasonPredictionQuestionCard {
  const entries = getSeasonQuestionEntries(store, question.id);
  const options = getSeasonQuestionOptions(store, question.id);
  const lockedDistribution = question.lockedDistribution;
  const myEntry = viewerId ? entries.find((entry) => entry.userId === viewerId) ?? null : null;
  const myOption = myEntry ? options.find((option) => option.id === myEntry.selectedOptionId) ?? null : null;
  const resultOption = question.resultOptionId ? options.find((option) => option.id === question.resultOptionId) ?? null : null;
  const totalEntries = entries.length;
  const shares = options
    .map((option) => {
      const currentVoteCount = entries.filter((entry) => entry.selectedOptionId === option.id).length;
      const currentPercent = totalEntries > 0 ? Math.round((currentVoteCount / totalEntries) * 100) : 0;
      const lockedShare = lockedDistribution?.optionShares.find((share) => share.optionId === option.id) ?? null;
      const percent = lockedShare?.sharePercent ?? currentPercent;

      return {
        label: option.label,
        percent,
      };
    })
    .sort((a, b) => b.percent - a.percent || a.label.localeCompare(b.label, "en"))
    .slice(0, 3);

  const categoryUpper = question.category.toUpperCase();
  const logoKey: "lck" | "msi" | "worlds" =
    categoryUpper.includes("WORLD") || categoryUpper.includes("WORLDS")
      ? "worlds"
      : categoryUpper.includes("MSI")
        ? "msi"
        : "lck";

  return {
    id: question.id,
    title: question.title,
    description: question.description,
    category: question.category,
    logoKey,
    season: question.season,
    predictionType: question.predictionType,
    closeAt: question.closeAt,
    status: getSeasonQuestionStatus(question),
    totalEntries,
    topOptions: shares,
    mySelectionLabel: myOption?.label ?? null,
    isParticipating: Boolean(myEntry),
    resultLabel: resultOption?.label ?? question.resultValue ?? null,
  };
}

function buildSeasonPredictionOptionViews(
  store: StoreShape,
  question: StoredSeasonPredictionQuestion,
  viewerId: string | null,
): SeasonPredictionOptionView[] {
  const entries = getSeasonQuestionEntries(store, question.id);
  const options = getSeasonQuestionOptions(store, question.id);
  const totalEntries = entries.length;
  const lockedDistribution = question.lockedDistribution;
  const myEntry = viewerId ? entries.find((entry) => entry.userId === viewerId) ?? null : null;

  return options.map((option) => {
    const voteCount = entries.filter((entry) => entry.selectedOptionId === option.id).length;
    const lockedShare = lockedDistribution?.optionShares.find((share) => share.optionId === option.id) ?? null;
    return {
      id: option.id,
      label: option.label,
      value: option.value,
      sortOrder: option.sortOrder,
      voteCount,
      sharePercent: totalEntries > 0 ? Math.round((voteCount / totalEntries) * 100) : 0,
      lockedVoteCount: lockedShare?.voteCount ?? null,
      lockedSharePercent: lockedShare?.sharePercent ?? null,
      isSelected: myEntry?.selectedOptionId === option.id,
      isResult: question.resultOptionId === option.id,
    };
  });
}

function buildSeasonPredictionDetail(
  store: StoreShape,
  question: StoredSeasonPredictionQuestion,
  viewerId: string | null,
): SeasonPredictionDetail {
  const entries = getSeasonQuestionEntries(store, question.id);
  const options = getSeasonQuestionOptions(store, question.id);
  const myEntry = viewerId ? entries.find((entry) => entry.userId === viewerId) ?? null : null;
  const myOption = myEntry ? options.find((option) => option.id === myEntry.selectedOptionId) ?? null : null;
  const resultOption = question.resultOptionId ? options.find((option) => option.id === question.resultOptionId) ?? null : null;
  const diffMs = new Date(question.closeAt).getTime() - getNowMs();
  const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const countdownLabel =
    getSeasonQuestionStatus(question) === "open"
      ? days > 0
        ? `${days}일 ${hours}시간 남음`
        : hours > 0
          ? `${hours}시간 ${minutes}분 남음`
          : `${Math.max(1, minutes)}분 남음`
      : "마감됨";

  return {
    id: question.id,
    title: question.title,
    description: question.description,
    category: question.category,
    season: question.season,
    predictionType: question.predictionType,
    openAt: question.openAt,
    closeAt: question.closeAt,
    status: getSeasonQuestionStatus(question),
    totalEntries: entries.length,
    canSubmit: getSeasonQuestionStatus(question) === "open",
    countdownLabel,
    resultLabel: resultOption?.label ?? question.resultValue ?? null,
    options: buildSeasonPredictionOptionViews(store, question, viewerId),
    myEntry:
      myEntry && myOption
        ? {
            selectedOptionId: myEntry.selectedOptionId,
            selectedOptionLabel: myOption.label,
            submittedAt: myEntry.submittedAt,
            updatedAt: myEntry.updatedAt,
            lockedAt: myEntry.lockedAt,
            hitStatus: myEntry.hitStatus,
            rewardAmount: myEntry.rewardAmount,
            rewardGranted: myEntry.rewardGranted,
          }
        : null,
  };
}

function buildMatchListItem(store: StoreShape, match: StoredMatch): MatchListItem {
  const teamA = getTeamById(store, match.teamAId);
  const teamB = getTeamById(store, match.teamBId);
  if (!teamA || !teamB) {
    throw new Error(`Invalid match teams for ${match.id}`);
  }
  const predictionSummary = match.lockedDistribution ?? buildPredictionSummary(store, match);

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
    stage: normalizeStageLabel(match.stage, match.id),
    status: match.status,
    isFinished: match.status === "finished",
    winnerTeamCode,
    dateLabel: formatDayLabel(match.scheduledAt),
    timeLabel: formatTimeLabel(match.scheduledAt),
    teamA: teamA.code,
    teamB: teamB.code,
    score: match.scoreA === null || match.scoreB === null ? "VS" : `${match.scoreA} : ${match.scoreB}`,
    ratingParticipants: store.setPlayerRatings.filter((rating) => getSetById(store, rating.matchSetId)?.matchId === match.id).length,
    predictionVotes: predictionSummary.totalVotes,
    predictionRateA: predictionSummary.teamA,
    predictionRateB: predictionSummary.teamB,
    predictionLocked: isPredictionLocked(match),
    predictionLifecycleState: getPredictionLifecycleState(match),
    lockedDistribution: match.lockedDistribution,
    lockedOdds: match.lockedOdds,
  };
}

function buildTeamRosterSummary(store: StoreShape, teamId: string): TeamRosterSummary | null {
  const team = getTeamById(store, teamId);
  if (!team) {
    return null;
  }

  const entries = getRosterEntriesForTeam(store, teamId);
  const players = buildRosterPlayerItems(store, entries);
  if (team.code !== "TBD" && players.length !== 11) {
    console.warn(`[roster] expected 11 players for ${team.code}, got ${players.length}`);
  }
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
    rosterLabel: "2026 LCK R1 통합 로스터",
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
    const weekStart = getScheduleWeekStart(date);
    const monthId = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}`;
    const weekNumber = Math.floor((weekStart.getDate() - 1) / 7) + 1;
    const weekId = `${monthId}-w${weekNumber}`;

    let monthGroup = monthMap.get(monthId);
    if (!monthGroup) {
      monthGroup = {
        id: monthId,
        label: formatMonthLabel(weekStart),
        weeks: [],
      };
      monthMap.set(monthId, monthGroup);
    }

    let weekGroup = monthGroup.weeks.find((week) => week.id === weekId);
    if (!weekGroup) {
      weekGroup = {
        id: weekId,
        label: `${formatMonthLabel(weekStart)} ${weekNumber}주차`,
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
        dates: week.dates.slice().sort((a, b) => {
          const aScheduledAt = store.matches.find((match) => match.id === a.matches[0]?.id)?.scheduledAt;
          const bScheduledAt = store.matches.find((match) => match.id === b.matches[0]?.id)?.scheduledAt;

          if (!aScheduledAt || !bScheduledAt) {
            return a.id.localeCompare(b.id, "ko");
          }

          const weekdayOrderDiff = getWeekdaySortOrder(new Date(aScheduledAt)) - getWeekdaySortOrder(new Date(bScheduledAt));
          if (weekdayOrderDiff !== 0) {
            return weekdayOrderDiff;
          }

          return new Date(aScheduledAt).getTime() - new Date(bScheduledAt).getTime();
        }),
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
  const isPlayed = set.winnerTeamId !== null;
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
    isPlayed,
    winnerTeam: set.winnerTeamId ? getTeamById(store, set.winnerTeamId)?.code ?? null : null,
    durationLabel: isPlayed ? formatDurationLabel(set.durationMinutes) : "-",
    scoreLabel: isPlayed ? `${set.teamAScore} : ${set.teamBScore}` : "미진행",
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
    canRate: match.status === "finished" && isPlayed,
  };
}

async function readStoreWithPredictionLifecycle() {
  const store = await readStore();
  const now = getNowMs();
  const hasPendingPredictionChanges = store.matches.some((match) => {
    const shouldLock = !match.predictionLockedAt && now >= getPredictionDeadlineAt(match.scheduledAt).getTime();
    const shouldSettle = match.status === "finished" && !match.predictionSettledAt;
    return shouldLock || shouldSettle;
  });
  const hasPendingSeasonQuestionChanges = store.seasonPredictionQuestions.some((question) => {
    const status = getSeasonQuestionStatus(question);
    if (status === "locked" && !question.lockedDistribution) {
      return true;
    }

    if (status === "resolved") {
      if (!question.lockedDistribution || !question.lockedAt) {
        return true;
      }

      const entries = getSeasonQuestionEntries(store, question.id);
      return entries.some(
        (entry) =>
          entry.status !== "resolved" ||
          entry.hitStatus === "pending" ||
          entry.lockedAt === null ||
          entry.snapshot === null,
      );
    }

    if (status === "canceled") {
      const entries = getSeasonQuestionEntries(store, question.id);
      return entries.some((entry) => entry.status !== "canceled" || entry.hitStatus !== "canceled");
    }

    return false;
  });

  if (!hasPendingPredictionChanges && !hasPendingSeasonQuestionChanges) {
    return store;
  }

  return mutateStore(async (store) => {
    ensurePredictionLifecycle(store);
    ensureSeasonPredictionLifecycle(store);
    return store;
  });
}

export const getDashboardData = cache(async (viewerId: string | null): Promise<DashboardData> => {
  const store = await readStoreWithPredictionLifecycle();
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
  const store = await readStoreWithPredictionLifecycle();
  const viewer = viewerId ? store.users.find((user) => user.id === viewerId) ?? null : null;
  const months = buildScheduleGroups(store);
  const seasonPredictionPreview = store.seasonPredictionQuestions
    .filter((question) => question.visibility === "public" && getSeasonQuestionStatus(question) !== "draft")
    .slice()
    .sort((a, b) => new Date(a.closeAt).getTime() - new Date(b.closeAt).getTime())
    .slice(0, 5)
    .map((question) => buildSeasonPredictionCard(store, question, viewerId));
  const notifications = buildNotificationItems(store, viewerId, 5);
  const unreadNotificationCount = viewerId
    ? store.notifications.filter((notification) => notification.userId === viewerId && !notification.isRead).length
    : 0;

  return {
    months,
    selectedMonthId: months[0]?.id ?? null,
    selectedWeekId: months[0]?.weeks[0]?.id ?? null,
    featuredMatchId:
      store.matches.find((match) => match.status === "finished")?.id ??
      store.matches[0]?.id ??
      null,
    userProfile: buildProfile(store, viewer),
    standings: buildTeamStandings(store),
    predictionLeaderboard: buildPredictionLeaderboard(store),
    heroStats: buildHeroStats(store),
    featuredMatch: buildFeaturedMatch(store, viewerId),
    todayMatches: buildTodayMatches(store, viewerId),
    recentFinishedMatches: buildRecentFinishedMatches(store, viewerId),
    recentComments: buildRecentCommentsFeed(store),
    playerLeaderboard: buildPlayerLeaderboard(store),
    seasonPredictionPreview,
    notifications,
    unreadNotificationCount,
  };
});

export const getPlayerRankingPageData = cache(async (): Promise<PlayerRankingPageData> => {
  const store = await readStoreWithPredictionLifecycle();

  return {
    title: "플레이어 랭킹",
    subtitle: "팬 평점 기준",
    seasonOptions: ["2026 LCK 정규시즌"],
    defaultSeason: "2026 LCK 정규시즌",
    minMatchDefault: 3,
    players: buildPlayerRankingItems(store),
  };
});

export async function getGlobalSearchData(query: string, limitPerType?: number): Promise<GlobalSearchResultData> {
  const store = await readStoreWithPredictionLifecycle();
  return buildGlobalSearchResultData(store, query, limitPerType);
}

export async function getPlayerDetailPageData(playerSlug: string): Promise<PlayerDetailPageData> {
  const store = await readStoreWithPredictionLifecycle();
  const detail = buildPlayerDetailPageData(store, playerSlug);
  if (!detail) {
    throw new Error("선수 정보를 찾을 수 없습니다.");
  }

  return detail;
}

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
  const normalizedTeamCode = teamCode.toUpperCase() === "DRX" ? "KRX" : teamCode.toUpperCase();
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

export async function getSeasonPredictionListData(viewerId: string | null, filters?: {
  category?: string;
  status?: string;
}): Promise<SeasonPredictionListData> {
  const store = await readStoreWithPredictionLifecycle();
  const categories = Array.from(new Set(store.seasonPredictionQuestions.map((question) => question.category))).sort((a, b) => a.localeCompare(b, "ko"));
  const selectedCategory = filters?.category ?? "all";
  const selectedStatus = filters?.status ?? "all";

  const items = store.seasonPredictionQuestions
    .filter((question) => question.visibility === "public" || viewerId)
    .filter((question) => selectedCategory === "all" || question.category === selectedCategory)
    .filter((question) => selectedStatus === "all" || getSeasonQuestionStatus(question) === selectedStatus)
    .slice()
    .sort((a, b) => new Date(a.closeAt).getTime() - new Date(b.closeAt).getTime())
    .map((question) => buildSeasonPredictionCard(store, question, viewerId));

  return {
    items,
    categories,
    selectedCategory,
    selectedStatus,
  };
}

export async function getSeasonPredictionDetailData(questionId: string, viewerId: string | null): Promise<SeasonPredictionDetail> {
  const store = await readStoreWithPredictionLifecycle();
  const question = store.seasonPredictionQuestions.find((item) => item.id === questionId);
  if (!question) {
    throw new Error("시즌예측 질문을 찾을 수 없습니다.");
  }
  if (question.visibility !== "public" && !viewerId) {
    throw new Error("공개되지 않은 질문입니다.");
  }

  return buildSeasonPredictionDetail(store, question, viewerId);
}

export async function getMatchDetailData(matchId: string, viewerId: string | null): Promise<MatchDetailData> {
  const store = await readStoreWithPredictionLifecycle();
  const match = store.matches.find((item) => item.id === matchId);
  if (!match) {
    throw new Error("경기를 찾을 수 없습니다.");
  }
  const sets = getMatchSets(store, matchId);

  return {
    match: buildMatchView(store, match, viewerId),
    sets: sets.map((set) => buildSetSummary(store, set, viewerId)),
    preMatchInsights: buildPreMatchInsights(store, match),
  };
}

export async function getSetDetailData(matchId: string, setNumber: number, viewerId: string | null = null): Promise<SetDetailData> {
  const store = await readStoreWithPredictionLifecycle();
  const set = store.matchSets.find((item) => item.matchId === matchId && item.setNumber === setNumber);
  if (!set) {
    throw new Error("세트를 찾을 수 없습니다.");
  }
  if (set.winnerTeamId === null) {
    throw new Error("진행되지 않은 세트입니다.");
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
  const store = await readStoreWithPredictionLifecycle();
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
      lockedOddsPercent: prediction.appliedOddsPercent,
      lockedBonusCoins: prediction.settlementCoins > 0 ? prediction.settlementCoins : null,
      settlementCoins: prediction.settlementCoins,
      wasUnderdogPick: Boolean(prediction.wasUnderdogPick),
    }));

  const seasonPredictions: MySeasonPredictionItem[] = store.seasonPredictionEntries
    .filter((entry) => entry.userId === viewerId)
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map((entry) => {
      const question = store.seasonPredictionQuestions.find((item) => item.id === entry.questionId);
      const option = store.seasonPredictionOptions.find((item) => item.id === entry.selectedOptionId);
      const resultOption = question?.resultOptionId
        ? store.seasonPredictionOptions.find((item) => item.id === question.resultOptionId)
        : null;

      return {
        id: entry.id,
        questionId: entry.questionId,
        title: question?.title ?? entry.questionId,
        category: question?.category ?? "-",
        season: question?.season ?? "-",
        selectedOptionLabel: option?.label ?? entry.selectedOptionId,
        status: question ? getSeasonQuestionStatus(question) : "draft",
        resultLabel: resultOption?.label ?? question?.resultValue ?? null,
        hitStatus: entry.hitStatus,
        rewardAmount: entry.rewardAmount,
        submittedAt: entry.submittedAt,
        updatedAt: entry.updatedAt,
      };
    });

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
  const notifications = buildNotificationItems(store, viewerId);
  const { insights, comparison, styleLabel } = buildPredictionInsights(store, viewerId);
  return {
    profile: {
      ...profile,
      bio: viewer.bio,
      selectedProfileTheme: storeItemsById.get(viewer.selectedProfileTheme ?? "")?.label ?? viewer.selectedProfileTheme,
    },
    predictions,
    seasonPredictions,
    ratings: [...legacyRatings, ...setRatings].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    ),
    comments,
    pointLedger,
    storeItems,
    notifications,
    unreadNotificationCount: notifications.filter((notification) => !notification.isRead).length,
    predictionInsights: insights,
    predictionComparison: comparison,
    predictionStyleLabel: styleLabel,
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

export async function markNotificationsRead(input: { userId: string; notificationIds?: string[] }) {
  return mutateStore(async (store) => {
    const targetIds = input.notificationIds ? new Set(input.notificationIds) : null;
    for (const notification of store.notifications) {
      if (notification.userId !== input.userId) {
        continue;
      }
      if (targetIds && !targetIds.has(notification.id)) {
        continue;
      }
      notification.isRead = true;
    }
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
    if (item.type === "theme") {
      user.selectedProfileTheme = item.id;
    }
    user.updatedAt = new Date().toISOString();
  });
}

export async function getAdminPanelData() {
  const store = await readStoreWithPredictionLifecycle();
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
    seasonPredictionQuestions: store.seasonPredictionQuestions
      .slice()
      .sort((a, b) => new Date(a.closeAt).getTime() - new Date(b.closeAt).getTime())
      .map((question) => ({
        id: question.id,
        title: question.title,
        description: question.description,
        category: question.category,
        season: question.season,
        predictionType: question.predictionType,
        status: getSeasonQuestionStatus(question),
        visibility: question.visibility,
        openAt: question.openAt,
        closeAt: question.closeAt,
        totalEntries: getSeasonQuestionEntries(store, question.id).length,
        options: buildSeasonPredictionOptionViews(store, question, null),
        resultLabel:
          (question.resultOptionId
            ? store.seasonPredictionOptions.find((option) => option.id === question.resultOptionId)?.label
            : null) ?? question.resultValue,
      })),
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
    ensurePredictionLifecycle(store);
    const match = store.matches.find((item) => item.id === input.matchId);
    if (!match) {
      throw new Error("경기를 찾을 수 없습니다.");
    }

    const teamA = store.teams.find((team) => team.id === match.teamAId);
    const teamB = store.teams.find((team) => team.id === match.teamBId);
    if (teamA?.code === "TBD" || teamB?.code === "TBD") {
      throw new Error("아직 대진이 확정되지 않아 예측할 수 없습니다.");
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

    const now = new Date().toISOString();
    const predictionId = createId(store, "predictions", "prediction");
    store.predictions.push({
      id: predictionId,
      userId: input.viewerId,
      matchId: input.matchId,
      teamId: selectedTeam.id,
      createdAt: now,
      updatedAt: now,
      joinedRewardGrantedAt: now,
      settledAt: null,
      settlementResult: null,
      settlementCoins: 0,
      appliedOddsPercent: null,
      wasUnderdogPick: null,
    });

    appendPointLedgerEntry(store, {
      userId: input.viewerId,
      type: "earn",
      amount: COINS.predictionSubmit,
      reason: "경기 예측 참여 코인",
      referenceType: "prediction_submit",
      referenceId: predictionId,
    });

    createNotification(store, {
      userId: input.viewerId,
      type: "prediction_joined",
      title: `${teamA?.code ?? "TBD"} vs ${teamB?.code ?? "TBD"} 예측 참여 완료`,
      body: `${selectedTeam.code} 선택이 저장되어 +${COINS.predictionSubmit} Coin을 획득했습니다.`,
      relatedMatchId: match.id,
      isRead: false,
      rewardCoins: COINS.predictionSubmit,
      appliedOddsPercent: null,
      metadata: {
        selectedTeam: selectedTeam.code,
      },
      createdAt: now,
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
      amount: COINS.legacyRatingSubmit,
      reason: "경기 평점 참여 코인",
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
        amount: changedCount * COINS.setRatingPerPlayer,
        reason: `세트 평점 참여 코인 (${changedCount}명)`,
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
  parentId?: string | null;
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

    const parentId = input.parentId ?? null;
    if (parentId) {
      const parent = store.comments.find((comment) => comment.id === parentId && !comment.hidden);
      if (!parent || parent.matchId !== input.matchId) {
        throw new Error("답글 대상 댓글을 찾을 수 없습니다.");
      }
    }

    const commentId = createId(store, "comments", "comment");
    store.comments.push({
      id: commentId,
      userId: input.viewerId,
      matchId: input.matchId,
      text,
      parentId,
      recommendUserIds: [],
      hidden: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    appendPointLedgerEntry(store, {
      userId: input.viewerId,
      type: "earn",
      amount: COINS.commentSubmit,
      reason: "경기 댓글 참여 코인",
      referenceType: "comment_submit",
      referenceId: commentId,
    });
  });
}

export async function toggleCommentRecommendation(input: {
  viewerId: string;
  matchId: string;
  commentId: string;
}) {
  return mutateStore(async (store) => {
    const comment = store.comments.find((item) => item.id === input.commentId && !item.hidden);
    if (!comment || comment.matchId !== input.matchId) {
      throw new Error("댓글을 찾을 수 없습니다.");
    }

    const alreadyRecommended = comment.recommendUserIds.includes(input.viewerId);
    if (alreadyRecommended) {
      comment.recommendUserIds = comment.recommendUserIds.filter((userId) => userId !== input.viewerId);
    } else {
      comment.recommendUserIds = [...comment.recommendUserIds, input.viewerId];
    }
    comment.updatedAt = new Date().toISOString();
  });
}

export async function submitSeasonPredictionEntry(input: {
  viewerId: string;
  questionId: string;
  selectedOptionId: string;
}) {
  return mutateStore(async (store) => {
    ensureSeasonPredictionLifecycle(store);
    const question = store.seasonPredictionQuestions.find((item) => item.id === input.questionId);
    if (!question || question.visibility !== "public") {
      throw new Error("참여 가능한 시즌예측이 아닙니다.");
    }
    if (getSeasonQuestionStatus(question) !== "open") {
      throw new Error("이 질문은 더 이상 수정할 수 없습니다.");
    }

    const option = store.seasonPredictionOptions.find(
      (candidate) => candidate.id === input.selectedOptionId && candidate.questionId === input.questionId,
    );
    if (!option) {
      throw new Error("유효한 선택지가 아닙니다.");
    }

    const existing = store.seasonPredictionEntries.find(
      (entry) => entry.userId === input.viewerId && entry.questionId === input.questionId,
    );
    const now = new Date().toISOString();
    if (existing) {
      existing.selectedOptionId = option.id;
      existing.updatedAt = now;
      existing.status = "open";
      existing.hitStatus = "pending";
      return;
    }

    store.seasonPredictionEntries.push({
      id: createId(store, "seasonPredictionEntries", "season_entry"),
      userId: input.viewerId,
      questionId: input.questionId,
      selectedOptionId: option.id,
      submittedAt: now,
      updatedAt: now,
      lockedAt: null,
      snapshot: null,
      status: "open",
      hitStatus: "pending",
      rewardGranted: false,
      rewardAmount: null,
    });
  });
}

export async function upsertSeasonPredictionQuestion(input: {
  questionId?: string;
  title: string;
  description: string;
  category: string;
  predictionType: SeasonPredictionType;
  season: string;
  openAt: string;
  closeAt: string;
  visibility: "public" | "private";
  manualStatus: "draft" | "active" | "canceled";
  options: Array<{ label: string; value: string }>;
}) {
  return mutateStore(async (store) => {
    const now = new Date().toISOString();
    const question =
      store.seasonPredictionQuestions.find((item) => item.id === input.questionId) ??
      ({
        id: createId(store, "seasonPredictionQuestions", "season_question"),
        lockedAt: null,
        resolvedAt: null,
        resultOptionId: null,
        resultValue: null,
        rewardMode: "parimutuel",
        baseRewardAmount: null,
        lockedDistribution: null,
        createdAt: now,
      } as StoredSeasonPredictionQuestion);

    question.title = input.title.trim();
    question.description = input.description.trim();
    question.category = input.category.trim();
    question.predictionType = input.predictionType;
    question.season = input.season.trim();
    question.openAt = input.openAt;
    question.closeAt = input.closeAt;
    question.visibility = input.visibility;
    question.manualStatus = input.manualStatus;
    question.updatedAt = now;

    if (!store.seasonPredictionQuestions.some((item) => item.id === question.id)) {
      store.seasonPredictionQuestions.push(question);
    }

    store.seasonPredictionOptions = store.seasonPredictionOptions.filter((option) => option.questionId !== question.id);
    input.options
      .filter((option) => option.label.trim())
      .forEach((option, index) => {
        store.seasonPredictionOptions.push({
          id: createId(store, "seasonPredictionOptions", "season_option"),
          questionId: question.id,
          label: option.label.trim(),
          value: option.value.trim() || option.label.trim(),
          sortOrder: index + 1,
        });
      });
  });
}

export async function resolveSeasonPredictionQuestion(input: {
  questionId: string;
  resultOptionId: string;
}) {
  return mutateStore(async (store) => {
    ensureSeasonPredictionLifecycle(store);
    const question = store.seasonPredictionQuestions.find((item) => item.id === input.questionId);
    if (!question) {
      throw new Error("질문을 찾을 수 없습니다.");
    }
    const option = store.seasonPredictionOptions.find((candidate) => candidate.id === input.resultOptionId && candidate.questionId === input.questionId);
    if (!option) {
      throw new Error("정답 선택지가 올바르지 않습니다.");
    }

    if (!question.lockedDistribution) {
      question.lockedDistribution = buildSeasonLockedDistribution(store, question.id);
      question.lockedAt = question.lockedDistribution.capturedAt;
    }
    question.resultOptionId = option.id;
    question.resultValue = option.value;
    question.resolvedAt = new Date().toISOString();
    question.updatedAt = question.resolvedAt;
    ensureSeasonPredictionLifecycle(store);
  });
}

export async function cancelSeasonPredictionQuestion(questionId: string) {
  return mutateStore(async (store) => {
    const question = store.seasonPredictionQuestions.find((item) => item.id === questionId);
    if (!question) {
      throw new Error("질문을 찾을 수 없습니다.");
    }
    question.manualStatus = "canceled";
    question.updatedAt = new Date().toISOString();
    ensureSeasonPredictionLifecycle(store);
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
      const nextPlayerIds = [teamA.id, teamB.id].flatMap((teamId) => pickDefaultLineupPlayerIds(store, teamId));
      for (const playerId of nextPlayerIds) {
        const player = store.players.find((item) => item.id === playerId);
        if (!player) {
          continue;
        }

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

export async function syncAllMatchRostersFromTeamRosters() {
  return mutateStore(async (store) => {
    let updatedCount = 0;

    for (const match of store.matches) {
      const nextPlayerIds = [match.teamAId, match.teamBId].flatMap((teamId) => pickDefaultLineupPlayerIds(store, teamId));
      const currentParticipants = store.matchParticipants.filter((participant) => participant.matchId === match.id);
      const currentPlayerIds = currentParticipants.map((participant) => participant.playerId);
      const isSame =
        currentPlayerIds.length === nextPlayerIds.length && currentPlayerIds.every((playerId, index) => playerId === nextPlayerIds[index]);

      if (isSame) {
        continue;
      }

      store.matchParticipants = store.matchParticipants.filter((participant) => participant.matchId !== match.id);
      for (const playerId of nextPlayerIds) {
        const player = store.players.find((item) => item.id === playerId);
        if (!player) {
          continue;
        }

        store.matchParticipants.push({
          id: createId(store, "matchParticipants", "participant"),
          matchId: match.id,
          playerId,
          teamId: player.teamId,
        });
      }
      updatedCount += 1;
    }

    return { updatedCount };
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

export async function deleteCommentByOwner(input: { viewerId: string; matchId: string; commentId: string }) {
  return mutateStore(async (store) => {
    const comment = store.comments.find(
      (item) => item.id === input.commentId && item.matchId === input.matchId && !item.hidden,
    );

    if (!comment) {
      throw new Error("댓글을 찾을 수 없습니다.");
    }

    if (comment.userId !== input.viewerId) {
      throw new Error("내 댓글만 삭제할 수 있습니다.");
    }

    comment.hidden = true;
  });
}

export async function deleteUserAccount(userId: string) {
  return mutateStore(async (store) => {
    const user = store.users.find((item) => item.id === userId);
    if (!user) {
      throw new Error("사용자를 찾을 수 없습니다.");
    }

    const deletedCommentIdSet = new Set(
      store.comments
        .filter((comment) => comment.userId === userId)
        .map((comment) => comment.id),
    );

    store.users = store.users.filter((item) => item.id !== userId);
    store.predictions = store.predictions.filter((item) => item.userId !== userId);
    store.seasonPredictionEntries = store.seasonPredictionEntries.filter((item) => item.userId !== userId);
    store.playerRatings = store.playerRatings.filter((item) => item.userId !== userId);
    store.setPlayerRatings = store.setPlayerRatings.filter((item) => item.userId !== userId);
    store.pointLedger = store.pointLedger.filter((item) => item.userId !== userId);
    store.notifications = store.notifications.filter((item) => item.userId !== userId);
    store.userInventory = store.userInventory.filter((item) => item.userId !== userId);

    // Remove user's comments and replies targeting deleted comments.
    store.comments = store.comments.filter((comment) => {
      if (comment.userId === userId) {
        return false;
      }
      if (comment.parentId && deletedCommentIdSet.has(comment.parentId)) {
        return false;
      }
      return true;
    });

    // Remove deleted user from recommendation lists.
    for (const comment of store.comments) {
      if (comment.recommendUserIds.includes(userId)) {
        comment.recommendUserIds = comment.recommendUserIds.filter((id) => id !== userId);
      }
    }
  });
}





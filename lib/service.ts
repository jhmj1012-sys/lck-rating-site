import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";

import type {
  NotificationType,
  PredictionSettlementResult,
  SeasonPredictionType,
  StoreShape,
  StoredComment,
  StoredMatch,
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
  HomeMatchData,
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
  MatchWeekGroup,
  MyCommentItem,
  NotificationItem,
  KeyPlayerInsight,
  MyPageData,
  MyPointLedgerItem,
  PreMatchInsights,
  PublicUserSummary,
  PredictionComment,
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
  SiteChromeData,
  TeamStandingItem,
  UserProfile,
  WeekSchedule,
} from "@/components/lol-rating/types";
import { COMMENT_MAX_LENGTH, COMMENT_MIN_LENGTH } from "@/lib/comment-constants";

const relativeTime = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });
const roleOrder: Record<PlayerRole, number> = { TOP: 0, JGL: 1, MID: 2, ADC: 3, SUP: 4 };
const ROLE_SEQUENCE: PlayerRole[] = ["TOP", "JGL", "MID", "ADC", "SUP"];
const scheduleWeekdayOrder = [4, 5, 6, 0, 1, 2, 3] as const;
const APP_TIME_ZONE = "Asia/Seoul";
const COINS = {
  predictionSubmit: 10,
  predictionHit: 5,
  predictionCommentBonus: 3,
  commentSubmit: 4,
  legacyRatingSubmit: 8,
  setRatingPerPlayer: 4,
  ratingCommentBonus: 1,
  ratingFullMatchBonus: 20,
} as const;

function getNowMs() {
  return Date.now();
}

function getNowIso() {
  return new Date().toISOString();
}

function getDateKeyInAppTimeZone(value: string | number | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
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

  const countByOption = new Map<string, number>();
  for (const entry of entries) {
    countByOption.set(entry.selectedOptionId, (countByOption.get(entry.selectedOptionId) ?? 0) + 1);
  }

  return {
    totalEntries,
    optionShares: options.map((option) => {
      const voteCount = countByOption.get(option.id) ?? 0;
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
  const entriesByQuestion = new Map<string, typeof store.seasonPredictionEntries>();
  for (const entry of store.seasonPredictionEntries) {
    const list = entriesByQuestion.get(entry.questionId) ?? [];
    list.push(entry);
    entriesByQuestion.set(entry.questionId, list);
  }

  for (const question of store.seasonPredictionQuestions) {
    const entries = entriesByQuestion.get(question.id) ?? [];
    const status = getSeasonQuestionStatus(question);
    if (status === "locked" && !question.lockedDistribution) {
      const distribution = buildSeasonLockedDistribution(store, question.id);
      question.lockedDistribution = distribution;
      question.lockedAt = distribution.capturedAt;
      question.updatedAt = distribution.capturedAt;
      for (const entry of entries) {
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
      for (const entry of entries) {
        const isHit = question.resultOptionId ? entry.selectedOptionId === question.resultOptionId : false;
        entry.lockedAt = entry.lockedAt ?? question.lockedAt;
        entry.snapshot = entry.snapshot ?? distribution;
        entry.status = "resolved";
        entry.hitStatus = isHit ? "hit" : "miss";
      }
    }

    if (status === "canceled") {
      for (const entry of entries) {
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

function isGuestUser(user: StoredUser | null | undefined) {
  return Boolean(user?.email?.toLowerCase().endsWith("@guest.local"));
}

function isGuestUserId(store: StoreShape, userId: string) {
  return isGuestUser(store.users.find((user) => user.id === userId));
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
      if (!existingLedger && !isGuestUserId(store, prediction.userId)) {
        appendPointLedgerEntry(store, {
          userId: prediction.userId,
          type: "earn",
          amount: appliedSide.hitBonusCoins,
          reason: `예측 적중 추가 코인 (배당 ${appliedSide.oddsPercent}%)`,
          referenceType: "prediction_settlement",
          referenceId: ledgerReferenceId,
        });
      }
      if (!isGuestUserId(store, prediction.userId)) {
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
      }
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

function formatCommentCreatedLabel(value: string) {
  const targetMs = new Date(value).getTime();
  const nowMs = getNowMs();
  const diffMs = nowMs - targetMs;

  if (diffMs >= 0 && diffMs < 24 * 60 * 60 * 1000) {
    const minutes = Math.max(1, Math.floor(diffMs / 60000));
    if (minutes < 60) {
      return `${minutes}분 전`;
    }
    const hours = Math.floor(minutes / 60);
    return `${hours}시간 전`;
  }

  const parts = new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).formatToParts(new Date(value));
  const getPart = (type: "month" | "day" | "hour" | "minute") => parts.find((part) => part.type === type)?.value ?? "00";
  return `${getPart("month")}.${getPart("day")} ${getPart("hour")}:${getPart("minute")}`;
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

function getMatchPlayers(store: StoreShape, matchId: string, viewerId: string | null) {
  const match = getMatchById(store, matchId);
  const playerById = new Map(store.players.map((player) => [player.id, player]));
  const teamCodeById = new Map(store.teams.map((team) => [team.id, team.code]));
  const scoresByPlayerId = new Map<string, number[]>();
  const viewerMatchRatingByPlayerId = new Map<string, { score: number; comment: string }>();
  const globalScoresByPlayerId = new Map<string, number[]>();

  for (const rating of store.playerRatings) {
    const globalScores = globalScoresByPlayerId.get(rating.playerId) ?? [];
    globalScores.push(rating.score);
    globalScoresByPlayerId.set(rating.playerId, globalScores);

    if (rating.matchId !== matchId) {
      continue;
    }

    const matchScores = scoresByPlayerId.get(rating.playerId) ?? [];
    matchScores.push(rating.score);
    scoresByPlayerId.set(rating.playerId, matchScores);

    if (viewerId && rating.userId === viewerId) {
      viewerMatchRatingByPlayerId.set(rating.playerId, { score: rating.score, comment: rating.comment ?? "" });
    }
  }

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
      const player = playerById.get(participant.playerId);
      const teamCode = teamCodeById.get(participant.teamId);
      if (!player || !teamCode) {
        return null;
      }

      const currentScores = scoresByPlayerId.get(participant.playerId) ?? [];
      const fallbackScores = currentScores.length > 0 ? currentScores : (globalScoresByPlayerId.get(participant.playerId) ?? []);
      const viewerRating = viewerMatchRatingByPlayerId.get(participant.playerId) ?? null;

      const topRatingComment = store.playerRatings
        .filter((r) => r.matchId === matchId && r.playerId === participant.playerId && r.comment.trim().length > 0)
        .sort((a, b) => (b.recommendUserIds ?? []).length - (a.recommendUserIds ?? []).length)[0] ?? null;

      const topComment = topRatingComment
        ? {
            id: topRatingComment.id,
            user: getPublicName(getUserById(store, topRatingComment.userId)),
            text: topRatingComment.comment.trim(),
            likeCount: (topRatingComment.recommendUserIds ?? []).length,
            viewerLiked: viewerId ? (topRatingComment.recommendUserIds ?? []).includes(viewerId) : false,
          }
        : null;

      return {
        id: player.id,
        playerSlug: player.slug,
        name: player.name,
        team: teamCode,
        role: player.role,
        rating: Number(average(fallbackScores).toFixed(1)),
        ratingCount: fallbackScores.length,
        viewerScore: viewerRating?.score ?? null,
        viewerComment: viewerRating?.comment ?? "",
        topComment,
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
    .map((comment) => buildMatchCommentView(store, comment.id, viewerId, replyCountByParent))
    .filter((comment): comment is MatchComment => comment !== null);
}

function buildMatchCommentView(
  store: StoreShape,
  commentId: string,
  viewerId: string | null,
  replyCountByParent?: Map<string, number>,
): MatchComment | null {
  const comment = store.comments.find((item) => item.id === commentId && !item.hidden);
  if (!comment) {
    return null;
  }

  const author = getUserById(store, comment.userId);
  const recommendationCount = comment.recommendUserIds.length;
  const replyCounts = replyCountByParent ?? (() => {
    const map = new Map<string, number>();
    for (const item of store.comments) {
      if (item.matchId !== comment.matchId || item.hidden || !item.parentId) {
        continue;
      }
      map.set(item.parentId, (map.get(item.parentId) ?? 0) + 1);
    }
    return map;
  })();

  return {
    id: comment.id,
    userId: author?.id ?? null,
    parentId: comment.parentId,
    user: getPublicName(author),
    userSummary: buildPublicUserSummary(store, author?.id ?? null),
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt ?? comment.createdAt,
    createdLabel: formatCommentCreatedLabel(comment.createdAt),
    likes: recommendationCount,
    likedByMe: viewerId ? comment.recommendUserIds.includes(viewerId) : false,
    replyCount: replyCounts.get(comment.id) ?? 0,
    text: comment.text,
    tag: "반응",
  };
}

function buildMatchRatingComments(store: StoreShape, matchId: string, viewerId: string | null): MatchRatingComment[] {
  return store.playerRatings
    .filter((rating) => rating.matchId === matchId)
    .filter((rating) => rating.comment.trim().length > 0)
    .slice()
    .sort((a, b) => {
      const likeDiff = (b.recommendUserIds ?? []).length - (a.recommendUserIds ?? []).length;
      if (likeDiff !== 0) return likeDiff;
      return new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime();
    })
    .map((rating) => buildMatchRatingCommentView(store, rating.id, viewerId))
    .filter((value): value is MatchRatingComment => value !== null);
}

function buildMatchRatingCommentView(store: StoreShape, ratingId: string, viewerId: string | null): MatchRatingComment | null {
  const rating = store.playerRatings.find((item) => item.id === ratingId);
  if (!rating) {
    return null;
  }

  const trimmedComment = rating.comment.trim();
  if (!trimmedComment) {
    return null;
  }

  const author = getUserById(store, rating.userId);
  const player = store.players.find((item) => item.id === rating.playerId);
  const teamCode = player ? getTeamById(store, player.teamId)?.code ?? "-" : "-";
  const likeCount = (rating.recommendUserIds ?? []).length;
  const viewerLiked = viewerId ? (rating.recommendUserIds ?? []).includes(viewerId) : false;

  return {
    id: rating.id,
    user: getPublicName(author),
    playerName: player?.name ?? rating.playerId,
    team: teamCode,
    score: rating.score,
    text: trimmedComment,
    createdLabel: formatRelativeLabel(rating.updatedAt ?? rating.createdAt),
    likeCount,
    viewerLiked,
  } satisfies MatchRatingComment;
}

function buildMatchPredictionComments(store: StoreShape, matchId: string, viewerId: string | null): PredictionComment[] {
  return store.predictions
    .filter((p) => p.matchId === matchId && (p.comment ?? "").trim().length > 0)
    .slice()
    .sort((a, b) => {
      const likeDiff = (b.recommendUserIds ?? []).length - (a.recommendUserIds ?? []).length;
      if (likeDiff !== 0) return likeDiff;
      return new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime();
    })
    .map((p) => buildMatchPredictionCommentView(store, p.id, viewerId))
    .filter((v): v is PredictionComment => v !== null);
}

function buildMatchPredictionCommentView(store: StoreShape, predictionId: string, viewerId: string | null): PredictionComment | null {
  const prediction = store.predictions.find((p) => p.id === predictionId);
  if (!prediction) return null;
  const text = (prediction.comment ?? "").trim();
  if (!text) return null;
  const author = getUserById(store, prediction.userId);
  const selectedTeamCode = getTeamById(store, prediction.teamId)?.code ?? "-";
  const likeCount = (prediction.recommendUserIds ?? []).length;
  const viewerLiked = viewerId ? (prediction.recommendUserIds ?? []).includes(viewerId) : false;
  return {
    id: prediction.id,
    user: getPublicName(author),
    selectedTeam: selectedTeamCode,
    text,
    createdLabel: formatRelativeLabel(prediction.updatedAt ?? prediction.createdAt),
    likeCount,
    viewerLiked,
  } satisfies PredictionComment;
}

function buildMvp(players: PlayerRating[]) {
  const best = players
    .filter((player) => player.ratingCount > 0)
    .slice()
    .sort((a, b) => b.rating - a.rating)[0];

  return best?.name ?? "-";
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

function getTeamKeyPlayerInsight(store: StoreShape, match: StoredMatch, teamId: string, ratingsByPlayer?: Map<string, number[]>): KeyPlayerInsight | null {
  const participantIds = store.matchParticipants
    .filter((item) => item.matchId === match.id && item.teamId === teamId)
    .map((item) => item.playerId);
  const fallbackIds = store.players.filter((player) => player.teamId === teamId).map((player) => player.id);
  const candidateIds = participantIds.length > 0 ? participantIds : fallbackIds;

  const ratingsMap = ratingsByPlayer ?? (() => {
    const m = new Map<string, number[]>();
    for (const r of store.playerRatings) {
      const list = m.get(r.playerId) ?? [];
      list.push(r.score);
      m.set(r.playerId, list);
    }
    return m;
  })();

  const candidates = candidateIds
    .map((playerId) => {
      const player = store.players.find((item) => item.id === playerId);
      if (!player) {
        return null;
      }

      const scores = ratingsMap.get(playerId) ?? [];
      if (scores.length === 0) {
        return null;
      }

      const avgRating = Number(average(scores).toFixed(1));
      return {
        playerId: player.id,
        name: player.name,
        role: player.role,
        avgRating,
        ratingCount: scores.length,
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

  const ratingsByPlayer = new Map<string, number[]>();
  for (const r of store.playerRatings) {
    const list = ratingsByPlayer.get(r.playerId) ?? [];
    list.push(r.score);
    ratingsByPlayer.set(r.playerId, list);
  }

  return {
    teamAForm: toFormAndStreak(teamARecent, match.teamAId),
    teamBForm: toFormAndStreak(teamBRecent, match.teamBId),
    h2h: buildHeadToHead(store, match),
    recentHeadToHead: buildRecentHeadToHead(store, match),
    keyPlayers: {
      teamA: getTeamKeyPlayerInsight(store, match, match.teamAId, ratingsByPlayer),
      teamB: getTeamKeyPlayerInsight(store, match, match.teamBId, ratingsByPlayer),
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
  const ratingComments = buildMatchRatingComments(store, match.id, viewerId);
  const predictionComments = buildMatchPredictionComments(store, match.id, viewerId);
  const predictionSummary = match.lockedDistribution ?? buildPredictionSummary(store, match);
  const matchRatings = store.playerRatings.filter((rating) => rating.matchId === match.id);
  const totalRatings = matchRatings.length;
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
    viewerPlayerRatingCount: viewerId ? matchRatings.filter((rating) => rating.userId === viewerId).length : 0,
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
    predictionComments,
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
    .sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;
      const setDiffA = a.setsWon - a.setsLost;
      const setDiffB = b.setsWon - b.setsLost;
      if (setDiffB !== setDiffA) return setDiffB - setDiffA;
      return a.teamCode.localeCompare(b.teamCode, "en");
    })
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
  const matchesById = new Map(store.matches.map((match) => [match.id, match]));
  const predictionsByUserId = new Map<string, typeof store.predictions>();
  for (const prediction of store.predictions) {
    const list = predictionsByUserId.get(prediction.userId) ?? [];
    list.push(prediction);
    predictionsByUserId.set(prediction.userId, list);
  }

  // pointLedger를 한 번만 순회해서 유저별 최신 잔액 집계
  const latestLedgerByUser = new Map<string, { balanceAfter: number; createdAt: string }>();
  for (const entry of store.pointLedger) {
    const current = latestLedgerByUser.get(entry.userId);
    if (!current || entry.createdAt > current.createdAt) {
      latestLedgerByUser.set(entry.userId, entry);
    }
  }

  return store.users
    .filter((user) => Boolean(user.nickname) && !isGuestUser(user))
    .map((user) => {
      const predictions = predictionsByUserId.get(user.id) ?? [];
      const resolved = predictions.filter((prediction) => {
        const match = matchesById.get(prediction.matchId);
        return match?.status === "finished" && match.scoreA !== null && match.scoreB !== null;
      });
      const hit = resolved.filter((prediction) => {
        const match = matchesById.get(prediction.matchId);
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
        points: latestLedgerByUser.get(user.id)?.balanceAfter ?? 0,
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

  const resolvedMatchIds = new Set(resolvedPredictions.map((p) => p.matchId));
  const predictionsByMatchId = new Map<string, typeof store.predictions>();
  for (const prediction of store.predictions) {
    if (!resolvedMatchIds.has(prediction.matchId) || !prediction.settledAt) continue;
    const list = predictionsByMatchId.get(prediction.matchId) ?? [];
    list.push(prediction);
    predictionsByMatchId.set(prediction.matchId, list);
  }

  const rows = resolvedPredictions.flatMap((prediction) => {
    const matchPredictions = predictionsByMatchId.get(prediction.matchId) ?? [];
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
  return getDateKeyInAppTimeZone(value) === getDateKeyInAppTimeZone(getNowMs());
}

function buildHeroStats(store: StoreShape): HomeHeroStats {
  const todayMatches = store.matches.filter((match) => isSameCurrentDay(match.scheduledAt)).length;
  const totalRatings = store.playerRatings.length;
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
  const firstUpcomingDateKey = getDateKeyInAppTimeZone(firstUpcomingDate);
  const nextMatchdayMatches = upcomingMatches.filter((match) => {
    return getDateKeyInAppTimeZone(match.scheduledAt) === firstUpcomingDateKey;
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

function buildHomeMatchData(store: StoreShape, match: StoredMatch): HomeMatchData {
  const teamA = getTeamById(store, match.teamAId);
  const teamB = getTeamById(store, match.teamBId);
  if (!teamA || !teamB) {
    throw new Error(`Invalid match teams for ${match.id}`);
  }

  return {
    id: match.id,
    stage: normalizeStageLabel(match.stage, match.id),
    status: match.status,
    serverNow: getNowIso(),
    scheduledAt: match.scheduledAt,
    teamA: teamA.code,
    teamB: teamB.code,
    score: match.scoreA === null || match.scoreB === null ? "VS" : `${match.scoreA} : ${match.scoreB}`,
    predictionLocked: isPredictionLocked(match),
    predictionSummary: match.lockedDistribution ?? buildPredictionSummary(store, match),
  };
}

function buildHomeFeaturedMatch(store: StoreShape): HomeMatchData | null {
  const candidates = store.matches
    .filter((match) => isSameCurrentDay(match.scheduledAt))
    .slice()
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const preferred =
    candidates.find((match) => !isPredictionLocked(match)) ??
    candidates.find((match) => match.status !== "finished") ??
    candidates[0] ??
    store.matches
      .filter((match) => match.status !== "finished" && new Date(match.scheduledAt).getTime() >= getNowMs())
      .slice()
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0] ??
    null;

  return preferred ? buildHomeMatchData(store, preferred) : null;
}

function buildHomeTodayMatches(store: StoreShape): HomeMatchData[] {
  const todayMatches = store.matches
    .filter((match) => isSameCurrentDay(match.scheduledAt))
    .slice()
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  if (todayMatches.length > 0) {
    return todayMatches.map((match) => buildHomeMatchData(store, match));
  }

  const upcomingMatches = store.matches
    .filter((match) => match.status !== "finished" && new Date(match.scheduledAt).getTime() >= getNowMs())
    .slice()
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 2);

  return upcomingMatches.map((match) => buildHomeMatchData(store, match));
}

function buildHomeRecentFinishedMatches(store: StoreShape): HomeMatchData[] {
  return store.matches
    .filter((match) => match.status === "finished" && new Date(match.scheduledAt).getTime() <= getNowMs())
    .slice()
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    .slice(0, 3)
    .map((match) => buildHomeMatchData(store, match));
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
  const ratingsByPlayerId = new Map<string, number[]>();
  for (const rating of store.playerRatings) {
    const scores = ratingsByPlayerId.get(rating.playerId) ?? [];
    scores.push(rating.score);
    ratingsByPlayerId.set(rating.playerId, scores);
  }

  return store.players
    .map((player) => {
      const team = getTeamById(store, player.teamId);
      const scores = ratingsByPlayerId.get(player.id) ?? [];
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
  const matchesById = new Map(store.matches.map((match) => [match.id, match]));
  return store.playerRatings
    .map((rating) => {
      const match = matchesById.get(rating.matchId);
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
    ratingParticipants: store.playerRatings.filter((rating) => rating.matchId === match.id).length,
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
  const matchesById = new Map(store.matches.map((match) => [match.id, match]));
  const items = store.matches
    .slice()
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .map((match) => buildMatchListItem(store, match));

  const monthMap = new Map<string, MatchMonthGroup>();
  for (const item of items) {
    const date = new Date(matchesById.get(item.id)?.scheduledAt ?? Date.now());
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
          const aScheduledAt = matchesById.get(a.matches[0]?.id ?? "")?.scheduledAt;
          const bScheduledAt = matchesById.get(b.matches[0]?.id ?? "")?.scheduledAt;

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

type PublicScheduleHubData = Omit<ScheduleHubData, "notifications" | "unreadNotificationCount" | "userProfile"> & {
  userProfile: UserProfile;
};

type PublicHomePageData = Pick<
  ScheduleHubData,
  | "standings"
  | "predictionLeaderboard"
  | "heroStats"
  | "playerLeaderboard"
> & {
  featuredMatch: HomeMatchData | null;
  todayMatches: HomeMatchData[];
  recentFinishedMatches: HomeMatchData[];
};

function buildSiteChromeData(store: StoreShape, viewerId: string | null): SiteChromeData {
  if (!viewerId) {
    return {
      notifications: [],
      unreadNotificationCount: 0,
    };
  }

  return {
    notifications: buildNotificationItems(store, viewerId, 5),
    unreadNotificationCount: store.notifications.filter((notification) => notification.userId === viewerId && !notification.isRead).length,
  };
}

const getPublicScheduleHubData = unstable_cache(
  async (): Promise<PublicScheduleHubData> => {
    const store = await readStoreWithPredictionLifecycle();
    const months = buildScheduleGroups(store);
    const seasonPredictionPreview = store.seasonPredictionQuestions
      .filter((question) => question.visibility === "public" && getSeasonQuestionStatus(question) !== "draft")
      .slice()
      .sort((a, b) => new Date(a.closeAt).getTime() - new Date(b.closeAt).getTime())
      .slice(0, 5)
      .map((question) => buildSeasonPredictionCard(store, question, null));

    return {
      months,
      selectedMonthId: months[0]?.id ?? null,
      selectedWeekId: months[0]?.weeks[0]?.id ?? null,
      featuredMatchId:
        store.matches.find((match) => match.status === "finished")?.id ??
        store.matches[0]?.id ??
        null,
      userProfile: buildProfile(store, null),
      standings: buildTeamStandings(store),
      predictionLeaderboard: buildPredictionLeaderboard(store),
      heroStats: buildHeroStats(store),
      featuredMatch: buildFeaturedMatch(store, null),
      todayMatches: buildTodayMatches(store, null),
      recentFinishedMatches: buildRecentFinishedMatches(store, null),
      recentComments: buildRecentCommentsFeed(store),
      playerLeaderboard: buildPlayerLeaderboard(store),
      seasonPredictionPreview,
    };
  },
  ["schedule-hub-public"],
  { revalidate: 60 },
);

const getPublicHomePageData = unstable_cache(
  async (): Promise<PublicHomePageData> => {
    const store = await readStoreWithPredictionLifecycle();

    return {
      standings: buildTeamStandings(store),
      predictionLeaderboard: buildPredictionLeaderboard(store),
      heroStats: buildHeroStats(store),
      featuredMatch: buildHomeFeaturedMatch(store),
      todayMatches: buildHomeTodayMatches(store),
      recentFinishedMatches: buildHomeRecentFinishedMatches(store),
      playerLeaderboard: buildPlayerLeaderboard(store),
    };
  },
  ["home-page-public"],
  { revalidate: 60 },
);

export const getSiteChromeData = cache(async (viewerId: string | null): Promise<SiteChromeData> => {
  if (!viewerId) {
    return {
      notifications: [],
      unreadNotificationCount: 0,
    };
  }

  const store = await readStoreWithPredictionLifecycle();
  return buildSiteChromeData(store, viewerId);
});

export const getScheduleHubData = cache(async (viewerId: string | null): Promise<ScheduleHubData> => {
  const publicData = await getPublicScheduleHubData();

  if (!viewerId) {
    return {
      ...publicData,
      notifications: [],
      unreadNotificationCount: 0,
    };
  }

  const store = await readStoreWithPredictionLifecycle();
  const viewer = store.users.find((user) => user.id === viewerId) ?? null;
  const chromeData = buildSiteChromeData(store, viewerId);

  return {
    ...publicData,
    userProfile: buildProfile(store, viewer),
    featuredMatch: buildFeaturedMatch(store, viewerId),
    todayMatches: buildTodayMatches(store, viewerId),
    recentFinishedMatches: buildRecentFinishedMatches(store, viewerId),
    seasonPredictionPreview: store.seasonPredictionQuestions
      .filter((question) => question.visibility === "public" && getSeasonQuestionStatus(question) !== "draft")
      .slice()
      .sort((a, b) => new Date(a.closeAt).getTime() - new Date(b.closeAt).getTime())
      .slice(0, 5)
      .map((question) => buildSeasonPredictionCard(store, question, viewerId)),
    notifications: chromeData.notifications,
    unreadNotificationCount: chromeData.unreadNotificationCount,
  };
});

export const getHomePageData = cache(async (): Promise<PublicHomePageData & SiteChromeData> => ({
  ...(await getPublicHomePageData()),
  notifications: [],
  unreadNotificationCount: 0,
}));

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

  return {
    match: buildMatchView(store, match, viewerId),
    preMatchInsights: buildPreMatchInsights(store, match),
  };
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
    ratings: legacyRatings.sort(
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
  comment?: string;
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

    const commentText = (input.comment ?? "").trim().slice(0, 50);

    const existing = store.predictions.find(
      (prediction) => prediction.matchId === input.matchId && prediction.userId === input.viewerId,
    );
    if (existing) {
      existing.teamId = selectedTeam.id;
      existing.comment = commentText;
      existing.updatedAt = new Date().toISOString();
      return { coinsEarned: 0 };
    }

    const now = new Date().toISOString();
    const predictionId = createId(store, "predictions", "prediction");
    store.predictions.push({
      id: predictionId,
      userId: input.viewerId,
      matchId: input.matchId,
      teamId: selectedTeam.id,
      comment: commentText,
      recommendUserIds: [],
      createdAt: now,
      updatedAt: now,
      joinedRewardGrantedAt: now,
      settledAt: null,
      settlementResult: null,
      settlementCoins: 0,
      appliedOddsPercent: null,
      wasUnderdogPick: null,
    });

    let coinsEarned = 0;

    if (!isGuestUserId(store, input.viewerId)) {
      coinsEarned += COINS.predictionSubmit;
      appendPointLedgerEntry(store, {
        userId: input.viewerId,
        type: "earn",
        amount: COINS.predictionSubmit,
        reason: "경기 예측 참여 코인",
        referenceType: "prediction_submit",
        referenceId: predictionId,
      });

      if (commentText.length > 0) {
        coinsEarned += COINS.predictionCommentBonus;
        appendPointLedgerEntry(store, {
          userId: input.viewerId,
          type: "earn",
          amount: COINS.predictionCommentBonus,
          reason: "예측 코멘트 보너스 코인",
          referenceType: "prediction_comment_bonus",
          referenceId: predictionId,
        });
      }

      const totalCoins = coinsEarned;
      const commentBonusText = commentText.length > 0 ? ` (코멘트 보너스 +${COINS.predictionCommentBonus})` : "";
      createNotification(store, {
        userId: input.viewerId,
        type: "prediction_joined",
        title: `${teamA?.code ?? "TBD"} vs ${teamB?.code ?? "TBD"} 예측 참여 완료`,
        body: `${selectedTeam.code} 선택이 저장되어 +${totalCoins} Coin을 획득했습니다.${commentBonusText}`,
        relatedMatchId: match.id,
        isRead: false,
        rewardCoins: totalCoins,
        appliedOddsPercent: null,
        metadata: {
          selectedTeam: selectedTeam.code,
        },
        createdAt: now,
      });
    }

    return { coinsEarned };
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
      return {
        ratingComment: buildMatchRatingCommentView(store, existing.id, input.viewerId),
        coinsEarned: 0,
      };
    }

    const ratingId = createId(store, "playerRatings", "rating");
    const trimmedComment = input.comment.trim();
    store.playerRatings.push({
      id: ratingId,
      userId: input.viewerId,
      matchId: input.matchId,
      playerId: input.playerId,
      score: clampScore(input.score),
      comment: trimmedComment,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    let coinsEarned = 0;

    if (!isGuestUserId(store, input.viewerId)) {
      // 선수당 기본 코인
      coinsEarned += COINS.setRatingPerPlayer;
      appendPointLedgerEntry(store, {
        userId: input.viewerId,
        type: "earn",
        amount: COINS.setRatingPerPlayer,
        reason: "선수 평점 참여 코인",
        referenceType: "player_rating_submit",
        referenceId: ratingId,
      });

      // 코멘트 추가 코인
      if (trimmedComment.length > 0) {
        coinsEarned += COINS.ratingCommentBonus;
        appendPointLedgerEntry(store, {
          userId: input.viewerId,
          type: "earn",
          amount: COINS.ratingCommentBonus,
          reason: "평점 코멘트 보너스 코인",
          referenceType: "player_rating_comment",
          referenceId: ratingId,
        });
      }

      // 10명 완주 보너스 (1회한)
      const alreadyGotFullBonus = store.pointLedger.some(
        (e) => e.referenceType === "rating_full_match_bonus" && e.referenceId === input.matchId && e.userId === input.viewerId,
      );
      if (!alreadyGotFullBonus) {
        const allMatchPlayerIds = store.matchParticipants
          .filter((p) => p.matchId === input.matchId)
          .map((p) => p.playerId);
        const ratedPlayerIds = new Set(
          store.playerRatings
            .filter((r) => r.matchId === input.matchId && r.userId === input.viewerId)
            .map((r) => r.playerId),
        );
        const allRated = allMatchPlayerIds.length > 0 && allMatchPlayerIds.every((id) => ratedPlayerIds.has(id));
        if (allRated) {
          coinsEarned += COINS.ratingFullMatchBonus;
          appendPointLedgerEntry(store, {
            userId: input.viewerId,
            type: "earn",
            amount: COINS.ratingFullMatchBonus,
            reason: "경기 전원 평점 완주 보너스",
            referenceType: "rating_full_match_bonus",
            referenceId: input.matchId,
          });
          createNotification(store, {
            userId: input.viewerId,
            type: "coin_earned",
            title: "완주 보너스 🎉",
            body: `경기 내 모든 선수 평점을 완료해 ${COINS.ratingFullMatchBonus}코인을 추가로 획득했습니다!`,
            relatedMatchId: input.matchId,
            isRead: false,
            rewardCoins: COINS.ratingFullMatchBonus,
            appliedOddsPercent: null,
            metadata: {},
          });
        }
      }
    }

    return {
      ratingComment: buildMatchRatingCommentView(store, ratingId, input.viewerId),
      coinsEarned,
    };
  });
}

export async function toggleRatingCommentLike(input: {
  viewerId: string;
  matchId: string;
  ratingId: string;
}) {
  return mutateStore(async (store) => {
    const rating = store.playerRatings.find(
      (item) => item.id === input.ratingId && item.matchId === input.matchId,
    );
    if (!rating) {
      throw new Error("코멘트를 찾을 수 없습니다.");
    }
    const ids: string[] = rating.recommendUserIds ?? [];
    if (ids.includes(input.viewerId)) {
      rating.recommendUserIds = ids.filter((id) => id !== input.viewerId);
    } else {
      rating.recommendUserIds = [...ids, input.viewerId];
    }
    return {
      liked: (rating.recommendUserIds).includes(input.viewerId),
      likeCount: rating.recommendUserIds.length,
    };
  });
}

export async function togglePredictionCommentLike(input: {
  viewerId: string;
  matchId: string;
  predictionId: string;
}) {
  return mutateStore(async (store) => {
    const prediction = store.predictions.find(
      (item) => item.id === input.predictionId && item.matchId === input.matchId,
    );
    if (!prediction) {
      throw new Error("예측 코멘트를 찾을 수 없습니다.");
    }
    const ids: string[] = prediction.recommendUserIds ?? [];
    if (ids.includes(input.viewerId)) {
      prediction.recommendUserIds = ids.filter((id) => id !== input.viewerId);
    } else {
      prediction.recommendUserIds = [...ids, input.viewerId];
    }
    return {
      liked: prediction.recommendUserIds.includes(input.viewerId),
      likeCount: prediction.recommendUserIds.length,
    };
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
    if (text.length < COMMENT_MIN_LENGTH) {
      throw new Error("댓글은 두 글자 이상 입력해 주세요.");
    }
    if (text.length > COMMENT_MAX_LENGTH) {
      throw new Error(`댓글은 최대 ${COMMENT_MAX_LENGTH}자까지 입력할 수 있습니다.`);
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

    if (!isGuestUserId(store, input.viewerId)) {
      appendPointLedgerEntry(store, {
        userId: input.viewerId,
        type: "earn",
        amount: COINS.commentSubmit,
        reason: "경기 댓글 참여 코인",
        referenceType: "comment_submit",
        referenceId: commentId,
      });
    }

    return buildMatchCommentView(store, commentId, input.viewerId);
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

    return {
      likedByMe: !alreadyRecommended,
      likes: comment.recommendUserIds.length,
    };
  });
}

export async function updateCommentByOwner(input: {
  viewerId: string;
  matchId: string;
  commentId: string;
  text: string;
}) {
  return mutateStore(async (store) => {
    const comment = store.comments.find(
      (item) => item.id === input.commentId && item.matchId === input.matchId && !item.hidden,
    );
    if (!comment) {
      throw new Error("댓글을 찾을 수 없습니다.");
    }
    if (comment.userId !== input.viewerId) {
      throw new Error("내 댓글만 수정할 수 있습니다.");
    }

    const text = input.text.trim();
    if (text.length < COMMENT_MIN_LENGTH) {
      throw new Error("댓글은 두 글자 이상 입력해 주세요.");
    }
    if (text.length > COMMENT_MAX_LENGTH) {
      throw new Error(`댓글은 최대 ${COMMENT_MAX_LENGTH}자까지 입력할 수 있습니다.`);
    }

    comment.text = text;
    comment.updatedAt = new Date().toISOString();
    return buildMatchCommentView(store, comment.id, input.viewerId);
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
    return { commentId: comment.id };
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





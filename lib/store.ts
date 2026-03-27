import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { StoreShape } from "@/lib/domain";
import { createSeedStore } from "@/lib/seed";

const dataDirectory = path.join(process.cwd(), "data");
const storePath = path.join(dataDirectory, "service-store.json");

let mutationQueue = Promise.resolve();

function getLegacyPoints(store: Partial<StoreShape>, userId: string) {
  const predictions = store.predictions ?? [];
  const playerRatings = store.playerRatings ?? [];
  const setPlayerRatings = store.setPlayerRatings ?? [];
  const comments = store.comments ?? [];
  const matches = store.matches ?? [];

  const userPredictions = predictions.filter((prediction) => prediction.userId === userId);
  const userRatings =
    playerRatings.filter((rating) => rating.userId === userId).length +
    setPlayerRatings.filter((rating) => rating.userId === userId).length;
  const userComments = comments.filter((comment) => comment.userId === userId && !comment.hidden).length;

  const hit = userPredictions.filter((prediction) => {
    const match = matches.find((item) => item.id === prediction.matchId);
    if (!match || match.status !== "finished" || match.scoreA === null || match.scoreB === null) {
      return false;
    }

    const winner = match.scoreA > match.scoreB ? match.teamAId : match.teamBId;
    return winner === prediction.teamId;
  }).length;

  return userPredictions.length * 10 + userRatings * 8 + userComments * 4 + hit * 5;
}

function ensureUserCarryover(store: StoreShape, userId: string, fallbackAmount: number) {
  const hasEntry = store.pointLedger.some((entry) => entry.userId === userId);
  if (hasEntry) {
    return;
  }

  const amount = fallbackAmount;
  store.pointLedger.push({
    id: `ledger_${store.nextIds.pointLedger ?? 1}`,
    userId,
    type: "earn",
    amount,
    reason: "기존 활동 코인 이관",
    referenceType: "migration",
    referenceId: userId,
    createdAt: new Date().toISOString(),
    balanceAfter: amount,
  });
  store.nextIds.pointLedger = (store.nextIds.pointLedger ?? 1) + 1;
}

function syncPredictionHitBonuses(store: StoreShape) {
  void store;
}

function withDefaults(store: Partial<StoreShape>): StoreShape {
  const seed = createSeedStore();
  const nextIds = {
    ...seed.nextIds,
    ...(store.nextIds ?? {}),
  };
  const legacyRosterSchema = !store.teamRosterEntries;
  const needsScheduleRefresh =
    !(store.matches ?? []).some((match) => match.id === "match_95") ||
    !(store.teams ?? []).some((team) => team.id === "team_tbd");
  const needsSeededSets =
    (store.matchSets ?? []).length === 0 ||
    (store.setParticipants ?? []).length === 0;
  const seedTeamIds = new Set(seed.teams.map((team) => team.id));
  const seedPlayerIds = new Set(seed.players.map((player) => player.id));
  const legacyPointsByUser = new Map(
    (store.users ?? seed.users).map((user) => [user.id, getLegacyPoints(store, user.id)]),
  );

  const normalized: StoreShape = {
    users: (store.users ?? seed.users).map((user) => ({
      ...user,
      nickname: "nickname" in user ? user.nickname ?? null : null,
      nicknameOnboardingSeen: "nicknameOnboardingSeen" in user ? Boolean(user.nicknameOnboardingSeen) : false,
      nicknameUpdatedAt: "nicknameUpdatedAt" in user ? user.nicknameUpdatedAt ?? null : null,
      bio: "bio" in user ? user.bio ?? null : null,
      selectedBadge: "selectedBadge" in user ? user.selectedBadge ?? null : null,
      selectedProfileTheme: "selectedProfileTheme" in user ? user.selectedProfileTheme ?? null : null,
    })),
    teams: [
      ...seed.teams,
      ...((store.teams ?? []).filter((team) => !seedTeamIds.has(team.id))),
    ].map((team) => {
      const normalizedCode = team.code === "DRX" ? "KRX" : team.code;
      if (team.id === "team_drx" || normalizedCode === "KRX") {
        return {
          ...team,
          code: "KRX",
          name: "KRX",
          shortName: "KRX",
        };
      }

      return {
        ...team,
        code: normalizedCode,
      };
    }),
    players: legacyRosterSchema
      ? seed.players
      : [
          ...seed.players,
          ...((store.players ?? []).filter((player) => !seedPlayerIds.has(player.id))),
        ],
    teamRosterEntries: store.teamRosterEntries ?? seed.teamRosterEntries,
    matches: needsScheduleRefresh ? seed.matches : (store.matches ?? seed.matches),
    matchParticipants: needsScheduleRefresh ? seed.matchParticipants : (store.matchParticipants ?? seed.matchParticipants),
    matchSets: needsScheduleRefresh || needsSeededSets ? seed.matchSets : (store.matchSets ?? seed.matchSets),
    setParticipants: needsScheduleRefresh || needsSeededSets ? seed.setParticipants : (store.setParticipants ?? seed.setParticipants),
    predictions: (needsScheduleRefresh ? [] : (store.predictions ?? seed.predictions)).map((prediction) => {
      const ledgerEntries = (store.pointLedger ?? []) as StoreShape["pointLedger"];
      const legacyHitEntry = ledgerEntries.find(
        (entry) => entry.referenceType === "prediction_hit" && entry.referenceId === prediction.id,
      ) as StoreShape["pointLedger"][number] | undefined;
      const relatedMatch = (store.matches ?? seed.matches).find((match) => match.id === prediction.matchId);
      const isFinishedMatch = relatedMatch?.status === "finished" && relatedMatch.scoreA !== null && relatedMatch.scoreB !== null;
      const normalizedPrediction = prediction as typeof prediction & {
        joinedRewardGrantedAt?: string | null;
        settledAt?: string | null;
        settlementResult?: "hit" | "miss" | null;
        settlementCoins?: number;
        appliedOddsPercent?: number | null;
        wasUnderdogPick?: boolean | null;
      };

      return {
        ...prediction,
        updatedAt: prediction.updatedAt ?? prediction.createdAt,
        joinedRewardGrantedAt: normalizedPrediction.joinedRewardGrantedAt ?? prediction.createdAt,
        settledAt: normalizedPrediction.settledAt ?? legacyHitEntry?.createdAt ?? null,
        settlementResult: normalizedPrediction.settlementResult ?? (legacyHitEntry ? "hit" : null),
        settlementCoins: normalizedPrediction.settlementCoins ?? legacyHitEntry?.amount ?? 0,
        appliedOddsPercent: normalizedPrediction.appliedOddsPercent ?? null,
        wasUnderdogPick: normalizedPrediction.wasUnderdogPick ?? (isFinishedMatch ? false : null),
      };
    }),
    playerRatings: (needsScheduleRefresh ? [] : (store.playerRatings ?? seed.playerRatings)).map((rating) => ({
      ...rating,
      updatedAt: rating.updatedAt ?? rating.createdAt,
    })),
    setPlayerRatings: ((needsScheduleRefresh || (store.setPlayerRatings ?? []).length === 0) ? seed.setPlayerRatings : (store.setPlayerRatings ?? seed.setPlayerRatings)).map((rating) => ({
      ...rating,
      updatedAt: rating.updatedAt ?? rating.createdAt,
    })),
    comments: (needsScheduleRefresh ? [] : (store.comments ?? seed.comments)).map((comment) => ({
      ...comment,
      updatedAt: comment.updatedAt ?? comment.createdAt,
    })),
    pointLedger: store.pointLedger ?? seed.pointLedger,
    notifications: (store.notifications ?? seed.notifications).map((notification) => ({
      ...notification,
      isRead: Boolean(notification.isRead),
      rewardCoins: notification.rewardCoins ?? null,
      appliedOddsPercent: notification.appliedOddsPercent ?? null,
      metadata: notification.metadata ?? {},
    })),
    profileStoreItems: store.profileStoreItems ?? seed.profileStoreItems,
    userInventory: store.userInventory ?? seed.userInventory,
    nextIds,
  };

  for (const user of normalized.users) {
    ensureUserCarryover(normalized, user.id, legacyPointsByUser.get(user.id) ?? 0);
  }

  syncPredictionHitBonuses(normalized);

  return normalized;
}

async function ensureStore(): Promise<StoreShape> {
  try {
    const content = await readFile(storePath, "utf8");
    return withDefaults(JSON.parse(content) as Partial<StoreShape>);
  } catch {
    const seed = createSeedStore();
    await mkdir(dataDirectory, { recursive: true });
    await writeFile(storePath, JSON.stringify(seed, null, 2), "utf8");
    return seed;
  }
}

async function saveStore(store: StoreShape) {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
}

export async function readStore() {
  return ensureStore();
}

export async function mutateStore<T>(callback: (store: StoreShape) => Promise<T> | T): Promise<T> {
  const runMutation = async () => {
    const store = await ensureStore();
    const result = await callback(store);
    await saveStore(store);
    return result;
  };

  const resultPromise = mutationQueue.then(runMutation, runMutation);
  mutationQueue = resultPromise.then(
    () => undefined,
    () => undefined,
  );

  return resultPromise;
}

export function createId(store: StoreShape, collection: keyof StoreShape, prefix: string) {
  const nextValue = store.nextIds[collection as string] ?? 1;
  store.nextIds[collection as string] = nextValue + 1;
  return `${prefix}_${nextValue}`;
}

import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { StoreShape } from "@/lib/domain";
import { createSeedStore } from "@/lib/seed";

const dataDirectory =
  process.env.DATA_DIRECTORY ??
  (process.env.VERCEL ? path.join("/tmp", "lol-pro-rating-data") : path.join(process.cwd(), "data"));
const storePath = path.join(dataDirectory, "service-store.json");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
const supabaseStoreTable = process.env.SUPABASE_SERVICE_STORE_TABLE ?? "service_store";
const supabaseStoreRowId = Number.parseInt(process.env.SUPABASE_SERVICE_STORE_ROW_ID ?? "1", 10);

let mutationQueue = Promise.resolve();
let supabaseAdminClient: SupabaseClient | null = null;

type ServiceStoreRow = {
  id: number;
  data: Partial<StoreShape> | null;
  created_at: string;
  updated_at: string;
};

type StoreCollectionKey = Exclude<keyof StoreShape, "nextIds">;

type CollectionConfig = {
  key: StoreCollectionKey;
  table: string;
};

type RelationalStoreRow<T> = {
  id: string;
  payload: T;
  updated_at?: string;
};

type ServiceMetaRow = {
  key: string;
  value: StoreShape["nextIds"] | null;
  updated_at?: string;
};

const supabaseStoreMode = process.env.SUPABASE_STORE_MODE ?? "json";
const supabaseServiceMetaTable = process.env.SUPABASE_SERVICE_META_TABLE ?? "service_meta";
const storeCollectionConfigs: CollectionConfig[] = [
  { key: "users", table: "users" },
  { key: "teams", table: "teams" },
  { key: "players", table: "players" },
  { key: "teamRosterEntries", table: "team_roster_entries" },
  { key: "matches", table: "matches" },
  { key: "matchParticipants", table: "match_participants" },
  { key: "matchSets", table: "match_sets" },
  { key: "setParticipants", table: "set_participants" },
  { key: "predictions", table: "predictions" },
  { key: "seasonPredictionQuestions", table: "season_prediction_questions" },
  { key: "seasonPredictionOptions", table: "season_prediction_options" },
  { key: "seasonPredictionEntries", table: "season_prediction_entries" },
  { key: "playerRatings", table: "player_ratings" },
  { key: "setPlayerRatings", table: "set_player_ratings" },
  { key: "comments", table: "comments" },
  { key: "pointLedger", table: "point_ledger" },
  { key: "notifications", table: "notifications" },
  { key: "profileStoreItems", table: "profile_store_items" },
  { key: "userInventory", table: "user_inventory" },
];

const SEEDED_USER_COPY: Record<string, { name: string; nickname: string; bio: string }> = {
  user_seed_analyst: { name: "이민준", nickname: "밴픽보는중", bio: "밴픽이랑 오브젝트 타이밍 위주로 봅니다." },
  user_seed_editor: { name: "박서연", nickname: "세트요약러", bio: "세트 흐름이랑 선수 영향력 정리하는 편입니다." },
  user_seed_alpha: { name: "김도윤", nickname: "정글각재는중", bio: "초반 정글 동선이 제일 중요하다고 봐요." },
  user_seed_beta: { name: "최지훈", nickname: "라인전집착러", bio: "라인전 디테일 보는 맛으로 경기 챙깁니다." },
  user_seed_gamma: { name: "정하늘", nickname: "한타메모장", bio: "한타 구도랑 콜 타이밍 보는 걸 좋아합니다." },
  user_seed_delta: { name: "윤서진", nickname: "패치민감함", bio: "패치 바뀌면 팀별 적응 속도부터 체크합니다." },
  user_seed_epsilon: { name: "한예준", nickname: "정배충아님", bio: "그래도 정배 쪽이 더 안정적일 때가 많다고 봅니다." },
  user_seed_zeta: { name: "강민석", nickname: "역배맛집찾기", bio: "역배 터질 만한 경기 찾는 재미로 봅니다." },
  user_seed_eta: { name: "신유진", nickname: "교전기록계", bio: "초중반 교전 타이밍 메모 자주 남깁니다." },
  user_seed_theta: { name: "송재원", nickname: "밴픽수첩", bio: "상성 구도랑 조합 완성도 위주로 보는 편이에요." },
  user_seed_iota: { name: "오세훈", nickname: "탑차이봄", bio: "탑 구도 하나로 게임 분위기 바뀐다고 생각합니다." },
  user_seed_kappa: { name: "서지우", nickname: "미드주도권", bio: "미드 주도권 넘어가는 순간을 유심히 봅니다." },
  user_seed_lambda: { name: "장현우", nickname: "바텀웨이브", bio: "바텀 라인 관리와 템포 차이 보는 걸 좋아해요." },
  user_seed_mu: { name: "조은호", nickname: "교전복기중_닉네임아주길게늘려서레이아웃테스트중입니다12345", bio: "끝난 한타 다시 복기하면서 보는 스타일입니다." },
  user_seed_nu: { name: "임수빈", nickname: "시야중요함", bio: "시야랑 포지션이 결국 경기 갈린다고 봅니다." },
  user_seed_xi: { name: "황지호", nickname: "용타이머외움", bio: "오브젝트 시간 계산해두고 경기 보는 편입니다." },
  user_seed_omicron: { name: "구태윤", nickname: "후반한타파", bio: "후반 조합 가치 높게 보는 편입니다." },
  user_seed_pi: { name: "안서후", nickname: "굴리는맛", bio: "스노우볼 굴리는 팀들 보는 맛이 있습니다." },
};

const SEEDED_COMMENT_TEMPLATES = [
  "오늘은 밴픽부터 생각보다 팽팽하네.",
  "라인전보단 첫 용 타이밍에서 갈릴 듯.",
  "이 경기는 미드 주도권 잡는 쪽이 편해 보인다.",
  "바텀 변수 꽤 커서 끝까지 봐야 할 느낌.",
  "정배 같긴 한데 생각보다 쉽게 안 끝날 듯.",
  "탑 구도 은근 중요해서 초반부터 재밌겠다.",
  "한타 붙기 시작하면 분위기 확 바뀔 수도 있겠네.",
  "시야 싸움에서 먼저 밀리는 팀이 힘들어 보임.",
  "이번 판은 오브젝트 운영이 핵심 같다.",
  "세트 가면 갈수록 체급보다 집중력이 중요해 보이네.",
] as const;

function looksGarbled(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  return /\?{2,}|占|�/.test(value);
}

function fallbackCommentText(id: string) {
  const number = Number.parseInt(id.replace(/\D/g, ""), 10);
  return SEEDED_COMMENT_TEMPLATES[number % SEEDED_COMMENT_TEMPLATES.length] ?? SEEDED_COMMENT_TEMPLATES[0];
}

function fallbackSetRatingComment(score: number) {
  return score >= 6.8 ? "한타에서 존재감이 확실했어요." : "실수만 조금 줄였으면 더 좋았을 듯.";
}

function fallbackLedgerReason(referenceType: string, referenceId: string) {
  if (referenceType === "migration") {
    return "기존 활동 코인 이관";
  }
  if (referenceType === "store_purchase" && referenceId === "store_theme_sky") {
    return "Sky Draft 테마 구매";
  }
  if (referenceType === "store_purchase" && referenceId === "store_theme_crimson") {
    return "Crimson Stage 테마 구매";
  }
  return "코인 내역";
}

function fallbackNotificationCopy(type: StoreShape["notifications"][number]["type"]) {
  if (type === "prediction_joined") {
    return { title: "예측 참여 완료", body: "경기 예측 참여가 정상적으로 저장되었습니다." };
  }
  if (type === "prediction_hit") {
    return { title: "예측 적중", body: "예측이 적중해 추가 코인이 반영되었습니다." };
  }
  if (type === "prediction_missed") {
    return { title: "예측 마감", body: "예측 결과가 확정되었습니다. 이번에는 적중하지 못했습니다." };
  }
  if (type === "coin_earned") {
    return { title: "코인 지급", body: "활동 보상 코인이 반영되었습니다." };
  }
  return { title: "안내", body: "새로운 알림이 도착했습니다." };
}

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
  const activeStoreItemIds = new Set(seed.profileStoreItems.map((item) => item.id));
  const legacyPointsByUser = new Map(
    (store.users ?? seed.users).map((user) => [user.id, getLegacyPoints(store, user.id)]),
  );

  const normalized: StoreShape = {
    users: (store.users ?? seed.users).map((user) => ({
      ...user,
      name: SEEDED_USER_COPY[user.id] && looksGarbled(user.name) ? SEEDED_USER_COPY[user.id].name : user.name,
      nickname:
        SEEDED_USER_COPY[user.id] && looksGarbled("nickname" in user ? user.nickname ?? null : null)
          ? SEEDED_USER_COPY[user.id].nickname
          : ("nickname" in user ? user.nickname ?? null : null),
      nicknameOnboardingSeen: "nicknameOnboardingSeen" in user ? Boolean(user.nicknameOnboardingSeen) : false,
      nicknameUpdatedAt: "nicknameUpdatedAt" in user ? user.nicknameUpdatedAt ?? null : null,
      bio:
        SEEDED_USER_COPY[user.id] && looksGarbled("bio" in user ? user.bio ?? null : null)
          ? SEEDED_USER_COPY[user.id].bio
          : ("bio" in user ? user.bio ?? null : null),
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
          name: "KIWOOM DRX",
          shortName: "KRX",
        };
      }

      if (normalizedCode === "GEN") {
        return {
          ...team,
          code: "GEN",
          name: "Gen.G Esports",
          shortName: "GEN",
        };
      }

      if (normalizedCode === "HLE") {
        return {
          ...team,
          code: "HLE",
          name: "Hanwha Life Esports",
          shortName: "HLE",
        };
      }

      if (normalizedCode === "DK") {
        return {
          ...team,
          code: "DK",
          name: "Dplus KIA",
          shortName: "DK",
        };
      }

      if (normalizedCode === "KT") {
        return {
          ...team,
          code: "KT",
          name: "kt Rolster",
          shortName: "KT",
        };
      }

      if (normalizedCode === "NS") {
        return {
          ...team,
          code: "NS",
          name: "NONGSHIM RED FORCE",
          shortName: "NS",
        };
      }

      if (normalizedCode === "BRO") {
        return {
          ...team,
          code: "BRO",
          name: "HANJIN BRION",
          shortName: "BRO",
        };
      }

      if (normalizedCode === "BFX") {
        return {
          ...team,
          code: "BFX",
          name: "BNK FEARX",
          shortName: "BFX",
        };
      }

      if (normalizedCode === "DNS") {
        return {
          ...team,
          code: "DNS",
          name: "DN SOOPers",
          shortName: "DNS",
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
    seasonPredictionQuestions: (store.seasonPredictionQuestions ?? seed.seasonPredictionQuestions).map((question) => {
      const seededQuestion = seed.seasonPredictionQuestions.find((item) => item.id === question.id);
      return {
        ...question,
        title: seededQuestion?.title ?? question.title,
        description: seededQuestion?.description ?? question.description,
        category: seededQuestion?.category ?? question.category,
        season: seededQuestion?.season ?? question.season,
        lockedAt: "lockedAt" in question ? question.lockedAt ?? null : null,
        resolvedAt: "resolvedAt" in question ? question.resolvedAt ?? null : null,
        resultOptionId: "resultOptionId" in question ? question.resultOptionId ?? null : null,
        resultValue: "resultValue" in question ? question.resultValue ?? null : null,
        baseRewardAmount: "baseRewardAmount" in question ? question.baseRewardAmount ?? null : null,
        lockedDistribution: "lockedDistribution" in question ? question.lockedDistribution ?? null : null,
      };
    }),
    seasonPredictionOptions:
      (store.seasonPredictionOptions ?? seed.seasonPredictionOptions) as StoreShape["seasonPredictionOptions"],
    seasonPredictionEntries: (
      (store.seasonPredictionEntries ?? seed.seasonPredictionEntries) as StoreShape["seasonPredictionEntries"]
    ).map((entry) => {
      const legacyEntry = entry as StoreShape["seasonPredictionEntries"][number] & {
        updatedAt?: string | null;
        lockedAt?: string | null;
        snapshot?: StoreShape["seasonPredictionQuestions"][number]["lockedDistribution"] | null;
        status?: StoreShape["seasonPredictionEntries"][number]["status"];
        hitStatus?: StoreShape["seasonPredictionEntries"][number]["hitStatus"];
        rewardGranted?: boolean;
        rewardAmount?: number | null;
      };

      return {
        ...entry,
        updatedAt: legacyEntry.updatedAt ?? entry.submittedAt,
        lockedAt: legacyEntry.lockedAt ?? null,
        snapshot: legacyEntry.snapshot ?? null,
        status: legacyEntry.status ?? "open",
        hitStatus: legacyEntry.hitStatus ?? "pending",
        rewardGranted: Boolean(legacyEntry.rewardGranted),
        rewardAmount: legacyEntry.rewardAmount ?? null,
      };
    }),
    playerRatings: (needsScheduleRefresh ? [] : (store.playerRatings ?? seed.playerRatings)).map((rating) => ({
      ...rating,
      comment: looksGarbled(rating.comment) ? fallbackSetRatingComment(rating.score) : rating.comment,
      updatedAt: rating.updatedAt ?? rating.createdAt,
    })),
    setPlayerRatings: ((needsScheduleRefresh || (store.setPlayerRatings ?? []).length === 0) ? seed.setPlayerRatings : (store.setPlayerRatings ?? seed.setPlayerRatings)).map((rating) => ({
      ...rating,
      comment: looksGarbled(rating.comment) ? fallbackSetRatingComment(rating.score) : rating.comment,
      updatedAt: rating.updatedAt ?? rating.createdAt,
    })),
    comments: (needsScheduleRefresh ? [] : (store.comments ?? seed.comments)).map((comment) => ({
      ...comment,
      text: looksGarbled(comment.text) ? fallbackCommentText(comment.id) : comment.text,
      parentId: "parentId" in comment ? comment.parentId ?? null : null,
      recommendUserIds: "recommendUserIds" in comment ? comment.recommendUserIds ?? [] : [],
      updatedAt: comment.updatedAt ?? comment.createdAt,
    })),
    pointLedger: (store.pointLedger ?? seed.pointLedger).map((entry) => ({
      ...entry,
      reason: looksGarbled(entry.reason) ? fallbackLedgerReason(entry.referenceType, entry.referenceId) : entry.reason,
    })),
    notifications: (store.notifications ?? seed.notifications).map((notification) => ({
      ...notification,
      title: looksGarbled(notification.title) ? fallbackNotificationCopy(notification.type).title : notification.title,
      body: looksGarbled(notification.body) ? fallbackNotificationCopy(notification.type).body : notification.body,
      isRead: Boolean(notification.isRead),
      rewardCoins: notification.rewardCoins ?? null,
      appliedOddsPercent: notification.appliedOddsPercent ?? null,
      metadata: notification.metadata ?? {},
    })),
    profileStoreItems: (store.profileStoreItems ?? seed.profileStoreItems).filter((item) => activeStoreItemIds.has(item.id)),
    userInventory: (store.userInventory ?? seed.userInventory).filter((inventory) =>
      activeStoreItemIds.has(inventory.storeItemId),
    ),
    nextIds,
  };

  for (const user of normalized.users) {
    ensureUserCarryover(normalized, user.id, legacyPointsByUser.get(user.id) ?? 0);
  }

  syncPredictionHitBonuses(normalized);

  return normalized;
}

function hasSupabaseStoreConfig() {
  return Boolean(supabaseUrl && supabaseSecretKey);
}

function getSupabaseAdminClient() {
  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseAdminClient;
}

function getSupabaseStoreMode() {
  return supabaseStoreMode === "relational" ? "relational" : "json";
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function ensureLocalStore(): Promise<StoreShape> {
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

async function saveLocalStore(store: StoreShape) {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
}

async function ensureSupabaseJsonStore(): Promise<StoreShape> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(supabaseStoreTable)
    .select("id, data, created_at, updated_at")
    .eq("id", supabaseStoreRowId)
    .maybeSingle<ServiceStoreRow>();

  if (error) {
    throw new Error(`Failed to read Supabase service store: ${error.message}`);
  }

  if (!data) {
    const seed = createSeedStore();
    await saveSupabaseJsonStore(seed);
    return seed;
  }

  return withDefaults((data.data ?? {}) as Partial<StoreShape>);
}

async function saveSupabaseJsonStore(store: StoreShape) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from(supabaseStoreTable).upsert({
    id: supabaseStoreRowId,
    data: store,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to write Supabase service store: ${error.message}`);
  }
}

async function readRelationalCollection<K extends StoreCollectionKey>(
  config: CollectionConfig & { key: K },
): Promise<StoreShape[K]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(config.table)
    .select("id, payload")
    .order("id", { ascending: true })
    .returns<RelationalStoreRow<StoreShape[K][number]>[]>();

  if (error) {
    throw new Error(`Failed to read Supabase table "${config.table}": ${error.message}`);
  }

  return (data ?? []).map((row) => row.payload) as StoreShape[K];
}

async function readSupabaseNextIds(): Promise<StoreShape["nextIds"]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from(supabaseServiceMetaTable)
    .select("key, value")
    .eq("key", "nextIds")
    .maybeSingle<ServiceMetaRow>();

  if (error) {
    throw new Error(`Failed to read Supabase table "${supabaseServiceMetaTable}": ${error.message}`);
  }

  return (data?.value ?? {}) as StoreShape["nextIds"];
}

async function ensureSupabaseRelationalStore(): Promise<StoreShape> {
  const partialStore = {} as Partial<StoreShape>;
  const collectionResults = await Promise.all(
    storeCollectionConfigs.map(async (config) => {
      const rows = await readRelationalCollection(config as CollectionConfig & { key: StoreCollectionKey });
      return { key: config.key, rows };
    }),
  );

  for (const result of collectionResults) {
    (partialStore as Record<string, unknown[]>)[result.key] = result.rows as unknown[];
  }

  partialStore.nextIds = await readSupabaseNextIds();

  const isEmptyStore = storeCollectionConfigs.every((config) => (partialStore[config.key] ?? []).length === 0);
  if (isEmptyStore && Object.keys(partialStore.nextIds ?? {}).length === 0) {
    const seed = createSeedStore();
    await saveSupabaseRelationalStore(seed);
    return seed;
  }

  return withDefaults(partialStore);
}

async function replaceSupabaseCollectionRows<K extends StoreCollectionKey>(
  config: CollectionConfig & { key: K },
  rows: Array<{ id: string }>,
) {
  const supabase = getSupabaseAdminClient();
  const desiredIds = new Set(rows.map((row) => row.id));
  const { data: existingRows, error: existingRowsError } = await supabase
    .from(config.table)
    .select("id")
    .returns<Array<Pick<RelationalStoreRow<StoreShape[K][number]>, "id">>>();

  if (existingRowsError) {
    throw new Error(`Failed to read Supabase table "${config.table}": ${existingRowsError.message}`);
  }

  const staleIds = (existingRows ?? [])
    .map((row) => row.id)
    .filter((id) => !desiredIds.has(id));

  for (const batch of chunkArray(rows, 500)) {
    if (batch.length === 0) {
      continue;
    }

    const { error } = await supabase.from(config.table).upsert(
      batch.map((row) => ({
        id: row.id,
        payload: row,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "id" },
    );

    if (error) {
      throw new Error(`Failed to write Supabase table "${config.table}": ${error.message}`);
    }
  }

  for (const batch of chunkArray(staleIds, 500)) {
    if (batch.length === 0) {
      continue;
    }

    const { error } = await supabase.from(config.table).delete().in("id", batch);

    if (error) {
      throw new Error(`Failed to prune Supabase table "${config.table}": ${error.message}`);
    }
  }
}

async function saveSupabaseRelationalStore(store: StoreShape) {
  await Promise.all(
    storeCollectionConfigs.map((config) =>
      replaceSupabaseCollectionRows(
        config as CollectionConfig & { key: StoreCollectionKey },
        store[config.key] as Array<{ id: string }>,
      ),
    ),
  );

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from(supabaseServiceMetaTable).upsert(
    {
      key: "nextIds",
      value: store.nextIds,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );

  if (error) {
    throw new Error(`Failed to write Supabase table "${supabaseServiceMetaTable}": ${error.message}`);
  }
}

async function ensureStore(): Promise<StoreShape> {
  if (hasSupabaseStoreConfig()) {
    return getSupabaseStoreMode() === "relational" ? ensureSupabaseRelationalStore() : ensureSupabaseJsonStore();
  }

  return ensureLocalStore();
}

async function saveStore(store: StoreShape) {
  if (hasSupabaseStoreConfig()) {
    if (getSupabaseStoreMode() === "relational") {
      await saveSupabaseRelationalStore(store);
      return;
    }

    await saveSupabaseJsonStore(store);
    return;
  }

  await saveLocalStore(store);
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

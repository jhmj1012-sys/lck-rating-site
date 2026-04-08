'use server';

import { refresh, revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/authz";
import {
  cancelSeasonPredictionQuestion,
  resolveSeasonPredictionQuestion,
  syncAllMatchRostersFromTeamRosters,
  setCommentHidden,
  updateMatchRoster,
  updateTeamRoster,
  upsertSeasonPredictionQuestion,
  upsertMatch,
} from "@/lib/service";
import { readStore } from "@/lib/store";
import { fetchLckCompletedMatches, fetchMatchLineup, type RiotCompletedMatch } from "@/lib/riot-api";
import { normalizePlayerName } from "@/lib/riot-player-map";

// ── Riot 동기화 타입 ──────────────────────────────────────────────

export type RiotSyncLineupEntry = {
  teamCode: string;
  role: string;
  playerName: string;
};

export type RiotSyncItem = {
  matchId: string;
  /** 라인업 조회에 쓸 Riot 경기 ID */
  riotMatchId: string;
  teamACode: string;
  teamBCode: string;
  scheduledAt: string;
  riotScoreA: number;
  riotScoreB: number;
  dbStatus: "scheduled" | "finished";
  dbScoreA: number | null;
  dbScoreB: number | null;
  /** Riot 결과가 이미 DB에 반영된 상태 */
  alreadyApplied: boolean;
  /** Riot에서 가져온 출전 선수 (null이면 조회 실패) */
  riotLineup: RiotSyncLineupEntry[] | null;
};

export type RiotSyncPreview = {
  matched: RiotSyncItem[];
  unmatched: RiotCompletedMatch[];
  fetchedAt: string;
};

function toNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export async function upsertMatchAction(formData: FormData) {
  await requireAdmin();

  await upsertMatch({
    matchId: (formData.get("matchId") as string) || undefined,
    league: (formData.get("league") as string) || "LCK 2026",
    stage: (formData.get("stage") as string) || "Rounds 1-2",
    patch: (formData.get("patch") as string) || "15.7",
    status: ((formData.get("status") as string) || "scheduled") as "scheduled" | "finished",
    scheduledAt: (formData.get("scheduledAt") as string) || new Date().toISOString(),
    teamACode: (formData.get("teamACode") as string) || "",
    teamBCode: (formData.get("teamBCode") as string) || "",
    scoreA: toNumber(formData.get("scoreA")),
    scoreB: toNumber(formData.get("scoreB")),
    predictionLocked: formData.get("predictionLocked") === "on",
  });

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function updateMatchRosterAction(formData: FormData) {
  await requireAdmin();

  const matchId = formData.get("matchId");
  if (typeof matchId !== "string" || !matchId) {
    throw new Error("경기 정보가 없습니다.");
  }

  const playerIds = formData
    .getAll("playerIds")
    .filter((entry): entry is string => typeof entry === "string");

  await updateMatchRoster(matchId, playerIds);

  revalidatePath("/");
  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/admin");
  refresh();
}

export async function syncAllMatchRostersAction() {
  await requireAdmin();

  await syncAllMatchRostersFromTeamRosters();

  revalidatePath("/");
  revalidatePath("/schedule");
  revalidatePath("/admin");
  revalidatePath("/matches/[matchId]", "page");
  refresh();
}

export async function updateMatchResultAction(formData: FormData) {
  await requireAdmin();

  const matchId = formData.get("matchId");
  if (typeof matchId !== "string" || !matchId) {
    throw new Error("경기 정보가 없습니다.");
  }

  const league = formData.get("league");
  const stage = formData.get("stage");
  const patch = formData.get("patch");
  const scheduledAt = formData.get("scheduledAt");
  const teamACode = formData.get("teamACode");
  const teamBCode = formData.get("teamBCode");

  if (
    typeof league !== "string" ||
    typeof stage !== "string" ||
    typeof patch !== "string" ||
    typeof scheduledAt !== "string" ||
    typeof teamACode !== "string" ||
    typeof teamBCode !== "string"
  ) {
    throw new Error("경기 기본 정보가 올바르지 않습니다.");
  }

  const scoreA = toNumber(formData.get("scoreA"));
  const scoreB = toNumber(formData.get("scoreB"));
  if (scoreA === null || scoreB === null || scoreA < 0 || scoreB < 0) {
    throw new Error("점수는 0 이상의 숫자로 입력해 주세요.");
  }

  await upsertMatch({
    matchId,
    league,
    stage,
    patch,
    status: "finished",
    scheduledAt,
    teamACode,
    teamBCode,
    scoreA,
    scoreB,
    predictionLocked: true,
  });

  revalidatePath("/");
  revalidatePath("/schedule");
  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/admin");
}

export async function toggleCommentVisibilityAction(formData: FormData) {
  await requireAdmin();

  const commentId = formData.get("commentId");
  if (typeof commentId !== "string" || !commentId) {
    throw new Error("댓글 정보가 없습니다.");
  }

  await setCommentHidden(commentId, formData.get("hidden") === "true");

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function updateTeamRosterAction(formData: FormData) {
  await requireAdmin();

  const teamCode = formData.get("teamCode");
  if (typeof teamCode !== "string" || !teamCode) {
    throw new Error("팀 정보가 없습니다.");
  }

  const playerIds = formData.getAll("playerIds").filter((entry): entry is string => typeof entry === "string");
  const players = playerIds.map((playerId, index) => ({
    playerId,
    displayOrder: index + 1,
    isMainRoster: true,
  }));

  await updateTeamRoster({ teamCode, players });

  revalidatePath("/");
  revalidatePath("/teams");
  revalidatePath(`/teams/${teamCode}`);
  revalidatePath("/admin");
}

function parseSeasonOptions(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, value] = line.split("|").map((part) => part.trim());
      return { label, value: value || label };
    });
}

export async function upsertSeasonPredictionQuestionAction(formData: FormData) {
  await requireAdmin();

  await upsertSeasonPredictionQuestion({
    questionId: (formData.get("questionId") as string) || undefined,
    title: (formData.get("title") as string) || "",
    description: (formData.get("description") as string) || "",
    category: (formData.get("category") as string) || "LCK",
    predictionType: ((formData.get("predictionType") as string) || "single") as "single" | "yesno" | "range",
    season: (formData.get("season") as string) || "",
    openAt: (formData.get("openAt") as string) || new Date().toISOString(),
    closeAt: (formData.get("closeAt") as string) || new Date().toISOString(),
    visibility: ((formData.get("visibility") as string) || "public") as "public" | "private",
    manualStatus: ((formData.get("manualStatus") as string) || "active") as "draft" | "active" | "canceled",
    options: parseSeasonOptions((formData.get("options") as string) || ""),
  });

  revalidatePath("/");
  revalidatePath("/season-predictions");
  revalidatePath("/admin");
}

export async function resolveSeasonPredictionQuestionAction(formData: FormData) {
  await requireAdmin();

  const questionId = formData.get("questionId");
  const resultOptionId = formData.get("resultOptionId");
  if (typeof questionId !== "string" || !questionId || typeof resultOptionId !== "string" || !resultOptionId) {
    throw new Error("질문 또는 정답 정보가 없습니다.");
  }

  await resolveSeasonPredictionQuestion({ questionId, resultOptionId });

  revalidatePath("/");
  revalidatePath("/season-predictions");
  revalidatePath(`/season-predictions/${questionId}`);
  revalidatePath("/me");
  revalidatePath("/admin");
}

export async function cancelSeasonPredictionQuestionAction(formData: FormData) {
  await requireAdmin();
  const questionId = formData.get("questionId");
  if (typeof questionId !== "string" || !questionId) {
    throw new Error("질문 정보가 없습니다.");
  }

  await cancelSeasonPredictionQuestion(questionId);

  revalidatePath("/");
  revalidatePath("/season-predictions");
  revalidatePath(`/season-predictions/${questionId}`);
  revalidatePath("/me");
  revalidatePath("/admin");
}

// ── Riot API 동기화 액션 ─────────────────────────────────────────

/**
 * Riot API에서 LCK 완료 경기 결과를 가져와 DB와 비교한 미리보기를 반환합니다.
 * - 매칭된 경기: 양 팀 코드 + 날짜(±24h)가 일치하는 경기
 * - 미매칭: Riot에는 결과가 있으나 DB에 해당 경기가 없는 경우
 */
export async function fetchRiotResultsAction(): Promise<RiotSyncPreview> {
  await requireAdmin();

  const [riotMatches, store] = await Promise.all([
    fetchLckCompletedMatches(),
    readStore(),
  ]);

  const matched: RiotSyncItem[] = [];
  const unmatched: RiotCompletedMatch[] = [];

  for (const riot of riotMatches) {
    // 팀 코드(순서 무관) + 날짜(±24h) 기준으로 DB 경기 탐색
    const dbMatch = store.matches.find((m) => {
      const tA = store.teams.find((t) => t.id === m.teamAId);
      const tB = store.teams.find((t) => t.id === m.teamBId);
      if (!tA || !tB) return false;

      const codesMatch =
        (tA.code === riot.teamACode && tB.code === riot.teamBCode) ||
        (tA.code === riot.teamBCode && tB.code === riot.teamACode);

      const diffMs = Math.abs(
        new Date(m.scheduledAt).getTime() - new Date(riot.startTime).getTime(),
      );
      return codesMatch && diffMs < 24 * 60 * 60 * 1000;
    });

    if (!dbMatch) {
      unmatched.push(riot);
      continue;
    }

    const tA = store.teams.find((t) => t.id === dbMatch.teamAId)!;
    const tB = store.teams.find((t) => t.id === dbMatch.teamBId)!;

    // Riot 팀 순서가 DB와 반대일 경우 스코어 교환
    const isFlipped = tA.code === riot.teamBCode;
    const riotScoreA = isFlipped ? riot.scoreB : riot.scoreA;
    const riotScoreB = isFlipped ? riot.scoreA : riot.scoreB;

    const alreadyApplied =
      dbMatch.status === "finished" &&
      dbMatch.scoreA === riotScoreA &&
      dbMatch.scoreB === riotScoreB;

    matched.push({
      matchId: dbMatch.id,
      riotMatchId: riot.riotMatchId,
      teamACode: tA.code,
      teamBCode: tB.code,
      scheduledAt: dbMatch.scheduledAt,
      riotScoreA,
      riotScoreB,
      dbStatus: dbMatch.status,
      dbScoreA: dbMatch.scoreA,
      dbScoreB: dbMatch.scoreB,
      alreadyApplied,
      riotLineup: null, // 아래에서 채움
    });
  }

  // 미적용 경기의 라인업을 병렬로 조회
  const pendingItems = matched.filter((item) => !item.alreadyApplied);
  const lineupResults = await Promise.allSettled(
    pendingItems.map((item) => fetchMatchLineup(item.riotMatchId)),
  );

  for (let i = 0; i < pendingItems.length; i++) {
    const result = lineupResults[i];
    if (result.status === "fulfilled" && result.value) {
      pendingItems[i].riotLineup = result.value.players.map((p) => ({
        teamCode: p.teamCode,
        role: p.role,
        playerName: p.playerName,
      }));
    }
  }

  return { matched, unmatched, fetchedAt: new Date().toISOString() };
}

/**
 * Riot 선수 목록에서 DB 선수 ID 배열을 만드는 헬퍼
 * - summonerName의 팀 접두사 제거 후 이름 정규화
 * - DB에서 팀 코드 + 이름으로 선수 탐색
 */
async function resolveLineupPlayerIds(
  riotMatchId: string,
  store: Awaited<ReturnType<typeof readStore>>,
): Promise<{ playerIds: string[]; lineupFound: boolean }> {
  const lineup = await fetchMatchLineup(riotMatchId);
  if (!lineup || lineup.players.length === 0) {
    return { playerIds: [], lineupFound: false };
  }

  const playerIds: string[] = [];

  for (const entry of lineup.players) {
    const team = store.teams.find((t) => t.code === entry.teamCode);
    if (!team) continue;

    const dbName = normalizePlayerName(entry.playerName);
    const player = store.players.find(
      (p) => p.teamId === team.id && p.name.toLowerCase() === dbName.toLowerCase(),
    );
    if (!player) continue;

    playerIds.push(player.id);
  }

  return { playerIds, lineupFound: playerIds.length > 0 };
}

/**
 * 단일 경기의 결과 + 라인업을 Riot 데이터 기준으로 DB에 적용합니다.
 * 라인업 조회에 실패해도 결과는 반드시 적용합니다.
 */
export async function applyRiotResultAction(
  matchId: string,
  riotMatchId: string,
  scoreA: number,
  scoreB: number,
): Promise<{ lineupApplied: boolean }> {
  await requireAdmin();

  const store = await readStore();
  const match = store.matches.find((m) => m.id === matchId);
  if (!match) throw new Error("경기를 찾을 수 없습니다.");

  const teamA = store.teams.find((t) => t.id === match.teamAId);
  const teamB = store.teams.find((t) => t.id === match.teamBId);
  if (!teamA || !teamB) throw new Error("팀 정보를 찾을 수 없습니다.");

  // 결과 + 라인업을 병렬로 처리
  const [, { playerIds, lineupFound }] = await Promise.all([
    upsertMatch({
      matchId: match.id,
      league: match.league,
      stage: match.stage,
      patch: match.patch,
      status: "finished",
      scheduledAt: match.scheduledAt,
      teamACode: teamA.code,
      teamBCode: teamB.code,
      scoreA,
      scoreB,
      predictionLocked: true,
    }),
    resolveLineupPlayerIds(riotMatchId, store),
  ]);

  if (lineupFound && playerIds.length > 0) {
    await updateMatchRoster(matchId, playerIds);
  }

  revalidatePath("/");
  revalidatePath("/schedule");
  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/admin");
  refresh();

  return { lineupApplied: lineupFound };
}

/**
 * 미리보기에서 확인된 모든 미적용 경기를 한번에 결과 + 라인업 반영합니다.
 */
export async function applyAllRiotResultsAction(
  items: Array<{ matchId: string; riotMatchId: string; scoreA: number; scoreB: number }>,
): Promise<{ applied: number; lineupApplied: number }> {
  await requireAdmin();

  const store = await readStore();
  let applied = 0;
  let lineupApplied = 0;

  // 결과 적용 + 라인업 조회를 병렬로 실행
  const tasks = items.map(async (item) => {
    const match = store.matches.find((m) => m.id === item.matchId);
    if (!match) return;

    const teamA = store.teams.find((t) => t.id === match.teamAId);
    const teamB = store.teams.find((t) => t.id === match.teamBId);
    if (!teamA || !teamB) return;

    const [, { playerIds, lineupFound }] = await Promise.all([
      upsertMatch({
        matchId: match.id,
        league: match.league,
        stage: match.stage,
        patch: match.patch,
        status: "finished",
        scheduledAt: match.scheduledAt,
        teamACode: teamA.code,
        teamBCode: teamB.code,
        scoreA: item.scoreA,
        scoreB: item.scoreB,
        predictionLocked: true,
      }),
      resolveLineupPlayerIds(item.riotMatchId, store),
    ]);

    applied++;

    if (lineupFound && playerIds.length > 0) {
      await updateMatchRoster(item.matchId, playerIds);
      lineupApplied++;
    }
  });

  await Promise.all(tasks);

  revalidatePath("/");
  revalidatePath("/schedule");
  revalidatePath("/matches/[matchId]", "page");
  revalidatePath("/admin");
  refresh();

  return { applied, lineupApplied };
}

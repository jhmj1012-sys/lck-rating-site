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

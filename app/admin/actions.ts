'use server';

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/authz";
import {
  saveAdminSetRating,
  setCommentHidden,
  updateMatchRoster,
  updateSetRoster,
  updateTeamRoster,
  upsertMatch,
  upsertMatchSet,
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

export async function upsertMatchSetAction(formData: FormData) {
  await requireAdmin();

  const matchId = formData.get("matchId");
  if (typeof matchId !== "string" || !matchId) {
    throw new Error("경기 정보가 없습니다.");
  }

  await upsertMatchSet({
    matchId,
    setId: (formData.get("setId") as string) || undefined,
    setNumber: Number(formData.get("setNumber") || 1),
    winnerTeamCode: (formData.get("winnerTeamCode") as string) || "",
    durationMinutes: toNumber(formData.get("durationMinutes")),
    note: (formData.get("note") as string) || "",
  });

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function updateSetRosterAction(formData: FormData) {
  await requireAdmin();

  const setId = formData.get("setId");
  if (typeof setId !== "string" || !setId) {
    throw new Error("세트 정보가 없습니다.");
  }

  const playerIds = formData
    .getAll("playerIds")
    .filter((entry): entry is string => typeof entry === "string");

  await updateSetRoster(setId, playerIds);

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function saveAdminSetRatingAction(formData: FormData) {
  const admin = await requireAdmin();

  const setId = formData.get("setId");
  const playerId = formData.get("playerId");
  if (typeof setId !== "string" || !setId || typeof playerId !== "string" || !playerId) {
    throw new Error("세트 또는 선수 정보가 없습니다.");
  }

  await saveAdminSetRating({
    userId: admin.id,
    setId,
    playerId,
    score: Number(formData.get("score") || 0),
    comment: (formData.get("comment") as string) || "",
  });

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

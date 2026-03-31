import {
  CHALLENGE_POSITIONS,
  type ChallengeConfig,
  type ChallengePlayer,
  type ChallengePosition,
  type ChallengeResultSummary,
  type ChallengeSelection,
  type SelectionAvailability,
} from "@/lib/games/budget-challenge-types";

function encodeBase64Url(raw: string) {
  const text = encodeURIComponent(raw);

  if (typeof Buffer !== "undefined") {
    return Buffer.from(text, "utf8").toString("base64url");
  }

  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(encoded: string) {
  if (!encoded) {
    return "";
  }

  if (typeof Buffer !== "undefined") {
    return decodeURIComponent(Buffer.from(encoded, "base64url").toString("utf8"));
  }

  const padded = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=").replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(atob(padded));
}

export function calculateUsedBudget(selection: ChallengeSelection, playersById: Map<string, ChallengePlayer>) {
  return Object.values(selection).reduce((sum, playerId) => {
    if (!playerId) {
      return sum;
    }

    return sum + (playersById.get(playerId)?.price ?? 0);
  }, 0);
}

export function createChallengeSummary(
  config: ChallengeConfig,
  selection: ChallengeSelection,
  playersById: Map<string, ChallengePlayer>,
): ChallengeResultSummary {
  const usedBudget = calculateUsedBudget(selection, playersById);
  const requiredCount = config.slots.reduce((sum, slot) => sum + slot.requiredCount, 0);
  const selectedCount = Object.values(selection).filter(Boolean).length;

  return {
    usedBudget,
    remainingBudget: config.budget - usedBudget,
    selectedCount,
    requiredCount,
    isComplete: selectedCount === requiredCount && usedBudget <= config.budget,
  };
}

export function canSelectPlayer({
  config,
  selection,
  playersById,
  player,
}: {
  config: ChallengeConfig;
  selection: ChallengeSelection;
  playersById: Map<string, ChallengePlayer>;
  player: ChallengePlayer;
}): SelectionAvailability {
  const currentId = selection[player.position];
  if (currentId === player.id) {
    return { canSelect: true };
  }

  const usedBudget = calculateUsedBudget(selection, playersById);
  const currentPlayer = currentId ? playersById.get(currentId) : undefined;
  const projectedBudget = usedBudget - (currentPlayer?.price ?? 0) + player.price;

  if (projectedBudget > config.budget) {
    return { canSelect: false, reason: "예산 초과" };
  }

  return { canSelect: true };
}

export function encodeSelection(selection: ChallengeSelection) {
  const payload = CHALLENGE_POSITIONS.map((position) => {
    const selected = selection[position];
    return selected ? `${position}:${selected}` : "";
  })
    .filter(Boolean)
    .join(",");

  return encodeBase64Url(payload);
}

export function decodeSelection(encoded: string): ChallengeSelection {
  if (!encoded) {
    return {};
  }

  try {
    const decoded = decodeBase64Url(encoded);
    const entries = decoded.split(",").filter(Boolean);

    return entries.reduce<ChallengeSelection>((acc, entry) => {
      const [position, playerId] = entry.split(":");
      if (!position || !playerId) {
        return acc;
      }

      if ((CHALLENGE_POSITIONS as readonly string[]).includes(position)) {
        acc[position as ChallengePosition] = playerId;
      }

      return acc;
    }, {});
  } catch {
    return {};
  }
}

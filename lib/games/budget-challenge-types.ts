export const CHALLENGE_POSITIONS = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"] as const;

export type ChallengePosition = (typeof CHALLENGE_POSITIONS)[number];
export type ChallengeMode = "position-lock";

export type SelectionFailureReason = "예산 초과";

export interface ChallengeSlotRule {
  position: ChallengePosition;
  requiredCount: number;
}

export interface ChallengeConfig {
  id: string;
  title: string;
  description: string;
  budget: number;
  mode: ChallengeMode;
  slots: ChallengeSlotRule[];
  shareWatermark: string;
}

export interface ChallengePlayer {
  id: string;
  name: string;
  team: string;
  position: ChallengePosition;
  price: number;
  image: string;
  shortLabel: string;
  active: boolean;
  order?: number;
}

export type ChallengeSelection = Partial<Record<ChallengePosition, string>>;

export interface ChallengeResultSummary {
  usedBudget: number;
  remainingBudget: number;
  selectedCount: number;
  requiredCount: number;
  isComplete: boolean;
}

export interface SelectionAvailability {
  canSelect: boolean;
  reason?: SelectionFailureReason;
}

export interface BudgetChallengePostSlot {
  position: ChallengePosition;
  playerId: string;
  playerName: string;
  team: string;
  price: number;
}

export interface BudgetChallengePost {
  id: string;
  title: string;
  body: string;
  authorId: string;
  authorNickname: string;
  createdAt: string;
  encodedSelection: string;
  usedBudget: number;
  slots: BudgetChallengePostSlot[];
}

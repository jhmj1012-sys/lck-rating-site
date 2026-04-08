export const CHALLENGE_POSITIONS = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"] as const;

export type ChallengePosition = (typeof CHALLENGE_POSITIONS)[number];
export type ChallengeMode = "position-lock";

export type SelectionFailureReason = "budget-exceeded";

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

export interface BudgetChallengeComment {
  id: string;
  authorId: string;
  authorNickname: string;
  body: string;
  createdAt: string;
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
  comments: BudgetChallengeComment[];
  commentCount: number;
  likeCount: number;
  likedByMe: boolean;
}

export interface BudgetChallengePostRecord
  extends Omit<BudgetChallengePost, "commentCount" | "likeCount" | "likedByMe"> {
  likeUserIds: string[];
}

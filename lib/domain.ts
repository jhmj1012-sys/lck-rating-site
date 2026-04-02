export type MatchStatus = "scheduled" | "finished";
export type UserRole = "user" | "admin";
export type PlayerRole = "TOP" | "JGL" | "MID" | "ADC" | "SUP";
export type PointLedgerType = "earn" | "spend";
export type ProfileStoreItemType = "title" | "theme";
export type PredictionSettlementResult = "hit" | "miss";
export type NotificationType = "prediction_joined" | "prediction_hit" | "prediction_missed" | "coin_earned" | "system";
export type SeasonPredictionType = "single" | "yesno" | "range";
export type SeasonPredictionManualStatus = "draft" | "active" | "canceled";
export type SeasonPredictionEntryStatus = "open" | "locked" | "resolved" | "canceled";
export type SeasonPredictionHitStatus = "hit" | "miss" | "pending" | "canceled";
export type SeasonPredictionRewardMode = "parimutuel";

export interface StoredPredictionDistribution {
  teamA: number;
  teamB: number;
  totalVotes: number;
}

export interface StoredPredictionOddsSide {
  oddsPercent: number;
  hitBonusCoins: number;
}

export interface StoredPredictionOdds {
  teamA: StoredPredictionOddsSide;
  teamB: StoredPredictionOddsSide;
}

export interface StoredSeasonPredictionOptionShare {
  optionId: string;
  voteCount: number;
  sharePercent: number;
}

export interface StoredSeasonPredictionLockedDistribution {
  totalEntries: number;
  optionShares: StoredSeasonPredictionOptionShare[];
  capturedAt: string;
}

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  nickname: string | null;
  nicknameOnboardingSeen: boolean;
  nicknameUpdatedAt: string | null;
  bio: string | null;
  image: string | null;
  role: UserRole;
  selectedProfileTheme: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoredTeam {
  id: string;
  code: string;
  name: string;
  shortName: string;
}

export interface StoredPlayer {
  id: string;
  slug: string;
  teamId: string;
  name: string;
  role: PlayerRole;
}

export interface StoredTeamRosterEntry {
  id: string;
  teamId: string;
  playerId: string;
  season: string;
  phase: string;
  isMainRoster: boolean;
  displayOrder: number;
  sourceUrl: string;
  isManualOverride: boolean;
  updatedAt: string;
}

export interface StoredMatch {
  id: string;
  league: string;
  stage: string;
  patch: string;
  status: MatchStatus;
  scheduledAt: string;
  teamAId: string;
  teamBId: string;
  scoreA: number | null;
  scoreB: number | null;
  predictionLocked: boolean;
  predictionLockedAt: string | null;
  lockedDistribution: StoredPredictionDistribution | null;
  lockedOdds: StoredPredictionOdds | null;
  predictionSettledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoredMatchParticipant {
  id: string;
  matchId: string;
  playerId: string;
  teamId: string;
}

export interface StoredPrediction {
  id: string;
  userId: string;
  matchId: string;
  teamId: string;
  createdAt: string;
  updatedAt?: string | null;
  joinedRewardGrantedAt: string | null;
  settledAt: string | null;
  settlementResult: PredictionSettlementResult | null;
  settlementCoins: number;
  appliedOddsPercent: number | null;
  wasUnderdogPick: boolean | null;
}

export interface StoredSeasonPredictionQuestion {
  id: string;
  title: string;
  description: string;
  category: string;
  predictionType: SeasonPredictionType;
  season: string;
  openAt: string;
  closeAt: string;
  manualStatus: SeasonPredictionManualStatus;
  visibility: "public" | "private";
  lockedAt: string | null;
  resolvedAt: string | null;
  resultOptionId: string | null;
  resultValue: string | null;
  rewardMode: SeasonPredictionRewardMode;
  baseRewardAmount: number | null;
  lockedDistribution: StoredSeasonPredictionLockedDistribution | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoredSeasonPredictionOption {
  id: string;
  questionId: string;
  label: string;
  value: string;
  sortOrder: number;
}

export interface StoredSeasonPredictionEntry {
  id: string;
  userId: string;
  questionId: string;
  selectedOptionId: string;
  submittedAt: string;
  updatedAt: string;
  lockedAt: string | null;
  snapshot: StoredSeasonPredictionLockedDistribution | null;
  status: SeasonPredictionEntryStatus;
  hitStatus: SeasonPredictionHitStatus;
  rewardGranted: boolean;
  rewardAmount: number | null;
}

export interface StoredPlayerRating {
  id: string;
  userId: string;
  matchId: string;
  playerId: string;
  score: number;
  comment: string;
  createdAt: string;
  updatedAt?: string | null;
}

export interface StoredComment {
  id: string;
  userId: string;
  matchId: string;
  text: string;
  parentId: string | null;
  recommendUserIds: string[];
  hidden: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface StoredPointLedgerEntry {
  id: string;
  userId: string;
  type: PointLedgerType;
  amount: number;
  reason: string;
  referenceType: string;
  referenceId: string;
  createdAt: string;
  balanceAfter: number;
}

export interface StoredNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  relatedMatchId: string | null;
  createdAt: string;
  isRead: boolean;
  rewardCoins: number | null;
  appliedOddsPercent: number | null;
  metadata: Record<string, string | number | boolean | null>;
}

export interface StoredProfileStoreItem {
  id: string;
  type: ProfileStoreItemType;
  label: string;
  description: string;
  price: number;
  previewValue: string;
}

export interface StoredUserInventoryItem {
  id: string;
  userId: string;
  storeItemId: string;
  equipped: boolean;
  acquiredAt: string;
}

export interface StoreShape {
  users: StoredUser[];
  teams: StoredTeam[];
  players: StoredPlayer[];
  teamRosterEntries: StoredTeamRosterEntry[];
  matches: StoredMatch[];
  matchParticipants: StoredMatchParticipant[];
  predictions: StoredPrediction[];
  seasonPredictionQuestions: StoredSeasonPredictionQuestion[];
  seasonPredictionOptions: StoredSeasonPredictionOption[];
  seasonPredictionEntries: StoredSeasonPredictionEntry[];
  playerRatings: StoredPlayerRating[];
  comments: StoredComment[];
  pointLedger: StoredPointLedgerEntry[];
  notifications: StoredNotification[];
  profileStoreItems: StoredProfileStoreItem[];
  userInventory: StoredUserInventoryItem[];
  nextIds: Record<string, number>;
}

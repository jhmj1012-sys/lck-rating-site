export type MatchStatus = "scheduled" | "finished";
export type PlayerRole = "TOP" | "JGL" | "MID" | "ADC" | "SUP";
export type PredictionLifecycleState = "open" | "locked" | "settled";
export type NotificationType = "prediction_joined" | "prediction_hit" | "prediction_missed" | "coin_earned" | "system";
export type PredictionBlockReason =
  | "unauthenticated"
  | "profile-required"
  | "locked"
  | "unavailable"
  | "needs-selection"
  | null;

export interface PlayerRating {
  id: string;
  name: string;
  team: string;
  role: PlayerRole;
  rating: number;
  ratingCount: number;
}

export interface MatchComment {
  id: string;
  userId: string | null;
  user: string;
  userSummary: PublicUserSummary | null;
  createdLabel: string;
  likes: number;
  text: string;
  tag: string;
}

export interface PredictionSummary {
  teamA: number;
  teamB: number;
  totalVotes: number;
}

export interface LockedPredictionOddsSide {
  oddsPercent: number;
  hitBonusCoins: number;
}

export interface LockedPredictionOdds {
  teamA: LockedPredictionOddsSide;
  teamB: LockedPredictionOddsSide;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  relatedMatchId: string | null;
  createdAt: string;
  createdLabel: string;
  isRead: boolean;
  rewardCoins: number | null;
  appliedOddsPercent: number | null;
}

export interface MatchData {
  id: string;
  league: string;
  stage: string;
  patch: string;
  status: MatchStatus;
  date: string;
  serverNow: string;
  scheduledAt: string;
  predictionDeadlineAt: string | null;
  teamA: string;
  teamB: string;
  score: string;
  comments: number;
  totalRatings: number;
  mvp: string;
  predictionLocked: boolean;
  predictionLifecycleState: PredictionLifecycleState;
  predictionSummary: PredictionSummary;
  lockedDistribution: PredictionSummary | null;
  lockedOdds: LockedPredictionOdds | null;
  myPredictionOddsPercent: number | null;
  myPredictionBonusCoins: number | null;
  myPredictionSettlementResult: "hit" | "miss" | null;
  myPredictionSettlementCoins: number;
  players: PlayerRating[];
  commentsList: MatchComment[];
  myPredictionTeam: string | null;
}

export interface MatchListItem {
  id: string;
  league: string;
  stage: string;
  status: MatchStatus;
  isFinished: boolean;
  winnerTeamCode: string | null;
  dateLabel: string;
  timeLabel: string;
  teamA: string;
  teamB: string;
  score: string;
  ratingParticipants: number;
  predictionVotes: number;
  predictionRateA: number;
  predictionRateB: number;
  predictionLocked: boolean;
  predictionLifecycleState: PredictionLifecycleState;
  lockedDistribution: PredictionSummary | null;
  lockedOdds: LockedPredictionOdds | null;
}

export interface MatchDateGroup {
  id: string;
  label: string;
  matches: MatchListItem[];
}

export interface MatchWeekGroup {
  id: string;
  label: string;
  dates: MatchDateGroup[];
}

export interface MatchMonthGroup {
  id: string;
  label: string;
  weeks: MatchWeekGroup[];
}

export interface MatchSetSummary {
  id: string;
  setNumber: number;
  title: string;
  isPlayed: boolean;
  winnerTeam: string | null;
  durationLabel: string;
  scoreLabel: string;
  note: string;
  ratingParticipants: number;
  topPerformer: string | null;
}

export interface SetPlayerRating {
  playerId: string;
  name: string;
  team: string;
  role: PlayerRole;
  averageRating: number;
  ratingCount: number;
  commentHighlights: string[];
}

export interface SetDetailData {
  id: string;
  matchId: string;
  setNumber: number;
  title: string;
  isPlayed: boolean;
  winnerTeam: string | null;
  durationLabel: string;
  scoreLabel: string;
  note: string;
  teamA: string;
  teamB: string;
  teamAPlayers: SetPlayerRating[];
  teamBPlayers: SetPlayerRating[];
  viewerRatings: Record<string, number>;
  canRate: boolean;
}

export interface MatchDetailData {
  match: MatchData;
  sets: MatchSetSummary[];
}

export interface WeekSchedule {
  id: string;
  label: string;
  matches: MatchData[];
}

export interface MatchWithWeek extends MatchData {
  weekId: string;
  weekLabel: string;
}

export interface UserProfile {
  nickname: string;
  email?: string;
  image?: string | null;
  isAuthenticated?: boolean;
  hasNickname?: boolean;
  points: number;
  level: number;
  teamBadge: string;
  ownedPersonas: string[];
  selectedProfileTheme?: string | null;
  predictionAccuracy: number;
  predictionStats: {
    total: number;
    hit: number;
    miss: number;
    streak: number;
  };
}

export interface TeamStandingItem {
  rank: number;
  teamCode: string;
  wins: number;
  losses: number;
  setDiff: number;
  winRate: number;
}

export interface PredictionLeaderboardItem {
  userId: string;
  rank: number;
  nickname: string;
  userSummary: PublicUserSummary | null;
  points: number;
  accuracy: number;
  hit: number;
  miss: number;
}

export interface PublicUserSummary {
  userId: string;
  nickname: string;
  bio: string;
  teamBadge: string;
  points: number;
  predictionAccuracy: number;
  predictionStyleLabel: string;
  level: number;
}

export interface HomeHeroStats {
  todayMatches: number;
  totalPredictions: number;
  totalRatings: number;
  totalComments: number;
  updatedLabel: string;
}

export interface HomeCommentFeedItem {
  id: string;
  userId: string | null;
  user: string;
  userSummary: PublicUserSummary | null;
  matchLabel: string;
  text: string;
  createdLabel: string;
}

export interface HomePlayerLeaderboardItem {
  rank: number;
  playerId: string;
  playerName: string;
  teamCode: string;
  averageRating: number;
  ratingCount: number;
}

export interface DashboardData {
  weeklySchedule: WeekSchedule[];
  userProfile: UserProfile;
  featuredMatchId: string | null;
}

export interface ScheduleHubData {
  months: MatchMonthGroup[];
  selectedMonthId: string | null;
  selectedWeekId: string | null;
  featuredMatchId: string | null;
  userProfile: UserProfile;
  standings: TeamStandingItem[];
  predictionLeaderboard: PredictionLeaderboardItem[];
  heroStats: HomeHeroStats;
  featuredMatch: MatchData | null;
  todayMatches: MatchData[];
  recentFinishedMatches: MatchData[];
  recentComments: HomeCommentFeedItem[];
  playerLeaderboard: HomePlayerLeaderboardItem[];
  notifications: NotificationItem[];
  unreadNotificationCount: number;
}

export interface RosterPlayerItem {
  playerId: string;
  name: string;
  role: PlayerRole;
  isMainRoster: boolean;
  displayOrder: number;
}

export interface TeamRosterSummary {
  teamCode: string;
  teamName: string;
  sourceUrl: string;
  updatedAt: string;
  playerCount: number;
  players: RosterPlayerItem[];
}

export interface TeamRosterDetail {
  teamCode: string;
  teamName: string;
  sourceUrl: string;
  updatedAt: string;
  rosterLabel: string;
  players: RosterPlayerItem[];
  recentMatches: MatchListItem[];
}

export interface MyPredictionItem {
  id: string;
  matchId: string;
  matchLabel: string;
  selectedTeam: string;
  status: MatchStatus;
  resultLabel: string;
  submittedAt: string;
  updatedAt: string;
  lockedOddsPercent: number | null;
  lockedBonusCoins: number | null;
  settlementCoins: number;
  wasUnderdogPick: boolean;
}

export interface MyRatingItem {
  id: string;
  matchId: string;
  matchLabel: string;
  setNumber: number | null;
  playerName: string;
  team: string;
  score: number;
  createdAt: string;
  updatedAt: string;
}

export interface MyCommentItem {
  id: string;
  matchId: string;
  matchLabel: string;
  text: string;
  hidden: boolean;
  createdAt: string;
}

export interface MyPointLedgerItem {
  id: string;
  type: "earn" | "spend";
  amount: number;
  reason: string;
  balanceAfter: number;
  createdAt: string;
}

export interface MyStoreItem {
  id: string;
  type: "badge" | "title" | "theme";
  label: string;
  description: string;
  price: number;
  previewValue: string;
  owned: boolean;
  equipped: boolean;
}

export interface PredictionInsightItem {
  label: string;
  value: string;
  description: string;
}

export interface PredictionComparisonItem {
  label: string;
  myValue: string;
  averageValue: string;
  delta: string;
  summary: string;
}

export interface MyPageData {
  profile: UserProfile & {
    bio: string | null;
    selectedBadge: string | null;
    selectedProfileTheme: string | null;
  };
  predictions: MyPredictionItem[];
  ratings: MyRatingItem[];
  comments: MyCommentItem[];
  pointLedger: MyPointLedgerItem[];
  storeItems: MyStoreItem[];
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  predictionInsights: PredictionInsightItem[];
  predictionComparison: PredictionComparisonItem[];
  predictionStyleLabel: string;
}

export type MatchStatus = "scheduled" | "finished";
export type MatchDetailViewStatus = "PRE" | "LIVE" | "POST";
export type RatingAvailability = "locked" | "open";
export type PredictionSectionMode = "entry" | "locked" | "result";
export type PlayerRole = "TOP" | "JGL" | "MID" | "ADC" | "SUP";
export type PredictionLifecycleState = "open" | "locked" | "settled";
export type NotificationType = "prediction_joined" | "prediction_hit" | "prediction_missed" | "coin_earned" | "system";
export type SeasonPredictionType = "single" | "yesno" | "range";
export type SeasonPredictionQuestionStatus = "draft" | "open" | "locked" | "resolved" | "canceled";
export type GlobalSearchResultType = "team" | "player" | "match";
export type PredictionBlockReason =
  | "unauthenticated"
  | "profile-required"
  | "locked"
  | "unavailable"
  | "needs-selection"
  | null;

export interface GlobalSearchResultItem {
  type: GlobalSearchResultType;
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export interface GlobalSearchResultGroup {
  type: GlobalSearchResultType;
  label: string;
  items: GlobalSearchResultItem[];
}

export interface GlobalSearchResultData {
  query: string;
  totalCount: number;
  groups: GlobalSearchResultGroup[];
}

export interface PlayerRating {
  id: string;
  playerSlug: string;
  name: string;
  team: string;
  role: PlayerRole;
  rating: number;
  ratingCount: number;
  viewerScore: number | null;
  viewerComment: string;
  topComment: { id: string; user: string; text: string; likeCount: number; viewerLiked: boolean } | null;
}

export interface MatchRatingComment {
  id: string;
  user: string;
  playerName: string;
  team: string;
  score: number;
  text: string;
  createdLabel: string;
  likeCount: number;
  viewerLiked: boolean;
}

export interface PredictionComment {
  id: string;
  user: string;
  selectedTeam: string;
  text: string;
  createdLabel: string;
  likeCount: number;
  viewerLiked: boolean;
}

export interface MatchComment {
  id: string;
  userId: string | null;
  parentId: string | null;
  user: string;
  userSummary: PublicUserSummary | null;
  createdAt: string;
  updatedAt: string;
  createdLabel: string;
  likes: number;
  likedByMe: boolean;
  replyCount: number;
  text: string;
  tag: string;
  pending?: boolean;
  isOptimistic?: boolean;
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

export interface SeasonPredictionOptionView {
  id: string;
  label: string;
  value: string;
  sortOrder: number;
  voteCount: number;
  sharePercent: number;
  lockedVoteCount: number | null;
  lockedSharePercent: number | null;
  isSelected: boolean;
  isResult: boolean;
}

export interface SeasonPredictionEntryView {
  selectedOptionId: string;
  selectedOptionLabel: string;
  submittedAt: string;
  updatedAt: string;
  lockedAt: string | null;
  hitStatus: "hit" | "miss" | "pending" | "canceled";
  rewardAmount: number | null;
  rewardGranted: boolean;
}

export interface SeasonPredictionQuestionCard {
  id: string;
  title: string;
  description: string;
  category: string;
  logoKey: "lck" | "msi" | "worlds";
  season: string;
  predictionType: SeasonPredictionType;
  closeAt: string;
  status: SeasonPredictionQuestionStatus;
  totalEntries: number;
  topOptions: Array<{
    label: string;
    percent: number;
  }>;
  mySelectionLabel: string | null;
  isParticipating: boolean;
  resultLabel: string | null;
}

export interface SeasonPredictionDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  season: string;
  predictionType: SeasonPredictionType;
  openAt: string;
  closeAt: string;
  status: SeasonPredictionQuestionStatus;
  totalEntries: number;
  canSubmit: boolean;
  countdownLabel: string;
  resultLabel: string | null;
  options: SeasonPredictionOptionView[];
  myEntry: SeasonPredictionEntryView | null;
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
  averagePlayerRating: number | null;
  viewerPlayerRatingCount: number;
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
  ratingComments: MatchRatingComment[];
  predictionComments: PredictionComment[];
  commentsList: MatchComment[];
  myPredictionTeam: string | null;
}

export interface HomeMatchData {
  id: string;
  stage: string;
  status: MatchStatus;
  serverNow: string;
  scheduledAt: string;
  teamA: string;
  teamB: string;
  score: string;
  predictionLocked: boolean;
  predictionSummary: PredictionSummary;
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

export interface MatchSummaryItem {
  id: string;
  label: string;
  value: string;
  tone?: "default" | "accent" | "success";
}

export interface MatchDetailData {
  match: MatchData;
  preMatchInsights: PreMatchInsights;
}

export interface TeamRecentForm {
  recent: Array<"W" | "L">;
  streakLabel: string;
}

export interface KeyPlayerInsight {
  playerId: string;
  name: string;
  role: PlayerRole;
  avgRating: number;
  ratingCount: number;
}

export interface PreMatchInsights {
  teamAForm: TeamRecentForm;
  teamBForm: TeamRecentForm;
  h2h: {
    teamAWins: number;
    teamBWins: number;
    totalMatches: number;
  };
  recentHeadToHead: Array<{
    id: string;
    label: string;
    scoreA: number | null;
    scoreB: number | null;
    playedAt: string;
  }>;
  keyPlayers: {
    teamA: KeyPlayerInsight | null;
    teamB: KeyPlayerInsight | null;
  };
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
  playerSlug: string;
  playerName: string;
  teamCode: string;
  averageRating: number;
  ratingCount: number;
}

export interface PlayerRankingItem {
  playerId: string;
  playerSlug: string;
  playerName: string;
  teamCode: string;
  role: PlayerRole;
  seasonLabel: string;
  averageRating: number;
  recentForm: number;
  matchCount: number;
  participationCount: number;
  weightedScore: number;
}

export interface PlayerRankingPageData {
  title: string;
  subtitle: string;
  seasonOptions: string[];
  defaultSeason: string;
  minMatchDefault: number;
  players: PlayerRankingItem[];
}

export interface PlayerRecentMatchRating {
  matchId: string;
  matchLabel: string;
  score: number;
  result: "W" | "L" | "-";
  ratedAt: string;
}

export interface PlayerDetailPageData {
  playerId: string;
  playerSlug: string;
  playerName: string;
  teamCode: string;
  role: PlayerRole;
  averageRating: number;
  recentForm: number;
  matchCount: number;
  participationCount: number;
  recentMatches: PlayerRecentMatchRating[];
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
  seasonPredictionPreview: SeasonPredictionQuestionCard[];
  notifications: NotificationItem[];
  unreadNotificationCount: number;
}

export interface SiteChromeData {
  notifications: NotificationItem[];
  unreadNotificationCount: number;
}

export interface RosterPlayerItem {
  playerId: string;
  playerSlug: string;
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

export interface MySeasonPredictionItem {
  id: string;
  questionId: string;
  title: string;
  category: string;
  season: string;
  selectedOptionLabel: string;
  status: SeasonPredictionQuestionStatus;
  resultLabel: string | null;
  hitStatus: "hit" | "miss" | "pending" | "canceled";
  rewardAmount: number | null;
  submittedAt: string;
  updatedAt: string;
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
  type: "title" | "theme";
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
    selectedProfileTheme: string | null;
  };
  predictions: MyPredictionItem[];
  seasonPredictions: MySeasonPredictionItem[];
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

export interface SeasonPredictionListData {
  items: SeasonPredictionQuestionCard[];
  categories: string[];
  selectedCategory: string;
  selectedStatus: string;
}

export interface AdminSeasonPredictionRow {
  id: string;
  title: string;
  description: string;
  category: string;
  season: string;
  predictionType: SeasonPredictionType;
  status: SeasonPredictionQuestionStatus;
  visibility: "public" | "private";
  openAt: string;
  closeAt: string;
  totalEntries: number;
  options: SeasonPredictionOptionView[];
  resultLabel: string | null;
}

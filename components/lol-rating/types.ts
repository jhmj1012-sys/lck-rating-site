export type MatchStatus = "scheduled" | "finished";
export type PlayerRole = "TOP" | "JGL" | "MID" | "ADC" | "SUP";
export type PredictionBlockReason =
  | "unauthenticated"
  | "profile-required"
  | "locked"
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
  user: string;
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
  predictionSummary: PredictionSummary;
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
  predictionLocked: boolean;
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
  predictionStats: {
    hit: number;
    miss: number;
    streak: number;
  };
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
}

import type { UserProfile, WeekSchedule } from "./types";

// Legacy fallback exports kept for compatibility while the app now reads from the server store.
export const weeklySchedule: WeekSchedule[] = [];

export const userProfileSeed: UserProfile = {
  nickname: "게스트",
  email: "",
  image: null,
  isAuthenticated: false,
  points: 0,
  level: 1,
  ownedPersonas: ["관전자", "기본 프로필"],
  predictionAccuracy: 0,
  predictionStats: { total: 0, hit: 0, miss: 0, streak: 0 },
};

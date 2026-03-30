import type { ChallengeConfig, ChallengePlayer } from "@/lib/games/budget-challenge-types";

export const budgetChallengeConfig: ChallengeConfig = {
  id: "lck-2026-15-dollar",
  title: "15달러 챌린지",
  description: "15달러 안에서 당신의 베스트 5를 완성하세요.",
  budget: 15,
  mode: "position-lock",
  slots: [
    { position: "TOP", requiredCount: 1 },
    { position: "JUNGLE", requiredCount: 1 },
    { position: "MID", requiredCount: 1 },
    { position: "ADC", requiredCount: 1 },
    { position: "SUPPORT", requiredCount: 1 },
  ],
  shareWatermark: "LCK Rating",
};

export const budgetChallengePlayers: ChallengePlayer[] = [
  { id: "zeus", name: "Zeus", shortLabel: "Zeus", team: "HLE", position: "TOP", price: 5, image: "/icons/leagues/lck.webp", active: true, order: 1 },
  { id: "kiin", name: "Kiin", shortLabel: "Kiin", team: "GEN", position: "TOP", price: 4, image: "/icons/leagues/lck.webp", active: true, order: 2 },
  { id: "doran", name: "Doran", shortLabel: "Doran", team: "T1", position: "TOP", price: 3, image: "/icons/leagues/lck.webp", active: true, order: 3 },
  { id: "dudu", name: "DuDu", shortLabel: "DuDu", team: "BRO", position: "TOP", price: 2, image: "/icons/leagues/lck.webp", active: true, order: 4 },

  { id: "canyon", name: "Canyon", shortLabel: "Canyon", team: "GEN", position: "JUNGLE", price: 5, image: "/icons/leagues/lck.webp", active: true, order: 1 },
  { id: "peanut", name: "Peanut", shortLabel: "Peanut", team: "HLE", position: "JUNGLE", price: 4, image: "/icons/leagues/lck.webp", active: true, order: 2 },
  { id: "oner", name: "Oner", shortLabel: "Oner", team: "T1", position: "JUNGLE", price: 3, image: "/icons/leagues/lck.webp", active: true, order: 3 },
  { id: "cuzz", name: "Cuzz", shortLabel: "Cuzz", team: "KT", position: "JUNGLE", price: 2, image: "/icons/leagues/lck.webp", active: true, order: 4 },

  { id: "faker", name: "Faker", shortLabel: "Faker", team: "T1", position: "MID", price: 5, image: "/icons/leagues/lck.webp", active: true, order: 1 },
  { id: "chovy", name: "Chovy", shortLabel: "Chovy", team: "GEN", position: "MID", price: 5, image: "/icons/leagues/lck.webp", active: true, order: 2 },
  { id: "zeka", name: "Zeka", shortLabel: "Zeka", team: "HLE", position: "MID", price: 3, image: "/icons/leagues/lck.webp", active: true, order: 3 },
  { id: "bdd", name: "Bdd", shortLabel: "Bdd", team: "KT", position: "MID", price: 2, image: "/icons/leagues/lck.webp", active: true, order: 4 },

  { id: "viper", name: "Viper", shortLabel: "Viper", team: "HLE", position: "ADC", price: 5, image: "/icons/leagues/lck.webp", active: true, order: 1 },
  { id: "gumayusi", name: "Gumayusi", shortLabel: "Guma", team: "T1", position: "ADC", price: 4, image: "/icons/leagues/lck.webp", active: true, order: 2 },
  { id: "aiming", name: "Aiming", shortLabel: "Aiming", team: "KT", position: "ADC", price: 3, image: "/icons/leagues/lck.webp", active: true, order: 3 },
  { id: "deokdam", name: "deokdam", shortLabel: "deokdam", team: "DK", position: "ADC", price: 2, image: "/icons/leagues/lck.webp", active: true, order: 4 },

  { id: "keria", name: "Keria", shortLabel: "Keria", team: "T1", position: "SUPPORT", price: 5, image: "/icons/leagues/lck.webp", active: true, order: 1 },
  { id: "delight", name: "Delight", shortLabel: "Delight", team: "HLE", position: "SUPPORT", price: 4, image: "/icons/leagues/lck.webp", active: true, order: 2 },
  { id: "lehends", name: "Lehends", shortLabel: "Lehends", team: "DK", position: "SUPPORT", price: 3, image: "/icons/leagues/lck.webp", active: true, order: 3 },
  { id: "duro", name: "Duro", shortLabel: "Duro", team: "GEN", position: "SUPPORT", price: 2, image: "/icons/leagues/lck.webp", active: true, order: 4 },
];

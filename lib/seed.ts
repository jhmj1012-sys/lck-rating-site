import type {
  PlayerRole,
  StoreShape,
  StoredComment,
  StoredMatch,
  StoredMatchParticipant,
  StoredMatchSet,
  StoredNotification,
  StoredPlayer,
  StoredPointLedgerEntry,
  StoredPrediction,
  StoredProfileStoreItem,
  StoredSetParticipant,
  StoredSetPlayerRating,
  StoredTeam,
  StoredTeamRosterEntry,
  StoredUser,
  StoredUserInventoryItem,
} from "@/lib/domain";

type SeedRosterPlayer = { name: string; role: PlayerRole; isMainRoster?: boolean };
type SeedRoster = Record<string, SeedRosterPlayer[]>;

const OFFICIAL_ROSTER_SOURCE = "https://lolesports.com/ko-KR/news/2026-r1-roster";
const OFFICIAL_ROSTER_UPDATED_AT = "2026-03-26T09:00:00+09:00";
const OFFICIAL_SCHEDULE_UPDATED_AT = "2026-03-27T10:00:00+09:00";
const DEMO_NOW_ISO = "2026-04-16T12:00:00+09:00";
const DEMO_NOW_MS = new Date(DEMO_NOW_ISO).getTime();
const rosterByTeam: SeedRoster = {
  T1: [
    { name: "Doran", role: "TOP" },
    { name: "Oner", role: "JGL" },
    { name: "Faker", role: "MID" },
    { name: "Peyz", role: "ADC" },
    { name: "Keria", role: "SUP" },
  ],
  GEN: [
    { name: "Kiin", role: "TOP" },
    { name: "Canyon", role: "JGL" },
    { name: "Chovy", role: "MID" },
    { name: "Ruler", role: "ADC" },
    { name: "Duro", role: "SUP" },
  ],
  HLE: [
    { name: "Zeus", role: "TOP" },
    { name: "Kanavi", role: "JGL" },
    { name: "Zeka", role: "MID" },
    { name: "Gumayusi", role: "ADC" },
    { name: "Delight", role: "SUP" },
  ],
  DK: [
    { name: "Siwoo", role: "TOP" },
    { name: "Lucid", role: "JGL" },
    { name: "ShowMaker", role: "MID" },
    { name: "Smash", role: "ADC" },
    { name: "Career", role: "SUP" },
  ],
  KT: [
    { name: "PerfecT", role: "TOP" },
    { name: "Cuzz", role: "JGL" },
    { name: "Bdd", role: "MID" },
    { name: "Aiming", role: "ADC" },
    { name: "Pollu", role: "SUP" },
  ],
  KRX: [
    { name: "Rich", role: "TOP" },
    { name: "Willer", role: "JGL" },
    { name: "ucal", role: "MID" },
    { name: "Jiwoo", role: "ADC" },
    { name: "Andil", role: "SUP" },
  ],
  NS: [
    { name: "Kingen", role: "TOP" },
    { name: "Willer", role: "JGL" },
    { name: "Scout", role: "MID" },
    { name: "Taeyoon", role: "ADC" },
    { name: "Lehends", role: "SUP" },
  ],
  BRO: [
    { name: "Casting", role: "TOP" },
    { name: "GIDEON", role: "JGL" },
    { name: "Fisher", role: "MID" },
    { name: "Teddy", role: "ADC" },
    { name: "Namgung", role: "SUP" },
  ],
  BFX: [
    { name: "Clear", role: "TOP" },
    { name: "Raptor", role: "JGL" },
    { name: "VicLa", role: "MID" },
    { name: "Diable", role: "ADC" },
    { name: "Kellin", role: "SUP" },
  ],
  DNS: [
    { name: "DuDu", role: "TOP" },
    { name: "Pyosik", role: "JGL" },
    { name: "Clozer", role: "MID" },
    { name: "deokdam", role: "ADC" },
    { name: "Life", role: "SUP" },
  ],
};

const teams: StoredTeam[] = [
  { id: "team_t1", code: "T1", name: "T1", shortName: "T1" },
  { id: "team_gen", code: "GEN", name: "Gen.G", shortName: "GEN" },
  { id: "team_hle", code: "HLE", name: "Hanwha Life Esports", shortName: "HLE" },
  { id: "team_dk", code: "DK", name: "Dplus KIA", shortName: "DK" },
  { id: "team_kt", code: "KT", name: "kt Rolster", shortName: "KT" },
  { id: "team_drx", code: "KRX", name: "KRX", shortName: "KRX" },
  { id: "team_ns", code: "NS", name: "Nongshim RedForce", shortName: "NS" },
  { id: "team_bro", code: "BRO", name: "OKSavingsBank BRION", shortName: "BRO" },
  { id: "team_bfx", code: "BFX", name: "BNK FEARX", shortName: "BFX" },
  { id: "team_dns", code: "DNS", name: "DN FREECS", shortName: "DNS" },
  { id: "team_tbd", code: "TBD", name: "TBD", shortName: "TBD" },
];

const seedMatches = [
  { id: "match_1", scheduledAt: "2026-04-01T17:00:00+09:00", teamA: "HLE", teamB: "BRO", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_2", scheduledAt: "2026-04-01T19:00:00+09:00", teamA: "T1", teamB: "KT", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_3", scheduledAt: "2026-04-02T17:00:00+09:00", teamA: "DK", teamB: "NS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_4", scheduledAt: "2026-04-02T19:00:00+09:00", teamA: "DRX", teamB: "DNS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_5", scheduledAt: "2026-04-03T17:00:00+09:00", teamA: "GEN", teamB: "KT", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_6", scheduledAt: "2026-04-03T19:00:00+09:00", teamA: "BFX", teamB: "BRO", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_7", scheduledAt: "2026-04-04T17:00:00+09:00", teamA: "T1", teamB: "HLE", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_8", scheduledAt: "2026-04-04T19:00:00+09:00", teamA: "DRX", teamB: "DK", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_9", scheduledAt: "2026-04-05T17:00:00+09:00", teamA: "NS", teamB: "DNS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_10", scheduledAt: "2026-04-05T19:00:00+09:00", teamA: "GEN", teamB: "BFX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_11", scheduledAt: "2026-04-08T17:00:00+09:00", teamA: "DK", teamB: "HLE", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_12", scheduledAt: "2026-04-08T19:00:00+09:00", teamA: "T1", teamB: "GEN", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_13", scheduledAt: "2026-04-09T17:00:00+09:00", teamA: "BRO", teamB: "DRX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_14", scheduledAt: "2026-04-09T19:00:00+09:00", teamA: "KT", teamB: "NS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_15", scheduledAt: "2026-04-10T17:00:00+09:00", teamA: "DNS", teamB: "T1", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_16", scheduledAt: "2026-04-10T19:00:00+09:00", teamA: "HLE", teamB: "BFX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_17", scheduledAt: "2026-04-11T15:00:00+09:00", teamA: "NS", teamB: "DRX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_18", scheduledAt: "2026-04-11T17:00:00+09:00", teamA: "DK", teamB: "GEN", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_19", scheduledAt: "2026-04-12T15:00:00+09:00", teamA: "BFX", teamB: "DNS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_20", scheduledAt: "2026-04-12T17:00:00+09:00", teamA: "BRO", teamB: "KT", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_21", scheduledAt: "2026-04-15T17:00:00+09:00", teamA: "NS", teamB: "BFX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_22", scheduledAt: "2026-04-15T19:00:00+09:00", teamA: "KT", teamB: "DK", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_23", scheduledAt: "2026-04-16T17:00:00+09:00", teamA: "BRO", teamB: "GEN", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_24", scheduledAt: "2026-04-16T19:00:00+09:00", teamA: "DNS", teamB: "HLE", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_25", scheduledAt: "2026-04-17T17:00:00+09:00", teamA: "DRX", teamB: "BFX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_26", scheduledAt: "2026-04-17T19:00:00+09:00", teamA: "DK", teamB: "T1", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_27", scheduledAt: "2026-04-18T15:00:00+09:00", teamA: "HLE", teamB: "GEN", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_28", scheduledAt: "2026-04-18T17:00:00+09:00", teamA: "DNS", teamB: "KT", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_29", scheduledAt: "2026-04-19T15:00:00+09:00", teamA: "BRO", teamB: "NS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_30", scheduledAt: "2026-04-19T17:00:00+09:00", teamA: "DRX", teamB: "T1", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_31", scheduledAt: "2026-04-22T17:00:00+09:00", teamA: "KT", teamB: "DRX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_32", scheduledAt: "2026-04-22T19:00:00+09:00", teamA: "HLE", teamB: "NS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_33", scheduledAt: "2026-04-23T17:00:00+09:00", teamA: "BRO", teamB: "DK", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_34", scheduledAt: "2026-04-23T19:00:00+09:00", teamA: "GEN", teamB: "DNS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_35", scheduledAt: "2026-04-24T17:00:00+09:00", teamA: "BFX", teamB: "KT", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_36", scheduledAt: "2026-04-24T19:00:00+09:00", teamA: "HLE", teamB: "DRX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_37", scheduledAt: "2026-04-25T15:00:00+09:00", teamA: "T1", teamB: "BRO", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_38", scheduledAt: "2026-04-25T17:00:00+09:00", teamA: "DK", teamB: "DNS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_39", scheduledAt: "2026-04-26T15:00:00+09:00", teamA: "T1", teamB: "BFX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_40", scheduledAt: "2026-04-26T17:00:00+09:00", teamA: "NS", teamB: "GEN", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_41", scheduledAt: "2026-04-29T17:00:00+09:00", teamA: "NS", teamB: "T1", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_42", scheduledAt: "2026-04-29T19:00:00+09:00", teamA: "KT", teamB: "HLE", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_43", scheduledAt: "2026-04-30T17:00:00+09:00", teamA: "GEN", teamB: "DRX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_44", scheduledAt: "2026-04-30T19:00:00+09:00", teamA: "BFX", teamB: "DK", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_45", scheduledAt: "2026-05-01T17:00:00+09:00", teamA: "DNS", teamB: "BRO", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 1R" },
  { id: "match_46", scheduledAt: "2026-05-01T19:00:00+09:00", teamA: "HLE", teamB: "T1", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_47", scheduledAt: "2026-05-02T15:00:00+09:00", teamA: "GEN", teamB: "DK", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_48", scheduledAt: "2026-05-02T17:00:00+09:00", teamA: "DRX", teamB: "NS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_49", scheduledAt: "2026-05-03T15:00:00+09:00", teamA: "KT", teamB: "BRO", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_50", scheduledAt: "2026-05-03T17:00:00+09:00", teamA: "DNS", teamB: "BFX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_51", scheduledAt: "2026-05-06T17:00:00+09:00", teamA: "GEN", teamB: "NS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_52", scheduledAt: "2026-05-06T19:00:00+09:00", teamA: "HLE", teamB: "DNS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_53", scheduledAt: "2026-05-07T17:00:00+09:00", teamA: "DK", teamB: "KT", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_54", scheduledAt: "2026-05-07T19:00:00+09:00", teamA: "BRO", teamB: "BFX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_55", scheduledAt: "2026-05-08T17:00:00+09:00", teamA: "T1", teamB: "DNS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_56", scheduledAt: "2026-05-08T19:00:00+09:00", teamA: "DRX", teamB: "GEN", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_57", scheduledAt: "2026-05-09T15:00:00+09:00", teamA: "KT", teamB: "BFX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_58", scheduledAt: "2026-05-09T17:00:00+09:00", teamA: "NS", teamB: "BRO", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_59", scheduledAt: "2026-05-10T15:00:00+09:00", teamA: "T1", teamB: "DK", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_60", scheduledAt: "2026-05-10T17:00:00+09:00", teamA: "DRX", teamB: "HLE", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_61", scheduledAt: "2026-05-13T17:00:00+09:00", teamA: "T1", teamB: "NS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_62", scheduledAt: "2026-05-13T19:00:00+09:00", teamA: "DNS", teamB: "DK", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_63", scheduledAt: "2026-05-14T17:00:00+09:00", teamA: "BFX", teamB: "GEN", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_64", scheduledAt: "2026-05-14T19:00:00+09:00", teamA: "DRX", teamB: "KT", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_65", scheduledAt: "2026-05-15T17:00:00+09:00", teamA: "HLE", teamB: "DK", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_66", scheduledAt: "2026-05-15T19:00:00+09:00", teamA: "BRO", teamB: "DNS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_67", scheduledAt: "2026-05-16T15:00:00+09:00", teamA: "GEN", teamB: "T1", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_68", scheduledAt: "2026-05-16T17:00:00+09:00", teamA: "BFX", teamB: "NS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_69", scheduledAt: "2026-05-17T15:00:00+09:00", teamA: "HLE", teamB: "KT", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_70", scheduledAt: "2026-05-17T17:00:00+09:00", teamA: "DRX", teamB: "BRO", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_71", scheduledAt: "2026-05-20T17:00:00+09:00", teamA: "T1", teamB: "DRX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_72", scheduledAt: "2026-05-20T19:00:00+09:00", teamA: "NS", teamB: "KT", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_73", scheduledAt: "2026-05-21T17:00:00+09:00", teamA: "BFX", teamB: "HLE", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_74", scheduledAt: "2026-05-21T19:00:00+09:00", teamA: "DK", teamB: "BRO", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_75", scheduledAt: "2026-05-22T17:00:00+09:00", teamA: "DNS", teamB: "DRX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_76", scheduledAt: "2026-05-22T19:00:00+09:00", teamA: "KT", teamB: "GEN", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_77", scheduledAt: "2026-05-23T15:00:00+09:00", teamA: "DK", teamB: "BFX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_78", scheduledAt: "2026-05-23T17:00:00+09:00", teamA: "NS", teamB: "HLE", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_79", scheduledAt: "2026-05-24T15:00:00+09:00", teamA: "DNS", teamB: "GEN", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_80", scheduledAt: "2026-05-24T17:00:00+09:00", teamA: "BRO", teamB: "T1", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_81", scheduledAt: "2026-05-27T17:00:00+09:00", teamA: "GEN", teamB: "HLE", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_82", scheduledAt: "2026-05-27T19:00:00+09:00", teamA: "BFX", teamB: "DRX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_83", scheduledAt: "2026-05-28T17:00:00+09:00", teamA: "DNS", teamB: "NS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_84", scheduledAt: "2026-05-28T19:00:00+09:00", teamA: "KT", teamB: "T1", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_85", scheduledAt: "2026-05-29T17:00:00+09:00", teamA: "DK", teamB: "DRX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_86", scheduledAt: "2026-05-29T19:00:00+09:00", teamA: "GEN", teamB: "BRO", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_87", scheduledAt: "2026-05-30T15:00:00+09:00", teamA: "KT", teamB: "DNS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_88", scheduledAt: "2026-05-30T17:00:00+09:00", teamA: "BFX", teamB: "T1", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_89", scheduledAt: "2026-05-31T15:00:00+09:00", teamA: "BRO", teamB: "HLE", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_90", scheduledAt: "2026-05-31T17:00:00+09:00", teamA: "NS", teamB: "DK", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "占쏙옙占쌉쏙옙占쏙옙 2R" },
  { id: "match_91", scheduledAt: "2026-06-06T17:00:00+09:00", teamA: "TBD", teamB: "TBD", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "Road to MSI 1R" },
  { id: "match_92", scheduledAt: "2026-06-07T17:00:00+09:00", teamA: "TBD", teamB: "TBD", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "Road to MSI 2R" },
  { id: "match_93", scheduledAt: "2026-06-12T17:00:00+09:00", teamA: "TBD", teamB: "TBD", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "Road to MSI 3R" },
  { id: "match_94", scheduledAt: "2026-06-13T17:00:00+09:00", teamA: "TBD", teamB: "TBD", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "Road to MSI 4R" },
  { id: "match_95", scheduledAt: "2026-06-14T17:00:00+09:00", teamA: "TBD", teamB: "TBD", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "Road to MSI 占쏙옙占쏙옙占쏙옙" },
] as const;

const seedStoreItems: StoredProfileStoreItem[] = [
  { id: "store_badge_lck", type: "badge", label: "LCK 占싻쇽옙占쏙옙", description: "占쏙옙占쏙옙占십울옙 LCK 占싻쇽옙占쏙옙 占쏙옙占쏙옙占쏙옙 占싸울옙占쌌니댐옙.", price: 120, previewValue: "LCK 占싻쇽옙占쏙옙" },
  { id: "store_badge_hot", type: "badge", label: "占쏙옙클占쏙옙", description: "占싸깍옙 占쏙옙占쏙옙占쏙옙 占쏙옙占쏙옙 占쏙옙占쏙옙占쏙옙 占쏙옙占쏙옙占쌉니댐옙.", price: 180, previewValue: "占쏙옙클占쏙옙" },
  { id: "store_title_shotcaller", type: "title", label: "Shotcaller", description: "占쏙옙占쏙옙占쏙옙 占쏙옙扇?占쏙옙占쏙옙占쏙옙 칭호占쏙옙 占쏙옙占쌉니댐옙.", price: 160, previewValue: "Shotcaller" },
  { id: "store_theme_crimson", type: "theme", label: "Crimson Stage", description: "占쏙옙占쏙옙占쏙옙 카占썲에 占쏙옙占쏙옙 占쏙옙占쏙옙 占쏙옙占쏙옙 占쏙옙占쏙옙占쌌니댐옙.", price: 220, previewValue: "crimson-stage" },
  { id: "store_theme_sky", type: "theme", label: "Sky Draft", description: "占쏙옙占쏙옙占쏙옙 카占썲에 占시울옙占쏙옙 占쏙옙占?占쏙옙占쏙옙 占쏙옙占쏙옙占쌌니댐옙.", price: 220, previewValue: "sky-draft" },
];

function normalizeTeamCode(code: string) {
  return code === "DRX" ? "KRX" : code;
}

function getTeamId(code: string) {
  const normalized = normalizeTeamCode(code);
  const team = teams.find((item) => item.code === normalized);
  if (!team) {
    throw new Error(`Missing team for code ${code}`);
  }

  return team.id;
}

function createPlayers(): StoredPlayer[] {
  return teams.flatMap((team) =>
    (rosterByTeam[team.code] ?? []).map((player, index) => ({
      id: `player_${team.code.toLowerCase()}_${index + 1}`,
      teamId: team.id,
      name: player.name,
      role: player.role,
    })),
  );
}

function createTeamRosterEntries(players: StoredPlayer[]): StoredTeamRosterEntry[] {
  return teams.flatMap((team) => {
    const roster = rosterByTeam[team.code] ?? [];
    return roster.map((player, index) => {
      const storedPlayer = players.find((candidate) => candidate.teamId === team.id && candidate.name === player.name);
      if (!storedPlayer) {
        throw new Error(`Missing player for roster entry ${team.code} ${player.name}`);
      }

      return {
        id: `roster_${team.code.toLowerCase()}_${index + 1}`,
        teamId: team.id,
        playerId: storedPlayer.id,
        season: "2026",
        phase: "R1",
        isMainRoster: player.isMainRoster ?? true,
        displayOrder: index + 1,
        sourceUrl: OFFICIAL_ROSTER_SOURCE,
        isManualOverride: false,
        updatedAt: OFFICIAL_ROSTER_UPDATED_AT,
      } satisfies StoredTeamRosterEntry;
    });
  });
}

function hashToUnit(seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function createGeneratedResult(matchId: string) {
  const winnerRoll = hashToUnit(`${matchId}:winner`);
  const scoreRoll = hashToUnit(`${matchId}:score`);
  const teamAWin = winnerRoll >= 0.5;
  const loserScore = scoreRoll > 0.82 ? 1 : 0;
  return {
    scoreA: teamAWin ? 2 : loserScore,
    scoreB: teamAWin ? loserScore : 2,
  };
}

function getBestOfForStage(stage: string) {
  return stage.startsWith("Road to MSI") ? 5 : 3;
}

function createPlayedSetWinners(match: StoredMatch) {
  if (match.scoreA === null || match.scoreB === null) {
    return [] as Array<"A" | "B">;
  }

  const winnerSide = match.scoreA > match.scoreB ? "A" : "B";
  const loserSide = winnerSide === "A" ? "B" : "A";
  let remainingWinnerWins = Math.max(match.scoreA, match.scoreB) - 1;
  let remainingLoserWins = Math.min(match.scoreA, match.scoreB);
  const winners: Array<"A" | "B"> = [];
  const prefixCount = Math.max(0, match.scoreA + match.scoreB - 1);

  for (let index = 0; index < prefixCount; index += 1) {
    if (remainingWinnerWins === 0) {
      winners.push(loserSide);
      remainingLoserWins -= 1;
      continue;
    }
    if (remainingLoserWins === 0) {
      winners.push(winnerSide);
      remainingWinnerWins -= 1;
      continue;
    }

    const side = hashToUnit(`${match.id}:set-winner:${index + 1}`) >= 0.5 ? winnerSide : loserSide;
    winners.push(side);
    if (side === winnerSide) {
      remainingWinnerWins -= 1;
    } else {
      remainingLoserWins -= 1;
    }
  }

  winners.push(winnerSide);
  return winners;
}

function getNormalizedStage(matchId: string) {
  const number = Number(matchId.replace("match_", ""));
  if (number >= 1 && number <= 45) {
    return "\uC815\uADDC\uC2DC\uC98C 1R";
  }
  if (number >= 46 && number <= 90) {
    return "\uC815\uADDC\uC2DC\uC98C 2R";
  }

  const roadToMsiStage: Record<number, string> = {
    91: "Road to MSI 1R",
    92: "Road to MSI 2R",
    93: "Road to MSI 3R",
    94: "Road to MSI 4R",
    95: "Road to MSI \uCD5C\uC885\uC804",
  };
  return roadToMsiStage[number] ?? "LCK 2026";
}

function createMatches(): StoredMatch[] {
  return seedMatches.map((match) => {
    const isFinished = new Date(match.scheduledAt).getTime() < DEMO_NOW_MS;
    const generated = createGeneratedResult(match.id);

    return {
      id: match.id,
      league: "LCK 2026",
      stage: getNormalizedStage(match.id),
      patch: match.patch,
      status: isFinished ? "finished" : match.status,
      scheduledAt: match.scheduledAt,
      teamAId: getTeamId(match.teamA),
      teamBId: getTeamId(match.teamB),
      scoreA: isFinished ? generated.scoreA : match.scoreA,
      scoreB: isFinished ? generated.scoreB : match.scoreB,
      predictionLocked: isFinished,
      predictionLockedAt: null,
      lockedDistribution: null,
      lockedOdds: null,
      predictionSettledAt: null,
      createdAt: OFFICIAL_SCHEDULE_UPDATED_AT,
      updatedAt: OFFICIAL_SCHEDULE_UPDATED_AT,
    };
  });
}

function createMatchParticipants(players: StoredPlayer[], matches: StoredMatch[]): StoredMatchParticipant[] {
  return matches.flatMap((match) =>
    players
      .filter((player) => player.teamId === match.teamAId || player.teamId === match.teamBId)
      .map((player) => ({
        id: `participant_${match.id}_${player.id}`,
        matchId: match.id,
        playerId: player.id,
        teamId: player.teamId,
      })),
  );
}

function createMatchSets(matches: StoredMatch[]): StoredMatchSet[] {
  return matches.flatMap((match) => {
    const bestOf = getBestOfForStage(match.stage);
    const playedSetWinners = match.status === "finished" ? createPlayedSetWinners(match) : [];

    return Array.from({ length: bestOf }, (_, index) => {
      const setNumber = index + 1;
      const playedWinner = playedSetWinners[index];
      const isPlayed = Boolean(playedWinner);

      return {
        id: `set_${match.id}_${setNumber}`,
        matchId: match.id,
        setNumber,
        winnerTeamId: playedWinner === "A" ? match.teamAId : playedWinner === "B" ? match.teamBId : null,
        durationMinutes: isPlayed ? 28 + Math.floor(hashToUnit(`${match.id}:duration:${setNumber}`) * 16) : null,
        teamAScore: playedWinner === "A" ? 1 : 0,
        teamBScore: playedWinner === "B" ? 1 : 0,
        note: isPlayed ? `Set ${setNumber} completed.` : "\uBBF8\uC9C4\uD589",
        createdAt: OFFICIAL_SCHEDULE_UPDATED_AT,
        updatedAt: OFFICIAL_SCHEDULE_UPDATED_AT,
      } satisfies StoredMatchSet;
    });
  });
}

function createSetParticipants(matchSets: StoredMatchSet[], matchParticipants: StoredMatchParticipant[]): StoredSetParticipant[] {
  return matchSets.flatMap((set) =>
    matchParticipants
      .filter((participant) => participant.matchId === set.matchId)
      .map((participant) => ({
        id: `set_participant_${set.id}_${participant.playerId}`,
        matchSetId: set.id,
        playerId: participant.playerId,
        teamId: participant.teamId,
      })),
  );
}

const seedUserProfiles = [
  { suffix: "analyst", name: "Lee Analyst", nickname: "MacroAnalyst", bio: "Tracks macro tempo and objective setups.", role: "user" as const },
  { suffix: "editor", name: "Park Editor", nickname: "SetEditor", bio: "Summarizes set flow and player impact.", role: "admin" as const },
  { suffix: "alpha", name: "Kim Alpha", nickname: "AlphaJGL", bio: "Focuses on early jungle routes.", role: "user" as const },
  { suffix: "beta", name: "Choi Beta", nickname: "LanePhase", bio: "Watches laning details closely.", role: "user" as const },
  { suffix: "gamma", name: "Jung Gamma", nickname: "FightCaller", bio: "Reviews teamfight planning.", role: "user" as const },
  { suffix: "delta", name: "Yoon Delta", nickname: "PatchScout", bio: "Checks fast adaptation to patch changes.", role: "user" as const },
  { suffix: "epsilon", name: "Han Epsilon", nickname: "FavPick", bio: "Leans toward safer favorites.", role: "user" as const },
  { suffix: "zeta", name: "Kang Zeta", nickname: "UnderdogRun", bio: "Looks for upset angles.", role: "user" as const },
  { suffix: "eta", name: "Shin Eta", nickname: "SkirmishLog", bio: "Keeps skirmish timing notes.", role: "user" as const },
  { suffix: "theta", name: "Song Theta", nickname: "DraftMemo", bio: "Collects draft matchup notes.", role: "user" as const },
  { suffix: "iota", name: "Oh Iota", nickname: "TopLaneOnly", bio: "Mostly comments on top lane states.", role: "user" as const },
  { suffix: "kappa", name: "Seo Kappa", nickname: "MidReview", bio: "Tracks mid lane priority transitions.", role: "user" as const },
  { suffix: "lambda", name: "Jang Lambda", nickname: "WaveControl", bio: "Observes bot wave management.", role: "user" as const },
  { suffix: "mu", name: "Cho Mu", nickname: "FightRecap", bio: "Writes short fight recaps.", role: "user" as const },
  { suffix: "nu", name: "Lim Nu", nickname: "VisionCheck", bio: "Focuses on vision and positioning.", role: "user" as const },
  { suffix: "xi", name: "Hwang Xi", nickname: "DrakeTimer", bio: "Tracks objective timers.", role: "user" as const },
  { suffix: "omicron", name: "Koo Omicron", nickname: "LateGame", bio: "Prefers late-game evaluations.", role: "user" as const },
  { suffix: "pi", name: "Ahn Pi", nickname: "SnowballPath", bio: "Looks at snowball conversion routes.", role: "user" as const },
] as const;

function createUsers(): StoredUser[] {
  return seedUserProfiles.map((profile) => ({
    id: `user_seed_${profile.suffix}`,
    email: `${profile.suffix}@example.com`,
    name: profile.name,
    nickname: profile.nickname,
    nicknameOnboardingSeen: false,
    nicknameUpdatedAt: DEMO_NOW_ISO,
    bio: profile.bio,
    image: null,
    role: profile.role,
    selectedBadge: null,
    selectedProfileTheme: null,
    createdAt: DEMO_NOW_ISO,
    updatedAt: DEMO_NOW_ISO,
  }));
}

function createPredictions(users: StoredUser[], matches: StoredMatch[]): StoredPrediction[] {
  const predictions: StoredPrediction[] = [];
  let index = 1;

  for (const match of matches) {
    if (match.teamAId === getTeamId("TBD") || match.teamBId === getTeamId("TBD")) {
      continue;
    }

    for (const user of users) {
      const chance = hashToUnit(`${user.id}:${match.id}:enter`);
      if (chance < 0.42) {
        continue;
      }

      const pick = hashToUnit(`${user.id}:${match.id}:pick`) >= 0.5 ? match.teamAId : match.teamBId;
      const scheduledMs = new Date(match.scheduledAt).getTime();
      const beforeHours = 4 + Math.floor(hashToUnit(`${user.id}:${match.id}:hours`) * 72);
      const createdMs = Math.min(scheduledMs - beforeHours * 60 * 60 * 1000, DEMO_NOW_MS - 10 * 60 * 1000);
      const createdAt = new Date(createdMs).toISOString();

      predictions.push({
        id: `prediction_${index}`,
        userId: user.id,
        matchId: match.id,
        teamId: pick,
        createdAt,
        updatedAt: createdAt,
        joinedRewardGrantedAt: createdAt,
        settledAt: null,
        settlementResult: null,
        settlementCoins: 0,
        appliedOddsPercent: null,
        wasUnderdogPick: null,
      });
      index += 1;
    }
  }

  return predictions;
}

function createComments(users: StoredUser[], matches: StoredMatch[]): StoredComment[] {
  const templates = [
    "Clean early pathing so this matchup looks interesting.",
    "Draft suggests late teamfights will decide this one.",
    "Lane priority looks like the key factor today.",
    "Objective timing should swing the game heavily.",
    "Underdog angle is actually playable this time.",
    "Favorite side is clear but bot lane is still volatile.",
    "Feels like a full three-game series.",
    "Mid-game setup around vision will matter most.",
    "Top matchup impact is bigger than people expect.",
    "Whichever mid secures push first should control pace.",
  ] as const;

  const comments: StoredComment[] = [];
  let index = 1;
  const activeMatches = matches.filter((match) => match.teamAId !== getTeamId("TBD") && match.teamBId !== getTeamId("TBD"));

  for (const match of activeMatches) {
    const baseCount = match.status === "finished" ? 3 : 1;
    const extra = Math.floor(hashToUnit(`${match.id}:commentCount`) * (match.status === "finished" ? 6 : 3));
    const total = baseCount + extra;

    for (let i = 0; i < total; i += 1) {
      const user = users[Math.floor(hashToUnit(`${match.id}:user:${i}`) * users.length)] ?? users[0];
      const text = templates[Math.floor(hashToUnit(`${match.id}:text:${i}`) * templates.length)] ?? templates[0];
      const scheduledMs = new Date(match.scheduledAt).getTime();
      const offsetMinutes = match.status === "finished"
        ? 20 + Math.floor(hashToUnit(`${match.id}:offset:${i}`) * 420)
        : -180 + Math.floor(hashToUnit(`${match.id}:offset:${i}`) * 140);
      const createdMs = Math.min(scheduledMs + offsetMinutes * 60 * 1000, DEMO_NOW_MS - 5 * 60 * 1000);
      const createdAt = new Date(createdMs).toISOString();

      comments.push({
        id: `comment_${index}`,
        userId: user.id,
        matchId: match.id,
        text,
        hidden: false,
        createdAt,
        updatedAt: createdAt,
      });
      index += 1;
    }
  }

  return comments;
}

function createSetPlayerRatings(
  users: StoredUser[],
  matchSets: StoredMatchSet[],
  setParticipants: StoredSetParticipant[],
): StoredSetPlayerRating[] {
  const ratings: StoredSetPlayerRating[] = [];
  let index = 1;

  for (const set of matchSets) {
    if (set.winnerTeamId === null) {
      continue;
    }

    const participants = setParticipants.filter((participant) => participant.matchSetId === set.id);
    const raters = users.filter((user) => hashToUnit(`${set.id}:${user.id}:rate`) >= 0.62).slice(0, 4);

    for (const user of raters) {
      for (const participant of participants) {
        const wonSet = participant.teamId === set.winnerTeamId;
        const baseScore = wonSet ? 6.8 : 5.8;
        const variance = hashToUnit(`${set.id}:${user.id}:${participant.playerId}:score`) * 2.2;
        const score = Number(Math.min(9.8, Math.max(4.2, baseScore + variance)).toFixed(1));
        const createdAt = new Date(
          Math.min(
            new Date(set.updatedAt).getTime() + (index % 7) * 60 * 1000,
            DEMO_NOW_MS - 60 * 1000,
          ),
        ).toISOString();

        ratings.push({
          id: `set_rating_${index}`,
          userId: user.id,
          matchSetId: set.id,
          playerId: participant.playerId,
          score,
          comment: wonSet ? "Stable teamfight impact." : "Needed cleaner execution.",
          createdAt,
          updatedAt: createdAt,
        });
        index += 1;
      }
    }
  }

  return ratings;
}

function createPointLedger(): StoredPointLedgerEntry[] {
  const now = new Date().toISOString();
  return [
    {
      id: "ledger_1",
      userId: "user_seed_analyst",
      type: "earn",
      amount: 380,
      reason: "占시듸옙 활占쏙옙 占쏙옙占쏙옙트 占싱곤옙",
      referenceType: "migration",
      referenceId: "user_seed_analyst",
      createdAt: now,
      balanceAfter: 380,
    },
    {
      id: "ledger_2",
      userId: "user_seed_editor",
      type: "earn",
      amount: 420,
      reason: "占시듸옙 활占쏙옙 占쏙옙占쏙옙트 占싱곤옙",
      referenceType: "migration",
      referenceId: "user_seed_editor",
      createdAt: now,
      balanceAfter: 420,
    },
    {
      id: "ledger_3",
      userId: "user_seed_analyst",
      type: "spend",
      amount: 120,
      reason: "LCK 占싻쇽옙占쏙옙 占쏙옙占쏙옙 占쏙옙占쏙옙",
      referenceType: "store_purchase",
      referenceId: "store_badge_lck",
      createdAt: now,
      balanceAfter: 260,
    },
    {
      id: "ledger_4",
      userId: "user_seed_analyst",
      type: "spend",
      amount: 220,
      reason: "Sky Draft 占쌓몌옙 占쏙옙占쏙옙",
      referenceType: "store_purchase",
      referenceId: "store_theme_sky",
      createdAt: now,
      balanceAfter: 40,
    },
    {
      id: "ledger_5",
      userId: "user_seed_editor",
      type: "spend",
      amount: 180,
      reason: "占쏙옙클占쏙옙 占쏙옙占쏙옙 占쏙옙占쏙옙",
      referenceType: "store_purchase",
      referenceId: "store_badge_hot",
      createdAt: now,
      balanceAfter: 240,
    },
    {
      id: "ledger_6",
      userId: "user_seed_editor",
      type: "spend",
      amount: 220,
      reason: "Crimson Stage 占쌓몌옙 占쏙옙占쏙옙",
      referenceType: "store_purchase",
      referenceId: "store_theme_crimson",
      createdAt: now,
      balanceAfter: 20,
    },
  ];
}

function createInventory(): StoredUserInventoryItem[] {
  const now = DEMO_NOW_ISO;
  return [
    { id: "inventory_1", userId: "user_seed_analyst", storeItemId: "store_badge_lck", equipped: true, acquiredAt: now },
    { id: "inventory_2", userId: "user_seed_analyst", storeItemId: "store_theme_sky", equipped: true, acquiredAt: now },
    { id: "inventory_3", userId: "user_seed_editor", storeItemId: "store_badge_hot", equipped: true, acquiredAt: now },
    { id: "inventory_4", userId: "user_seed_editor", storeItemId: "store_theme_crimson", equipped: true, acquiredAt: now },
  ];
}

function createNotifications(): StoredNotification[] {
  return [];
}

export function createSeedStore(): StoreShape {
  const users = createUsers();
  const players = createPlayers();
  const teamRosterEntries = createTeamRosterEntries(players);
  const matches = createMatches();
  const matchParticipants = createMatchParticipants(players, matches);
  const matchSets = createMatchSets(matches);
  const setParticipants = createSetParticipants(matchSets, matchParticipants);
  const predictions = createPredictions(users, matches);
  const setPlayerRatings = createSetPlayerRatings(users, matchSets, setParticipants);
  const comments = createComments(users, matches);
  const pointLedger = createPointLedger();
  const notifications = createNotifications();
  const profileStoreItems = seedStoreItems;
  const userInventory = createInventory();

  return {
    users,
    teams,
    players,
    teamRosterEntries,
    matches,
    matchParticipants,
    matchSets,
    setParticipants,
    predictions,
    playerRatings: [],
    setPlayerRatings,
    comments,
    pointLedger,
    notifications,
    profileStoreItems,
    userInventory,
    nextIds: {
      users: users.length + 1,
      teams: teams.length + 1,
      players: players.length + 1,
      teamRosterEntries: teamRosterEntries.length + 1,
      matches: matches.length + 1,
      matchParticipants: matchParticipants.length + 1,
      matchSets: matchSets.length + 1,
      setParticipants: setParticipants.length + 1,
      predictions: predictions.length + 1,
      playerRatings: 1,
      setPlayerRatings: setPlayerRatings.length + 1,
      comments: comments.length + 1,
      pointLedger: pointLedger.length + 1,
      notifications: notifications.length + 1,
      profileStoreItems: profileStoreItems.length + 1,
      userInventory: userInventory.length + 1,
    },
  };
}



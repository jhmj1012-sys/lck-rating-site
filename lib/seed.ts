import type {
  PlayerRole,
  StoreShape,
  StoredMatch,
  StoredMatchParticipant,
  StoredPlayer,
  StoredPointLedgerEntry,
  StoredPrediction,
  StoredProfileStoreItem,
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
  DRX: [
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
  { id: "team_drx", code: "DRX", name: "KRX", shortName: "KRX" },
  { id: "team_ns", code: "NS", name: "Nongshim RedForce", shortName: "NS" },
  { id: "team_bro", code: "BRO", name: "OKSavingsBank BRION", shortName: "BRO" },
  { id: "team_bfx", code: "BFX", name: "BNK FEARX", shortName: "BFX" },
  { id: "team_dns", code: "DNS", name: "DN FREECS", shortName: "DNS" },
  { id: "team_tbd", code: "TBD", name: "TBD", shortName: "TBD" },
];

const seedMatches = [
  { id: "match_1", scheduledAt: "2026-04-01T17:00:00+09:00", teamA: "HLE", teamB: "BRO", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_2", scheduledAt: "2026-04-01T19:00:00+09:00", teamA: "T1", teamB: "KT", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_3", scheduledAt: "2026-04-02T17:00:00+09:00", teamA: "DK", teamB: "NS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_4", scheduledAt: "2026-04-02T19:00:00+09:00", teamA: "KRX", teamB: "DNS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_5", scheduledAt: "2026-04-03T17:00:00+09:00", teamA: "GEN", teamB: "KT", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_6", scheduledAt: "2026-04-03T19:00:00+09:00", teamA: "BFX", teamB: "BRO", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_7", scheduledAt: "2026-04-04T17:00:00+09:00", teamA: "T1", teamB: "HLE", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_8", scheduledAt: "2026-04-04T19:00:00+09:00", teamA: "KRX", teamB: "DK", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_9", scheduledAt: "2026-04-05T17:00:00+09:00", teamA: "NS", teamB: "DNS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_10", scheduledAt: "2026-04-05T19:00:00+09:00", teamA: "GEN", teamB: "BFX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_11", scheduledAt: "2026-04-08T17:00:00+09:00", teamA: "DK", teamB: "HLE", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_12", scheduledAt: "2026-04-08T19:00:00+09:00", teamA: "T1", teamB: "GEN", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_13", scheduledAt: "2026-04-09T17:00:00+09:00", teamA: "BRO", teamB: "KRX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_14", scheduledAt: "2026-04-09T19:00:00+09:00", teamA: "KT", teamB: "NS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_15", scheduledAt: "2026-04-10T17:00:00+09:00", teamA: "DNS", teamB: "T1", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_16", scheduledAt: "2026-04-10T19:00:00+09:00", teamA: "HLE", teamB: "BFX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_17", scheduledAt: "2026-04-11T15:00:00+09:00", teamA: "NS", teamB: "KRX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_18", scheduledAt: "2026-04-11T17:00:00+09:00", teamA: "DK", teamB: "GEN", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_19", scheduledAt: "2026-04-12T15:00:00+09:00", teamA: "BFX", teamB: "DNS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_20", scheduledAt: "2026-04-12T17:00:00+09:00", teamA: "BRO", teamB: "KT", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_21", scheduledAt: "2026-04-15T17:00:00+09:00", teamA: "NS", teamB: "BFX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_22", scheduledAt: "2026-04-15T19:00:00+09:00", teamA: "KT", teamB: "DK", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_23", scheduledAt: "2026-04-16T17:00:00+09:00", teamA: "BRO", teamB: "GEN", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_24", scheduledAt: "2026-04-16T19:00:00+09:00", teamA: "DNS", teamB: "HLE", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_25", scheduledAt: "2026-04-17T17:00:00+09:00", teamA: "KRX", teamB: "BFX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_26", scheduledAt: "2026-04-17T19:00:00+09:00", teamA: "DK", teamB: "T1", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_27", scheduledAt: "2026-04-18T15:00:00+09:00", teamA: "HLE", teamB: "GEN", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_28", scheduledAt: "2026-04-18T17:00:00+09:00", teamA: "DNS", teamB: "KT", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_29", scheduledAt: "2026-04-19T15:00:00+09:00", teamA: "BRO", teamB: "NS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_30", scheduledAt: "2026-04-19T17:00:00+09:00", teamA: "KRX", teamB: "T1", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_31", scheduledAt: "2026-04-22T17:00:00+09:00", teamA: "KT", teamB: "KRX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_32", scheduledAt: "2026-04-22T19:00:00+09:00", teamA: "HLE", teamB: "NS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_33", scheduledAt: "2026-04-23T17:00:00+09:00", teamA: "BRO", teamB: "DK", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_34", scheduledAt: "2026-04-23T19:00:00+09:00", teamA: "GEN", teamB: "DNS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_35", scheduledAt: "2026-04-24T17:00:00+09:00", teamA: "BFX", teamB: "KT", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_36", scheduledAt: "2026-04-24T19:00:00+09:00", teamA: "HLE", teamB: "KRX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_37", scheduledAt: "2026-04-25T15:00:00+09:00", teamA: "T1", teamB: "BRO", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_38", scheduledAt: "2026-04-25T17:00:00+09:00", teamA: "DK", teamB: "DNS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_39", scheduledAt: "2026-04-26T15:00:00+09:00", teamA: "T1", teamB: "BFX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_40", scheduledAt: "2026-04-26T17:00:00+09:00", teamA: "NS", teamB: "GEN", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_41", scheduledAt: "2026-04-29T17:00:00+09:00", teamA: "NS", teamB: "T1", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_42", scheduledAt: "2026-04-29T19:00:00+09:00", teamA: "KT", teamB: "HLE", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_43", scheduledAt: "2026-04-30T17:00:00+09:00", teamA: "GEN", teamB: "KRX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_44", scheduledAt: "2026-04-30T19:00:00+09:00", teamA: "BFX", teamB: "DK", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_45", scheduledAt: "2026-05-01T17:00:00+09:00", teamA: "DNS", teamB: "BRO", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 1R" },
  { id: "match_46", scheduledAt: "2026-05-01T19:00:00+09:00", teamA: "HLE", teamB: "T1", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_47", scheduledAt: "2026-05-02T15:00:00+09:00", teamA: "GEN", teamB: "DK", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_48", scheduledAt: "2026-05-02T17:00:00+09:00", teamA: "KRX", teamB: "NS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_49", scheduledAt: "2026-05-03T15:00:00+09:00", teamA: "KT", teamB: "BRO", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_50", scheduledAt: "2026-05-03T17:00:00+09:00", teamA: "DNS", teamB: "BFX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_51", scheduledAt: "2026-05-06T17:00:00+09:00", teamA: "GEN", teamB: "NS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_52", scheduledAt: "2026-05-06T19:00:00+09:00", teamA: "HLE", teamB: "DNS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_53", scheduledAt: "2026-05-07T17:00:00+09:00", teamA: "DK", teamB: "KT", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_54", scheduledAt: "2026-05-07T19:00:00+09:00", teamA: "BRO", teamB: "BFX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_55", scheduledAt: "2026-05-08T17:00:00+09:00", teamA: "T1", teamB: "DNS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_56", scheduledAt: "2026-05-08T19:00:00+09:00", teamA: "KRX", teamB: "GEN", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_57", scheduledAt: "2026-05-09T15:00:00+09:00", teamA: "KT", teamB: "BFX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_58", scheduledAt: "2026-05-09T17:00:00+09:00", teamA: "NS", teamB: "BRO", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_59", scheduledAt: "2026-05-10T15:00:00+09:00", teamA: "T1", teamB: "DK", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_60", scheduledAt: "2026-05-10T17:00:00+09:00", teamA: "KRX", teamB: "HLE", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_61", scheduledAt: "2026-05-13T17:00:00+09:00", teamA: "T1", teamB: "NS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_62", scheduledAt: "2026-05-13T19:00:00+09:00", teamA: "DNS", teamB: "DK", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_63", scheduledAt: "2026-05-14T17:00:00+09:00", teamA: "BFX", teamB: "GEN", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_64", scheduledAt: "2026-05-14T19:00:00+09:00", teamA: "KRX", teamB: "KT", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_65", scheduledAt: "2026-05-15T17:00:00+09:00", teamA: "HLE", teamB: "DK", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_66", scheduledAt: "2026-05-15T19:00:00+09:00", teamA: "BRO", teamB: "DNS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_67", scheduledAt: "2026-05-16T15:00:00+09:00", teamA: "GEN", teamB: "T1", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_68", scheduledAt: "2026-05-16T17:00:00+09:00", teamA: "BFX", teamB: "NS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_69", scheduledAt: "2026-05-17T15:00:00+09:00", teamA: "HLE", teamB: "KT", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_70", scheduledAt: "2026-05-17T17:00:00+09:00", teamA: "KRX", teamB: "BRO", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_71", scheduledAt: "2026-05-20T17:00:00+09:00", teamA: "T1", teamB: "KRX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_72", scheduledAt: "2026-05-20T19:00:00+09:00", teamA: "NS", teamB: "KT", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_73", scheduledAt: "2026-05-21T17:00:00+09:00", teamA: "BFX", teamB: "HLE", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_74", scheduledAt: "2026-05-21T19:00:00+09:00", teamA: "DK", teamB: "BRO", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_75", scheduledAt: "2026-05-22T17:00:00+09:00", teamA: "DNS", teamB: "KRX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_76", scheduledAt: "2026-05-22T19:00:00+09:00", teamA: "KT", teamB: "GEN", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_77", scheduledAt: "2026-05-23T15:00:00+09:00", teamA: "DK", teamB: "BFX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_78", scheduledAt: "2026-05-23T17:00:00+09:00", teamA: "NS", teamB: "HLE", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_79", scheduledAt: "2026-05-24T15:00:00+09:00", teamA: "DNS", teamB: "GEN", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_80", scheduledAt: "2026-05-24T17:00:00+09:00", teamA: "BRO", teamB: "T1", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_81", scheduledAt: "2026-05-27T17:00:00+09:00", teamA: "GEN", teamB: "HLE", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_82", scheduledAt: "2026-05-27T19:00:00+09:00", teamA: "BFX", teamB: "KRX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_83", scheduledAt: "2026-05-28T17:00:00+09:00", teamA: "DNS", teamB: "NS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_84", scheduledAt: "2026-05-28T19:00:00+09:00", teamA: "KT", teamB: "T1", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_85", scheduledAt: "2026-05-29T17:00:00+09:00", teamA: "DK", teamB: "KRX", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_86", scheduledAt: "2026-05-29T19:00:00+09:00", teamA: "GEN", teamB: "BRO", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_87", scheduledAt: "2026-05-30T15:00:00+09:00", teamA: "KT", teamB: "DNS", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_88", scheduledAt: "2026-05-30T17:00:00+09:00", teamA: "BFX", teamB: "T1", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_89", scheduledAt: "2026-05-31T15:00:00+09:00", teamA: "BRO", teamB: "HLE", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_90", scheduledAt: "2026-05-31T17:00:00+09:00", teamA: "NS", teamB: "DK", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "정규시즌 2R" },
  { id: "match_91", scheduledAt: "2026-06-06T17:00:00+09:00", teamA: "TBD", teamB: "TBD", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "Road to MSI 1R" },
  { id: "match_92", scheduledAt: "2026-06-07T17:00:00+09:00", teamA: "TBD", teamB: "TBD", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "Road to MSI 2R" },
  { id: "match_93", scheduledAt: "2026-06-12T17:00:00+09:00", teamA: "TBD", teamB: "TBD", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "Road to MSI 3R" },
  { id: "match_94", scheduledAt: "2026-06-13T17:00:00+09:00", teamA: "TBD", teamB: "TBD", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "Road to MSI 4R" },
  { id: "match_95", scheduledAt: "2026-06-14T17:00:00+09:00", teamA: "TBD", teamB: "TBD", status: "scheduled", scoreA: null, scoreB: null, patch: "15.7", stage: "Road to MSI 최종전" },
] as const;

const seedStoreItems: StoredProfileStoreItem[] = [
  { id: "store_badge_lck", type: "badge", label: "LCK 분석가", description: "프로필에 LCK 분석가 배지를 부여합니다.", price: 120, previewValue: "LCK 분석가" },
  { id: "store_badge_hot", type: "badge", label: "핫클립", description: "인기 반응을 남긴 유저용 배지입니다.", price: 180, previewValue: "핫클립" },
  { id: "store_title_shotcaller", type: "title", label: "Shotcaller", description: "프로필 요약에 전략가 칭호를 붙입니다.", price: 160, previewValue: "Shotcaller" },
  { id: "store_theme_crimson", type: "theme", label: "Crimson Stage", description: "프로필 카드에 강한 레드 톤을 적용합니다.", price: 220, previewValue: "crimson-stage" },
  { id: "store_theme_sky", type: "theme", label: "Sky Draft", description: "프로필 카드에 시원한 블루 톤을 적용합니다.", price: 220, previewValue: "sky-draft" },
];

function normalizeTeamCode(code: string) {
  return code === "KRX" ? "DRX" : code;
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

function createMatches(): StoredMatch[] {
  return seedMatches.map((match) => ({
    id: match.id,
    league: "LCK 2026",
    stage: match.stage,
    patch: match.patch,
    status: match.status,
    scheduledAt: match.scheduledAt,
    teamAId: getTeamId(match.teamA),
    teamBId: getTeamId(match.teamB),
    scoreA: match.scoreA,
    scoreB: match.scoreB,
    predictionLocked: false,
    createdAt: OFFICIAL_SCHEDULE_UPDATED_AT,
    updatedAt: OFFICIAL_SCHEDULE_UPDATED_AT,
  }));
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

function createUsers(): StoredUser[] {
  const now = new Date().toISOString();
  return [
    {
      id: "user_seed_analyst",
      email: "analyst@example.com",
      name: "Lee Analyst",
      nickname: "밴픽연구원",
      nicknameUpdatedAt: now,
      bio: "운영과 밴픽 흐름을 중점적으로 보는 유저입니다.",
      image: null,
      role: "user",
      selectedBadge: "store_badge_lck",
      selectedProfileTheme: "store_theme_sky",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "user_seed_editor",
      email: "editor@example.com",
      name: "Park Editor",
      nickname: "세트편집장",
      nicknameUpdatedAt: now,
      bio: "세트 흐름과 선수 평점을 정리하는 것을 좋아합니다.",
      image: null,
      role: "admin",
      selectedBadge: "store_badge_hot",
      selectedProfileTheme: "store_theme_crimson",
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function createPredictions(): StoredPrediction[] {
  const now = new Date().toISOString();
  return [
    { id: "prediction_1", userId: "user_seed_analyst", matchId: "match_1", teamId: getTeamId("HLE"), createdAt: now, updatedAt: now },
    { id: "prediction_2", userId: "user_seed_editor", matchId: "match_2", teamId: getTeamId("T1"), createdAt: now, updatedAt: now },
    { id: "prediction_3", userId: "user_seed_analyst", matchId: "match_4", teamId: getTeamId("KRX"), createdAt: now, updatedAt: now },
  ];
}

function createPointLedger(): StoredPointLedgerEntry[] {
  const now = new Date().toISOString();
  return [
    {
      id: "ledger_1",
      userId: "user_seed_analyst",
      type: "earn",
      amount: 380,
      reason: "시드 활동 포인트 이관",
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
      reason: "시드 활동 포인트 이관",
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
      reason: "LCK 분석가 배지 구매",
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
      reason: "Sky Draft 테마 구매",
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
      reason: "핫클립 배지 구매",
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
      reason: "Crimson Stage 테마 구매",
      referenceType: "store_purchase",
      referenceId: "store_theme_crimson",
      createdAt: now,
      balanceAfter: 20,
    },
  ];
}

function createInventory(): StoredUserInventoryItem[] {
  const now = new Date().toISOString();
  return [
    { id: "inventory_1", userId: "user_seed_analyst", storeItemId: "store_badge_lck", equipped: true, acquiredAt: now },
    { id: "inventory_2", userId: "user_seed_analyst", storeItemId: "store_theme_sky", equipped: true, acquiredAt: now },
    { id: "inventory_3", userId: "user_seed_editor", storeItemId: "store_badge_hot", equipped: true, acquiredAt: now },
    { id: "inventory_4", userId: "user_seed_editor", storeItemId: "store_theme_crimson", equipped: true, acquiredAt: now },
  ];
}

export function createSeedStore(): StoreShape {
  const users = createUsers();
  const players = createPlayers();
  const teamRosterEntries = createTeamRosterEntries(players);
  const matches = createMatches();
  const matchParticipants = createMatchParticipants(players, matches);
  const predictions = createPredictions();
  const pointLedger = createPointLedger();
  const profileStoreItems = seedStoreItems;
  const userInventory = createInventory();

  return {
    users,
    teams,
    players,
    teamRosterEntries,
    matches,
    matchParticipants,
    matchSets: [],
    setParticipants: [],
    predictions,
    playerRatings: [],
    setPlayerRatings: [],
    comments: [],
    pointLedger,
    profileStoreItems,
    userInventory,
    nextIds: {
      users: users.length + 1,
      teams: teams.length + 1,
      players: players.length + 1,
      teamRosterEntries: teamRosterEntries.length + 1,
      matches: matches.length + 1,
      matchParticipants: matchParticipants.length + 1,
      matchSets: 1,
      setParticipants: 1,
      predictions: predictions.length + 1,
      playerRatings: 1,
      setPlayerRatings: 1,
      comments: 1,
      pointLedger: pointLedger.length + 1,
      profileStoreItems: profileStoreItems.length + 1,
      userInventory: userInventory.length + 1,
    },
  };
}

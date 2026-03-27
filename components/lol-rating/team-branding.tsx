export type TeamId = "T1" | "GEN" | "KT" | "KRX" | "HLE" | "DK" | "NS" | "BRO" | "BFX" | "DNS";

const TEAM_CODES: Record<TeamId, string> = {
  T1: "T1",
  GEN: "GEN",
  KT: "KT",
  KRX: "KRX",
  HLE: "HLE",
  DK: "DK",
  NS: "NS",
  BRO: "BRO",
  BFX: "BFX",
  DNS: "DNS",
};

export function normalizeTeamName(team: string): TeamId | null {
  const normalized = team.trim().toUpperCase().replace(/\./g, "");
  const aliases: Record<string, TeamId> = {
    T1: "T1",
    GEN: "GEN",
    GENG: "GEN",
    KT: "KT",
    DRX: "KRX",
    KRX: "KRX",
    HLE: "HLE",
    DK: "DK",
    NS: "NS",
    BRO: "BRO",
    BFX: "BFX",
    DNS: "DNS",
    GENGG: "GEN",
    DNF: "DNS",
  };

  return aliases[normalized] ?? null;
}

export function getTeamDisplayName(team: string) {
  const teamId = normalizeTeamName(team);
  return teamId ? TEAM_CODES[teamId] : team.trim().toUpperCase().replace(/\./g, "");
}

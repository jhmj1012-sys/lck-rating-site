/**
 * Riot LoL Esports 비공식 API 연동
 * - 별도 인증 없이 공개된 API 키 사용
 * - LCK 경기 일정, 결과, 출전 선수를 가져옵니다
 */

const RIOT_API_KEY = "0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z";
const LCK_LEAGUE_ID = "98767991310872058";
const ESPORTS_BASE = "https://esports-api.lolesports.com/persisted/gw";
const FEED_BASE = "https://feed.lolesports.com/livestats/v1";

/**
 * Riot API 팀 코드 → DB 팀 코드 매핑
 * Riot은 구 팀명을 유지하거나 약간 다른 코드를 쓸 수 있어서 정규화합니다
 */
export const RIOT_TO_DB_TEAM_CODE: Record<string, string> = {
  T1: "T1",
  GEN: "GEN",
  HLE: "HLE",
  DK: "DK",
  KT: "KT",
  DRX: "KRX", // KIWOOM DRX → KRX
  KRX: "KRX",
  NS: "NS",
  BRO: "BRO",
  BFX: "BFX",
  DNS: "DNS",
};

/** Riot role 문자열 → DB PlayerRole 변환 */
const RIOT_ROLE_MAP: Record<string, string> = {
  top: "TOP",
  jungle: "JGL",
  mid: "MID",
  bottom: "ADC",
  support: "SUP",
};

// ── 타입 정의 ─────────────────────────────────────────────────────

export type RiotCompletedMatch = {
  riotMatchId: string;
  startTime: string;
  teamACode: string;
  teamBCode: string;
  scoreA: number;
  scoreB: number;
};

export type RiotPlayerEntry = {
  /** "DK Siwoo" → "Siwoo" (팀 접두사 제거된 선수명) */
  playerName: string;
  teamCode: string;
  /** DB 기준 role: TOP/JGL/MID/ADC/SUP */
  role: string;
};

export type RiotMatchLineup = {
  players: RiotPlayerEntry[]; // 양 팀 합쳐서 최대 10명
};

// ── 내부 응답 타입 ────────────────────────────────────────────────

type RiotScheduleEvent = {
  startTime: string;
  state: string;
  type: string;
  match?: {
    id: string;
    teams?: Array<{
      code: string;
      result?: { outcome: string | null; gameWins: number };
    }>;
  };
};

type RiotEventGame = {
  number: number;
  id: string;
  state: string;
};

type RiotWindowParticipant = {
  participantId: number;
  esportsPlayerId: string;
  summonerName: string;
  championId: string;
  role: string;
};

type RiotWindowTeamMetadata = {
  esportsTeamId: string;
  participantMetadata: RiotWindowParticipant[];
};

// ── 공개 함수 ─────────────────────────────────────────────────────

/**
 * LCK 완료 경기 결과 목록을 Riot API에서 가져옵니다
 */
export async function fetchLckCompletedMatches(): Promise<RiotCompletedMatch[]> {
  const url = `${ESPORTS_BASE}/getSchedule?hl=ko-KR&leagueId=${LCK_LEAGUE_ID}`;

  const res = await fetch(url, {
    headers: { "x-api-key": RIOT_API_KEY },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Riot API 응답 오류: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as {
    data?: { schedule?: { events?: RiotScheduleEvent[] } };
  };

  const events = data?.data?.schedule?.events ?? [];
  const results: RiotCompletedMatch[] = [];

  for (const event of events) {
    if (event.type !== "match" || event.state !== "completed") continue;
    if (!event.match?.teams || event.match.teams.length < 2) continue;

    const [teamA, teamB] = event.match.teams;
    const codeA = RIOT_TO_DB_TEAM_CODE[teamA.code] ?? teamA.code;
    const codeB = RIOT_TO_DB_TEAM_CODE[teamB.code] ?? teamB.code;

    results.push({
      riotMatchId: event.match.id,
      startTime: event.startTime,
      teamACode: codeA,
      teamBCode: codeB,
      scoreA: teamA.result?.gameWins ?? 0,
      scoreB: teamB.result?.gameWins ?? 0,
    });
  }

  return results;
}

/**
 * 경기 ID → 첫 번째 게임(세트)의 ID를 가져옵니다
 * getEventDetails → games[0].id
 */
async function fetchFirstGameId(riotMatchId: string): Promise<string | null> {
  const url = `${ESPORTS_BASE}/getEventDetails?hl=ko-KR&id=${riotMatchId}`;

  const res = await fetch(url, {
    headers: { "x-api-key": RIOT_API_KEY },
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    data?: {
      event?: {
        match?: { games?: RiotEventGame[] };
      };
    };
  };

  const games = data?.data?.event?.match?.games ?? [];
  const completed = games.filter((g) => g.state === "completed");
  // 완료된 세트 중 첫 번째 (번호 기준 정렬)
  completed.sort((a, b) => a.number - b.number);
  return completed[0]?.id ?? null;
}

/**
 * 게임(세트) ID → 출전 선수 목록을 가져옵니다
 * feed.lolesports.com 은 API 키 불필요
 */
async function fetchGameLineup(gameId: string): Promise<RiotPlayerEntry[]> {
  const url = `${FEED_BASE}/window/${gameId}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];

  const data = (await res.json()) as {
    gameMetadata?: {
      blueTeamMetadata?: RiotWindowTeamMetadata;
      redTeamMetadata?: RiotWindowTeamMetadata;
    };
  };

  const meta = data?.gameMetadata;
  if (!meta) return [];

  const entries: RiotPlayerEntry[] = [];

  for (const teamMeta of [meta.blueTeamMetadata, meta.redTeamMetadata]) {
    if (!teamMeta) continue;

    for (const p of teamMeta.participantMetadata) {
      // summonerName 형식: "TEAM PlayerName" (e.g., "DK ShowMaker")
      const spaceIdx = p.summonerName.indexOf(" ");
      if (spaceIdx === -1) continue;

      const teamCode = p.summonerName.slice(0, spaceIdx).trim();
      const playerName = p.summonerName.slice(spaceIdx + 1).trim();
      const dbRole = RIOT_ROLE_MAP[p.role.toLowerCase()] ?? p.role.toUpperCase();

      entries.push({
        playerName,
        teamCode: RIOT_TO_DB_TEAM_CODE[teamCode] ?? teamCode,
        role: dbRole,
      });
    }
  }

  return entries;
}

/**
 * Riot 경기 ID로 출전 선수 10명을 가져옵니다
 * (getEventDetails → 첫 번째 세트 ID → window 조회)
 *
 * 실패 시 null 반환 (라인업 없이 결과만 적용하도록)
 */
export async function fetchMatchLineup(riotMatchId: string): Promise<RiotMatchLineup | null> {
  try {
    const gameId = await fetchFirstGameId(riotMatchId);
    if (!gameId) return null;

    const players = await fetchGameLineup(gameId);
    if (players.length === 0) return null;

    return { players };
  } catch {
    return null;
  }
}

'use client';

import Image from "next/image";
import { useMemo, useRef, useState } from "react";

import { SaveRosterImageButton } from "@/components/games/SaveRosterImageButton";
import { cn } from "@/components/lol-rating/utils";
import { budgetChallengeConfig, budgetChallengePlayers } from "@/lib/games/budget-challenge-data";
import type {
  BudgetChallengePost,
  ChallengePlayer,
  ChallengePosition,
  ChallengeSelection,
  SelectionFailureReason,
} from "@/lib/games/budget-challenge-types";
import { CHALLENGE_POSITIONS } from "@/lib/games/budget-challenge-types";
import { canSelectPlayer, createChallengeSummary, decodeSelection, encodeSelection } from "@/lib/games/budget-challenge-utils";

type ViewerState = {
  isAuthenticated: boolean;
  hasNickname: boolean;
  nickname: string | null;
};

type PlayerPoolView = "name" | "price" | "team" | "position";
type TooltipPlacement = "left" | "center" | "right";
type HoveredTooltip = {
  playerId: string;
  left: number;
  top: number;
  placement: TooltipPlacement;
};
type HoveredSynergyTooltip = {
  synergyId: string;
  left: number;
  top: number;
  placement: TooltipPlacement;
};
type SpecialTraitId = "veteran" | "rookie" | "winner" | "worlds_fmvp" | "lpl";
type SynergyItem = {
  id: string;
  label: string;
  current: number;
  max: number;
  type: "team" | "trait";
  team?: string;
  iconText?: string;
};

const ACTIVE_PLAYERS = budgetChallengePlayers.filter((player) => player.active);
const PLAYERS_BY_ID = new Map(ACTIVE_PLAYERS.map((player) => [player.id, player]));
const POSITION_ORDER = new Map(CHALLENGE_POSITIONS.map((position, index) => [position, index]));
const TEAM_ORDER = Array.from(new Set(ACTIVE_PLAYERS.map((player) => player.team)));

const POSITION_META: Record<
  ChallengePosition,
  {
    label: string;
    short: string;
    copy: string;
    iconPath: string;
  }
> = {
  TOP: { label: "탑", short: "TOP", copy: "상단 라인", iconPath: "/icons/positions/icon-position-top-disabled.png" },
  JUNGLE: { label: "정글", short: "JUG", copy: "정글", iconPath: "/icons/positions/icon-position-jungle-disabled.png" },
  MID: { label: "미드", short: "MID", copy: "중앙 라인", iconPath: "/icons/positions/icon-position-middle-disabled.png" },
  ADC: { label: "원딜", short: "ADC", copy: "하단 딜러", iconPath: "/icons/positions/icon-position-bottom-disabled.png" },
  SUPPORT: { label: "서포터", short: "SUP", copy: "하단 서포터", iconPath: "/icons/positions/icon-position-utility-disabled.png" },
};

const PRICE_THEMES: Record<
  number,
  {
    ring: string;
    soft: string;
    strong: string;
    chip: string;
    glow: string;
    text: string;
    lightText: string;
    slotBg: string;
  }
> = {
  5: {
    ring: "border-[#f6c453]/80",
    soft: "bg-[rgba(246,196,83,0.12)]",
    strong: "bg-[rgba(246,196,83,0.22)]",
    chip: "border-[#f6c453]/50 bg-[rgba(246,196,83,0.14)]",
    glow: "shadow-[0_16px_30px_rgba(246,196,83,0.14)]",
    text: "text-[#ffd56d]",
    lightText: "text-[#b7791f]",
    slotBg: "bg-[linear-gradient(90deg,rgba(246,196,83,0.24)_0%,rgba(246,196,83,0.1)_45%,rgba(17,21,27,0.92)_100%)]",
  },
  4: {
    ring: "border-[#fb8b73]/80",
    soft: "bg-[rgba(251,139,115,0.12)]",
    strong: "bg-[rgba(251,139,115,0.2)]",
    chip: "border-[#fb8b73]/50 bg-[rgba(251,139,115,0.14)]",
    glow: "shadow-[0_16px_30px_rgba(251,139,115,0.14)]",
    text: "text-[#ffab93]",
    lightText: "text-[#c05621]",
    slotBg: "bg-[linear-gradient(90deg,rgba(251,139,115,0.24)_0%,rgba(251,139,115,0.1)_45%,rgba(17,21,27,0.92)_100%)]",
  },
  3: {
    ring: "border-[#4fd1c5]/80",
    soft: "bg-[rgba(79,209,197,0.12)]",
    strong: "bg-[rgba(79,209,197,0.2)]",
    chip: "border-[#4fd1c5]/50 bg-[rgba(79,209,197,0.14)]",
    glow: "shadow-[0_16px_30px_rgba(79,209,197,0.14)]",
    text: "text-[#79ede2]",
    lightText: "text-[#0f766e]",
    slotBg: "bg-[linear-gradient(90deg,rgba(79,209,197,0.24)_0%,rgba(79,209,197,0.1)_45%,rgba(17,21,27,0.92)_100%)]",
  },
  2: {
    ring: "border-[#69a8ff]/80",
    soft: "bg-[rgba(105,168,255,0.12)]",
    strong: "bg-[rgba(105,168,255,0.2)]",
    chip: "border-[#69a8ff]/50 bg-[rgba(105,168,255,0.14)]",
    glow: "shadow-[0_16px_30px_rgba(105,168,255,0.14)]",
    text: "text-[#8dc0ff]",
    lightText: "text-[#2563eb]",
    slotBg: "bg-[linear-gradient(90deg,rgba(105,168,255,0.24)_0%,rgba(105,168,255,0.1)_45%,rgba(17,21,27,0.92)_100%)]",
  },
  1: {
    ring: "border-[#96a4bb]/75",
    soft: "bg-[rgba(150,164,187,0.12)]",
    strong: "bg-[rgba(150,164,187,0.18)]",
    chip: "border-[#96a4bb]/40 bg-[rgba(150,164,187,0.14)]",
    glow: "shadow-[0_16px_30px_rgba(150,164,187,0.12)]",
    text: "text-[#c1cad7]",
    lightText: "text-[#475569]",
    slotBg: "bg-[linear-gradient(90deg,rgba(150,164,187,0.22)_0%,rgba(150,164,187,0.09)_45%,rgba(17,21,27,0.92)_100%)]",
  },
};

const PLAYER_REAL_NAMES: Partial<Record<string, string>> = {
  aiming: "김하람",
  andil: "문관빈",
  bdd: "곽보성",
  canyon: "김건부",
  career: "오형석",
  casting: "신민재",
  chovy: "정지훈",
  clear: "송현민",
  clozer: "이주현",
  cuzz: "문우찬",
  delight: "유환중",
  deokdam: "서대길",
  diable: "남대근",
  doran: "최현준",
  duro: "주민규",
  dudu: "이동주",
  effort: "이상호",
  faker: "이상혁",
  fisher: "이정태",
  gideon: "김민성",
  gumayusi: "이민형",
  jiwoo: "정지우",
  kanavi: "서진혁",
  kellin: "김형규",
  keria: "류민석",
  kiin: "김기인",
  kingen: "황성훈",
  lazyfeel: "전바오민",
  lehends: "손시우",
  life: "김정민",
  lucid: "최용혁",
  namgung: "남궁성훈",
  oner: "문현준",
  perfect: "이승민",
  peter: "정윤수",
  peyz: "김수환",
  pollu: "오동규",
  pyosik: "홍창현",
  raptor: "전어진",
  rich: "이재원",
  ruler: "박재혁",
  scout: "이예찬",
  showmaker: "허수",
  siwoo: "전시우",
  smash: "신금재",
  taeyoon: "김태윤",
  teddy: "박진성",
  ucal: "손우현",
  vicla: "이대광",
  zeka: "김건우",
  zeus: "최우제",
  krx_willer: "김정현",
  ns_willer: "김정현",
};

const SPECIAL_TRAIT_META: Record<SpecialTraitId, { label: string; iconText: string }> = {
  veteran: { label: "베테랑", iconText: "V" },
  rookie: { label: "루키", iconText: "R" },
  winner: { label: "위너", iconText: "W" },
  worlds_fmvp: { label: "월즈파엠", iconText: "F" },
  lpl: { label: "LPL", iconText: "L" },
};

const PLAYER_SPECIAL_TRAITS: Partial<Record<string, SpecialTraitId[]>> = {
  aiming: ["veteran", "lpl"],
  andil: ["rookie"],
  bdd: ["veteran", "winner"],
  canyon: ["veteran", "winner"],
  career: ["veteran", "winner"],
  casting: ["rookie"],
  chovy: ["veteran", "winner"],
  clear: ["rookie"],
  clozer: ["veteran"],
  cuzz: ["veteran", "winner"],
  delight: ["veteran", "winner"],
  deokdam: ["veteran"],
  diable: ["rookie"],
  doran: ["veteran", "winner"],
  dudu: ["veteran"],
  duro: ["rookie"],
  effort: ["veteran", "winner"],
  faker: ["veteran", "winner"],
  fisher: ["rookie"],
  gideon: ["rookie"],
  gumayusi: ["veteran", "winner"],
  jiwoo: ["veteran"],
  kanavi: ["veteran", "winner", "lpl"],
  kellin: ["veteran"],
  keria: ["veteran", "winner"],
  kiin: ["veteran", "winner"],
  kingen: ["veteran", "winner", "worlds_fmvp", "lpl"],
  lazyfeel: ["rookie"],
  lehends: ["veteran", "winner"],
  life: ["veteran", "winner", "lpl"],
  lucid: ["rookie", "winner"],
  namgung: ["rookie"],
  oner: ["veteran", "winner"],
  perfect: ["rookie"],
  peter: ["rookie"],
  peyz: ["veteran", "winner"],
  pollu: ["rookie"],
  pyosik: ["veteran", "winner"],
  raptor: ["rookie"],
  rich: ["veteran", "lpl"],
  ruler: ["veteran", "winner", "lpl"],
  scout: ["veteran", "winner", "lpl"],
  showmaker: ["veteran", "winner"],
  siwoo: ["rookie"],
  smash: ["rookie", "winner"],
  taeyoon: ["veteran"],
  teddy: ["veteran", "winner"],
  ucal: ["veteran", "winner"],
  vicla: ["veteran"],
  zeka: ["veteran", "winner", "lpl"],
  zeus: ["veteran", "winner"],
  krx_willer: ["veteran"],
  ns_willer: ["veteran"],
};

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function getTeamLogo(team: string) {
  return `/teams/${team}.svg`;
}

function getFailureMessage(reason?: SelectionFailureReason) {
  if (reason === "budget-exceeded") {
    return "남은 예산이 부족해서 이 선수를 넣을 수 없습니다.";
  }

  return "지금은 이 선수를 선택할 수 없습니다.";
}

function sanitizeSelection(encodedSelection?: string) {
  const decoded = decodeSelection(encodedSelection ?? "");

  return Object.entries(decoded).reduce<ChallengeSelection>((acc, [position, playerId]) => {
    if (playerId && PLAYERS_BY_ID.has(playerId)) {
      acc[position as keyof ChallengeSelection] = playerId;
    }
    return acc;
  }, {});
}

function replacePostInList(list: BudgetChallengePost[], updatedPost: BudgetChallengePost) {
  return list.map((post) => (post.id === updatedPost.id ? updatedPost : post));
}

function TeamLogo({ team, className }: { team: string; className?: string }) {
  return <Image src={getTeamLogo(team)} alt={`${team} logo`} width={32} height={32} className={cn("object-contain", className)} unoptimized />;
}

function getPlayerRealName(player: ChallengePlayer) {
  return PLAYER_REAL_NAMES[player.id] ?? "실명 정보 준비 중";
}

function getPlayerTraitIds(player: ChallengePlayer) {
  return [`team:${player.team}`, ...(PLAYER_SPECIAL_TRAITS[player.id] ?? [])];
}

function getTraitLabel(traitId: string) {
  if (traitId.startsWith("team:")) {
    return `${traitId.replace("team:", "")} 특성`;
  }

  const trait = SPECIAL_TRAIT_META[traitId as SpecialTraitId];
  return trait?.label ?? traitId;
}

function getPlayerSynergyClass(player: ChallengePlayer) {
  return getPlayerTraitIds(player)
    .map((traitId) => getTraitLabel(traitId))
    .join(" · ");
}

function getSynergyDescription(synergy: SynergyItem) {
  if (synergy.type === "team" && synergy.team) {
    return `${synergy.team} 선수로 맞춰 가는 기본 팀 시너지입니다. 같은 팀 선수가 많아질수록 조합 정체성이 더 선명해집니다.`;
  }

  if (synergy.id === "veteran") {
    return "큰 경기 경험과 장기 리그 적응력을 갖춘 선수들입니다. 안정감 있는 조합을 만들 때 잘 어울립니다.";
  }

  if (synergy.id === "rookie") {
    return "신예 중심의 날카로운 변수 카드입니다. 저비용으로 높은 기대치를 노릴 때 재미가 있습니다.";
  }

  if (synergy.id === "winner") {
    return "우승 경험이 있는 선수들입니다. 큰 무대에서 검증된 선택지라는 느낌의 특성입니다.";
  }

  if (synergy.id === "worlds_fmvp") {
    return "월즈 파이널 MVP를 받은 초희귀 특성입니다. 한 명만으로도 조합의 상징성이 강합니다.";
  }

  if (synergy.id === "lpl") {
    return "LPL 무대를 경험한 선수들입니다. 해외 리그 경험과 다른 메타 적응력을 상징하는 특성입니다.";
  }

  return "조합 방향성을 보여주는 특성입니다.";
}

export function BudgetChallengePage({
  initialEncodedSelection,
  initialPosts,
  viewer,
}: {
  initialEncodedSelection?: string;
  initialPosts: BudgetChallengePost[];
  viewer: ViewerState;
}) {
  const [selection, setSelection] = useState<ChallengeSelection>(() => sanitizeSelection(initialEncodedSelection));
  const [posts, setPosts] = useState(initialPosts);
  const [playerPoolView, setPlayerPoolView] = useState<PlayerPoolView>("name");
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [postErrors, setPostErrors] = useState<Record<string, string | null>>({});
  const [pendingLikePostId, setPendingLikePostId] = useState<string | null>(null);
  const [pendingCommentPostId, setPendingCommentPostId] = useState<string | null>(null);
  const [hoveredTooltip, setHoveredTooltip] = useState<HoveredTooltip | null>(null);
  const [hoveredSynergyTooltip, setHoveredSynergyTooltip] = useState<HoveredSynergyTooltip | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const composeSectionRef = useRef<HTMLDivElement>(null);

  const summary = createChallengeSummary(budgetChallengeConfig, selection, PLAYERS_BY_ID);
  const encodedSelection = encodeSelection(selection);
  const draggingPlayer = draggingPlayerId ? PLAYERS_BY_ID.get(draggingPlayerId) : undefined;

  const filteredPlayers = useMemo(() => {
    return ACTIVE_PLAYERS.filter((player) => {
      const keyword = search.trim().toLowerCase();
      if (!keyword) {
        return true;
      }

      return [player.name, player.team, POSITION_META[player.position].label, POSITION_META[player.position].short]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [search]);

  const orderedPlayers = useMemo(() => {
    return filteredPlayers.slice().sort((a, b) => {
      if (playerPoolView === "name") {
        return a.name.localeCompare(b.name, "en");
      }

      if (playerPoolView === "price") {
        return b.price - a.price || a.name.localeCompare(b.name, "en");
      }

      const teamDiff = TEAM_ORDER.indexOf(a.team) - TEAM_ORDER.indexOf(b.team);
      if (playerPoolView === "team") {
        return teamDiff || (POSITION_ORDER.get(a.position) ?? 0) - (POSITION_ORDER.get(b.position) ?? 0) || a.name.localeCompare(b.name, "en");
      }

      return (POSITION_ORDER.get(a.position) ?? 0) - (POSITION_ORDER.get(b.position) ?? 0) || teamDiff || a.name.localeCompare(b.name, "en");
    });
  }, [filteredPlayers, playerPoolView]);

  const groupedPlayers = useMemo(() => {
    if (playerPoolView === "team") {
      return TEAM_ORDER.map((team) => ({
        key: team,
        label: team,
        players: orderedPlayers.filter((player) => player.team === team),
      })).filter((section) => section.players.length > 0);
    }

    if (playerPoolView === "position") {
      return CHALLENGE_POSITIONS.map((position) => ({
        key: position,
        label: POSITION_META[position].label,
        players: orderedPlayers.filter((player) => player.position === position),
      })).filter((section) => section.players.length > 0);
    }

    return [];
  }, [orderedPlayers, playerPoolView]);

  const playerPoolViewLabel =
    playerPoolView === "name"
      ? "이름순"
      : playerPoolView === "price"
        ? "가격순"
        : playerPoolView === "team"
          ? "팀별"
          : "포지션별";

  const activeSynergies = useMemo(() => {
    const selectedPlayers = Object.values(selection)
      .map((playerId) => (playerId ? PLAYERS_BY_ID.get(playerId) : undefined))
      .filter((player): player is ChallengePlayer => Boolean(player));

    const selectedCounts = selectedPlayers.reduce<Record<string, number>>((acc, player) => {
      for (const traitId of getPlayerTraitIds(player)) {
        acc[traitId] = (acc[traitId] ?? 0) + 1;
      }
      return acc;
    }, {});

    const specialTraitMaxCounts = ACTIVE_PLAYERS.reduce<Record<string, number>>((acc, player) => {
      for (const traitId of PLAYER_SPECIAL_TRAITS[player.id] ?? []) {
        acc[traitId] = Math.min(5, (acc[traitId] ?? 0) + 1);
      }
      return acc;
    }, {});

    const teamSynergyItems: SynergyItem[] = TEAM_ORDER.map((team) => ({
      id: `team:${team}`,
      label: `${team} 특성`,
      current: selectedCounts[`team:${team}`] ?? 0,
      max: 5,
      type: "team",
      team,
    }));

    const specialSynergyItems: SynergyItem[] = (Object.keys(SPECIAL_TRAIT_META) as SpecialTraitId[]).map((traitId) => ({
      id: traitId,
      label: SPECIAL_TRAIT_META[traitId].label,
      current: selectedCounts[traitId] ?? 0,
      max: specialTraitMaxCounts[traitId] ?? 0,
      type: "trait",
      iconText: SPECIAL_TRAIT_META[traitId].iconText,
    }));

    return [...teamSynergyItems, ...specialSynergyItems]
      .filter((synergy) => synergy.current > 0)
      .sort((a, b) => b.current - a.current || a.label.localeCompare(b.label, "ko"));
  }, [selection]);

  function showNotice(message: string) {
    setNotice(message);
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice(null);
      noticeTimerRef.current = null;
    }, 2200);
  }

  async function copySelectionLink(selectionCode: string, options?: { syncUrl?: boolean; successMessage?: string }) {
    const query = selectionCode ? `?c=${encodeURIComponent(selectionCode)}` : "";
    const url = `${window.location.origin}/games/15-dollar-challenge${query}`;

    try {
      await navigator.clipboard.writeText(url);
      if (options?.syncUrl) {
        window.history.replaceState(null, "", `${window.location.pathname}${query}`);
      }
      showNotice(options?.successMessage ?? "공유 링크를 복사했습니다.");
    } catch {
      showNotice("링크 복사에 실패했습니다. 다시 시도해 주세요.");
    }
  }

  function clearPostError(postId: string) {
    setPostErrors((current) => ({ ...current, [postId]: null }));
  }

  function assignPlayer(player: ChallengePlayer, source: "click" | "drop") {
    const currentId = selection[player.position];
    if (currentId === player.id) {
      removePlayer(player.position, `${player.name}을(를) 로스터에서 해제했습니다.`);
      return;
    }

    const availability = canSelectPlayer({
      config: budgetChallengeConfig,
      selection,
      playersById: PLAYERS_BY_ID,
      player,
    });

    if (!availability.canSelect) {
      showNotice(getFailureMessage(availability.reason));
      return;
    }

    setSelection((current) => ({
      ...current,
      [player.position]: player.id,
    }));
    showNotice(
      source === "drop"
        ? `${POSITION_META[player.position].label} 슬롯에 ${player.name}을(를) 배치했습니다.`
        : `${player.name}을(를) ${POSITION_META[player.position].label}에 배치했습니다.`,
    );
  }

  function removePlayer(position: ChallengePosition, message?: string) {
    setSelection((current) => {
      const next = { ...current };
      delete next[position];
      return next;
    });
    showNotice(message ?? `${POSITION_META[position].label} 선수를 해제했습니다.`);
  }

  function resetSelection() {
    setSelection({});
    showNotice("로스터를 초기화했습니다.");
  }

  function showPlayerTooltip(player: ChallengePlayer, target: HTMLElement) {
    const rect = target.getBoundingClientRect();
    const tooltipWidth = 224;
    const viewportPadding = 16;
    const centeredLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
    const centeredRight = rect.left + rect.width / 2 + tooltipWidth / 2;

    const placement: TooltipPlacement =
      centeredLeft < viewportPadding ? "left" : centeredRight > window.innerWidth - viewportPadding ? "right" : "center";

    setHoveredTooltip({
      playerId: player.id,
      top: rect.top - 8,
      left: placement === "left" ? rect.left : placement === "right" ? rect.right : rect.left + rect.width / 2,
      placement,
    });
  }

  function hidePlayerTooltip(playerId: string) {
    setHoveredTooltip((current) => (current?.playerId === playerId ? null : current));
  }

  function showSynergyTooltip(synergy: SynergyItem, target: HTMLElement) {
    const rect = target.getBoundingClientRect();
    const tooltipWidth = 240;
    const viewportPadding = 16;
    const centeredLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
    const centeredRight = rect.left + rect.width / 2 + tooltipWidth / 2;

    const placement: TooltipPlacement =
      centeredLeft < viewportPadding ? "left" : centeredRight > window.innerWidth - viewportPadding ? "right" : "center";

    setHoveredSynergyTooltip({
      synergyId: synergy.id,
      top: rect.top - 8,
      left: placement === "left" ? rect.left : placement === "right" ? rect.right : rect.left + rect.width / 2,
      placement,
    });
  }

  function hideSynergyTooltip(synergyId: string) {
    setHoveredSynergyTooltip((current) => (current?.synergyId === synergyId ? null : current));
  }

  function loadPost(post: BudgetChallengePost) {
    setSelection(sanitizeSelection(post.encodedSelection));
    setExpandedPosts((current) => ({ ...current, [post.id]: true }));
    window.history.replaceState(null, "", `${window.location.pathname}?c=${encodeURIComponent(post.encodedSelection)}`);
    showNotice(`"${post.title}" 조합을 불러왔습니다.`);
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function savePost() {
    if (!viewer.isAuthenticated) {
      setSaveError("게시글을 저장하려면 로그인이 필요합니다.");
      return;
    }

    if (!viewer.hasNickname) {
      setSaveError("게시글을 저장하려면 닉네임을 먼저 설정해 주세요.");
      return;
    }

    if (!summary.isComplete) {
      setSaveError("5개 포지션을 모두 채운 뒤 저장해 주세요.");
      return;
    }

    setSaveError(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/games/15-dollar-challenge/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          body,
          encodedSelection,
        }),
      });

      const payload = (await response.json()) as { error?: string; post?: BudgetChallengePost };
      if (!response.ok || !payload.post) {
        throw new Error(payload.error ?? "게시글 저장에 실패했습니다.");
      }

      const savedPost = payload.post;
      setPosts((current) => [savedPost, ...current]);
      setExpandedPosts((current) => ({ ...current, [savedPost.id]: true }));
      setTitle("");
      setBody("");
      window.history.replaceState(null, "", `${window.location.pathname}?c=${encodeURIComponent(savedPost.encodedSelection)}`);
      showNotice("조합을 커뮤니티에 공유했습니다.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "게시글 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleLike(postId: string) {
    if (!viewer.isAuthenticated) {
      setPostErrors((current) => ({ ...current, [postId]: "좋아요를 누르려면 로그인이 필요합니다." }));
      return;
    }

    setPendingLikePostId(postId);
    clearPostError(postId);

    try {
      const response = await fetch(`/api/games/15-dollar-challenge/posts/${postId}/likes`, {
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string; post?: BudgetChallengePost };
      if (!response.ok || !payload.post) {
        throw new Error(payload.error ?? "좋아요 처리에 실패했습니다.");
      }

      const updatedPost = payload.post;
      setPosts((current) => replacePostInList(current, updatedPost));
    } catch (error) {
      setPostErrors((current) => ({
        ...current,
        [postId]: error instanceof Error ? error.message : "좋아요 처리에 실패했습니다.",
      }));
    } finally {
      setPendingLikePostId(null);
    }
  }

  async function submitComment(postId: string) {
    if (!viewer.isAuthenticated) {
      setPostErrors((current) => ({ ...current, [postId]: "댓글을 작성하려면 로그인이 필요합니다." }));
      return;
    }

    if (!viewer.hasNickname) {
      setPostErrors((current) => ({ ...current, [postId]: "댓글을 작성하려면 닉네임을 먼저 설정해 주세요." }));
      return;
    }

    setPendingCommentPostId(postId);
    clearPostError(postId);

    try {
      const response = await fetch(`/api/games/15-dollar-challenge/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body: commentDrafts[postId] ?? "",
        }),
      });
      const payload = (await response.json()) as { error?: string; post?: BudgetChallengePost };
      if (!response.ok || !payload.post) {
        throw new Error(payload.error ?? "댓글 저장에 실패했습니다.");
      }

      const updatedPost = payload.post;
      setPosts((current) => replacePostInList(current, updatedPost));
      setCommentDrafts((current) => ({ ...current, [postId]: "" }));
      setExpandedPosts((current) => ({ ...current, [postId]: true }));
      showNotice("댓글을 남겼습니다.");
    } catch (error) {
      setPostErrors((current) => ({
        ...current,
        [postId]: error instanceof Error ? error.message : "댓글 저장에 실패했습니다.",
      }));
    } finally {
      setPendingCommentPostId(null);
    }
  }

  function renderPlayerTile(player: ChallengePlayer) {
    const availability = canSelectPlayer({
      config: budgetChallengeConfig,
      selection,
      playersById: PLAYERS_BY_ID,
      player,
    });
    const isSelected = selection[player.position] === player.id;
    const priceTheme = PRICE_THEMES[player.price];
    const isDisabled = !availability.canSelect && !isSelected;

    return (
      <div key={player.id} className="group relative w-full">
        <button
          type="button"
          draggable={!isDisabled}
          onClick={() => assignPlayer(player, "click")}
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", player.id);
            event.dataTransfer.effectAllowed = "move";
            setDraggingPlayerId(player.id);
          }}
          onDragEnd={() => setDraggingPlayerId(null)}
          disabled={isDisabled}
          className={cn(
            "relative aspect-square w-full overflow-hidden rounded-[7px] border p-0.5 text-left transition",
            "flex items-end justify-start",
            "bg-[linear-gradient(180deg,#2b3040_0%,#1a1f29_100%)]",
            priceTheme.ring,
            priceTheme.glow,
            isSelected ? cn(priceTheme.strong, "scale-[0.98] text-white") : "text-[#E6E8EB]",
            isDisabled ? "cursor-not-allowed opacity-35" : "hover:-translate-y-0.5 hover:bg-[#30374a]",
          )}
          title={isDisabled ? getFailureMessage(availability.reason) : `${player.name} 선택`}
        >
          <span
            className={cn(
              "absolute right-0.5 top-0.5 rounded-[4px] border px-1.5 py-0.5 text-[12px] font-black leading-none",
              priceTheme.chip,
              isSelected ? priceTheme.text : "text-[#D5DBE5]",
            )}
          >
            ${player.price}
          </span>
          <div className="flex min-h-[30px] w-full items-end justify-center bg-[linear-gradient(180deg,transparent_0%,rgba(9,11,15,0.84)_55%,rgba(9,11,15,0.96)_100%)] px-1 py-1 text-center">
            <span
              className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-black leading-none text-white sm:text-[11px]"
              onMouseEnter={(event) => showPlayerTooltip(player, event.currentTarget)}
              onFocus={(event) => showPlayerTooltip(player, event.currentTarget)}
              onMouseLeave={() => hidePlayerTooltip(player.id)}
              onBlur={() => hidePlayerTooltip(player.id)}
            >
              {player.name}
            </span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#1C1C1F] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="space-y-6">
            <div className="grid gap-4 xl:grid-cols-[170px_minmax(0,1.72fr)_248px]">
              <aside className="rounded-[24px] bg-[linear-gradient(180deg,#171b22_0%,#11161c_100%)] p-2.5 text-white">
                <div className="space-y-2">
                  {activeSynergies.map((synergy) => {
                    return (
                      <div
                        key={synergy.id}
                        className={cn(
                          "flex items-center gap-2 rounded-[12px] px-2.5 py-2 transition",
                          "bg-[#2e323c] shadow-[0_10px_24px_rgba(0,0,0,0.18)]",
                        )}
                        onMouseEnter={(event) => showSynergyTooltip(synergy, event.currentTarget)}
                        onFocus={(event) => showSynergyTooltip(synergy, event.currentTarget)}
                        onMouseLeave={() => hideSynergyTooltip(synergy.id)}
                        onBlur={() => hideSynergyTooltip(synergy.id)}
                      >
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]",
                            synergy.type === "team" ? "bg-white/10" : "bg-black/25 text-[11px] font-medium text-[#d9e2ef]",
                          )}
                        >
                          {synergy.type === "team" && synergy.team ? (
                            <TeamLogo team={synergy.team} className="h-4.5 w-4.5" />
                          ) : (
                            <span>{synergy.iconText}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold text-white">{synergy.label}</div>
                          <div className="mt-0.5 text-[13px] font-medium leading-none text-[#9ec5ff]">
                            {synergy.current}/{synergy.max}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </aside>

              <div
                ref={resultRef}
                className="overflow-hidden rounded-[28px] bg-[linear-gradient(180deg,#171b22_0%,#0f1318_100%)]"
              >
                <div className="p-4 sm:p-5">
                  <div className="overflow-hidden rounded-[24px] bg-[linear-gradient(180deg,#171d25_0%,#10151b_100%)]">
                    <div className="grid min-h-[430px] grid-rows-5">
                      {CHALLENGE_POSITIONS.map((position, index) => {
                        const playerId = selection[position];
                        const player = playerId ? PLAYERS_BY_ID.get(playerId) : undefined;
                        const priceTheme = player ? PRICE_THEMES[player.price] : null;
                        const isDropTarget = draggingPlayer?.position === position;
                        const dropAvailability = draggingPlayer
                          ? canSelectPlayer({
                              config: budgetChallengeConfig,
                              selection,
                              playersById: PLAYERS_BY_ID,
                              player: draggingPlayer,
                            })
                          : null;

                        return (
                          <button
                            key={position}
                            type="button"
                            onClick={() => {
                              if (player) {
                                removePlayer(position, `${player.name}을(를) ${POSITION_META[position].label}에서 해제했습니다.`);
                                return;
                              }
                              showNotice(`${POSITION_META[position].label} 선수를 아래에서 골라주세요.`);
                            }}
                            onDragOver={(event) => {
                              if (isDropTarget) {
                                event.preventDefault();
                              }
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              const playerIdFromDrag = event.dataTransfer.getData("text/plain");
                              const dragged = PLAYERS_BY_ID.get(playerIdFromDrag);
                              setDraggingPlayerId(null);

                              if (!dragged) {
                                return;
                              }

                              if (dragged.position !== position) {
                                showNotice(`${POSITION_META[position].label} 슬롯에는 ${POSITION_META[position].label} 선수만 배치할 수 있습니다.`);
                                return;
                              }

                              assignPlayer(dragged, "drop");
                            }}
                            className={cn(
                              "relative flex h-full items-center gap-4 border-b border-white/10 px-5 py-4 text-left transition sm:px-6",
                              index === CHALLENGE_POSITIONS.length - 1 ? "border-b-0" : "",
                              player ? priceTheme?.slotBg : "bg-transparent hover:bg-white/5",
                              isDropTarget && dropAvailability?.canSelect ? "bg-[rgba(47,95,166,0.24)]" : "",
                            )}
                          >
                            <div className="flex w-[76px] shrink-0 items-center justify-center">
                              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-transparent bg-transparent">
                                <Image
                                  src={POSITION_META[position].iconPath}
                                  alt={POSITION_META[position].label}
                                  width={26}
                                  height={26}
                                  className="h-[26px] w-[26px] object-contain brightness-125"
                                  unoptimized
                                />
                              </div>
                            </div>

                            <div
                              className={cn(
                                "h-14 w-[1px] shrink-0 bg-white/10",
                                player && priceTheme ? priceTheme.soft : "",
                              )}
                            />

                            {player ? (
                              <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                  <div
                                    className="truncate text-lg font-black text-white"
                                    onMouseEnter={(event) => showPlayerTooltip(player, event.currentTarget)}
                                    onFocus={(event) => showPlayerTooltip(player, event.currentTarget)}
                                    onMouseLeave={() => hidePlayerTooltip(player.id)}
                                    onBlur={() => hidePlayerTooltip(player.id)}
                                  >
                                    {player.name}
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                      <span className={cn("rounded-full border px-2.5 py-1 text-xs font-bold", priceTheme?.chip, priceTheme?.text)}>
                                        ${player.price}
                                      </span>
                                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold text-[#b3c0d1]">
                                    클릭해서 해제
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="min-w-0 flex-1">
                                <div className="text-base font-black text-white sm:text-lg">빈 슬롯</div>
                                <div className="mt-1 text-xs leading-5 text-[#a8b6c8]">
                                  아래 선수 풀에서 {POSITION_META[position].label} 선수를 클릭하거나 이 줄에 드래그하세요.
                                </div>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>

              <aside className="space-y-3 rounded-[24px] bg-[linear-gradient(180deg,#171b22_0%,#11161c_100%)] p-3 text-white">
                <div className="rounded-[18px] bg-white/[0.04] p-3">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold tracking-[0.08em] text-[#83b0ff]">예산</div>
                      <div className="mt-1 text-[28px] font-semibold leading-none">${summary.remainingBudget}</div>
                    </div>
                    <div className="text-right">
                      <div className="mt-1 text-sm font-semibold text-[#c5d0df]">
                        ${summary.usedBudget} / {budgetChallengeConfig.budget}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-5 gap-1.5">
                    {CHALLENGE_POSITIONS.map((position) => {
                      const playerId = selection[position];
                      const player = playerId ? PLAYERS_BY_ID.get(playerId) : undefined;
                      const priceTheme = player ? PRICE_THEMES[player.price] : null;
                      return (
                        <div
                          key={position}
                          className={cn(
                            "flex min-h-11 flex-col items-center justify-center rounded-[12px] px-1.5 py-1.5 text-center",
                            player ? cn("bg-black/20", priceTheme?.soft) : "bg-black/15",
                          )}
                        >
                          <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#8ea0ba]">{POSITION_META[position].short}</div>
                          <div className={cn("mt-1 h-2 w-2 rounded-full", player ? priceTheme?.text?.replace("text-", "bg-") ?? "bg-[#76a8ff]" : "bg-white/15")} />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[18px] bg-white/[0.04] p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#83b0ff]">Actions</div>
                  <div className="mt-3 grid gap-2">
                    <button
                      type="button"
                      onClick={() => copySelectionLink(encodedSelection, { syncUrl: true, successMessage: "현재 조합 링크를 복사했습니다." })}
                      className="inline-flex min-h-10 items-center justify-center rounded-[12px] bg-[#2f5fa6] px-3 text-sm font-semibold text-white transition hover:bg-[#2a568f]"
                    >
                      현재 조합 공유
                    </button>
                    <SaveRosterImageButton targetRef={resultRef} disabled={!summary.isComplete} />
                    <button
                      type="button"
                      onClick={() => composeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                      className="inline-flex min-h-10 items-center justify-center rounded-[12px] bg-[#202735] px-3 text-sm font-medium text-[#d5ddeb] transition hover:bg-[#263043]"
                    >
                      글 쓰러 가기
                    </button>
                    <button
                      type="button"
                      onClick={resetSelection}
                      className="inline-flex min-h-10 items-center justify-center rounded-[12px] bg-white/[0.03] px-3 text-sm font-medium text-[#aeb9ca] transition hover:bg-white/5 hover:text-white"
                    >
                      로스터 초기화
                    </button>
                  </div>
                </div>

              </aside>
            </div>

            <section className="overflow-visible rounded-[24px] bg-[#2A2D35] text-white">
              <div className="border-b border-white/8 px-4 py-3">
                <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex overflow-x-auto border-b border-white/8">
                      {[
                        { key: "name", label: "이름순" },
                        { key: "price", label: "가격순" },
                        { key: "team", label: "팀별" },
                        { key: "position", label: "포지션별" },
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setPlayerPoolView(tab.key as PlayerPoolView)}
                          className={cn(
                            "shrink-0 border-b-2 px-4 py-2 text-sm font-semibold transition",
                            playerPoolView === tab.key
                              ? "border-[#f2a56d] text-white"
                              : "border-transparent text-[#b4c1d1] hover:text-white",
                          )}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex h-10 min-w-[220px] items-center rounded-[6px] border border-white/10 bg-[#181b22] px-3 text-sm text-[#b4c1d1]">
                      <span className="shrink-0 whitespace-nowrap">검색</span>
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="선수 이름, 팀, 포지션"
                        className="h-full min-w-0 w-full border-0 bg-transparent px-3 text-sm text-white outline-none placeholder:text-[#7f8ea3]"
                      />
                    </div>
                </div>
              </div>

              <div className="px-4 py-4">
                {playerPoolView === "team" || playerPoolView === "position" ? (
                  <div className="space-y-4">
                    {groupedPlayers.map((section) => (
                      <section key={section.key} className="space-y-2">
                        <div className="flex items-center justify-between rounded-[6px] bg-[#23262E] px-3 py-2">
                          <div className="text-sm font-black text-white">{section.label}</div>
                          <div className="text-xs font-semibold text-[#9BA9BC]">{section.players.length}명</div>
                        </div>
                      <div className="grid grid-cols-6 gap-1 sm:grid-cols-7 lg:grid-cols-9 xl:grid-cols-12">
                        {section.players.map((player) => renderPlayerTile(player))}
                      </div>
                      </section>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-[6px] bg-[#23262E] px-3 py-2">
                      <div className="text-sm font-black text-white">{playerPoolViewLabel}</div>
                      <div className="text-xs font-semibold text-[#9BA9BC]">{orderedPlayers.length}명</div>
                    </div>
                    <div className="grid grid-cols-6 gap-1 sm:grid-cols-7 lg:grid-cols-9 xl:grid-cols-12">
                      {orderedPlayers.map((player) => renderPlayerTile(player))}
                    </div>
                  </div>
                )}

                {orderedPlayers.length === 0 ? (
                  <div className="rounded-[10px] border border-dashed border-white/10 bg-[#20232A] px-4 py-8 text-center text-sm text-[#91a0b3]">
                    조건에 맞는 선수가 없습니다. 검색어나 탭을 바꿔 보세요.
                  </div>
                ) : null}
              </div>
            </section>
        </div>

        {hoveredTooltip ? (() => {
          const player = PLAYERS_BY_ID.get(hoveredTooltip.playerId);
          if (!player) {
            return null;
          }

          const availability = canSelectPlayer({
            config: budgetChallengeConfig,
            selection,
            playersById: PLAYERS_BY_ID,
            player,
          });
          const isSelected = selection[player.position] === player.id;
          const isDisabled = !availability.canSelect && !isSelected;
          const priceTheme = PRICE_THEMES[player.price];
          const playerRealName = getPlayerRealName(player);
          const playerSynergyClass = getPlayerSynergyClass(player);

          return (
            <div
              className={cn(
                "pointer-events-none fixed z-[80] w-56 rounded-[12px] border border-white/10 bg-[rgba(7,9,14,0.96)] p-3 text-left shadow-[0_16px_40px_rgba(0,0,0,0.45)]",
                hoveredTooltip.placement === "center" && "-translate-x-1/2 -translate-y-full",
                hoveredTooltip.placement === "left" && "-translate-y-full",
                hoveredTooltip.placement === "right" && "-translate-x-full -translate-y-full",
              )}
              style={{
                left: hoveredTooltip.left,
                top: hoveredTooltip.top,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-white">{player.name}</div>
                  <div className="mt-1 text-xs font-medium text-[#9FB0C8]">{playerRealName}</div>
                </div>
                <span className={cn("rounded-full border px-2 py-1 text-[11px] font-black", priceTheme.chip, priceTheme.text)}>${player.price}</span>
              </div>
              <div className="mt-3 space-y-2 text-xs leading-5 text-[#D4DCEC]">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6f8098]">Position</div>
                  <div className="mt-0.5 text-xs font-medium text-white">{POSITION_META[player.position].label}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6f8098]">Synergy Class</div>
                  <div className="mt-0.5 text-xs font-medium text-white">{playerSynergyClass}</div>
                </div>
              </div>
              {isDisabled ? <div className="mt-3 text-[11px] font-semibold text-[#F3B6A8]">{getFailureMessage(availability.reason)}</div> : null}
              <div
                className={cn(
                  "absolute top-full h-3 w-3 -translate-y-1/2 rotate-45 border-r border-b border-white/10 bg-[rgba(7,9,14,0.96)]",
                  hoveredTooltip.placement === "left" && "left-5",
                  hoveredTooltip.placement === "center" && "left-1/2 -translate-x-1/2",
                  hoveredTooltip.placement === "right" && "right-5",
                )}
              />
            </div>
          );
        })() : null}

        {hoveredSynergyTooltip ? (() => {
          const synergy = activeSynergies.find((item) => item.id === hoveredSynergyTooltip.synergyId);
          if (!synergy) {
            return null;
          }

          return (
            <div
              className={cn(
                "pointer-events-none fixed z-[80] w-60 rounded-[12px] border border-white/10 bg-[rgba(7,9,14,0.96)] p-3 text-left shadow-[0_16px_40px_rgba(0,0,0,0.45)]",
                hoveredSynergyTooltip.placement === "center" && "-translate-x-1/2 -translate-y-full",
                hoveredSynergyTooltip.placement === "left" && "-translate-y-full",
                hoveredSynergyTooltip.placement === "right" && "-translate-x-full -translate-y-full",
              )}
              style={{
                left: hoveredSynergyTooltip.left,
                top: hoveredSynergyTooltip.top,
              }}
            >
              <div className="text-sm font-semibold text-white">{synergy.label}</div>
              <div className="mt-1 text-xs font-medium text-[#9FB0C8]">
                현재 {synergy.current}/{synergy.max}
              </div>
              <p className="mt-3 text-xs leading-5 text-[#D4DCEC]">{getSynergyDescription(synergy)}</p>
              <div
                className={cn(
                  "absolute top-full h-3 w-3 -translate-y-1/2 rotate-45 border-r border-b border-white/10 bg-[rgba(7,9,14,0.96)]",
                  hoveredSynergyTooltip.placement === "left" && "left-5",
                  hoveredSynergyTooltip.placement === "center" && "left-1/2 -translate-x-1/2",
                  hoveredSynergyTooltip.placement === "right" && "right-5",
                )}
              />
            </div>
          );
        })() : null}

        <section ref={composeSectionRef} className="ui-card overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.1fr)_360px]">
            <div className="p-5 sm:p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2f5fa6]">Compose</div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#202d37]">조합 설명을 쓰고 커뮤니티에 공유하기</h2>
              <p className="mt-2 text-sm text-[#64748b]">5개 포지션을 모두 채우면 글과 함께 저장할 수 있습니다. 저장된 글은 아래 피드에서 좋아요와 댓글을 받을 수 있습니다.</p>

              <div className="mt-5 space-y-4">
                <input
                  className="ui-input"
                  placeholder="예: 15달러 안에서 맞춘 가장 공격적인 조합"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
                <textarea
                  className="ui-textarea"
                  placeholder="왜 이 조합을 골랐는지, 운영 포인트나 한타 기대값을 적어 주세요."
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                />
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={savePost} disabled={isSaving} className="ui-action-primary disabled:opacity-60">
                    {isSaving ? "저장 중..." : "게시글 저장"}
                  </button>
                  <button
                    type="button"
                    onClick={() => copySelectionLink(encodedSelection, { syncUrl: true, successMessage: "작성 중인 조합 링크를 복사했습니다." })}
                    className="ui-action-secondary"
                  >
                    작성 중 조합 공유
                  </button>
                </div>
                {!viewer.isAuthenticated ? <p className="rounded-2xl border border-[#d6deea] bg-[#f7f9fc] px-4 py-3 text-sm text-[#64748b]">게시글 저장과 커뮤니티 반응 기능은 로그인 후 사용할 수 있습니다.</p> : null}
                {viewer.isAuthenticated && !viewer.hasNickname ? <p className="rounded-2xl border border-[#d6deea] bg-[#f7f9fc] px-4 py-3 text-sm text-[#64748b]">게시글과 댓글을 남기려면 닉네임을 먼저 설정해 주세요.</p> : null}
                {saveError ? <p className="rounded-2xl border border-[#f4c8c0] bg-[#fff5f2] px-4 py-3 text-sm text-[#9f4c3e]">{saveError}</p> : null}
                {notice ? <p className="rounded-2xl border border-[#d6deea] bg-[#f7f9fc] px-4 py-3 text-sm text-[#64748b]">{notice}</p> : null}
              </div>
            </div>

            <div className="border-t border-[#edf1f6] bg-[linear-gradient(180deg,#f8fafc_0%,#eef3f7_100%)] p-5 sm:p-6 lg:border-l lg:border-t-0">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2f5fa6]">Preview</div>
              <div className="mt-4 rounded-[24px] border border-[#dde5ef] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7b8ba0]">My 15 Dollar Roster</div>
                <div className="mt-2 text-xl font-black tracking-[-0.04em] text-[#202d37]">{title || "제목을 입력하면 여기에서 미리 볼 수 있습니다."}</div>
                <p className="mt-2 text-sm text-[#64748b]">{body || "조합 설명을 적으면 게시글 카드가 어떻게 보이는지 바로 확인할 수 있습니다."}</p>
                <div className="mt-4 space-y-2">
                  {CHALLENGE_POSITIONS.map((position) => {
                    const playerId = selection[position];
                    const player = playerId ? PLAYERS_BY_ID.get(playerId) : undefined;
                    const priceTheme = player ? PRICE_THEMES[player.price] : null;
                    return (
                      <div key={position} className="grid grid-cols-[56px_minmax(0,1fr)_48px] items-center rounded-2xl border border-[#e4eaf2] bg-[#f9fbfd] px-3 py-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7b8ba0]">{POSITION_META[position].short}</div>
                        <div className="truncate text-sm font-bold text-[#202d37]">{player ? player.name : "미선택"}</div>
                        <div className={cn("text-right text-sm font-black", player ? priceTheme?.lightText : "text-[#7b8ba0]")}>{player ? `$${player.price}` : "-"}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="ui-card p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#2f5fa6]">Community Feed</div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#202d37]">좋아요와 댓글이 달리는 챌린지 피드</h2>
            </div>
            <div className="rounded-full border border-[#d8e0ea] bg-[#f7f9fc] px-4 py-2 text-sm font-semibold text-[#64748b]">게시글 {posts.length}개</div>
          </div>

          {posts.length === 0 ? (
            <div className="ui-empty mt-5">아직 저장된 조합이 없습니다. 첫 번째 챌린지 글을 남겨 보세요.</div>
          ) : (
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {posts.map((post) => {
                const isExpanded = expandedPosts[post.id] ?? false;

                return (
                  <article key={post.id} className="rounded-[26px] border border-[#dde5ef] bg-[linear-gradient(180deg,#ffffff_0%,#f9fbfd_100%)] p-4 shadow-[0_18px_34px_rgba(15,23,42,0.06)]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2f5fa6]">{post.authorNickname}</div>
                        <h3 className="mt-1 text-xl font-black tracking-[-0.04em] text-[#202d37]">{post.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-[#64748b]">{post.body}</p>
                      </div>
                      <div className="rounded-2xl border border-[#e1e8f0] bg-white px-3 py-2 text-right">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7b8ba0]">Budget</div>
                        <div className="text-lg font-black text-[#202d37]">${post.usedBudget}</div>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {post.slots.map((slot) => {
                        const priceTheme = PRICE_THEMES[slot.price];
                        return (
                          <div key={`${post.id}-${slot.position}`} className={cn("rounded-2xl border px-3 py-3", priceTheme.ring, priceTheme.soft)}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748b]">{POSITION_META[slot.position].short}</div>
                              <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-bold", priceTheme.chip, priceTheme.lightText)}>${slot.price}</span>
                            </div>
                            <div className="mt-2 text-sm font-black text-[#202d37]">{slot.playerName}</div>
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-[#64748b]">
                              <TeamLogo team={slot.team} className="h-3.5 w-3.5" />
                              <span>{slot.team}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1f6] pt-4">
                      <div className="text-xs text-[#7b8ba0]">{formatCreatedAt(post.createdAt)}</div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => loadPost(post)}
                          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#d8e0ea] bg-white px-4 text-sm font-semibold text-[#44566c] transition hover:border-[#b6c8e6] hover:bg-[#f7fbff]"
                        >
                          조합 불러오기
                        </button>
                        <button
                          type="button"
                          onClick={() => copySelectionLink(post.encodedSelection, { successMessage: "이 게시글 조합 링크를 복사했습니다." })}
                          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#d8e0ea] bg-white px-4 text-sm font-semibold text-[#44566c] transition hover:border-[#b6c8e6] hover:bg-[#f7fbff]"
                        >
                          공유
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleLike(post.id)}
                        disabled={pendingLikePostId === post.id}
                        className={cn(
                          "inline-flex min-h-10 items-center justify-center rounded-xl border px-4 text-sm font-semibold transition",
                          post.likedByMe
                            ? "border-[#2f5fa6]/25 bg-[#edf5ff] text-[#2f5fa6]"
                            : "border-[#d8e0ea] bg-white text-[#44566c] hover:border-[#b6c8e6] hover:bg-[#f7fbff]",
                        )}
                      >
                        {post.likedByMe ? "좋아요 취소" : "좋아요"} {post.likeCount}
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedPosts((current) => ({ ...current, [post.id]: !isExpanded }))}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#d8e0ea] bg-white px-4 text-sm font-semibold text-[#44566c] transition hover:border-[#b6c8e6] hover:bg-[#f7fbff]"
                      >
                        댓글 {post.commentCount}
                      </button>
                    </div>

                    {postErrors[post.id] ? <p className="mt-3 rounded-2xl border border-[#f4c8c0] bg-[#fff5f2] px-4 py-3 text-sm text-[#9f4c3e]">{postErrors[post.id]}</p> : null}

                    {isExpanded ? (
                      <div className="mt-4 rounded-[22px] border border-[#edf1f6] bg-[#f8fafc] p-4">
                        <div className="space-y-3">
                          {post.comments.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-[#d8e0ea] bg-white px-4 py-5 text-center text-sm text-[#7b8ba0]">아직 댓글이 없습니다. 첫 반응을 남겨 보세요.</div>
                          ) : (
                            post.comments.map((comment) => (
                              <div key={comment.id} className="rounded-2xl border border-[#e1e8f0] bg-white px-4 py-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="text-sm font-bold text-[#202d37]">{comment.authorNickname}</div>
                                  <div className="text-xs text-[#7b8ba0]">{formatCreatedAt(comment.createdAt)}</div>
                                </div>
                                <p className="mt-2 text-sm leading-6 text-[#64748b]">{comment.body}</p>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="mt-4 space-y-3">
                          <textarea
                            className="ui-textarea min-h-[88px]"
                            placeholder={
                              !viewer.isAuthenticated
                                ? "댓글은 로그인 후 작성할 수 있습니다."
                                : !viewer.hasNickname
                                  ? "댓글을 남기려면 닉네임을 먼저 설정해 주세요."
                                  : "이 조합에 대한 생각을 남겨 주세요."
                            }
                            value={commentDrafts[post.id] ?? ""}
                            onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                            disabled={!viewer.isAuthenticated || !viewer.hasNickname}
                          />
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-xs text-[#7b8ba0]">최대 180자까지 입력할 수 있습니다.</div>
                            <button
                              type="button"
                              onClick={() => submitComment(post.id)}
                              disabled={pendingCommentPostId === post.id || !viewer.isAuthenticated || !viewer.hasNickname}
                              className="ui-action-primary disabled:opacity-60"
                            >
                              {pendingCommentPostId === post.id ? "댓글 저장 중..." : "댓글 남기기"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}


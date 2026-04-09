'use client';

import Image from "next/image";
import { useMemo, useRef, useState } from "react";

import { CopyRosterImageButton } from "@/components/games/CopyRosterImageButton";
import { cn } from "@/components/lol-rating/utils";
import { budgetChallengeConfig, budgetChallengePlayers } from "@/lib/games/budget-challenge-data";
import type {
  ChallengePlayer,
  ChallengePosition,
  ChallengeSelection,
  SelectionFailureReason,
} from "@/lib/games/budget-challenge-types";
import { CHALLENGE_POSITIONS } from "@/lib/games/budget-challenge-types";
import { canSelectPlayer, createChallengeSummary, decodeSelection, encodeSelection } from "@/lib/games/budget-challenge-utils";

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
type SpecialTraitId = "veteran" | "rookie" | "winner" | "mvp" | "goat" | "lpl_return" | "super_rookie" | "national_team";
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
  mvp: { label: "MVP", iconText: "M" },
  goat: { label: "GOAT", iconText: "G" },
  lpl_return: { label: "LPL 리턴", iconText: "L" },
  super_rookie: { label: "슈퍼루키", iconText: "S" },
  national_team: { label: "국가대표", iconText: "N" },
};

const PLAYER_SPECIAL_TRAITS: Partial<Record<string, SpecialTraitId[]>> = {
  aiming: ["veteran"],
  bdd: ["veteran"],
  canyon: ["veteran", "winner", "mvp"],
  career: ["rookie"],
  casting: ["rookie"],
  chovy: ["veteran", "winner", "mvp", "national_team"],
  cuzz: ["veteran"],
  delight: ["winner"],
  diable: ["rookie", "super_rookie"],
  doran: ["veteran", "winner"],
  duro: ["rookie", "winner"],
  effort: ["veteran"],
  faker: ["veteran", "winner", "mvp", "goat", "national_team"],
  gumayusi: ["winner", "mvp"],
  kanavi: ["veteran", "lpl_return", "national_team"],
  keria: ["winner", "super_rookie", "national_team"],
  kiin: ["veteran", "winner", "national_team"],
  kingen: ["veteran", "winner", "mvp"],
  lazyfeel: ["rookie"],
  lehends: ["veteran", "winner", "mvp"],
  life: ["veteran"],
  lucid: ["super_rookie"],
  namgung: ["rookie"],
  oner: ["winner"],
  peyz: ["winner", "lpl_return", "super_rookie"],
  pollu: ["rookie"],
  pyosik: ["winner"],
  raptor: ["rookie"],
  ruler: ["veteran", "winner", "mvp", "lpl_return", "national_team"],
  scout: ["veteran", "winner", "mvp", "lpl_return"],
  showmaker: ["veteran", "winner", "super_rookie"],
  siwoo: ["rookie"],
  smash: ["rookie"],
  taeyoon: ["lpl_return"],
  teddy: ["veteran"],
  ucal: ["veteran"],
  vicla: ["super_rookie"],
  zeka: ["winner", "mvp"],
  zeus: ["winner", "mvp", "national_team"],
};

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
    const teamDescriptions: Record<string, string> = {
      T1: "불멸의 왕조",
      GEN: "체급의 젠지",
      HLE: "오렌지전차군단",
      DK: "담원의 유산",
      KT: "롤러코스터 올라갑니다",
      KRX: "중꺾마의 상징",
      DNS: "동부의 맹주",
      NS: "라면은 역시",
      BRO: "거함킬러",
      BFX: "모래폭풍이 온다",
    };

    return teamDescriptions[synergy.team] ?? `${synergy.team} 팀 시너지`;
  }

  if (synergy.id === "veteran") {
    return "수많은 전장을 건너온 자. 흔들림 없는 판단과 경험으로 게임의 무게를 지탱한다.";
  }

  if (synergy.id === "rookie") {
    return "아직 거칠지만 두려움 없는 칼날. 판을 흔드는 패기로 존재를 각인시킨다.";
  }

  if (synergy.id === "winner") {
    return "세계의 끝에서 증명한 자. 가장 큰 무대에서 결국 정상에 선 이름.";
  }

  if (synergy.id === "mvp") {
    return "결승의 심장. 모든 시선이 모인 순간, 승리를 직접 만들어낸 주인공.";
  }

  if (synergy.id === "goat") {
    return "시대를 정의한 기준. 비교가 아니라, 그 자체로 정답이 되는 존재.";
  }

  if (synergy.id === "lpl_return") {
    return "타지에서 단련되고 돌아온 칼날. 더 넓은 전장을 경험한 후 한층 날카로워졌다.";
  }

  if (synergy.id === "super_rookie") {
    return "등장과 동시에 판을 뒤엎는 재능. 미래가 아닌 현재를 위협하는 신인.";
  }

  if (synergy.id === "national_team") {
    return "한 팀이 아닌 한 나라를 짊어진 이름. 승패에 자존심이 걸린 자리의 주인.";
  }

  return "조합 방향성을 보여주는 특성입니다.";
}

export function BudgetChallengePage({
  initialEncodedSelection,
}: {
  initialEncodedSelection?: string;
}) {
  const [selection, setSelection] = useState<ChallengeSelection>(() => sanitizeSelection(initialEncodedSelection));
  const [playerPoolView, setPlayerPoolView] = useState<PlayerPoolView>("name");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const [hoveredTooltip, setHoveredTooltip] = useState<HoveredTooltip | null>(null);
  const [hoveredSynergyTooltip, setHoveredSynergyTooltip] = useState<HoveredSynergyTooltip | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const noticeTimerRef = useRef<number | null>(null);

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
          onMouseEnter={(event) => showPlayerTooltip(player, event.currentTarget)}
          onFocus={(event) => showPlayerTooltip(player, event.currentTarget)}
          onMouseLeave={() => hidePlayerTooltip(player.id)}
          onBlur={() => hidePlayerTooltip(player.id)}
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
            <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-black leading-none text-white sm:text-[11px]">
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
                      조합 링크 복사
                    </button>
                    <CopyRosterImageButton targetRef={resultRef} disabled={!summary.isComplete} />
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

      </div>
    </main>
  );
}


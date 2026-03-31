'use client';

import { startTransition, useRef, useState } from "react";

import { SaveRosterImageButton } from "@/components/games/SaveRosterImageButton";
import { cn } from "@/components/lol-rating/utils";
import { budgetChallengeConfig, budgetChallengePlayers } from "@/lib/games/budget-challenge-data";
import type { BudgetChallengePost, ChallengePlayer, ChallengePosition, ChallengeSelection } from "@/lib/games/budget-challenge-types";
import { CHALLENGE_POSITIONS } from "@/lib/games/budget-challenge-types";
import { canSelectPlayer, createChallengeSummary, decodeSelection, encodeSelection } from "@/lib/games/budget-challenge-utils";

type ViewerState = {
  isAuthenticated: boolean;
  hasNickname: boolean;
  nickname: string | null;
};

const POSITION_META: Record<
  ChallengePosition,
  {
    label: string;
    short: string;
  }
> = {
  TOP: { label: "TOP", short: "TOP" },
  JUNGLE: { label: "JUNGLE", short: "JG" },
  MID: { label: "MID", short: "MID" },
  ADC: { label: "ADC", short: "ADC" },
  SUPPORT: { label: "SUP", short: "SUP" },
};

const BOARD_SLOT_LAYOUT: Record<ChallengePosition, { top: string; left: string }> = {
  TOP: { top: "18%", left: "13%" },
  JUNGLE: { top: "23%", left: "50%" },
  MID: { top: "49%", left: "49%" },
  ADC: { top: "48%", left: "84%" },
  SUPPORT: { top: "74%", left: "76%" },
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

function getPlayersById() {
  return new Map(budgetChallengePlayers.filter((player) => player.active).map((player) => [player.id, player]));
}

function sanitizeSelection(encodedSelection?: string) {
  const decoded = decodeSelection(encodedSelection ?? "");
  const playersById = getPlayersById();

  return Object.entries(decoded).reduce<ChallengeSelection>((acc, [position, playerId]) => {
    if (playerId && playersById.has(playerId)) {
      acc[position as keyof ChallengeSelection] = playerId;
    }
    return acc;
  }, {});
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
  const players = budgetChallengePlayers.filter((player) => player.active);
  const playersById = getPlayersById();
  const [selection, setSelection] = useState<ChallengeSelection>(() => sanitizeSelection(initialEncodedSelection));
  const [posts, setPosts] = useState(initialPosts);
  const [activePosition, setActivePosition] = useState<ChallengePosition | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"price-desc" | "price-asc" | "name">("price-desc");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const saveSectionRef = useRef<HTMLDivElement>(null);

  const summary = createChallengeSummary(budgetChallengeConfig, selection, playersById);
  const encodedSelection = encodeSelection(selection);

  const visiblePlayers = players
    .filter((player) => (activePosition === "ALL" ? true : player.position === activePosition))
    .filter((player) => player.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => {
      if (sortOrder === "name") {
        return a.name.localeCompare(b.name, "en");
      }
      if (sortOrder === "price-asc") {
        return a.price - b.price || a.name.localeCompare(b.name, "en");
      }
      return b.price - a.price || a.name.localeCompare(b.name, "en");
    });

  const priceBoardByPosition = CHALLENGE_POSITIONS.map((position) => ({
    position,
    groups: [5, 4, 3, 2, 1].map((price) => ({
      price,
      players: players
        .filter((player) => player.position === position && player.price === price)
        .sort((a, b) => (a.order ?? 99) - (b.order ?? 99)),
    })),
  }));

  const currentRosterLabel = CHALLENGE_POSITIONS.map((position) => {
    const playerId = selection[position];
    const player = playerId ? playersById.get(playerId) : undefined;
    return `${POSITION_META[position].short} ${player ? player.name : "??"}`;
  }).join(" / ");

  function announce(message: string) {
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 1800);
  }

  async function copyShareLink() {
    const query = encodedSelection ? `?c=${encodeURIComponent(encodedSelection)}` : "";
    const url = `${window.location.origin}/games/15-dollar-challenge${query}`;

    try {
      await navigator.clipboard.writeText(url);
      window.history.replaceState(null, "", `${window.location.pathname}${query}`);
      setShareNotice("공유 링크를 복사했습니다.");
    } catch {
      setShareNotice("링크 복사에 실패했습니다.");
    }

    window.setTimeout(() => setShareNotice(null), 1800);
  }

  function assignPlayer(player: ChallengePlayer) {
    const availability = canSelectPlayer({
      config: budgetChallengeConfig,
      selection,
      playersById,
      player,
    });

    if (!availability.canSelect) {
      announce(availability.reason ?? "선택할 수 없는 선수입니다.");
      return;
    }

    setSelection((current) => ({
      ...current,
      [player.position]: player.id,
    }));
    announce(`${player.position}에 ${player.name}을 배치했습니다.`);
  }

  function removePlayer(position: ChallengePosition) {
    setSelection((current) => {
      const next = { ...current };
      delete next[position];
      return next;
    });
    announce(`${POSITION_META[position].label} 선수를 제거했습니다.`);
  }

  function resetSelection() {
    setSelection({});
    announce("조합을 초기화했습니다.");
  }

  function loadPost(post: BudgetChallengePost) {
    setSelection(sanitizeSelection(post.encodedSelection));
    window.history.replaceState(null, "", `${window.location.pathname}?c=${encodeURIComponent(post.encodedSelection)}`);
    announce(`"${post.title}" 조합을 불러왔습니다.`);
  }

  async function savePost() {
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

      startTransition(() => {
        setPosts((current) => [payload.post!, ...current]);
        setTitle("");
        setBody("");
      });
      announce("게시글로 저장했습니다.");
      window.history.replaceState(null, "", `${window.location.pathname}?c=${encodeURIComponent(payload.post.encodedSelection)}`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "게시글 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#1C1C1F] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-[#161A20] shadow-[0_18px_44px_rgba(2,6,23,0.28)]">
          <div className="border-b border-white/10 bg-[linear-gradient(180deg,#3B82F6_0%,#2563EB_100%)] px-6 py-8 text-[#E6E8EB] sm:px-8">
            <div className="text-center">
              <div className="text-[36px] font-black tracking-[-0.05em] sm:text-[44px]">LCK $15 드림팀 만들기</div>
              <p className="mt-3 text-xl font-semibold text-[#E6E8EB]/90">15달러 안에서 최고의 팀을 구성하세요</p>
            </div>
          </div>

          <div className="px-5 py-5 sm:px-8">
            <div className="flex flex-wrap items-center justify-end gap-3 border-b border-white/10 pb-4">
              <div className="text-2xl font-semibold tracking-[-0.03em] text-[#AAB0B6]">
                남은 예산: <span className="font-black text-[#E6E8EB]">${summary.remainingBudget}</span> / {budgetChallengeConfig.budget}
              </div>
              <button type="button" onClick={resetSelection} className="min-w-28 rounded-xl border border-white/10 bg-[#1C2128] px-6 py-3 text-2xl font-bold text-[#AAB0B6] shadow-sm transition hover:bg-[#232A33] hover:text-[#E6E8EB]">
                리셋
              </button>
              <button
                type="button"
                onClick={() => saveSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="min-w-28 rounded-xl border border-[#3B82F6]/50 bg-[#3B82F6] px-6 py-3 text-2xl font-bold text-[#E6E8EB] shadow-[0_8px_18px_rgba(37,99,235,0.22)] transition hover:bg-[#2563EB]"
              >
                제출
              </button>
            </div>

            <div
              ref={resultRef}
              className="relative mt-6 overflow-hidden rounded-[6px] border border-white/10 bg-[linear-gradient(180deg,#5f7691_0%,#4b6279_18%,#49644f_40%,#3b5441_58%,#30474a_78%,#243a4d_100%)]"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_14%,rgba(255,255,255,0.55),transparent_22%),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.24),transparent_18%),radial-gradient(circle_at_51%_57%,rgba(171,220,146,0.30),transparent_18%),linear-gradient(135deg,rgba(245,245,245,0.2),transparent_28%,rgba(255,255,255,0.05)_48%,rgba(39,67,40,0.18)_72%)]" />
              <div className="absolute inset-[3.5%] rounded-[4px] border border-white/20" />
              <div className="absolute left-[17%] top-[16%] h-[59%] w-[9%] rounded-full bg-[#c5b98b]/55 blur-[1px] rotate-[-41deg]" />
              <div className="absolute left-[32%] top-[29%] h-[43%] w-[8%] rounded-full bg-[#d0c693]/60 blur-[1px] rotate-[-40deg]" />
              <div className="absolute left-[45%] top-[44%] h-[28%] w-[7%] rounded-full bg-[#d4ca98]/60 blur-[1px] rotate-[-39deg]" />
              <div className="absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(180deg,rgba(11,29,54,0.02)_0%,rgba(13,29,51,0.80)_100%)]" />

              <div className="relative aspect-[1.65/1] min-h-[420px] w-full">
                {CHALLENGE_POSITIONS.map((position) => {
                  const playerId = selection[position];
                  const player = playerId ? playersById.get(playerId) : undefined;
                  const meta = POSITION_META[position];
                  const layout = BOARD_SLOT_LAYOUT[position];

                  return (
                    <button
                      key={position}
                      type="button"
                      onClick={() => setActivePosition(position)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const playerIdFromDrag = event.dataTransfer.getData("text/plain");
                        const draggedPlayer = playersById.get(playerIdFromDrag);
                        if (!draggedPlayer || draggedPlayer.position !== position) {
                          return;
                        }
                        assignPlayer(draggedPlayer);
                      }}
                      className="absolute w-[172px] -translate-x-1/2 -translate-y-1/2 rounded-[6px] border border-white/10 bg-[#1C2128] p-3 text-center shadow-[0_5px_14px_rgba(2,6,23,0.34)] transition hover:-translate-y-[52%]"
                      style={{ top: layout.top, left: layout.left }}
                    >
                      <div className="border-b border-white/10 pb-2 text-[26px] font-black tracking-[-0.03em] text-[#E6E8EB]">{meta.label}</div>
                      {player ? (
                        <div className="pt-3">
                          <div className="text-[24px] font-bold text-[#E6E8EB]">{player.name}</div>
                          <div className="mt-1 text-[22px] font-black text-[#E6E8EB]">${player.price}</div>
                          <div className="mt-3 flex justify-center gap-2">
                            <span className="rounded-md border border-[#3B82F6]/40 bg-[rgba(59,130,246,0.18)] px-2 py-1 text-sm font-semibold text-[#E6E8EB]">선택됨</span>
                            <span
                              onClick={(event) => {
                                event.stopPropagation();
                                removePlayer(position);
                              }}
                              className="rounded-md border border-white/10 bg-[#232A33] px-2 py-1 text-sm font-semibold text-[#AAB0B6]"
                            >
                              제거
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-3 text-[24px] font-bold text-[#AAB0B6]">+ 선수 선택</div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="relative z-10 flex min-h-14 items-center justify-center px-6 py-3 text-center text-[17px] font-black tracking-[-0.03em] text-[#E6E8EB]">
                현재 팀: {currentRosterLabel}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-y border-white/10 py-4">
              <div className="flex flex-wrap gap-3">
                <select
                  className="ui-select max-w-[180px] rounded-lg text-lg font-semibold"
                  value={activePosition}
                  onChange={(event) => setActivePosition(event.target.value as ChallengePosition | "ALL")}
                >
                  <option value="ALL">포지션 필터</option>
                  {CHALLENGE_POSITIONS.map((position) => (
                    <option key={position} value={position}>
                      {POSITION_META[position].label}
                    </option>
                  ))}
                </select>
                <select
                  className="ui-select max-w-[180px] rounded-lg text-lg font-semibold"
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value as "price-desc" | "price-asc" | "name")}
                >
                  <option value="price-desc">고가순</option>
                  <option value="price-asc">저가순</option>
                  <option value="name">이름순</option>
                </select>
              </div>

              <div className="flex w-full max-w-[260px] items-center rounded-lg border border-white/10 bg-[#1C2128] px-3">
                <span className="text-xl text-[#6B7280]">⌕</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="선수 검색..."
                  className="h-12 w-full border-0 bg-transparent px-2 text-lg text-[#E6E8EB] outline-none placeholder:text-[#6B7280]"
                />
              </div>
            </div>

            <div className="mt-5">
              <h2 className="text-[26px] font-black tracking-[-0.04em] text-[#E6E8EB]">선수 카드 선택</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                {visiblePlayers.map((player) => {
                  const availability = canSelectPlayer({
                    config: budgetChallengeConfig,
                    selection,
                    playersById,
                    player,
                  });
                  const isSelected = selection[player.position] === player.id;

                  return (
                    <article
                      key={player.id}
                      draggable
                      onDragStart={(event) => event.dataTransfer.setData("text/plain", player.id)}
                      className={cn(
                        "overflow-hidden rounded-[6px] border bg-[#1C2128] shadow-[0_5px_14px_rgba(2,6,23,0.3)]",
                        isSelected ? "border-[#3B82F6]/60" : "border-white/10",
                      )}
                    >
                      <div className="flex h-44 items-end justify-center bg-[linear-gradient(180deg,#2a313b_0%,#252c35_60%,#212832_100%)]">
                        <div className="mb-5 h-28 w-24 rounded-t-[46px] rounded-b-[18px] bg-[linear-gradient(180deg,#b7bcc5_0%,#8e959f_100%)]" />
                      </div>
                      <div className="bg-[linear-gradient(180deg,#3b4654_0%,#323c49_100%)] px-3 py-2 text-center text-[20px] font-black text-[#E6E8EB]">
                        {player.name}
                      </div>
                      <div className="py-3 text-center">
                        <div className="text-[21px] font-black text-[#E6E8EB]">${player.price}</div>
                      </div>
                      <div className="px-3 pb-3">
                        <button
                          type="button"
                          onClick={() => assignPlayer(player)}
                          disabled={!availability.canSelect && !isSelected}
                          className={cn(
                            "w-full rounded-[6px] border px-3 py-3 text-[22px] font-black transition",
                            isSelected
                              ? "border-[#3B82F6]/60 bg-[#3B82F6] text-[#E6E8EB]"
                              : availability.canSelect
                                ? "border-[#3B82F6]/60 bg-[#3B82F6] text-[#E6E8EB] hover:bg-[#2563EB]"
                                : "border-white/10 bg-[#232A33] text-[#6B7280]",
                          )}
                        >
                          {isSelected ? "선택됨" : "선택"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="ui-card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3B82F6]">Price Board</div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#E6E8EB]">포지션별 선수별 가격표</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <SaveRosterImageButton targetRef={resultRef} disabled={!summary.isComplete} />
              <button type="button" onClick={copyShareLink} className="ui-action-secondary">
                조합 링크 복사
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {priceBoardByPosition.map((section) => (
              <section key={section.position} className="ui-subtle-panel overflow-hidden">
                <div className="border-b border-white/10 bg-[#1C2128] px-4 py-3 text-[#E6E8EB]">
                  <div className="text-xl font-black tracking-[-0.04em]">{POSITION_META[section.position].label}</div>
                </div>
                <div className="space-y-3 p-3">
                  {section.groups.map((group) => (
                    <div key={`${section.position}-${group.price}`} className="rounded-2xl border border-white/10 bg-[#161A20] p-3">
                      <div className="mb-2 text-sm font-black text-[#E6E8EB]">${group.price}</div>
                      <div className="flex flex-wrap gap-2">
                        {group.players.map((player) => (
                          <span key={player.id} className="rounded-full border border-white/10 bg-[#1C2128] px-3 py-1.5 text-sm font-semibold text-[#AAB0B6]">
                            {player.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {feedback ? <p className="mt-4 rounded-2xl border border-[#3B82F6]/35 bg-[rgba(59,130,246,0.12)] px-4 py-3 text-sm font-medium text-[#AAB0B6]">{feedback}</p> : null}
          {shareNotice ? <p className="mt-4 rounded-2xl border border-[#3B82F6]/35 bg-[rgba(59,130,246,0.12)] px-4 py-3 text-sm font-medium text-[#AAB0B6]">{shareNotice}</p> : null}
        </section>

        <section ref={saveSectionRef} className="ui-card p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3B82F6]">Post Save</div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#E6E8EB]">완성 조합을 게시글로 저장</h2>
            </div>
            <div className="rounded-full border border-white/10 bg-[#1C2128] px-4 py-2 text-sm font-semibold text-[#AAB0B6]">
              저장 조건: 5개 포지션 완성
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="space-y-4">
              <input className="ui-input" placeholder="예: 15달러 안에서 만든 최고의 조합" value={title} onChange={(event) => setTitle(event.target.value)} />
              <textarea className="ui-textarea" placeholder="이 조합을 고른 이유를 적어 주세요." value={body} onChange={(event) => setBody(event.target.value)} />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={savePost} disabled={isSaving} className="ui-action-primary disabled:opacity-60">
                  {isSaving ? "저장 중..." : "게시글 저장"}
                </button>
              </div>
              {!viewer.isAuthenticated ? <p className="rounded-2xl border border-[#3B82F6]/35 bg-[rgba(59,130,246,0.12)] px-4 py-3 text-sm text-[#AAB0B6]">게시글 저장은 로그인 후 가능합니다.</p> : null}
              {viewer.isAuthenticated && !viewer.hasNickname ? <p className="rounded-2xl border border-[#3B82F6]/35 bg-[rgba(59,130,246,0.12)] px-4 py-3 text-sm text-[#AAB0B6]">게시글 저장 전 닉네임을 먼저 설정해 주세요.</p> : null}
              {saveError ? <p className="rounded-2xl border border-[#3B82F6]/35 bg-[rgba(59,130,246,0.12)] px-4 py-3 text-sm text-[#AAB0B6]">{saveError}</p> : null}
            </div>

            <div className="ui-subtle-panel p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6B7280]">Preview</div>
              <div className="mt-3 rounded-[24px] border border-white/10 bg-[linear-gradient(160deg,#161A20_0%,#1C2128_60%,#141920_100%)] p-4 text-[#E6E8EB]">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#AAB0B6]">MY COMPLETED ROSTER</div>
                <div className="mt-2 text-xl font-black tracking-[-0.04em]">{title || "제목을 입력하면 여기에 표시됩니다."}</div>
                <div className="mt-1 text-sm text-slate-300">{body || "조합 설명을 입력하면 게시글 미리보기가 완성됩니다."}</div>
                <div className="mt-4 space-y-2">
                  {CHALLENGE_POSITIONS.map((position) => {
                    const playerId = selection[position];
                    const player = playerId ? playersById.get(playerId) : undefined;
                    return (
                      <div key={position} className="grid grid-cols-[68px_minmax(0,1fr)_48px] items-center rounded-2xl border border-white/10 bg-[#1C2128] px-3 py-2">
                        <div className="text-xs font-semibold tracking-[0.16em] text-slate-300">{POSITION_META[position].short}</div>
                        <div className="truncate text-sm font-bold">{player ? player.name : "미선택"}</div>
                        <div className="text-right text-sm font-bold">{player ? `$${player.price}` : "-"}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="ui-card p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3B82F6]">Community Feed</div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#E6E8EB]">저장된 챌린지 게시글</h2>
            </div>
            <div className="rounded-full border border-white/10 bg-[#1C2128] px-4 py-2 text-sm font-semibold text-[#AAB0B6]">
              게시글 {posts.length}개
            </div>
          </div>

          {posts.length === 0 ? (
            <div className="ui-empty mt-5">아직 저장된 게시글이 없습니다.</div>
          ) : (
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {posts.map((post) => (
                <article key={post.id} className="rounded-[24px] border border-white/10 bg-[#1C2128] p-4 shadow-[0_14px_34px_rgba(2,6,23,0.22)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#3B82F6]">{post.authorNickname}</div>
                      <h3 className="mt-1 text-xl font-black tracking-[-0.04em] text-[#E6E8EB]">{post.title}</h3>
                      <p className="mt-2 text-sm text-[#AAB0B6]">{post.body}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-[#161A20] px-3 py-2 text-right">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">Budget</div>
                      <div className="text-base font-black text-[#E6E8EB]">${post.usedBudget}</div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {post.slots.map((slot) => (
                      <div key={`${post.id}-${slot.position}`} className="rounded-2xl border border-white/10 bg-[#161A20] px-3 py-2">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">{POSITION_META[slot.position].short}</div>
                        <div className="mt-1 text-sm font-black text-[#E6E8EB]">{slot.playerName}</div>
                        <div className="mt-1 text-xs text-[#AAB0B6]">${slot.price}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-[#6B7280]">{formatCreatedAt(post.createdAt)}</div>
                    <button type="button" onClick={() => loadPost(post)} className="ui-action-secondary">
                      이 조합 불러오기
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

'use client';

import { useMemo, useRef } from "react";

import { BudgetSummaryBar } from "@/components/games/BudgetSummaryBar";
import { ChallengeResultCard } from "@/components/games/ChallengeResultCard";
import { PositionSection } from "@/components/games/PositionSection";
import { useBudgetChallenge } from "@/components/games/useBudgetChallenge";
import { cn } from "@/components/lol-rating/utils";
import { budgetChallengeConfig, budgetChallengePlayers } from "@/lib/games/budget-challenge-data";
import type { ChallengeSelection } from "@/lib/games/budget-challenge-types";
import { CHALLENGE_POSITIONS } from "@/lib/games/budget-challenge-types";
import { decodeSelection, encodeSelection } from "@/lib/games/budget-challenge-utils";

export function BudgetChallengePage({ initialEncodedSelection }: { initialEncodedSelection?: string }) {
  const config = budgetChallengeConfig;
  const players = useMemo(() => budgetChallengePlayers.filter((player) => player.active), []);
  const resultRef = useRef<HTMLDivElement>(null);
  const initialSelection = useMemo(() => {
    const decoded = decodeSelection(initialEncodedSelection ?? "");
    const validPlayerIds = new Set(players.map((player) => player.id));
    return Object.entries(decoded).reduce<ChallengeSelection>((acc, [position, playerId]) => {
      if (playerId && validPlayerIds.has(playerId)) {
        acc[position as keyof ChallengeSelection] = playerId;
      }
      return acc;
    }, {});
  }, [initialEncodedSelection, players]);

  const {
    selection,
    summary,
    playersById,
    getSelectionAvailability,
    togglePlayer,
    resetSelection,
  } = useBudgetChallenge({
    config,
    players,
    initialSelection,
  });

  const playersByPosition = useMemo(() => {
    return CHALLENGE_POSITIONS.reduce<Record<string, typeof players>>((acc, position) => {
      acc[position] = players
        .filter((player) => player.position === position)
        .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
      return acc;
    }, {});
  }, [players]);

  const copyShareLink = async () => {
    const encoded = encodeSelection(selection);
    const query = encoded ? `?c=${encodeURIComponent(encoded)}` : "";
    const url = `${window.location.origin}/games/15-dollar-challenge${query}`;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      const nextUrl = `${window.location.pathname}${query}`;
      window.history.replaceState(null, "", nextUrl);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <main className="app-shell px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_16px_44px_rgba(15,23,42,0.07)] sm:p-6">

          <h1 className="text-[28px] font-black tracking-[-0.04em] text-slate-950">{config.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{config.description}</p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700">총 예산 ${config.budget}</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700">포지션별 1명 선택</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-700">이미지 저장 가능</span>
          </div>
        </section>

        <BudgetSummaryBar
          selection={selection}
          playersById={playersById}
          summary={summary}
          budget={config.budget}
          onReset={resetSelection}
        />

        <div className="space-y-4">
          {CHALLENGE_POSITIONS.map((position) => (
            <PositionSection
              key={position}
              position={position}
              players={playersByPosition[position]}
              selectedPlayerId={selection[position]}
              getAvailability={getSelectionAvailability}
              onSelect={togglePlayer}
            />
          ))}
        </div>

        <ChallengeResultCard
          config={config}
          selection={selection}
          playersById={playersById}
          usedBudget={summary.usedBudget}
          isComplete={summary.isComplete}
          resultRef={resultRef}
          onCopyLink={copyShareLink}
        />

        <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <div className="font-semibold text-slate-900">친구와 조합을 비교해보세요.</div>
          <p className="mt-1">
            지금은 로컬 저장 기반 v1입니다. 이후 인기 픽 통계, 시즌 버전, 팀 단위 버전을 붙일 수 있도록 구조를 분리했습니다.
          </p>
          <div className={cn("mt-2 text-xs text-slate-500")}>공유 링크에는 현재 선택 조합만 포함됩니다.</div>
        </section>
      </div>
    </main>
  );
}

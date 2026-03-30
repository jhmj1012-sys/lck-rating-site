'use client';

import { CHALLENGE_POSITIONS, type ChallengePlayer, type ChallengeResultSummary, type ChallengeSelection } from "@/lib/games/budget-challenge-types";
import { cn } from "@/components/lol-rating/utils";

export function BudgetSummaryBar({
  selection,
  playersById,
  summary,
  budget,
  onReset,
}: {
  selection: ChallengeSelection;
  playersById: Map<string, ChallengePlayer>;
  summary: ChallengeResultSummary;
  budget: number;
  onReset: () => void;
}) {
  return (
    <section className="sticky top-3 z-30 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-[0_12px_26px_rgba(15,23,42,0.08)] backdrop-blur sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-700">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">남은 금액 ${summary.remainingBudget}</span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">사용 금액 ${summary.usedBudget}</span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">선택 {summary.selectedCount}/{summary.requiredCount}</span>
          <span
            className={cn(
              "rounded-full border px-3 py-1.5",
              summary.isComplete
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-amber-300 bg-amber-50 text-amber-700",
            )}
          >
            {summary.isComplete ? "팀 완성" : "팀 완성 전"}
          </span>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex min-h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          초기화
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {CHALLENGE_POSITIONS.map((position) => {
          const playerId = selection[position];
          const player = playerId ? playersById.get(playerId) : undefined;

          return (
            <div key={position} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{position}</div>
              <div className="mt-1 truncate text-sm font-bold text-slate-900">{player?.shortLabel ?? "-"}</div>
              <div className="text-xs text-slate-500">{player ? `$${player.price}` : "미선택"}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-[11px] text-slate-500">Budget: ${summary.usedBudget} / ${budget}</div>
    </section>
  );
}

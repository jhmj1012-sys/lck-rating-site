'use client';

import { PlayerBudgetCard } from "@/components/games/PlayerBudgetCard";
import type { ChallengePlayer, ChallengePosition, SelectionFailureReason } from "@/lib/games/budget-challenge-types";

export function PositionSection({
  position,
  players,
  selectedPlayerId,
  getAvailability,
  onSelect,
}: {
  position: ChallengePosition;
  players: ChallengePlayer[];
  selectedPlayerId?: string;
  getAvailability: (player: ChallengePlayer) => { canSelect: boolean; reason?: SelectionFailureReason };
  onSelect: (player: ChallengePlayer) => void;
}) {
  return (
    <section className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13px] font-bold uppercase tracking-[0.2em] text-slate-500">{position}</h3>
        <span className="text-xs font-semibold text-slate-500">{selectedPlayerId ? "1/1 선택" : "미선택"}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {players.map((player) => {
          const selected = selectedPlayerId === player.id;
          const availability = getAvailability(player);

          return (
            <PlayerBudgetCard
              key={player.id}
              player={player}
              selected={selected}
              disabled={!availability.canSelect}
              disabledReason={availability.reason}
              onClick={() => onSelect(player)}
            />
          );
        })}
      </div>
    </section>
  );
}

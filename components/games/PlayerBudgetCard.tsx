'use client';

import Image from "next/image";

import { cn } from "@/components/lol-rating/utils";
import type { ChallengePlayer, SelectionFailureReason } from "@/lib/games/budget-challenge-types";

export function PlayerBudgetCard({
  player,
  selected,
  disabled,
  disabledReason,
  onClick,
}: {
  player: ChallengePlayer;
  selected: boolean;
  disabled: boolean;
  disabledReason?: SelectionFailureReason;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled && !selected}
      className={cn(
        "group relative rounded-2xl border px-3 py-3 text-left transition sm:px-4",
        selected
          ? "border-sky-300 bg-sky-50/80 shadow-[0_8px_22px_rgba(14,165,233,0.18)]"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
        disabled && !selected ? "cursor-not-allowed opacity-45" : "cursor-pointer",
      )}
      title={!selected && disabledReason ? disabledReason : undefined}
    >
      <div className="flex items-start gap-3">
        <span className="relative mt-0.5 h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          <Image
            src={player.image}
            alt={`${player.name} image`}
            fill
            sizes="44px"
            className="object-cover"
          />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-[15px] font-black tracking-[-0.02em] text-slate-950">{player.name}</div>
              <div className="mt-0.5 text-xs font-medium text-slate-500">{player.team}</div>
            </div>
            <span
              className={cn(
                "inline-flex rounded-full border px-2 py-1 text-xs font-bold",
                selected ? "border-sky-300 bg-white text-sky-700" : "border-slate-200 bg-slate-50 text-slate-700",
              )}
            >
              ${player.price}
            </span>
          </div>
          <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{player.position}</div>
          {!selected && disabledReason ? (
            <div className="mt-1.5 text-xs font-medium text-rose-600">{disabledReason}</div>
          ) : null}
        </div>
      </div>
      {selected ? (
        <span className="absolute right-3 top-3 inline-flex rounded-full border border-sky-300 bg-white px-2 py-0.5 text-[10px] font-bold text-sky-700">
          선택됨
        </span>
      ) : null}
    </button>
  );
}

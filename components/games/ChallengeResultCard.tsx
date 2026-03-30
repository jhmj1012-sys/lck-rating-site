'use client';

import { useState } from "react";

import { SaveRosterImageButton } from "@/components/games/SaveRosterImageButton";
import { CHALLENGE_POSITIONS, type ChallengeConfig, type ChallengePlayer, type ChallengeSelection } from "@/lib/games/budget-challenge-types";

export function ChallengeResultCard({
  config,
  selection,
  playersById,
  usedBudget,
  isComplete,
  resultRef,
  onCopyLink,
}: {
  config: ChallengeConfig;
  selection: ChallengeSelection;
  playersById: Map<string, ChallengePlayer>;
  usedBudget: number;
  isComplete: boolean;
  resultRef: React.RefObject<HTMLDivElement | null>;
  onCopyLink: () => Promise<boolean>;
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const handleCopy = async () => {
    setCopyError(false);
    const success = await onCopyLink();
    if (!success) {
      setCopyError(true);
      return;
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>

          <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-slate-950">당신의 15달러 베스트 5는?</h2>
          <p className="mt-2 text-sm text-slate-600">가성비 vs 슈퍼팀, 당신의 선택을 이미지로 저장하고 공유해보세요.</p>
        </div>
        <div className="flex items-center gap-2">
          <SaveRosterImageButton targetRef={resultRef} disabled={!isComplete} />
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            링크 복사
          </button>
        </div>
      </div>
      <div className="mt-2 h-5 text-xs">
        {copied ? <span className="text-sky-700">공유 링크를 복사했습니다.</span> : null}
        {copyError ? <span className="text-rose-600">링크 복사에 실패했습니다.</span> : null}
      </div>

      <div
        ref={resultRef}
        className="mt-3 rounded-[20px] border border-slate-200 bg-[linear-gradient(160deg,#0f172a_0%,#1e293b_65%,#111827_100%)] p-5 text-white"
      >
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">MY $15 ROSTER</div>
        <div className="mt-1 text-2xl font-black tracking-[-0.02em]">15달러 챌린지</div>

        <div className="mt-4 grid gap-2">
          {CHALLENGE_POSITIONS.map((position) => {
            const selectedId = selection[position];
            const player = selectedId ? playersById.get(selectedId) : undefined;
            return (
              <div key={position} className="grid grid-cols-[68px_minmax(0,1fr)_48px] items-center rounded-xl border border-white/20 bg-white/5 px-3 py-2">
                <div className="text-xs font-semibold tracking-[0.14em] text-slate-300">{position}</div>
                <div className="truncate text-sm font-bold">{player ? `${player.name} · ${player.team}` : "미선택"}</div>
                <div className="text-right text-sm font-bold">{player ? `$${player.price}` : "-"}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm">
          <span className="font-semibold text-slate-200">Budget</span>
          <span className="font-black">
            ${usedBudget} / ${config.budget}
          </span>
        </div>
        <div className="mt-2 text-right text-[11px] text-slate-300">{config.shareWatermark}</div>
      </div>

      {!isComplete ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          5포지션을 모두 선택하면 이미지 저장 버튼이 활성화됩니다.
        </div>
      ) : null}
    </section>
  );
}

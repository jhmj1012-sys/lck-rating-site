'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { SeasonPredictionDetail } from "./types";

async function postEntry(questionId: string, selectedOptionId: string) {
  const response = await fetch(`/api/season-predictions/${questionId}/entry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selectedOptionId }),
  });

  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? "시즌예측 저장에 실패했습니다.");
  }
}

export function SeasonPredictionEntryForm({ detail }: { detail: SeasonPredictionDetail }) {
  const router = useRouter();
  const [pendingOptionId, setPendingOptionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const getPercent = (option: SeasonPredictionDetail["options"][number]) =>
    detail.status === "resolved" || detail.status === "locked"
      ? option.lockedSharePercent ?? option.sharePercent
      : option.sharePercent;
  const getVoteCount = (option: SeasonPredictionDetail["options"][number]) =>
    detail.status === "resolved" || detail.status === "locked"
      ? option.lockedVoteCount ?? option.voteCount
      : option.voteCount;

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {detail.options.map((option) => {
          const percent = getPercent(option);
          const votes = getVoteCount(option);
          const isMine = detail.myEntry?.selectedOptionId === option.id;
          const isPending = pendingOptionId === option.id;
          return (
            <div
              key={option.id}
              className={
                isMine
                  ? "rounded-[20px] border border-sky-300 bg-sky-50 px-4 py-3"
                  : "rounded-[20px] border border-slate-200 bg-white px-4 py-3"
              }
            >
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-bold text-slate-950">{option.label}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {votes.toLocaleString()}명 선택 · {percent}%
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!detail.canSubmit || Boolean(pendingOptionId)}
                  onClick={async () => {
                    try {
                      setPendingOptionId(option.id);
                      setFeedback(null);
                      await postEntry(detail.id, option.id);
                      setFeedback(`${option.label} 선택이 저장되었습니다.`);
                      router.refresh();
                    } catch (error) {
                      setFeedback(error instanceof Error ? error.message : "시즌예측 저장에 실패했습니다.");
                    } finally {
                      setPendingOptionId(null);
                    }
                  }}
                  className={
                    isMine
                      ? "inline-flex min-h-10 items-center justify-center rounded-xl border border-sky-300 bg-sky-100 px-3 text-sm font-semibold text-sky-700"
                      : "inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                  }
                >
                  {!detail.canSubmit ? "마감" : isPending ? "저장 중..." : isMine ? "Pick 완료" : "Pick"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {detail.myEntry ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          현재 내 선택: {detail.myEntry.selectedOptionLabel}
        </div>
      ) : null}

      {detail.resultLabel ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          결과 확정: {detail.resultLabel}
          {detail.myEntry
            ? ` · 내 결과 ${
                detail.myEntry.hitStatus === "hit"
                  ? "적중"
                  : detail.myEntry.hitStatus === "miss"
                    ? "실패"
                    : "대기"
              }`
            : ""}
        </div>
      ) : null}

      {feedback ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{feedback}</div> : null}
    </div>
  );
}

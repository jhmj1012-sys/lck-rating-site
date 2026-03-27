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
  const [selectedOptionId, setSelectedOptionId] = useState(detail.myEntry?.selectedOptionId ?? "");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {detail.options.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={!detail.canSubmit}
            onClick={() => {
              setSelectedOptionId(option.id);
              setFeedback(null);
            }}
            className={
              selectedOptionId === option.id
                ? "rounded-[24px] border border-sky-300 bg-sky-50 px-4 py-4 text-left"
                : "rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-left"
            }
          >
            <div className="flex items-center justify-between gap-3">
              <div className="font-bold text-slate-950">{option.label}</div>
              <div className="text-sm font-semibold text-slate-500">
                {detail.status === "resolved" || detail.status === "locked"
                  ? `${option.lockedSharePercent ?? option.sharePercent}%`
                  : `${option.sharePercent}%`}
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-100">
              <div
                className={option.isResult ? "h-2 rounded-full bg-emerald-500" : "h-2 rounded-full bg-sky-500"}
                style={{ width: `${detail.status === "resolved" || detail.status === "locked" ? option.lockedSharePercent ?? option.sharePercent : option.sharePercent}%` }}
              />
            </div>
          </button>
        ))}
      </div>

      {detail.myEntry ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          현재 내 선택: {detail.myEntry.selectedOptionLabel}
        </div>
      ) : null}

      {detail.resultLabel ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          결과 확정: {detail.resultLabel}
          {detail.myEntry ? ` · 내 결과 ${detail.myEntry.hitStatus === "hit" ? "적중" : detail.myEntry.hitStatus === "miss" ? "미적중" : "취소"}` : ""}
        </div>
      ) : null}

      {feedback ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{feedback}</div> : null}

      <button
        type="button"
        disabled={!detail.canSubmit || pending || !selectedOptionId}
        onClick={async () => {
          try {
            setPending(true);
            await postEntry(detail.id, selectedOptionId);
            setFeedback("시즌예측이 저장되었습니다.");
            router.refresh();
          } catch (error) {
            setFeedback(error instanceof Error ? error.message : "시즌예측 저장에 실패했습니다.");
          } finally {
            setPending(false);
          }
        }}
        className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-sky-500 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {!detail.canSubmit ? "마감됨" : pending ? "저장 중..." : detail.myEntry ? "선택 수정" : "선택 제출"}
      </button>
    </div>
  );
}

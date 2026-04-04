'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { SeasonPredictionDetail } from "./types";

class EntrySubmitError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "EntrySubmitError";
    this.status = status;
  }
}

async function postEntry(questionId: string, selectedOptionId: string) {
  const response = await fetch(`/api/season-predictions/${questionId}/entry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selectedOptionId }),
  });

  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new EntrySubmitError(response.status, payload.error ?? "시즌예측 저장에 실패했습니다.");
  }
}

export function SeasonPredictionEntryForm({
  detail,
  showMyEntry = true,
}: {
  detail: SeasonPredictionDetail;
  showMyEntry?: boolean;
}) {
  const router = useRouter();
  const [pendingOptionId, setPendingOptionId] = useState<string | null>(null);
  const [savedOptionId, setSavedOptionId] = useState<string | null>(null);

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
          const isSaved = savedOptionId === option.id;

          return (
            <div
              key={option.id}
              className={
                isMine
                  ? "rounded-[20px] border border-[#8B5CF6] bg-[#4A4A59] px-4 py-3"
                  : "rounded-[20px] bg-[#3A3A47] px-4 py-3"
              }
            >
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-base font-semibold text-white">{option.label}</div>
                    <span className="shrink-0 text-base font-black text-white">{percent}%</span>
                  </div>
                  <div className="mt-1.5 h-1 w-full rounded-full bg-[#474756]">
                    <div
                      className={`h-1 rounded-full transition-all ${isMine ? "bg-[#8B5CF6]" : "bg-[#6B7A99]"}`}
                      style={{ width: `${Math.max(percent, percent > 0 ? 2 : 0)}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-[#d6d6e5]">
                    {votes.toLocaleString()}명 선택
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!detail.canSubmit || Boolean(pendingOptionId)}
                  onClick={async () => {
                    try {
                      setPendingOptionId(option.id);
                      setSavedOptionId(null);
                      await postEntry(detail.id, option.id);
                      setSavedOptionId(option.id);
                      router.refresh();
                    } catch (error) {
                      const message = error instanceof Error ? error.message : "시즌예측 저장에 실패했습니다.";

                      if (error instanceof EntrySubmitError && error.status === 401) {
                        const callbackUrl = `${window.location.pathname}${window.location.search}`;
                        router.push(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
                        return;
                      }

                      setSavedOptionId(null);
                      throw new Error(message);
                    } finally {
                      setPendingOptionId(null);
                    }
                  }}
                  className={
                    isMine
                      ? "inline-flex min-h-10 items-center justify-center rounded-xl bg-[#8B5CF6] px-3 text-sm font-semibold !text-[#FFFFFF]"
                      : "inline-flex min-h-10 items-center justify-center rounded-xl bg-[#424254] px-3 text-sm font-semibold !text-[#FFFFFF] disabled:cursor-not-allowed disabled:opacity-60"
                  }
                >
                  {!detail.canSubmit ? "마감" : isPending ? "저장 중..." : isSaved ? "저장" : isMine ? "선택 완료" : "선택"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showMyEntry && detail.myEntry ? (
        <div className="rounded-2xl bg-[#3A3A47] px-4 py-3 text-sm text-[#FFFFFF]">
          현재 내 선택: {detail.myEntry.selectedOptionLabel}
        </div>
      ) : null}

      {detail.resultLabel ? (
        <div className="rounded-2xl bg-[#3A3A47] px-4 py-3 text-sm text-[#FFFFFF]">
          결과 확정: {detail.resultLabel}
          {detail.myEntry
            ? ` · 내 결과 ${
                detail.myEntry.hitStatus === "hit"
                  ? "적중"
                  : detail.myEntry.hitStatus === "miss"
                    ? "미적중"
                    : "대기"
              }`
            : ""}
        </div>
      ) : null}
    </div>
  );
}

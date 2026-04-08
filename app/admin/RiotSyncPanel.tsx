"use client";

import { useState, useTransition } from "react";

import {
  applyAllRiotResultsAction,
  applyRiotResultAction,
  fetchRiotResultsAction,
  type RiotSyncPreview,
} from "./actions";

function formatKst(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type ApplyResult = { lineupApplied: boolean } | null;
type ApplyAllResult = { applied: number; lineupApplied: number } | null;

export default function RiotSyncPanel() {
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<RiotSyncPreview | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [appliedResults, setAppliedResults] = useState<Record<string, ApplyResult>>({});
  const [applyAllResult, setApplyAllResult] = useState<ApplyAllResult>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFetch() {
    setError(null);
    setApplyAllResult(null);
    setAppliedResults({});
    startTransition(async () => {
      try {
        const result = await fetchRiotResultsAction();
        setPreview(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.");
      }
    });
  }

  function handleApplySingle(matchId: string, riotMatchId: string, scoreA: number, scoreB: number) {
    setApplyingId(matchId);
    setError(null);
    startTransition(async () => {
      try {
        const result = await applyRiotResultAction(matchId, riotMatchId, scoreA, scoreB);
        setAppliedResults((prev) => ({ ...prev, [matchId]: result }));
        const updated = await fetchRiotResultsAction();
        setPreview(updated);
      } catch (e) {
        setError(e instanceof Error ? e.message : "적용 중 오류가 발생했습니다.");
      } finally {
        setApplyingId(null);
      }
    });
  }

  function handleApplyAll() {
    if (!preview) return;
    const pending = preview.matched.filter((item) => !item.alreadyApplied);
    if (pending.length === 0) return;

    setError(null);
    setApplyAllResult(null);
    startTransition(async () => {
      try {
        const result = await applyAllRiotResultsAction(
          pending.map((item) => ({
            matchId: item.matchId,
            riotMatchId: item.riotMatchId,
            scoreA: item.riotScoreA,
            scoreB: item.riotScoreB,
          })),
        );
        setApplyAllResult(result);
        const updated = await fetchRiotResultsAction();
        setPreview(updated);
      } catch (e) {
        setError(e instanceof Error ? e.message : "일괄 적용 중 오류가 발생했습니다.");
      }
    });
  }

  const newCount = preview?.matched.filter((m) => !m.alreadyApplied).length ?? 0;
  const isApplyingAll = isPending && !applyingId;

  return (
    <div className="space-y-4">
      {/* 헤더 카드 */}
      <div className="rounded-[20px] bg-[#31313C] p-5 text-white shadow-[0_10px_24px_rgba(2,6,23,0.24)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B7C7FF]">
              RIOT ESPORTS API
            </div>
            <div className="mt-1 text-lg font-black text-white">
              Riot에서 경기 결과 + 출전 선수 불러오기
            </div>
            <div className="mt-1 text-xs text-[#D4DCFF]">
              LCK 완료 경기를 감지하여 결과와 출전 선수를 한번에 적용합니다.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleFetch}
              disabled={isPending}
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#8B5CF6] px-4 text-sm font-semibold text-white transition hover:bg-[#7C3AED] disabled:opacity-50"
            >
              {isApplyingAll && newCount === 0 ? "불러오는 중…" : "🔄 Riot에서 불러오기"}
            </button>
            {newCount > 0 && (
              <button
                type="button"
                onClick={handleApplyAll}
                disabled={isPending}
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {isApplyingAll ? "적용 중…" : `✅ ${newCount}건 전체 적용`}
              </button>
            )}
          </div>
        </div>

        {/* 에러 */}
        {error && (
          <div className="mt-4 rounded-xl bg-red-900/40 px-4 py-3 text-sm text-red-300">
            ⚠️ {error}
          </div>
        )}

        {/* 전체 적용 결과 */}
        {applyAllResult && (
          <div className="mt-4 rounded-xl bg-emerald-900/40 px-4 py-3 text-sm text-emerald-300">
            ✅ {applyAllResult.applied}경기 결과 적용 완료
            {applyAllResult.lineupApplied > 0
              ? ` · 출전 선수 ${applyAllResult.lineupApplied}경기 반영`
              : " · 출전 선수 데이터 없음"}
          </div>
        )}

        {/* 조회 시각 + 요약 */}
        {preview && (
          <div className="mt-3 text-xs text-[#6B7A99]">
            마지막 조회: {formatKst(preview.fetchedAt)} KST ·{" "}
            매칭 {preview.matched.length}건 · 미매칭 {preview.unmatched.length}건
          </div>
        )}
      </div>

      {/* 매칭된 경기 목록 */}
      {preview && preview.matched.length > 0 && (
        <div className="space-y-3">
          <div className="px-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#B7C7FF]">
            매칭된 경기 ({preview.matched.length})
          </div>
          {preview.matched.map((item) => {
            const singleResult = appliedResults[item.matchId];
            const isApplyingThis = applyingId === item.matchId && isPending;

            return (
              <div
                key={item.matchId}
                className="rounded-[20px] bg-[#31313C] p-5 text-white shadow-[0_10px_24px_rgba(2,6,23,0.24)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B7C7FF]">
                      {item.matchId} · {formatKst(item.scheduledAt)}
                    </div>
                    <div className="mt-1 text-xl font-black text-white">
                      {item.teamACode} vs {item.teamBCode}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded-lg bg-[#3A3A47] px-3 py-1 font-bold">
                        Riot: {item.riotScoreA} – {item.riotScoreB}
                      </span>
                      {item.dbStatus === "finished" ? (
                        <span className="rounded-lg bg-[#3A3A47] px-3 py-1 text-[#D4DCFF]">
                          DB: {item.dbScoreA} – {item.dbScoreB}
                        </span>
                      ) : (
                        <span className="rounded-lg bg-[#3A3A47] px-3 py-1 text-[#6B7A99]">
                          DB: 미입력
                        </span>
                      )}
                    </div>

                    {/* 출전 선수 라인업 미리보기 */}
                    {item.riotLineup && item.riotLineup.length > 0 && !item.alreadyApplied && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {[item.teamACode, item.teamBCode].map((teamCode) => {
                          const teamPlayers = item.riotLineup!
                            .filter((p) => p.teamCode === teamCode)
                            .sort((a, b) => {
                              const order = ["TOP", "JGL", "MID", "ADC", "SUP"];
                              return order.indexOf(a.role) - order.indexOf(b.role);
                            });
                          return (
                            <div key={teamCode} className="rounded-lg bg-[#3A3A47] px-3 py-2">
                              <div className="mb-1 text-[11px] font-bold text-[#B7C7FF]">{teamCode}</div>
                              <div className="space-y-0.5">
                                {teamPlayers.map((p) => (
                                  <div key={`${p.teamCode}-${p.role}`} className="flex items-center gap-2 text-xs text-white">
                                    <span className="w-7 font-semibold text-[#6B7A99]">{p.role}</span>
                                    <span>{p.playerName}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {!item.alreadyApplied && item.riotLineup === null && (
                      <div className="mt-2 text-xs text-[#6B7A99]">
                        ⚠ 출전 선수 조회 실패 (결과만 적용 가능)
                      </div>
                    )}

                    {/* 개별 적용 결과 */}
                    {singleResult && (
                      <div className="mt-2 text-xs text-emerald-400">
                        ✓ 결과 적용됨
                        {singleResult.lineupApplied
                          ? " · 출전 선수 반영됨"
                          : " · 출전 선수 데이터 없음"}
                      </div>
                    )}
                  </div>

                  {/* 버튼 */}
                  {item.alreadyApplied ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-3 py-1 text-xs font-bold text-white">
                      ✓ 적용됨
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        handleApplySingle(item.matchId, item.riotMatchId, item.riotScoreA, item.riotScoreB)
                      }
                      disabled={isPending}
                      className="inline-flex min-h-9 items-center justify-center rounded-xl bg-[#8B5CF6] px-4 text-sm font-semibold text-white transition hover:bg-[#7C3AED] disabled:opacity-50"
                    >
                      {isApplyingThis ? "적용 중…" : "결과 + 선수 적용"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 미매칭 경기 */}
      {preview && preview.unmatched.length > 0 && (
        <div className="space-y-3">
          <div className="px-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#B7C7FF]">
            미매칭 — DB에 해당 경기 없음 ({preview.unmatched.length})
          </div>
          {preview.unmatched.map((item) => (
            <div
              key={item.riotMatchId}
              className="rounded-[20px] border border-[#4A4A59] bg-[#28282F] p-5 text-white"
            >
              <div className="text-sm font-bold">
                {item.teamACode} vs {item.teamBCode}
              </div>
              <div className="mt-1 text-xs text-[#6B7A99]">
                {formatKst(item.startTime)} · 스코어 {item.scoreA}:{item.scoreB}
              </div>
              <div className="mt-1 text-xs text-[#4A4A59]">
                &quot;경기 추가&quot; 탭에서 먼저 등록해 주세요.
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 결과 없음 */}
      {preview && preview.matched.length === 0 && preview.unmatched.length === 0 && (
        <div className="rounded-[20px] bg-[#31313C] p-5 text-center text-sm text-[#6B7A99]">
          Riot API에 완료된 경기 데이터가 없습니다.
        </div>
      )}
    </div>
  );
}

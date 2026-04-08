import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/authz";
import { getAdminPanelData } from "@/lib/service";
import {
  cancelSeasonPredictionQuestionAction,
  resolveSeasonPredictionQuestionAction,
  toggleCommentVisibilityAction,
  updateMatchResultAction,
  updateMatchRosterAction,
  updateTeamRosterAction,
  upsertMatchAction,
  upsertSeasonPredictionQuestionAction,
} from "./actions";
import RiotSyncPanel from "./RiotSyncPanel";

type AdminTab = "status" | "result" | "roster" | "new-match" | "season" | "comments" | "team-roster" | "riot-sync";
const ROLE_ORDER = ["TOP", "JGL", "MID", "ADC", "SUP"] as const;

function toInputDate(value: string) {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toInputDateDefault() {
  return toInputDate(new Date().toISOString());
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getTab(value: string | undefined): AdminTab {
  if (
    value === "result" ||
    value === "roster" ||
    value === "new-match" ||
    value === "season" ||
    value === "comments" ||
    value === "team-roster" ||
    value === "riot-sync"
  ) {
    return value;
  }
  return "status";
}

function tabClass(active: boolean) {
  return active
    ? "inline-flex min-h-10 items-center justify-center rounded-xl bg-[#8B5CF6] px-4 text-sm font-semibold text-white"
    : "inline-flex min-h-10 items-center justify-center rounded-xl bg-[#3A3A47] px-4 text-sm font-semibold text-white transition hover:bg-[#4A4A59]";
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    open: "bg-emerald-600",
    locked: "bg-yellow-600",
    resolved: "bg-blue-600",
    canceled: "bg-red-700",
    draft: "bg-[#4A4A59]",
  };
  return `inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold text-white ${map[status] ?? "bg-[#4A4A59]"}`;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  if (user.role !== "admin") redirect("/");

  const params = await searchParams;
  const currentTab = getTab(readParam(params.tab));
  const data = await getAdminPanelData();

  const tabs: { key: AdminTab; label: string }[] = [
    { key: "status", label: "경기 상태" },
    { key: "result", label: "경기 결과" },
    { key: "riot-sync", label: "🤖 Riot 자동입력" },
    { key: "roster", label: "출전 멤버" },
    { key: "new-match", label: "경기 추가" },
    { key: "season", label: "시즌 예측" },
    { key: "comments", label: "댓글 관리" },
    { key: "team-roster", label: "팀 로스터" },
  ];

  return (
    <main className="min-h-screen bg-[#1C1C1F] px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        {/* Header */}
        <section className="rounded-[20px] bg-[#31313C] p-5 text-white shadow-[0_12px_28px_rgba(2,6,23,0.28)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#B7C7FF]">Admin Console</p>
              <h1 className="mt-2 text-2xl font-black tracking-[-0.02em] text-white sm:text-[28px]">운영 관리자</h1>
              <p className="mt-2 text-sm text-[#D4DCFF]">경기 관리, 시즌 예측, 댓글 모더레이션을 처리합니다.</p>
            </div>
            <Link
              href="/"
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#3A3A47] px-4 text-sm font-semibold text-white transition hover:bg-[#4A4A59]"
            >
              홈으로 이동
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {tabs.map(({ key, label }) => (
              <Link key={key} href={`/admin?tab=${key}`} className={tabClass(currentTab === key)}>
                {label}
              </Link>
            ))}
          </div>
        </section>

        {/* ── 경기 상태 ── */}
        {currentTab === "status" && (
          <section className="space-y-4">
            {data.matches.map((match) => {
              const teamA = data.teams.find((t) => t.id === match.teamAId);
              const teamB = data.teams.find((t) => t.id === match.teamBId);
              return (
                <form
                  key={match.id}
                  action={upsertMatchAction}
                  className="rounded-[20px] bg-[#31313C] p-5 text-white shadow-[0_10px_24px_rgba(2,6,23,0.24)]"
                >
                  <input type="hidden" name="matchId" value={match.id} />
                  <input type="hidden" name="league" value={match.league} />
                  <input type="hidden" name="stage" value={match.stage} />
                  <input type="hidden" name="patch" value={match.patch} />
                  <input type="hidden" name="teamACode" value={teamA?.code ?? ""} />
                  <input type="hidden" name="teamBCode" value={teamB?.code ?? ""} />
                  <input type="hidden" name="scoreA" value={match.scoreA ?? ""} />
                  <input type="hidden" name="scoreB" value={match.scoreB ?? ""} />

                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B7C7FF]">{match.id}</div>
                      <div className="mt-1 text-xl font-black text-white">{teamA?.code} vs {teamB?.code}</div>
                    </div>
                    <Link
                      href={`/matches/${match.id}`}
                      className="inline-flex min-h-9 items-center justify-center rounded-lg bg-[#3A3A47] px-3 text-xs font-semibold text-white transition hover:bg-[#4A4A59]"
                    >
                      상세 보기
                    </Link>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <label className="grid gap-2 text-sm text-[#D4DCFF]">
                      상태
                      <select name="status" defaultValue={match.status} className="min-h-11 rounded-xl bg-[#3A3A47] px-3 text-sm text-white outline-none">
                        <option value="scheduled">scheduled</option>
                        <option value="finished">finished</option>
                      </select>
                    </label>
                    <label className="grid gap-2 text-sm text-[#D4DCFF]">
                      시작 시간
                      <input type="datetime-local" name="scheduledAt" defaultValue={toInputDate(match.scheduledAt)} className="min-h-11 rounded-xl bg-[#3A3A47] px-3 text-sm text-white outline-none" />
                    </label>
                    <label className="grid gap-2 text-sm text-[#D4DCFF]">
                      예측 잠금
                      <span className="flex min-h-11 items-center rounded-xl bg-[#3A3A47] px-3">
                        <input type="checkbox" name="predictionLocked" defaultChecked={match.predictionLocked} />
                      </span>
                    </label>
                  </div>

                  <button type="submit" className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#8B5CF6] px-4 text-sm font-semibold text-white transition hover:bg-[#7C3AED]">
                    상태 저장
                  </button>
                </form>
              );
            })}
          </section>
        )}

        {/* ── 경기 결과 ── */}
        {currentTab === "result" && (
          <section className="space-y-4">
            {data.matches.map((match) => {
              const teamA = data.teams.find((t) => t.id === match.teamAId);
              const teamB = data.teams.find((t) => t.id === match.teamBId);
              return (
                <form
                  key={match.id}
                  action={updateMatchResultAction}
                  className="rounded-[20px] bg-[#31313C] p-5 text-white shadow-[0_10px_24px_rgba(2,6,23,0.24)]"
                >
                  <input type="hidden" name="matchId" value={match.id} />
                  <input type="hidden" name="league" value={match.league} />
                  <input type="hidden" name="stage" value={match.stage} />
                  <input type="hidden" name="patch" value={match.patch} />
                  <input type="hidden" name="scheduledAt" value={match.scheduledAt} />
                  <input type="hidden" name="teamACode" value={teamA?.code ?? ""} />
                  <input type="hidden" name="teamBCode" value={teamB?.code ?? ""} />

                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B7C7FF]">{match.id}</div>
                  <div className="mt-1 text-xl font-black text-white">{teamA?.code} vs {teamB?.code}</div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm text-[#D4DCFF]">
                      {teamA?.code} 스코어
                      <input type="number" name="scoreA" min={0} required defaultValue={match.scoreA ?? 0} className="min-h-11 rounded-xl bg-[#3A3A47] px-3 text-sm text-white outline-none" />
                    </label>
                    <label className="grid gap-2 text-sm text-[#D4DCFF]">
                      {teamB?.code} 스코어
                      <input type="number" name="scoreB" min={0} required defaultValue={match.scoreB ?? 0} className="min-h-11 rounded-xl bg-[#3A3A47] px-3 text-sm text-white outline-none" />
                    </label>
                  </div>

                  <button type="submit" className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#8B5CF6] px-4 text-sm font-semibold text-white transition hover:bg-[#7C3AED]">
                    결과 저장 (finished)
                  </button>
                </form>
              );
            })}
          </section>
        )}

        {/* ── Riot 자동입력 ── */}
        {currentTab === "riot-sync" && <RiotSyncPanel />}

        {/* ── 출전 멤버 ── */}
        {currentTab === "roster" && (
          <section className="space-y-4">

            {data.matches.map((match) => {
              const teamA = data.teams.find((t) => t.id === match.teamAId);
              const teamB = data.teams.find((t) => t.id === match.teamBId);
              const players = data.players.filter((p) => p.teamId === match.teamAId || p.teamId === match.teamBId);
              const selectedIds = new Set(data.matchParticipants.filter((p) => p.matchId === match.id).map((p) => p.playerId));
              const rosterOrder = new Map(
                data.teamRosterEntries
                  .filter((e) => e.teamId === match.teamAId || e.teamId === match.teamBId)
                  .map((e) => [e.playerId, e.displayOrder]),
              );
              const sortedPlayers = players.slice().sort((a, b) => (rosterOrder.get(a.id) ?? 999) - (rosterOrder.get(b.id) ?? 999) || a.name.localeCompare(b.name, "en"));

              return (
                <form key={match.id} action={updateMatchRosterAction} className="rounded-[20px] bg-[#31313C] p-5 text-white shadow-[0_10px_24px_rgba(2,6,23,0.24)]">
                  <input type="hidden" name="matchId" value={match.id} />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B7C7FF]">{match.id}</div>
                      <div className="mt-1 text-xl font-black text-white">{teamA?.code} vs {teamB?.code}</div>
                    </div>
                    <div className="text-xs text-[#D4DCFF]">선택 {selectedIds.size}명</div>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {[
                      { side: "A", team: teamA, teamId: match.teamAId },
                      { side: "B", team: teamB, teamId: match.teamBId },
                    ].map(({ side, team, teamId }) => (
                      <div key={`${match.id}-${side}`} className="rounded-xl bg-[#3A3A47] p-3">
                        <div className="mb-3 text-sm font-black text-white">{team?.code ?? "TBD"}</div>
                        <div className="space-y-2">
                          {ROLE_ORDER.map((role) => {
                            const rolePlayers = sortedPlayers.filter((p) => p.teamId === teamId && p.role === role);
                            const selectedId = sortedPlayers.find((p) => p.teamId === teamId && p.role === role && selectedIds.has(p.id))?.id ?? "";
                            return (
                              <label key={`${match.id}-${teamId}-${role}`} className="grid grid-cols-[42px_minmax(0,1fr)] items-center gap-2">
                                <span className="text-xs font-semibold text-[#D4DCFF]">{role}</span>
                                <select
                                  key={`${match.id}-${teamId}-${role}-${selectedId || "empty"}`}
                                  name="playerIds"
                                  defaultValue={selectedId}
                                  className="min-h-10 rounded-lg bg-[#4A4A59] px-3 text-sm text-white outline-none"
                                >
                                  <option value="">선택 안함</option>
                                  {rolePlayers.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button type="submit" className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#8B5CF6] px-4 text-sm font-semibold text-white transition hover:bg-[#7C3AED]">
                    출전 멤버 저장
                  </button>
                </form>
              );
            })}
          </section>
        )}

        {/* ── 경기 추가 ── */}
        {currentTab === "new-match" && (
          <section>
            <form action={upsertMatchAction} className="rounded-[20px] bg-[#31313C] p-5 text-white shadow-[0_10px_24px_rgba(2,6,23,0.24)]">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B7C7FF]">New Match</div>
              <div className="mt-1 text-xl font-black text-white">새 경기 추가</div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="grid gap-2 text-sm text-[#D4DCFF]">
                  리그
                  <input type="text" name="league" defaultValue="LCK 2026" required className="min-h-11 rounded-xl bg-[#3A3A47] px-3 text-sm text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-[#D4DCFF]">
                  스테이지
                  <input type="text" name="stage" defaultValue="Rounds 1-2" required className="min-h-11 rounded-xl bg-[#3A3A47] px-3 text-sm text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-[#D4DCFF]">
                  패치
                  <input type="text" name="patch" defaultValue="15.7" required className="min-h-11 rounded-xl bg-[#3A3A47] px-3 text-sm text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-[#D4DCFF]">
                  팀 A
                  <select name="teamACode" required className="min-h-11 rounded-xl bg-[#3A3A47] px-3 text-sm text-white outline-none">
                    <option value="">선택</option>
                    {data.teams.map((t) => <option key={t.id} value={t.code}>{t.code}</option>)}
                  </select>
                </label>
                <label className="grid gap-2 text-sm text-[#D4DCFF]">
                  팀 B
                  <select name="teamBCode" required className="min-h-11 rounded-xl bg-[#3A3A47] px-3 text-sm text-white outline-none">
                    <option value="">선택</option>
                    {data.teams.map((t) => <option key={t.id} value={t.code}>{t.code}</option>)}
                  </select>
                </label>
                <label className="grid gap-2 text-sm text-[#D4DCFF]">
                  시작 시간
                  <input type="datetime-local" name="scheduledAt" defaultValue={toInputDateDefault()} required className="min-h-11 rounded-xl bg-[#3A3A47] px-3 text-sm text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-[#D4DCFF]">
                  상태
                  <select name="status" defaultValue="scheduled" className="min-h-11 rounded-xl bg-[#3A3A47] px-3 text-sm text-white outline-none">
                    <option value="scheduled">scheduled</option>
                    <option value="finished">finished</option>
                  </select>
                </label>
              </div>

              <button type="submit" className="mt-6 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#8B5CF6] px-5 text-sm font-semibold text-white transition hover:bg-[#7C3AED]">
                경기 추가
              </button>
            </form>
          </section>
        )}

        {/* ── 시즌 예측 ── */}
        {currentTab === "season" && (
          <section className="space-y-6">
            {/* 새 질문 생성 */}
            <form action={upsertSeasonPredictionQuestionAction} className="rounded-[20px] bg-[#31313C] p-5 text-white shadow-[0_10px_24px_rgba(2,6,23,0.24)]">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B7C7FF]">Create / Edit</div>
              <div className="mt-1 text-xl font-black text-white">시즌 예측 질문</div>
              <p className="mt-1 text-xs text-[#9AA4C8]">수정 시 questionId 입력. 비우면 새로 생성됩니다.</p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm text-[#D4DCFF]">
                  질문 ID (수정 시만 입력)
                  <input type="text" name="questionId" placeholder="spq_..." className="min-h-11 rounded-xl bg-[#3A3A47] px-3 text-sm text-white outline-none placeholder:text-[#6B7A99]" />
                </label>
                <label className="grid gap-2 text-sm text-[#D4DCFF]">
                  카테고리
                  <input type="text" name="category" defaultValue="LCK" required className="min-h-11 rounded-xl bg-[#3A3A47] px-3 text-sm text-white outline-none" />
                </label>
                <label className="col-span-full grid gap-2 text-sm text-[#D4DCFF]">
                  제목
                  <input type="text" name="title" required placeholder="예: LCK 2026 스프링 우승팀은?" className="min-h-11 rounded-xl bg-[#3A3A47] px-3 text-sm text-white outline-none placeholder:text-[#6B7A99]" />
                </label>
                <label className="col-span-full grid gap-2 text-sm text-[#D4DCFF]">
                  설명
                  <textarea name="description" rows={2} className="resize-none rounded-xl bg-[#3A3A47] px-3 py-3 text-sm text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-[#D4DCFF]">
                  시즌
                  <input type="text" name="season" defaultValue="2026" required className="min-h-11 rounded-xl bg-[#3A3A47] px-3 text-sm text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-[#D4DCFF]">
                  예측 타입
                  <select name="predictionType" defaultValue="single" className="min-h-11 rounded-xl bg-[#3A3A47] px-3 text-sm text-white outline-none">
                    <option value="single">single (단일 선택)</option>
                    <option value="yesno">yesno (예/아니오)</option>
                    <option value="range">range (범위)</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm text-[#D4DCFF]">
                  공개 오픈 시간
                  <input type="datetime-local" name="openAt" defaultValue={toInputDateDefault()} required className="min-h-11 rounded-xl bg-[#3A3A47] px-3 text-sm text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-[#D4DCFF]">
                  마감 시간
                  <input type="datetime-local" name="closeAt" defaultValue={toInputDateDefault()} required className="min-h-11 rounded-xl bg-[#3A3A47] px-3 text-sm text-white outline-none" />
                </label>
                <label className="grid gap-2 text-sm text-[#D4DCFF]">
                  공개 여부
                  <select name="visibility" defaultValue="public" className="min-h-11 rounded-xl bg-[#3A3A47] px-3 text-sm text-white outline-none">
                    <option value="public">public</option>
                    <option value="private">private (초안)</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm text-[#D4DCFF]">
                  수동 상태
                  <select name="manualStatus" defaultValue="active" className="min-h-11 rounded-xl bg-[#3A3A47] px-3 text-sm text-white outline-none">
                    <option value="active">active</option>
                    <option value="draft">draft</option>
                    <option value="canceled">canceled</option>
                  </select>
                </label>
                <label className="col-span-full grid gap-2 text-sm text-[#D4DCFF]">
                  선택지 (한 줄에 하나, 형식: 레이블 또는 레이블|값)
                  <textarea
                    name="options"
                    rows={5}
                    placeholder={"T1\nGenG\nDK\nHLE\nKT"}
                    className="resize-none rounded-xl bg-[#3A3A47] px-3 py-3 text-sm text-white outline-none placeholder:text-[#6B7A99]"
                  />
                </label>
              </div>

              <button type="submit" className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#8B5CF6] px-5 text-sm font-semibold text-white transition hover:bg-[#7C3AED]">
                저장
              </button>
            </form>

            {/* 기존 질문 목록 */}
            <div className="space-y-3">
              {data.seasonPredictionQuestions.map((q) => (
                <div key={q.id} className="rounded-[20px] bg-[#31313C] p-5 text-white shadow-[0_10px_24px_rgba(2,6,23,0.24)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={statusBadge(q.status)}>{q.status}</span>
                        <span className="text-[11px] text-[#9AA4C8]">{q.category} · {q.season} · 참여 {q.totalEntries}명</span>
                      </div>
                      <div className="mt-1.5 text-base font-bold text-white">{q.title}</div>
                      <div className="mt-1 text-xs text-[#9AA4C8] font-mono">{q.id}</div>
                      {q.resultLabel && (
                        <div className="mt-1.5 text-xs text-emerald-400 font-semibold">정답: {q.resultLabel}</div>
                      )}
                    </div>
                  </div>

                  {/* 선택지 & 결과 처리 */}
                  {q.status !== "resolved" && q.status !== "canceled" && q.options.length > 0 && (
                    <form action={resolveSeasonPredictionQuestionAction} className="mt-4 flex flex-wrap items-end gap-3">
                      <input type="hidden" name="questionId" value={q.id} />
                      <label className="grid gap-1.5 text-sm text-[#D4DCFF]">
                        정답 선택
                        <select name="resultOptionId" required className="min-h-10 rounded-xl bg-[#3A3A47] px-3 text-sm text-white outline-none">
                          <option value="">선택</option>
                          {q.options.map((opt) => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                          ))}
                        </select>
                      </label>
                      <button type="submit" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-600">
                        결과 확정
                      </button>
                    </form>
                  )}

                  {q.status !== "canceled" && q.status !== "resolved" && (
                    <form action={cancelSeasonPredictionQuestionAction} className="mt-3">
                      <input type="hidden" name="questionId" value={q.id} />
                      <button type="submit" className="inline-flex min-h-9 items-center justify-center rounded-xl bg-[#3A3A47] px-3 text-xs font-semibold text-red-400 transition hover:bg-red-900/40">
                        질문 취소
                      </button>
                    </form>
                  )}
                </div>
              ))}
              {data.seasonPredictionQuestions.length === 0 && (
                <div className="rounded-[20px] bg-[#31313C] p-8 text-center text-[#6B7A99]">아직 등록된 시즌 예측이 없습니다.</div>
              )}
            </div>
          </section>
        )}

        {/* ── 댓글 관리 ── */}
        {currentTab === "comments" && (
          <section className="space-y-3">
            <div className="rounded-[20px] bg-[#31313C] p-4 text-white">
              <span className="text-sm text-[#D4DCFF]">전체 댓글 <strong className="text-white">{data.comments.length}개</strong></span>
            </div>
            {data.comments.map((comment) => {
              const author = data.users.find((u) => u.id === comment.userId);
              return (
                <div
                  key={comment.id}
                  className={`rounded-[20px] p-4 text-white shadow-[0_6px_16px_rgba(2,6,23,0.2)] ${comment.hidden ? "bg-[#2A2A35] opacity-60" : "bg-[#31313C]"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#9AA4C8]">
                        <span className="font-semibold text-white">{author?.nickname ?? comment.userId ?? "익명"}</span>
                        <span>·</span>
                        <Link href={`/matches/${comment.matchId}`} className="hover:text-white">경기 {comment.matchId}</Link>
                        <span>·</span>
                        <span>{new Date(comment.createdAt).toLocaleString("ko-KR")}</span>
                        {comment.hidden && <span className="rounded-full bg-red-900/60 px-2 py-0.5 text-[10px] font-bold text-red-300">숨김</span>}
                      </div>
                      <p className="mt-1.5 text-sm text-white">{comment.text}</p>
                    </div>
                    <form action={toggleCommentVisibilityAction}>
                      <input type="hidden" name="commentId" value={comment.id} />
                      <input type="hidden" name="hidden" value={comment.hidden ? "false" : "true"} />
                      <button
                        type="submit"
                        className={`inline-flex min-h-9 items-center justify-center rounded-xl px-3 text-xs font-semibold transition ${
                          comment.hidden
                            ? "bg-[#3A3A47] text-emerald-400 hover:bg-emerald-900/40"
                            : "bg-[#3A3A47] text-red-400 hover:bg-red-900/40"
                        }`}
                      >
                        {comment.hidden ? "복원" : "숨기기"}
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
            {data.comments.length === 0 && (
              <div className="rounded-[20px] bg-[#31313C] p-8 text-center text-[#6B7A99]">댓글이 없습니다.</div>
            )}
          </section>
        )}

        {/* ── 팀 로스터 ── */}
        {currentTab === "team-roster" && (
          <section className="space-y-4">
            {data.teams.map((team) => {
              const teamPlayers = data.players
                .filter((p) => p.teamId === team.id)
                .map((p) => {
                  const entry = data.teamRosterEntries.find((e) => e.teamId === team.id && e.playerId === p.id);
                  return { ...p, displayOrder: entry?.displayOrder ?? 999, isMainRoster: entry?.isMainRoster ?? false };
                })
                .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name, "en"));

              return (
                <form key={team.id} action={updateTeamRosterAction} className="rounded-[20px] bg-[#31313C] p-5 text-white shadow-[0_10px_24px_rgba(2,6,23,0.24)]">
                  <input type="hidden" name="teamCode" value={team.code} />
                  <div className="text-xl font-black text-white">{team.code}</div>
                  <p className="mt-1 text-xs text-[#9AA4C8]">위에서부터 순서대로 displayOrder가 결정됩니다.</p>

                  <div className="mt-4 space-y-2">
                    {ROLE_ORDER.map((role) => {
                      const rolePlayers = teamPlayers.filter((p) => p.role === role);
                      return rolePlayers.map((p) => (
                        <div key={p.id} className="flex items-center gap-3 rounded-xl bg-[#3A3A47] px-4 py-2.5">
                          <span className="w-8 text-xs font-bold text-[#B7C7FF]">{role}</span>
                          <span className="flex-1 text-sm font-semibold text-white">{p.name}</span>
                          <label className="flex items-center gap-1.5 text-xs text-[#9AA4C8]">
                            <input type="checkbox" name="playerIds" value={p.id} defaultChecked={p.isMainRoster || p.displayOrder < 900} />
                            포함
                          </label>
                        </div>
                      ));
                    })}
                    {teamPlayers.length === 0 && (
                      <div className="text-sm text-[#6B7A99]">등록된 선수가 없습니다.</div>
                    )}
                  </div>

                  <button type="submit" className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#8B5CF6] px-4 text-sm font-semibold text-white transition hover:bg-[#7C3AED]">
                    로스터 저장
                  </button>
                </form>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

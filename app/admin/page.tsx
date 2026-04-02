import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/authz";
import { getAdminPanelData } from "@/lib/service";
import { syncAllMatchRostersAction, updateMatchResultAction, updateMatchRosterAction, upsertMatchAction } from "./actions";

type AdminTab = "status" | "result" | "roster";
const ROLE_ORDER = ["TOP", "JGL", "MID", "ADC", "SUP"] as const;

function toInputDate(value: string) {
  const date = new Date(value);
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getTab(value: string | undefined): AdminTab {
  if (value === "result" || value === "roster") {
    return value;
  }
  return "status";
}

function tabClass(active: boolean) {
  return active
    ? "inline-flex min-h-10 items-center justify-center rounded-xl bg-[#8B5CF6] px-4 text-sm font-semibold text-white"
    : "inline-flex min-h-10 items-center justify-center rounded-xl bg-[#3A3A47] px-4 text-sm font-semibold text-white transition hover:bg-[#4A4A59]";
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }
  if (user.role !== "admin") {
    redirect("/");
  }

  const params = await searchParams;
  const currentTab = getTab(readParam(params.tab));
  const data = await getAdminPanelData();

  return (
    <main className="min-h-screen bg-[#1C1C1F] px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <section className="rounded-[20px] bg-[#31313C] p-5 text-white shadow-[0_12px_28px_rgba(2,6,23,0.28)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#B7C7FF]">Admin Console</p>
              <h1 className="mt-2 text-2xl font-black tracking-[-0.02em] text-white sm:text-[28px]">운영 관리자</h1>
              <p className="mt-2 text-sm text-[#D4DCFF]">경기 상태, 결과 입력, 출전 멤버만 빠르게 관리합니다.</p>
            </div>
            <Link
              href="/"
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#3A3A47] px-4 text-sm font-semibold text-white transition hover:bg-[#4A4A59]"
            >
              홈으로 이동
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/admin?tab=status" className={tabClass(currentTab === "status")}>
              경기 상태
            </Link>
            <Link href="/admin?tab=result" className={tabClass(currentTab === "result")}>
              경기 결과
            </Link>
            <Link href="/admin?tab=roster" className={tabClass(currentTab === "roster")}>
              출전 멤버
            </Link>
          </div>
        </section>

        {currentTab === "status" ? (
          <section className="space-y-4">
            {data.matches.map((match) => {
              const teamA = data.teams.find((team) => team.id === match.teamAId);
              const teamB = data.teams.find((team) => team.id === match.teamBId);

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
                      <div className="mt-1 text-xl font-black text-white">
                        {teamA?.code} vs {teamB?.code}
                      </div>
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
                      <select
                        name="status"
                        defaultValue={match.status}
                        className="min-h-11 rounded-xl bg-[#3A3A47] px-3 text-sm text-white outline-none"
                      >
                        <option value="scheduled">scheduled</option>
                        <option value="finished">finished</option>
                      </select>
                    </label>

                    <label className="grid gap-2 text-sm text-[#D4DCFF]">
                      시작 시간
                      <input
                        type="datetime-local"
                        name="scheduledAt"
                        defaultValue={toInputDate(match.scheduledAt)}
                        className="min-h-11 rounded-xl bg-[#3A3A47] px-3 text-sm text-white outline-none"
                      />
                    </label>

                    <label className="grid gap-2 text-sm text-[#D4DCFF]">
                      예측 잠금
                      <span className="flex min-h-11 items-center rounded-xl bg-[#3A3A47] px-3">
                        <input type="checkbox" name="predictionLocked" defaultChecked={match.predictionLocked} />
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#8B5CF6] px-4 text-sm font-semibold text-white transition hover:bg-[#7C3AED]"
                  >
                    상태 저장
                  </button>
                </form>
              );
            })}
          </section>
        ) : null}

        {currentTab === "result" ? (
          <section className="space-y-4">
            {data.matches.map((match) => {
              const teamA = data.teams.find((team) => team.id === match.teamAId);
              const teamB = data.teams.find((team) => team.id === match.teamBId);

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
                  <div className="mt-1 text-xl font-black text-white">
                    {teamA?.code} vs {teamB?.code}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm text-[#D4DCFF]">
                      {teamA?.code} 스코어
                      <input
                        type="number"
                        name="scoreA"
                        min={0}
                        required
                        defaultValue={match.scoreA ?? 0}
                        className="min-h-11 rounded-xl bg-[#3A3A47] px-3 text-sm text-white outline-none"
                      />
                    </label>
                    <label className="grid gap-2 text-sm text-[#D4DCFF]">
                      {teamB?.code} 스코어
                      <input
                        type="number"
                        name="scoreB"
                        min={0}
                        required
                        defaultValue={match.scoreB ?? 0}
                        className="min-h-11 rounded-xl bg-[#3A3A47] px-3 text-sm text-white outline-none"
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#8B5CF6] px-4 text-sm font-semibold text-white transition hover:bg-[#7C3AED]"
                  >
                    결과 저장 (finished)
                  </button>
                </form>
              );
            })}
          </section>
        ) : null}

        {currentTab === "roster" ? (
          <section className="space-y-4">
            <form action={syncAllMatchRostersAction} className="rounded-[20px] bg-[#31313C] p-5 text-white shadow-[0_10px_24px_rgba(2,6,23,0.24)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B7C7FF]">AUTO SYNC</div>
                  <div className="mt-1 text-base font-black text-white">모든 경기 로스터를 팀 로스터 기준으로 자동 동기화</div>
                  <div className="mt-1 text-xs text-[#D4DCFF]">각 경기마다 TOP/JGL/MID/ADC/SUP 1명씩 자동 반영합니다.</div>
                </div>
                <button
                  type="submit"
                  className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#8B5CF6] px-4 text-sm font-semibold text-white transition hover:bg-[#7C3AED]"
                >
                  전체 경기 자동 동기화
                </button>
              </div>
            </form>

            {data.matches.map((match) => {
              const teamA = data.teams.find((team) => team.id === match.teamAId);
              const teamB = data.teams.find((team) => team.id === match.teamBId);
              const players = data.players.filter((player) => player.teamId === match.teamAId || player.teamId === match.teamBId);
              const selectedIds = new Set(
                data.matchParticipants.filter((participant) => participant.matchId === match.id).map((participant) => participant.playerId),
              );
              const rosterOrder = new Map(
                data.teamRosterEntries
                  .filter((entry) => entry.teamId === match.teamAId || entry.teamId === match.teamBId)
                  .map((entry) => [entry.playerId, entry.displayOrder]),
              );
              const sortedPlayers = players
                .slice()
                .sort((a, b) => (rosterOrder.get(a.id) ?? 999) - (rosterOrder.get(b.id) ?? 999) || a.name.localeCompare(b.name, "en"));
              const getPlayersByTeamAndRole = (teamId: string, role: (typeof ROLE_ORDER)[number]) =>
                sortedPlayers.filter((player) => player.teamId === teamId && player.role === role);
              const getSelectedByTeamAndRole = (teamId: string, role: (typeof ROLE_ORDER)[number]) =>
                sortedPlayers.find((player) => player.teamId === teamId && player.role === role && selectedIds.has(player.id))?.id ?? "";

              return (
                <form
                  key={match.id}
                  action={updateMatchRosterAction}
                  className="rounded-[20px] bg-[#31313C] p-5 text-white shadow-[0_10px_24px_rgba(2,6,23,0.24)]"
                >
                  <input type="hidden" name="matchId" value={match.id} />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B7C7FF]">{match.id}</div>
                      <div className="mt-1 text-xl font-black text-white">
                        {teamA?.code} vs {teamB?.code}
                      </div>
                    </div>
                    <div className="text-xs text-[#D4DCFF]">선택 {selectedIds.size}명</div>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {[
                      { side: "A", team: teamA, teamId: match.teamAId },
                      { side: "B", team: teamB, teamId: match.teamBId },
                    ].map(({ side, team, teamId }) => (
                      <div key={`${match.id}-${side}-${teamId}`} className="rounded-xl bg-[#3A3A47] p-3">
                        <div className="mb-3 text-sm font-black text-white">{team?.code ?? "TBD"}</div>
                        <div className="space-y-2">
                          {ROLE_ORDER.map((role) => {
                            const rolePlayers = getPlayersByTeamAndRole(teamId, role);
                            const selectedPlayerId = getSelectedByTeamAndRole(teamId, role);
                            return (
                              <label key={`${match.id}-${teamId}-${role}`} className="grid grid-cols-[42px_minmax(0,1fr)] items-center gap-2">
                                <span className="text-xs font-semibold text-[#D4DCFF]">{role}</span>
                                <select
                                  key={`${match.id}-${teamId}-${role}-${selectedPlayerId || "empty"}`}
                                  name="playerIds"
                                  defaultValue={selectedPlayerId}
                                  className="min-h-10 rounded-lg bg-[#4A4A59] px-3 text-sm text-white outline-none"
                                >
                                  <option value="">선택 안함</option>
                                  {rolePlayers.map((player) => (
                                    <option key={player.id} value={player.id}>
                                      {player.name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="mt-4 inline-flex min-h-10 items-center justify-center rounded-xl bg-[#8B5CF6] px-4 text-sm font-semibold text-white transition hover:bg-[#7C3AED]"
                  >
                    출전 멤버 저장
                  </button>
                </form>
              );
            })}
          </section>
        ) : null}
      </div>
    </main>
  );
}

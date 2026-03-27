import Link from "next/link";

import { TeamLogo } from "@/components/lol-rating/team-branding";
import { getTeamRosterHubData } from "@/lib/service";

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export default async function TeamsPage() {
  const teams = await getTeamRosterHubData();

  return (
    <main className="app-shell px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Teams</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">2026 LCK R1 1군 로스터</h1>
            <p className="mt-2 text-sm text-slate-600">팀별 공식 기준 1군 로스터와 최근 경기 동선을 한 번에 확인할 수 있습니다.</p>
          </div>
          <Link href="/" className="ui-action-secondary">
            일정 허브로 돌아가기
          </Link>
        </div>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <Link
              key={team.teamCode}
              href={`/teams/${team.teamCode}`}
              className="ui-card p-6 transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(15,23,42,0.12)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <TeamLogo team={team.teamCode} size={52} />
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">{team.teamCode}</div>
                    <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">{team.teamName}</h2>
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{team.playerCount}명</span>
              </div>

              <div className="mt-5 space-y-2">
                {team.players.map((player) => (
                  <div key={player.playerId} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <span className="font-semibold text-slate-900">{player.name}</span>
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500">{player.role}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
                <span>공식 기준 반영</span>
                <span>{formatUpdatedAt(team.updatedAt)}</span>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}

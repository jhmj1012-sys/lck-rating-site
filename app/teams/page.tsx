import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { TopSiteNav } from "@/components/TopSiteNav";
import type { PlayerRole, TeamRosterSummary } from "@/components/lol-rating/types";
import { getScheduleHubData, getTeamRosterHubData } from "@/lib/service";

const ROLE_ORDER: PlayerRole[] = ["TOP", "JGL", "MID", "ADC", "SUP"];
const ROLE_ICON: Record<PlayerRole, string> = {
  TOP: "/icons/positions/icon-position-top.png",
  JGL: "/icons/positions/icon-position-jungle.png",
  MID: "/icons/positions/icon-position-middle.png",
  ADC: "/icons/positions/icon-position-bottom.png",
  SUP: "/icons/positions/icon-position-utility.png",
};

const TEAM_STAFF: Record<string, { headCoach: string[]; coach: string[] }> = {
  BFX: { headCoach: ["Edo"], coach: ["Rather", "Lira", "Dopil"] },
  BRO: { headCoach: ["Ssong"], coach: ["Duke", "Cheoni"] },
  DK: { headCoach: ["cvMax", "Woong"], coach: ["PoohManDu", "Hachani", "Sungmin"] },
  DNS: { headCoach: ["oDin", "RapidStar"], coach: ["Ggoong", "Minit", "Cube"] },
  GEN: { headCoach: ["Ryu"], coach: ["Lyn", "Nova", "Jerry"] },
  HLE: { headCoach: ["Homme", "Sensation"], coach: ["Sin", "Mowgli"] },
  KRX: { headCoach: ["Joker", "Frozen"], coach: ["Naehyun", "Catch"] },
  KT: { headCoach: ["Score", "Spark"], coach: ["Museong", "Sonstar", "Lilac"] },
  NS: { headCoach: ["DanDy"], coach: ["Crazy", "Chelly", "bonO"] },
  T1: { headCoach: ["Tom", "DooTi"], coach: ["Mata", "Nagne"] },
};

function StaffRow({ label, names }: { label: string; names: string[] }) {
  return (
    <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:grid-cols-[120px_minmax(0,1fr)]">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-slate-800">{names.length > 0 ? names.join(" · ") : "-"}</div>
    </div>
  );
}

function getMainPlayerByRole(team: TeamRosterSummary, role: PlayerRole) {
  return (
    team.players
      .filter((player) => player.role === role && player.isMainRoster)
      .slice()
      .sort((a, b) => a.displayOrder - b.displayOrder)[0] ?? null
  );
}

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;
  const [teams, hubData] = await Promise.all([
    getTeamRosterHubData(),
    getScheduleHubData(session?.user?.id ?? null),
  ]);

  const sortedTeams = teams.slice().sort((a, b) => a.teamCode.localeCompare(b.teamCode, "en"));
  const selectedTeamCodeParam = Array.isArray(params.team) ? params.team[0] : params.team;
  const selectedTeam =
    sortedTeams.find((team) => team.teamCode === (selectedTeamCodeParam ?? "").toUpperCase()) ??
    sortedTeams[0] ??
    null;

  if (!selectedTeam) {
    return (
      <div>
        <TopSiteNav
          active="schedule"
          notifications={hubData.notifications}
          unreadNotificationCount={hubData.unreadNotificationCount}
        />
        <main className="app-shell px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-6xl rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
            팀 로스터 데이터가 없습니다.
          </div>
        </main>
      </div>
    );
  }

  const staff = TEAM_STAFF[selectedTeam.teamCode] ?? { headCoach: [], coach: [] };

  return (
    <div>
      <TopSiteNav
        active="schedule"
        notifications={hubData.notifications}
        unreadNotificationCount={hubData.unreadNotificationCount}
      />
      <main className="app-shell px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">2026 Integrated Roster</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">2026 LCK 정규시즌 R1 통합 로스터</h1>
          </div>

          <section className="rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {sortedTeams.map((team) => {
                const active = team.teamCode === selectedTeam.teamCode;
                return (
                  <Link
                    key={team.teamCode}
                    href={`/teams?team=${team.teamCode}`}
                    className={
                      active
                        ? "rounded-xl border border-sky-300 bg-sky-50 px-3 py-2 text-center text-sm font-black text-sky-700"
                        : "rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-white"
                    }
                  >
                    {team.teamCode}
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{selectedTeam.teamCode}</div>
                <h2 className="mt-1 text-2xl font-black text-slate-950">{selectedTeam.teamName}</h2>
              </div>
              <a
                href={selectedTeam.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-300"
              >
                공식 출처 보기
              </a>
            </div>

            <div className="mt-5 grid gap-3">
              <StaffRow label="Head Coach" names={staff.headCoach.slice(0, 1)} />
              <StaffRow label="Coach" names={staff.coach.slice(0, 1)} />
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-bold text-slate-900">포지션별 1군 선수</div>
              <div className="mt-4 grid gap-2">
                {ROLE_ORDER.map((role) => {
                  const player = getMainPlayerByRole(selectedTeam, role);
                  return (
                    <div key={`${selectedTeam.teamCode}_${role}`} className="grid grid-cols-[34px_minmax(0,1fr)] items-center gap-3 rounded-xl bg-white px-3 py-2.5">
                      <Image src={ROLE_ICON[role]} alt={role} width={24} height={24} className="h-6 w-6 object-contain" />
                      {player ? (
                        <Link
                          href={`/player/${player.playerId}`}
                          className="text-base font-bold text-slate-800 underline-offset-2 hover:text-sky-700 hover:underline"
                        >
                          {player.name}
                        </Link>
                      ) : (
                        <div className="text-base font-bold text-slate-400">-</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

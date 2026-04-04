import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { TeamLogo } from "@/components/lol-rating/TeamLogo";
import { TopSiteNav } from "@/components/TopSiteNav";
import type { PlayerRole, TeamRosterSummary } from "@/components/lol-rating/types";
import { getScheduleHubData, getTeamRosterHubData } from "@/lib/service";

const ROLE_ORDER: PlayerRole[] = ["TOP", "JGL", "MID", "ADC", "SUP"];
const ROLE_ICON: Record<PlayerRole, string> = {
  TOP: "/icons/positions/icon-position-top-disabled.png",
  JGL: "/icons/positions/icon-position-jungle-disabled.png",
  MID: "/icons/positions/icon-position-middle-disabled.png",
  ADC: "/icons/positions/icon-position-bottom-disabled.png",
  SUP: "/icons/positions/icon-position-utility-disabled.png",
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

function StaffItem({ label, names }: { label: string; names: string[] }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8B8BA8]">{label}</span>
      <span className="text-sm font-medium text-[#FFFFFF]">{names.length > 0 ? names.join(" / ") : "-"}</span>
    </div>
  );
}

function getMainPlayerByRole(team: TeamRosterSummary, role: PlayerRole) {
  return team.players
    .filter((player) => player.role === role)
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder);
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
          active="none"
          notifications={hubData.notifications}
          unreadNotificationCount={hubData.unreadNotificationCount}
        />
        <main className="min-h-screen bg-[#1C1C1F] px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-5xl rounded-3xl bg-[#31313C] px-6 py-12 text-center text-sm text-[#FFFFFF]">
            로스터 데이터가 없습니다.
          </div>
        </main>
      </div>
    );
  }

  const staff = TEAM_STAFF[selectedTeam.teamCode] ?? { headCoach: [], coach: [] };
  const mobileTeams = [
    selectedTeam,
    ...sortedTeams.filter((team) => team.teamCode !== selectedTeam.teamCode),
  ];
  const hasExpectedRosterCount = selectedTeam.players.length === 11;

  return (
    <div>
      <TopSiteNav
        active="none"
        notifications={hubData.notifications}
        unreadNotificationCount={hubData.unreadNotificationCount}
      />
      <main className="min-h-screen bg-[#1C1C1F] px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl space-y-5">
          <section className="rounded-[24px] bg-[#31313C] p-3">
            <div className="mobile-tab-scroll -mx-1 flex gap-2 px-1 sm:hidden">
              {mobileTeams.map((team) => {
                const active = team.teamCode === selectedTeam.teamCode;
                return (
                  <Link
                    key={team.teamCode}
                    href={`/teams?team=${team.teamCode}`}
                    className={
                      active
                        ? "inline-flex h-9 min-w-[88px] shrink-0 items-center justify-center rounded-full bg-[#8B5CF6] px-4 text-sm font-medium !text-[#F8F8F8] visited:!text-[#F8F8F8]"
                        : "inline-flex h-9 min-w-[88px] shrink-0 items-center justify-center rounded-full bg-[#424254] px-4 text-sm font-medium !text-[#F8F8F8] visited:!text-[#F8F8F8] hover:bg-[#4D4D61]"
                    }
                  >
                    {team.teamCode}
                  </Link>
                );
              })}
            </div>

            <div className="hidden grid-cols-2 gap-2 sm:grid sm:grid-cols-5">
              {sortedTeams.map((team) => {
                const active = team.teamCode === selectedTeam.teamCode;
                return (
                  <Link
                    key={team.teamCode}
                    href={`/teams?team=${team.teamCode}`}
                    className={
                      active
                        ? "rounded-xl bg-[#8B5CF6] px-3 py-2 text-center text-sm font-medium !text-[#F8F8F8] visited:!text-[#F8F8F8]"
                        : "rounded-xl bg-[#424254] px-3 py-2 text-center text-sm font-medium !text-[#F8F8F8] visited:!text-[#F8F8F8] hover:bg-[#4D4D61]"
                    }
                  >
                    {team.teamCode}
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="rounded-[28px] bg-[#31313C] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <TeamLogo team={selectedTeam.teamCode} size={64} imageClassName="p-2" priority />
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.2em] text-[#D4DCFF]">{selectedTeam.teamCode}</div>
                  <h2 className="mt-1 text-2xl font-semibold text-[#FFFFFF]">{selectedTeam.teamName}</h2>
                </div>
              </div>
              <a
                href={selectedTeam.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-[#424254] px-3 py-1.5 text-xs font-medium !text-[#FFFFFF] visited:!text-[#FFFFFF] hover:bg-[#4D4D61] hover:!text-[#FFFFFF]"
              >
                공식 출처 보기
              </a>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#3A3A47] pt-4">
              <StaffItem label="Head Coach" names={staff.headCoach.slice(0, 1)} />
              <StaffItem label="Coach" names={staff.coach.slice(0, 1)} />
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-[#FFFFFF]">팀 로스터</div>
                <div className="text-xs text-[#D4DCFF]">{selectedTeam.players.length}/11</div>
              </div>
              {!hasExpectedRosterCount ? (
                <div className="mb-2 rounded-lg bg-[#4A4A59] px-3 py-2 text-xs text-[#F8F8F8]">
                  로스터 데이터 확인 필요: 현재 {selectedTeam.players.length}명
                </div>
              ) : null}
              <div className="overflow-hidden rounded-2xl bg-[#3A3A47]">
                {ROLE_ORDER.map((role, i) => {
                  const players = getMainPlayerByRole(selectedTeam, role);
                  return (
                    <div
                      key={`${selectedTeam.teamCode}_${role}`}
                      className={`grid grid-cols-[30px_repeat(3,minmax(0,1fr))] items-center gap-x-3 gap-y-1 px-4 py-3${i > 0 ? " border-t border-[#31313C]" : ""}`}
                    >
                      <Image src={ROLE_ICON[role]} alt={role} width={22} height={22} className="h-[22px] w-[22px] shrink-0 object-contain opacity-70" />
                      {[0, 1, 2].map((slot) => {
                        const player = players[slot];
                        return player ? (
                          <Link
                            key={player.playerId}
                            href={`/player/${player.playerSlug}`}
                            className="truncate text-sm font-medium !text-[#FFFFFF] visited:!text-[#FFFFFF] underline-offset-2 hover:!text-[#FFFFFF] hover:underline"
                          >
                            {player.name}
                          </Link>
                        ) : (
                          <span key={slot} />
                        );
                      })}
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


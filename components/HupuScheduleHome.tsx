import Link from "next/link";

import {
  HupuScheduleExplorer,
  HupuSchedulePastMatches,
  HupuScheduleTodaySection,
} from "@/components/HupuScheduleInteractive";
import { TopSiteNav } from "@/components/TopSiteNav";
import { PublicUserTrigger } from "@/components/lol-rating/PublicUserTrigger";
import { TeamLogo } from "@/components/lol-rating/TeamLogo";
import type { ScheduleHubData } from "@/components/lol-rating/types";

function ActionPanel({ data }: { data: ScheduleHubData }) {
  const { standings, predictionLeaderboard } = data;

  return (
    <aside className="space-y-4 xl:sticky xl:top-24">
      <section className="rounded-[24px] bg-[#31313C] p-3 text-white shadow-[0_12px_30px_rgba(2,6,23,0.28)]">
        <h3 className="text-lg font-black text-white">LCK정규순위</h3>
        <div className="mt-3 overflow-hidden rounded-2xl">
          <div className="grid grid-cols-[34px_1fr_70px] bg-[#3A3A47] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#E2E8F0]">
            <div>순위</div>
            <div>팀</div>
            <div className="text-right">승/패</div>
          </div>
          <div className="divide-y divide-[#474756]">
            {standings.map((team) => (
              <div key={team.teamCode} className="grid grid-cols-[34px_1fr_70px] items-center px-3 py-2.5 text-sm text-[#E2E8F0]">
                <div className="font-black text-[#E2E8F0]">{team.rank}</div>
                <div className="flex min-w-0 items-center gap-2">
                  <TeamLogo team={team.teamCode} size={33} imageClassName="p-1" />
                  <div className="font-bold text-[#E2E8F0]">{team.teamCode}</div>
                </div>
                <div className="text-right font-semibold text-[#E2E8F0]">
                  {team.wins}/{team.losses}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[24px] bg-[#31313C] p-3 text-white shadow-[0_12px_30px_rgba(2,6,23,0.28)]">
        <h3 className="text-lg font-black text-white">코인랭킹</h3>
        <div className="mt-3 overflow-hidden rounded-2xl">
          <div className="grid grid-cols-[34px_1fr_56px] bg-[#3A3A47] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
            <div>순위</div>
            <div>닉네임</div>
            <div className="text-right">코인</div>
          </div>
          <div className="divide-y divide-[#474756]">
            {predictionLeaderboard.map((user) => (
              <div key={user.userId} className="grid grid-cols-[34px_1fr_56px] items-center px-3 py-2.5 text-sm text-white">
                <div className="font-black text-white">{user.rank}</div>
                <div className="min-w-0">
                  <PublicUserTrigger
                    summary={user.userSummary}
                    label={user.nickname}
                    className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-left font-bold text-white"
                    align="right"
                  />
                  <div className="truncate text-[11px] text-[#d6d6e5]">
                    {user.hit}적중 {" · "} {user.miss}실패
                  </div>
                </div>
                <div className="text-right font-semibold text-white">{user.points}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </aside>
  );
}

function PlayerLeaderboardSection({ data }: { data: ScheduleHubData }) {
  const topThree = data.playerLeaderboard.filter((player) => player.rank >= 1 && player.rank <= 3);
  const nextThree = data.playerLeaderboard.filter((player) => player.rank >= 4 && player.rank <= 6);

  return (
    <section className="hidden md:block">
      <div className="rounded-[18px] bg-[#31313C] p-5 text-white shadow-[0_10px_24px_rgba(2,6,23,0.28)]">
        <div className="flex items-center justify-between">
          <h2 className="text-[22px] font-black tracking-[-0.035em] text-white sm:text-[24px]">평점 TOP 선수</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#8B5CF6]/20 px-2.5 py-1 text-[11px] font-bold tracking-wide text-[#C4B5FD]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6]" />
            LIVE
          </span>
        </div>
        <div className="mt-4 space-y-2">
          {topThree.map((player) => {
            const medalColor = player.rank === 1 ? "text-[#FFD700]" : player.rank === 2 ? "text-[#C0C0C0]" : "text-[#CD7F32]";
            return (
              <Link
                key={player.playerId}
                href={`/player/${player.playerSlug}`}
                className="grid grid-cols-[36px_minmax(0,1fr)_52px_56px] items-center rounded-xl bg-[#3A3A47] px-3 py-2.5 text-sm transition hover:bg-[#454555]"
              >
                <div className={`text-base font-black ${medalColor}`}>{player.rank}</div>
                <div className="min-w-0 truncate font-semibold text-white">{player.playerName}</div>
                <div className="text-right text-xs font-medium text-[#9AA4C8]">{player.teamCode}</div>
                <div className="text-right text-base font-black text-[#C4B5FD]">{player.averageRating.toFixed(1)}</div>
              </Link>
            );
          })}
        </div>
        {nextThree.length > 0 ? (
          <>
            <div className="my-3 border-t border-[#474756]" />
            <div className="space-y-2">
              {nextThree.map((player) => (
                <Link
                  key={player.playerId}
                  href={`/player/${player.playerSlug}`}
                  className="grid grid-cols-[36px_minmax(0,1fr)_52px_56px] items-center rounded-xl px-3 py-2 text-sm transition hover:bg-[#3A3A47]"
                >
                  <div className="text-sm font-bold text-[#6B7A99]">{player.rank}</div>
                  <div className="min-w-0 truncate font-medium text-[#D4DCFF]">{player.playerName}</div>
                  <div className="text-right text-xs font-medium text-[#6B7A99]">{player.teamCode}</div>
                  <div className="text-right text-sm font-bold text-[#A78BFA]">{player.averageRating.toFixed(1)}</div>
                </Link>
              ))}
            </div>
          </>
        ) : null}
        <div className="mt-4">
          <Link
            href="/ratings"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-[12px] border border-[#5B21B6] bg-[#7C3AED] px-4 text-[22px] font-semibold text-white shadow-[0_4px_0_#5B21B6] transition-all duration-150 hover:translate-y-[2px] hover:shadow-[0_2px_0_#5B21B6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A78BFA] focus-visible:ring-offset-2 focus-visible:ring-offset-[#31313C]"
          >
            평점 보러가기 →
          </Link>
        </div>
      </div>
    </section>
  );
}

function QuickLinksSection() {
  return (
    <section className="rounded-[20px] bg-[#31313C] p-4 text-white shadow-[0_12px_28px_rgba(2,6,23,0.28)] md:hidden">
      <h2 className="text-[18px] font-black tracking-[-0.035em] text-white">빠른 이동</h2>
      <div className="mt-3 grid gap-2">
        <Link href="/schedule" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#5b5b6c] bg-[#3A3A47] px-3 text-sm font-semibold text-white transition hover:bg-[#4A4A59]">경기일정 바로가기</Link>
        <Link href="/season-predictions" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#8B5CF6] px-3 text-sm font-semibold text-white transition hover:bg-[#7C3AED]">시즌예측 참여하기</Link>
        <Link href="/ratings" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#5b5b6c] bg-[#3A3A47] px-3 text-sm font-semibold text-white transition hover:bg-[#4A4A59]">평점순위 보기</Link>
        <Link href="/games/15-dollar-challenge" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#5b5b6c] bg-[#3A3A47] px-3 text-sm font-semibold text-white transition hover:bg-[#4A4A59]">15달러 챌린지</Link>
        <Link href="/teams" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#5b5b6c] bg-[#3A3A47] px-3 text-sm font-semibold text-white transition hover:bg-[#4A4A59]">팀 로스터</Link>
        <Link href="/shop" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#5b5b6c] bg-[#3A3A47] px-3 text-sm font-semibold text-white transition hover:bg-[#4A4A59]">코인샵</Link>
      </div>
    </section>
  );
}

function ChallengePromoSection() {
  return (
    <section className="hidden rounded-[28px] bg-[#31313C] p-5 text-white shadow-[0_12px_30px_rgba(2,6,23,0.28)] sm:p-6 md:block">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[22px] font-black tracking-[-0.035em] text-white sm:text-[24px]">15달러 챌린지</h2>
          <p className="mt-2 text-sm leading-6 text-[#E2E8F0]">15달러 예산 안에서 나만의 베스트 팀을 완성해보세요.</p>
        </div>
        <Link
          href="/games/15-dollar-challenge"
          className="inline-flex min-h-12 items-center justify-center rounded-[12px] border border-[#5B21B6] bg-[#7C3AED] px-4 text-[22px] font-semibold text-white shadow-[0_4px_0_#5B21B6] transition-all duration-150 hover:translate-y-[2px] hover:shadow-[0_2px_0_#5B21B6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A78BFA] focus-visible:ring-offset-2 focus-visible:ring-offset-[#31313C]"
        >
          15달러 챌린지 하러가기
        </Link>
      </div>
    </section>
  );
}

export default function HupuScheduleHome({
  initialData,
  mode = "home",
}: {
  initialData: ScheduleHubData;
  mode?: "home" | "schedule";
}) {
  const isSchedulePage = mode === "schedule";

  return (
    <div className="min-h-screen bg-[#1C1C1F]">
      <TopSiteNav
        active={isSchedulePage ? "schedule" : "match"}
        notifications={initialData.notifications}
        unreadNotificationCount={initialData.unreadNotificationCount}
      />

      <main className="w-full bg-[#1C1C1F] py-6">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          {isSchedulePage ? (
            <HupuScheduleExplorer
              months={initialData.months}
              selectedMonthId={initialData.selectedMonthId}
              mode="schedule"
            />
          ) : (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_220px]">
              <div className="space-y-6">
                <HupuScheduleTodaySection
                  todayMatches={initialData.todayMatches}
                  featuredMatch={initialData.featuredMatch}
                  todayMatchesCount={initialData.heroStats.todayMatches}
                />
                <QuickLinksSection />
                <ChallengePromoSection />
                <HupuSchedulePastMatches matches={initialData.recentFinishedMatches} />
                <PlayerLeaderboardSection data={initialData} />
              </div>

              <div className="hidden xl:block">
                <ActionPanel data={initialData} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

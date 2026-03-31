import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { TopSiteNav } from "@/components/TopSiteNav";
import { getScheduleHubData, getTeamRosterDetailData } from "@/lib/service";

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

export default async function TeamRosterDetailPage({
  params,
}: {
  params: Promise<{ teamCode: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { teamCode } = await params;
  const [data, hubData] = await Promise.all([
    getTeamRosterDetailData(teamCode.toUpperCase()).catch(() => null),
    getScheduleHubData(session?.user?.id ?? null),
  ]);

  if (!data) {
    notFound();
  }

  return (
    <div>
      <TopSiteNav
        active="schedule"
        notifications={hubData.notifications}
        unreadNotificationCount={hubData.unreadNotificationCount}
      />

      <main className="min-h-screen bg-[#1C1C1F] px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex flex-wrap gap-3">
            <Link href="/teams" className="rounded-full bg-[#424254] px-4 py-2 text-sm font-medium text-[#FFFFFF] hover:bg-[#4D4D61]">
              팀 목록으로
            </Link>
            <Link href="/" className="rounded-full bg-[#424254] px-4 py-2 text-sm font-medium text-[#FFFFFF] hover:bg-[#4D4D61]">
              홈으로
            </Link>
          </div>

          <section className="rounded-[28px] bg-[#31313C] p-6">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.22em] text-[#AFC1F7]">{data.teamCode}</div>
                <h1 className="mt-1 text-[30px] font-semibold tracking-tight text-[#FFFFFF]">{data.teamName}</h1>
                <p className="mt-2 text-sm text-[#D4DCFF]">{data.rosterLabel}</p>
              </div>
              <div className="rounded-2xl bg-[#3A3A47] px-4 py-3 text-sm text-[#D4DCFF]">
                <div>최근 반영: {formatUpdatedAt(data.updatedAt)}</div>
                <a href={data.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-medium text-[#FFFFFF] underline underline-offset-4">
                  공식 기준 보기
                </a>
              </div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {data.players.map((player) => (
                <div key={player.playerId} className="rounded-2xl bg-[#3A3A47] p-4 text-center">
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#AFC1F7]">{player.role}</div>
                  <div className="mt-3 text-xl font-semibold tracking-tight text-[#FFFFFF]">{player.name}</div>
                  <div className="mt-2 text-xs text-[#D4DCFF]">표시 순서 {player.displayOrder}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] bg-[#31313C] p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-[#FFFFFF]">최근 경기 바로가기</h2>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {data.recentMatches.map((match) => (
                <Link
                  key={match.id}
                  href={`/matches/${match.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] bg-[#3A3A47] px-4 py-4 text-sm text-[#D4DCFF] transition hover:bg-[#424254]"
                >
                  <div>
                    <div className="font-medium text-[#FFFFFF]">{match.teamA} vs {match.teamB}</div>
                    <div className="mt-1 text-xs text-[#C2CCEC]">{match.dateLabel} / {match.timeLabel} / {match.stage}</div>
                  </div>
                  <div className="flex items-center gap-5 text-xs text-[#D4DCFF] sm:text-sm">
                    <span>{match.score}</span>
                    <span>{match.status === "finished" ? "종료" : "예정"}</span>
                    <span>평점 {match.ratingParticipants.toLocaleString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

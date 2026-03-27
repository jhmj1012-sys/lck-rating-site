import Link from "next/link";
import { notFound } from "next/navigation";

import { TeamLogo } from "@/components/lol-rating/team-branding";
import { getTeamRosterDetailData } from "@/lib/service";

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
  const { teamCode } = await params;
  const data = await getTeamRosterDetailData(teamCode.toUpperCase()).catch(() => null);
  if (!data) {
    notFound();
  }

  return (
    <main className="app-shell px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap gap-3">
          <Link href="/teams" className="ui-action-secondary">
            팀 목록으로
          </Link>
          <Link href="/" className="ui-action-secondary">
            일정 허브로
          </Link>
        </div>

        <section className="ui-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              <TeamLogo team={data.teamCode} size={62} />
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">{data.teamCode}</div>
                <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">{data.teamName}</h1>
                <p className="mt-2 text-sm text-slate-600">{data.rosterLabel}</p>
              </div>
            </div>
            <div className="ui-card-soft px-4 py-3 text-sm text-slate-600">
              <div>최근 반영: {formatUpdatedAt(data.updatedAt)}</div>
              <a href={data.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-medium text-sky-700 underline underline-offset-4">
                공식 기준 보기
              </a>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {data.players.map((player) => (
              <div key={player.playerId} className="ui-card-soft p-4 text-center">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{player.role}</div>
                <div className="mt-3 text-xl font-black tracking-tight text-slate-950">{player.name}</div>
                <div className="mt-2 text-xs text-slate-500">표시 순서 {player.displayOrder}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="ui-card p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Recent Matches</div>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">최근 경기 바로가기</h2>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {data.recentMatches.map((match) => (
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 transition hover:border-sky-200 hover:bg-sky-50/40"
              >
                <div>
                  <div className="font-semibold text-slate-950">{match.teamA} vs {match.teamB}</div>
                  <div className="mt-1 text-xs text-slate-500">{match.dateLabel} · {match.timeLabel} · {match.stage}</div>
                </div>
                <div className="flex items-center gap-5 text-xs text-slate-500 sm:text-sm">
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
  );
}

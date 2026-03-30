import Link from "next/link";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";

import { authOptions } from "@/auth";
import { TopSiteNav } from "@/components/TopSiteNav";
import { getPlayerDetailPageData, getScheduleHubData } from "@/lib/service";

type PageProps = {
  params: Promise<{ id: string }>;
};

function ResultBadge({ result }: { result: "W" | "L" | "-" }) {
  if (result === "W") {
    return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">W</span>;
  }
  if (result === "L") {
    return <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">L</span>;
  }
  return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">-</span>;
}

export default async function PlayerDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const [hubData, player] = await Promise.all([
    getScheduleHubData(session?.user?.id ?? null),
    getPlayerDetailPageData(id),
  ]);

  if (!player) {
    notFound();
  }

  return (
    <div>
      <TopSiteNav
        active="ratings"
        notifications={hubData.notifications}
        unreadNotificationCount={hubData.unreadNotificationCount}
      />
      <main className="app-shell px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>

              <h1 className="text-3xl font-black tracking-tight text-slate-950">{player.playerName}</h1>
              <p className="mt-1 text-sm text-slate-600">
                {player.teamCode} · {player.role}
              </p>
            </div>
            <Link href="/ratings" className="ui-action-secondary">
              평점순위로 돌아가기
            </Link>
          </div>

          <section className="grid gap-4 md:grid-cols-4">
            <article className="ui-card p-5">
              <div className="text-xs text-slate-500">평균 평점</div>
              <div className="mt-2 text-3xl font-black text-sky-600">{player.averageRating.toFixed(1)}</div>
            </article>
            <article className="ui-card p-5">
              <div className="text-xs text-slate-500">최근폼</div>
              <div className="mt-2 text-3xl font-black text-slate-950">{player.recentForm.toFixed(1)}</div>
            </article>
            <article className="ui-card p-5">
              <div className="text-xs text-slate-500">경기 수</div>
              <div className="mt-2 text-3xl font-black text-slate-950">{player.matchCount}</div>
            </article>
            <article className="ui-card p-5">
              <div className="text-xs text-slate-500">참여 수</div>
              <div className="mt-2 text-3xl font-black text-slate-950">{player.participationCount}</div>
            </article>
          </section>

          <section className="ui-card p-5">
            <h2 className="text-lg font-black text-slate-950">최근 5경기 평점</h2>
            <div className="mt-4 space-y-2">
              {player.recentMatches.map((match) => (
                <Link
                  key={`${match.matchId}-${match.ratedAt}`}
                  href={`/matches/${match.matchId}`}
                  className="grid grid-cols-[minmax(0,1fr)_120px] items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:bg-sky-50/60"
                >
                  <div className="truncate text-sm font-semibold text-slate-800">{match.matchLabel}</div>
                  <div className="flex items-center justify-end gap-2">
                    <ResultBadge result={match.result} />
                    <div className="text-right text-xl font-black text-slate-950">{match.score.toFixed(1)}</div>
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

import Link from "next/link";
import { notFound } from "next/navigation";

import { getPlayerDetailPageData } from "@/lib/service";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PlayerDetailPage({ params }: PageProps) {
  const { id } = await params;

  try {
    const player = await getPlayerDetailPageData(id);

    return (
      <main className="app-shell px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">PLAYER DETAIL</div>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{player.playerName}</h1>
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
              <div className="mt-2 text-3xl font-black text-sky-600">{player.averageRating.toFixed(2)}</div>
            </article>
            <article className="ui-card p-5">
              <div className="text-xs text-slate-500">최근폼</div>
              <div className="mt-2 text-3xl font-black text-slate-950">{player.recentForm.toFixed(2)}</div>
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
                  className="grid grid-cols-[minmax(0,1fr)_70px] items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:bg-sky-50/60"
                >
                  <div className="truncate text-sm font-semibold text-slate-800">{match.matchLabel}</div>
                  <div className="text-right text-xl font-black text-slate-950">{match.score.toFixed(1)}</div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    );
  } catch {
    notFound();
  }
}

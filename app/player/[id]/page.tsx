import Link from "next/link";
import { notFound } from "next/navigation";

import { BackNavButton } from "@/components/BackNavButton";
import { TopSiteNav } from "@/components/TopSiteNav";
import { getPlayerDetailPageData } from "@/lib/service";

type PageProps = {
  params: Promise<{ id: string }>;
};

function ResultBadge({ result }: { result: "W" | "L" | "-" }) {
  if (result === "W") {
    return <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-emerald-900/40 text-xs font-semibold leading-none text-emerald-300">W</span>;
  }
  if (result === "L") {
    return <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-rose-900/40 text-xs font-semibold leading-none text-rose-300">L</span>;
  }
  return <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#4A4A5C] text-xs font-semibold leading-none text-[#D4DCFF]">-</span>;
}

export default async function PlayerDetailPage({ params }: PageProps) {
  const { id } = await params;
  let player = null;

  try {
    player = await getPlayerDetailPageData(id);
  } catch {
    notFound();
  }

  if (!player) {
    notFound();
  }

  return (
    <div>
      <TopSiteNav active="ratings" />
      <main className="min-h-screen bg-[#1C1C1F] px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-[30px] font-semibold tracking-tight text-[#FFFFFF]">{player.playerName}</h1>
              <p className="mt-1 text-sm text-[#D4DCFF]">
                {player.teamCode} / {player.role}
              </p>
            </div>
            <BackNavButton
              fallbackHref="/ratings"
              className="rounded-full bg-[#424254] px-4 py-2 text-sm font-medium !text-[#F8F8F8] hover:!text-[#F8F8F8] hover:bg-[#4D4D61]"
            >
              돌아가기
            </BackNavButton>
          </div>

          <section className="grid gap-4 md:grid-cols-4">
            <article className="rounded-3xl bg-[#31313C] p-5">
              <div className="text-xs text-[#D4DCFF]">평균 평점</div>
              <div className="mt-2 text-3xl font-semibold text-[#FFFFFF]">{player.averageRating.toFixed(1)}</div>
            </article>
            <article className="rounded-3xl bg-[#31313C] p-5">
              <div className="text-xs text-[#D4DCFF]">최근 폼</div>
              <div className="mt-2 text-3xl font-semibold text-[#FFFFFF]">{player.recentForm.toFixed(1)}</div>
            </article>
            <article className="rounded-3xl bg-[#31313C] p-5">
              <div className="text-xs text-[#D4DCFF]">경기 수</div>
              <div className="mt-2 text-3xl font-semibold text-[#FFFFFF]">{player.matchCount}</div>
            </article>
            <article className="rounded-3xl bg-[#31313C] p-5">
              <div className="text-xs text-[#D4DCFF]">참여 수</div>
              <div className="mt-2 text-3xl font-semibold text-[#FFFFFF]">{player.participationCount}</div>
            </article>
          </section>

          <section className="rounded-3xl bg-[#31313C] p-5">
            <h2 className="text-lg font-semibold text-[#FFFFFF]">최근 5경기 평점</h2>
            <div className="mt-4 space-y-2">
              {player.recentMatches.map((match) => (
                <Link
                  key={`${match.matchId}-${match.ratedAt}`}
                  href={`/matches/${match.matchId}`}
                  className="grid grid-cols-[minmax(0,1fr)_120px] items-center rounded-2xl bg-[#3A3A47] px-4 py-3 transition hover:bg-[#424254]"
                >
                  <div className="truncate text-sm font-medium text-[#FFFFFF]">{match.matchLabel}</div>
                  <div className="flex items-center justify-end gap-2">
                    <ResultBadge result={match.result} />
                    <div className="w-12 text-right text-xl font-semibold tabular-nums text-[#FFFFFF]">{match.score.toFixed(1)}</div>
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

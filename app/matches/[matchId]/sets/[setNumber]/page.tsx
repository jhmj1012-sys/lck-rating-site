import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { TopSiteNav } from "@/components/TopSiteNav";
import { SetRatingPanel, SetRatingsBoard } from "@/components/lol-rating/DetailPanels";
import { getSetDetailData } from "@/lib/service";

export default async function MatchSetDetailPage({
  params,
}: {
  params: Promise<{ matchId: string; setNumber: string }>;
}) {
  const { matchId, setNumber } = await params;
  const session = await getServerSession(authOptions);

  const data = await getSetDetailData(matchId, Number(setNumber), session?.user?.id ?? null).catch(() => null);
  if (!data) {
    notFound();
  }

  return (
    <main className="match-detail-theme app-shell min-h-screen bg-[#1C1C1F] pb-8">
      <TopSiteNav active="match" notifications={[]} unreadNotificationCount={0} maxWidthClass="max-w-7xl" />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap gap-3">
          <Link href="/" className="ui-action-secondary min-h-10">
            일정으로
          </Link>
          <Link href={`/matches/${matchId}`} className="ui-action-secondary min-h-10">
            경기 상세로
          </Link>
        </div>

        <section className="ui-card p-6">
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{data.title}</h1>
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
            <span>승리 팀 {data.winnerTeam ?? "-"}</span>
            <span>진행 시간 {data.durationLabel}</span>
            <span>세트 스코어 {data.scoreLabel}</span>
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-700">{data.note || "등록된 세트 메모가 없습니다."}</p>
        </section>

        <SetRatingPanel data={data} />
        <SetRatingsBoard data={data} />
      </div>
    </main>
  );
}


import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { MatchEngagementPanel, MatchOverviewPanel, MatchSetLinks } from "@/components/lol-rating/DetailPanels";
import { getMatchDetailData } from "@/lib/service";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const session = await getServerSession(authOptions);

  const data = await getMatchDetailData(matchId, session?.user?.id ?? null).catch(() => null);
  if (!data) {
    notFound();
  }

  return (
    <main className="app-shell px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link href="/" className="ui-action-secondary min-h-10">
          일정으로 돌아가기
        </Link>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <MatchOverviewPanel match={data.match} sets={data.sets} />
            <MatchSetLinks matchId={data.match.id} sets={data.sets} />
          </div>
          <MatchEngagementPanel match={data.match} />
        </div>
      </div>
    </main>
  );
}


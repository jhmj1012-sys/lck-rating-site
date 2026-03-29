import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { TopSiteNav } from "@/components/TopSiteNav";
import { MatchDetailStateView } from "@/components/lol-rating/MatchDetailViews";
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
    <main className="app-shell pb-8">
      <TopSiteNav active="match" notifications={[]} unreadNotificationCount={0} maxWidthClass="max-w-5xl" />
      <div className="mx-auto mt-6 max-w-5xl space-y-6 px-4 sm:px-6">
        <MatchDetailStateView data={data} />
      </div>
    </main>
  );
}

import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { BudgetChallengePage } from "@/components/games/BudgetChallengePage";
import { TopSiteNav } from "@/components/TopSiteNav";
import { getScheduleHubData } from "@/lib/service";

export default async function FifteenDollarChallengePage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const [session, params] = await Promise.all([
    getServerSession(authOptions),
    searchParams,
  ]);

  const userId = session?.user?.id ?? null;

  const hubData = await getScheduleHubData(userId);

  return (
    <div className="min-h-screen bg-[#1C1C1F]">
      <TopSiteNav
        active="games"
        notifications={hubData.notifications}
        unreadNotificationCount={hubData.unreadNotificationCount}
      />
      <BudgetChallengePage initialEncodedSelection={params.c} />
    </div>
  );
}

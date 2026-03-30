import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { BudgetChallengePage } from "@/components/games/BudgetChallengePage";
import { TopSiteNav } from "@/components/TopSiteNav";
import { getScheduleHubData } from "@/lib/service";

export default async function FifteenDollarChallengePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  const [hubData, params] = await Promise.all([
    getScheduleHubData(session?.user?.id ?? null),
    searchParams,
  ]);
  const encodedSelection = Array.isArray(params.c) ? params.c[0] : params.c;

  return (
    <div>
      <TopSiteNav
        active="games"
        notifications={hubData.notifications}
        unreadNotificationCount={hubData.unreadNotificationCount}
      />
      <BudgetChallengePage initialEncodedSelection={encodedSelection} />
    </div>
  );
}

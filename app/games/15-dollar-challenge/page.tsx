import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { BudgetChallengePage } from "@/components/games/BudgetChallengePage";
import { TopSiteNav } from "@/components/TopSiteNav";
import { listBudgetChallengePosts } from "@/lib/games/budget-challenge-posts";
import { getScheduleHubData } from "@/lib/service";

export default async function FifteenDollarChallengePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  const [hubData, params, initialPosts] = await Promise.all([
    getScheduleHubData(session?.user?.id ?? null),
    searchParams,
    listBudgetChallengePosts(),
  ]);
  const encodedSelection = Array.isArray(params.c) ? params.c[0] : params.c;

  return (
    <div>
      <TopSiteNav
        active="games"
        notifications={hubData.notifications}
        unreadNotificationCount={hubData.unreadNotificationCount}
      />
      <BudgetChallengePage
        initialEncodedSelection={encodedSelection}
        initialPosts={initialPosts}
        viewer={{
          isAuthenticated: Boolean(session?.user?.id),
          hasNickname: Boolean(session?.user?.nickname),
          nickname: session?.user?.nickname ?? null,
        }}
      />
    </div>
  );
}

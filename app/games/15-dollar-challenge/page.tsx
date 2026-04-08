import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { BudgetChallengePage } from "@/components/games/BudgetChallengePage";
import { TopSiteNav } from "@/components/TopSiteNav";
import { listBudgetChallengePosts } from "@/lib/games/budget-challenge-posts";
import { getScheduleHubData } from "@/lib/service";
import { readStore } from "@/lib/store";

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

  const [hubData, posts, store] = await Promise.all([
    getScheduleHubData(userId),
    listBudgetChallengePosts(userId),
    readStore(),
  ]);

  const user = userId ? (store.users.find((u) => u.id === userId) ?? null) : null;

  return (
    <div className="min-h-screen bg-[#1C1C1F]">
      <TopSiteNav
        active="games"
        notifications={hubData.notifications}
        unreadNotificationCount={hubData.unreadNotificationCount}
      />
      <BudgetChallengePage
        initialEncodedSelection={params.c}
        initialPosts={posts}
        viewer={{
          isAuthenticated: !!userId,
          hasNickname: Boolean(user?.nickname),
          nickname: user?.nickname ?? null,
        }}
      />
    </div>
  );
}

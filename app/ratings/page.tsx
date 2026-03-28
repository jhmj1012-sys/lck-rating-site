import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { PlayerRankingBoard } from "@/components/PlayerRankingBoard";
import { TopSiteNav } from "@/components/TopSiteNav";
import { getPlayerRankingPageData, getScheduleHubData } from "@/lib/service";

export default async function RatingsPage() {
  const session = await getServerSession(authOptions);
  const [data, hubData] = await Promise.all([
    getPlayerRankingPageData(),
    getScheduleHubData(session?.user?.id ?? null),
  ]);

  return (
    <div>
      <TopSiteNav
        active="ratings"
        notifications={hubData.notifications}
        unreadNotificationCount={hubData.unreadNotificationCount}
      />
      <PlayerRankingBoard data={data} />
    </div>
  );
}

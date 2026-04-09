import { PlayerRankingBoard } from "@/components/PlayerRankingBoard";
import { TopSiteNav } from "@/components/TopSiteNav";
import { getPlayerRankingPageData } from "@/lib/service";

export default async function RatingsPage() {
  const data = await getPlayerRankingPageData();

  return (
    <div>
      <TopSiteNav active="ratings" />
      <PlayerRankingBoard data={data} />
    </div>
  );
}

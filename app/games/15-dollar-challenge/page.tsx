import { BudgetChallengePage } from "@/components/games/BudgetChallengePage";
import { TopSiteNav } from "@/components/TopSiteNav";

export default async function FifteenDollarChallengePage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen bg-[#1C1C1F]">
      <TopSiteNav active="games" />
      <BudgetChallengePage initialEncodedSelection={params.c} />
    </div>
  );
}

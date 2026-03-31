import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { TopSiteNav } from "@/components/TopSiteNav";
import { getScheduleHubData } from "@/lib/service";
import { SignInCard } from "./SignInCard";

export default async function SignInPage() {
  const session = await getServerSession(authOptions);
  const hubData = await getScheduleHubData(session?.user?.id ?? null);

  return (
    <div>
      <TopSiteNav
        active="match"
        notifications={hubData.notifications}
        unreadNotificationCount={hubData.unreadNotificationCount}
      />
      <main className="min-h-screen bg-[#1C1C1F] px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-center">
          <SignInCard />
        </div>
      </main>
    </div>
  );
}

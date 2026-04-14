import { HupuScheduleExplorer } from "@/components/HupuScheduleInteractive";
import { TopSiteNav } from "@/components/TopSiteNav";
import type { ScheduleHubData } from "@/components/lol-rating/types";

export default function HupuSchedulePage({ initialData }: { initialData: ScheduleHubData }) {
  return (
    <div className="min-h-screen bg-[#1C1C1F]">
      <TopSiteNav
        active="schedule"
        notifications={initialData.notifications}
        unreadNotificationCount={initialData.unreadNotificationCount}
      />

      <main className="w-full bg-[#1C1C1F] py-6">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <HupuScheduleExplorer
            months={initialData.months}
            selectedMonthId={initialData.selectedMonthId}
            mode="schedule"
          />
        </div>
      </main>
    </div>
  );
}

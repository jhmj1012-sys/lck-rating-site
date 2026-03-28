import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import HupuScheduleHome from "@/components/HupuScheduleHome";
import { getScheduleHubData } from "@/lib/service";

export default async function SchedulePage() {
  const session = await getServerSession(authOptions);
  const initialData = await getScheduleHubData(session?.user?.id ?? null);

  return <HupuScheduleHome initialData={initialData} mode="schedule" />;
}

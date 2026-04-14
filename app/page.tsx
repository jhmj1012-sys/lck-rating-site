import HupuScheduleHome from "@/components/HupuScheduleHome";
import { getScheduleHubData } from "@/lib/service";

export default async function Page() {
  const initialData = await getScheduleHubData(null);

  return <HupuScheduleHome initialData={initialData} />;
}

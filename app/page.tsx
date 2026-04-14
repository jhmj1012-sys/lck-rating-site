import HupuScheduleHome from "@/components/HupuScheduleHome";
import { getHomePageData } from "@/lib/service";

export default async function Page() {
  const initialData = await getHomePageData();

  return <HupuScheduleHome initialData={initialData} />;
}

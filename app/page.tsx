import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/auth";
import HupuScheduleHome from "@/components/HupuScheduleHome";
import { markNicknameOnboardingSeen } from "@/lib/authz";
import { getScheduleHubData } from "@/lib/service";

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (session?.user?.id && !session.user.hasNickname && !session.user.nicknameOnboardingSeen) {
    await markNicknameOnboardingSeen(session.user.id);
    redirect("/me?setup=1");
  }
  const initialData = await getScheduleHubData(session?.user?.id ?? null);

  return <HupuScheduleHome initialData={initialData} />;
}

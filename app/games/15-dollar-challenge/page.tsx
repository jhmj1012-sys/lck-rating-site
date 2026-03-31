import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { TopSiteNav } from "@/components/TopSiteNav";
import { getScheduleHubData } from "@/lib/service";

export default async function FifteenDollarChallengePage() {
  const session = await getServerSession(authOptions);
  const hubData = await getScheduleHubData(session?.user?.id ?? null);

  return (
    <div>
      <TopSiteNav
        active="games"
        notifications={hubData.notifications}
        unreadNotificationCount={hubData.unreadNotificationCount}
      />

      <main className="min-h-screen bg-[#1C1C1F] px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div>
            <h1 className="text-[30px] font-semibold tracking-tight text-[#FFFFFF]">15달러 챌린지</h1>
            <p className="mt-2 text-sm leading-6 text-[#D4DCFF]">챌린지 페이지는 현재 개편 작업 중입니다. 곧 더 나은 모습으로 돌아올게요.</p>
          </div>

          <section className="rounded-[28px] bg-[#31313C] p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <article className="rounded-[24px] bg-[#3A3A47] px-5 py-5">
                <div className="text-3xl">🛠️🎮</div>
                <div className="mt-2 text-xl font-medium text-[#FFFFFF]">챌린지 리빌딩 중</div>
                <p className="mt-2 text-sm leading-6 text-[#D4DCFF]">기존 기능은 잠시 내리고, 더 안정적인 버전으로 재구성하고 있어요.</p>
              </article>

              <article className="rounded-[24px] bg-[#3A3A47] px-5 py-5">
                <div className="text-3xl">🪙✨</div>
                <div className="mt-2 text-xl font-medium text-[#FFFFFF]">곧 다시 오픈</div>
                <p className="mt-2 text-sm leading-6 text-[#D4DCFF]">코인/랭킹 연동을 포함한 새 챌린지 경험을 준비 중입니다.</p>
              </article>
            </div>

            <div className="mt-6 rounded-[24px] bg-[#3A3A47] px-5 py-5">
              <div className="text-2xl">🚧🐣🚧</div>
              <div className="mt-2 text-base font-medium text-[#FFFFFF]">현재 개발중입니다</div>
              <p className="mt-2 text-sm leading-6 text-[#D4DCFF]">잠시만 기다려 주세요. 빠르게 다시 열어둘게요.</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { TopSiteNav } from "@/components/TopSiteNav";
import { getScheduleHubData } from "@/lib/service";

export default async function ShopPage() {
  const session = await getServerSession(authOptions);
  const hubData = await getScheduleHubData(session?.user?.id ?? null);

  return (
    <div>
      <TopSiteNav
        active="none"
        notifications={hubData.notifications}
        unreadNotificationCount={hubData.unreadNotificationCount}
      />

      <main className="min-h-screen bg-[#1C1C1F] px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <section className="rounded-[28px] bg-[#31313C] p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <article className="rounded-[24px] bg-[#3A3A47] px-5 py-5">
                <div className="text-3xl">🛠️✨</div>
                <div className="mt-2 text-xl font-medium text-[#FFFFFF]">개발중이에요</div>
                <p className="mt-2 text-sm leading-6 text-[#D4DCFF]">코인 사용 기능, 상품 카드, 교환 플로우를 준비하고 있어요.</p>
              </article>

              <article className="rounded-[24px] bg-[#3A3A47] px-5 py-5">
                <div className="text-3xl">🪙🐣</div>
                <div className="mt-2 text-xl font-medium text-[#FFFFFF]">곧 오픈 예정</div>
                <p className="mt-2 text-sm leading-6 text-[#D4DCFF]">코인으로 꾸미기 아이템과 리워드 상품을 고를 수 있게 될 거예요.</p>
              </article>
            </div>

            <div className="mt-6 rounded-[24px] bg-[#3A3A47] px-5 py-5">
              <div className="text-2xl">🚧💜🚧</div>
              <div className="mt-2 text-base font-medium text-[#FFFFFF]">아직 개발중인 코너입니다</div>
              <p className="mt-2 text-sm leading-6 text-[#D4DCFF]">UI와 상품 구성을 다듬는 중이라, 현재는 미리보기 형태로만 제공되고 있어요.</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

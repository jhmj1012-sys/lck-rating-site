import Link from "next/link";
import { redirect } from "next/navigation";

import { markAllNotificationsReadAction } from "@/app/me/actions";
import { getCurrentUser } from "@/lib/authz";
import { getMyPageData } from "@/lib/service";

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getNotificationTab(type: string) {
  if (type === "prediction_joined") {
    return "joined";
  }
  if (type === "prediction_hit" || type === "prediction_missed") {
    return "settled";
  }
  return "all";
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }

  const data = await getMyPageData(user.id);
  const params = await searchParams;
  const activeTab = readParam(params.tab) ?? "all";

  const tabs = [
    { id: "all", label: "전체" },
    { id: "joined", label: "참여" },
    { id: "settled", label: "정산" },
  ] as const;

  const notifications = data.notifications.filter((notification) => {
    if (activeTab === "all") {
      return true;
    }
    return getNotificationTab(notification.type) === activeTab;
  });

  return (
    <main className="app-shell px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">알림</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">예측 참여, 정산 결과, 코인 반영 내역을 한곳에서 확인합니다.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              홈으로 돌아가기
            </Link>
            <Link
              href="/me"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              마이페이지
            </Link>
          </div>
        </div>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const isActive = tab.id === activeTab;
                return (
                  <Link
                    key={tab.id}
                    href={tab.id === "all" ? "/notifications" : `/notifications?tab=${tab.id}`}
                    className={
                      isActive
                        ? "inline-flex min-h-10 items-center rounded-full border border-slate-950 bg-slate-950 px-4 text-sm font-semibold !text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]"
                        : "inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    }
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-600">
                읽지 않은 알림 {data.unreadNotificationCount}개
              </div>
              <form action={markAllNotificationsReadAction}>
                <button
                  type="submit"
                  className="inline-flex min-h-10 cursor-pointer items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  모두 읽음 처리
                </button>
              </form>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={
                  notification.isRead
                    ? "rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4"
                    : "rounded-[24px] border border-sky-200 bg-sky-50 px-5 py-4"
                }
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-bold text-slate-950">{notification.title}</div>
                      {!notification.isRead ? (
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-sky-700">새 알림</span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{notification.body}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>{notification.createdLabel}</span>
                      {notification.appliedOddsPercent ? <span>확정 배당 {notification.appliedOddsPercent}%</span> : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {notification.rewardCoins ? (
                      <div className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-emerald-700">
                        +{notification.rewardCoins} Coin
                      </div>
                    ) : null}
                    {notification.relatedMatchId ? (
                      <Link
                        href={`/matches/${notification.relatedMatchId}`}
                        className="inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        관련 경기 보기
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
            {notifications.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
                표시할 알림이 없습니다.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

import Link from "next/link";
import { getServerSession } from "next-auth";
import Image from "next/image";

import { authOptions } from "@/auth";
import { TopSiteNav } from "@/components/TopSiteNav";
import { getSeasonPredictionListData } from "@/lib/service";

function getStatusLabel(status: string) {
  if (status === "open") return "진행중";
  if (status === "locked") return "마감";
  if (status === "resolved") return "종료";
  if (status === "canceled") return "취소";
  return status;
}

function getStatusBadgeClass(status: string) {
  if (status === "open") return "bg-[#8B5CF6] text-white";
  return "bg-[#4A4A59] text-[#d6d6e5]";
}

function getMarketLogo(logoKey: "lck" | "msi" | "worlds") {
  if (logoKey === "msi") {
    return { src: "/icons/leagues/msi.webp", alt: "MSI 로고" };
  }
  if (logoKey === "worlds") {
    return { src: "/icons/leagues/worlds.webp", alt: "Worlds 로고" };
  }
  return { src: "/icons/leagues/lck.webp", alt: "LCK 로고" };
}

export default async function SeasonPredictionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;
  const category = Array.isArray(params.category) ? params.category[0] : params.category;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;

  const data = await getSeasonPredictionListData(session?.user?.id ?? null, { category, status });

  return (
    <div>
      <TopSiteNav active="season" />

      <main className="min-h-screen bg-[#1C1C1F] px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.items.map((item) => {
              const logo = getMarketLogo(item.logoKey);
              const topRows = item.topOptions.length > 0 ? item.topOptions : [{ label: "데이터 집계 중", percent: 0 }];
              return (
                <Link
                  key={item.id}
                  href={`/season-predictions/${item.id}`}
                  className="group relative rounded-[22px] bg-[#3A3A47] p-4 shadow-[0_10px_26px_rgba(2,6,23,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(2,6,23,0.34)]"
                >
                  <div className="flex items-start gap-3 pr-16">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#474756] bg-[#31313C]">
                        <Image src={logo.src} alt={logo.alt} width={28} height={28} className="h-7 w-7 object-contain" />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-[16px] font-bold text-white">{item.title}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {topRows.slice(0, 3).map((row, index) => (
                      <div
                        key={`${item.id}_top_${index}`}
                        className={index >= 2 ? "hidden sm:block" : "block"}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="truncate text-sm font-medium text-[#d6d6e5]">{row.label}</span>
                          <span className="text-base font-black tracking-tight text-white">{row.percent}%</span>
                        </div>
                        <div className="h-1 w-full rounded-full bg-[#31313C]">
                          <div
                            className="h-1 rounded-full bg-[#8B5CF6]"
                            style={{ width: `${Math.max(row.percent, row.percent > 0 ? 2 : 0)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 border-t border-[#474756] pt-3 pr-20 text-xs font-medium text-[#d6d6e5]">
                    현재 {item.totalEntries.toLocaleString()}명 참가중
                  </div>
                  <span className={`absolute bottom-4 right-4 rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(item.status)}`}>
                    {getStatusLabel(item.status)}
                  </span>
                </Link>
              );
            })}
            {data.items.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-sm text-slate-500 md:col-span-2 xl:col-span-3">
                표시할 시즌 예측이 없습니다.
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}

import Link from "next/link";

import { TopSiteNav } from "@/components/TopSiteNav";
import { getGlobalSearchData } from "@/lib/service";

function getTypeLabel(type: "team" | "player" | "match") {
  if (type === "team") return "팀";
  if (type === "player") return "선수";
  return "경기";
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qParam = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = (qParam ?? "").trim();

  const searchData = await getGlobalSearchData(query);

  return (
    <div>
      <TopSiteNav active="match" />
      <main className="app-shell px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-5">
          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">

            <h1 className="mt-2 text-3xl font-black tracking-[-0.035em] text-slate-950">검색 결과</h1>
            {query ? (
              <div className="mt-2 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">"{query}"</span> · 총 {searchData.totalCount}건
              </div>
            ) : (
              <div className="mt-2 text-sm text-slate-500">팀, 선수, 경기 키워드를 입력해 주세요.</div>
            )}
          </section>

          {query && searchData.groups.length === 0 ? (
            <section className="rounded-[24px] border border-dashed border-slate-200 bg-white px-5 py-12 text-center text-sm text-slate-500">
              검색 결과가 없습니다.
            </section>
          ) : null}

          {searchData.groups.map((group) => (
            <section key={group.type} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
              <div className="mb-3 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                {getTypeLabel(group.type)}
              </div>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <Link
                    key={`${item.type}_${item.id}`}
                    href={item.href}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-bold text-slate-950">{item.title}</div>
                      <div className="mt-0.5 truncate text-sm text-slate-500">{item.subtitle}</div>
                    </div>
                    <div className="shrink-0 text-xs font-semibold text-slate-500">{getTypeLabel(item.type)}</div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}

import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { SeasonPredictionEntryForm } from "@/components/lol-rating/SeasonPredictionEntryForm";
import { getSeasonPredictionDetailData } from "@/lib/service";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export default async function SeasonPredictionDetailPage({
  params,
}: {
  params: Promise<{ questionId: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { questionId } = await params;
  const detail = await getSeasonPredictionDetailData(questionId, session?.user?.id ?? null);

  return (
    <main className="app-shell px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap gap-3">
          <Link href="/season-predictions" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700">
            시즌예측 목록으로
          </Link>
          <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700">
            홈으로
          </Link>
        </div>

        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">{detail.category}</div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{detail.status}</div>
          </div>
          <h1 className="mt-4 text-3xl font-black text-slate-950">{detail.title}</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">{detail.description}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <div className="text-xs text-slate-500">시즌</div>
              <div className="mt-1 font-semibold text-slate-950">{detail.season}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <div className="text-xs text-slate-500">마감 시각</div>
              <div className="mt-1 font-semibold text-slate-950">{formatDate(detail.closeAt)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <div className="text-xs text-slate-500">참여자 수</div>
              <div className="mt-1 font-semibold text-slate-950">{detail.totalEntries}명</div>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
            {detail.canSubmit ? `마감까지 ${detail.countdownLabel}` : detail.status === "resolved" ? "결과가 확정되었습니다." : "마감된 질문입니다."}
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <SeasonPredictionEntryForm detail={detail} />
        </section>
      </div>
    </main>
  );
}

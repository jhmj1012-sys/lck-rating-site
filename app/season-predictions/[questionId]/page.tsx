import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { BackNavButton } from "@/components/BackNavButton";
import { TopSiteNav } from "@/components/TopSiteNav";
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

export default async function SeasonPredictionDetailPage({
  params,
}: {
  params: Promise<{ questionId: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { questionId } = await params;
  const detail = await getSeasonPredictionDetailData(questionId, session?.user?.id ?? null);

  return (
    <div>
      <TopSiteNav active="season" />

      <main className="min-h-screen bg-[#1C1C1F] px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex justify-end">
            <BackNavButton
              fallbackHref="/season-predictions"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#424254] px-4 text-sm font-medium !text-[#FFFFFF]"
            >
              돌아가기
            </BackNavButton>
          </div>

          <section className="rounded-[30px] bg-[#31313C] p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="rounded-full bg-[#4A4A59] px-3 py-1 text-xs font-semibold text-[#d6d6e5]">{detail.category}</div>
              <div className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(detail.status)}`}>{getStatusLabel(detail.status)}</div>
            </div>
            <h1 className="mt-4 text-3xl font-black text-white">{detail.title}</h1>

            <div className="mt-3 flex flex-wrap gap-2 sm:hidden">
              <div className="rounded-full bg-[#3A3A47] px-3 py-1 text-xs font-medium text-[#d6d6e5]">{detail.season}</div>
              <div className="rounded-full bg-[#3A3A47] px-3 py-1 text-xs font-medium text-[#d6d6e5]">참여 {detail.totalEntries}명</div>
              <div className="rounded-full bg-[#3A3A47] px-3 py-1 text-xs font-medium text-[#d6d6e5]">마감 {formatDate(detail.closeAt)}</div>
            </div>

            <p className="mt-3 hidden text-sm leading-7 text-[#d6d6e5] sm:block">{detail.description}</p>

            <div className="mt-4 rounded-2xl bg-[#3A3A47] px-4 py-3 text-sm text-[#d6d6e5]">
              {detail.canSubmit
                ? `마감까지 ${detail.countdownLabel}`
                : detail.status === "resolved"
                  ? "결과가 확정되었습니다."
                  : "마감된 질문입니다."}
            </div>

            {detail.myEntry ? (
              <div className="mt-3 rounded-2xl border-l-4 border-[#8B5CF6] bg-[rgba(139,92,246,0.08)] px-4 py-3 text-sm text-[#d6d6e5]">
                현재 내 선택: <span className="font-bold text-white">{detail.myEntry.selectedOptionLabel}</span>
              </div>
            ) : null}

            <div className="mt-4 border-t border-[#474756] pt-4">
              <SeasonPredictionEntryForm detail={detail} showMyEntry={false} />
            </div>

            <div className="mt-5 hidden gap-3 sm:grid sm:grid-cols-3">
              <div className="rounded-2xl bg-[#3A3A47] px-4 py-3 text-sm">
                <div className="text-xs text-[#d6d6e5]">시즌</div>
                <div className="mt-1 font-semibold text-white">{detail.season}</div>
              </div>
              <div className="rounded-2xl bg-[#3A3A47] px-4 py-3 text-sm">
                <div className="text-xs text-[#d6d6e5]">마감 시각</div>
                <div className="mt-1 font-semibold text-white">{formatDate(detail.closeAt)}</div>
              </div>
              <div className="rounded-2xl bg-[#3A3A47] px-4 py-3 text-sm">
                <div className="text-xs text-[#d6d6e5]">참여자</div>
                <div className="mt-1 font-semibold text-white">{detail.totalEntries}명</div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

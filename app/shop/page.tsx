import Link from "next/link";

export default function ShopPage() {
  return (
    <main className="app-shell px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
  
            <h1 className="mt-2 text-3xl font-black text-slate-950">코인 상점</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              예측과 평점 참여로 모은 코인을 어디에 쓸지 보여주는 공간입니다. 세부 아이템은 다음 단계에서 확장합니다.
            </p>
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
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5">
              <div className="mt-2 text-xl font-black text-slate-950">프로필 인장</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">예측 기록과 활동 스타일에 맞는 프로필 문구 보상을 준비 중입니다.</p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5">
              <div className="mt-2 text-xl font-black text-slate-950">테마 효과</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">프로필 카드와 페이지 분위기를 바꾸는 꾸미기 요소를 확장할 예정입니다.</p>
            </div>
          </div>

          <div className="mt-6 rounded-[24px] border border-sky-100 bg-sky-50 px-5 py-4">
            <div className="text-sm font-semibold text-slate-950">구조만 먼저 연결해 두었습니다.</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              현재는 상점 진입 흐름과 정보 구조만 열려 있고, 실제 아이템 목록과 가격은 다음 단계에서 붙일 예정입니다.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

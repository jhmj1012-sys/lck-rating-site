import Link from "next/link";

export default async function TermsPage() {
  return (
    <div className="min-h-screen bg-[#1C1C1F]">
      <div className="bg-[#7C3AED]">
        <nav className="mx-auto flex max-w-5xl items-center gap-1 px-4 sm:px-6">
          <Link href="/" className="relative px-5 py-2 text-[17px] font-bold tracking-[-0.02em] text-[#F5F3FF]">
            홈
          </Link>
          <Link href="/schedule" className="relative px-5 py-2 text-[17px] font-bold tracking-[-0.02em] text-[#F5F3FF]">
            경기일정
          </Link>
          <Link href="/ratings" className="relative px-5 py-2 text-[17px] font-bold tracking-[-0.02em] text-[#F5F3FF]">
            평점순위
          </Link>
          <Link href="/season-predictions" className="relative px-5 py-2 text-[17px] font-bold tracking-[-0.02em] text-[#F5F3FF]">
            시즌예측
          </Link>
          <Link href="/games/15-dollar-challenge" className="relative px-5 py-2 text-[17px] font-bold tracking-[-0.02em] text-[#F5F3FF]">
            게임
          </Link>
        </nav>
      </div>
      <main className="px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <section className="rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-[#31313C] p-6 text-white shadow-[0_14px_34px_rgba(2,6,23,0.28)] sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#C4B5FD]">Terms of Service</p>
            <h1 className="mt-3 text-[30px] font-black tracking-[-0.04em]">이용약관</h1>
            <p className="mt-3 text-sm leading-6 text-[#D4DCFF]">
              이 약관은 LOL PRO RATING이 제공하는 서비스의 이용과 관련하여 회사와 이용자의 권리, 의무 및 책임사항을 정합니다.
            </p>

            <div className="mt-8 space-y-6 text-sm leading-7 text-[#E9EDFF]">
              <section>
                <h2 className="text-lg font-bold text-white">1. 서비스 내용</h2>
                <p className="mt-2">
                  회사는 LCK 경기 일정, 승부예측, 선수 평점, 댓글 및 커뮤니티 기능 등 e스포츠 관련 참여형 서비스를 제공합니다.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-white">2. 회원가입 및 계정</h2>
                <p className="mt-2">
                  이용자는 회사가 제공하는 로그인 수단을 통해 가입할 수 있습니다. 계정 정보 관리 책임은 이용자 본인에게 있으며,
                  타인의 계정을 무단으로 사용해서는 안 됩니다.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-white">3. 이용자의 의무</h2>
                <p className="mt-2">
                  이용자는 관계 법령과 본 약관을 준수해야 하며, 욕설, 명예훼손, 도배, 부정 이용, 서비스 운영 방해 행위를 해서는 안 됩니다.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-white">4. 게시물 및 운영정책</h2>
                <p className="mt-2">
                  이용자가 작성한 예측, 평점, 댓글 등의 게시물에 대한 책임은 작성자에게 있습니다. 회사는 운영정책 또는 법령 위반 게시물을
                  사전 통지 없이 숨김 또는 삭제할 수 있습니다.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-white">5. 서비스 변경 및 중단</h2>
                <p className="mt-2">
                  회사는 운영상 또는 기술상 필요에 따라 서비스의 전부 또는 일부를 변경하거나 중단할 수 있습니다.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-white">6. 면책</h2>
                <p className="mt-2">
                  회사는 천재지변, 외부 플랫폼 장애, 이용자 귀책사유 등 회사가 통제할 수 없는 사유로 인한 서비스 장애에 대해 책임을 지지 않습니다.
                  또한 예측 결과, 경기 정보, 통계 정보는 참고용으로 제공되며 투자 또는 도박 목적의 보장을 의미하지 않습니다.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-white">7. 문의</h2>
                <p className="mt-2">서비스 관련 문의는 아래 이메일을 통해 접수할 수 있습니다.</p>
                <div className="mt-3 rounded-2xl bg-[#3A3A47] px-4 py-3 text-[#F3F6FF]">
                  이메일: support@lolprorating.com
                </div>
              </section>

              <section>
                <h2 className="text-lg font-bold text-white">8. 시행일</h2>
                <p className="mt-2">본 약관은 2026년 4월 1일부터 적용됩니다.</p>
              </section>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

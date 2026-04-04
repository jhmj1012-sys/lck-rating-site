import { BackNavButton } from "@/components/BackNavButton";

export default async function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#1C1C1F]">
      <main className="px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <BackNavButton className="mb-4 inline-flex items-center gap-1.5 rounded-xl border border-[#474756] bg-[#3A3A47] px-4 py-2 text-sm font-medium transition hover:bg-[#505063]" style={{ color: "#FFFFFF" }}>
            ← 돌아가기
          </BackNavButton>
          <section className="rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-[#31313C] p-6 text-white shadow-[0_14px_34px_rgba(2,6,23,0.28)] sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#C4B5FD]">Privacy Policy</p>
            <h1 className="mt-3 text-[30px] font-black tracking-[-0.04em]">개인정보처리방침</h1>
            <p className="mt-3 text-sm leading-6 text-[#D4DCFF]">
              LOL PRO RATING은 이용자의 개인정보를 소중하게 생각하며, 관련 법령을 준수합니다.
              본 방침은 서비스 이용 과정에서 어떤 정보를 수집하고 어떻게 이용·보관하는지 설명합니다.
            </p>

            <div className="mt-8 space-y-6 text-sm leading-7 text-[#E9EDFF]">
              <section>
                <h2 className="text-lg font-bold text-white">1. 수집하는 개인정보 항목</h2>
                <p className="mt-2">
                  회사는 Google 로그인 과정에서 이메일 주소, 이름, 프로필 이미지와 같은 기본 계정 정보를 수집할 수 있습니다.
                  또한 서비스 이용 과정에서 닉네임, 프로필 소개, 예측 참여 기록, 평점 작성 기록, 댓글 작성 기록,
                  접속 로그 등 서비스 운영에 필요한 정보가 생성될 수 있습니다.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-white">2. 개인정보의 이용 목적</h2>
                <p className="mt-2">
                  수집한 개인정보는 회원 식별, 로그인 제공, 예측/평점/댓글 기능 제공, 이용자 문의 대응, 서비스 운영 및
                  부정 이용 방지, 공지사항 전달을 위해 사용됩니다.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-white">3. 보유 및 이용 기간</h2>
                <p className="mt-2">
                  개인정보는 회원 탈퇴 또는 처리 목적 달성 시 지체 없이 파기합니다. 다만 관계 법령에 따라 일정 기간 보관이
                  필요한 경우 해당 기간 동안 별도로 보관할 수 있습니다.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-white">4. 제3자 제공 및 처리위탁</h2>
                <p className="mt-2">
                  회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만 서비스 운영을 위해 Google OAuth,
                  Vercel, Supabase 등 외부 서비스 인프라를 사용할 수 있으며, 이 경우 필요한 범위 내에서만 개인정보가 처리됩니다.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-white">5. 이용자의 권리</h2>
                <p className="mt-2">
                  이용자는 언제든지 자신의 개인정보 조회, 수정, 삭제, 처리정지를 요청할 수 있으며 회원 탈퇴를 통해 계정 정보를
                  삭제 요청할 수 있습니다.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-white">6. 쿠키 및 로그 정보</h2>
                <p className="mt-2">
                  로그인 유지, 보안, 서비스 품질 개선을 위해 쿠키 또는 유사 기술, 접속 로그가 사용될 수 있습니다.
                </p>
              </section>

              <section>
                <h2 className="text-lg font-bold text-white">7. 문의처</h2>
                <p className="mt-2">
                  개인정보 관련 문의는 아래 연락처로 접수할 수 있습니다.
                </p>
                <div className="mt-3 rounded-2xl bg-[#3A3A47] px-4 py-3 text-[#F3F6FF]">
                  이메일: support@lolprorating.com
                </div>
              </section>

              <section>
                <h2 className="text-lg font-bold text-white">8. 시행일</h2>
                <p className="mt-2">본 개인정보처리방침은 2026년 4월 1일부터 적용됩니다.</p>
              </section>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

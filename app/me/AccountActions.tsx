'use client';

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const DELETE_REASONS = [
  "자주 사용하지 않아요",
  "원하는 기능이 부족해요",
  "UI/사용성이 불편해요",
  "알림이나 노출이 부담스러워요",
  "기타 개인적인 이유예요",
];

export function AccountActions({
  hasNickname,
  showNickname = true,
  showLogout = true,
  showDelete = true,
  currentNickname = "",
}: {
  hasNickname: boolean;
  showNickname?: boolean;
  showLogout?: boolean;
  showDelete?: boolean;
  currentNickname?: string;
}) {
  const nicknameLabel = hasNickname ? "닉네임 변경" : "닉네임 설정";
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(currentNickname);
  const [isSavingNickname, setIsSavingNickname] = useState(false);
  const [nicknameMessage, setNicknameMessage] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteAgreement, setDeleteAgreement] = useState(false);
  const router = useRouter();
  const { update: updateSession } = useSession();

  useEffect(() => {
    setNicknameInput(currentNickname);
  }, [currentNickname]);

  async function handleDeleteAccount() {
    if (!deleteReason) {
      window.alert("탈퇴 사유를 선택해 주세요.");
      return;
    }
    if (!deleteAgreement) {
      window.alert("안내 사항에 동의해 주세요.");
      return;
    }

    try {
      setIsDeleting(true);
      const response = await fetch("/api/me/account", { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as { error?: string; nickname?: string } | null;

      if (!response.ok) {
        window.alert(payload?.error ?? "회원탈퇴 처리에 실패했습니다.");
        return;
      }

      await signOut({ callbackUrl: "/" });
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSaveNickname() {
    const trimmed = nicknameInput.trim();
    setNicknameMessage("");
    if (!trimmed) {
      window.alert("닉네임을 입력해 주세요.");
      return;
    }

    try {
      setIsSavingNickname(true);
      const response = await fetch("/api/me/nickname", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: trimmed }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; nickname?: string } | null;

      if (!response.ok) {
        window.alert(payload?.error ?? "닉네임 변경에 실패했습니다.");
        return;
      }

      setNicknameMessage("저장되었습니다.");
      if (payload?.nickname !== undefined) {
        await updateSession({ nickname: payload.nickname });
      }
      router.refresh();
    } finally {
      setIsSavingNickname(false);
    }
  }

  function closeDeleteModal() {
    if (isDeleting) {
      return;
    }
    setIsDeleteModalOpen(false);
    setDeleteReason("");
    setDeleteAgreement(false);
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {showNickname ? (
          <>
            <button
              type="button"
              aria-label={nicknameLabel}
              onClick={() => setIsEditingNickname((value) => !value)}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
            >
              {nicknameLabel}
            </button>
            {isEditingNickname ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nicknameInput}
                  onChange={(event) => setNicknameInput(event.target.value)}
                  maxLength={10}
                  placeholder="2~10자, 한글/영문/숫자"
                  className="h-10 w-[240px] rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-400"
                />
                <button
                  type="button"
                  onClick={handleSaveNickname}
                  disabled={isSavingNickname}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-[#8B5CF6] px-3 text-sm font-medium text-white transition hover:bg-[#7C3AED] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSavingNickname ? "저장중..." : "확인"}
                </button>
                {nicknameMessage ? <span className="text-xs font-medium text-[#AFC1F7]">{nicknameMessage}</span> : null}
              </div>
            ) : null}
          </>
        ) : null}
        {showLogout ? (
          <button
            type="button"
            aria-label="로그아웃"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
          >
            로그아웃
          </button>
        ) : null}
        {showDelete ? (
          <div className="mt-2 w-full">
            <button
              type="button"
              aria-label="회원탈퇴"
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={isDeleting}
              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isDeleting ? "탈퇴 처리 중..." : "회원탈퇴"}
            </button>
          </div>
        ) : null}
      </div>

      {isDeleteModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(12,12,18,0.72)] px-4">
          <div className="w-full max-w-[520px] rounded-[24px] bg-[#31313C] p-5 shadow-[0_20px_50px_rgba(2,6,23,0.45)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">회원탈퇴 전 확인해 주세요</h3>
                <p className="mt-1 text-sm text-[#D4DCFF]">탈퇴는 신중하게 진행해 주세요. 아래 내용을 모두 확인한 뒤에만 진행할 수 있습니다.</p>
              </div>
              <button
                type="button"
                onClick={closeDeleteModal}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#3A3A47] text-sm text-white transition hover:bg-[#4A4A59]"
              >
                X
              </button>
            </div>

            <div className="mt-4 rounded-2xl bg-[#3A3A47] px-4 py-4 text-sm leading-6 text-[#F3F6FF]">
              <div>탈퇴 시 예측 기록, 평점, 댓글, 코인 내역 등 계정 데이터가 삭제됩니다.</div>
              <div className="mt-2">진행 중인 참여 내역과 개인 활동 기록도 함께 사라집니다.</div>
              <div className="mt-2 font-semibold text-[#FFD6D6]">탈퇴 후 3개월 동안은 재가입할 수 없습니다.</div>
            </div>

            <div className="mt-5">
              <div className="text-sm font-semibold text-white">탈퇴 사유를 선택해 주세요</div>
              <div className="mt-3 space-y-2">
                {DELETE_REASONS.map((reason) => (
                  <label key={reason} className="flex cursor-pointer items-center gap-3 rounded-xl bg-[#3A3A47] px-3 py-3 text-sm text-[#F3F6FF] transition hover:bg-[#454556]">
                    <input
                      type="radio"
                      name="delete-reason"
                      value={reason}
                      checked={deleteReason === reason}
                      onChange={(event) => setDeleteReason(event.target.value)}
                      className="h-4 w-4 accent-[#8B5CF6]"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="mt-5 flex items-start gap-3 rounded-xl bg-[#3A3A47] px-3 py-3 text-sm text-[#DDE6FF]">
              <input
                type="checkbox"
                checked={deleteAgreement}
                onChange={(event) => setDeleteAgreement(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#8B5CF6]"
              />
              <span>탈퇴 시 불이익과 3개월 재가입 제한을 모두 확인했으며, 회원탈퇴를 진행하는 데 동의합니다.</span>
            </label>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#424254] px-4 text-sm font-medium text-white transition hover:bg-[#4D4D61]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting || !deleteReason || !deleteAgreement}
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#A94B62] px-4 text-sm font-medium text-white transition hover:bg-[#BF5974] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? "탈퇴 처리 중..." : "그래도 탈퇴하기"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

'use client';

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function BioEditor({ initialBio }: { initialBio: string }) {
  const [bio, setBio] = useState(initialBio);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    setBio(initialBio);
  }, [initialBio]);

  async function handleSave() {
    setMessage("");

    try {
      setIsSaving(true);
      const response = await fetch("/api/me/bio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setMessage(payload?.error ?? "소개문구 저장에 실패했습니다.");
        return;
      }

      setIsEditing(false);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setBio(initialBio);
    setMessage("");
    setIsEditing(false);
  }

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="mt-3 inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-[#8B5CF6] hover:text-[#7C3AED]"
      >
        소개문구 {initialBio ? "수정하기" : "작성하기"}
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      <textarea
        value={bio}
        onChange={(event) => setBio(event.target.value)}
        maxLength={50}
        placeholder="예: 밴픽이랑 오브젝트 타이밍 위주로 봅니다."
        className="min-h-[84px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400"
        autoFocus
      />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-xs text-slate-500">최대 50자</p>
          {message ? <span className="text-xs font-medium text-rose-600">{message}</span> : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#8B5CF6] px-4 text-sm font-semibold text-white transition hover:bg-[#7C3AED] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? "저장중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

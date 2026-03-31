'use client';

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function BioEditor({ initialBio }: { initialBio: string }) {
  const [bio, setBio] = useState(initialBio);
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

      setMessage("저장되었습니다.");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-3 space-y-3">
      <textarea
        value={bio}
        onChange={(event) => setBio(event.target.value)}
        maxLength={50}
        placeholder="예: 밴픽이랑 오브젝트 타이밍 위주로 봅니다."
        className="min-h-[84px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400"
      />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-xs text-slate-500">최대 50자</p>
          {message ? <span className="text-xs font-medium text-[#AFC1F7]">{message}</span> : null}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#5383E8] px-4 text-sm font-semibold text-white transition hover:bg-[#4171D6] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving ? "저장중..." : "소개문구 저장"}
        </button>
      </div>
    </div>
  );
}

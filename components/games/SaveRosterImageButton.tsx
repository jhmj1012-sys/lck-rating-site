'use client';

import { useState } from "react";
import { toPng } from "html-to-image";

export function SaveRosterImageButton({
  targetRef,
  disabled,
}: {
  targetRef: React.RefObject<HTMLElement | null>;
  disabled: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSave = async () => {
    if (!targetRef.current || disabled || saving) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const dataUrl = await toPng(targetRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });

      const anchor = document.createElement("a");
      anchor.href = dataUrl;
      anchor.download = "my-15-dollar-team.png";
      anchor.click();
    } catch {
      setErrorMessage("이미지 저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleSave}
        disabled={disabled || saving}
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#3B82F6]/50 bg-[#3B82F6] px-4 text-sm font-semibold text-[#E6E8EB] transition hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-[#1C2128] disabled:text-[#6B7280]"
      >
        {saving ? "저장 중..." : "이미지 저장"}
      </button>
      {errorMessage ? <p className="mt-2 text-xs text-[#AAB0B6]">{errorMessage}</p> : null}
    </div>
  );
}

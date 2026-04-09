'use client';

import { useState } from "react";
import { toBlob } from "html-to-image";

export function CopyRosterImageButton({
  targetRef,
  disabled,
}: {
  targetRef: React.RefObject<HTMLElement | null>;
  disabled: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCopy = async () => {
    if (!targetRef.current || disabled) {
      return;
    }

    if (!navigator.clipboard || typeof window.ClipboardItem === "undefined") {
      setErrorMessage("이 브라우저에서는 이미지 복사를 지원하지 않습니다.");
      return;
    }

    setCopied(false);
    setErrorMessage(null);

    try {
      if (typeof document !== "undefined" && "fonts" in document) {
        await (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
      }

      const blob = await toBlob(targetRef.current, {
        cacheBust: true,
        pixelRatio: Math.max(2, window.devicePixelRatio || 1),
        fetchRequestInit: { cache: "no-store" },
      });

      if (!blob) {
        throw new Error("이미지 변환에 실패했습니다.");
      }

      await navigator.clipboard.write([new window.ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setErrorMessage("이미지 복사에 실패했습니다. 다시 시도해 주세요.");
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleCopy}
        disabled={disabled}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#76a8ff]/40 bg-[#2f5fa6] px-4 text-sm font-semibold text-white transition hover:bg-[#2a568f] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-[#1C2128] disabled:text-[#6B7280]"
      >
        {copied ? "복사됨!" : "이미지 복사"}
      </button>
      {errorMessage ? <p className="mt-2 text-xs text-[#AAB0B6]">{errorMessage}</p> : null}
    </div>
  );
}

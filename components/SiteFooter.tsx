import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-[rgba(255,255,255,0.06)] bg-[#17171B]">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-5 text-xs text-[#A7AFBF] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div suppressHydrationWarning>© {new Date().getFullYear()} LOL PRO RATING</div>
        <nav className="flex items-center gap-4">
          <Link href="/terms" className="transition hover:text-white">
            이용약관
          </Link>
          <Link href="/privacy" className="transition hover:text-white">
            개인정보처리방침
          </Link>
        </nav>
      </div>
    </footer>
  );
}

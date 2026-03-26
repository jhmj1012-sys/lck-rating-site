import type { PropsWithChildren } from "react";

export function IconBase({ className, children }: PropsWithChildren<{ className?: string }>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

export function SearchIcon({ className }: { className?: string }) {
  return <IconBase className={className}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></IconBase>;
}

export function ClockIcon({ className }: { className?: string }) {
  return <IconBase className={className}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></IconBase>;
}

export function TargetIcon({ className }: { className?: string }) {
  return <IconBase className={className}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" /></IconBase>;
}

export function MessageSquareIcon({ className }: { className?: string }) {
  return <IconBase className={className}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></IconBase>;
}

export function StarIcon({ className }: { className?: string }) {
  return <IconBase className={className}><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.2 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3z" /></IconBase>;
}

export function ChevronDownIcon({ className }: { className?: string }) {
  return <IconBase className={className}><path d="M6 9l6 6 6-6" /></IconBase>;
}

export function DownloadIcon({ className }: { className?: string }) {
  return <IconBase className={className}><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M5 21h14" /></IconBase>;
}

export function UserIcon({ className }: { className?: string }) {
  return <IconBase className={className}><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="8" r="4" /></IconBase>;
}

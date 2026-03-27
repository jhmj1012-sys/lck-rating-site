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

export function TeamIcon({ className }: { className?: string }) {
  return <IconBase className={className}><path d="M12 3l7 3v5c0 5-3.1 8.7-7 10-3.9-1.3-7-5-7-10V6l7-3z" /><path d="M9 11h6" /></IconBase>;
}

export function ShieldIcon({ className }: { className?: string }) {
  return <IconBase className={className}><path d="M12 2l8 4v6c0 5-3.5 8.9-8 10-4.5-1.1-8-5-8-10V6l8-4z" /><path d="M12 7v10" /></IconBase>;
}

export function BellIcon({ className }: { className?: string }) {
  return <IconBase className={className}><path d="M15 17H5.5a1.5 1.5 0 0 1-1.2-2.4L6 12.5V9a6 6 0 1 1 12 0v3.5l1.7 2.1A1.5 1.5 0 0 1 18.5 17H15" /><path d="M9 20a3 3 0 0 0 6 0" /></IconBase>;
}

export function ShopIcon({ className }: { className?: string }) {
  return <IconBase className={className}><path d="M6 7 7.5 3h9L18 7" /><path d="M4 7h16" /><path d="M5 7v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7" /><path d="M10 11h4" /></IconBase>;
}

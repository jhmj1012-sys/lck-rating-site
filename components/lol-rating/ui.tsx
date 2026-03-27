import type { ComponentPropsWithoutRef, PropsWithChildren, ReactNode } from "react";

import { cn } from "./utils";

export function Card({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <section className={cn("ui-card", className)}>{children}</section>;
}

export function CardHeader({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn("px-5 pt-5 sm:px-6 sm:pt-6", className)}>{children}</div>;
}

export function CardContent({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn("px-5 pb-5 sm:px-6 sm:pb-6", className)}>{children}</div>;
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-600/70">{eyebrow}</p> : null}
        <h2 className="mt-1 text-[1.7rem] font-bold tracking-[-0.03em] text-slate-950 sm:text-[1.85rem]">{title}</h2>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Badge({
  className,
  children,
  variant = "neutral",
}: PropsWithChildren<{ className?: string; variant?: "neutral" | "outline" | "accent" | "success" | "danger" }>) {
  const variants = {
    neutral: "border border-slate-200 bg-slate-100 text-slate-700",
    outline: "border border-slate-200 bg-white/90 text-slate-600",
    accent: "border border-sky-200 bg-sky-50 text-sky-700",
    success: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    danger: "border border-rose-200 bg-rose-50 text-rose-700",
  };

  return <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-medium", variants[variant], className)}>{children}</span>;
}

export function Button({
  className,
  variant = "primary",
  children,
  ...props
}: PropsWithChildren<ComponentPropsWithoutRef<"button"> & { variant?: "primary" | "secondary" | "ghost" }>) {
  const variants = {
    primary: "ui-action-primary",
    secondary: "ui-action-secondary",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  };

  return <button className={cn("inline-flex items-center justify-center text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50", variants[variant], className)} {...props}>{children}</button>;
}

export function Input({ className, ...props }: ComponentPropsWithoutRef<"input">) {
  return <input className={cn("ui-input text-sm", className)} {...props} />;
}

export function Progress({ value, className }: { value: number; className?: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return <div className={cn("h-2.5 overflow-hidden rounded-full bg-slate-100", className)}><div className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400" style={{ width: `${safe}%` }} /></div>;
}

export function Avatar({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn("flex items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50", className)}>{children}</div>;
}

export function StatCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "accent" }) {
  return (
    <div className={cn("ui-card-soft p-4", tone === "accent" && "border-sky-200 bg-sky-50")}>
      <div className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold tracking-[-0.03em] text-slate-950">{value}</div>
    </div>
  );
}

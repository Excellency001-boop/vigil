"use client";

import { type ReactNode } from "react";

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`eyebrow ${className}`}>{children}</div>;
}

export function Dot({ state }: { state: "live" | "sleep" | "armed" }) {
  return <span className={`dot dot-${state}`} />;
}

export function Pill({
  children,
  tone = "muted",
  className = "",
}: {
  children: ReactNode;
  tone?: "live" | "sleep" | "amber" | "danger" | "muted" | "violet";
  className?: string;
}) {
  const tones: Record<string, string> = {
    live: "text-live border-live/30 bg-live/10",
    sleep: "text-sleep border-sleep/30 bg-sleep/10",
    amber: "text-amber border-amber/30 bg-amber/10",
    danger: "text-danger border-danger/30 bg-danger/10",
    violet: "text-violet border-violet/30 bg-violet/10",
    muted: "text-text-3 border-line-strong bg-bg-inset",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium mono ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Btn({
  children,
  onClick,
  tone = "default",
  size = "md",
  disabled,
  className = "",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "default" | "live" | "amber" | "danger" | "ghost" | "violet";
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
  title?: string;
}) {
  const tones: Record<string, string> = {
    default: "bg-bg-inset border-line-strong text-text hover:border-text-3",
    live: "bg-live/15 border-live/40 text-live hover:bg-live/25",
    amber: "bg-amber/15 border-amber/40 text-amber hover:bg-amber/25",
    danger: "bg-danger/12 border-danger/40 text-danger hover:bg-danger/22",
    ghost: "bg-transparent border-transparent text-text-3 hover:text-text hover:bg-bg-inset",
    violet: "bg-violet/15 border-violet/40 text-violet hover:bg-violet/25",
  };
  const sizes: Record<string, string> = {
    sm: "px-2.5 py-1 text-[12px]",
    md: "px-3.5 py-2 text-[13px]",
  };
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${tones[tone]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "default" | "live" | "danger";
}) {
  const vt = tone === "live" ? "text-live" : tone === "danger" ? "text-danger" : "text-text";
  return (
    <div>
      <Eyebrow>{label}</Eyebrow>
      <div className={`num mt-1 text-2xl ${vt}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[12px] text-text-3">{sub}</div>}
    </div>
  );
}

export function Panel({
  children,
  className = "",
  title,
  eyebrow,
  right,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  eyebrow?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section className={`panel ${className}`}>
      {(title || eyebrow || right) && (
        <header className="flex items-start justify-between gap-3 px-4 py-3 hair-b">
          <div>
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            {title && <div className="mt-0.5 text-[15px] font-semibold text-text">{title}</div>}
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function TickerLogo({ under }: { under: string }) {
  // A compact monogram tile in place of external logos (CSP-safe, no fetch).
  return (
    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-md border border-line-strong bg-bg-inset text-[10px] font-bold text-text-2 mono">
      {under.slice(0, 3)}
    </span>
  );
}

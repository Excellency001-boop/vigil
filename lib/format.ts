export function usd(n: number | null | undefined, dp = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  const d = abs >= 1000 ? 2 : dp;
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

export function num(n: number | null | undefined, dp = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

export function pct(n: number | null | undefined, dp = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const s = n > 0 ? "+" : "";
  return `${s}${n.toFixed(dp)}%`;
}

export function compact(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

// "2d 14h 22m" style countdown from a number of seconds
export function countdown(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || seconds <= 0) return "now";
  let s = Math.floor(seconds);
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h || d) parts.push(`${h}h`);
  parts.push(`${m}m`);
  if (!d && !h) parts.push(`${s}s`);
  return parts.join(" ");
}

export function shortAddr(a: string, n = 4): string {
  if (!a) return "";
  return `${a.slice(0, n)}…${a.slice(-n)}`;
}

export function feedShort(id: string): string {
  const clean = id.startsWith("0x") ? id.slice(2) : id;
  return `0x${clean.slice(0, 4)}…${clean.slice(-4)}`;
}

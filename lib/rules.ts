import type { Rule, RuleEval, RuleKind } from "./types";

export const KIND_LABEL: Record<RuleKind, string> = {
  stop_loss: "Stop loss",
  take_profit: "Take profit",
  trailing_stop: "Trailing stop",
  buy_dip: "Buy the dip",
  dca: "Recurring buy",
};

export const KIND_VERB: Record<RuleKind, string> = {
  stop_loss: "Sell to USDC",
  take_profit: "Sell to USDC",
  trailing_stop: "Sell to USDC",
  buy_dip: "Buy with USDC",
  dca: "Buy with USDC",
};

export function isSell(kind: RuleKind): boolean {
  return kind === "stop_loss" || kind === "take_profit" || kind === "trailing_stop";
}

export function genId(): string {
  return "r_" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
}

// The effective trigger price for a trailing stop, derived from the peak.
export function trailingTrigger(rule: Rule): number | null {
  if (rule.kind !== "trailing_stop") return null;
  if (!rule.peakUsd || !rule.trailPct) return null;
  return rule.peakUsd * (1 - rule.trailPct / 100);
}

// One plain-language line describing what a rule does.
export function ruleHeadline(rule: Rule): string {
  const s = rule.symbol;
  switch (rule.kind) {
    case "stop_loss":
      return `If ${s} falls to $${fmt(rule.triggerUsd)}, sell ${rule.sizePct ?? 100}% to USDC`;
    case "take_profit":
      return `If ${s} rises to $${fmt(rule.triggerUsd)}, sell ${rule.sizePct ?? 100}% to USDC`;
    case "trailing_stop":
      return `If ${s} drops ${rule.trailPct}% from its peak, sell ${rule.sizePct ?? 100}% to USDC`;
    case "buy_dip":
      return `If ${s} falls to $${fmt(rule.triggerUsd)}, buy $${fmt(rule.usdcAmount)} of ${s}`;
    case "dca":
      return `Every ${rule.everyHours}h, buy $${fmt(rule.usdcAmount)} of ${s}`;
  }
}

function fmt(n?: number): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Core evaluation. Given a live price and whether NYSE is open, decide whether
// the rule's condition is met, how far away it is, and whether this is a moment
// a brokerage stop could not have acted on (NYSE shut).
export function evalRule(
  rule: Rule,
  priceUsd: number | null,
  nyseOpen: boolean,
  now: number = Date.now(),
): RuleEval {
  if (rule.status !== "armed") {
    return { rule, breached: false, distancePct: null, reason: statusReason(rule) };
  }

  if (rule.kind === "dca") {
    const dueAt = (rule.lastFiredAt ?? rule.createdAt) + (rule.everyHours ?? 24) * 3600_000;
    const breached = now >= dueAt;
    const hrsLeft = Math.max(0, (dueAt - now) / 3600_000);
    return {
      rule,
      breached,
      distancePct: null,
      reason: breached ? "Recurring buy is due now" : `Next buy in ${hrsLeft.toFixed(1)}h`,
    };
  }

  if (priceUsd === null) {
    return { rule, breached: false, distancePct: null, reason: "Waiting for price" };
  }

  const trigger =
    rule.kind === "trailing_stop" ? trailingTrigger(rule) : rule.triggerUsd ?? null;
  if (trigger === null) {
    return { rule, breached: false, distancePct: null, reason: "No trigger set" };
  }

  const fallsThrough = rule.kind === "stop_loss" || rule.kind === "trailing_stop" || rule.kind === "buy_dip";
  const breached = fallsThrough ? priceUsd <= trigger : priceUsd >= trigger;

  // signed distance: how far the live price is from the trigger, in %
  const distancePct = ((priceUsd - trigger) / trigger) * 100;

  let reason: string;
  if (breached) {
    reason = nyseOpen
      ? "Trigger hit"
      : "Trigger hit while NYSE is closed — a broker stop would sleep through this";
  } else {
    const away = Math.abs(distancePct).toFixed(2);
    reason = fallsThrough ? `${away}% above trigger` : `${away}% below trigger`;
  }

  return { rule, breached, distancePct, reason };
}

function statusReason(rule: Rule): string {
  switch (rule.status) {
    case "triggered":
      return "Fired";
    case "paused":
      return "Paused";
    case "cancelled":
      return "Cancelled";
    default:
      return "";
  }
}

// Update a trailing stop's running peak given a fresh price.
export function bumpPeak(rule: Rule, priceUsd: number): Rule {
  if (rule.kind !== "trailing_stop") return rule;
  if (!rule.peakUsd || priceUsd > rule.peakUsd) {
    return { ...rule, peakUsd: priceUsd };
  }
  return rule;
}

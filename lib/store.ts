"use client";

import { create } from "zustand";
import type { AssetQuote, MarketClock, Portfolio, Rule, RuleKind } from "./types";
import { evalRule, bumpPeak, genId, isSell } from "./rules";
import {
  connectWallet,
  disconnectWallet,
  getSolanaWallets,
  onWalletsChange,
  signAndSend,
  type SolWallet,
} from "./wallet";
import { BY_SYMBOL, USDC, SOL_MINT } from "./tokens";

export type LogLevel = "info" | "arm" | "fire" | "fill" | "warn" | "chain";
export type LogEvent = {
  id: string;
  at: number;
  level: LogLevel;
  text: string;
  sub?: string;
  sig?: string; // on-chain transaction signature
  account?: string; // on-chain order / account address
  real?: boolean; // true = real on-chain, false/undefined = simulated
};

type Drill = { symbol: string; targetPct: number; startedAt: number; durationMs: number };

// Inline result of the most recent manual trade, shown right in the Trade panel.
export type TradeResult = {
  ok: boolean;
  text: string;
  sub?: string;
  sig?: string;
  symbol: string;
  at: number;
};

// What a guard did when it fired. Powers the post-drill "capital preserved" card.
export type GuardEvent = {
  at: number;
  symbol: string;
  kind: RuleKind;
  soldQty: number;
  soldAt: number; // price the guard sold at
  preDrillPrice: number; // price before the shock
  bottomPrice: number; // where the shock bottomed out
  proceeds: number; // usdc locked in
  preserved: number; // proceeds minus value at the low
  wouldLose: number; // drawdown to the low if held
  nyseOpen: boolean;
  drill: boolean;
};

const NIGHT_KEY = "vigil.nightwatch.v1";

export type OnchainOrder = {
  orderKey: string;
  inputMint: string;
  outputMint: string;
  makingAmount: string;
  takingAmount: string;
  status: string;
  createdAt?: string;
};

const RULES_KEY = "vigil.rules.v1";

function loadRules(): Rule[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RULES_KEY);
    return raw ? (JSON.parse(raw) as Rule[]) : [];
  } catch {
    return [];
  }
}
function saveRules(rules: Rule[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RULES_KEY, JSON.stringify(rules));
  } catch {
    /* ignore */
  }
}

type State = {
  // wallet
  address: string | null;
  walletName: string | null;
  wallets: SolWallet[];
  demo: boolean;
  demoDirty: boolean; // a simulated fill has altered the demo portfolio
  busy: string | null;

  // data
  clock: MarketClock | null;
  quotes: AssetQuote[];
  solPrice: number | null;
  portfolio: Portfolio | null;
  loading: boolean;
  lastError: string | null;

  // rules + drill + log
  rules: Rule[];
  drill: Drill | null;
  events: LogEvent[];
  onchainOrders: OnchainOrder[];
  delegations: string[]; // xStock symbols with a live capped allowance to the executor
  nightWatch: boolean; // rules armed only while NYSE is closed
  lastGuardEvent: GuardEvent | null;
  lastTrade: TradeResult | null;
  protectedTotal: number; // cumulative capital preserved this session

  // derived helpers
  quoteBySymbol: (s: string) => AssetQuote | undefined;
  effectivePrice: (s: string) => number | null;

  // actions
  init: () => void;
  refreshClock: () => Promise<void>;
  refreshQuotes: () => Promise<void>;
  refreshPortfolio: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  enterDemo: () => void;
  resetDemo: () => void;
  toggleNightWatch: () => void;
  connect: (name: string) => Promise<void>;
  disconnect: () => Promise<void>;

  addRule: (r: Partial<Rule> & { kind: RuleKind; symbol: string }) => Rule;
  cancelRule: (id: string) => void;
  pauseRule: (id: string, pause: boolean) => void;

  armOnchain: (id: string, payWith?: "USDC" | "SOL") => Promise<void>;
  executeNow: (id: string) => Promise<void>;
  tradeNow: (p: {
    symbol: string;
    side: "buy" | "sell";
    usdcAmount?: number;
    sellPct?: number;
    payWith?: "USDC" | "SOL";
  }) => Promise<void>;
  grantHandsFree: (symbol: string) => Promise<void>;
  revokeHandsFree: (symbol: string) => Promise<void>;

  startDrill: (symbol: string, targetPct: number, seconds?: number) => void;
  stopDrill: () => void;

  log: (e: Omit<LogEvent, "id" | "at">) => void;
  tick: () => void;
};

async function getJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return (await r.json()) as T;
}

export const useVigil = create<State>((set, get) => ({
  address: null,
  walletName: null,
  wallets: [],
  demo: false,
  demoDirty: false,
  busy: null,

  clock: null,
  quotes: [],
  solPrice: null,
  portfolio: null,
  loading: true,
  lastError: null,

  rules: [],
  drill: null,
  events: [],
  onchainOrders: [],
  delegations: [],
  nightWatch: false,
  lastGuardEvent: null,
  lastTrade: null,
  protectedTotal: 0,

  quoteBySymbol: (s) => get().quotes.find((q) => q.symbol.toUpperCase() === s.toUpperCase()),

  effectivePrice: (s) => {
    const q = get().quoteBySymbol(s);
    if (!q || q.onchainUsd === null) return null;
    const d = get().drill;
    if (!d || d.symbol.toUpperCase() !== s.toUpperCase()) return q.onchainUsd;
    const t = Math.min(1, (Date.now() - d.startedAt) / d.durationMs);
    const offset = d.targetPct * t; // ramps to targetPct
    return q.onchainUsd * (1 + offset / 100);
  },

  init: () => {
    let nightWatch = false;
    if (typeof window !== "undefined") {
      try {
        nightWatch = localStorage.getItem(NIGHT_KEY) === "1";
      } catch {
        /* ignore */
      }
    }
    set({ wallets: getSolanaWallets(), rules: loadRules(), nightWatch });
    // wallets can register a beat after load; keep the list fresh
    onWalletsChange(() => set({ wallets: getSolanaWallets() }));
    get().refreshClock();
    get().refreshQuotes();
    get().refreshPortfolio();
  },

  refreshClock: async () => {
    try {
      const clock = await getJSON<MarketClock>("/api/clock");
      set({ clock });
    } catch (e) {
      set({ lastError: String(e) });
    }
  },

  refreshQuotes: async () => {
    try {
      const { quotes, solPrice } = await getJSON<{ quotes: AssetQuote[]; solPrice: number | null }>(
        "/api/prices",
      );
      set({ quotes, solPrice: solPrice ?? get().solPrice, loading: false });
    } catch (e) {
      set({ lastError: String(e), loading: false });
    }
  },

  refreshPortfolio: async () => {
    const { address, demo, demoDirty } = get();
    // With no wallet connected we are always viewing the demo book.
    const viewingDemo = demo || !address;
    // Once a simulated fill has changed the demo book, stop letting the server
    // snapshot overwrite it — the post-fire state is the point.
    if (viewingDemo && demoDirty) return;
    const owner = viewingDemo ? "demo" : address;
    try {
      const portfolio = await getJSON<Portfolio>(`/api/portfolio?owner=${owner}`);
      set({ portfolio });
    } catch (e) {
      set({ lastError: String(e) });
    }
  },

  refreshOrders: async () => {
    const { address } = get();
    if (!address) {
      if (get().onchainOrders.length) set({ onchainOrders: [] });
      return;
    }
    try {
      const { orders } = await getJSON<{ orders: OnchainOrder[] }>(
        `/api/trigger/list?user=${address}`,
      );
      set({ onchainOrders: orders ?? [] });
    } catch {
      /* keep last */
    }
  },

  enterDemo: () => {
    set({ demo: true, demoDirty: false });
    get().log({ level: "info", text: "Demo portfolio loaded", sub: "live prices, simulated fills" });
    get().refreshPortfolio();
  },

  resetDemo: () => {
    // clear fired/cancelled rules and restore the demo book for a fresh run
    set({ demoDirty: false, drill: null, rules: [], lastGuardEvent: null, protectedTotal: 0 });
    saveRules([]);
    get().refreshPortfolio();
    get().log({ level: "info", text: "Demo reset", sub: "book restored, rules cleared" });
  },

  toggleNightWatch: () => {
    const nightWatch = !get().nightWatch;
    set({ nightWatch });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(NIGHT_KEY, nightWatch ? "1" : "0");
      } catch {
        /* ignore */
      }
    }
    const nyseOpen = get().clock?.nyseOpen ?? false;
    get().log({
      level: nightWatch ? "arm" : "info",
      text: nightWatch ? "Night Watch on" : "Night Watch off",
      sub: nightWatch
        ? nyseOpen
          ? "rules dormant until NYSE closes"
          : "NYSE is dark, every armed rule is live"
        : "rules run around the clock",
    });
  },

  connect: async (name) => {
    set({ busy: "connect" });
    try {
      const address = await connectWallet(name);
      set({ address, walletName: name, demo: false, demoDirty: false, busy: null });
      get().log({ level: "info", text: `Connected ${name}`, sub: address });
      get().refreshPortfolio();
      get().refreshOrders();
    } catch (e) {
      set({ busy: null, lastError: String(e) });
      get().log({ level: "warn", text: `Connect failed`, sub: String(e) });
    }
  },

  disconnect: async () => {
    await disconnectWallet();
    set({ address: null, walletName: null });
  },

  addRule: (partial) => {
    const q = get().quoteBySymbol(partial.symbol);
    const stock = BY_SYMBOL[partial.symbol.toUpperCase()];
    const rule: Rule = {
      id: genId(),
      kind: partial.kind,
      mode: partial.mode ?? (partial.kind === "take_profit" || partial.kind === "buy_dip" ? "guard" : "sentinel"),
      status: "armed",
      symbol: partial.symbol,
      mint: stock?.mint ?? partial.mint ?? "",
      triggerUsd: partial.triggerUsd,
      trailPct: partial.trailPct,
      peakUsd: partial.kind === "trailing_stop" ? q?.onchainUsd ?? undefined : undefined,
      sizePct: partial.sizePct,
      usdcAmount: partial.usdcAmount,
      everyHours: partial.everyHours,
      createdAt: Date.now(),
      note: partial.note,
    };
    const rules = [rule, ...get().rules];
    set({ rules });
    saveRules(rules);
    const modeWord = rule.mode === "guard" ? "Guard armed" : "Watch armed";
    get().log({
      level: "arm",
      text: `${modeWord}: ${rule.symbol}`,
      sub: describeRule(rule),
    });
    return rule;
  },

  cancelRule: (id) => {
    const rules = get().rules.map((r) => (r.id === id ? { ...r, status: "cancelled" as const } : r));
    set({ rules });
    saveRules(rules);
  },

  pauseRule: (id, pause) => {
    const rules = get().rules.map((r) =>
      r.id === id ? { ...r, status: pause ? ("paused" as const) : ("armed" as const) } : r,
    );
    set({ rules });
    saveRules(rules);
  },

  // Arm a real, non-custodial, keeper-executed Jupiter Trigger order.
  armOnchain: async (id, payWith = "USDC") => {
    const rule = get().rules.find((r) => r.id === id);
    const { address, walletName } = get();
    if (!rule) return;
    if (!address || !walletName) {
      get().log({ level: "warn", text: "Connect a wallet to arm a real on-chain order" });
      set({ lastTrade: { ok: false, text: "Connect a wallet first", symbol: rule.symbol, at: Date.now() } });
      return;
    }
    set({ busy: id, lastTrade: null });
    try {
      const q = get().quoteBySymbol(rule.symbol);
      const sellQty =
        rule.kind === "take_profit" && rule.sizePct && q
          ? positionQty(get().portfolio, rule.symbol) * (rule.sizePct / 100)
          : undefined;
      const body = {
        maker: address,
        symbol: rule.symbol,
        kind: rule.kind,
        triggerUsd: rule.triggerUsd,
        sellQty,
        usdcAmount: rule.usdcAmount,
        payWith,
        solPrice: get().solPrice,
        expiryDays: 30,
      };
      const created = await getJSON<{ requestId: string; order: string; transaction: string }>(
        "/api/trigger/create",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
      );
      // The wallet signs and broadcasts the create-order transaction directly.
      // That lands the order account on-chain; the Jupiter keeper takes it from
      // there. Vigil never holds keys and never holds funds.
      const signature = await signAndSend(created.transaction);
      const rules = get().rules.map((r) => (r.id === id ? { ...r, orderRef: created.order, mode: "guard" as const } : r));
      set({
        rules,
        busy: null,
        lastTrade: {
          ok: true,
          text: `${rule.symbol} order resting on Solana`,
          sub: "the Jupiter keeper fills it 24/7, with your tab closed",
          sig: signature,
          symbol: rule.symbol,
          at: Date.now(),
        },
      });
      saveRules(rules);
      get().log({
        level: "chain",
        text: `Order resting on Solana: ${rule.symbol}`,
        sub: `Jupiter keeper fills it 24/7 · order ${created.order.slice(0, 8)}…`,
        sig: signature,
        account: created.order,
        real: true,
      });
      setTimeout(() => get().refreshOrders(), 2500);
      setTimeout(() => get().refreshOrders(), 8000);
    } catch (e) {
      const msg = friendlyError(e);
      set({
        busy: null,
        lastError: String(e),
        lastTrade: { ok: false, text: "Could not place order", sub: msg, symbol: rule.symbol, at: Date.now() },
      });
      get().log({ level: "warn", text: "Arm failed", sub: msg });
    }
  },

  // Manual "execute now" swap-to-USDC (or buy) through Jupiter.
  executeNow: async (id) => {
    const rule = get().rules.find((r) => r.id === id);
    if (!rule) return;
    const { address, walletName, demo } = get();
    const q = get().quoteBySymbol(rule.symbol);
    if (!q || q.onchainUsd === null) return;

    // Demo / no wallet: simulate the fill with live numbers.
    if (demo || !address || !walletName) {
      fillSimulated(get, set, rule);
      return;
    }

    set({ busy: id });
    try {
      const stock = BY_SYMBOL[rule.symbol.toUpperCase()];
      const sell = isSell(rule.kind);
      const qty = positionQty(get().portfolio, rule.symbol) * ((rule.sizePct ?? 100) / 100);
      const amount = sell
        ? Math.round(qty * 10 ** stock.decimals)
        : Math.round((rule.usdcAmount ?? 0) * 10 ** USDC.decimals);
      const res = await getJSON<{ swapTransaction: string; route: string[] }>("/api/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputMint: sell ? stock.mint : USDC.mint,
          outputMint: sell ? USDC.mint : stock.mint,
          amount,
          slippageBps: 100,
          userPublicKey: address,
        }),
      });
      const signature = await signAndSend(res.swapTransaction);
      const rules = get().rules.map((r) => (r.id === id ? { ...r, status: "triggered" as const, lastFiredAt: Date.now() } : r));
      set({ rules, busy: null });
      saveRules(rules);
      get().log({
        level: "fill",
        text: `Executed ${rule.symbol}`,
        sub: `via ${res.route.join(" → ")}`,
        sig: signature,
        real: true,
      });
      get().refreshPortfolio();
    } catch (e) {
      set({ busy: null, lastError: String(e) });
      get().log({ level: "warn", text: "Execute failed", sub: String(e) });
    }
  },

  // Instant trade: buy an xStock with USDC, or sell part of a position, right
  // now. With a wallet this is a real Jupiter swap that lands on Solana. In demo
  // mode it fills against the demo book on live prices, labelled sim.
  tradeNow: async ({ symbol, side, usdcAmount, sellPct, payWith = "USDC" }) => {
    const stock = BY_SYMBOL[symbol.toUpperCase()];
    const q = get().quoteBySymbol(symbol);
    if (!stock || !q || q.onchainUsd == null) return;
    const price = q.onchainUsd;
    const sell = side === "sell";
    const posQty = positionQty(get().portfolio, symbol);
    const sellQty = sell ? posQty * ((sellPct ?? 100) / 100) : 0;
    const { address, walletName } = get();

    set({ lastTrade: null });

    if (sell && sellQty <= 0) {
      set({ lastTrade: { ok: false, text: `No ${symbol} to sell`, symbol, at: Date.now() } });
      get().log({ level: "warn", text: `No ${symbol} to sell` });
      return;
    }

    // Demo / no wallet -> simulate on the demo book.
    if (!address || !walletName || get().portfolio?.demo) {
      const pf = get().portfolio;
      if (!pf) return;
      const positions = [...pf.positions];
      const idx = positions.findIndex((p) => p.symbol.toUpperCase() === symbol.toUpperCase());
      let usdc = pf.usdc;
      let sub = "";
      if (sell && idx >= 0) {
        const proceeds = sellQty * price;
        positions[idx] = { ...positions[idx], amount: positions[idx].amount - sellQty, valueUsd: (positions[idx].amount - sellQty) * price };
        usdc += proceeds;
        sub = `sold ${sellQty.toFixed(2)} ${symbol} to $${proceeds.toFixed(0)} USDC`;
      } else if (!sell) {
        const spend = Math.min(usdcAmount ?? 0, usdc);
        const qty = price > 0 ? spend / price : 0;
        usdc -= spend;
        if (idx >= 0) positions[idx] = { ...positions[idx], amount: positions[idx].amount + qty, valueUsd: (positions[idx].amount + qty) * price };
        sub = `bought ${qty.toFixed(2)} ${symbol} for $${spend.toFixed(0)} USDC`;
      }
      const totalUsd = positions.reduce((s, p) => s + (p.valueUsd ?? 0), 0) + usdc;
      set({ portfolio: { ...pf, positions, usdc, totalUsd }, demoDirty: pf.demo ? true : get().demoDirty });
      get().log({ level: "fill", text: `${sell ? "Sold" : "Bought"} ${symbol}`, sub, real: false });
      set({ lastTrade: { ok: true, text: `${sell ? "Sold" : "Bought"} ${symbol}`, sub, symbol, at: Date.now() } });
      return;
    }

    // Real wallet -> real Jupiter swap.
    // Buying can be paid with USDC or, for wallets that only hold SOL, with SOL.
    const buyWithSol = !sell && payWith === "SOL";
    const solPrice = get().solPrice;
    if (buyWithSol && !solPrice) {
      set({ lastTrade: { ok: false, text: "SOL price unavailable", sub: "Try again in a moment, or pay with USDC.", symbol, at: Date.now() } });
      return;
    }
    set({ busy: `trade-${symbol}` });
    try {
      let inputMint: string;
      let amount: number;
      if (sell) {
        inputMint = stock.mint;
        amount = Math.round(sellQty * 10 ** stock.decimals);
      } else if (buyWithSol) {
        inputMint = SOL_MINT;
        amount = Math.round(((usdcAmount ?? 0) / (solPrice as number)) * 1e9); // usdcAmount = USD to spend
      } else {
        inputMint = USDC.mint;
        amount = Math.round((usdcAmount ?? 0) * 10 ** USDC.decimals);
      }
      const res = await getJSON<{ swapTransaction: string; route: string[] }>("/api/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputMint,
          outputMint: sell ? USDC.mint : stock.mint,
          amount,
          slippageBps: 150,
          userPublicKey: address,
        }),
      });
      const signature = await signAndSend(res.swapTransaction);
      const verb = sell ? "Sell" : "Buy";
      // Optimistic: it is signed and broadcast. Confirmation follows below.
      set({
        busy: null,
        lastTrade: {
          ok: true,
          text: `${verb} submitted`,
          sub: "signed and sent, confirming on Solana",
          sig: signature,
          symbol,
          at: Date.now(),
        },
      });
      get().log({
        level: "fill",
        text: `${verb} submitted: ${symbol}`,
        sub: `via ${res.route.join(" → ")}`,
        sig: signature,
        real: true,
      });
      confirmTx(get, set, signature, symbol, sell);
    } catch (e) {
      const msg = friendlyError(e);
      set({
        busy: null,
        lastError: String(e),
        lastTrade: { ok: false, text: "Trade failed", sub: msg, symbol, at: Date.now() },
      });
      get().log({ level: "warn", text: "Trade failed", sub: msg });
    }
  },

  // Grant Vigil's executor a capped, revocable Token-2022 allowance so a stop
  // loss can fire hands-free. One signature, capped at your position, revocable.
  grantHandsFree: async (symbol) => {
    const { address, walletName } = get();
    if (!address || !walletName) {
      get().log({ level: "warn", text: "Connect a wallet to enable hands-free protection" });
      return;
    }
    const cap = positionQty(get().portfolio, symbol) || 1;
    set({ busy: `grant-${symbol}` });
    try {
      const res = await getJSON<{ transaction: string; delegate: string; cap: number }>(
        "/api/delegate/approve",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner: address, symbol, capUnits: cap }),
        },
      );
      const signature = await signAndSend(res.transaction);
      set({ delegations: Array.from(new Set([...get().delegations, symbol.toUpperCase()])), busy: null });
      get().log({
        level: "chain",
        text: `Hands-free enabled: ${symbol}`,
        sub: `capped allowance to executor ${res.delegate.slice(0, 6)}… · revocable any time`,
        sig: signature,
        real: true,
      });
    } catch (e) {
      set({ busy: null, lastError: String(e) });
      get().log({ level: "warn", text: "Grant failed", sub: String(e) });
    }
  },

  revokeHandsFree: async (symbol) => {
    const { address, walletName } = get();
    if (!address || !walletName) return;
    set({ busy: `revoke-${symbol}` });
    try {
      const res = await getJSON<{ transaction: string }>("/api/delegate/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner: address, symbol }),
      });
      const signature = await signAndSend(res.transaction);
      set({
        delegations: get().delegations.filter((s) => s !== symbol.toUpperCase()),
        busy: null,
      });
      get().log({
        level: "chain",
        text: `Hands-free revoked: ${symbol}`,
        sub: "allowance set to zero",
        sig: signature,
        real: true,
      });
    } catch (e) {
      set({ busy: null, lastError: String(e) });
      get().log({ level: "warn", text: "Revoke failed", sub: String(e) });
    }
  },

  startDrill: (symbol, targetPct, seconds = 6) => {
    set({
      drill: { symbol, targetPct, startedAt: Date.now(), durationMs: seconds * 1000 },
      lastGuardEvent: null,
    });
    get().log({
      level: "warn",
      text: `Drill: ${targetPct > 0 ? "+" : ""}${targetPct}% shock on ${symbol}`,
      sub: "simulated price path, live guards respond in real time",
    });
  },

  // Reset to live feeds: rewind the drill completely. Live prices return, the
  // capital-preserved card clears, and in demo mode the book is restored and any
  // rule that fired during the drill is re-armed, so it can be run again cleanly.
  stopDrill: () => {
    const viewingDemo = get().portfolio?.demo ?? false;
    if (viewingDemo) {
      const rules = get().rules.map((r) =>
        r.status === "triggered" ? { ...r, status: "armed" as const, lastFiredAt: undefined } : r,
      );
      set({ drill: null, lastGuardEvent: null, demoDirty: false, rules });
      saveRules(rules);
      get().refreshPortfolio();
    } else {
      set({ drill: null, lastGuardEvent: null });
    }
  },

  log: (e) =>
    set((s) => ({
      events: [{ ...e, id: genId(), at: Date.now() }, ...s.events].slice(0, 60),
    })),

  // The heartbeat: evaluate every armed rule against the live (or drilled)
  // price, honoring the market clock, and fire the ones that breach.
  tick: () => {
    const { rules, clock, nightWatch } = get();
    const nyseOpen = clock?.nyseOpen ?? true;
    // Night Watch: rules stand down while NYSE is open, wake when it closes.
    const dormant = nightWatch && nyseOpen;
    let changed = false;
    const next = rules.map((r) => {
      if (r.status !== "armed") return r;
      const price = get().effectivePrice(r.symbol);
      // keep trailing peaks current even while dormant
      let rr = r;
      if (r.kind === "trailing_stop" && price !== null) {
        const bumped = bumpPeak(r, price);
        if (bumped !== r) {
          rr = bumped;
          changed = true;
        }
      }
      if (dormant) return rr;
      const ev = evalRule(rr, price, nyseOpen);
      if (ev.breached) {
        changed = true;
        const fired: Rule = { ...rr, status: "triggered", lastFiredAt: Date.now(), nyseWouldMiss: !nyseOpen };
        // Vigil Watch fires: simulate the protective fill using live numbers.
        fireWatch(get, set, fired, nyseOpen);
        return fired;
      }
      return rr;
    });
    if (changed) {
      set({ rules: next });
      saveRules(next);
    }
  },
}));

// ---- helpers that need get/set ----

type Get = () => State;
type Set = (partial: Partial<State> | ((s: State) => Partial<State>)) => void;

function positionQty(portfolio: Portfolio | null, symbol: string): number {
  const p = portfolio?.positions.find((x) => x.symbol.toUpperCase() === symbol.toUpperCase());
  return p?.amount ?? 0;
}

// Poll the chain after a swap is broadcast and tell the truth: confirmed, or
// failed on-chain. Updates the inline trade result and the portfolio.
async function confirmTx(get: Get, set: Set, sig: string, symbol: string, sell: boolean) {
  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    if (get().lastTrade?.sig !== sig) return; // superseded by a newer trade
    try {
      const r = await fetch(`/api/tx?sig=${sig}`);
      const j = (await r.json()) as { status?: string };
      if (j.status === "confirmed") {
        set({
          lastTrade: {
            ok: true,
            text: `${sell ? "Sold" : "Bought"} ${symbol}`,
            sub: "confirmed on Solana",
            sig,
            symbol,
            at: Date.now(),
          },
        });
        get().log({ level: "chain", text: `Confirmed on Solana: ${symbol}`, sig, real: true });
        get().refreshPortfolio();
        return;
      }
      if (j.status === "failed") {
        set({
          lastTrade: {
            ok: false,
            text: "Trade failed on-chain",
            sub: "the transaction did not go through. You were not charged for the trade, only a tiny network fee.",
            sig,
            symbol,
            at: Date.now(),
          },
        });
        get().log({ level: "warn", text: `Failed on-chain: ${symbol}`, sig });
        return;
      }
    } catch {
      /* keep polling */
    }
  }
  // Timed out without a definitive status; leave the optimistic "submitted".
  get().refreshPortfolio();
}

// Turn a raw wallet/RPC/Jupiter error into one plain sentence a person can act on.
function friendlyError(e: unknown): string {
  const s = String(e);
  if (/reject|denied|cancel|declined/i.test(s)) return "You cancelled it in your wallet.";
  if (/insufficient|0x1\b|debit an account|not enough|lamports/i.test(s))
    return "Not enough balance. You need the USDC to spend plus a little SOL for the network fee.";
  if (/blockhash|expired|block height/i.test(s)) return "The transaction expired before it landed. Try again.";
  if (/slippage|price moved|0x1771/i.test(s)) return "Price moved too much. Try again.";
  if (/simulat/i.test(s)) return "The network rejected the transaction on simulation. Check you have a little SOL for fees, then try again.";
  return s.replace(/^Error:\s*/, "").slice(0, 160);
}

function describeRule(r: Rule): string {
  if (r.kind === "stop_loss") return `sell ${r.sizePct ?? 100}% if ≤ $${r.triggerUsd}`;
  if (r.kind === "take_profit") return `sell ${r.sizePct ?? 100}% if ≥ $${r.triggerUsd}`;
  if (r.kind === "trailing_stop") return `sell ${r.sizePct ?? 100}% on ${r.trailPct}% drop from peak`;
  if (r.kind === "buy_dip") return `buy $${r.usdcAmount} if ≤ $${r.triggerUsd}`;
  return `buy $${r.usdcAmount} every ${r.everyHours}h`;
}

function fireWatch(get: Get, set: Set, rule: Rule, nyseOpen: boolean) {
  const q = get().quoteBySymbol(rule.symbol);
  const soldAt = get().effectivePrice(rule.symbol) ?? q?.onchainUsd ?? 0;
  const clockNote = nyseOpen ? "" : ", NYSE closed";
  get().log({
    level: "fire",
    text: `Guard fired: ${rule.symbol} at $${soldAt.toFixed(2)}${clockNote}`,
    sub: describeRule(rule),
  });

  const filled = fillSimulated(get, set, rule);

  // Build the capital-preserved record when a sell fires during a drill.
  const drill = get().drill;
  if (drill && isSell(rule.kind) && q?.onchainUsd != null && filled) {
    const preDrillPrice = q.onchainUsd;
    const bottomPrice = preDrillPrice * (1 + drill.targetPct / 100);
    const soldQty = filled.qty;
    const proceeds = filled.proceeds;
    const preserved = Math.max(0, soldQty * (soldAt - bottomPrice));
    const wouldLose = soldQty * (preDrillPrice - bottomPrice);
    set({
      protectedTotal: get().protectedTotal + preserved,
      lastGuardEvent: {
        at: Date.now(),
        symbol: rule.symbol,
        kind: rule.kind,
        soldQty,
        soldAt,
        preDrillPrice,
        bottomPrice,
        proceeds,
        preserved,
        wouldLose: Math.max(0, wouldLose),
        nyseOpen,
        drill: true,
      },
    });
  }
}

// Simulate a fill using the live price, and adjust the demo portfolio so the
// effect is visible. Clearly logged as a simulated fill (real fills carry a sig).
// Returns the executed quantity and proceeds so callers can build a summary.
function fillSimulated(
  get: Get,
  set: Set,
  rule: Rule,
): { qty: number; proceeds: number } | null {
  const q = get().quoteBySymbol(rule.symbol);
  const price = get().effectivePrice(rule.symbol) ?? q?.onchainUsd ?? 0;
  const pf = get().portfolio;
  const sell = isSell(rule.kind);
  let sub = "";
  let out: { qty: number; proceeds: number } | null = null;
  if (pf) {
    const positions = [...pf.positions];
    const idx = positions.findIndex((p) => p.symbol.toUpperCase() === rule.symbol.toUpperCase());
    let usdc = pf.usdc;
    if (sell && idx >= 0) {
      const qty = positions[idx].amount * ((rule.sizePct ?? 100) / 100);
      const proceeds = qty * price;
      positions[idx] = {
        ...positions[idx],
        amount: positions[idx].amount - qty,
        valueUsd: (positions[idx].amount - qty) * price,
      };
      usdc += proceeds;
      sub = `sold ${qty.toFixed(2)} ${rule.symbol} to $${proceeds.toFixed(0)} USDC`;
      out = { qty, proceeds };
    } else if (!sell) {
      const spend = rule.usdcAmount ?? 0;
      const qty = price > 0 ? spend / price : 0;
      usdc = Math.max(0, usdc - spend);
      if (idx >= 0) {
        positions[idx] = { ...positions[idx], amount: positions[idx].amount + qty, valueUsd: (positions[idx].amount + qty) * price };
      }
      sub = `bought ${qty.toFixed(2)} ${rule.symbol} for $${spend.toFixed(0)} USDC`;
      out = { qty, proceeds: spend };
    }
    const totalUsd = positions.reduce((s, p) => s + (p.valueUsd ?? 0), 0) + usdc;
    // Lock the demo book after a simulated fill so refreshes don't revert it.
    set({ portfolio: { ...pf, positions, usdc, totalUsd }, demoDirty: pf.demo ? true : get().demoDirty });
  }
  get().log({ level: "fill", text: `Filled ${rule.symbol}`, sub: sub || "simulated fill", real: false });
  return out;
}

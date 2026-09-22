import { XSTOCKS, BY_MINT, USDC, SOL_MINT } from "./tokens";
import type { AssetQuote } from "./types";

// Jupiter is the router the whole Solana ecosystem already trusts. Its free
// price v3 endpoint hands us three things in one call: the tokenized on-chain
// price (24/7), the real underlying equity price, and live liquidity. Its
// swap + trigger endpoints are the non-custodial execution rail.

const JUP = process.env.JUP_API_BASE || "https://lite-api.jup.ag";

type PriceV3Entry = {
  usdPrice?: number;
  decimals?: number;
  priceChange24h?: number;
  liquidity?: number;
  stockData?: { price?: number; mcap?: number; updatedAt?: string };
};

const cache = new Map<string, { at: number; ttl: number; val: unknown }>();
async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && now - hit.at < hit.ttl) return hit.val as T;
  try {
    const val = await fn();
    cache.set(key, { at: now, ttl: ttlMs, val });
    return val;
  } catch (e) {
    if (hit) return hit.val as T;
    throw e;
  }
}

export async function priceV3(mints: string[]): Promise<Record<string, PriceV3Entry>> {
  if (mints.length === 0) return {};
  const ids = mints.join(",");
  const r = await fetch(`${JUP}/price/v3?ids=${ids}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`jup price ${r.status}`);
  return (await r.json()) as Record<string, PriceV3Entry>;
}

export async function getSolPrice(): Promise<number | null> {
  return cached("solprice", 12_000, async () => {
    const map = await priceV3([SOL_MINT]);
    const p = map[SOL_MINT];
    return typeof p?.usdPrice === "number" ? p.usdPrice : null;
  });
}

export async function getAssetQuotes(): Promise<AssetQuote[]> {
  return cached("quotes", 12_000, async () => {
    const map = await priceV3(XSTOCKS.map((t) => t.mint));
    const now = Date.now();
    return XSTOCKS.map((t) => {
      const p = map[t.mint] || {};
      const onchain = typeof p.usdPrice === "number" ? p.usdPrice : null;
      const equity = typeof p.stockData?.price === "number" ? p.stockData!.price! : null;
      const basisPct =
        onchain !== null && equity ? ((onchain - equity) / equity) * 100 : null;
      const q: AssetQuote = {
        symbol: t.symbol,
        under: t.under,
        name: t.name,
        mint: t.mint,
        decimals: t.decimals,
        onchainUsd: onchain,
        equityUsd: equity,
        basisPct,
        change24hPct: typeof p.priceChange24h === "number" ? p.priceChange24h : null,
        liquidityUsd: typeof p.liquidity === "number" ? p.liquidity : null,
        pythCrypto: t.pythCrypto,
        pythEquity: t.pythEquity,
        updatedAt: now,
      };
      return q;
    });
  });
}

export type QuoteParams = {
  inputMint: string;
  outputMint: string;
  amount: string; // smallest units of inputMint
  slippageBps?: number;
};

export type JupQuote = {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  priceImpactPct: string;
  routePlan: { swapInfo: { label: string } }[];
};

export async function getQuote(p: QuoteParams): Promise<JupQuote> {
  const u = new URL(`${JUP}/swap/v1/quote`);
  u.searchParams.set("inputMint", p.inputMint);
  u.searchParams.set("outputMint", p.outputMint);
  u.searchParams.set("amount", p.amount);
  u.searchParams.set("slippageBps", String(p.slippageBps ?? 100));
  const r = await fetch(u.toString(), { cache: "no-store" });
  if (!r.ok) throw new Error(`jup quote ${r.status}: ${await r.text()}`);
  return (await r.json()) as JupQuote;
}

export type BuildSwapParams = {
  quote: JupQuote;
  userPublicKey: string;
};

// Returns a base64 unsigned transaction the wallet signs and sends.
export async function buildSwap(p: BuildSwapParams): Promise<{ swapTransaction: string }> {
  const r = await fetch(`${JUP}/swap/v1/swap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: p.quote,
      userPublicKey: p.userPublicKey,
      dynamicComputeUnitLimit: true,
      dynamicSlippage: true,
      prioritizationFeeLamports: { priorityLevelWithMaxLamports: { priorityLevel: "high", maxLamports: 4_000_000 } },
    }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`jup swap ${r.status}: ${await r.text()}`);
  return (await r.json()) as { swapTransaction: string };
}

// Route labels help us surface "this settled through Meteora DLMM" provenance.
export function routeLabels(q: JupQuote): string[] {
  return Array.from(new Set((q.routePlan || []).map((r) => r.swapInfo?.label).filter(Boolean)));
}

// ---- Trigger orders: the non-custodial, keeper-executed 24/7 rail ----
// Verified live (Sep 2026): createOrder -> sign -> execute. A resting limit
// order the Jupiter keeper fills whenever the on-chain price crosses your rate,
// at 3am on a Sunday if that is when it happens. Vigil never holds your keys.

export type CreateTriggerParams = {
  inputMint: string;
  outputMint: string;
  maker: string;
  makingAmount: string; // smallest units of inputMint to sell
  takingAmount: string; // smallest units of outputMint required (sets the price)
  expiredAt?: number; // unix seconds
  slippageBps?: number;
};

export type CreateTriggerResult = {
  code: number;
  requestId: string;
  order: string; // on-chain order account
  transaction: string; // base64 unsigned tx
};

export async function createTriggerOrder(p: CreateTriggerParams): Promise<CreateTriggerResult> {
  const params: Record<string, string> = {
    makingAmount: p.makingAmount,
    takingAmount: p.takingAmount,
  };
  if (p.expiredAt) params.expiredAt = String(p.expiredAt);
  if (p.slippageBps !== undefined) params.slippageBps = String(p.slippageBps);
  const r = await fetch(`${JUP}/trigger/v1/createOrder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      inputMint: p.inputMint,
      outputMint: p.outputMint,
      maker: p.maker,
      payer: p.maker,
      params,
    }),
    cache: "no-store",
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`trigger create ${r.status}: ${JSON.stringify(j)}`);
  return j as CreateTriggerResult;
}

export async function executeTrigger(requestId: string, signedTransaction: string) {
  const r = await fetch(`${JUP}/trigger/v1/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId, signedTransaction }),
    cache: "no-store",
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`trigger execute ${r.status}: ${JSON.stringify(j)}`);
  return j as { code?: number; signature?: string; status?: string };
}

export type TriggerOrder = {
  orderKey: string;
  inputMint: string;
  outputMint: string;
  makingAmount: string;
  takingAmount: string;
  status: string;
  createdAt?: string;
};

export async function listTriggerOrders(user: string, status = "active"): Promise<TriggerOrder[]> {
  const u = new URL(`${JUP}/trigger/v1/getTriggerOrders`);
  u.searchParams.set("user", user);
  u.searchParams.set("orderStatus", status);
  const r = await fetch(u.toString(), { cache: "no-store" });
  if (!r.ok) return [];
  const j = await r.json();
  return (j.orders ?? []) as TriggerOrder[];
}

export { USDC, BY_MINT };

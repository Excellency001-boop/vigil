import type { MarketClock } from "./types";

// Pyth Hermes gives us market-hours truth for free. The live /updates price
// endpoint is now gated behind Pyth Pro, but /v2/price_feeds (metadata +
// market_hours) is open, and market hours are exactly what Vigil needs:
// the authoritative answer to "is the New York Stock Exchange asleep right now?"

const HERMES = "https://hermes.pyth.network";
const UA = "Mozilla/5.0 (compatible; Vigil/1.0; +https://vigil.trade)";

type FeedMeta = {
  id: string;
  market_hours?: {
    is_open?: boolean;
    next_open?: number | null;
    next_close?: number | null;
  };
  attributes?: { symbol?: string };
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
    if (hit) return hit.val as T; // serve stale on failure
    throw e;
  }
}

async function feedsByQuery(query: string, assetType: "equity" | "crypto"): Promise<FeedMeta[]> {
  const url = `${HERMES}/v2/price_feeds?query=${encodeURIComponent(query)}&asset_type=${assetType}`;
  const r = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
  if (!r.ok) throw new Error(`hermes ${r.status}`);
  return (await r.json()) as FeedMeta[];
}

// All US-listed xStocks share the NYSE session, so one representative equity
// feed drives the whole clock. AAPL is the reference.
export async function getMarketClock(): Promise<MarketClock> {
  return cached("clock", 30_000, async () => {
    const list = await feedsByQuery("AAPL", "equity");
    const feed =
      list.find((x) => x.attributes?.symbol === "Equity.US.AAPL/USD") || list[0];
    const mh = feed?.market_hours || {};
    const now = Math.floor(Date.now() / 1000);
    const nextOpen = mh.next_open ?? null;
    const nextClose = mh.next_close ?? null;
    return {
      nyseOpen: !!mh.is_open,
      solanaOpen: true,
      nextOpen,
      nextClose,
      secondsToOpen: nextOpen ? Math.max(0, nextOpen - now) : null,
      secondsToClose: nextClose ? Math.max(0, nextClose - now) : null,
      asOf: now,
      source: "pyth",
      equityFeed: feed?.id || "",
    };
  });
}

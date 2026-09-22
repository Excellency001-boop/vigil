import { getTokenBalances } from "@/lib/solana";
import { getAssetQuotes } from "@/lib/jupiter";
import { BY_MINT } from "@/lib/tokens";
import type { AssetQuote, Portfolio, Position } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// A representative holdings mix so judges see a live portfolio instantly,
// without needing to hold xStocks themselves. Amounts are human units.
const DEMO_HOLDINGS: Record<string, number> = {
  NVDAx: 14,
  AAPLx: 22,
  TSLAx: 9,
  COINx: 18,
  METAx: 4,
};
const DEMO_USDC = 2400;

function buildPositions(
  holdings: { symbol: string; amount: number }[],
  quotes: AssetQuote[],
): Position[] {
  const bySym = Object.fromEntries(quotes.map((q) => [q.symbol, q]));
  return holdings
    .map((h) => {
      const q = bySym[h.symbol];
      if (!q) return null;
      const value = q.onchainUsd !== null ? q.onchainUsd * h.amount : null;
      const p: Position = {
        symbol: q.symbol,
        name: q.name,
        mint: q.mint,
        decimals: q.decimals,
        amount: h.amount,
        onchainUsd: q.onchainUsd,
        valueUsd: value,
        change24hPct: q.change24hPct,
        basisPct: q.basisPct,
      };
      return p;
    })
    .filter((p): p is Position => p !== null)
    .sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const quotes = await getAssetQuotes();

  // Demo mode
  if (!owner || owner === "demo") {
    const holdings = Object.entries(DEMO_HOLDINGS).map(([symbol, amount]) => ({ symbol, amount }));
    const positions = buildPositions(holdings, quotes);
    const stockValue = positions.reduce((s, p) => s + (p.valueUsd ?? 0), 0);
    const portfolio: Portfolio = {
      owner: "demo",
      demo: true,
      positions,
      usdc: DEMO_USDC,
      totalUsd: stockValue + DEMO_USDC,
      asOf: Date.now(),
    };
    return Response.json(portfolio);
  }

  // Real wallet
  try {
    const balances = await getTokenBalances(owner);
    const usdcMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
    const usdc = balances.find((b) => b.mint === usdcMint)?.amount ?? 0;
    const holdings = balances
      .filter((b) => BY_MINT[b.mint])
      .map((b) => ({ symbol: BY_MINT[b.mint].symbol, amount: b.amount }));
    const positions = buildPositions(holdings, quotes);
    const stockValue = positions.reduce((s, p) => s + (p.valueUsd ?? 0), 0);
    const portfolio: Portfolio = {
      owner,
      demo: false,
      positions,
      usdc,
      totalUsd: stockValue + usdc,
      asOf: Date.now(),
    };
    return Response.json(portfolio);
  } catch (e) {
    return Response.json(
      { error: "portfolio_unavailable", message: String(e) },
      { status: 502 },
    );
  }
}

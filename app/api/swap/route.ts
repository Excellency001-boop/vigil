import { getQuote, buildSwap, routeLabels } from "@/lib/jupiter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Build an unsigned swap transaction. The wallet signs + sends it, so Vigil
// never takes custody. This is the manual "execute now" path.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { inputMint, outputMint, amount, slippageBps, userPublicKey } = body ?? {};
    if (!inputMint || !outputMint || !amount || !userPublicKey) {
      return Response.json({ error: "missing_params" }, { status: 400 });
    }
    const quote = await getQuote({
      inputMint,
      outputMint,
      amount: String(amount),
      slippageBps: slippageBps ?? 100,
    });
    const { swapTransaction } = await buildSwap({ quote, userPublicKey });
    return Response.json({
      swapTransaction,
      route: routeLabels(quote),
      outAmount: quote.outAmount,
      priceImpactPct: quote.priceImpactPct,
    });
  } catch (e) {
    return Response.json({ error: "swap_build_failed", message: String(e) }, { status: 502 });
  }
}

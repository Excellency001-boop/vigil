import { getQuote, routeLabels } from "@/lib/jupiter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const inputMint = searchParams.get("inputMint");
  const outputMint = searchParams.get("outputMint");
  const amount = searchParams.get("amount");
  const slippageBps = Number(searchParams.get("slippageBps") ?? "100");
  if (!inputMint || !outputMint || !amount) {
    return Response.json({ error: "missing_params" }, { status: 400 });
  }
  try {
    const quote = await getQuote({ inputMint, outputMint, amount, slippageBps });
    return Response.json({ quote, route: routeLabels(quote) });
  } catch (e) {
    return Response.json({ error: "quote_failed", message: String(e) }, { status: 502 });
  }
}

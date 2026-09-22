import { createTriggerOrder } from "@/lib/jupiter";
import { BY_SYMBOL, USDC, SOL_MINT } from "@/lib/tokens";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Turn a plain intent ("sell 5 NVDAx if it hits $200") into a real Jupiter
// Trigger order. Sells set a floor of USDC out; buys set a floor of xStock out.
// Either way the keeper only fills when the on-chain price crosses the rate.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { maker, symbol, kind, triggerUsd, sellQty, usdcAmount, expiryDays, payWith, solPrice } =
      body ?? {};
    const stock = BY_SYMBOL[String(symbol).toUpperCase()];
    if (!maker || !stock || !triggerUsd) {
      return Response.json({ error: "missing_params" }, { status: 400 });
    }

    const expiredAt = Math.floor(Date.now() / 1000) + (Number(expiryDays) || 30) * 86400;
    let params;

    if (kind === "take_profit") {
      if (!sellQty) return Response.json({ error: "missing_sellQty" }, { status: 400 });
      const makingAmount = Math.round(Number(sellQty) * 10 ** stock.decimals);
      const takingAmount = Math.round(Number(sellQty) * Number(triggerUsd) * 10 ** USDC.decimals);
      params = {
        inputMint: stock.mint,
        outputMint: USDC.mint,
        maker,
        makingAmount: String(makingAmount),
        takingAmount: String(takingAmount),
        expiredAt,
      };
    } else if (kind === "buy_dip") {
      if (!usdcAmount) return Response.json({ error: "missing_usdcAmount" }, { status: 400 });
      // usdcAmount is the USD to spend; pay it from USDC or from SOL.
      const takingAmount = Math.round((Number(usdcAmount) / Number(triggerUsd)) * 10 ** stock.decimals);
      const withSol = payWith === "SOL";
      if (withSol && !solPrice) {
        return Response.json({ error: "missing_solPrice" }, { status: 400 });
      }
      const makingAmount = withSol
        ? Math.round((Number(usdcAmount) / Number(solPrice)) * 1e9)
        : Math.round(Number(usdcAmount) * 10 ** USDC.decimals);
      params = {
        inputMint: withSol ? SOL_MINT : USDC.mint,
        outputMint: stock.mint,
        maker,
        makingAmount: String(makingAmount),
        takingAmount: String(takingAmount),
        expiredAt,
      };
    } else {
      return Response.json({ error: "unsupported_kind_for_onchain_order" }, { status: 400 });
    }

    const result = await createTriggerOrder(params);
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: "trigger_create_failed", message: String(e) }, { status: 502 });
  }
}

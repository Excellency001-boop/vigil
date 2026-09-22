import { getAssetQuotes, getSolPrice } from "@/lib/jupiter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const [quotes, solPrice] = await Promise.all([getAssetQuotes(), getSolPrice()]);
    return Response.json({ quotes, solPrice, asOf: Date.now() });
  } catch (e) {
    return Response.json(
      { error: "prices_unavailable", message: String(e) },
      { status: 502 },
    );
  }
}

import { getMarketClock } from "@/lib/pyth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const clock = await getMarketClock();
    return Response.json(clock);
  } catch (e) {
    return Response.json(
      { error: "clock_unavailable", message: String(e) },
      { status: 502 },
    );
  }
}

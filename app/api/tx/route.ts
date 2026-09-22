import { getTxStatus } from "@/lib/solana";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const sig = new URL(request.url).searchParams.get("sig");
  if (!sig) return Response.json({ status: "pending" });
  try {
    const status = await getTxStatus(sig);
    return Response.json({ status });
  } catch (e) {
    return Response.json({ status: "pending", error: String(e) });
  }
}

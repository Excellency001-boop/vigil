import { listTriggerOrders } from "@/lib/jupiter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const user = searchParams.get("user");
  if (!user) return Response.json({ orders: [] });
  try {
    const orders = await listTriggerOrders(user, searchParams.get("status") ?? "active");
    return Response.json({ orders });
  } catch (e) {
    return Response.json({ orders: [], error: String(e) });
  }
}

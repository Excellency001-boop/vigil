import { executeTrigger } from "@/lib/jupiter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    const { requestId, signedTransaction } = (await request.json()) ?? {};
    if (!requestId || !signedTransaction) {
      return Response.json({ error: "missing_params" }, { status: 400 });
    }
    const res = await executeTrigger(requestId, signedTransaction);
    return Response.json(res);
  } catch (e) {
    return Response.json({ error: "trigger_execute_failed", message: String(e) }, { status: 502 });
  }
}

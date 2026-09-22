import {
  Connection,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  createRevokeInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { BY_SYMBOL } from "@/lib/tokens";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const RPC = process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";

// Revoke a delegation. One signature and Vigil can touch nothing again.
export async function POST(request: Request) {
  try {
    const { owner, symbol } = (await request.json()) ?? {};
    const stock = BY_SYMBOL[String(symbol).toUpperCase()];
    if (!owner || !stock) return Response.json({ error: "missing_params" }, { status: 400 });
    const ownerPk = new PublicKey(owner);
    const mintPk = new PublicKey(stock.mint);
    const ata = getAssociatedTokenAddressSync(mintPk, ownerPk, false, TOKEN_2022_PROGRAM_ID);

    const ix = createRevokeInstruction(ata, ownerPk, [], TOKEN_2022_PROGRAM_ID);
    const conn = new Connection(RPC, "confirmed");
    const { blockhash } = await conn.getLatestBlockhash("confirmed");
    const msg = new TransactionMessage({
      payerKey: ownerPk,
      recentBlockhash: blockhash,
      instructions: [ix],
    }).compileToV0Message();
    const tx = new VersionedTransaction(msg);
    const b64 = Buffer.from(tx.serialize()).toString("base64");

    return Response.json({ transaction: b64 });
  } catch (e) {
    return Response.json({ error: "revoke_build_failed", message: String(e) }, { status: 502 });
  }
}

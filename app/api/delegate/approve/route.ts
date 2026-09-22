import {
  Connection,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  createApproveCheckedInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { BY_SYMBOL } from "@/lib/tokens";
import { VIGIL_EXECUTOR } from "@/lib/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const RPC = process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";

// Build a Token-2022 approveChecked transaction. The user signs it once to
// grant Vigil's executor a capped, revocable allowance on one xStock. That is
// the whole non-custodial autonomy mechanism: Vigil can spend up to the cap to
// protect you, nothing more, and you can revoke it any time.
export async function POST(request: Request) {
  try {
    const { owner, symbol, capUnits } = (await request.json()) ?? {};
    const stock = BY_SYMBOL[String(symbol).toUpperCase()];
    if (!owner || !stock || !capUnits) {
      return Response.json({ error: "missing_params" }, { status: 400 });
    }
    const ownerPk = new PublicKey(owner);
    const mintPk = new PublicKey(stock.mint);
    const delegate = new PublicKey(VIGIL_EXECUTOR);
    const ata = getAssociatedTokenAddressSync(mintPk, ownerPk, false, TOKEN_2022_PROGRAM_ID);
    const amount = BigInt(Math.round(Number(capUnits) * 10 ** stock.decimals));

    const ix = createApproveCheckedInstruction(
      ata,
      mintPk,
      delegate,
      ownerPk,
      amount,
      stock.decimals,
      [],
      TOKEN_2022_PROGRAM_ID,
    );

    const conn = new Connection(RPC, "confirmed");
    const { blockhash } = await conn.getLatestBlockhash("confirmed");
    const msg = new TransactionMessage({
      payerKey: ownerPk,
      recentBlockhash: blockhash,
      instructions: [ix],
    }).compileToV0Message();
    const tx = new VersionedTransaction(msg);
    const b64 = Buffer.from(tx.serialize()).toString("base64");

    return Response.json({ transaction: b64, delegate: VIGIL_EXECUTOR, cap: capUnits });
  } catch (e) {
    return Response.json({ error: "approve_build_failed", message: String(e) }, { status: 502 });
  }
}

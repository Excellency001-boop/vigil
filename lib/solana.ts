import { Connection, PublicKey } from "@solana/web3.js";
import { XSTOCKS, BY_MINT, USDC } from "./tokens";

// xStocks are Token-2022 mints (they use the Scaled UI Amount extension to
// rebase for dividends and splits), so we query both token programs.
const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const TOKEN_2022_PROGRAM = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

const RPC = process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";

export type RawBalance = { mint: string; amount: number };

export async function getTokenBalances(owner: string): Promise<RawBalance[]> {
  const conn = new Connection(RPC, "confirmed");
  const ownerPk = new PublicKey(owner);
  const out: Record<string, number> = {};
  for (const program of [TOKEN_PROGRAM, TOKEN_2022_PROGRAM]) {
    try {
      const res = await conn.getParsedTokenAccountsByOwner(ownerPk, { programId: program });
      for (const { account } of res.value) {
        const info = account.data.parsed?.info;
        const mint = info?.mint as string | undefined;
        const ui = info?.tokenAmount?.uiAmount as number | undefined;
        if (mint && typeof ui === "number" && ui > 0) {
          out[mint] = (out[mint] || 0) + ui;
        }
      }
    } catch {
      // public RPC can throttle; ignore this program's slice and keep going
    }
  }
  return Object.entries(out).map(([mint, amount]) => ({ mint, amount }));
}

export function isKnownXStock(mint: string): boolean {
  return !!BY_MINT[mint];
}

export type TxStatus = "confirmed" | "failed" | "pending";

// Ask the chain whether a signature landed. "failed" means it executed with an
// error; "confirmed" means it succeeded; "pending" means not yet visible.
export async function getTxStatus(sig: string): Promise<TxStatus> {
  const conn = new Connection(RPC, "confirmed");
  const res = await conn.getSignatureStatuses([sig], { searchTransactionHistory: true });
  const st = res.value[0];
  if (!st) return "pending";
  if (st.err) return "failed";
  if (st.confirmationStatus === "confirmed" || st.confirmationStatus === "finalized") {
    return "confirmed";
  }
  return "pending";
}

export { XSTOCKS, BY_MINT, USDC };

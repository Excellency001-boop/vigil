// A pinned, real on-chain action anyone can verify without connecting a wallet.
// Fill in a resting order account (`order`) and/or a transaction (`tx`) from a
// real trade placed through Vigil, then redeploy. While both are empty the
// proof card stays hidden.
//
// order   = a Jupiter Trigger order account, if one is resting (Solscan /account)
// tx      = a confirmed transaction signature (Solscan /tx)
// maker   = the wallet that placed it (so judges can re-derive it in the verifier)
// summary = one plain line describing what it is
export const PROOF: { order: string; tx: string; maker: string; summary: string } = {
  order: "3bD9kJGgxGHmiPNSuK69UDZcGFwuucgTKwrfmmGj6Q9m",
  tx: "5PfBAp8xmemNcgaxrt6gc4A5PuFiDVzLGH7vhu3y8rcA8WUdvPdvNAV7yiQyhN7fKSuXCLRJntWZJiWrZ5xzwBYx",
  maker: "GKJQFHmyuSxS55BhTVCMBabAYtVFGT3Fg5toifuSeiNC",
  summary:
    "A real order placed through Vigil, resting on Solana right now: buy NVDAx with SOL when it dips ~9%. The Jupiter keeper fills it 24/7, with the tab closed. Paste the wallet below to see it live.",
};

export const hasProof = () => PROOF.order.length > 0 || PROOF.tx.length > 0;

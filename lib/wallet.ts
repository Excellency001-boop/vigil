import { getWallets } from "@wallet-standard/app";
import bs58 from "bs58";

// Solana Wallet Standard. Every Solana wallet the person has installed (Phantom,
// Solflare, Backpack, Coinbase, Trust, Glow, and more) announces itself here with
// its real name and icon. We list them all, no hardcoding.

/* eslint-disable @typescript-eslint/no-explicit-any */

export type SolWallet = { name: string; icon: string };

const SOLANA_CHAIN = "solana:mainnet";

function isSolana(w: any): boolean {
  const feats = w?.features || {};
  const chains = w?.chains || [];
  return (
    "solana:signAndSendTransaction" in feats ||
    "solana:signTransaction" in feats ||
    (Array.isArray(chains) && chains.some((c: string) => typeof c === "string" && c.startsWith("solana:")))
  );
}

function rawWallets(): any[] {
  if (typeof window === "undefined") return [];
  try {
    return getWallets().get().filter(isSolana);
  } catch {
    return [];
  }
}

// Names hidden from the desktop list (offered on mobile via deep link instead).
const DESKTOP_HIDE = new Set(["solflare"]);

export function getSolanaWallets(): SolWallet[] {
  const list = rawWallets().map((w) => ({ name: w.name, icon: w.icon }));
  if (isMobile()) return list;
  return list.filter((w) => !DESKTOP_HIDE.has(w.name.trim().toLowerCase()));
}

// Wallets can register a moment after load; re-read when the registry changes.
export function onWalletsChange(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  try {
    const { on } = getWallets();
    const a = on("register", cb);
    const b = on("unregister", cb);
    return () => {
      a();
      b();
    };
  } catch {
    return () => {};
  }
}

let current: { wallet: any; account: any } | null = null;

export async function connectWallet(name: string): Promise<string> {
  const w = rawWallets().find((x) => x.name === name);
  if (!w) throw new Error(`${name} not found`);
  const feat = w.features["standard:connect"];
  if (!feat) throw new Error(`${name} cannot connect`);
  const { accounts } = await feat.connect();
  const account = accounts?.[0] || w.accounts?.[0];
  if (!account) throw new Error(`${name} returned no account`);
  current = { wallet: w, account };
  return account.address as string;
}

export async function disconnectWallet(): Promise<void> {
  const w = current?.wallet;
  current = null;
  const feat = w?.features?.["standard:disconnect"];
  if (feat) {
    try {
      await feat.disconnect();
    } catch {
      /* ignore */
    }
  }
}

// Jupiter hands us a base64 serialized transaction. The Wallet Standard feature
// takes those raw bytes, the wallet signs and sends, and returns the signature.
export async function signAndSend(base64Tx: string): Promise<string> {
  if (!current) throw new Error("No wallet connected");
  const bytes = Uint8Array.from(atob(base64Tx), (c) => c.charCodeAt(0));
  const feat = current.wallet.features["solana:signAndSendTransaction"];
  if (!feat) throw new Error(`${current.wallet.name} does not support send`);
  const out = await feat.signAndSendTransaction({
    account: current.account,
    transaction: bytes,
    chain: SOLANA_CHAIN,
  });
  const sig = Array.isArray(out) ? out[0]?.signature : (out as any)?.signature;
  return bs58.encode(sig);
}

export function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

// On a phone's normal browser no wallet is injected; these universal links open
// the dapp inside the wallet's own browser where it does register.
export function mobileWallets(): { name: string; link: string }[] {
  if (typeof window === "undefined") return [];
  const url = encodeURIComponent(window.location.href);
  const ref = encodeURIComponent(window.location.origin);
  return [
    { name: "Phantom", link: `https://phantom.app/ul/browse/${url}?ref=${ref}` },
    { name: "Solflare", link: `https://solflare.com/ul/v1/browse/${url}?ref=${ref}` },
  ];
}

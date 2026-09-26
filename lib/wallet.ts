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

export function getSolanaWallets(): SolWallet[] {
  return rawWallets().map((w) => ({ name: w.name, icon: w.icon }));
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

// Brand-colored icons for the mobile picker (phones cannot enumerate installed
// wallets, so these are curated "tap to open" options, each with its mark).
const PHANTOM_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><rect width='40' height='40' rx='11' fill='#AB9FF2'/><path fill='#fff' d='M13 27.5V19a7 7 0 0 1 14 0v8.5l-2.4-2.1-2.3 2.1-2.3-2.1-2.3 2.1-2.4-2.1z'/><circle cx='17' cy='19.5' r='1.7' fill='#534BB1'/><circle cx='23' cy='19.5' r='1.7' fill='#534BB1'/></svg>";
const SOLFLARE_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><rect width='40' height='40' rx='11' fill='#FE7644'/><circle cx='20' cy='20' r='6' fill='#FFD15C'/><g stroke='#FFD15C' stroke-width='2.6' stroke-linecap='round'><path d='M20 7v3.5M20 29.5V33M7 20h3.5M29.5 20H33M11 11l2.4 2.4M26.6 26.6 29 29M29 11l-2.4 2.4M13.4 26.6 11 29'/></g></svg>";
const dataUri = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`;

export type MobileWallet = { name: string; link: string; icon: string };

// On a phone's normal browser no wallet is injected; these universal links open
// the dapp inside the wallet's own browser where it does register.
export function mobileWallets(): MobileWallet[] {
  if (typeof window === "undefined") return [];
  const url = encodeURIComponent(window.location.href);
  const ref = encodeURIComponent(window.location.origin);
  return [
    { name: "Phantom", link: `https://phantom.app/ul/browse/${url}?ref=${ref}`, icon: dataUri(PHANTOM_SVG) },
    { name: "Solflare", link: `https://solflare.com/ul/v1/browse/${url}?ref=${ref}`, icon: dataUri(SOLFLARE_SVG) },
  ];
}

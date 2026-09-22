import { VersionedTransaction } from "@solana/web3.js";

// Lean wallet layer over injected Solana providers (Phantom, Solflare,
// Backpack). No adapter library, no SSR provider wrapping, no peer-dep drama.
// Vigil only ever asks the wallet to sign; it never sees a key.

export type ProviderName = "Phantom" | "Solflare" | "Backpack";

type Injected = {
  publicKey?: { toString(): string };
  isPhantom?: boolean;
  isSolflare?: boolean;
  isBackpack?: boolean;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString(): string } }>;
  disconnect: () => Promise<void>;
  signAndSendTransaction: (tx: VersionedTransaction) => Promise<{ signature: string }>;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function win(): any {
  return typeof window === "undefined" ? {} : (window as any);
}

export function getProvider(name: ProviderName): Injected | null {
  const w = win();
  switch (name) {
    case "Phantom":
      return w.phantom?.solana ?? (w.solana?.isPhantom ? w.solana : null);
    case "Solflare":
      return w.solflare ?? (w.solana?.isSolflare ? w.solana : null);
    case "Backpack":
      return w.backpack ?? w.xnft?.solana ?? null;
    default:
      return null;
  }
}

export function detectProviders(): ProviderName[] {
  return (["Phantom", "Solflare", "Backpack"] as ProviderName[]).filter((n) => !!getProvider(n));
}

export function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

// On a phone's normal browser the wallet is not injected. These universal links
// open the wallet app and load the current page inside the wallet's own browser,
// where the provider IS injected and connect() works. No-op on desktop.
export function walletDeepLink(name: ProviderName): string | null {
  if (typeof window === "undefined") return null;
  const url = encodeURIComponent(window.location.href);
  const ref = encodeURIComponent(window.location.origin);
  switch (name) {
    case "Phantom":
      return `https://phantom.app/ul/browse/${url}?ref=${ref}`;
    case "Solflare":
      return `https://solflare.com/ul/v1/browse/${url}?ref=${ref}`;
    case "Backpack":
      return `https://backpack.app/ul/browse/${url}?ref=${ref}`;
    default:
      return null;
  }
}

export async function connectWallet(name: ProviderName): Promise<string> {
  const p = getProvider(name);
  if (!p) throw new Error(`${name} not found`);
  const res = await p.connect();
  return res.publicKey.toString();
}

export async function disconnectWallet(name: ProviderName): Promise<void> {
  const p = getProvider(name);
  try {
    await p?.disconnect();
  } catch {
    /* ignore */
  }
}

// Deserialize a base64 tx from Jupiter, have the wallet sign + send it.
export async function signAndSend(name: ProviderName, base64Tx: string): Promise<string> {
  const p = getProvider(name);
  if (!p) throw new Error(`${name} not connected`);
  const raw = Uint8Array.from(atob(base64Tx), (c) => c.charCodeAt(0));
  const tx = VersionedTransaction.deserialize(raw);
  const { signature } = await p.signAndSendTransaction(tx);
  return signature;
}

// Serialize a signed tx back to base64 (for Jupiter's /execute lander). Only
// used when we need Jupiter to broadcast; the injected sign+send path above
// already lands most transactions directly.
export function encodeTx(tx: VersionedTransaction): string {
  const raw = tx.serialize();
  let bin = "";
  for (let i = 0; i < raw.length; i++) bin += String.fromCharCode(raw[i]);
  return btoa(bin);
}

"use client";

import { useState } from "react";
import { useVigil, type OnchainOrder } from "@/lib/store";
import { BY_MINT, USDC } from "@/lib/tokens";
import { PROOF, hasProof } from "@/lib/proof";
import { usd, shortAddr } from "@/lib/format";
import { Btn, Eyebrow, Panel, Pill } from "./ui";

function describe(o: OnchainOrder): { side: string; text: string; price: number | null } {
  const inStock = BY_MINT[o.inputMint];
  const outStock = BY_MINT[o.outputMint];
  const making = Number(o.makingAmount);
  const taking = Number(o.takingAmount);
  if (inStock && o.outputMint === USDC.mint) {
    const qty = making / 10 ** inStock.decimals;
    const proceeds = taking / 10 ** USDC.decimals;
    const price = qty > 0 ? proceeds / qty : null;
    return { side: "take profit", text: `Sell ${qty.toFixed(2)} ${inStock.symbol} → USDC`, price };
  }
  if (o.inputMint === USDC.mint && outStock) {
    const spend = making / 10 ** USDC.decimals;
    const qty = taking / 10 ** outStock.decimals;
    const price = qty > 0 ? spend / qty : null;
    return { side: "buy the dip", text: `Buy ${outStock.symbol} with $${spend.toFixed(0)} USDC`, price };
  }
  return { side: "order", text: `${o.inputMint.slice(0, 4)} → ${o.outputMint.slice(0, 4)}`, price: null };
}

function OrderRow({ o }: { o: OnchainOrder }) {
  const d = describe(o);
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-medium text-text">{d.text}</span>
          <Pill tone="violet">{d.side}</Pill>
        </div>
        <a
          href={`https://solscan.io/account/${o.orderKey}`}
          target="_blank"
          rel="noreferrer"
          className="mono mt-0.5 inline-block text-[11.5px] text-text-4 hover:text-violet"
        >
          {shortAddr(o.orderKey, 6)} ↗
        </a>
      </div>
      <div className="text-right">
        <Eyebrow>at</Eyebrow>
        <div className="num text-[14px] text-text">{usd(d.price)}</div>
      </div>
    </div>
  );
}

export default function OnchainOrders() {
  const orders = useVigil((s) => s.onchainOrders);
  const address = useVigil((s) => s.address);

  // Public verifier: anyone can paste an address and read its live orders.
  const [addr, setAddr] = useState("");
  const [probe, setProbe] = useState<OnchainOrder[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function verify(target?: string) {
    const a = (target ?? addr).trim();
    if (a.length < 32) {
      setErr("Paste a full Solana address");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/trigger/list?user=${a}`);
      const j = await r.json();
      setProbe((j.orders ?? []) as OnchainOrder[]);
    } catch (e) {
      setErr(String(e));
      setProbe([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      eyebrow="On-chain orders · Jupiter keeper"
      title="Resting on Solana"
      right={<Pill tone="violet">wallet-signed</Pill>}
    >
      {/* Pinned proof: a real on-chain action anyone can verify, no wallet needed */}
      {hasProof() && (
        <div className="border-b border-violet/25 bg-violet/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="dot dot-armed" style={{ background: "var(--violet)" }} />
            <span className="text-[13px] font-semibold text-text">
              {PROOF.order ? "Live order, resting on Solana now" : "A real trade, executed on Solana"}
            </span>
          </div>
          {PROOF.summary && <div className="mt-1 text-[12.5px] text-text-2">{PROOF.summary}</div>}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {PROOF.order ? (
              <>
                <a
                  href={`https://explorer.solana.com/address/${PROOF.order}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mono inline-flex items-center gap-1 rounded border border-violet/40 bg-violet/15 px-2 py-1 text-[12px] text-violet hover:bg-violet/25"
                >
                  View order on Solana Explorer ↗
                </a>
                <a
                  href={`https://solscan.io/account/${PROOF.order}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mono inline-flex items-center gap-1 text-[12px] text-text-4 hover:text-violet"
                >
                  Solscan ↗
                </a>
              </>
            ) : PROOF.tx ? (
              <>
                <a
                  href={`https://explorer.solana.com/tx/${PROOF.tx}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mono inline-flex items-center gap-1 rounded border border-violet/40 bg-violet/15 px-2 py-1 text-[12px] text-violet hover:bg-violet/25"
                >
                  View on Solana Explorer ↗
                </a>
                <a
                  href={`https://solscan.io/tx/${PROOF.tx}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mono inline-flex items-center gap-1 text-[12px] text-text-4 hover:text-violet"
                >
                  Solscan ↗
                </a>
              </>
            ) : null}
          </div>
          {PROOF.maker && (
            <div className="mono mt-1.5 text-[11px] text-text-4">
              wallet {shortAddr(PROOF.maker, 4)} · paste it below to verify
            </div>
          )}
        </div>
      )}

      {/* Connected wallet's own resting orders */}
      {address && orders.length > 0 && (
        <div className="divide-y divide-line">
          {orders.map((o) => (
            <OrderRow key={o.orderKey} o={o} />
          ))}
        </div>
      )}
      {address && orders.length === 0 && !hasProof() && (
        <div className="px-4 py-5 text-[13.5px] text-text-3">
          No resting orders on this wallet. Arm a take profit or buy the dip to place one.
        </div>
      )}
      {!address && !hasProof() && (
        <div className="px-4 py-5 text-[13.5px] leading-relaxed text-text-3">
          Take profit and buy the dip rest on Solana as Jupiter Trigger orders. The keeper fills
          them 24/7, with this tab closed. Verify any wallet&rsquo;s live orders below, or connect to
          place one.
        </div>
      )}

      {/* Public verifier */}
      <div className="border-t border-line px-4 py-3">
        <Eyebrow>Verify any wallet&rsquo;s live orders</Eyebrow>
        <div className="mt-2 flex items-center gap-2">
          <input
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            placeholder="paste a Solana address"
            spellCheck={false}
            className="mono min-w-0 flex-1 rounded-lg border border-line-strong bg-bg-inset px-2.5 py-1.5 text-[13px] text-text outline-none placeholder:text-text-4"
          />
          {address && (
            <Btn size="sm" tone="ghost" onClick={() => { setAddr(address); verify(address); }}>
              mine
            </Btn>
          )}
          <Btn size="sm" tone="violet" disabled={busy} onClick={() => verify()}>
            {busy ? "reading…" : "verify"}
          </Btn>
        </div>
        {err && <div className="mt-1.5 text-[12px] text-danger">{err}</div>}
        {probe !== null && !err && (
          <div className="mt-2 overflow-hidden rounded-lg border border-line">
            {probe.length === 0 ? (
              <div className="px-3 py-2.5 text-[12.5px] text-text-3">
                No live Jupiter trigger orders on this address.
              </div>
            ) : (
              <div className="divide-y divide-line">
                {probe.map((o) => (
                  <OrderRow key={o.orderKey} o={o} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}

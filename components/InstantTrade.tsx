"use client";

import { useState } from "react";
import { useVigil } from "@/lib/store";
import { XSTOCKS } from "@/lib/tokens";
import { usd, num, shortAddr } from "@/lib/format";
import { Btn, Eyebrow, Panel, Pill } from "./ui";

export default function InstantTrade({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (symbol: string) => void;
}) {
  const quote = useVigil((s) => s.quoteBySymbol(selected));
  const portfolio = useVigil((s) => s.portfolio);
  const address = useVigil((s) => s.address);
  const busy = useVigil((s) => s.busy);
  const tradeNow = useVigil((s) => s.tradeNow);
  const lastTrade = useVigil((s) => s.lastTrade);
  const solPrice = useVigil((s) => s.solPrice);

  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [usdc, setUsdc] = useState<number>(5);
  const [sellPct, setSellPct] = useState<number>(50);
  const [payWith, setPayWith] = useState<"USDC" | "SOL">("USDC");
  const solAmt = solPrice ? usdc / solPrice : null;

  const price = quote?.onchainUsd ?? null;
  const pos = portfolio?.positions.find((p) => p.symbol.toUpperCase() === selected.toUpperCase());
  const posQty = pos?.amount ?? 0;
  const posValue = price ? posQty * price : 0;
  const working = busy === `trade-${selected}`;

  // instant estimate from live price; the real quote is fetched at execute
  const buyQty = price ? usdc / price : 0;
  const sellQty = posQty * (sellPct / 100);
  const sellProceeds = sellQty * (price ?? 0);

  const real = !!address && !portfolio?.demo;

  return (
    <Panel
      eyebrow="Trade · real Jupiter swap, settles on Solana"
      title={`Trade ${selected} now`}
      right={<Pill tone={real ? "violet" : "muted"}>{real ? "on-chain" : "demo"}</Pill>}
    >
      <div className="p-4">
        {/* buy / sell toggle */}
        <div className="grid grid-cols-2 gap-1 rounded-lg border border-line-strong bg-bg-inset p-1">
          <button
            onClick={() => setSide("buy")}
            className={`rounded-md py-1.5 text-[13px] font-medium transition-colors ${
              side === "buy" ? "bg-live/20 text-live" : "text-text-3 hover:text-text"
            }`}
          >
            Buy
          </button>
          <button
            onClick={() => setSide("sell")}
            className={`rounded-md py-1.5 text-[13px] font-medium transition-colors ${
              side === "sell" ? "bg-danger/20 text-danger" : "text-text-3 hover:text-text"
            }`}
          >
            Sell
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-lg border border-line bg-bg-sunken px-3 py-2">
          <div className="flex items-center gap-2">
            <select
              value={selected}
              onChange={(e) => onSelect(e.target.value)}
              className="mono rounded-md border border-line-strong bg-bg-inset px-2 py-1 text-[14px] font-semibold text-text outline-none"
              aria-label="Choose stock to trade"
            >
              {XSTOCKS.map((t) => (
                <option key={t.mint} value={t.symbol}>
                  {t.symbol}
                </option>
              ))}
            </select>
            <span className="mono text-[10px] text-text-3">live</span>
          </div>
          <span className="num text-[15px] text-text">{usd(price)}</span>
        </div>

        {side === "buy" ? (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <Eyebrow>Spend</Eyebrow>
              <div className="flex items-center gap-0.5 rounded-md border border-line-strong bg-bg-inset p-0.5">
                {(["USDC", "SOL"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setPayWith(c)}
                    className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                      payWith === c ? "bg-live/20 text-live" : "text-text-3 hover:text-text"
                    }`}
                  >
                    pay with {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-line-strong bg-bg-inset px-2.5 py-1.5">
                <span className="text-text-3">$</span>
                <input
                  type="number"
                  value={usdc}
                  min={1}
                  onChange={(e) => setUsdc(Math.max(0, Number(e.target.value)))}
                  className="num w-20 bg-transparent text-[14px] text-text outline-none"
                />
              </div>
              {[1, 5, 25].map((v) => (
                <Btn key={v} size="sm" tone={usdc === v ? "live" : "default"} onClick={() => setUsdc(v)}>
                  ${v}
                </Btn>
              ))}
            </div>
            <div className="mono mt-2 text-[11.5px] text-text-3">
              ≈ {num(buyQty, 4)} {selected}
              {payWith === "SOL" && solAmt ? ` · from ~${num(solAmt, 4)} SOL` : ""}
            </div>
            <Btn
              tone="live"
              className="mt-3 w-full"
              disabled={working || usdc <= 0}
              onClick={() => tradeNow({ symbol: selected, side: "buy", usdcAmount: usdc, payWith })}
            >
              {working ? "check your wallet…" : `Buy ${selected} with ${payWith}`}
            </Btn>
          </div>
        ) : (
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <Eyebrow>Sell {selected}</Eyebrow>
              <span className="mono text-[11px] text-text-3">
                hold {num(posQty, 3)} · {usd(posValue)}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              {[25, 50, 100].map((v) => (
                <Btn key={v} size="sm" tone={sellPct === v ? "danger" : "default"} onClick={() => setSellPct(v)}>
                  {v}%
                </Btn>
              ))}
            </div>
            <div className="mono mt-2 text-[11.5px] text-text-3">
              sell {num(sellQty, 4)} {selected} ≈ {usd(sellProceeds)}
            </div>
            <Btn
              tone="danger"
              className="mt-3 w-full"
              disabled={working || posQty <= 0}
              onClick={() => tradeNow({ symbol: selected, side: "sell", sellPct })}
            >
              {working ? "check your wallet…" :posQty <= 0 ? `No ${selected} to sell` : `Sell ${sellPct}% now`}
            </Btn>
          </div>
        )}

        {lastTrade && lastTrade.symbol.toUpperCase() === selected.toUpperCase() && (
          <div
            className={`mt-3 rounded-lg border p-3 ${
              lastTrade.ok ? "border-live/40 bg-live/5" : "border-danger/45 bg-danger/10"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`text-[14px] ${lastTrade.ok ? "text-live" : "text-danger"}`}>
                {lastTrade.ok ? "✓" : "✕"}
              </span>
              <span className="text-[13px] font-semibold text-text">{lastTrade.text}</span>
            </div>
            {lastTrade.sub && (
              <div className="mt-1 text-[11.5px] leading-snug text-text-3">{lastTrade.sub}</div>
            )}
            {lastTrade.sig ? (
              <a
                href={`https://explorer.solana.com/tx/${lastTrade.sig}`}
                target="_blank"
                rel="noreferrer"
                className="mono mt-2 inline-flex items-center gap-1 rounded border border-violet/40 bg-violet/10 px-2 py-1 text-[11px] text-violet hover:bg-violet/20"
              >
                View on Solana Explorer ↗ {shortAddr(lastTrade.sig, 4)}
              </a>
            ) : (
              !lastTrade.ok && (
                <div className="mt-1.5 text-[11px] text-text-4">Nothing was sent. Fix the above and try again.</div>
              )
            )}
          </div>
        )}

        <div className="mt-3 text-[11px] leading-relaxed text-text-3">
          {real ? (
            <>Routed by Jupiter, signed by your wallet. Pay with USDC or SOL. Keep a little SOL in the wallet for the network fee either way.</>
          ) : (
            <>Demo fill on live prices. Connect a wallet to trade for real, any hour, even with NYSE closed.</>
          )}
        </div>
      </div>
    </Panel>
  );
}

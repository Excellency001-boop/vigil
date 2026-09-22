"use client";

import { useEffect, useState } from "react";
import { useVigil } from "@/lib/store";
import { usd, pct, compact, feedShort } from "@/lib/format";
import { Btn, Dot, Eyebrow, Panel, Pill, TickerLogo } from "./ui";

export default function Watchlist({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (symbol: string) => void;
}) {
  const quotes = useVigil((s) => s.quotes);
  const loading = useVigil((s) => s.loading);
  const rules = useVigil((s) => s.rules);
  const drill = useVigil((s) => s.drill);
  const effectivePrice = useVigil((s) => s.effectivePrice);

  // local heartbeat so the drilled row visibly moves
  const [, force] = useState(0);
  useEffect(() => {
    if (!drill) return;
    const t = setInterval(() => force((n) => n + 1), 250);
    return () => clearInterval(t);
  }, [drill]);

  const guarded = new Set(
    rules
      .filter((r) => r.status === "armed" && (r.kind === "stop_loss" || r.kind === "trailing_stop"))
      .map((r) => r.symbol.toUpperCase()),
  );

  return (
    <Panel
      eyebrow="Live universe · Pyth feeds + Jupiter routing"
      title="Tokenized stocks"
      right={<Pill tone="live">24/7 live</Pill>}
    >
      <div className="hidden grid-cols-[1.4fr_1fr_1fr_0.8fr_auto] gap-3 px-4 py-2 hair-b sm:grid">
        <Eyebrow>Asset</Eyebrow>
        <Eyebrow>On-chain</Eyebrow>
        <Eyebrow>vs equity</Eyebrow>
        <Eyebrow>24h</Eyebrow>
        <Eyebrow className="text-right">Watch</Eyebrow>
      </div>

      <div className="max-h-[360px] overflow-y-auto divide-y divide-line">
        {loading && quotes.length === 0 && (
          <div className="px-4 py-8 text-center text-[13px] text-text-3">Loading live feeds…</div>
        )}
        {quotes.map((q) => {
          const up = (q.change24hPct ?? 0) >= 0;
          const prem = q.basisPct ?? 0;
          const sym = q.symbol.toUpperCase();
          const isSel = sym === selected.toUpperCase();
          const isGuarded = guarded.has(sym);
          const drilled = drill?.symbol.toUpperCase() === sym;
          const price = drilled ? effectivePrice(q.symbol) : q.onchainUsd;
          const flash = drilled ? (drill!.targetPct < 0 ? "price-flash-down" : "price-flash-up") : "";
          return (
            <div
              key={q.mint}
              className={`grid grid-cols-2 items-center gap-3 px-4 py-3 sm:grid-cols-[1.4fr_1fr_1fr_0.8fr_auto] ${
                isSel ? "bg-live/5" : ""
              }`}
            >
              <div className="flex items-center gap-2.5">
                <TickerLogo under={q.under} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13.5px] font-semibold text-text">{q.symbol}</span>
                    {isGuarded && (
                      <span title="guarded by Vigil">
                        <Dot state="live" />
                      </span>
                    )}
                  </div>
                  <div className="truncate text-[11px] text-text-3">{q.name}</div>
                </div>
              </div>

              <div>
                <div className={`num text-[13.5px] text-text ${flash}`}>{usd(price)}</div>
                <div className="mono text-[10px] text-text-4">{feedShort(q.pythCrypto)}</div>
              </div>

              <div>
                <div className="num text-[12.5px] text-text-2">{usd(q.equityUsd)}</div>
                <div
                  className={`num text-[11px] ${
                    Math.abs(prem) < 0.05 ? "text-text-3" : prem >= 0 ? "tick-up" : "tick-down"
                  }`}
                >
                  {prem >= 0 ? "prem " : "disc "}
                  {pct(prem)}
                </div>
              </div>

              <div className={`num text-[13px] ${up ? "tick-up" : "tick-down"}`}>{pct(q.change24hPct)}</div>

              <div className="col-span-2 flex items-center justify-end gap-2 sm:col-span-1">
                <span className="mono hidden text-[10px] text-text-4 md:inline">
                  liq {compact(q.liquidityUsd)}
                </span>
                <Btn size="sm" tone={isSel ? "live" : "default"} onClick={() => onSelect(q.symbol)}>
                  {isSel ? "selected" : "arm"}
                </Btn>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

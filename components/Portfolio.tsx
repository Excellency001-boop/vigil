"use client";

import { useVigil } from "@/lib/store";
import { usd, pct } from "@/lib/format";
import { Eyebrow, Panel, Pill, TickerLogo } from "./ui";

export default function Portfolio() {
  const portfolio = useVigil((s) => s.portfolio);
  const rules = useVigil((s) => s.rules);
  const protectedTotal = useVigil((s) => s.protectedTotal);

  const guardedSymbols = new Set(
    rules
      .filter((r) => r.status === "armed" && (r.kind === "stop_loss" || r.kind === "trailing_stop"))
      .map((r) => r.symbol.toUpperCase()),
  );

  const positions = (portfolio?.positions ?? []).filter((p) => p.amount > 0.0001);
  const stockValue = positions.reduce((s, p) => s + (p.valueUsd ?? 0), 0);
  const guardedValue = positions
    .filter((p) => guardedSymbols.has(p.symbol.toUpperCase()))
    .reduce((s, p) => s + (p.valueUsd ?? 0), 0);
  const coverage = stockValue > 0 ? (guardedValue / stockValue) * 100 : 0;

  return (
    <Panel
      eyebrow={portfolio?.demo ? "Portfolio · demo wallet" : "Portfolio · live wallet"}
      title="Holdings"
      right={
        <div className="text-right">
          <Eyebrow>Total value</Eyebrow>
          <div className="num text-xl font-semibold text-text">{usd(portfolio?.totalUsd)}</div>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-px bg-line hair-b">
        <div className="bg-bg-raised px-4 py-3">
          <Eyebrow>Cash · USDC</Eyebrow>
          <div className="num mt-0.5 text-[15px] text-text">{usd(portfolio?.usdc)}</div>
        </div>
        <div className="bg-bg-raised px-4 py-3">
          <Eyebrow>Guarded by Vigil</Eyebrow>
          <div className="num mt-0.5 text-[15px] text-live">
            {coverage.toFixed(0)}% <span className="text-text-3 text-[13px]">of equity</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-inset">
            <div
              className="h-full rounded-full bg-live transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, coverage))}%` }}
            />
          </div>
        </div>
      </div>

      {protectedTotal > 0 && (
        <div className="flex items-center justify-between gap-2 border-b border-live/20 bg-live/5 px-4 py-2.5">
          <Eyebrow>Capital Vigil has protected</Eyebrow>
          <span
            className="num text-[17px] font-bold text-live"
            style={{ textShadow: "0 0 18px rgba(53,224,161,0.35)" }}
          >
            {usd(protectedTotal)}
          </span>
        </div>
      )}

      <div className="divide-y divide-line">
        {positions.length === 0 && (
          <div className="px-4 py-8 text-center text-[14px] text-text-3">
            No xStock holdings found. Load the demo wallet to explore.
          </div>
        )}
        {positions.map((p) => {
          const guarded = guardedSymbols.has(p.symbol.toUpperCase());
          const up = (p.change24hPct ?? 0) >= 0;
          return (
            <div key={p.mint} className="flex items-center gap-3 px-4 py-3">
              <TickerLogo under={p.name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-text">{p.symbol}</span>
                  {guarded ? (
                    <Pill tone="live">guarded</Pill>
                  ) : (
                    <Pill tone="danger">exposed</Pill>
                  )}
                </div>
                <div className="num mt-0.5 text-[12.5px] text-text-3">
                  {p.amount.toLocaleString("en-US", { maximumFractionDigits: 3 })} @ {usd(p.onchainUsd)}
                </div>
              </div>
              <div className="text-right">
                <div className="num text-[14px] text-text">{usd(p.valueUsd)}</div>
                <div className={`num text-[12.5px] ${up ? "tick-up" : "tick-down"}`}>
                  {pct(p.change24hPct)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

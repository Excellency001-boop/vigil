"use client";

import { useEffect, useState } from "react";
import { useVigil } from "@/lib/store";
import { countdown, feedShort } from "@/lib/format";
import { Eyebrow, Pill } from "./ui";
import MarketDial from "./MarketDial";

// NYSE regular session is 6.5h x 5 days = 32.5h of 168h in a week.
const CLOSED_PCT = Math.round(((168 - 32.5) / 168) * 100); // 81

export default function MarketClock() {
  const clock = useVigil((s) => s.clock);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const nyseOpen = clock?.nyseOpen ?? false;
  const secsToOpen = clock?.nextOpen ? Math.max(0, clock.nextOpen - now) : null;
  const secsToClose = clock?.nextClose ? Math.max(0, clock.nextClose - now) : null;

  return (
    <div className="panel relative overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[1.15fr_1fr]">
        {/* Left: the thesis + the number that matters */}
        <div className="p-6 sm:p-8 lg:border-r border-line">
          <Eyebrow>Market clock · source: Pyth Network</Eyebrow>
          <h1 className="mt-3 text-[26px] sm:text-[32px] font-semibold leading-[1.12] tracking-tight text-text">
            Wall Street closes.
            <br />
            <span className="text-live">Your xStocks don&rsquo;t.</span>
          </h1>
          <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-text-2">
            A stop-loss on a real share dies at the closing bell. The tokenized version keeps
            trading all night on Solana. Vigil holds the trigger the whole time your broker is
            dark.
          </p>

          <p className="mt-4 max-w-md border-l-2 border-live/50 pl-3 text-[14.5px] font-medium leading-snug text-text">
            A stop-loss that only works while the market is open is not a stop-loss. It is a{" "}
            <span className="text-live">suggestion</span>.
          </p>

          <div className="mt-6 rounded-xl border border-line-strong bg-bg-sunken p-4">
            {nyseOpen ? (
              <>
                <Eyebrow>NYSE closes in</Eyebrow>
                <div className="num mt-1 text-4xl font-semibold text-amber">
                  {countdown(secsToClose)}
                </div>
                <div className="mt-1 text-[14px] text-text-2">
                  After the bell, nothing on Wall Street watches your position until it reopens.
                  Vigil does.
                </div>
              </>
            ) : (
              <>
                <Eyebrow>Unprotected in TradFi for</Eyebrow>
                <div className="num mt-1 text-4xl font-semibold text-amber">
                  {countdown(secsToOpen)}
                </div>
                <div className="mt-1 text-[14px] text-text-2">
                  until the bell. Your broker cannot touch your position. Vigil can, right now.
                </div>
              </>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px] text-text-3">
            <Pill tone="sleep">NYSE dark {CLOSED_PCT}% of the week</Pill>
            <Pill tone="live">xStocks trade 168h/week</Pill>
            {clock?.equityFeed && (
              <Pill tone="muted">clock feed {feedShort(clock.equityFeed)}</Pill>
            )}
          </div>
        </div>

        {/* Right: the signature market-clock dial */}
        <div className="flex items-center justify-center p-6 sm:p-8">
          <MarketDial />
        </div>
      </div>
    </div>
  );
}

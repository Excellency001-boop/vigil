"use client";

import { useEffect, useState } from "react";
import { Buffer } from "buffer";
import { useVigil } from "@/lib/store";
import TopBar from "./TopBar";
import MarketClock from "./MarketClock";
import NightWatch from "./NightWatch";
import Portfolio from "./Portfolio";
import Watchlist from "./Watchlist";
import InstantTrade from "./InstantTrade";
import Autopilot from "./Autopilot";
import Drill from "./Drill";
import ExecutionLog from "./ExecutionLog";
import OnchainOrders from "./OnchainOrders";
import RealityCheck from "./RealityCheck";
import Footer from "./Footer";

// @solana/web3.js reaches for Buffer when (de)serializing transactions. Next
// does not polyfill it in the browser, so make it global before any signing.
if (typeof window !== "undefined") {
  const w = window as unknown as { Buffer?: typeof Buffer };
  if (!w.Buffer) w.Buffer = Buffer;
}

export default function Terminal() {
  const init = useVigil((s) => s.init);
  const refreshClock = useVigil((s) => s.refreshClock);
  const refreshQuotes = useVigil((s) => s.refreshQuotes);
  const refreshPortfolio = useVigil((s) => s.refreshPortfolio);
  const refreshOrders = useVigil((s) => s.refreshOrders);
  const tick = useVigil((s) => s.tick);
  const [selected, setSelected] = useState("NVDAx");

  useEffect(() => {
    init();
    const c = setInterval(refreshClock, 20_000);
    const q = setInterval(refreshQuotes, 10_000);
    const p = setInterval(refreshPortfolio, 30_000);
    const o = setInterval(refreshOrders, 25_000);
    const t = setInterval(tick, 600); // fast heartbeat so drills feel instant
    return () => {
      clearInterval(c);
      clearInterval(q);
      clearInterval(p);
      clearInterval(o);
      clearInterval(t);
    };
    // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-5 sm:px-6">
        <MarketClock />

        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          <div className="flex flex-col gap-4 lg:col-span-7">
            <Portfolio />
            <Watchlist selected={selected} onSelect={setSelected} />
            <InstantTrade selected={selected} onSelect={setSelected} />
            <OnchainOrders />
          </div>
          <div className="flex flex-col gap-4 lg:col-span-5">
            <NightWatch />
            <Autopilot selected={selected} />
            <Drill selected={selected} />
            <ExecutionLog />
          </div>
        </div>

        <div className="mt-4">
          <RealityCheck />
        </div>
      </main>
      <Footer />
    </>
  );
}

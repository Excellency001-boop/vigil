"use client";

import { useEffect, useState } from "react";
import { useVigil } from "@/lib/store";
import { countdown } from "@/lib/format";
import { Dot, Eyebrow } from "./ui";

// The mode that makes Vigil purpose-built. Rules only stand watch during the
// hours a broker cannot: overnight and all weekend. When the bell rings, they
// stand down. When it closes, they wake on their own.
export default function NightWatch() {
  const nightWatch = useVigil((s) => s.nightWatch);
  const toggle = useVigil((s) => s.toggleNightWatch);
  const clock = useVigil((s) => s.clock);
  const rules = useVigil((s) => s.rules);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const nyseOpen = clock?.nyseOpen ?? false;
  const secsToClose = clock?.nextClose ? Math.max(0, clock.nextClose - now) : null;
  const secsToOpen = clock?.nextOpen ? Math.max(0, clock.nextOpen - now) : null;
  const governed = rules.filter((r) => r.status === "armed").length;

  // Three states: off, on+active (NYSE dark), on+dormant (NYSE open).
  const active = nightWatch && !nyseOpen;
  const dormant = nightWatch && nyseOpen;

  return (
    <section
      className={`panel overflow-hidden ${active ? "border-live/40" : dormant ? "border-amber/30" : ""}`}
      style={
        active
          ? { boxShadow: "inset 0 0 0 1px rgba(53,224,161,0.20), 0 0 34px -10px rgba(53,224,161,0.45)" }
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 hair-b">
        <div>
          <Eyebrow>Night Watch</Eyebrow>
          <div className="mt-0.5 text-[15px] font-semibold text-text">Arm only while NYSE is closed</div>
        </div>
        <Switch on={nightWatch} onClick={toggle} />
      </div>

      <div className="px-4 py-3">
        {!nightWatch ? (
          <div className="flex items-center gap-2 text-[12.5px] text-text-3">
            <Dot state="live" />
            Rules run around the clock. Flip this to have them stand watch only during the hours a
            broker is dark.
          </div>
        ) : active ? (
          <div className="sweep relative overflow-hidden">
            <div className="flex items-center gap-2">
              <Dot state="live" />
              <span className="text-[14px] font-semibold text-live">
                Night Watch active. Rules are live.
              </span>
            </div>
            <div className="mono mt-1.5 text-[11.5px] text-text-3">
              NYSE is dark · {governed} rule{governed === 1 ? "" : "s"} on watch · stands down when it
              reopens in {countdown(secsToOpen)}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2">
              <Dot state="sleep" />
              <span className="num text-[15px] font-semibold text-amber">DORMANT</span>
              <span className="text-[12.5px] text-text-2">NYSE is open. Rules are standing down.</span>
            </div>
            <div className="mono mt-1.5 text-[11.5px] text-text-3">
              wakes when NYSE closes in {countdown(secsToClose)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className={`relative h-6 w-11 flex-none rounded-full border transition-colors ${
        on ? "border-live/50 bg-live/25" : "border-line-strong bg-bg-inset"
      }`}
    >
      <span
        className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-all ${
          on ? "left-6 bg-live" : "left-1 bg-text-3"
        }`}
      />
    </button>
  );
}

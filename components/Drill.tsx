"use client";

import { useVigil } from "@/lib/store";
import { usd } from "@/lib/format";
import { Btn, Eyebrow, Panel, Pill } from "./ui";

// A controlled shock so anyone can watch the guards fire on demand, without
// waiting for a real market move. The price path is simulated; the guards
// evaluating it are the real ones. Clearly labelled.
export default function Drill({ selected }: { selected: string }) {
  const startDrill = useVigil((s) => s.startDrill);
  const stopDrill = useVigil((s) => s.stopDrill);
  const resetDemo = useVigil((s) => s.resetDemo);
  const viewingDemo = useVigil((s) => s.portfolio?.demo ?? false);
  const drill = useVigil((s) => s.drill);
  const rules = useVigil((s) => s.rules);
  const nightWatch = useVigil((s) => s.nightWatch);
  const clock = useVigil((s) => s.clock);
  const event = useVigil((s) => s.lastGuardEvent);
  const armedWatch = rules.some(
    (r) => r.status === "armed" && (r.kind === "stop_loss" || r.kind === "trailing_stop"),
  );
  const dormant = nightWatch && (clock?.nyseOpen ?? false);

  return (
    <Panel
      eyebrow="Stress test · same engine, injected price path"
      title="Fire drill"
      right={drill ? <Pill tone="danger">drill live · {drill.symbol}</Pill> : <Pill tone="muted">idle</Pill>}
    >
      <div className="p-4">
        <p className="text-[13.5px] leading-relaxed text-text-2">
          Your armed guards already read the live feed every second. This pushes a controlled price
          path through the <span className="font-semibold text-text">exact same engine</span>, so you
          can see the response now instead of waiting for a real move on{" "}
          <span className="font-semibold text-text">{selected}</span>. Reset restores live feeds.
        </p>

        {dormant && (
          <p className="mt-2 text-[12.5px] text-amber">
            Night Watch is dormant while NYSE is open, so watch rules are standing down. Turn it off
            to drill right now.
          </p>
        )}
        {!dormant && !armedWatch && (
          <p className="mt-2 text-[12.5px] text-amber">
            Arm a stop loss or trailing stop first, then the drill has something to trip.
          </p>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Btn tone="danger" onClick={() => startDrill(selected, -12, 5)}>
            Crash &minus;12%
          </Btn>
          <Btn tone="danger" onClick={() => startDrill(selected, -25, 6)}>
            Crash &minus;25%
          </Btn>
          <Btn tone="live" onClick={() => startDrill(selected, 15, 5)}>
            Spike +15%
          </Btn>
          <Btn tone="default" onClick={() => stopDrill()}>
            Reset to live feeds
          </Btn>
        </div>

        {event && <PreservedCard />}

        {viewingDemo && (
          <button
            onClick={() => resetDemo()}
            className="mt-3 w-full text-[12.5px] text-text-3 hover:text-text"
          >
            reset demo book &amp; clear rules
          </button>
        )}
      </div>
    </Panel>
  );
}

function PreservedCard() {
  const e = useVigil((s) => s.lastGuardEvent);
  const protectedTotal = useVigil((s) => s.protectedTotal);
  if (!e) return null;
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-live/40 bg-live/5">
      <div className="flex items-center justify-between px-3.5 py-2.5 hair-b border-live/20">
        <div className="flex items-center gap-2">
          <span className="dot dot-live" />
          <span className="text-[14px] font-semibold text-text">Guard fired · {e.symbol}</span>
        </div>
        <span className="mono text-[11.5px] text-text-3">
          {new Date(e.at).toLocaleTimeString("en-US", { hour12: false })}
        </span>
      </div>
      <div className="px-3.5 py-3">
        <div className="grid grid-cols-2 gap-y-2 text-[13px]">
          <span className="text-text-3">Sold</span>
          <span className="num text-right text-text">
            {e.soldQty.toFixed(2)} {e.symbol} @ {usd(e.soldAt)}
          </span>
          <span className="text-text-3">Held to the low</span>
          <span className="num text-right text-danger">&minus;{usd(e.wouldLose)}</span>
          <span className="text-text-3">Vigil locked in</span>
          <span className="num text-right text-text">{usd(e.proceeds)}</span>
        </div>
        <div className="mt-3 border-t border-live/20 pt-3 text-center">
          <Eyebrow>Capital preserved</Eyebrow>
          <div
            className="num mt-1 text-[34px] font-bold leading-none text-live"
            style={{ textShadow: "0 0 26px rgba(53,224,161,0.45)" }}
          >
            {usd(e.preserved)}
          </div>
          {protectedTotal > e.preserved + 0.01 && (
            <div className="mono mt-1.5 text-[12px] text-text-3">
              protected this session · <span className="text-live">{usd(protectedTotal)}</span>
            </div>
          )}
        </div>
        {!e.nyseOpen && (
          <p className="mt-2.5 text-center text-[12.5px] leading-snug text-text-3">
            NYSE was closed. A broker stop could not have fired. Vigil did.
          </p>
        )}
      </div>
    </div>
  );
}

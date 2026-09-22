"use client";

import { useEffect, useState } from "react";
import { useVigil } from "@/lib/store";
import { countdown } from "@/lib/format";

// The signature instrument: one trading week as a ring. Solana lights the whole
// circle because xStocks never stop. NYSE is only the five short amber arcs.
// The sweeping marker is now. The dark majority of the ring is exactly the time
// your broker is asleep and only Vigil is watching.

const DAY = 360 / 7;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function arcPath(cx: number, cy: number, r: number, s: number, e: number): string {
  const [x1, y1] = polar(cx, cy, r, s);
  const [x2, y2] = polar(cx, cy, r, e);
  const large = ((e - s + 360) % 360) > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

// Current time in New York, as a position within the week.
function etNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const val = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const idx = Math.max(0, WEEKDAYS.indexOf(val("weekday")));
  let h = parseInt(val("hour"), 10);
  if (h === 24) h = 0;
  const m = parseInt(val("minute"), 10) || 0;
  const s = parseInt(val("second"), 10) || 0;
  return idx * 24 + h + m / 60 + s / 3600; // hours into the week
}

export default function MarketDial() {
  const clock = useVigil((s) => s.clock);
  // Start from stable, non-time values so the server and first client render
  // match. Real time is filled in after mount, avoiding a hydration mismatch.
  const [now, setNow] = useState(0);
  const [weekHours, setWeekHours] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const tick = () => {
      setNow(Math.floor(Date.now() / 1000));
      setWeekHours(etNow());
    };
    tick();
    setMounted(true);
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const nyseOpen = clock?.nyseOpen ?? false;
  const secsToOpen = clock?.nextOpen ? Math.max(0, clock.nextOpen - now) : null;
  const secsToClose = clock?.nextClose ? Math.max(0, clock.nextClose - now) : null;

  const cx = 100,
    cy = 100,
    r = 80;
  const nowAngle = (weekHours / 168) * 360;

  // NYSE regular session Mon..Fri, 9:30 to 16:00 ET
  const arcs = [1, 2, 3, 4, 5].map((d) => ({
    start: d * DAY + (9.5 / 24) * DAY,
    end: d * DAY + (16 / 24) * DAY,
  }));

  const [mx, my] = polar(cx, cy, r, nowAngle);
  const [mxi, myi] = polar(cx, cy, r - 17, nowAngle);
  const markColor = nyseOpen ? "var(--amber)" : "var(--live)";

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative">
        <svg viewBox="0 0 200 200" className="h-[196px] w-[196px]">
          {/* groove */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--line)" strokeWidth="13" />
          {/* Solana: the whole week is lit */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--live)" strokeWidth="13" opacity="0.24" />
          {/* NYSE: the only hours a broker is awake */}
          {arcs.map((a, i) => (
            <path
              key={i}
              d={arcPath(cx, cy, r, a.start, a.end)}
              fill="none"
              stroke="var(--amber)"
              strokeWidth="13"
              strokeLinecap="butt"
            />
          ))}
          {/* thin bright Solana keyline so the full ring always reads */}
          <circle cx={cx} cy={cy} r={r + 8} fill="none" stroke="var(--live)" strokeWidth="1" opacity="0.35" />
          {/* now marker (client-only, once mounted, to avoid hydration drift) */}
          {mounted && (
            <>
              <line x1={mxi} y1={myi} x2={mx} y2={my} stroke={markColor} strokeWidth="2" />
              <circle cx={mx} cy={my} r="5" fill={markColor} stroke="#04160f" strokeWidth="1.5" />
            </>
          )}
        </svg>

        {/* center readout */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="eyebrow">{nyseOpen ? "NYSE open" : "NYSE dark"}</div>
          {nyseOpen ? (
            <>
              <div className="num text-[14px] font-semibold text-amber">{countdown(secsToClose)}</div>
              <div className="mono text-[10px] text-text-3">to the bell</div>
            </>
          ) : (
            <>
              <div className="num text-[15px] font-semibold text-text">{countdown(secsToOpen)}</div>
              <div className="mono text-[10px] text-text-3">to reopen</div>
            </>
          )}
          <div className="mono mt-1.5 flex items-center gap-1 text-[10px] text-live">
            <span className="dot dot-live" style={{ width: 5, height: 5 }} />
            Solana 24/7
          </div>
        </div>
      </div>

      {/* legend */}
      <div className="mt-3 flex items-center gap-4 text-[11.5px] text-text-3">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "var(--live)", opacity: 0.5 }} />
          xStocks trade all week
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-3 rounded-sm" style={{ background: "var(--amber)" }} />
          NYSE open hours
        </span>
      </div>
      <div className="mono mt-1 text-[10px] text-text-4">Pyth market hours · regular session shown</div>
    </div>
  );
}

"use client";

import { useVigil, type LogEvent } from "@/lib/store";
import { shortAddr } from "@/lib/format";
import { Eyebrow, Panel, Pill } from "./ui";

const LEVEL_COLOR: Record<string, string> = {
  info: "text-text-3",
  arm: "text-amber",
  fire: "text-danger",
  fill: "text-live",
  chain: "text-violet",
  warn: "text-amber",
};

function clock(at: number): string {
  const d = new Date(at);
  return d.toLocaleTimeString("en-US", { hour12: false });
}

export default function ExecutionLog() {
  const events = useVigil((s) => s.events);
  return (
    <Panel
      eyebrow="Execution log · timestamped, on the record"
      title="Flight recorder"
      right={<Pill tone="live">live</Pill>}
    >
      <div className="max-h-[320px] overflow-y-auto">
        {events.length === 0 && (
          <div className="px-4 py-8 text-center text-[14px] text-text-3">
            Nothing logged yet. Arm a rule, or run a fire drill.
          </div>
        )}
        <div className="divide-y divide-line">
          {events.map((e, i) => (
            <Row key={e.id} e={e} isNew={i === 0} />
          ))}
        </div>
      </div>
    </Panel>
  );
}

function Row({ e, isNew }: { e: LogEvent; isNew?: boolean }) {
  return (
    <div className={`flex items-start gap-3 px-4 py-2.5 ${isNew ? "log-new" : ""}`}>
      <span className="mono mt-0.5 text-[11.5px] text-text-4 tabular-nums">{clock(e.at)}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-[13.5px] font-medium ${LEVEL_COLOR[e.level] ?? "text-text"}`}>
            {e.text}
          </span>
          {e.level === "chain" || e.real ? (
            <Pill tone="violet">on-chain</Pill>
          ) : e.level === "fill" ? (
            <Pill tone="muted">sim</Pill>
          ) : null}
        </div>
        {e.sub && <div className="mt-0.5 text-[12.5px] leading-snug text-text-3">{e.sub}</div>}
        {(e.sig || e.account) && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {e.sig && (
              <a
                href={`https://solscan.io/tx/${e.sig}`}
                target="_blank"
                rel="noreferrer"
                className="mono inline-flex items-center gap-1 rounded border border-violet/30 bg-violet/10 px-1.5 py-0.5 text-[11.5px] text-violet hover:bg-violet/20"
              >
                View on Solscan ↗
              </a>
            )}
            {e.account && (
              <a
                href={`https://solscan.io/account/${e.account}`}
                target="_blank"
                rel="noreferrer"
                className="mono inline-flex items-center gap-1 text-[11.5px] text-text-4 hover:text-violet"
              >
                order {shortAddr(e.account, 4)} ↗
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

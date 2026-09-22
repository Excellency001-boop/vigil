"use client";

import { useEffect, useMemo, useState } from "react";
import { useVigil } from "@/lib/store";
import type { RuleKind } from "@/lib/types";
import { evalRule, KIND_LABEL, trailingTrigger } from "@/lib/rules";
import { usd, pct, shortAddr } from "@/lib/format";
import { Btn, Eyebrow, Panel, Pill } from "./ui";

const KINDS: { kind: RuleKind; label: string; rail: "onchain" | "watch"; blurb: string }[] = [
  { kind: "stop_loss", label: "Stop loss", rail: "watch", blurb: "Sell if it falls to a floor" },
  { kind: "take_profit", label: "Take profit", rail: "onchain", blurb: "Sell if it rises to a target" },
  { kind: "trailing_stop", label: "Trailing stop", rail: "watch", blurb: "Sell on a drop from the peak" },
  { kind: "buy_dip", label: "Buy the dip", rail: "onchain", blurb: "Buy if it falls to a level" },
];

export default function Autopilot({ selected }: { selected: string }) {
  const quote = useVigil((s) => s.quoteBySymbol(selected));
  const addRule = useVigil((s) => s.addRule);
  const armOnchain = useVigil((s) => s.armOnchain);
  const address = useVigil((s) => s.address);
  const delegations = useVigil((s) => s.delegations);
  const grantHandsFree = useVigil((s) => s.grantHandsFree);
  const revokeHandsFree = useVigil((s) => s.revokeHandsFree);
  const busy = useVigil((s) => s.busy);
  const solPrice = useVigil((s) => s.solPrice);
  const lastTrade = useVigil((s) => s.lastTrade);
  const price = quote?.onchainUsd ?? null;
  const delegated = delegations.includes(selected.toUpperCase());

  const [kind, setKind] = useState<RuleKind>("stop_loss");
  const [trigger, setTrigger] = useState<number>(0);
  const [sizePct, setSizePct] = useState<number>(100);
  const [usdcAmount, setUsdcAmount] = useState<number>(6);
  const [trailPct, setTrailPct] = useState<number>(8);
  const [payWith, setPayWith] = useState<"USDC" | "SOL">("USDC");
  const solAmt = solPrice ? usdcAmount / solPrice : null;

  const rail = KINDS.find((k) => k.kind === kind)!.rail;

  // Prefill sensible defaults whenever the asset or rule type changes.
  useEffect(() => {
    if (!price) return;
    if (kind === "stop_loss") setTrigger(round(price * 0.92));
    else if (kind === "take_profit") setTrigger(round(price * 1.12));
    else if (kind === "buy_dip") setTrigger(round(price * 0.9));
    if (kind === "take_profit") setSizePct(50);
    else if (kind === "stop_loss") setSizePct(100);
  }, [selected, kind, price]);

  const triggerDeltaPct = price && trigger ? ((trigger - price) / price) * 100 : 0;

  function submit() {
    const base = { symbol: selected, kind };
    if (kind === "stop_loss" || kind === "take_profit") {
      const r = addRule({ ...base, triggerUsd: trigger, sizePct });
      if (rail === "onchain" && address) armOnchain(r.id);
    } else if (kind === "trailing_stop") {
      addRule({ ...base, trailPct, sizePct });
    } else if (kind === "buy_dip") {
      const r = addRule({ ...base, triggerUsd: trigger, usdcAmount });
      if (address) armOnchain(r.id, payWith);
    }
  }

  return (
    <Panel eyebrow="Autopilot · set a rule once, Vigil holds the watch" title={`Arm a rule on ${selected}`}>
      <div className="p-4">
        {/* rule type */}
        <div className="grid grid-cols-2 gap-2">
          {KINDS.map((k) => (
            <button
              key={k.kind}
              onClick={() => setKind(k.kind)}
              className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                kind === k.kind
                  ? "border-live/50 bg-live/10"
                  : "border-line-strong bg-bg-inset hover:border-text-4"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-semibold text-text">{k.label}</span>
                <Pill tone={k.rail === "onchain" ? "violet" : "amber"}>
                  {k.rail === "onchain" ? "on-chain" : "watch"}
                </Pill>
              </div>
              <div className="mt-0.5 text-[12px] text-text-3">{k.blurb}</div>
            </button>
          ))}
        </div>

        {/* live reference */}
        <div className="mt-4 flex items-center justify-between rounded-lg border border-line bg-bg-sunken px-3 py-2">
          <Eyebrow>{selected} live</Eyebrow>
          <span className="num text-[15px] text-text">{usd(price)}</span>
        </div>

        {/* inputs by kind */}
        <div className="mt-4 space-y-3">
          {(kind === "stop_loss" || kind === "take_profit" || kind === "buy_dip") && (
            <Field label={kind === "buy_dip" ? "Buy when price ≤" : kind === "stop_loss" ? "Sell when price ≤" : "Sell when price ≥"}>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-lg border border-line-strong bg-bg-inset px-2.5 py-1.5">
                  <span className="text-text-3">$</span>
                  <input
                    type="number"
                    value={trigger}
                    onChange={(e) => setTrigger(Number(e.target.value))}
                    className="num w-24 bg-transparent text-[14px] text-text outline-none"
                  />
                </div>
                <Pill tone={triggerDeltaPct >= 0 ? "live" : "danger"}>{pct(triggerDeltaPct)} from live</Pill>
              </div>
            </Field>
          )}

          {kind === "trailing_stop" && (
            <Field label="Trail distance below peak">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={2}
                  max={25}
                  value={trailPct}
                  onChange={(e) => setTrailPct(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="num w-16 text-right text-[14px] text-text">{trailPct}%</span>
              </div>
              <div className="mono mt-1 text-[12px] text-text-3">
                peak {usd(price)} → sells near {usd(price ? price * (1 - trailPct / 100) : null)}
              </div>
            </Field>
          )}

          {(kind === "stop_loss" || kind === "take_profit" || kind === "trailing_stop") && (
            <Field label="Sell how much of the position">
              <div className="flex items-center gap-2">
                {[25, 50, 100].map((v) => (
                  <Btn key={v} size="sm" tone={sizePct === v ? "live" : "default"} onClick={() => setSizePct(v)}>
                    {v}%
                  </Btn>
                ))}
              </div>
            </Field>
          )}

          {kind === "buy_dip" && (
            <Field label="Spend">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-lg border border-line-strong bg-bg-inset px-2.5 py-1.5">
                  <span className="text-text-3">$</span>
                  <input
                    type="number"
                    value={usdcAmount}
                    min={5}
                    onChange={(e) => setUsdcAmount(Number(e.target.value))}
                    className="num w-20 bg-transparent text-[14px] text-text outline-none"
                  />
                </div>
                <div className="flex items-center gap-0.5 rounded-md border border-line-strong bg-bg-inset p-0.5">
                  {(["USDC", "SOL"] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => setPayWith(c)}
                      className={`rounded px-2 py-0.5 text-[12px] font-medium transition-colors ${
                        payWith === c ? "bg-live/20 text-live" : "text-text-3 hover:text-text"
                      }`}
                    >
                      pay with {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mono mt-1.5 text-[12px] text-text-3">
                rests on-chain until {selected} hits ${trigger}
                {payWith === "SOL" && solAmt ? ` · from ~${solAmt.toFixed(4)} SOL` : ""}
                {usdcAmount < 5 ? <span className="text-amber"> · $5 minimum on-chain</span> : ""}
              </div>
            </Field>
          )}
        </div>

        {/* rail explainer + submit */}
        <div className="mt-4 rounded-lg border border-line bg-bg-sunken p-3 text-[13px] leading-relaxed text-text-2">
          {rail === "onchain" ? (
            <>
              <span className="text-violet font-medium">On-chain order.</span> Rests on Solana. Your
              wallet signs once; the Jupiter keeper fills it 24/7.{" "}
              {!address && <span className="text-amber">Connect a wallet to place it.</span>}
            </>
          ) : (
            <>
              <span className="text-amber font-medium">Vigil watch.</span> A stop below market is not a
              limit order. Vigil reads the live feed and sells the instant your floor breaks.
              <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line pt-2.5">
                <span className="text-[12.5px] text-text-3">
                  {delegated ? (
                    <span className="text-live">Hands-free on · capped allowance granted</span>
                  ) : (
                    <>Hands-free: one signature grants a capped, revocable allowance</>
                  )}
                </span>
                {delegated ? (
                  <Btn size="sm" tone="ghost" onClick={() => revokeHandsFree(selected)}>
                    revoke
                  </Btn>
                ) : (
                  <Btn
                    size="sm"
                    tone="amber"
                    disabled={busy === `grant-${selected}`}
                    onClick={() => grantHandsFree(selected)}
                  >
                    enable
                  </Btn>
                )}
              </div>
            </>
          )}
        </div>

        <Btn
          tone="live"
          className="mt-3 w-full"
          disabled={busy === "trade" || (kind === "buy_dip" && rail === "onchain" && usdcAmount < 5)}
          onClick={submit}
        >
          {rail === "onchain" && kind === "buy_dip"
            ? `Arm buy the dip on ${selected} (pay with ${payWith})`
            : `Arm ${KIND_LABEL[kind].toLowerCase()} on ${selected}`}
        </Btn>

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
              <span className="text-[14px] font-semibold text-text">{lastTrade.text}</span>
            </div>
            {lastTrade.sub && (
              <div className="mt-1 text-[12.5px] leading-snug text-text-3">{lastTrade.sub}</div>
            )}
            {lastTrade.sig && (
              <a
                href={`https://explorer.solana.com/tx/${lastTrade.sig}`}
                target="_blank"
                rel="noreferrer"
                className="mono mt-2 inline-flex items-center gap-1 rounded border border-violet/40 bg-violet/10 px-2 py-1 text-[12px] text-violet hover:bg-violet/20"
              >
                View on Solana Explorer ↗ {shortAddr(lastTrade.sig, 4)}
              </a>
            )}
          </div>
        )}
      </div>

      <ArmedList />
    </Panel>
  );
}

function ArmedList() {
  const rules = useVigil((s) => s.rules);
  const effectivePrice = useVigil((s) => s.effectivePrice);
  const clock = useVigil((s) => s.clock);
  const nightWatch = useVigil((s) => s.nightWatch);
  const cancelRule = useVigil((s) => s.cancelRule);
  const executeNow = useVigil((s) => s.executeNow);
  // subscribe to a ticking value so distances refresh live
  useVigil((s) => s.drill);
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 400);
    return () => clearInterval(t);
  }, []);
  const nyseOpen = clock?.nyseOpen ?? true;
  const dormant = nightWatch && nyseOpen;

  const active = useMemo(() => rules.filter((r) => r.status !== "cancelled"), [rules]);
  if (active.length === 0) return null;

  return (
    <div className="hair-t">
      <div className="px-4 py-2">
        <Eyebrow>Armed rules · {active.filter((r) => r.status === "armed").length} watching</Eyebrow>
      </div>
      <div className="divide-y divide-line">
        {active.map((r) => {
          const price = effectivePrice(r.symbol);
          const ev = evalRule(r, price, clock?.nyseOpen ?? true);
          const trg = r.kind === "trailing_stop" ? trailingTrigger(r) : r.triggerUsd;
          const fired = r.status === "triggered";
          const near = ev.distancePct !== null && Math.abs(ev.distancePct) < 2;
          // watch rules stand down under Night Watch while NYSE is open
          const isDormant = dormant && !r.orderRef && r.status === "armed";
          return (
            <div key={r.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[14.5px] font-semibold text-text">{r.symbol}</span>
                  <span className="text-[13px] text-text-3">{KIND_LABEL[r.kind]}</span>
                  <Pill tone={r.mode === "guard" && r.orderRef ? "violet" : "amber"}>
                    {r.orderRef ? "on-chain" : "watch"}
                  </Pill>
                </div>
                {fired ? (
                  <Pill tone="danger">fired</Pill>
                ) : r.status === "paused" ? (
                  <Pill tone="muted">paused</Pill>
                ) : isDormant ? (
                  <Pill tone="sleep">dormant</Pill>
                ) : (
                  <Pill tone={near ? "danger" : "live"}>{near ? "near trigger" : "armed"}</Pill>
                )}
              </div>

              <div className="mt-1.5 flex items-center justify-between">
                <div className="mono text-[12.5px] text-text-3">
                  {trg ? `trigger ${usd(trg)}` : ""}{" "}
                  {ev.distancePct !== null && !fired && (
                    <span className={near ? "text-danger" : "text-text-3"}>
                      · {ev.distancePct >= 0 ? "+" : ""}
                      {ev.distancePct.toFixed(2)}% away
                    </span>
                  )}
                </div>
                {!fired && (
                  <div className="flex items-center gap-1.5">
                    <Btn size="sm" tone="ghost" onClick={() => executeNow(r.id)}>
                      execute now
                    </Btn>
                    <Btn size="sm" tone="ghost" onClick={() => cancelRule(r.id)}>
                      cancel
                    </Btn>
                  </div>
                )}
              </div>
              {!fired && (
                <div className="mt-1 text-[12.5px] text-text-3">
                  {isDormant ? "Night Watch: stands down until NYSE closes" : ev.reason}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Eyebrow className="mb-1.5">{label}</Eyebrow>
      {children}
    </div>
  );
}

function round(n: number): number {
  return n >= 100 ? Math.round(n) : Math.round(n * 100) / 100;
}

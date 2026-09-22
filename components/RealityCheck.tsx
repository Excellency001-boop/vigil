import { Eyebrow, Panel, Pill } from "./ui";

// Radical honesty about what executes on-chain versus what is simulated.
// Most hackathon projects overclaim. Being precise is a trust advantage, and it
// answers the first question any serious judge asks: "what here is actually real?"

type Row = {
  tag: "real" | "watch";
  what: string;
  how: string;
};

const ROWS: Row[] = [
  { tag: "real", what: "Market clock", how: "Pyth market-hours feeds decide open vs closed. Verified live." },
  { tag: "real", what: "Live prices", how: "Jupiter price v3 plus Pyth, refreshed every few seconds, 24/7." },
  {
    tag: "real",
    what: "Take profit · Buy the dip",
    how: "Real Jupiter Trigger orders that rest on Solana. The Jupiter keeper fills them, not Vigil. Open any order on an explorer, no wallet needed.",
  },
  {
    tag: "real",
    what: "Instant trade",
    how: "A real Jupiter swap, signed by your wallet, confirmed on-chain. One is pinned above as proof.",
  },
  {
    tag: "watch",
    what: "Stop loss · Trailing stop",
    how: "A stop below market is not a limit order, so Vigil reads the live feed every second and fires the protective sell via one tap, or hands-free through a capped, revocable delegation. In demo mode the fill is simulated on live prices and marked sim.",
  },
];

export default function RealityCheck() {
  return (
    <Panel
      eyebrow="Under the hood · verify everything"
      title="What is real, stated plainly"
      right={<Pill tone="live">no overclaiming</Pill>}
    >
      <div className="divide-y divide-line">
        {ROWS.map((r) => (
          <div key={r.what} className="flex items-start gap-3 px-4 py-3">
            <div className="w-16 flex-none pt-0.5">
              {r.tag === "real" ? (
                <Pill tone="live">on-chain</Pill>
              ) : (
                <Pill tone="amber">watch</Pill>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-text">{r.what}</div>
              <div className="mt-0.5 text-[12px] leading-relaxed text-text-3">{r.how}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 hair-t">
        <Eyebrow>The rule</Eyebrow>
        <div className="mt-1 text-[12px] leading-relaxed text-text-2">
          Simulated actions are labeled. Real actions carry a transaction signature you can open on
          Solana Explorer or Solscan. Vigil is non-custodial throughout: your wallet signs, the
          Jupiter keeper executes, and Vigil never holds your keys or your funds.
        </div>
      </div>
    </Panel>
  );
}

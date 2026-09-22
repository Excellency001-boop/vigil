import { Eyebrow } from "./ui";

const STACK = [
  { name: "Pyth Network", role: "Market-hours clock + equity/xStock feeds" },
  { name: "Jupiter", role: "Trigger orders + swap routing (non-custodial)" },
  { name: "Meteora", role: "DLMM pools that back xStock liquidity" },
  { name: "xStocks", role: "1:1-backed tokenized US equities" },
  { name: "Solana", role: "24/7 settlement in seconds" },
];

export default function Footer() {
  return (
    <footer className="mt-8 border-t border-line py-8">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <Eyebrow>Built on live mainnet rails</Eyebrow>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {STACK.map((s) => (
            <div key={s.name} className="rounded-lg border border-line bg-bg-raised p-3">
              <div className="text-[14px] font-semibold text-text">{s.name}</div>
              <div className="mt-0.5 text-[12.5px] leading-snug text-text-3">{s.role}</div>
            </div>
          ))}
        </div>
        <p className="mt-5 max-w-2xl text-[13px] leading-relaxed text-text-3">
          Non-custodial. Your wallet signs; the Jupiter keeper executes. Vigil never holds keys or
          funds. Demo fills are simulated on live prices and labelled{" "}
          <span className="mono text-text-2">sim</span>. Real on-chain actions carry a signature you
          can open on Solscan.
        </p>
        <p className="mt-3 text-[12px] text-text-4">
          Vigil · the watch that never closes. Solana Stocklana hackathon.
        </p>
      </div>
    </footer>
  );
}

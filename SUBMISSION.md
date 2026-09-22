# Vigil — submission copy

Paste-ready copy for the Stocklana submission form. Fill the three links at the bottom before you submit.

---

## Project name
Vigil

## Tagline (one line)
Your brokerage sleeps. Your money shouldn't. A 24/7 non-custodial autopilot for tokenized stocks on Solana.

## Elevator pitch (2 sentences)
Tokenized stocks trade 24/7 on Solana, but every brokerage and every stop-loss on the real equity runs on New York Stock Exchange hours, so bad news on a weekend gaps you down at Monday's open with no chance to act. Vigil watches the live feed the whole time the NYSE is shut and executes your rules through Jupiter the moment a broker never could, without ever holding your keys.

## Track
Main track. Consumer and Credit & yield wedge (24/7 trading + protection). Bounties: Pyth Market Data, Meteora.

## Full description

**The problem.** The NYSE is closed about 81% of the week. During overnight and weekend hours your broker cannot touch your position, and neither can any stop-loss attached to the underlying share. Retail investors get gapped down at the open and eat losses they set a stop to avoid. This is not an edge case, it is most of the week.

**The insight.** On Solana the same company exists as a tokenized stock that trades 24/7. We proved it with one live Pyth call: `Equity.US.AAPL/USD` reports closed while `Crypto.AAPLX/USD` reports open, schedule open all seven days. Same company. One asleep, one awake. A program can watch the awake one at 3am on a Sunday and act on the rule you set, without custody. TradFi cannot do this. That gap is the product.

**What Vigil does.**
- A live Market Clock, powered by Pyth market-hours data, showing NYSE asleep versus Solana awake with a running countdown of exactly how long you are unprotected in TradFi.
- A live portfolio of tokenized stocks, each flagged guarded or exposed, priced 24/7, with premium/discount to the real share.
- Autopilot rules: stop loss, take profit, trailing stop, buy the dip.
- Two non-custodial execution rails. Take profit and buy the dip are placed as real Jupiter Trigger orders that the keeper fills 24/7 with your tab closed. Stop loss and trailing stop are held by Vigil's live watch, which fires the protective sell the instant your floor breaks, with an optional capped, revocable Token-2022 allowance so it runs fully hands-free.
- A fire drill that injects a simulated shock so anyone can watch a guard fire in real time.

**Why it belongs on Solana.** The assets and the feeds never close, so the protection never has to. Vigil is thin: it stands on Pyth for the clock, Jupiter for routing and resting orders, Meteora liquidity underneath, and xStocks for the assets. It is a brain, not a vault. Every order and swap is signed by your wallet.

## How it works (tech)
- Next.js 16, React 19, Tailwind v4.
- Pyth Hermes `/v2/price_feeds` for the authoritative market-hours clock and feed provenance.
- Jupiter `price/v3` for the on-chain price, the real underlying price, and liquidity in one call. Jupiter Trigger v1 (create, execute, list) for non-custodial 24/7 resting orders. Jupiter Swap for manual execution.
- Token-2022 aware balance reading and a real `approveChecked` / `revoke` delegation flow for capped hands-free execution.
- A client rules engine on a 1.2s loop, market-clock aware, that fires guards the instant a floor breaks.
- Ten blue-chip xStocks wired with verified mints and verified Pyth feed ids.

## What is real vs simulated
Honest, and said on the surface of the app too. Real and on-chain: Jupiter Trigger orders, swaps, and the Token-2022 delegation, all signed by your wallet and carrying a Solscan signature. Simulated with live prices: in demo mode a fired guard shows a fill labelled `sim`, so anyone can see the whole flow with no wallet.

## Bounty notes
- **Pyth Market Data.** Pyth's market-hours feed is not decoration, it is the literal trigger for the product. It decides when your TradFi stop is asleep and Vigil's is the only one awake. We also surface the tokenized-versus-equity basis off Pyth-tracked prices.
- **Meteora.** xStock protective swaps and buy-the-dip orders settle through Meteora DLMM liquidity via Jupiter routing (verified: AAPLx to USDC routes through Meteora DLMM).

## Try it in 30 seconds
Open the live demo, click Connect / Demo, choose Explore with demo wallet, arm a stop loss on NVDAx, then run a Crash −25% drill and watch the guard fire in the execution log while the NYSE is closed.

## Team
[your name / handle]

## Links
- Live demo: https://vigil-gules.vercel.app
- GitHub: [PASTE REPO URL]
- Video: [PASTE VIDEO URL]

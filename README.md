# Vigil

**The watch that never closes. Your brokerage sleeps. Your money shouldn't.**

Vigil is a 24/7 non-custodial autopilot for tokenized stocks on Solana. You set a rule once. Vigil holds the watch around the clock and acts the moment a brokerage never could.

Built for the Solana [Stocklana](https://hackathons.solana.com/hackathons/stocklana) hackathon.

**Live demo: https://vigil-gules.vercel.app**

---

## The problem, in one screen

Tokenized stocks trade 24/7 on Solana. The New York Stock Exchange, and every broker stop-loss attached to the real equity, does not.

Bad news breaks on a Saturday. Your AAPL gaps down at Monday's open and you never had a chance to act. The NYSE is shut about 81% of the week. During that whole window your broker cannot touch your position. On Solana, a program can watch the live feed at 3am on a Sunday and execute the rule you set, without ever holding your keys.

That gap is the whole product. Vigil lives inside it.

We proved the thesis with one live API call. Pyth reports `Equity.US.AAPL/USD` as closed while `Crypto.AAPLX/USD` (the tokenized version) is open, schedule `O,O,O,O,O,O,O`, open all seven days. Same company. One asleep, one awake. Vigil turns that split into protection.

## What it does

- **Market Clock.** A live NYSE-vs-Solana clock powered by Pyth market-hours data, with a running countdown of exactly how long you are unprotected in TradFi.
- **Live portfolio.** Your xStock holdings priced 24/7, each one flagged `guarded` or `exposed`, with premium/discount to the real underlying equity.
- **Autopilot rules.** Stop loss, take profit, trailing stop, and buy-the-dip on any tokenized stock.
- **Two non-custodial execution rails:**
  - **On-chain orders** (take profit, buy the dip): real Jupiter Trigger orders. The Jupiter keeper fills them 24/7, even overnight and on weekends. Vigil never holds your keys or your funds.
  - **Vigil watch** (stop loss, trailing stop): a stop below market is a trigger a plain limit order cannot express, so Vigil monitors the live feed every second and fires the protective sell the instant your floor breaks.
- **Fire drill.** Inject a simulated price shock and watch every armed guard respond in real time, so you can see it work without waiting for a real move.

## Why it belongs on Solana

- **24/7 settlement.** The assets and the feeds never close, so the protection never has to.
- **Composability.** Vigil is thin. It stands on Pyth for the clock, Jupiter for routing and resting orders, Meteora pools for the liquidity underneath, and xStocks for the assets. No rebuilt infra.
- **Non-custodial by construction.** Every order and swap is signed by your wallet and executed by the Jupiter keeper. Vigil is a brain, not a vault.

TradFi literally cannot do this. That is the point.

## Architecture

```
Next.js 16 (App Router) + React 19 + Tailwind v4
│
├─ lib/tokens.ts     hero xStock registry (mints, decimals, Pyth feed ids) — all verified live
├─ lib/pyth.ts       Pyth Hermes market-hours clock (the "is NYSE asleep?" truth)
├─ lib/jupiter.ts    price v3 (on-chain + underlying), quote/swap, Trigger v1 (create/execute/list)
├─ lib/solana.ts     Token-2022 aware balance reader
├─ lib/rules.ts      rule model + evaluation (isomorphic)
├─ lib/store.ts      live store: polling, the 1.2s firing loop, wallet, drill
│
├─ app/api/clock     Pyth market clock
├─ app/api/prices    live xStock prices + basis
├─ app/api/portfolio wallet holdings (or demo book)
├─ app/api/quote     Jupiter quote passthrough
├─ app/api/swap      build an unsigned swap tx (manual execute)
└─ app/api/trigger   create / execute / list Jupiter Trigger orders
```

## Data rails (all live mainnet, no custom program to audit)

| Source | What it does for Vigil |
| --- | --- |
| **Pyth Network** | Market-hours clock + equity/xStock feed provenance. Free `/v2/price_feeds`. Live price updates now sit behind Pyth Pro (the bounty prize), so we use Pyth as the authoritative clock and Jupiter for live prices. |
| **Jupiter** | `price/v3` gives on-chain price + real underlying + liquidity in one call. Trigger v1 is the non-custodial 24/7 order rail. Swap builds the manual execute tx. |
| **Meteora** | The DLMM pools xStock swaps route through. Verified: AAPLx → USDC routes via Meteora DLMM. |
| **xStocks** | 1:1-backed tokenized US equities, the assets Vigil watches. |

## Bounty fit

- **Best Use of Pyth Market Data.** Pyth's market-hours feed does real work: it is the trigger for the entire product. It decides when your TradFi stop is asleep and Vigil's is the only one awake. We also surface the tokenized-vs-equity basis off Pyth-tracked prices.
- **Best Use of Meteora.** xStock protective swaps and buy-the-dip orders settle through Meteora DLMM liquidity via Jupiter routing.

## What is real vs simulated

We are honest about this on the surface too.

- **Real, on-chain, non-custodial:** Jupiter Trigger orders (take profit, buy the dip) and manual swaps. These need a connected wallet holding xStocks. They carry a transaction signature you can open on Solscan.
- **Simulated with live data:** in demo mode (no wallet needed) a fired guard shows a simulated fill using the live price, clearly labelled `sim`. This lets anyone see the full flow instantly.

## Proof, live on mainnet right now

Vigil is not a mockup. Real actions placed through it, verifiable with no wallet:

- **A 24/7 resting order**, placed through Vigil's Autopilot, sitting on Solana right now (buy NVDAx with SOL when it dips ~9%, filled by the Jupiter keeper whenever the price crosses):
  https://explorer.solana.com/address/3bD9kJGgxGHmiPNSuK69UDZcGFwuucgTKwrfmmGj6Q9m
- **A confirmed swap**, executed through Vigil's Trade panel (buy NVDAx with SOL):
  https://explorer.solana.com/tx/5PfBAp8xmemNcgaxrt6gc4A5PuFiDVzLGH7vhu3y8rcA8WUdvPdvNAV7yiQyhN7fKSuXCLRJntWZJiWrZ5xzwBYx

Or paste the placing wallet `GKJQFHmyuSxS55BhTVCMBabAYtVFGT3Fg5toifuSeiNC` into **Verify any wallet's live orders** on the site to see the resting order yourself, no connection needed.

## Run it

```bash
cd vigil
bun install
bun run dev
```

Open http://localhost:3737, click **Connect / Demo**, choose **Explore with demo wallet**, arm a stop loss, then run a **Crash −25%** drill and watch the guard fire in the execution log while the NYSE is closed.

Optional env:

```
SOLANA_RPC=<your mainnet rpc>   # defaults to the public endpoint
JUP_API_BASE=<jupiter api base> # defaults to lite-api.jup.ag
```

---

Vigil. Set a rule once. Sleep. We keep watch.

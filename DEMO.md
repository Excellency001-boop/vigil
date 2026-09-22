# Vigil — 90 second demo script

Goal: prove the thesis, show it work end to end, land the "why Solana" punch. Record at 1280 wide or larger, dark room, no cursor clutter.

Before you hit record:
- `bun run dev`, open http://localhost:3737
- Have the page at the top, demo book loaded (Connect / Demo → Explore with demo wallet)
- Clear any old rules (Fire drill panel → "reset demo book & clear rules")

---

**0:00 – 0:12 — The hook (hero)**

Open on the Market Clock.

> "Tokenized stocks trade 24 hours a day on Solana. But the New York Stock Exchange, and every broker stop-loss attached to it, is asleep right now."

Point at the split: NYSE **ASLEEP**, Solana **AWAKE**. Read the big amber number.

> "This is your unprotected window. Fourteen hours until Wall Street reopens. Fourteen hours where your broker cannot touch your position. This is Vigil. It covers that window."

**0:12 – 0:25 — Live and real**

Scroll to the portfolio and the live universe.

> "This is a live portfolio of tokenized stocks, priced right now off Solana. Every position is flagged guarded or exposed. And here is the whole universe, live, with the premium or discount each token trades at versus the real share. Every one of these is a real Pyth feed and real Jupiter liquidity."

Let a price tick. Point at a premium/discount number.

**0:25 – 0:45 — Arm a guard**

Select NVDAx. In Autopilot, keep **Stop loss**.

> "I hold NVIDIA. I want a floor. If it drops to a hundred and ninety-eight dollars, sell everything to stablecoin. On a normal broker this stop does nothing while the market is closed. Watch what Vigil does."

Click **Arm stop loss on NVDAx**. Point at the portfolio: NVDAx flips to **guarded**, coverage ticks up.

**0:45 – 1:05 — The moment (fire drill)**

Scroll to Stress test.

> "Let me simulate bad news breaking overnight."

Click **Crash −25%**.

Watch the execution log fill in. Read it out:

> "There. NVIDIA breaks the floor at a hundred and sixty-one dollars, while the NYSE is closed, and Vigil fires the protective sell instantly. A broker stop could not have acted here. Vigil just did."

**1:05 – 1:20 — Non-custodial + on-chain**

Switch rule type to **Take profit** (or Buy the dip).

> "For targets above the market, Vigil places a real Jupiter Trigger order. The Jupiter keeper fills it 24/7, and Vigil never holds your keys. Take profit, buy the dip, stop loss, trailing stop, one rule, and you sleep."

(If a wallet with xStocks is connected, arm one on-chain and show the Solscan signature in the log.)

**1:20 – 1:30 — Close**

Back to the hero.

> "The market never closes on Solana. Neither should your protection. Vigil. Set a rule once. We keep watch."

---

## The one-line pitch

Vigil is a 24/7 non-custodial autopilot for tokenized stocks. Your brokerage sleeps 81% of the week. Vigil watches the live Pyth feed the whole time and executes your rules through Jupiter the moment a broker never could.

## The judge's question, answered

"Could this be a real app people actually use?" Yes. Anyone holding xStocks wants a stop that works on a Sunday. That does not exist in TradFi and cannot. It exists here.

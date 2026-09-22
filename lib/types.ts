// Shared types across server routes and client.

export type MarketClock = {
  nyseOpen: boolean;
  solanaOpen: boolean; // xStocks trade 24/7, effectively always true
  nextOpen: number | null; // unix seconds
  nextClose: number | null; // unix seconds
  // seconds until NYSE next opens (the window you are unprotected in TradFi)
  secondsToOpen: number | null;
  secondsToClose: number | null;
  asOf: number; // unix seconds
  source: "pyth"; // provenance
  equityFeed: string; // the Pyth equity feed id used for the clock
};

export type AssetQuote = {
  symbol: string;
  under: string;
  name: string;
  mint: string;
  decimals: number;
  // on-chain tokenized price (what AAPLx actually trades at on Solana, 24/7)
  onchainUsd: number | null;
  // underlying real equity reference price (last NYSE print)
  equityUsd: number | null;
  // premium/discount of the token vs the equity, in percent
  basisPct: number | null;
  change24hPct: number | null;
  liquidityUsd: number | null;
  pythCrypto: string;
  pythEquity: string;
  updatedAt: number;
};

export type Position = {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  amount: number; // human units
  onchainUsd: number | null;
  valueUsd: number | null;
  change24hPct: number | null;
  basisPct: number | null;
};

export type Portfolio = {
  owner: string;
  demo: boolean;
  positions: Position[];
  usdc: number;
  totalUsd: number;
  asOf: number;
};

// ---- Autopilot rules ----

export type RuleKind =
  | "stop_loss" // sell to USDC if price falls to / below trigger
  | "take_profit" // sell to USDC if price rises to / above trigger
  | "trailing_stop" // sell if price drops N% from its running peak
  | "buy_dip" // buy with USDC if price falls to / below trigger
  | "dca"; // recurring buy of a fixed USDC amount

export type RuleMode =
  | "guard" // arm an on-chain, non-custodial order that executes 24/7
  | "sentinel"; // watch-only: alert + one-tap execute

export type RuleStatus =
  | "armed" // actively watching
  | "triggered" // condition met, action taken/pending
  | "paused"
  | "cancelled";

export type Rule = {
  id: string;
  kind: RuleKind;
  mode: RuleMode;
  status: RuleStatus;
  symbol: string; // xStock symbol
  mint: string;
  // for stop/take/dip: absolute USD trigger price
  triggerUsd?: number;
  // for trailing: percent below running peak
  trailPct?: number;
  // running peak seen since arming (for trailing)
  peakUsd?: number;
  // size: percent of the position to sell (stop/take/trail) OR usdc to spend (dip/dca)
  sizePct?: number;
  usdcAmount?: number;
  // dca cadence in hours
  everyHours?: number;
  createdAt: number;
  lastFiredAt?: number;
  note?: string;
  // whether this rule can only be honored by Vigil (because NYSE is shut)
  nyseWouldMiss?: boolean;
  // on-chain order reference once armed as a guard
  orderRef?: string;
};

export type RuleEval = {
  rule: Rule;
  breached: boolean;
  distancePct: number | null; // how far price is from the trigger, signed
  reason: string;
};

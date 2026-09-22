// Vigil hero universe: the tokenized US equities we watch.
// Every mint verified live against Jupiter token search (Sep 2026).
// Every Pyth feed id verified live against Hermes /v2/price_feeds.
// The crypto feed trades 24/7; the equity feed follows NYSE hours.
// That split is the whole product.

export type XStock = {
  symbol: string; // on-chain ticker, e.g. AAPLx
  under: string; // underlying equity ticker, e.g. AAPL
  name: string; // company / fund name
  mint: string; // Solana SPL mint
  decimals: number;
  pythCrypto: string; // Pyth feed id for the 24/7 tokenized feed
  pythEquity: string; // Pyth feed id for the NYSE-hours equity feed
};

export const USDC = {
  mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  decimals: 6,
  symbol: "USDC",
};

export const SOL_MINT = "So11111111111111111111111111111111111111112";

export const XSTOCKS: XStock[] = [
  {
    symbol: "AAPLx",
    under: "AAPL",
    name: "Apple",
    mint: "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp",
    decimals: 8,
    pythCrypto: "978e6cc68a119ce066aa830017318563a9ed04ec3a0a6439010fc11296a58675",
    pythEquity: "49f6b65cb1de6b10eaf75e7c03ca029c306d0357e91b5311b175084a5ad55688",
  },
  {
    symbol: "TSLAx",
    under: "TSLA",
    name: "Tesla",
    mint: "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB",
    decimals: 8,
    pythCrypto: "47a156470288850a440df3a6ce85a55917b813a19bb5b31128a33a986566a362",
    pythEquity: "16dad506d7db8da01c87581c87ca897a012a153557d4d578c3b9c9e1bc0632f1",
  },
  {
    symbol: "NVDAx",
    under: "NVDA",
    name: "NVIDIA",
    mint: "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh",
    decimals: 8,
    pythCrypto: "4244d07890e4610f46bbde67de8f43a4bf8b569eebe904f136b469f148503b7f",
    pythEquity: "b1073854ed24cbc755dc527418f52b7d271f6cc967bbf8d8129112b18860a593",
  },
  {
    symbol: "MSFTx",
    under: "MSFT",
    name: "Microsoft",
    mint: "XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX",
    decimals: 8,
    pythCrypto: "bb723a70af731ab56b9a650eb7e8ac22b7bc07ea77f8670bd1fa9a37bf6df3f5",
    pythEquity: "d0ca23c1cc005e004ccf1db5bf76aeb6a49218f43dac3d4b275e92de12ded4d1",
  },
  {
    symbol: "GOOGLx",
    under: "GOOGL",
    name: "Alphabet",
    mint: "XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN",
    decimals: 8,
    pythCrypto: "b911b0329028cd0283e4259c33809d62942bd2716a58084e5f31d64c00b5424e",
    pythEquity: "5a48c03e9b9cb337801073ed9d166817473697efff0d138874e0f6a33d6d5aa6",
  },
  {
    symbol: "AMZNx",
    under: "AMZN",
    name: "Amazon",
    mint: "Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg",
    decimals: 8,
    pythCrypto: "7148fbe6e493ff2580305c92a8d7f8628c9943b11b9b253aebc24863fec290e8",
    pythEquity: "b5d0e0fa58a1f8b81498ae670ce93c872d14434b72c364885d4fa1b257cbb07a",
  },
  {
    symbol: "METAx",
    under: "META",
    name: "Meta Platforms",
    mint: "Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu",
    decimals: 8,
    pythCrypto: "bf3e5871be3f80ab7a4d1f1fd039145179fb58569e159aee1ccd472868ea5900",
    pythEquity: "78a3e3b8e676a8f73c439f5d749737034b139bbbe899ba5775216fba596607fe",
  },
  {
    symbol: "SPYx",
    under: "SPY",
    name: "S&P 500 ETF",
    mint: "XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W",
    decimals: 8,
    pythCrypto: "2817b78438c769357182c04346fddaad1178c82f4048828fe0997c3c64624e14",
    pythEquity: "19e09bb805456ada3979a7d1cbb4b6d63babc3a0f8e8a9509f68afa5c4c11cd5",
  },
  {
    symbol: "COINx",
    under: "COIN",
    name: "Coinbase",
    mint: "Xs7ZdzSHLU9ftNJsii5fCeJhoRWSC32SQGzGQtePxNu",
    decimals: 8,
    pythCrypto: "641435d5dffb5311140b480517c79986d8488d5cf08a11eec53b83ad02cab33f",
    pythEquity: "fee33f2a978bf32dd6b662b65ba8083c6773b494f8401194ec1870c640860245",
  },
  {
    symbol: "CRCLx",
    under: "CRCL",
    name: "Circle",
    mint: "XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1",
    decimals: 8,
    pythCrypto: "c13184461c0c80d98ffcd89be627c2220b94a96c7c67f0c4b16bc12fd3b17758",
    pythEquity: "92b8527aabe59ea2b12230f7b532769b133ffb118dfbd48ff676f14b273f1365",
  },
];

export const BY_MINT: Record<string, XStock> = Object.fromEntries(
  XSTOCKS.map((t) => [t.mint, t]),
);
export const BY_SYMBOL: Record<string, XStock> = Object.fromEntries(
  XSTOCKS.map((t) => [t.symbol.toUpperCase(), t]),
);

export function findStock(key: string): XStock | undefined {
  return BY_MINT[key] || BY_SYMBOL[key.toUpperCase()];
}

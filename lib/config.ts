// The Vigil executor is the on-chain identity a user delegates a capped,
// revocable allowance to. In production this key runs the watcher that fires
// protective sells hands-free. The pubkey is public; the secret never ships.
export const VIGIL_EXECUTOR =
  process.env.VIGIL_EXECUTOR_PUBKEY || "9uw6xp1Cc2mzBe5x5Si7KqMtJVHNnBARNxEScefB3grK";

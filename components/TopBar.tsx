"use client";

import { useState } from "react";
import { useVigil } from "@/lib/store";
import { countdown, shortAddr, usd } from "@/lib/format";
import { isMobile, mobileWallets } from "@/lib/wallet";
import { Btn, Dot } from "./ui";

export default function TopBar() {
  const clock = useVigil((s) => s.clock);
  const address = useVigil((s) => s.address);
  const demo = useVigil((s) => s.demo);
  const wallets = useVigil((s) => s.wallets);
  const connect = useVigil((s) => s.connect);
  const disconnect = useVigil((s) => s.disconnect);
  const enterDemo = useVigil((s) => s.enterDemo);
  const refreshWallets = useVigil((s) => s.refreshWallets);
  const protectedTotal = useVigil((s) => s.protectedTotal);
  const [open, setOpen] = useState(false);

  // rescan installed wallets each time the menu opens (some register late)
  const toggleMenu = () => {
    refreshWallets();
    setOpen((o) => !o);
  };

  const nyseOpen = clock?.nyseOpen ?? false;
  const secsToOpen = clock?.nextOpen ? Math.max(0, clock.nextOpen - Math.floor(Date.now() / 1000)) : null;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
        {/* brand */}
        <div className="flex items-center gap-2.5">
          <Mark />
          <div>
            <div className="text-[15px] font-semibold leading-none tracking-[0.14em] text-text">VIGIL</div>
            <div className="mono mt-[5px] text-[8.5px] leading-none tracking-[0.16em] text-text-3">
              THE WATCH THAT NEVER CLOSES
            </div>
          </div>
        </div>

        {/* compact clock */}
        <div className="hidden items-center gap-4 md:flex">
          <ClockChip
            label="NYSE"
            state={nyseOpen ? "live" : "sleep"}
            value={nyseOpen ? "OPEN" : "ASLEEP"}
            detail={nyseOpen ? "" : secsToOpen ? `reopens ${countdown(secsToOpen)}` : ""}
          />
          <div className="h-6 w-px bg-line" />
          <ClockChip label="SOLANA" state="live" value="AWAKE" detail="24/7" />
          {protectedTotal > 0 && (
            <>
              <div className="h-6 w-px bg-line" />
              <div className="flex items-center gap-1.5" title="capital Vigil preserved this session">
                <span className="mono text-[11px] text-text-3">PROTECTED</span>
                <span className="num text-[13px] font-semibold text-live">{usd(protectedTotal)}</span>
              </div>
            </>
          )}
        </div>

        {/* wallet */}
        <div className="relative">
          {address ? (
            <Btn size="sm" tone="ghost" onClick={toggleMenu}>
              <Dot state="live" />
              <span className="mono">{shortAddr(address)}</span>
              <span className="text-text-4">▾</span>
            </Btn>
          ) : demo ? (
            <div className="flex items-center gap-2">
              <span className="mono text-[12px] text-amber">demo mode</span>
              <Btn size="sm" onClick={toggleMenu}>
                Connect
              </Btn>
            </div>
          ) : (
            <Btn size="sm" tone="live" onClick={toggleMenu}>
              Connect / Demo
            </Btn>
          )}

          {open && (
            <div
              className="absolute right-0 mt-2 w-72 rounded-xl border border-line-strong bg-bg-raised p-1.5 shadow-2xl"
              onMouseLeave={() => setOpen(false)}
            >
              {address ? (
                <>
                  <div className="px-2 py-1.5">
                    <div className="eyebrow">Connected</div>
                  </div>
                  <div className="rounded-lg bg-bg-inset px-2.5 py-2">
                    <div className="mono break-all text-[12px] text-text-2">{address}</div>
                  </div>
                  <button
                    onClick={() => {
                      disconnect();
                      setOpen(false);
                    }}
                    className="mt-1 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[14px] text-danger hover:bg-danger/10"
                  >
                    <span>Disconnect</span>
                    <span className="mono text-[11px] text-danger/70">end session</span>
                  </button>
                </>
              ) : (
              <>
              <div className="px-2 py-1.5">
                <div className="eyebrow">
                  {wallets.length > 0 ? `Solana wallets · ${wallets.length} found` : "Connect a wallet"}
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {wallets.length > 0 ? (
                  wallets.map((w) => (
                    <button
                      key={w.name}
                      onClick={() => {
                        connect(w.name);
                        setOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] text-text hover:bg-bg-inset"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={w.icon} alt="" className="h-5 w-5 flex-none rounded" />
                      <span className="flex-1 text-left">{w.name}</span>
                      <span className="mono text-[10px] text-text-3">detected</span>
                    </button>
                  ))
                ) : isMobile() ? (
                  mobileWallets().map((m) => (
                    <button
                      key={m.name}
                      onClick={() => {
                        window.location.href = m.link;
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[14px] text-text hover:bg-bg-inset"
                    >
                      <span>{m.name}</span>
                      <span className="mono text-[11px] text-text-3">open app</span>
                    </button>
                  ))
                ) : (
                  <div className="px-2.5 py-2 text-[12px] leading-relaxed text-text-3">
                    No Solana wallet detected. Install Phantom, Solflare, Backpack, or any Solana
                    wallet, then reopen this menu.
                  </div>
                )}
              </div>
              <div className="my-1 h-px bg-line" />
              <button
                onClick={() => {
                  enterDemo();
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[14px] text-live hover:bg-live/10"
              >
                <span>Explore with demo wallet</span>
                <span className="mono text-[11px] text-live/70">no wallet needed</span>
              </button>
              <div className="px-2.5 pt-1.5 text-[11px] leading-relaxed text-text-4">
                Don&rsquo;t see your wallet? Get{" "}
                <a href="https://phantom.app/download" target="_blank" rel="noreferrer" className="text-text-3 underline hover:text-text">Phantom</a>,{" "}
                <a href="https://solflare.com/download" target="_blank" rel="noreferrer" className="text-text-3 underline hover:text-text">Solflare</a>, or{" "}
                <a href="https://backpack.app/downloads" target="_blank" rel="noreferrer" className="text-text-3 underline hover:text-text">Backpack</a>.
              </div>
              <div className="mt-1 rounded-lg border border-line bg-bg-sunken px-2.5 py-2">
                <div className="text-[12px] leading-relaxed text-text-3">
                  Connecting only shares your public address. Vigil cannot move funds or sign anything
                  without your approval, and never holds your keys. A burner wallet is fine. Your
                  wallet may warn you on a first visit; that is standard for any new site.
                </div>
              </div>
              </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function ClockChip({
  label,
  state,
  value,
  detail,
}: {
  label: string;
  state: "live" | "sleep";
  value: string;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Dot state={state} />
      <div className="leading-none">
        <span className="mono text-[11px] text-text-3">{label} </span>
        <span className={`mono text-[13px] font-semibold ${state === "live" ? "text-live" : "text-sleep"}`}>
          {value}
        </span>
        {detail && <span className="mono ml-1 text-[11px] text-text-4">{detail}</span>}
      </div>
    </div>
  );
}

function Mark() {
  // A clock that never stops: the ring is the whole cycle, the hand is always
  // moving, the tip stays lit. A miniature of the market dial in the hero.
  return (
    <span className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-live/40 bg-live/10">
      <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle cx="16" cy="16" r="11" stroke="var(--live)" strokeWidth="2" opacity="0.4" />
        <circle cx="22" cy="10.5" r="4.5" fill="var(--live)" opacity="0.22" />
        <line x1="16" y1="16" x2="22" y2="10.5" stroke="var(--live)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="16" cy="16" r="1.9" fill="var(--live)" />
        <circle cx="22" cy="10.5" r="2.3" fill="var(--live)" />
      </svg>
    </span>
  );
}

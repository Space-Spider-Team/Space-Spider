"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCrew } from "@/components/crew-provider";

const LINKS = [
  { href: "/", label: "For you" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/monitoring", label: "Monitoring" },
  { href: "/nutrition", label: "Nutrition" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { profile, profiles, selectProfile } = useCrew();
  const [utcTime, setUtcTime] = useState("--:--:--");
  const [timePhase, setTimePhase] = useState("syncing");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const utcHour = now.getUTCHours();
      setUtcTime(new Intl.DateTimeFormat("en-GB", {
        timeZone: "UTC", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
      }).format(now));
      const phase = utcHour >= 6 && utcHour < 18 ? "day" : "night";
      setTimePhase(phase);
      document.documentElement.dataset.theme = phase;
      document.documentElement.dataset.timePhase = phase;
    };
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="px-4 pt-3 sm:px-6 lg:px-10">
      <header className="panel sticky top-3 z-30 mx-auto flex max-w-7xl flex-col gap-3 rounded-3xl bg-slate-950/85 px-4 py-3 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="flex items-center gap-3 rounded-2xl">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 text-lg font-black text-slate-950 shadow-lg shadow-sky-500/20 ring-1 ring-white/20">
            S
          </span>
          <span>
            <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">
              Crew health
            </span>
            <span className="block text-2xl font-bold leading-tight tracking-tight text-white">SageCare</span>
          </span>
        </Link>

        <nav aria-label="Sections" className="flex items-center gap-1 overflow-x-auto">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-sky-500/15 text-sky-100 ring-1 ring-inset ring-sky-400/30"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <div aria-label={`Coordinated Universal Time ${utcTime}`} className="mr-1 flex items-center gap-3 rounded-xl border border-sky-400/20 bg-sky-500/[0.08] px-3 py-2">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-sky-400 shadow-[0_0_12px_currentColor]" />
            <span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Mission clock · UTC</span>
              <time className="block font-mono text-lg font-bold leading-tight tabular-nums text-sky-200" suppressHydrationWarning>{utcTime}</time>
            </span>
            <span className="rounded-full bg-sky-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-200">
              {timePhase}
            </span>
          </div>
          <span className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:block">
            Profile
          </span>
          <div
            role="group"
            aria-label="Switch crew profile"
            className="flex items-center gap-1 rounded-full border border-slate-700/70 bg-slate-900/60 p-1"
          >
            {profiles.map((item) => {
              const active = item.id === profile.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectProfile(item.id)}
                  aria-pressed={active}
                  title={`${item.name} — ${item.role}`}
                  className={`flex items-center gap-1.5 rounded-full px-1.5 py-1 text-[11px] font-semibold transition-colors sm:px-2 ${
                    active
                      ? "bg-sky-500/20 text-sky-100 ring-1 ring-inset ring-sky-400/40"
                      : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-100"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${
                      active ? "bg-sky-400/25 text-sky-100" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {item.initials}
                  </span>
                  <span className="hidden sm:inline">{item.callsign}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>
    </div>
  );
}

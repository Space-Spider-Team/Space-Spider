import type { ReactNode } from "react";
import { HRR, type HrrKey, type Range, type Tone } from "@/lib/crew";

const TONE_TEXT: Record<Tone, string> = {
  stable: "text-emerald-300",
  green: "text-emerald-300",
  watch: "text-amber-300",
  amber: "text-amber-300",
  alert: "text-rose-300",
  cyan: "text-sky-300",
};

const PILL: Record<Tone, string> = {
  stable: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/25",
  green: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/25",
  watch: "bg-amber-500/10 text-amber-300 ring-amber-400/25",
  amber: "bg-amber-500/10 text-amber-300 ring-amber-400/25",
  alert: "bg-rose-500/10 text-rose-300 ring-rose-400/25",
  cyan: "bg-sky-500/10 text-sky-300 ring-sky-400/25",
};

const BAR: Record<Tone, string> = {
  stable: "bg-gradient-to-r from-emerald-400 to-emerald-500",
  green: "bg-gradient-to-r from-emerald-400 to-emerald-500",
  watch: "bg-gradient-to-r from-amber-400 to-amber-500",
  amber: "bg-gradient-to-r from-amber-400 to-amber-500",
  alert: "bg-gradient-to-r from-rose-400 to-rose-500",
  cyan: "bg-gradient-to-r from-sky-400 to-cyan-500",
};

export const toneText = (tone: Tone) => TONE_TEXT[tone] ?? TONE_TEXT.stable;
export const toneBar = (tone: Tone) => BAR[tone] ?? BAR.stable;

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
      <span aria-hidden className="h-3.5 w-[3px] rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.8)]" />
      {children}
    </p>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <SectionLabel>{eyebrow}</SectionLabel>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{description}</p> : null}
      </div>
      {children ? <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  detail,
  action,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? <SectionLabel>{eyebrow}</SectionLabel> : null}
        <h2 className={`${eyebrow ? "mt-1.5" : ""} text-xl font-semibold tracking-tight text-white`}>{title}</h2>
        {detail ? <p className="mt-1 text-sm leading-5 text-slate-400">{detail}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function TonePill({ tone, children }: { tone: Tone; children?: ReactNode }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ring-1 ring-inset ${PILL[tone]}`}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_6px_currentColor]" />
      {children ?? tone}
    </span>
  );
}

export function Meter({
  value,
  target,
  label = "Target progress",
  tone = "cyan",
  height = "h-2",
}: {
  value: number;
  target: number;
  label?: string;
  tone?: Tone;
  height?: string;
}) {
  const percent = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={target}
      aria-valuenow={Math.min(value, target)}
      className={`${height} overflow-hidden rounded-full bg-slate-700/50 ring-1 ring-inset ring-white/5`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out ${toneBar(tone)}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export function RangeMeter({
  value,
  range,
  label = "Range progress",
  tone = "cyan",
  height = "h-2",
}: {
  value: number;
  range: Range;
  label?: string;
  tone?: Tone;
  height?: string;
}) {
  const fill = range.max > 0 ? Math.min(100, (value / range.max) * 100) : 0;
  const bandStart = range.max > 0 ? Math.min(100, (range.min / range.max) * 100) : 0;

  return (
    <div
      role="progressbar"
      aria-label={`${label}: acceptable range ${range.min} to ${range.max}`}
      aria-valuemin={0}
      aria-valuemax={range.max}
      aria-valuenow={Math.min(value, range.max)}
      className={`${height} relative overflow-hidden rounded-full bg-slate-700/50 ring-1 ring-inset ring-white/5`}
    >
      <div
        aria-hidden
        className="absolute inset-y-0 right-0 bg-white/10"
        style={{ width: `${100 - bandStart}%` }}
      />
      <div
        className={`relative h-full rounded-full transition-[width] duration-500 ease-out ${toneBar(tone)}`}
        style={{ width: `${fill}%` }}
      />
    </div>
  );
}

export function HrrChip({ riskKey }: { riskKey: HrrKey }) {
  const risk = HRR[riskKey];
  return (
    <a
      href={risk.href}
      target="_blank"
      rel="noreferrer"
      title={`${risk.title} — NASA HRR risk ${risk.id}`}
      aria-label={`NASA HRR risk ${risk.id}: ${risk.label}`}
      className="inline-flex items-center gap-1 rounded-full border border-slate-700/70 bg-slate-900/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-slate-400 transition-colors hover:border-sky-400/40 hover:text-sky-200"
    >
      <span className="text-sky-400/80">HRR</span>
      {risk.id}
    </a>
  );
}

export function HrrList({ keys }: { keys: HrrKey[] }) {
  return (
    <ul className="space-y-2">
      {keys.map((key) => {
        const risk = HRR[key];
        return (
          <li key={key}>
            <a
              href={risk.href}
              target="_blank"
              rel="noreferrer"
              className="group flex items-start gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 transition-colors hover:border-sky-400/30 hover:bg-slate-900/70"
            >
              <span className="mt-0.5 shrink-0 rounded-md border border-sky-400/25 bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-sky-300">
                HRR {risk.id}
              </span>
              <span className="min-w-0 text-xs leading-5 text-slate-300 group-hover:text-slate-100">
                {risk.title}
                <span className="mt-0.5 block text-[10px] uppercase tracking-[0.1em] text-slate-500">
                  humanresearchroadmap.nasa.gov
                </span>
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

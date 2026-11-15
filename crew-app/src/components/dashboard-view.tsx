"use client";

import Link from "next/link";
import { useCrew } from "@/components/crew-provider";
import { HrrChip, HrrList, Meter, RangeMeter, SectionLabel, TonePill, toneText } from "@/components/ui";
import { macroCap, pct, type HrrKey, type Range, type Tone } from "@/lib/crew";

const tasks = [
  { name: "Resistance circuit", time: "08:15 UTC", source: "Exercise telemetry", detail: "Verified • 92% confidence" },
  { name: "Blood pressure check", time: "09:30 UTC", source: "Smart cuff", detail: "Verified • 96% confidence" },
  { name: "Hydration log", time: "10:00 UTC", source: "Bottle dispenser", detail: "Recorded • 81% confidence" },
  { name: "Crew check-in", time: "11:20 UTC", source: "Message thread", detail: "Inferred • 67% confidence" },
];

const procedureRefs = [
  "Range check: resting HR must be reviewed against contextual baseline before any crew action.",
  "Hydration procedure: log fluid source, volume, and time if intake is below the ship target.",
  "Sleep review: if total sleep drops below 6 hours for 3 days, initiate baseline review with base station.",
];

const trendPath = "M8 78 C 42 68, 68 73, 98 58 S 160 45, 194 50 S 246 26, 290 38 S 344 12, 382 18";
const fillTrend = "M8 78 C 42 68, 68 73, 98 58 S 160 45, 194 50 S 246 26, 290 38 S 344 12, 382 18 L382 116 L8 116 Z";

const ALERT_BOX: Record<Tone, { box: string; bar: string; title: string }> = {
  amber: { box: "border-amber-400/20 bg-amber-500/[0.07]", bar: "bg-amber-400", title: "text-amber-100" },
  watch: { box: "border-amber-400/20 bg-amber-500/[0.07]", bar: "bg-amber-400", title: "text-amber-100" },
  cyan: { box: "border-sky-400/20 bg-sky-500/[0.07]", bar: "bg-sky-400", title: "text-sky-100" },
  green: { box: "border-emerald-400/20 bg-emerald-500/[0.07]", bar: "bg-emerald-400", title: "text-emerald-100" },
  stable: { box: "border-emerald-400/20 bg-emerald-500/[0.07]", bar: "bg-emerald-400", title: "text-emerald-100" },
  alert: { box: "border-rose-400/20 bg-rose-500/[0.07]", bar: "bg-rose-400", title: "text-rose-100" },
};

const SYSTEM_POSITIONS = [
  { left: "50%", top: "18%" },
  { left: "24%", top: "30%" },
  { left: "73%", top: "30%" },
  { left: "32%", top: "53%" },
  { left: "68%", top: "53%" },
  { left: "50%", top: "68%" },
];

export function DashboardView() {
  const { profile, totals, fluid } = useCrew();

  const hr = profile.metrics.find((metric) => metric.label === "Resting HR") ?? profile.metrics[0];
  const fluidPercent = pct(fluid, profile.targets.fluid);
  const remaining = Math.max(0, profile.targets.fluid - fluid);

  const alerts: { title: string; message: string; tone: Tone }[] = [
    {
      title: "Measurement context check",
      message: `Resting heart rate is ${hr.value} ${hr.unit} (${hr.delta.toLowerCase()}). Review conditions and mission procedures before acting on it.`,
      tone: hr.tone === "alert" ? "alert" : "amber",
    },
    {
      title: "Hydration reminder",
      message: `Fluid intake is ${remaining.toFixed(1)} L below the daily target of ${profile.targets.fluid.toFixed(1)} L.`,
      tone: remaining > 0.6 ? "amber" : "cyan",
    },
    {
      title: "Sensor health",
      message:
        "Biosuit cuff calibration is valid; signal quality remains within expected bounds.",
      tone: "green",
    },
  ];

  const nutritionTiles: { label: string; consumed: number; target: number; cap: number; range: Range | null; unit: string }[] = [
    { label: "Energy", consumed: totals.energy, target: profile.targets.energy, cap: profile.targets.energy, range: null, unit: "kcal" },
    { label: "Protein", consumed: totals.protein, target: profile.targets.protein, cap: macroCap(profile, "protein"), range: profile.ranges.protein ?? null, unit: "g" },
    { label: "Carbs", consumed: totals.carbs, target: profile.targets.carbs, cap: macroCap(profile, "carbs"), range: profile.ranges.carbs ?? null, unit: "g" },
    { label: "Fat", consumed: totals.fat, target: profile.targets.fat, cap: macroCap(profile, "fat"), range: profile.ranges.fat ?? null, unit: "g" },
    { label: "Fibre", consumed: totals.fibre, target: profile.targets.fibre, cap: profile.targets.fibre, range: null, unit: "g" },
    { label: "Fluid intake", consumed: fluid, target: profile.targets.fluid, cap: profile.targets.fluid, range: null, unit: "L" },
  ];

  const dashboardHrr: HrrKey[] = [
    "cardio",
    "fitness",
    "bone",
    "nutrition",
    "renal",
    "sleep",
    "behavior",
    "immune",
    "vision",
  ];

  return (
    <main className="px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-7xl">
        <nav aria-label="Dashboard sections" className="sticky top-24 z-20 mb-5 flex gap-2 overflow-x-auto rounded-2xl border border-slate-800/80 bg-[#070d18]/95 p-2 backdrop-blur-lg">
          {[
            ["health-overview", "Health status"],
            ["mission-alerts", "Alerts"],
            ["measurement-trends", "Trends"],
            ["body-systems", "Systems"],
            ["daily-plan", "Daily plan"],
            ["nutrition-summary", "Nutrition"],
            ["hrr-references", "NASA HRR"],
          ].map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              {label}
            </a>
          ))}
        </nav>

        <section id="health-overview" className="mb-6 scroll-mt-40 space-y-6">
          <div className="panel rounded-[26px] p-5 sm:p-6">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <SectionLabel>Mission timeline</SectionLabel>
                <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {profile.callsign} flight dashboard
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                  {profile.name} · {profile.role}
                </p>
                <p className="mt-1 text-xs text-slate-500 tabular-nums">
                  {profile.sex} · {profile.age} y · {profile.heightCm} cm · {profile.weightKg} kg ·{" "}
                  {profile.targets.energy.toLocaleString()} kcal/day
                </p>
              </div>

              <div className="rounded-2xl border border-sky-400/20 bg-gradient-to-br from-sky-500/15 via-slate-900/40 to-slate-900/40 px-4 py-3 text-right">
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Ship time</p>
                <p className="mt-0.5 text-xl font-semibold tracking-tight text-sky-200 tabular-nums">
                  {profile.missionDay} • 14:32
                </p>
                <p className="text-xs text-slate-400 tabular-nums">UTC 18:32 • MET 43:21</p>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-t border-slate-800/80 pt-5">
              <div>
                <SectionLabel>Current health</SectionLabel>
                <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-white">Vitals at a glance</h2>
              </div>
              <p className="text-xs text-slate-500">Latest recorded measurements</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {profile.metrics.map((metric) => (
                <article
                  key={metric.label}
                  className="tile flex flex-col rounded-2xl p-4 transition-colors duration-200 hover:border-slate-600/80 hover:bg-slate-800/50"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase leading-snug tracking-[0.14em] text-slate-400">
                        {metric.label}
                      </p>
                      <div className="mt-1.5 flex items-baseline gap-1.5">
                        <span className="text-[2.1rem] font-semibold leading-none tracking-tight text-white tabular-nums">
                          {metric.value}
                        </span>
                        <span className="text-xs font-medium text-slate-400">{metric.unit}</span>
                      </div>
                    </div>
                    <TonePill tone={metric.tone} />
                  </div>

                  <div className="mb-3">
                    <Meter value={metric.progress} target={100} label={`${metric.label} indicator`} tone={metric.tone} />
                  </div>

                  <div className="flex items-start justify-between gap-3 border-t border-slate-700/60 pt-2.5">
                    <span className="text-xs font-semibold text-slate-200">{metric.delta}</span>
                    <span className="text-right text-xs leading-snug text-slate-400">{metric.detail}</span>
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {metric.hrr.map((key) => (
                      <HrrChip key={key} riskKey={key} />
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
            <div className="panel rounded-[26px] p-5">
              <div id="mission-alerts" className="mb-4 flex scroll-mt-40 items-center justify-between gap-3">
                <div>
                  <SectionLabel>Needs attention</SectionLabel>
                  <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-white">Crew alerts</h2>
                </div>
                <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-amber-200 ring-1 ring-inset ring-amber-400/25">
                  {alerts.length} to review
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {alerts.map((alert) => {
                  const tone = ALERT_BOX[alert.tone] ?? ALERT_BOX.amber;

                  return (
                    <div
                      key={alert.title}
                      className={`relative overflow-hidden rounded-2xl border p-3.5 pl-4 ${tone.box}`}
                    >
                      <span aria-hidden className={`absolute inset-y-3 left-0 w-[3px] rounded-full ${tone.bar}`} />
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <p className={`text-sm font-semibold ${tone.title}`}>{alert.title}</p>
                        <TonePill tone={alert.tone} />
                      </div>
                      <p className="text-[13px] leading-6 text-slate-300">{alert.message}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="panel rounded-[26px] p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <SectionLabel>Procedure review</SectionLabel>
                <span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-sky-200 ring-1 ring-inset ring-sky-400/25">
                  Mission
                </span>
              </div>

              <ul className="space-y-2 text-sm leading-5 text-slate-300">
                {procedureRefs.map((item, index) => (
                  <li
                    key={index}
                    className="flex gap-3 rounded-xl border border-slate-700/60 bg-slate-900/50 p-3 transition-colors duration-200 hover:border-slate-600/70 hover:bg-slate-800/50"
                  >
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-[10px] font-bold text-sky-200 ring-1 ring-inset ring-sky-400/25 tabular-nums">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div id="measurement-trends" className="panel scroll-mt-40 rounded-[26px] p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <SectionLabel>History and trend</SectionLabel>
                <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-white">Measurement review</h2>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                <span aria-hidden className="h-2 w-2 rounded-full bg-sky-400" /> Baseline
                <span aria-hidden className="ml-3 h-2 w-2 rounded-full bg-emerald-400" /> Current
              </div>
            </div>

            <div className="tile overflow-hidden rounded-2xl">
              <svg
                viewBox="0 0 390 130"
                role="img"
                aria-label="Heart-rate history chart"
                preserveAspectRatio="none"
                className="h-48 w-full"
              >
                <defs>
                  <linearGradient id="timeFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgba(56,189,248,0.24)" />
                    <stop offset="100%" stopColor="rgba(56,189,248,0)" />
                  </linearGradient>
                  <linearGradient id="lineChart" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="55%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                </defs>

                {[0, 1, 2, 3].map((row) => (
                  <line
                    key={row}
                    x1="0"
                    y1={18 + row * 22}
                    x2="390"
                    y2={18 + row * 22}
                    stroke="rgba(148,163,184,0.14)"
                    strokeDasharray="4 8"
                  />
                ))}

                <path d={fillTrend} fill="url(#timeFill)" />
                <path d={trendPath} fill="none" stroke="url(#lineChart)" strokeWidth="2.6" strokeLinecap="round" />
                <circle cx="382" cy="18" r="7" fill="rgba(52,211,153,0.18)" />
                <circle cx="382" cy="18" r="3.2" fill="#34d399" stroke="#05080f" strokeWidth="1.4" />
              </svg>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="tile rounded-2xl p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Trend</p>
                <p className={`mt-1.5 text-base font-semibold tracking-tight ${toneText(hr.tone)}`}>
                  {hr.tone === "alert" ? "Needs review" : hr.tone === "watch" ? "Slightly elevated" : "Relatively stable"}
                </p>
                <p className="text-xs text-slate-400">14-day window • MBK test</p>
              </div>

              <div className="tile rounded-2xl p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Baseline</p>
                <p className="mt-1.5 text-base font-semibold tracking-tight text-white tabular-nums">68–75 bpm</p>
                <p className="text-xs text-slate-400">Personal reference band</p>
              </div>

              <div className="tile rounded-2xl p-3.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Projection</p>
                <p className="mt-1.5 text-base font-semibold tracking-tight text-white tabular-nums">71–74 bpm</p>
                <p className="text-xs text-slate-400">3-day statistical range</p>
              </div>
            </div>
          </div>

          <div id="body-systems" className="panel scroll-mt-40 rounded-[26px] p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <SectionLabel>Body status</SectionLabel>
                <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-white">System view</h2>
              </div>
            </div>

            <div className="relative mx-auto h-[320px] w-full max-w-[260px] overflow-hidden rounded-2xl border border-slate-700/70 bg-[radial-gradient(circle_at_50%_14%,rgba(56,189,248,0.16),transparent_58%),linear-gradient(180deg,#0b1526,#070c17)]">
              <div aria-hidden className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/2 top-1/2 h-[250px] w-[250px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-400/15" />
                <div className="absolute left-1/2 top-1/2 h-[184px] w-[184px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-sky-400/20" />
                <div className="scan-line absolute inset-x-3 top-0 h-16 bg-[linear-gradient(180deg,transparent,rgba(56,189,248,0.16),transparent)]" />
              </div>

              <svg viewBox="0 0 200 300" aria-hidden="true" className="relative mx-auto h-full w-auto">
                <defs>
                  <linearGradient id="bodyFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(56,189,248,0.22)" />
                    <stop offset="100%" stopColor="rgba(56,189,248,0.03)" />
                  </linearGradient>
                </defs>

                <g stroke="rgba(125,211,252,0.5)" strokeWidth="1.4" fill="url(#bodyFill)">
                  <ellipse cx="100" cy="44" rx="17" ry="19" />
                  <rect x="92" y="61" width="16" height="10" rx="5" />
                  <path d="M82 72 q18 -6 36 0 l5 52 q1 16 -23 16 q-24 0 -23 -16 z" />
                  <rect x="63" y="76" width="11" height="62" rx="5.5" />
                  <rect x="126" y="76" width="11" height="62" rx="5.5" />
                  <rect x="84" y="138" width="12" height="78" rx="6" />
                  <rect x="104" y="138" width="12" height="78" rx="6" />
                </g>
              </svg>

              {profile.systems.map((card, index) => {
                const position = SYSTEM_POSITIONS[index] ?? SYSTEM_POSITIONS[0];

                return (
                  <div
                    key={card.label}
                    title={card.hrr.map((key) => `HRR ${key}`).join(", ")}
                    className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-slate-700/70 bg-slate-950/90 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] shadow-[0_6px_16px_rgba(0,0,0,0.55)]"
                    style={{ left: position.left, top: position.top }}
                  >
                    <span className={toneText(card.tone)}>{card.label}</span>
                    <span className="ml-1 text-slate-300 tabular-nums">{card.value}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2">
              {profile.systems.map((card) => (
                <div key={card.label} className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                    {card.label}
                  </span>
                  <span className="flex gap-1">
                    {card.hrr.map((key) => (
                      <HrrChip key={key} riskKey={key} />
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-6 lg:grid-cols-[1.04fr_0.96fr]">
          <div id="daily-plan" className="panel scroll-mt-40 rounded-[26px] p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <SectionLabel>Daily plan</SectionLabel>
                <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-white">Automatic tracking</h2>
              </div>
              <button
                type="button"
                className="rounded-full border border-sky-400/30 bg-sky-500/15 px-3.5 py-1.5 text-xs font-semibold text-sky-100 transition-colors duration-200 hover:border-sky-300/50 hover:bg-sky-500/25 hover:text-white"
              >
                Review tasks
              </button>
            </div>

            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.name}
                  className="tile flex gap-3.5 rounded-2xl p-3.5 transition-colors duration-200 hover:border-slate-600/80 hover:bg-slate-800/50"
                >
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-sm font-bold text-emerald-300 ring-1 ring-inset ring-emerald-400/25">
                    ✓
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-semibold text-white">{task.name}</p>
                      <span className="w-fit rounded-full border border-slate-700/70 bg-slate-900/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 tabular-nums">
                        {task.time}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-slate-300">{task.source}</span>
                      <span className="text-slate-600">•</span>
                      <span className="font-medium text-sky-300">{task.detail}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div id="nutrition-summary" className="panel scroll-mt-40 rounded-[26px] p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <SectionLabel>Nutrition</SectionLabel>
                <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-white">Energy and fluids</h2>
              </div>
              <TonePill tone="cyan" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {nutritionTiles.map((item) => {
                const percent = pct(item.consumed, item.cap);
                const goal = item.range
                  ? `${item.range.min}–${item.range.max}`
                  : item.unit === "L"
                    ? item.target.toFixed(1)
                    : item.target.toLocaleString();

                return (
                  <div key={item.label} className="tile rounded-2xl p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        {item.label}
                      </p>
                      <span className="text-[10px] font-bold text-slate-500 tabular-nums">{percent}%</span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="text-[1.75rem] font-semibold leading-none tracking-tight text-white tabular-nums">
                        {item.unit === "L" ? item.consumed.toFixed(2) : item.consumed.toLocaleString()}
                      </span>
                      <span className="text-xs font-medium text-slate-400">
                        / {goal} {item.unit}
                      </span>
                    </div>
                    <div className="mt-2.5">
                      {item.range ? (
                        <RangeMeter value={item.consumed} range={item.range} label={`${item.label} intake`} tone="cyan" height="h-1.5" />
                      ) : (
                        <Meter value={item.consumed} target={item.cap} label={`${item.label} target`} tone="cyan" height="h-1.5" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="tile mt-4 rounded-2xl p-4">
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">Fluid target progress</p>
                <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-sky-200 ring-1 ring-inset ring-sky-400/25 tabular-nums">
                  {fluidPercent}%
                </span>
              </div>
              <Meter value={fluid} target={profile.targets.fluid} label="Hydration minimum" tone="cyan" height="h-2" />
              <p className="mt-2.5 text-sm text-slate-300">
                {fluid.toFixed(2)} L logged • target {profile.targets.fluid.toFixed(1)} L • {remaining.toFixed(2)} L
                remaining
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <Link
                  href="/nutrition"
                  className="rounded-full border border-sky-400/30 bg-sky-500/15 px-3 py-1.5 text-xs font-semibold text-sky-100 transition-colors hover:border-sky-300/50 hover:bg-sky-500/25 hover:text-white"
                >
                  Log food or fluid →
                </Link>
                <span className="flex gap-1.5">
                  <HrrChip riskKey="nutrition" />
                  <HrrChip riskKey="renal" />
                </span>
              </div>
            </div>
          </div>
        </section>

        <section id="hrr-references" className="panel scroll-mt-40 rounded-[26px] p-5 sm:p-6">
          <div className="mb-4">
            <SectionLabel>NASA HRR references</SectionLabel>
            <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-white">Risks behind this dashboard</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
              Every parameter above maps to a Human Research Roadmap risk. Open a risk to read the evidence and
              mitigation approach behind the monitoring rules.
            </p>
          </div>
          <div className="grid gap-2 lg:grid-cols-2">
            {dashboardHrr.map((key) => (
              <HrrList key={key} keys={[key]} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

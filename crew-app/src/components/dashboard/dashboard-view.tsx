"use client";

import Link from "next/link";
import { useState } from "react";
import { useCrew } from "@/components/providers/crew-provider";
import { HrrChip, Meter, RangeMeter, SectionLabel, TonePill } from "@/components/shared/ui";
import { macroCap, pct, type Range, type Tone } from "@/lib/crew";
import { shiftDay } from "@/lib/records";

type TrendPoint = { label: string; value: number; timestamp: string };

function TrendChart({ title, unit, points, sample = false, sourceLabel, color = "var(--chart-energy)" }: { title: string; unit: string; points: TrendPoint[]; sample?: boolean; sourceLabel?: string; color?: string }) {
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || Math.max(1, Math.abs(max) * 0.1);
  const coords = points.map((point, index) => ({
    ...point,
    x: 12 + (index / Math.max(1, points.length - 1)) * 356,
    y: 92 - ((point.value - (min - span * 0.12)) / (span * 1.24)) * 72,
  }));
  const path = coords.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");

  return (
    <article className="tile min-w-0 rounded-2xl p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="mt-0.5 text-[10px] text-slate-500">{sourceLabel ?? (sample ? "Illustrative sample · not measured history" : "Crew-logged entries")}</p>
        </div>
        <span className="text-xs text-slate-400">{unit}</span>
      </div>
      <svg viewBox="0 0 380 124" role="img" aria-label={`${title} timestamped trend`} className="h-40 w-full overflow-visible">
        {[20, 44, 68, 92].map((y) => <line key={y} x1="8" y1={y} x2="372" y2={y} stroke="rgba(148,163,184,0.14)" strokeDasharray="3 6" />)}
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((point, index) => (
          <g key={`${point.timestamp}-${index}`}>
            <circle cx={point.x} cy={point.y} r="3.5" fill={color}>
              <title>{point.timestamp}: {point.value} {unit}</title>
            </circle>
          </g>
        ))}
        <text x="10" y="119" fill="#94a3b8" fontSize="9">{coords[0]?.label}</text>
        <text x="370" y="119" fill="#94a3b8" fontSize="9" textAnchor="end">{coords.at(-1)?.label}</text>
      </svg>
      <div className="flex justify-between gap-2 border-t border-slate-800/70 pt-2 text-[10px] text-slate-400 tabular-nums">
        <span>{points[0]?.timestamp}</span>
        <span>{points.at(-1)?.value} {unit} · {points.at(-1)?.timestamp}</span>
      </div>
    </article>
  );
}

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

const ALERT_BOX: Record<Tone, { box: string; bar: string; title: string }> = {
  amber: { box: "border-amber-400/20 bg-amber-500/[0.07]", bar: "bg-amber-400", title: "text-amber-100" },
  watch: { box: "border-amber-400/20 bg-amber-500/[0.07]", bar: "bg-amber-400", title: "text-amber-100" },
  cyan: { box: "border-sky-400/20 bg-sky-500/[0.07]", bar: "bg-sky-400", title: "text-sky-100" },
  green: { box: "border-emerald-400/20 bg-emerald-500/[0.07]", bar: "bg-emerald-400", title: "text-emerald-100" },
  stable: { box: "border-emerald-400/20 bg-emerald-500/[0.07]", bar: "bg-emerald-400", title: "text-emerald-100" },
  alert: { box: "border-rose-400/20 bg-rose-500/[0.07]", bar: "bg-rose-400", title: "text-rose-100" },
};

export function DashboardView() {
  const { profile, totals, fluid, meals, fluidLog, currentDay } = useCrew();
  const [trendRange, setTrendRange] = useState<"week" | "month">("week");

  const hr = profile.metrics.find((metric) => metric.label === "Resting HR") ?? profile.metrics[0];
  const trendCount = trendRange === "week" ? 7 : 30;
  // Use a stable seed until the provider supplies the crew's UTC day. Reading
  // the clock here would make the server and first browser render disagree.
  const trendEndDay = currentDay || "2000-01-07";
  const sampleTrend = (metricLabel: string, center: number, amplitude: number) => {
    const metric = profile.metrics.find((item) => item.label === metricLabel);
    const parsed = metricLabel === "Blood pressure"
      ? Number.parseFloat(metric?.value.split("/")[0] ?? "")
      : Number.parseFloat(metric?.value ?? "");
    const endValue = Number.isFinite(parsed) ? parsed : center;
    const sampleCount = trendCount;
    return Array.from({ length: sampleCount }, (_, index) => {
      const day = shiftDay(trendEndDay, index - sampleCount + 1);
      const value = index === sampleCount - 1 ? endValue : Math.round(center + Math.sin(index * 1.7) * amplitude + Math.cos(index * 0.8) * amplitude * 0.45);
      return { label: day.slice(5), value, timestamp: `${day} 08:00 UTC` };
    });
  };
  const sampleVitals = [
    { title: "Resting HR", unit: "bpm", points: sampleTrend("Resting HR", 70, 3), color: "var(--chart-energy)" },
    { title: "Blood pressure · systolic", unit: "mmHg", points: sampleTrend("Blood pressure", 116, 4), color: "var(--chart-carbs)" },
    { title: "SpO₂", unit: "%", points: sampleTrend("SpO₂", 97, 1), color: "var(--chart-fibre)" },
    { title: "Sleep", unit: "h", points: sampleTrend("Sleep", profile.sleep.hours, 0.7), color: "var(--chart-protein)" },
  ];
  const mealTimeline = meals
    .filter((meal) => meal.date === currentDay || !meal.date)
    .slice()
    .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))
    .map((meal) => ({
      label: meal.loggedAt.slice(0, 5),
      value: meals.filter((entry) => (entry.date === currentDay || !entry.date) && entry.loggedAt <= meal.loggedAt).reduce((sum, entry) => sum + entry.macros.energy, 0),
      timestamp: `${currentDay} ${meal.loggedAt}`,
    }));
  const fluidTimeline = fluidLog
    .filter((entry) => entry.date === currentDay)
    .slice()
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((entry, index, entries) => ({
      label: entry.at.slice(0, 5),
      value: Math.max(0, entries.slice(0, index + 1).reduce((sum, item) => sum + item.ml, 0) / 1000),
      timestamp: `${entry.date} ${entry.at}`,
    }));
  const energyPoints = mealTimeline.length ? mealTimeline : [{ label: "Today", value: totals.energy, timestamp: `${currentDay} · current total` }];
  const fluidPoints = fluidTimeline.length ? fluidTimeline : [{ label: "Today", value: fluid, timestamp: `${currentDay} · current total` }];
  const energySourceLabel = meals.length > 0 && meals.every((meal) => meal.source?.record === "demo-seed")
    ? "Demo meal log · not live telemetry"
    : "Meal log · timestamped entries";
  const fluidSourceLabel = fluidLog.filter((entry) => entry.date === currentDay).every((entry) => entry.source === "demo-seed")
    ? "Demo fluid log · not live telemetry"
    : "Fluid log · timestamped entries";
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

  return (
    <main className="px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-7xl">
        <nav aria-label="Dashboard sections" className="mb-5 flex gap-2 overflow-x-auto rounded-2xl border border-slate-800/80 bg-[#070d18]/95 p-2">
          {[
            ["health-overview", "Health status"],
            ["mission-alerts", "Alerts"],
            ["measurement-trends", "Trends"],
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
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Mission day</p>
                <p className="mt-0.5 text-xl font-semibold tracking-tight text-sky-200 tabular-nums">
                  {profile.missionDay}
                </p>
                <p className="text-xs text-slate-400">Live UTC clock in the header</p>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-t border-slate-800/80 pt-5">
              <div>
                <SectionLabel>Current health</SectionLabel>
                <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-white">Vitals at a glance</h2>
              </div>
              <p className="text-xs text-slate-500">Sample profile data · not live telemetry</p>
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
                        <span className="text-[2.5rem] font-bold leading-none tracking-tight text-white tabular-nums sm:text-5xl">
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

        <section className="mb-6">
          <div id="measurement-trends" className="panel scroll-mt-40 rounded-[26px] p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <SectionLabel>Timestamped trends</SectionLabel>
                <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-white">For You parameters</h2>
                <p className="mt-1 text-xs text-slate-400">Vital histories are illustrative samples, not recorded sensor readings.</p>
              </div>
              <div role="group" aria-label="Trend time range" className="flex rounded-xl border border-slate-700 bg-slate-950/70 p-1">
                {(["week", "month"] as const).map((range) => (
                  <button key={range} type="button" aria-pressed={trendRange === range} onClick={() => setTrendRange(range)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${trendRange === range ? "bg-sky-500/20 text-sky-100" : "text-slate-300 hover:bg-slate-800"}`}>
                    {range === "week" ? "Weekly" : "Monthly"}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {sampleVitals.map((chart) => <TrendChart key={chart.title} {...chart} sample />)}
              <TrendChart title="Energy intake" unit="kcal" points={energyPoints} sourceLabel={energySourceLabel} color="var(--chart-energy)" />
              <TrendChart title="Fluid intake" unit="L" points={fluidPoints} sourceLabel={fluidSourceLabel} color="var(--chart-fluid)" />
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
              <Link
                href="/monitoring"
                className="rounded-full border border-sky-400/30 bg-sky-500/15 px-3.5 py-2 text-sm font-semibold text-sky-100 transition-colors duration-200 hover:border-sky-300/50 hover:bg-sky-500/25 hover:text-white"
              >
                Review tasks
              </Link>
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

      </div>
    </main>
  );
}

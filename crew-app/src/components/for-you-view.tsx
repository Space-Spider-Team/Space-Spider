"use client";

import Link from "next/link";
import { useCrew } from "@/components/crew-provider";
import { HrrChip, HrrList, Meter, RangeMeter, SectionLabel, TonePill, toneText } from "@/components/ui";
import {
  FLUID_STEP,
  MACRO_META,
  MOOD_SCALE,
  buildPriorities,
  macroCap,
  pct,
  rangeStatus,
  type HrrKey,
} from "@/lib/crew";

const FOR_YOU_HRR: HrrKey[] = ["cardio", "nutrition", "sleep", "behavior", "renal"];

export function ForYouView() {
  const { profile, totals, fluid, drinkFluid, mood, moodTrack, addFluid, setMood } = useCrew();

  const priorities = buildPriorities(profile, totals, fluid, mood?.level, moodTrack);
  const fluidPercent = pct(fluid, profile.targets.fluid);
  const remaining = Math.max(0, profile.targets.fluid - fluid);

  const hr = profile.metrics.find((metric) => metric.label === "Resting HR") ?? profile.metrics[0];
  const sleepMetric = profile.metrics.find((metric) => metric.label === "Sleep") ?? profile.metrics[3];

    const moodLabel = MOOD_SCALE.find((item) => item.level === mood?.level)?.label;

  return (
    <main className="px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="panel rounded-[26px] p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <SectionLabel>For you · {profile.callsign}</SectionLabel>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Welcome back, {profile.name.split(" ").slice(-1)[0]}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{profile.focus}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="profile-role rounded-full px-3 py-1.5">
                {profile.role}
              </span>
              <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-200">
                Sample profile
              </span>
              <span className="rounded-full border border-slate-700/80 bg-slate-900/70 px-3 py-1.5 text-slate-300 tabular-nums">
                {profile.sex} · {profile.age} y · {profile.heightCm} cm · {profile.weightKg} kg
              </span>
              <span className="rounded-full border border-sky-400/25 bg-sky-500/10 px-3 py-1.5 font-medium text-sky-200 tabular-nums">
                {profile.missionDay}
              </span>
              <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1.5 font-medium text-emerald-200">
                {profile.targets.energy.toLocaleString()} kcal target
              </span>
            </div>
          </div>
        </section>

        <nav aria-label="Quick actions" className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/nutrition#food-log"
            className="panel flex min-h-16 items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-white transition hover:border-sky-400/40 hover:bg-slate-900"
          >
            <span><span aria-hidden className="mr-2 text-sky-300">⌕</span>Log a meal</span>
            <span aria-hidden className="text-slate-500">→</span>
          </Link>
          <button
            type="button"
            onClick={() => addFluid(FLUID_STEP)}
            className="panel flex min-h-16 items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold text-white transition hover:border-sky-400/40 hover:bg-slate-900"
          >
            <span><span aria-hidden className="mr-2 text-sky-300">＋</span>Log 250 mL water</span>
            <span className="text-xs font-medium text-slate-400">{fluid.toFixed(2)} L</span>
          </button>
          <a
            href="#daily-check-in"
            className="panel flex min-h-16 items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-white transition hover:border-sky-400/40 hover:bg-slate-900"
          >
            <span><span aria-hidden className="mr-2 text-sky-300">♡</span>Daily check-in</span>
            <span aria-hidden className="text-slate-500">↓</span>
          </a>
        </nav>

        <section aria-labelledby="priorities-heading">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <SectionLabel>Priorities today</SectionLabel>
              <h2 id="priorities-heading" className="mt-1.5 text-2xl font-semibold tracking-tight text-white">
                What to pay attention to
              </h2>
            </div>
            <Link
              href="/nutrition"
              className="rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-sky-400/40 hover:text-sky-200"
            >
              Log food or fluid
            </Link>
          </div>

          {priorities.length === 0 ? (
            <div className="panel rounded-2xl p-5 text-sm text-slate-300">
              Every tracked parameter is on pace for this point in the day.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {priorities.map((item) => (
                <article key={item.title} className="panel flex flex-col rounded-2xl p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className={`text-sm font-semibold ${toneText(item.tone)}`}>{item.title}</p>
                  </div>
                  <p className="flex-1 text-[13px] leading-6 text-slate-300">{item.body}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-800/80 pt-3">
                    {item.hrr.map((key) => (
                      <HrrChip key={key} riskKey={key} />
                    ))}
                  </div>
                  <Link
                    href={item.title.toLowerCase().includes("hydration") ? "/nutrition#hydration" : "/nutrition#daily-targets"}
                    className="mt-3 inline-flex min-h-10 items-center text-xs font-semibold text-sky-300 hover:text-sky-100"
                  >
                    View nutrition details →
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <section className="panel rounded-[26px] p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <SectionLabel>Health snapshot</SectionLabel>
                <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-white">Today at a glance</h2>
              </div>
              <Link href="/dashboard" className="text-xs font-semibold text-sky-300 hover:text-sky-200">
                Full dashboard →
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <article className="tile rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Resting HR</p>
                  <TonePill tone={hr.tone} />
                </div>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-white tabular-nums">
                  {hr.value} <span className="text-xs font-medium text-slate-400">{hr.unit}</span>
                </p>
                <p className="mt-1 text-xs text-slate-400">{hr.delta}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {hr.hrr.map((key) => (
                    <HrrChip key={key} riskKey={key} />
                  ))}
                </div>
              </article>

              <article className="tile rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Sleep last night</p>
                  <TonePill tone={sleepMetric.tone} />
                </div>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-white tabular-nums">
                  {profile.sleep.hours} <span className="text-xs font-medium text-slate-400">hrs</span>
                </p>
                <p className="mt-1 text-xs text-slate-400">Target {profile.sleep.target} h</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <HrrChip riskKey="sleep" />
                  <HrrChip riskKey="behavior" />
                </div>
              </article>

              <article className="tile rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Energy</p>
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 tabular-nums">
                    {pct(totals.energy, profile.targets.energy)}%
                  </span>
                </div>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-white tabular-nums">
                  {totals.energy.toLocaleString()}{" "}
                  <span className="text-xs font-medium text-slate-400">/ {profile.targets.energy.toLocaleString()} kcal</span>
                </p>
                <div className="mt-3">
                  <Meter value={totals.energy} target={profile.targets.energy} label="Energy target" tone="cyan" />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <HrrChip riskKey="nutrition" />
                </div>
              </article>

              <article className="tile rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Fluid</p>
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 tabular-nums">
                    {fluidPercent}%
                  </span>
                </div>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-white tabular-nums">
                  {fluid.toFixed(2)} <span className="text-xs font-medium text-slate-400">/ {profile.targets.fluid.toFixed(1)} L min</span>
                </p>
                <div className="mt-3">
                  <Meter value={fluid} target={profile.targets.fluid} label="Fluid minimum" tone="cyan" />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <HrrChip riskKey="renal" />
                </div>
              </article>
            </div>
          </section>

          <div className="space-y-6">
            <section id="daily-check-in" className="panel scroll-mt-28 rounded-[26px] p-5">
              <div className="mb-1 flex items-center justify-between gap-3">
                <SectionLabel>Daily check-in</SectionLabel>
                <div className="flex gap-1.5">
                  <HrrChip riskKey="behavior" />
                  <HrrChip riskKey="team" />
                </div>
              </div>
              <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-white">How are you feeling?</h2>
              <p className="mt-1 text-xs text-slate-400">One tap per day. Shared with your flight surgeon.</p>

              <div className="mt-4 grid grid-cols-5 gap-1.5">
                {MOOD_SCALE.map((item) => {
                  const active = mood?.level === item.level;
                  return (
                    <button
                      key={item.level}
                      type="button"
                      onClick={() => setMood(item.level)}
                      aria-pressed={active}
                      aria-label={`Mood: ${item.label}`}
                      className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 transition-colors ${
                        active
                          ? "border-sky-400/40 bg-sky-500/15"
                          : "border-slate-700/70 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-800/60"
                      }`}
                    >
                      <span aria-hidden className="text-lg leading-none">
                        {item.glyph}
                      </span>
                      <span className={`text-[10px] font-semibold ${active ? "text-sky-100" : "text-slate-400"}`}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {mood ? (
                <p className="mt-3 text-xs font-medium text-emerald-300">
                  Logged today: {moodLabel} ({mood.level}/5)
                </p>
              ) : (
                <p className="mt-3 text-xs text-amber-300/90">No check-in logged today yet.</p>
              )}

              <div className="mt-4 border-t border-slate-800/80 pt-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Last 7 days</p>
                <div className="flex items-end gap-1.5">
                  {moodTrack.map((level, index) => (
                    <div key={index} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-sm ${
                          level === null
                            ? "bg-slate-800"
                            : level <= 2
                              ? "bg-rose-400/80"
                              : level === 3
                                ? "bg-amber-400/80"
                                : "bg-emerald-400/80"
                        }`}
                        style={{ height: `${(level ?? 1) * 8}px` }}
                        title={level ? `Mood ${level}/5` : "No entry"}
                      />
                      <span className="text-[9px] text-slate-500">{index === 6 ? "Today" : `D-${6 - index}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="panel rounded-[26px] p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <SectionLabel>Hydration</SectionLabel>
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 tabular-nums">
                  {fluidPercent}%
                </span>
              </div>

              <p className="text-2xl font-semibold tracking-tight text-white tabular-nums">
                {fluid.toFixed(2)} L{" "}
                <span className="text-xs font-medium text-slate-400">
                  of {profile.targets.fluid.toFixed(1)} L minimum
                </span>
              </p>
              <div className="mt-3">
                <Meter value={fluid} target={profile.targets.fluid} label="Hydration minimum" tone="cyan" height="h-2.5" />
              </div>
              <p className="mt-2 text-xs text-slate-400">
                {remaining.toFixed(2)} L remaining to the minimum intake
              </p>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => addFluid(FLUID_STEP)}
                  className="flex-1 rounded-xl border border-sky-400/30 bg-sky-500/15 px-3 py-2.5 text-sm font-semibold text-sky-100 transition-colors hover:border-sky-300/50 hover:bg-sky-500/25 hover:text-white"
                >
                  +250 mL
                </button>
                <button
                  type="button"
                  onClick={() => addFluid(-FLUID_STEP)}
                  disabled={drinkFluid <= 0}
                  className="rounded-xl border border-slate-700/70 bg-slate-900/60 px-3 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  −250 mL
                </button>
              </div>
            </section>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <section className="panel rounded-[26px] p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <SectionLabel>Intake vs target</SectionLabel>
                <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-white">Consumed so far today</h2>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                {profile.targets.energy.toLocaleString()} kcal budget
              </span>
            </div>

            <div className="space-y-4">
              {MACRO_META.map((macro) => {
                const consumed = totals[macro.key];
                const range = profile.ranges[macro.key];
                const cap = macroCap(profile, macro.key);
                const percent = pct(consumed, cap);
                const status = range ? rangeStatus(consumed, range) : null;
                const goal = range ? `${range.min}–${range.max}` : cap.toLocaleString();
                const note =
                  range && status === "below"
                    ? `${percent}% of the upper target · ${range.min - consumed} ${macro.unit} below the floor`
                    : range && status === "above"
                      ? `${percent}% of the upper target · ${consumed - range.max} ${macro.unit} above the band`
                      : range
                        ? `${percent}% of the upper target · inside the ${range.min}–${range.max} ${macro.unit} band`
                        : `${percent}% of target · ${Math.max(0, cap - consumed).toLocaleString()} ${macro.unit} remaining`;

                return (
                  <div key={macro.key}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">{macro.label}</p>
                      <p className="text-xs text-slate-400 tabular-nums">
                        <span className="font-semibold text-slate-100">{consumed.toLocaleString()}</span> / {goal}{" "}
                        {macro.unit}
                      </p>
                    </div>
                    {range ? (
                      <RangeMeter value={consumed} range={range} label={`${macro.label} intake`} tone="cyan" />
                    ) : (
                      <Meter value={consumed} target={cap} label={`${macro.label} target`} tone="cyan" />
                    )}
                    <p
                      className={`mt-1 text-[10px] tabular-nums ${
                        status === "below" ? "text-amber-300/90" : status === "above" ? "text-sky-300/90" : "text-slate-500"
                      }`}
                    >
                      {note}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="panel rounded-[26px] p-5 sm:p-6">
            <div className="mb-4">
              <SectionLabel>NASA HRR references</SectionLabel>
              <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-white">Why these parameters matter</h2>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Human Research Roadmap risks linked to the values on this page.
              </p>
            </div>
            <HrrList keys={FOR_YOU_HRR} />
          </section>
        </div>
      </div>
    </main>
  );
}

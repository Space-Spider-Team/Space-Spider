const metrics = [
  {
    label: "Resting HR",
    value: "72",
    unit: "bpm",
    delta: "+4 vs baseline",
    tone: "watch",
    detail: "Measured after 20 min rest",
    progress: 72,
  },
  {
    label: "Blood pressure",
    value: "118/76",
    unit: "mmHg",
    delta: "Stable",
    tone: "stable",
    detail: "Seated, same cuff + arm",
    progress: 78,
  },
  {
    label: "SpO₂",
    value: "97",
    unit: "%",
    delta: "+1 from trend",
    tone: "stable",
    detail: "Signal quality 0.91",
    progress: 89,
  },
  {
    label: "Sleep",
    value: "7.4",
    unit: "hrs",
    delta: "-0.8 vs target",
    tone: "watch",
    detail: "Actigraphy + HRV match",
    progress: 68,
  },
];

const alerts = [
  {
    title: "Measurement context check",
    message:
      "Resting heart-rate readings differ from your recent baseline. Review conditions and mission procedures.",
    level: "amber",
  },
  {
    title: "Hydration reminder",
    message:
      "Fluid intake is 0.7 L below the daily target with 3 hours remaining in the cycle.",
    level: "cyan",
  },
  {
    title: "Sensor health",
    message:
      "Biosuit cuff calibration is valid; signal quality remains within expected bounds.",
    level: "green",
  },
];

const systemCards = [
  { label: "Cardio", value: "92%", state: "stable" },
  { label: "Bone", value: "81%", state: "watch" },
  { label: "Muscle", value: "88%", state: "stable" },
  { label: "Eyes", value: "76%", state: "watch" },
  { label: "Sleep", value: "69%", state: "stable" },
  { label: "Immune", value: "83%", state: "stable" },
];

const tasks = [
  { name: "Resistance circuit", time: "08:15 UTC", source: "Exercise telemetry", detail: "Verified • 92% confidence" },
  { name: "Blood pressure check", time: "09:30 UTC", source: "Smart cuff", detail: "Verified • 96% confidence" },
  { name: "Hydration log", time: "10:00 UTC", source: "Bottle dispenser", detail: "Recorded • 81% confidence" },
  { name: "Crew check-in", time: "11:20 UTC", source: "Message thread", detail: "Inferred • 67% confidence" },
];

const nutrition = [
  { label: "Energy target", value: "2,860", unit: "kcal", note: "Mission requirement" },
  { label: "Carbs", value: "392", unit: "g", note: "Target" },
  { label: "Protein", value: "153", unit: "g", note: "Target" },
  { label: "Fluid intake", value: "1.9", unit: "L", note: "07:00–18:00" },
];

const procedureRefs = [
  "Range check: resting HR must be reviewed against contextual baseline before any crew action.",
  "Hydration procedure: log fluid source, volume, and time if intake is below the ship target.",
  "Sleep review: if total sleep drops below 6 hours for 3 days, initiate baseline review with base station.",
];

const trendPath = "M8 78 C 42 68, 68 73, 98 58 S 160 45, 194 50 S 246 26, 290 38 S 344 12, 382 18";
const fillTrend = "M8 78 C 42 68, 68 73, 98 58 S 160 45, 194 50 S 246 26, 290 38 S 344 12, 382 18 L382 116 L8 116 Z";

function TonePill({ tone }: { tone: string }) {
  const classes: Record<string, string> = {
    stable: "bg-emerald-500/15 text-emerald-200 ring-1 ring-inset ring-emerald-400/30",
    watch: "bg-amber-500/15 text-amber-100 ring-1 ring-inset ring-amber-300/30",
    alert: "bg-rose-500/15 text-rose-100 ring-1 ring-inset ring-rose-400/30",
    cyan: "bg-cyan-500/15 text-cyan-100 ring-1 ring-inset ring-cyan-400/30",
    green: "bg-emerald-500/15 text-emerald-100 ring-1 ring-inset ring-emerald-400/30",
    amber: "bg-amber-500/15 text-amber-100 ring-1 ring-inset ring-amber-300/30",
  };

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${classes[tone] ?? classes.stable}`}>{tone}</span>;
}

function MetricCard({ metric }: { metric: (typeof metrics)[number] }) {
  return (
    <article className="glass-panel rounded-3xl p-4 shadow-[0_24px_80px_rgba(15,23,42,0.45)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{metric.label}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-white">{metric.value}</span>
            <span className="text-sm text-slate-400">{metric.unit}</span>
          </div>
        </div>
        <TonePill tone={metric.tone} />
      </div>

      <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-800/80">
        <div
          className={`h-full rounded-full ${metric.tone === "watch" ? "bg-amber-400" : metric.tone === "alert" ? "bg-rose-400" : "bg-emerald-400"}`}
          style={{ width: `${metric.progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-300">{metric.delta}</span>
        <span className="text-slate-500">{metric.detail}</span>
      </div>
    </article>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-6 text-slate-100 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="glass-panel mb-6 flex flex-col gap-4 rounded-[28px] border border-slate-800/80 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-lg font-black text-slate-950 shadow-lg shadow-cyan-500/30">
              S
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-200/80">Crew app</p>
              <h1 className="text-2xl font-semibold tracking-tight text-white">SageCare</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <div className="rounded-full border border-slate-700/80 bg-slate-900/70 px-3 py-1.5">Astronaut: Vega-06</div>
            <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-emerald-100">Offline-ready</div>
            <div className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-cyan-100">Link delay 04:22</div>
          </div>
        </header>

        <section className="mb-6 grid gap-6 lg:grid-cols-[1.75fr_1fr]">
          <div className="glass-panel rounded-[32px] border border-slate-800/80 p-5 sm:p-7">
            <div className="mb-5 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Mission timeline</p>
                <h2 className="mt-2 text-4xl font-semibold tracking-tight text-white">Flight dashboard</h2>
              </div>

              <div className="rounded-2xl border border-slate-700/80 bg-slate-950/60 px-4 py-3 text-right">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Ship time</p>
                <p className="mt-1 text-xl font-semibold text-cyan-100">SOL 184 • 14:32</p>
                <p className="text-xs text-slate-400">UTC 18:32 • MET 43:21</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <MetricCard key={metric.label} metric={metric} />
              ))}
            </div>
          </div>

          <aside className="space-y-5">
            <div className="glass-panel rounded-[28px] border border-slate-800/80 p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Notifications</p>
                <span className="rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-100">3 active</span>
              </div>

              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.title} className="rounded-2xl border border-slate-700/70 bg-slate-900/50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-white">{alert.title}</p>
                      <TonePill tone={alert.level} />
                    </div>
                    <p className="text-sm leading-6 text-slate-300">{alert.message}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel rounded-[28px] border border-slate-800/80 p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Procedure review</p>
                <span className="rounded-full bg-cyan-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100">Mission</span>
              </div>

              <ul className="space-y-3 text-sm leading-6 text-slate-300">
                {procedureRefs.map((item, index) => (
                  <li key={index} className="flex gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-3">
                    <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/15 text-[10px] font-bold text-cyan-100">{index + 1}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </section>

        <section className="mb-6 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="glass-panel rounded-[30px] border border-slate-800/80 p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">History and trend</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Measurement review</h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" /> Baseline
                <span className="ml-3 inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" /> Current
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-800/70 bg-slate-950/70 p-3">
              <svg viewBox="0 0 390 130" className="h-48 w-full text-slate-300" preserveAspectRatio="none" aria-label="Heart-rate history chart">
                <defs>
                  <linearGradient id="timeFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgba(34,211,238,0.35)" />
                    <stop offset="100%" stopColor="rgba(34,211,238,0)" />
                  </linearGradient>
                </defs>
                <g>
                  {[0, 1, 2, 3].map((row) => (
                    <line key={row} x1="0" y1={18 + row * 22} x2="390" y2={18 + row * 22} stroke="rgba(148,163,184,0.18)" strokeDasharray="4 6" />
                  ))}
                  <path d={fillTrend} fill="url(#timeFill)" opacity="0.8" />
                  <path d={trendPath} fill="none" stroke="url(#lineChart)" strokeWidth="3.2" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="lineChart" x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0%" stopColor="#67e8f9" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                  </defs>
                </g>
              </svg>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Trend</p>
                <p className="mt-2 text-lg font-medium text-white">Relatively stable</p>
                <p className="text-sm text-slate-400">14-day window • MBK test</p>
              </div>

              <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Baseline</p>
                <p className="mt-2 text-lg font-medium text-white">68–75 bpm</p>
                <p className="text-sm text-slate-400">Personal reference band</p>
              </div>

              <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Projection</p>
                <p className="mt-2 text-lg font-medium text-white">71–74 bpm</p>
                <p className="text-sm text-slate-400">3-day statistical range</p>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-[30px] border border-slate-800/80 p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Body status</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">System view</h3>
              </div>
            </div>

            <div className="relative mx-auto h-[320px] w-full max-w-[260px] rounded-[28px] border border-slate-800/70 bg-[radial-gradient(circle_at_50%_20%,rgba(34,211,238,0.12),transparent_35%),linear-gradient(180deg,#0f172a,#020617)] p-4">
              <div className="absolute left-1/2 top-6 h-16 w-16 -translate-x-1/2 rounded-full border border-cyan-400/40 bg-sky-400/10" />
              <div className="absolute left-1/2 top-[4.8rem] h-20 w-20 -translate-x-1/2 rounded-[30%] border border-cyan-400/30 bg-sky-400/5" />
              <div className="absolute left-1/2 top-[8.8rem] h-20 w-14 -translate-x-1/2 rounded-[24px] border border-cyan-400/30 bg-sky-400/5" />
              <div className="absolute left-[62px] top-[9.4rem] h-20 w-4 rounded-full border border-cyan-400/30 bg-sky-400/5" />
              <div className="absolute right-[62px] top-[9.4rem] h-20 w-4 rounded-full border border-cyan-400/30 bg-sky-400/5" />
              <div className="absolute left-[94px] top-[15.5rem] h-20 w-4 rounded-full border border-cyan-400/30 bg-sky-400/5" />
              <div className="absolute right-[94px] top-[15.5rem] h-20 w-4 rounded-full border border-cyan-400/30 bg-sky-400/5" />

              {systemCards.map((card, index) => {
                const position = [
                  { left: "50%", top: "18%" },
                  { left: "24%", top: "30%" },
                  { left: "73%", top: "30%" },
                  { left: "32%", top: "53%" },
                  { left: "68%", top: "53%" },
                  { left: "50%", top: "68%" },
                ][index];

                return (
                  <div
                    key={card.label}
                    className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
                    style={{ left: position.left, top: position.top }}
                  >
                    <span className={card.state === "watch" ? "text-amber-200" : "text-emerald-200"}>{card.label}</span>
                    <span className="ml-1 text-slate-300">{card.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.04fr_0.96fr]">
          <div className="glass-panel rounded-[30px] border border-slate-800/80 p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Daily plan</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Automatic tracking</h3>
              </div>
              <button className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-100">Review tasks</button>
            </div>

            <div className="space-y-3">
              {tasks.map((task) => (
                <div key={task.name} className="flex gap-4 rounded-2xl border border-slate-700/70 bg-slate-900/60 p-3">
                  <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-100">✓</div>
                  <div className="flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-medium text-white">{task.name}</p>
                      <span className="text-xs uppercase tracking-[0.18em] text-slate-400">{task.time}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-300">
                      <span>{task.source}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-cyan-200">{task.detail}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-[30px] border border-slate-800/80 p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Nutrition</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Energy and fluids</h3>
              </div>
              <TonePill tone="cyan" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {nutrition.map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-semibold text-white">{item.value}</span>
                    <span className="text-sm text-slate-400">{item.unit}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{item.note}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-white">Fluid target progress</p>
                <span className="text-xs uppercase tracking-[0.18em] text-cyan-200">72%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
              </div>
              <p className="mt-3 text-sm text-slate-300">1.9 L logged • target 2.6 L • 0.7 L remaining</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

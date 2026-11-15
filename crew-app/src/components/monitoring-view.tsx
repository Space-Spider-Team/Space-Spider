"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useCrew } from "@/components/crew-provider";
import { HrrChip, SectionLabel, TonePill } from "@/components/ui";

type BpPoint = { day: string; systolic: number; diastolic: number; timestamp: string };
type SleepPoint = { day: string; duration: number; bedtime: string; wake: string; quality?: number; efficiency?: number };
type ExerciseKind = "ared" | "cycle" | "treadmill" | "other";
type ExerciseRecord = {
  id: string;
  date: string;
  kind: ExerciseKind;
  name: string;
  duration: number;
  intensity: string;
  met: number;
  calories: number;
  heartRate?: number;
  startAt: string;
  endAt: string;
  power?: number;
  resistance?: number;
  cadence?: number;
  speed?: number;
  incline?: number;
  harnessKg?: number;
  rangeOfMotion?: string;
  workloadDetails?: string;
  loadKg?: number;
  sets?: number;
  reps?: number;
  volumeLoad?: number;
  peakForce?: number;
  torque?: number;
};
type PrebreatheRecord = {
  protocol: string;
  requiredMinutes: number;
  start: string;
  finish: string;
  method: string;
  oxygenPercent: string;
  cabinPressure: number;
  suitPressure: number;
  depressuriseStart: string;
  depressuriseEnd: string;
  evaStart: string;
  evaEnd: string;
  repressTime: string;
};
type MonitoringRecord = {
  bp: BpPoint[];
  sleep: SleepPoint[];
  exercise: ExerciseRecord[];
  prebreathe: PrebreatheRecord;
  symptoms: string[];
  symptomEvents: { symptom: string; timestamp: string }[];
};

const STORAGE_KEY = "sagecare.monitoring.v1";
const DAYS = ["D−6", "D−5", "D−4", "D−3", "D−2", "D−1", "Today"];
const SYMPTOMS = [
  "Joint or muscle pain",
  "Numbness or tingling",
  "Weakness",
  "Dizziness",
  "Skin rash or unusual skin changes",
  "Breathing difficulty",
];
const EMPTY_PREBREATHE: PrebreatheRecord = {
  protocol: "",
  requiredMinutes: 0,
  start: "",
  finish: "",
  method: "",
  oxygenPercent: "",
  cabinPressure: 0,
  suitPressure: 0,
  depressuriseStart: "",
  depressuriseEnd: "",
  evaStart: "",
  evaEnd: "",
  repressTime: "",
};

function seededRecord(profile: ReturnType<typeof useCrew>["profile"]): MonitoringRecord {
  const [systolic, diastolic] = (profile.metrics.find((item) => item.label === "Blood pressure")?.value ?? "118/76")
    .split("/")
    .map(Number);
  const sleepHours = profile.sleep.hours;
  return {
    bp: DAYS.map((day, index) => ({
      day,
      systolic: Math.max(100, systolic + [2, -1, 1, 0, -2, 1, 0][index]),
      diastolic: Math.max(60, diastolic + [1, 0, -1, 2, -1, 1, 0][index]),
      timestamp: `${day} · simulated`,
    })),
    sleep: DAYS.map((day, index) => ({
      day,
      duration: Math.max(4, Math.round((sleepHours + [-0.5, 0.1, -0.2, 0.3, -0.4, 0.2, 0][index]) * 10) / 10),
      bedtime: ["22:40", "22:25", "23:05", "22:35", "23:20", "22:50", "22:30"][index],
      wake: ["06:20", "06:15", "06:35", "06:10", "06:30", "06:25", "06:20"][index],
    })),
    exercise: [],
    prebreathe: EMPTY_PREBREATHE,
    symptoms: [],
    symptomEvents: [],
  };
}

function makeRecord(base: MonitoringRecord, patch: Partial<MonitoringRecord>): MonitoringRecord {
  return { ...base, ...patch };
}

function bpCategory(systolic: number, diastolic: number) {
  if (systolic >= 140 || diastolic >= 90) return "Stage 2";
  if (systolic >= 130 || diastolic >= 80) return "Stage 1";
  if (systolic >= 120 && diastolic < 80) return "Elevated";
  return "Normal";
}

function getMet(kind: ExerciseKind, intensity: string) {
  if (kind === "treadmill") return intensity === "vigorous" ? 10.5 : 3.8;
  if (kind === "cycle") return intensity === "vigorous" ? 8 : 6;
  if (kind === "ared") return intensity === "vigorous" ? 6 : 3.5;
  return intensity === "vigorous" ? 6 : 3;
}

function LineChart({
  title,
  xLabel,
  yLabel,
  series,
  minimum,
  maximum,
  referenceLines = [],
}: {
  title: string;
  xLabel: string;
  yLabel: string;
  series: { label: string; values: number[]; color: string; dashed?: boolean }[];
  minimum: number;
  maximum: number;
  referenceLines?: { value: number; label: string }[];
}) {
  const left = 42, top = 12, width = 390, height = 140;
  const y = (value: number) => top + height - ((value - minimum) / Math.max(1, maximum - minimum)) * height;
  const x = (index: number, count: number) => left + (count <= 1 ? 0 : (index / (count - 1)) * width);
  return (
    <div className="tile rounded-2xl p-3">
      <p className="mb-2 text-xs font-semibold text-slate-200">{title}</p>
      <svg viewBox="0 0 480 194" role="img" aria-label={`${title}; horizontal axis ${xLabel}; vertical axis ${yLabel}`} className="h-44 w-full overflow-visible">
        {[0, 1, 2, 3].map((i) => {
          const value = minimum + ((maximum - minimum) / 3) * i;
          return (
            <g key={i}>
              <line x1={left} y1={y(value)} x2={left + width} y2={y(value)} stroke="rgba(148,163,184,.16)" />
              <text x="4" y={y(value) + 4} fill="#94a3b8" fontSize="10">{Math.round(value)}</text>
            </g>
          );
        })}
        {referenceLines.map((line) => (
          <g key={line.label}>
            <line x1={left} y1={y(line.value)} x2={left + width} y2={y(line.value)} stroke="#a78bfa" strokeDasharray="5 4" />
            <text x={left + width - 3} y={y(line.value) - 4} fill="#c4b5fd" fontSize="9" textAnchor="end">{line.label}</text>
          </g>
        ))}
        {series.map((item) => {
          const points = item.values.map((value, index) => `${x(index, item.values.length)},${y(value)}`).join(" ");
          return (
            <g key={item.label}>
              <polyline fill="none" stroke={item.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={item.dashed ? "5 4" : undefined} points={points} />
              {!item.dashed && item.values.map((value, index) => <circle key={`${item.label}-${index}`} cx={x(index, item.values.length)} cy={y(value)} r="2.5" fill={item.color} />)}
            </g>
          );
        })}
        <line x1={left} y1={top + height} x2={left + width} y2={top + height} stroke="rgba(148,163,184,.4)" />
        <text x={left + width / 2} y="185" fill="#94a3b8" fontSize="10" textAnchor="middle">{xLabel}</text>
        <text x="10" y="10" fill="#94a3b8" fontSize="10">{yLabel}</text>
      </svg>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400">
        {series.map((item) => <span key={item.label}><i className="mr-1 inline-block h-0.5 w-3 align-middle" style={{ background: item.color }} />{item.label}</span>)}
        {referenceLines.map((line) => <span key={line.label}><i className="mr-1 inline-block h-0.5 w-3 align-middle border-t border-dashed border-violet-300" />{line.label}</span>)}
      </div>
    </div>
  );
}

function VolumeChart({ records }: { records: ExerciseRecord[] }) {
  const dates = [...new Set(records.filter((item) => item.kind === "ared").map((item) => item.date))].sort().slice(-7);
  const days = dates.map((key) => ({
    key,
    label: key.slice(5),
    volume: records.filter((item) => item.kind === "ared" && item.date === key)
      .reduce((sum, item) => sum + (item.volumeLoad ?? 0), 0),
  }));
  const maximum = Math.max(1, ...days.map((item) => item.volume));
  return (
    <div className="tile rounded-2xl p-3">
      <p className="text-xs font-semibold text-slate-200">Weekly volume load · kg × repetitions</p>
      <div role="img" aria-label="Bar chart of resistance volume load per day for the last seven days" className="mt-3 grid h-28 grid-cols-7 items-end gap-2 border-b border-slate-700 pb-5">
        {days.map((day) => (
          <div key={day.key} className="relative flex h-full flex-col justify-end text-center">
            <span className="mb-1 text-[9px] text-slate-400">{day.volume || ""}</span>
            <div className="rounded-t bg-gradient-to-t from-teal-700 to-teal-300" style={{ height: `${Math.max(day.volume ? 5 : 1, day.volume / maximum * 100)}%` }} />
            <span className="absolute top-full mt-1 w-full text-[8px] text-slate-500">{day.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkloadChart({ title, xLabel, xValues, hrValues }: { title: string; xLabel: string; xValues: number[]; hrValues: number[] }) {
  const maxX = Math.max(1, ...xValues) * 1.15;
  const minHr = Math.min(...hrValues, 50) - 5;
  const maxHr = Math.max(...hrValues, 100) + 5;
  return (
    <div className="tile rounded-2xl p-3">
      <p className="text-xs font-semibold text-slate-200">{title}</p>
      <svg viewBox="0 0 360 130" role="img" aria-label={`${title}, heart rate against ${xLabel}`} className="mt-2 h-28 w-full">
        <line x1="35" y1="100" x2="345" y2="100" stroke="rgba(148,163,184,.4)" />
        <line x1="35" y1="10" x2="35" y2="100" stroke="rgba(148,163,184,.4)" />
        {xValues.map((xValue, index) => {
          const x = 35 + xValue / maxX * 300;
          const y = 100 - (hrValues[index] - minHr) / Math.max(1, maxHr - minHr) * 85;
          return <circle key={index} cx={x} cy={y} r="4" fill="#c4b5fd" />;
        })}
        <text x="190" y="122" fill="#94a3b8" fontSize="9" textAnchor="middle">{xLabel}</text>
        <text x="4" y="12" fill="#94a3b8" fontSize="9">bpm</text>
      </svg>
      <p className="text-[9px] text-slate-500">HR is paired only with recorded workload. It is not muscle strength and is not converted to VO₂.</p>
    </div>
  );
}

function Section({
  id,
  title,
  eyebrow,
  children,
}: {
  id: string;
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-40">
      <div className="mb-3">
        <SectionLabel>{eyebrow}</SectionLabel>
        <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function MonitoringView() {
  const { profile } = useCrew();
  const [records, setRecords] = useState<Record<string, MonitoringRecord>>({});
  const [storageReady, setStorageReady] = useState(false);
  const [kind, setKind] = useState<ExerciseKind>("ared");
  const [intensity, setIntensity] = useState("moderate");
  const [duration, setDuration] = useState("30");
  const [exerciseName, setExerciseName] = useState("Squat");
  const [sessionStart, setSessionStart] = useState("");
  const [sessionEnd, setSessionEnd] = useState("");
  const [loadKg, setLoadKg] = useState("40");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("8");
  const [rom, setRom] = useState("");
  const [power, setPower] = useState("95");
  const [cycleResistance, setCycleResistance] = useState("");
  const [cadence, setCadence] = useState("80");
  const [speed, setSpeed] = useState("5.2");
  const [incline, setIncline] = useState("1");
  const [harnessKg, setHarnessKg] = useState("");
  const [workloadDetails, setWorkloadDetails] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [peakForce, setPeakForce] = useState("");
  const [torque, setTorque] = useState("");
  const [sessionNotice, setSessionNotice] = useState("");
  const [bpSys, setBpSys] = useState("");
  const [bpDia, setBpDia] = useState("");
  const [sleepHours, setSleepHours] = useState("");
  const [bedtime, setBedtime] = useState("");
  const [wakeTime, setWakeTime] = useState("");
  const [quality, setQuality] = useState("");
  const [sleepEfficiency, setSleepEfficiency] = useState("");
  const [protoName, setProtoName] = useState("");
  const [requiredMinutes, setRequiredMinutes] = useState("");
  const [preStart, setPreStart] = useState("");
  const [preFinish, setPreFinish] = useState("");
  const [preMethod, setPreMethod] = useState("");
  const [oxygenPercent, setOxygenPercent] = useState("");
  const [cabinPressure, setCabinPressure] = useState("");
  const [suitPressure, setSuitPressure] = useState("");
  const [depressStart, setDepressStart] = useState("");
  const [depressEnd, setDepressEnd] = useState("");
  const [evaStart, setEvaStart] = useState("");
  const [evaEnd, setEvaEnd] = useState("");
  const [repressTime, setRepressTime] = useState("");

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time local-only record hydration */
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setRecords(JSON.parse(raw) as Record<string, MonitoringRecord>);
    } catch {
      // Keep the local simulated defaults if storage is unavailable or invalid.
    } finally {
      setStorageReady(true);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch {
      // The prototype remains usable in memory when storage is blocked.
    }
  }, [records, storageReady]);

  const record = records[profile.id] ?? seededRecord(profile);
  const updateRecord = (patch: Partial<MonitoringRecord>) =>
    setRecords((previous) => ({ ...previous, [profile.id]: makeRecord(previous[profile.id] ?? seededRecord(profile), patch) }));

  const currentHr = Number(profile.metrics.find((metric) => metric.label === "Resting HR")?.value ?? 70);
  const baseline = profile.sex === "Male" ? 66 : 68;
  const hrvBaseline = profile.sex === "Male" ? 52 : 46;
  const hrHourly = [68, 66, 64, 63, 62, 65, 72, 78, 82, 80, 76, 74, 77, 86, 90, 84, 78, 75, 72, 70, 68, 66, 65, currentHr];
  const restingTrend = Array.from({ length: 7 }, (_, i) => currentHr + [-2, -1, 0, 1, -1, 2, 0][i]);
  const hrvTrend = Array.from({ length: 7 }, (_, i) => hrvBaseline + [-3, 1, 2, -1, 4, 0, -2][i]);
  const systolic = record.bp.map((item) => item.systolic);
  const diastolic = record.bp.map((item) => item.diastolic);
  const latestBp = record.bp[record.bp.length - 1];
  const actualPreMinutes = record.prebreathe.start && record.prebreathe.finish
    ? Math.max(0, (new Date(record.prebreathe.finish).getTime() - new Date(record.prebreathe.start).getTime()) / 60000)
    : null;
  const protocolComplete = actualPreMinutes !== null && record.prebreathe.requiredMinutes > 0 &&
    actualPreMinutes >= record.prebreathe.requiredMinutes && Boolean(record.prebreathe.protocol.trim()) &&
    Boolean(record.prebreathe.method.trim());
  const saveBp = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const s = Number(bpSys), d = Number(bpDia);
    if (!Number.isFinite(s) || !Number.isFinite(d) || s <= 0 || d <= 0) return;
    const next = [...record.bp.slice(-6), { day: "Today", systolic: s, diastolic: d, timestamp: `${new Date().toISOString().slice(11, 16)} UTC · manual` }];
    updateRecord({ bp: next });
    setBpSys(""); setBpDia("");
  };

  const saveSleep = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const hours = Number(sleepHours);
    if (!Number.isFinite(hours) || hours <= 0 || !bedtime || !wakeTime) return;
    const next = [...record.sleep.slice(-6), { day: "Today", duration: hours, bedtime, wake: wakeTime, quality: quality ? Number(quality) : undefined, efficiency: sleepEfficiency ? Number(sleepEfficiency) : undefined }];
    updateRecord({ sleep: next });
    setSleepHours(""); setBedtime(""); setWakeTime(""); setQuality(""); setSleepEfficiency("");
  };

  const saveExercise = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const mins = Number(duration), met = getMet(kind, intensity);
    if (!Number.isFinite(mins) || mins <= 0 || !sessionStart || !sessionEnd) return;
    const load = Number(loadKg), setCount = Number(sets), repCount = Number(reps);
    const name = kind === "ared" ? exerciseName.trim() || "Resistance exercise" :
      kind === "cycle" ? "Cycle ergometer" : kind === "treadmill" ? "Treadmill" : "Scheduled exercise";
    const row: ExerciseRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: sessionStart.slice(0, 10), startAt: sessionStart, endAt: sessionEnd,
      kind, name, duration: mins, intensity, met,
      calories: Math.round(met * 3.5 * profile.weightKg / 200 * mins),
      heartRate: heartRate ? Number(heartRate) : undefined,
      power: kind === "cycle" ? Number(power) : undefined,
      resistance: kind === "cycle" && cycleResistance ? Number(cycleResistance) : undefined,
      cadence: kind === "cycle" ? Number(cadence) : undefined,
      speed: kind === "treadmill" ? Number(speed) : undefined,
      incline: kind === "treadmill" ? Number(incline) : undefined,
      harnessKg: kind === "treadmill" && harnessKg ? Number(harnessKg) : undefined,
      rangeOfMotion: kind === "ared" ? rom || undefined : undefined,
      workloadDetails: kind === "other" ? workloadDetails || undefined : undefined,
      loadKg: kind === "ared" && Number.isFinite(load) ? load : undefined,
      sets: kind === "ared" ? setCount : undefined,
      reps: kind === "ared" ? repCount : undefined,
      volumeLoad: kind === "ared" && [load, setCount, repCount].every(Number.isFinite) ? load * setCount * repCount : undefined,
      peakForce: peakForce ? Number(peakForce) : undefined,
      torque: torque ? Number(torque) : undefined,
    };
    updateRecord({ exercise: [...record.exercise, row] });
    setSessionNotice(`Saved ${name} · ${row.calories} estimated Earth-based MET calories.`);
  };

  const savePrebreathe = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const p: PrebreatheRecord = {
      protocol: protoName, requiredMinutes: Number(requiredMinutes), start: preStart, finish: preFinish,
      method: preMethod, oxygenPercent, cabinPressure: Number(cabinPressure), suitPressure: Number(suitPressure),
      depressuriseStart: depressStart, depressuriseEnd: depressEnd,
      evaStart, evaEnd, repressTime,
    };
    updateRecord({ prebreathe: p });
  };

  const strengthGroups = useMemo(() => {
    const names = [...new Set(record.exercise.filter((e) => e.kind === "ared").map((e) => e.name))];
    return names.map((name) => ({
      name,
      rows: record.exercise.filter((e) => e.kind === "ared" && e.name === name && e.loadKg !== undefined),
    }));
  }, [record.exercise]);
  const volumeThisWeek = record.exercise.filter((item) => item.kind === "ared").reduce((sum, item) => sum + (item.volumeLoad ?? 0), 0);
  const latestSpO2 = Number(profile.metrics.find((metric) => metric.label === "SpO₂")?.value ?? 97);
  const radiationDose = profile.sex === "Male" ? 76.4 : 68.2;
  const pressureCabin = record.prebreathe.cabinPressure || 14.7;
  const pressureSuit = record.prebreathe.suitPressure || 4.3;

  return (
    <main className="px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="panel rounded-[26px] p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <SectionLabel>Mission health · {profile.callsign}</SectionLabel>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Health & EVA monitoring</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Simulated prototype telemetry and crew-entered records. No Hexoskin, Astroskin, suit, dosimeter or CANS
                system is connected; this page is not a diagnostic medical device.
              </p>
            </div>
            <TonePill tone="amber">SIMULATED DATA</TonePill>
          </div>
          <nav aria-label="Monitoring sections" className="mt-5 flex gap-2 overflow-x-auto border-t border-slate-800/80 pt-3">
            {[
              ["cardio", "Heart & BP"], ["sleep", "Sleep"], ["exercise", "Exercise"],
              ["eva", "EVA environment"], ["dcs", "EVA prep"], ["radiation", "Radiation"],
            ].map(([id, label]) => <a key={id} href={`#${id}`} className="whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white">{label}</a>)}
          </nav>
        </header>

        <Section id="cardio" title="Heart rate, HRV & blood pressure" eyebrow="Cardiovascular">
          <div className="grid gap-4 xl:grid-cols-3">
            <div className="panel rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current heart rate</p><p className="mt-2 text-3xl font-semibold text-white tabular-nums">{currentHr} <span className="text-sm text-slate-400">bpm</span></p></div>
                <TonePill tone={profile.metrics[0].tone}>simulated</TonePill>
              </div>
              <p className="mt-1 text-xs text-slate-500">Timestamp: SOL 184 · 14:32 UTC · source: simulated wearable</p>
              <p className="mt-3 rounded-xl bg-slate-900/70 p-2.5 text-xs leading-5 text-slate-400">AHA adult context: resting HR 60–100 bpm. General reference only; not an astronaut operational threshold.</p>
              <div className="mt-3 flex gap-1.5"><HrrChip riskKey="cardio" /><HrrChip riskKey="fitness" /></div>
            </div>
            <div className="panel rounded-2xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Resting HR · personal baseline</p>
              <p className="mt-2 text-2xl font-semibold text-white tabular-nums">{restingTrend[6]} <span className="text-sm text-slate-400">bpm</span></p>
              <p className="mb-3 text-xs text-slate-500">7-day trend · dashed line is this crew member&apos;s {baseline} bpm reference</p>
              <LineChart title="Resting HR by day" xLabel="Day · last 7 days" yLabel="bpm" minimum={Math.min(...restingTrend, baseline) - 5} maximum={Math.max(...restingTrend, baseline) + 5} series={[{ label: "Resting HR", values: restingTrend, color: "#c4b5fd" }, { label: "Personal baseline", values: Array(7).fill(baseline), color: "#fbbf24", dashed: true }]} />
            </div>
            <div className="panel rounded-2xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">HRV · same metric throughout</p>
              <p className="mt-2 text-2xl font-semibold text-white tabular-nums">{hrvTrend[6]} <span className="text-sm text-slate-400">ms SDNN</span></p>
              <p className="mb-3 text-xs text-slate-500">Simulated daily/overnight average · personal reference {hrvBaseline} ms</p>
              <LineChart title="HRV SDNN · 7-day average" xLabel="Day · last 7 days" yLabel="ms" minimum={Math.min(...hrvTrend, hrvBaseline) - 10} maximum={Math.max(...hrvTrend, hrvBaseline) + 10} series={[{ label: "SDNN", values: hrvTrend, color: "#5eead4" }, { label: "Personal reference", values: Array(7).fill(hrvBaseline), color: "#fbbf24", dashed: true }]} />
              <p className="mt-2 text-[10px] leading-4 text-slate-500">HRV is compared to this astronaut&apos;s own reference, not a universal cutoff. HF/LF power are not plotted on the SDNN axis.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="panel rounded-2xl p-4">
              <LineChart title="Heart rate · last 24 hours" xLabel="Time · simulated 24-hour window" yLabel="bpm" minimum={50} maximum={110} series={[{ label: "Heart rate", values: hrHourly, color: "#a78bfa" }]} />
              <p className="mt-2 text-[10px] text-slate-500">Representative simulation, not a connected 1 Hz stream.</p>
            </div>
            <div className="panel rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Latest BP</p><p className="mt-2 text-2xl font-semibold text-white tabular-nums">{latestBp?.systolic}/{latestBp?.diastolic} <span className="text-sm text-slate-400">mmHg</span></p></div>
                <TonePill tone={bpCategory(latestBp?.systolic ?? 0, latestBp?.diastolic ?? 0) === "Normal" ? "stable" : "watch"}>{bpCategory(latestBp?.systolic ?? 0, latestBp?.diastolic ?? 0)}</TonePill>
              </div>
              <form onSubmit={saveBp} className="mt-3 grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <label className="text-[10px] font-semibold text-slate-400">Systolic<input required type="number" min="60" max="260" value={bpSys} onChange={(e) => setBpSys(e.target.value)} placeholder="mmHg" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white" /></label>
                <label className="text-[10px] font-semibold text-slate-400">Diastolic<input required type="number" min="30" max="160" value={bpDia} onChange={(e) => setBpDia(e.target.value)} placeholder="mmHg" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white" /></label>
                <button className="min-h-9 rounded-lg bg-sky-500/20 px-3 text-xs font-semibold text-sky-100 ring-1 ring-inset ring-sky-400/25">Add reading</button>
              </form>
              <div className="mt-3">
                <LineChart title="Blood pressure · last 7 readings" xLabel="Reading · repeated measurements" yLabel="mmHg" minimum={50} maximum={170} series={[{ label: "Systolic", values: systolic, color: "#fb7185" }, { label: "Diastolic", values: diastolic, color: "#38bdf8" }]} referenceLines={[{ value: 120, label: "120 systolic" }, { value: 130, label: "130 systolic" }, { value: 80, label: "80 diastolic" }, { value: 90, label: "90 diastolic" }]} />
              </div>
              <p className="mt-2 text-[10px] leading-4 text-slate-500">2025 AHA/ACC adult categories: Normal &lt;120 and &lt;80; Elevated 120–129 and &lt;80; Stage 1 130–139 or 80–89; Stage 2 ≥140 or ≥90. General adult references only. A single reading is not a hypertension diagnosis.</p>
            </div>
          </div>
        </Section>

        <Section id="sleep" title="Sleep & recovery" eyebrow="Scheduled sleep is not actual sleep">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="panel rounded-2xl p-4">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Actual sleep · 7 days</p><p className="mt-1 text-sm text-slate-300">NASA scheduled sleep period reference: 8.5 h</p></div>
                <span className="text-xs text-slate-500">not an unexplained health score</span>
              </div>
              <div className="relative grid h-44 grid-cols-7 items-end gap-2 border-b border-slate-700 pb-6">
                <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-violet-300/80" style={{ bottom: `calc(24px + ${Math.min(100, 8.5 / 10 * 100)}%)` }}><span className="absolute -top-4 right-0 text-[9px] text-violet-200">8.5 h scheduled opportunity</span></div>
                {record.sleep.map((item, index) => <div key={`${item.day}-${index}`} className="flex h-full flex-col justify-end text-center"><span className="mb-1 text-[10px] text-slate-300">{item.duration.toFixed(1)}</span><div className="rounded-t-md bg-gradient-to-t from-violet-700 to-violet-300" style={{ height: `${Math.min(100, item.duration / 10 * 100)}%` }} /><span className="absolute mt-1 translate-y-5 text-[9px] text-slate-500">{item.day}</span></div>)}
              </div>
              <div className="mt-5 grid grid-cols-7 gap-2">
                {record.sleep.map((item, index) => <div key={`timeline-${item.day}-${index}`} className="text-center text-[9px] text-slate-500"><span className="block text-slate-300">{item.bedtime}</span><span className="my-1 block h-1 rounded bg-gradient-to-r from-indigo-500 to-amber-300" /><span>{item.wake}</span><span className="mt-0.5 block">{item.day}</span></div>)}
              </div>
              <p className="mt-2 text-[10px] text-slate-500">Bedtime → wake time (UTC), diary / simulated device data.</p>
            </div>
            <div className="panel rounded-2xl p-4">
              <h3 className="font-semibold text-white">Manual sleep diary</h3>
              <form onSubmit={saveSleep} className="mt-3 grid grid-cols-2 gap-2">
                <label className="text-[10px] text-slate-400">Bedtime<input required type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                <label className="text-[10px] text-slate-400">Wake-up<input required type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                <label className="text-[10px] text-slate-400">Actual sleep (h)<input required type="number" min="0" max="24" step="0.1" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                <label className="text-[10px] text-slate-400">Sleep quality (1–7)<input type="number" min="1" max="7" value={quality} onChange={(e) => setQuality(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                <label className="text-[10px] text-slate-400">Sleep efficiency (%), if device provides it<input type="number" min="0" max="100" value={sleepEfficiency} onChange={(e) => setSleepEfficiency(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                <button className="col-span-2 min-h-10 rounded-xl bg-sky-500/20 text-sm font-semibold text-sky-100 ring-1 ring-inset ring-sky-400/25">Save sleep entry</button>
              </form>
              <p className="mt-3 text-xs leading-5 text-slate-500">Sleep efficiency appears only when supplied by a compatible device. NASA&apos;s 8.5-hour value is scheduled opportunity, not guaranteed sleep duration.</p>
            </div>
          </div>
        </Section>

        <Section id="exercise" title="Exercise sessions & performance" eyebrow="Exercise log">
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <form onSubmit={saveExercise} className="panel rounded-2xl p-4">
              <h3 className="font-semibold text-white">Start a Session</h3>
              <p className="mt-1 text-xs text-slate-400">Record workload and comparable strength measures; calories do not measure strength.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className="text-xs text-slate-400">Exercise type<select value={kind} onChange={(e) => setKind(e.target.value as ExerciseKind)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white"><option value="ared">ARED / resistance</option><option value="cycle">Cycle ergometer</option><option value="treadmill">Treadmill</option><option value="other">Other scheduled exercise</option></select></label>
                <label className="text-xs text-slate-400">Planned intensity<select value={intensity} onChange={(e) => setIntensity(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white"><option value="light">Light</option><option value="moderate">Moderate</option><option value="vigorous">Vigorous</option></select></label>
                <label className="text-xs text-slate-400">Duration (min)<input required type="number" min="1" max="600" value={duration} onChange={(e) => setDuration(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                <label className="text-xs text-slate-400">Session start<input required type="datetime-local" value={sessionStart} onChange={(e) => setSessionStart(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                <label className="text-xs text-slate-400">Session end<input required type="datetime-local" value={sessionEnd} onChange={(e) => setSessionEnd(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                <label className="text-xs text-slate-400">Heart rate (bpm), if available<input type="number" min="30" max="240" value={heartRate} onChange={(e) => setHeartRate(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                {kind === "ared" ? <>
                  <label className="text-xs text-slate-400">Exercise name<input value={exerciseName} onChange={(e) => setExerciseName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                  <label className="text-xs text-slate-400">Load (kg)<input type="number" min="0" step="0.5" value={loadKg} onChange={(e) => setLoadKg(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                  <label className="text-xs text-slate-400">Sets<input type="number" min="1" max="30" value={sets} onChange={(e) => setSets(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                  <label className="text-xs text-slate-400">Repetitions<input type="number" min="1" max="100" value={reps} onChange={(e) => setReps(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                  <label className="text-xs text-slate-400">Peak force (N), if measured<input type="number" min="0" value={peakForce} onChange={(e) => setPeakForce(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                  <label className="text-xs text-slate-400">Peak torque (Nm), if measured<input type="number" min="0" value={torque} onChange={(e) => setTorque(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                  <label className="text-xs text-slate-400">Range of motion, if available<input value={rom} onChange={(e) => setRom(e.target.value)} placeholder="e.g. 0–90°" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                </> : null}
                {kind === "cycle" ? <>
                  <label className="text-xs text-slate-400">Power (W)<input type="number" min="0" value={power} onChange={(e) => setPower(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                  <label className="text-xs text-slate-400">Cadence (rpm)<input type="number" min="0" value={cadence} onChange={(e) => setCadence(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                  <label className="text-xs text-slate-400">Resistance / equipment workload<input value={cycleResistance} onChange={(e) => setCycleResistance(e.target.value)} placeholder="Equipment setting" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                </> : null}
                {kind === "treadmill" ? <>
                  <label className="text-xs text-slate-400">Speed (km/h)<input type="number" min="0" step="0.1" value={speed} onChange={(e) => setSpeed(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                  <label className="text-xs text-slate-400">Incline (%)<input type="number" min="0" step="0.1" value={incline} onChange={(e) => setIncline(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                  <label className="text-xs text-slate-400">Harness loading (kg), if supplied<input type="number" min="0" step="0.1" value={harnessKg} onChange={(e) => setHarnessKg(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                </> : null}
                {kind === "other" ? <label className="text-xs text-slate-400 sm:col-span-2">Session-specific workload details<input value={workloadDetails} onChange={(e) => setWorkloadDetails(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label> : null}
              </div>
              <button className="mt-3 min-h-11 w-full rounded-xl bg-sky-500/20 text-sm font-semibold text-sky-100 ring-1 ring-inset ring-sky-400/25">Save session</button>
              {sessionNotice ? <p role="status" className="mt-2 text-xs text-emerald-300">{sessionNotice}</p> : null}
            </form>
            <div className="space-y-4">
              <div className="panel rounded-2xl p-4">
                <h3 className="font-semibold text-white">Session log</h3>
                {record.exercise.length ? <ul className="mt-3 space-y-2">{record.exercise.slice().reverse().map((item) => <li key={item.id} className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-xs"><div className="flex flex-wrap justify-between gap-2"><strong className="text-slate-100">{item.name}</strong><span className="text-slate-400">{item.date} · {item.startAt.slice(11, 16)}–{item.endAt.slice(11, 16)} · {item.duration} min</span></div><p className="mt-1 text-slate-400">{item.intensity} · {item.calories} estimated Earth-based MET kcal{item.volumeLoad ? ` · volume load ${item.volumeLoad} kg × reps` : ""}</p>{item.heartRate && item.power ? <p className="mt-1 text-slate-400">HR {item.heartRate} bpm at {item.power} W</p> : null}{item.peakForce ? <p className="mt-1 text-slate-400">Measured peak force {item.peakForce} N</p> : null}{item.torque ? <p className="mt-1 text-slate-400">Measured peak torque {item.torque} Nm</p> : null}</li>)}</ul> : <p className="mt-2 text-sm text-slate-400">No user-recorded sessions yet.</p>}
                <p className="mt-3 rounded-xl bg-amber-500/[0.07] p-2.5 text-[10px] leading-4 text-amber-100/80">Estimated Earth-based MET calories = MET × 3.5 × body mass (kg) / 200 × minutes. Not a validated microgravity expenditure estimate. No VO₂ is inferred from HR.</p>
              </div>
              <div className="panel rounded-2xl p-4">
                <h3 className="font-semibold text-white">Standardised resistance progress</h3>
                <p className="mt-1 text-xs text-slate-400">Exercise-specific max load and weekly volume load; different exercises are not combined.</p>
                <p className="mt-3 text-sm text-slate-200">This week&apos;s volume load: <strong className="tabular-nums">{volumeThisWeek.toLocaleString()} kg × repetitions</strong></p>
                <div className="mt-3"><VolumeChart records={record.exercise} /></div>
                {strengthGroups.length ? strengthGroups.map((group) => <LineChart key={group.name} title={`${group.name} · max load`} xLabel="Session order" yLabel="kg" minimum={0} maximum={Math.max(10, ...group.rows.map((item) => item.loadKg ?? 0)) * 1.2} series={[{ label: "Completed load", values: group.rows.map((item) => item.loadKg ?? 0), color: "#5eead4" }]} />) : <p className="mt-2 text-xs text-slate-500">Log comparable sessions for an exercise-specific trend.</p>}
                {record.exercise.some((item) => item.kind === "cycle" && item.power && item.heartRate) ? <WorkloadChart title="Cardiorespiratory response · cycle" xLabel="Power (W)" xValues={record.exercise.filter((item) => item.kind === "cycle" && item.power && item.heartRate).map((item) => item.power!)} hrValues={record.exercise.filter((item) => item.kind === "cycle" && item.power && item.heartRate).map((item) => item.heartRate!)} /> : null}
                {record.exercise.some((item) => item.kind === "treadmill" && item.speed && item.heartRate) ? <WorkloadChart title="Cardiorespiratory response · treadmill" xLabel="Speed (km/h)" xValues={record.exercise.filter((item) => item.kind === "treadmill" && item.speed && item.heartRate).map((item) => item.speed!)} hrValues={record.exercise.filter((item) => item.kind === "treadmill" && item.speed && item.heartRate).map((item) => item.heartRate!)} /> : null}
                <p className="mt-3 text-[10px] leading-4 text-slate-500">Peak force and torque are recorded only when provided by suitable equipment. Calories, HR and breathing rate are not strength measurements. NASA example ARED protocols cite 6–12 reps and 3–5 sets; not a prescription.</p>
              </div>
            </div>
          </div>
        </Section>

        <Section id="eva" title="EVA atmosphere & suit telemetry" eyebrow="Separate parameters · simulated">
          <div className="mb-3 rounded-xl border border-amber-400/20 bg-amber-500/[0.06] p-3 text-xs leading-5 text-amber-100/80">
            Simulated values only. No suit/PLSS telemetry is connected. Use mission-approved configurations and thresholds; no universal suit set-point is assumed.
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <TelemetryCard title="Blood oxygen saturation · SpO₂" value={`${latestSpO2}%`} detail="Forehead PPG · simulated timestamp SOL 184 14:32 UTC · signal quality 0.91" note="No invented NASA cutoff. Compare with personal baseline and approved medical limits." />
            <TelemetryCard title="Suit oxygen partial pressure · ppO₂" value="222 mmHg" detail="Raw suit gas · example configuration only" note="Not the inspired value. Example reference uses 4.3 psia and 100% O₂." />
            <TelemetryCard title="Inspired oxygen partial pressure · PIO₂" value="175 mmHg" detail="Derived example · simulated" note="Normoxia target reference: 145–155 mmHg. Mission-configured reference bands required." />
            <TelemetryCard title="Inspired carbon dioxide · PICO₂" value="3 mmHg" detail="Validated inspired value required · simulated" note="≤4 mmHg indefinite; >4 ≤8h; >7 ≤2.5h; >10 ≤1h; >12.5 ≤0.5h; >15 mmHg do not exceed." />
            <TelemetryCard title="Raw suit CO₂ · ppCO₂" value="3.4 mmHg" detail="Raw suit value · simulated" note="Do not apply inspired PICO₂ duration limits to raw ppCO₂ without validated conversion." />
            <TelemetryCard title="Suit pressure" value="4.3 psia" detail="Selected set-point 4.3 psia · illustrative configuration" note="Actual 4.30 psia · difference 0.00 psi · allowable equilibrium band ±0.25 psi." />
            <div className="panel rounded-2xl p-4 sm:col-span-2 xl:col-span-4">
              <h3 className="font-semibold text-white">Synchronized EVA trend panels</h3>
              <p className="mt-1 text-xs text-slate-400">Each parameter has its own unit and scale. All charts use the same simulated elapsed-time stamps.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <LineChart title="SpO₂ · percentage" xLabel="Same timestamp · elapsed time" yLabel="%" minimum={90} maximum={100} series={[{ label: "SpO₂ · simulated", values: [97, 97, 96, 97, 98, 97, latestSpO2], color: "#c4b5fd" }]} />
                <LineChart title="PIO₂ · inspired oxygen" xLabel="Same timestamp · elapsed time" yLabel="mmHg" minimum={100} maximum={380} series={[{ label: "PIO₂ · simulated", values: [174, 176, 175, 173, 175, 176, 175], color: "#5eead4" }]} referenceLines={[{ value: 127, label: "127 lower reference" }, { value: 145, label: "Normoxia 145–155" }, { value: 155, label: "155" }, { value: 356, label: "356 upper reference" }]} />
                <LineChart title="PICO₂ · inspired carbon dioxide" xLabel="Same timestamp · elapsed time" yLabel="mmHg" minimum={0} maximum={20} series={[{ label: "PICO₂ · simulated", values: [2.7, 2.9, 3, 3.1, 2.8, 3, 3], color: "#fb923c" }]} referenceLines={[{ value: 4, label: ">4" }, { value: 7, label: ">7" }, { value: 10, label: ">10" }, { value: 12.5, label: ">12.5" }, { value: 15, label: ">15" }]} />
                <LineChart title="Suit pressure · actual and configured set-point" xLabel="Same timestamp · elapsed time" yLabel="psia" minimum={3.5} maximum={5.1} series={[{ label: "Actual pressure · simulated", values: [4.28, 4.31, 4.3, 4.29, 4.32, 4.3, 4.3], color: "#38bdf8" }, { label: "Example set-point", values: Array(7).fill(4.3), color: "#fbbf24", dashed: true }]} referenceLines={[{ value: 4.05, label: "−0.25 psi tolerance" }, { value: 4.55, label: "+0.25 psi tolerance" }]} />
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <p className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-[10px] leading-5 text-slate-400">
                  PIO₂ formula: (ambient barometric pressure − 47 mmHg) × dry-gas FiO₂. Example 4.3 psia / 100% O₂ gives ~222 mmHg raw suit ppO₂ and ~175 mmHg inspired PIO₂. This is an example, not a universal suit setting. The 122 mmHg 1-hour TWA lower limit and 791 mmHg short-term upper limit are shown in the linked NASA standard; 791 mmHg is not a routine target.
                </p>
                <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-[10px] leading-5 text-slate-400">
                  Simulated inspired PICO₂ duration today: <strong className="text-slate-200">0 min above 4, 7, 10, 12.5 or 15 mmHg</strong>. Duration allowances: ≤4 indefinite; &gt;4 ≤8 h; &gt;7 ≤2.5 h; &gt;10 ≤1 h; &gt;12.5 ≤0.5 h; &gt;15 do not exceed. A real, timestamped validated PICO₂ series is required to calculate exposure duration; do not apply these limits to raw ppCO₂.
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section id="dcs" title="EVA preparation & pressure timeline" eyebrow="Pre-breathe record · not a diagnosis">
          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <form onSubmit={savePrebreathe} className="panel rounded-2xl p-4">
              <h3 className="font-semibold text-white">Mission-approved protocol record</h3>
              <p className="mt-1 text-xs leading-5 text-slate-400">Select the protocol required by flight operations. Do not assume a universal 4-hour protocol.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className="text-xs text-slate-400">Protocol name / ID<input value={protoName} onChange={(e) => setProtoName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                <label className="text-xs text-slate-400">Required duration (min)<input type="number" min="1" value={requiredMinutes} onChange={(e) => setRequiredMinutes(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                <label className="text-xs text-slate-400">Actual start<input type="datetime-local" value={preStart} onChange={(e) => setPreStart(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                <label className="text-xs text-slate-400">Actual finish<input type="datetime-local" value={preFinish} onChange={(e) => setPreFinish(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                <label className="text-xs text-slate-400">Breathing method<input placeholder="Mask / in-suit / approved method" value={preMethod} onChange={(e) => setPreMethod(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                <label className="text-xs text-slate-400">Oxygen concentration (%), if supplied<input type="number" min="0" max="100" value={oxygenPercent} onChange={(e) => setOxygenPercent(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                <label className="text-xs text-slate-400">Cabin pressure before depressurisation (psia)<input type="number" min="0" step="0.01" value={cabinPressure} onChange={(e) => setCabinPressure(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                <label className="text-xs text-slate-400">Suit pressure (psia)<input type="number" min="0" step="0.01" value={suitPressure} onChange={(e) => setSuitPressure(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                <label className="text-xs text-slate-400">Depressurisation start<input type="datetime-local" value={depressStart} onChange={(e) => setDepressStart(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                <label className="text-xs text-slate-400">Depressurisation end<input type="datetime-local" value={depressEnd} onChange={(e) => setDepressEnd(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                <label className="text-xs text-slate-400">EVA start<input type="datetime-local" value={evaStart} onChange={(e) => setEvaStart(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                <label className="text-xs text-slate-400">EVA end<input type="datetime-local" value={evaEnd} onChange={(e) => setEvaEnd(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
                <label className="text-xs text-slate-400">Repressurisation time<input type="datetime-local" value={repressTime} onChange={(e) => setRepressTime(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" /></label>
              </div>
              <button className="mt-3 min-h-10 w-full rounded-xl bg-sky-500/20 text-sm font-semibold text-sky-100 ring-1 ring-inset ring-sky-400/25">Save EVA prep record</button>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-400">Protocol status:</span>
                <TonePill tone={protocolComplete ? "stable" : "watch"}>{protocolComplete ? "Completed" : "Incomplete / not recorded"}</TonePill>
                {actualPreMinutes !== null ? <span className="text-slate-400">{Math.round(actualPreMinutes)} / {record.prebreathe.requiredMinutes} min</span> : null}
                {record.prebreathe.cabinPressure > 0 && record.prebreathe.suitPressure > 0 ? <span className="text-slate-400">Cabin-to-suit Δ {Math.abs(record.prebreathe.cabinPressure - record.prebreathe.suitPressure).toFixed(2)} psi</span> : null}
              </div>
              <ul className="mt-3 grid gap-1 text-[10px] text-slate-400 sm:grid-cols-2">
                {[
                  ["Mission protocol selected", Boolean(record.prebreathe.protocol.trim())],
                  ["Required duration entered", record.prebreathe.requiredMinutes > 0],
                  ["Start and finish recorded", actualPreMinutes !== null],
                  ["Required time completed", actualPreMinutes !== null && record.prebreathe.requiredMinutes > 0 && actualPreMinutes >= record.prebreathe.requiredMinutes],
                  ["Approved breathing method recorded", Boolean(record.prebreathe.method.trim())],
                  ["Cabin and suit pressures recorded", record.prebreathe.cabinPressure > 0 && record.prebreathe.suitPressure > 0],
                  ["Depressurisation transition recorded", Boolean(record.prebreathe.depressuriseStart && record.prebreathe.depressuriseEnd)],
                  ["EVA start and end recorded", Boolean(record.prebreathe.evaStart && record.prebreathe.evaEnd)],
                  ["Repressurisation time recorded", Boolean(record.prebreathe.repressTime)],
                ].map(([label, complete]) => <li key={String(label)}>{complete ? "✓" : "○"} {label}</li>)}
              </ul>
            </form>
            <div className="panel rounded-2xl p-4">
              <h3 className="font-semibold text-white">Symptom check-in after EVA</h3>
              <p className="mt-1 text-xs text-slate-400">Timestamped status for flight-surgeon review. A symptom is not a diagnosis.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {SYMPTOMS.map((symptom) => {
                  const checked = record.symptoms.includes(symptom);
                  return <label key={symptom} className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-900/40 px-3 text-xs text-slate-300"><input type="checkbox" checked={checked} onChange={() => {
                    const timestamp = new Date().toISOString();
                    updateRecord({
                      symptoms: checked ? record.symptoms.filter((item) => item !== symptom) : [...record.symptoms, symptom],
                      symptomEvents: checked ? (record.symptomEvents ?? []).filter((item) => item.symptom !== symptom) : [...(record.symptomEvents ?? []), { symptom, timestamp }],
                    });
                  }} />{symptom}</label>;
                })}
              </div>
              <p className={`mt-3 rounded-xl p-3 text-xs leading-5 ${record.symptoms.length ? "bg-amber-500/10 text-amber-100" : "bg-slate-900/60 text-slate-400"}`}>
                {record.symptoms.length ? `Reported for review: ${(record.symptomEvents ?? []).map((item) => `${item.symptom} (${item.timestamp.slice(11, 16)} UTC)`).join(", ")}. Follow mission procedures; do not use this prototype for diagnosis.` : "No symptoms reported in this local prototype record."}
              </p>
              <div className="mt-4"><LineChart title="Pressure transition · record when supplied" xLabel="Timeline: cabin → suit → cabin" yLabel="psia" minimum={0} maximum={Math.max(16, pressureCabin + 1)} series={[{ label: "Cabin", values: [pressureCabin, pressureCabin, pressureCabin, pressureCabin * 0.7, pressureSuit, pressureSuit, pressureSuit, pressureCabin, pressureCabin], color: "#38bdf8" }, { label: "Suit", values: [0.1, 0.1, 0.1, pressureSuit * 0.6, pressureSuit, pressureSuit, pressureSuit, pressureSuit, pressureSuit], color: "#c4b5fd" }]} /></div>
              <p className="mt-2 text-[10px] text-slate-500">Pre-breathe · depressurisation · EVA · repressurisation. Illustrative pressures only, not a universal suit configuration. Symptom event markers appear once timestamped entries are recorded.</p>
            </div>
          </div>
        </Section>

        <Section id="radiation" title="Radiation exposure" eyebrow="Environmental / mission">
          <div className="panel rounded-2xl p-4">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="font-semibold text-white">Individual dosimetry · simulated</h3><p className="mt-1 text-xs text-slate-400">Not connected to CANS; sample timestamped prototype values only.</p></div>
              <TonePill tone="amber">No live sensor</TonePill>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="tile rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400">Effective dose rate</p><p className="mt-1 text-2xl font-semibold text-white tabular-nums">0.42 <span className="text-sm text-slate-400">µSv/h</span></p><p className="text-[10px] text-slate-500">Source timestamp: SOL 184 · 14:30 UTC · simulated</p></div>
              <div className="tile rounded-xl p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400">Cumulative effective dose</p><p className="mt-1 text-2xl font-semibold text-white tabular-nums">{radiationDose} <span className="text-sm text-slate-400">mSv</span></p><p className="text-[10px] text-slate-500">Mission-to-date · simulated personal record</p></div>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <LineChart title="Dose rate · timestamped sample" xLabel="Elapsed time · simulated" yLabel="µSv/h" minimum={0} maximum={1} series={[{ label: "Effective dose rate", values: [0.31, 0.36, 0.42, 0.39, 0.45, 0.42, 0.41], color: "#fbbf24" }]} />
              <LineChart title="Cumulative effective dose · mission time" xLabel="Mission days · simulated" yLabel="mSv" minimum={0} maximum={650} series={[{ label: "Cumulative effective dose", values: [0, radiationDose * 0.15, radiationDose * 0.3, radiationDose * 0.43, radiationDose * 0.61, radiationDose * 0.82, radiationDose], color: "#fb923c" }]} referenceLines={[{ value: 600, label: "Career reference <600 mSv" }]} />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <p className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-xs leading-5 text-slate-400"><strong className="text-slate-200">SPE event design reference:</strong> &lt;250 mSv effective dose for the design reference solar particle event. Event-specific reference, not a daily threshold.</p>
              <p className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-xs leading-5 text-slate-400"><strong className="text-slate-200">Long missions (&gt;60 days):</strong> GCR system design reference &lt;1.3 mSv/day free space and &lt;0.9 mSv/day on planetary surfaces. Absorbed dose (mGy) is separate; no mGy→mSv conversion is made.</p>
            </div>
          </div>
        </Section>

        <section className="panel rounded-2xl p-4">
          <SectionLabel>Source notes</SectionLabel>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            The simulated data are for interface demonstration only. Device SDK/API access requires compatible hardware and licensing. Reference links:
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["CSA Bio-Monitor", "https://www.asc-csa.gc.ca/eng/sciences/bio-monitor/"],
              ["Hexoskin developer platform", "https://www.hexoskin.com/pages/hexoskin-developer"],
              ["AHA resting heart rate", "https://www.heart.org/en/healthy-living/fitness/fitness-basics/target-heart-rates"],
              ["2025 AHA/ACC blood pressure guideline", "https://professional.heart.org/en/science-news/2025-high-blood-pressure-guideline"],
              ["NASA Human Research Roadmap · fitness risk", "https://humanresearchroadmap.nasa.gov/Risks/?i=180"],
              ["NASA Human Research Roadmap · EVA/DCS risk", "https://humanresearchroadmap.nasa.gov/Risks/?i=32"],
            ].map(([label, href]) => <li key={label}><a href={href} target="_blank" rel="noreferrer" className="text-xs font-medium text-sky-300 underline decoration-sky-400/30 underline-offset-2 hover:text-sky-100">{label} ↗</a></li>)}
          </ul>
          <Link href="/nutrition" className="mt-4 inline-flex min-h-10 items-center rounded-xl border border-slate-700 px-3 text-xs font-semibold text-slate-200 hover:border-sky-400/40">Nutrition targets and food logging →</Link>
        </section>
      </div>
    </main>
  );
}

function TelemetryCard({ title, value, detail, note }: { title: string; value: string; detail: string; note: string }) {
  return (
    <article className="tile rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-xs font-semibold leading-5 text-slate-300">{title}</h3>
        <span aria-label="simulated" className="rounded-full border border-amber-400/20 bg-amber-500/[0.07] px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-200">SIM</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-white tabular-nums">{value}</p>
      <p className="mt-1 text-[10px] leading-4 text-slate-500">{detail}</p>
      <p className="mt-2 border-t border-slate-700/60 pt-2 text-[10px] leading-4 text-slate-400">{note}</p>
    </article>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useCrew } from "@/components/crew-provider";
import { SectionLabel } from "@/components/ui";
import { pct } from "@/lib/crew";

function round(value: number) {
  return Math.round(value);
}

export function NutritionRequirements() {
  const { profile, totals, fluid, markVitaminDTaken, vitaminDTaken } = useCrew();
  const [sex, setSex] = useState<"Female" | "Male">(profile.sex);
  const [age, setAge] = useState(String(profile.age));
  const [weight, setWeight] = useState(String(profile.weightKg));
  const [height, setHeight] = useState(String(profile.heightCm));

  const requirements = useMemo(() => {
    const years = Number(age);
    const kg = Number(weight);
    const cm = Number(height);
    if (!Number.isFinite(years) || !Number.isFinite(kg) || !Number.isFinite(cm) || years < 19 || kg <= 0 || cm <= 0) {
      return null;
    }

    const metres = cm / 100;
    const energy = sex === "Male"
      ? 622 - 9.53 * years + 1.11 * (15.9 * kg + 539.6 * metres)
      : 354 - 6.91 * years + 1.11 * (9.36 * kg + 726 * metres);
    const calcium = { min: 1000, max: 1200 };
    return {
      energy: round(energy),
      protein: { min: round(1.2 * kg), max: round(1.8 * kg) },
      carbs: { min: round((energy * 0.45) / 4), max: round((energy * 0.65) / 4) },
      fat: { min: round((energy * 0.2) / 9), max: round((energy * 0.35) / 9) },
      fibre: sex === "Male" ? 38 : 25,
      fluidLitres: sex === "Male" ? 2.5 : 2.1,
      iron: sex === "Female" && years < 50 ? 18 : 8,
      sodium: { min: 1500, max: 2300 },
      potassium: sex === "Male" ? 3400 : 2600,
      calcium,
      vitaminC: sex === "Male" ? 125 : 110,
    };
  }, [age, height, sex, weight]);

  const tracked = [
    {
      label: "Energy",
      consumed: `${totals.energy.toLocaleString()} kcal`,
      target: requirements ? `${requirements.energy.toLocaleString()} kcal` : "—",
      percent: requirements ? pct(totals.energy, requirements.energy) : null,
    },
    {
      label: "Protein",
      consumed: `${totals.protein} g`,
      target: requirements ? `${requirements.protein.min}–${requirements.protein.max} g` : "—",
      percent: requirements ? pct(totals.protein, requirements.protein.max) : null,
    },
    {
      label: "Carbohydrate",
      consumed: `${totals.carbs} g`,
      target: requirements ? `${requirements.carbs.min}–${requirements.carbs.max} g` : "—",
      percent: requirements ? pct(totals.carbs, requirements.carbs.max) : null,
    },
    {
      label: "Fat",
      consumed: `${totals.fat} g`,
      target: requirements ? `${requirements.fat.min}–${requirements.fat.max} g` : "—",
      percent: requirements ? pct(totals.fat, requirements.fat.max) : null,
    },
    {
      label: "Fibre",
      consumed: `${totals.fibre} g`,
      target: requirements ? `${requirements.fibre} g` : "—",
      percent: requirements ? pct(totals.fibre, requirements.fibre) : null,
    },
    {
      label: "Fluid",
      consumed: `${Math.round(fluid * 1000)} mL`,
      target: requirements ? `≥${Math.round(requirements.fluidLitres * 1000)} mL` : "—",
      percent: requirements ? pct(fluid, requirements.fluidLitres) : null,
    },
  ];

  return (
    <section className="panel rounded-[26px] p-5 sm:p-6">
      <div className="mb-5">
        <SectionLabel>Daily targets</SectionLabel>
        <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-white">Requirements and today&apos;s coverage</h2>
        <p className="mt-1 text-sm leading-5 text-slate-400">
          Energy and macronutrient targets use the selected crew profile. Percentage is shown against the energy goal
          or the upper end of each target range.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {tracked.map((item) => (
          <article key={item.label} className="tile rounded-2xl p-3.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-300">{item.label}</h3>
              <span className="text-xs font-bold text-sky-200 tabular-nums">
                {item.percent === null ? "—" : `${item.percent}%`}
              </span>
            </div>
            <p className="mt-2 text-lg font-semibold text-white tabular-nums">{item.consumed}</p>
            <p className="mt-0.5 text-xs text-slate-400">Target {item.target}</p>
            {item.percent !== null ? (
              <div
                role="progressbar"
                aria-label={`${item.label} target coverage`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={item.percent}
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-700/60"
              >
                <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-400" style={{ width: `${item.percent}%` }} />
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <div className="mt-5 grid gap-5 border-t border-slate-800/80 pt-5 lg:grid-cols-[0.8fr_1.2fr]">
        <form className="tile rounded-2xl p-4" onSubmit={(event) => event.preventDefault()}>
          <h3 className="font-semibold text-white">Calculate a personal estimate</h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Adult EER formula. Enter age, body mass and height to update energy and nutrient references.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="text-xs font-medium text-slate-300">
              Sex
              <select
                value={sex}
                onChange={(event) => setSex(event.target.value as "Female" | "Male")}
                className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </select>
            </label>
            <label className="text-xs font-medium text-slate-300">
              Age (years)
              <input type="number" min="19" max="100" value={age} onChange={(event) => setAge(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" />
            </label>
            <label className="text-xs font-medium text-slate-300">
              Weight (kg)
              <input type="number" min="1" max="400" step="0.1" value={weight} onChange={(event) => setWeight(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" />
            </label>
            <label className="text-xs font-medium text-slate-300">
              Height (cm)
              <input type="number" min="50" max="250" step="0.1" value={height} onChange={(event) => setHeight(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white" />
            </label>
          </div>
          {requirements ? (
            <p className="mt-4 rounded-xl border border-sky-400/20 bg-sky-500/10 p-3 text-sm text-slate-200">
              Estimated energy requirement{" "}
              <strong className="text-xl text-white tabular-nums">{requirements.energy.toLocaleString()} kcal/day</strong>
            </p>
          ) : (
            <p className="mt-4 text-xs text-amber-300">Enter valid values for an adult aged 19 or older.</p>
          )}
        </form>

        <div className="space-y-3">
          {requirements ? (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                <Requirement label="Protein" value={`${requirements.protein.min}–${requirements.protein.max} g`} note="1.2–1.8 g/kg" />
                <Requirement label="Carbohydrate" value={`${requirements.carbs.min}–${requirements.carbs.max} g`} note="45–65% of EER" />
                <Requirement label="Fat" value={`${requirements.fat.min}–${requirements.fat.max} g`} note="20–35% of EER" />
                <Requirement label="Fibre · fluid" value={`${requirements.fibre} g · ≥${requirements.fluidLitres} L`} note="Profile reference" />
                <Requirement label="Iron" value={`${requirements.iron} mg`} note={sex === "Female" && Number(age) < 50 ? "Under 50; if not pharmacologically suppressed" : "Daily reference"} />
                <Requirement label="Sodium" value="1,500–2,300 mg" note="Daily reference range" />
                <Requirement label="Potassium" value={`${requirements.potassium.toLocaleString()} mg`} note="Daily reference" />
                <Requirement label="Calcium" value="1,000–1,200 mg" note="Daily reference range" />
                <Requirement label="Phosphorus" value="≥700 mg" note="Also ≤1.5× calcium intake (1,500–1,800 mg across calcium range)" />
                <Requirement label="Vitamin C" value={`${requirements.vitaminC} mg`} note="Daily reference" />
              </div>
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-700/70 bg-slate-950/50 p-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-slate-400">
                  Vitamin D supplement · 1,000 IU / 25 µg. Supplement action only; not counted as food intake.
                </p>
                <button
                  type="button"
                  onClick={markVitaminDTaken}
                  disabled={vitaminDTaken}
                  className="flex min-h-12 shrink-0 flex-col items-center justify-center rounded-xl border border-sky-400/35 bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/25 disabled:border-emerald-400/30 disabled:bg-emerald-500/10 disabled:text-emerald-200"
                >
                  {vitaminDTaken ? "Taken today ✓" : "Mark as taken"}
                  <span className="text-[10px] font-medium opacity-80">(1,000 IU / 25 µg)</span>
                </button>
              </div>
            </>
          ) : null}
          <p className="rounded-xl border border-amber-400/15 bg-amber-500/[0.06] p-3 text-xs leading-5 text-amber-100/80">
            Mineral and vitamin intake coverage is not available yet: the current catalogue has no complete micronutrient
            values. Add the selected food label values before showing percentages. These general reference targets are
            not astronaut-specific flight limits or medical advice.
          </p>
        </div>
      </div>
    </section>
  );
}

function Requirement({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white tabular-nums">{value}</p>
      <p className="mt-1 text-[10px] leading-4 text-slate-500">{note}</p>
    </div>
  );
}

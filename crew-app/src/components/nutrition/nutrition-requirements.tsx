"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useCrew } from "@/components/providers/crew-provider";
import { SectionLabel } from "@/components/shared/ui";
import { calculateRequirements } from "@/lib/nutrition";

export function NutritionRequirements({ children }: { children?: ReactNode }) {
  const { profile, nutritionEstimate, saveNutritionEstimate, markVitaminDTaken, vitaminDTaken, dataSyncStatus } = useCrew();
  const [sex, setSex] = useState<"Female" | "Male">(nutritionEstimate?.sex ?? profile.sex);
  const [age, setAge] = useState(String(nutritionEstimate?.age ?? profile.age));
  const [weight, setWeight] = useState(String(nutritionEstimate?.weightKg ?? profile.weightKg));
  const [height, setHeight] = useState(String(nutritionEstimate?.heightCm ?? profile.heightCm));
  const [saveAttempted, setSaveAttempted] = useState(false);

  const requirements = useMemo(
    () => calculateRequirements({ sex, age: Number(age), weightKg: Number(weight), heightCm: Number(height) }),
    [age, height, sex, weight],
  );


  return (
    <section className="panel nutrition-requirements rounded-[26px] p-5 sm:p-6">
      <div className="mb-5">
        <SectionLabel>Daily targets</SectionLabel>
        <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-white">Requirements and today&apos;s coverage</h2>
        <p className="mt-1 text-sm leading-5 text-slate-400">
          Targets use the selected crew profile; coverage shows progress toward each goal.
        </p>
      </div>

      {children}

      <div className="mt-5 grid gap-5 border-t border-slate-800/80 pt-5 lg:grid-cols-[0.8fr_1.2fr]">
        <form
          className="tile rounded-2xl p-4"
          onSubmit={(event) => {
            event.preventDefault();
            const estimate = { sex, age: Number(age), weightKg: Number(weight), heightCm: Number(height) };
            if (calculateRequirements(estimate)) {
              setSaveAttempted(true);
              saveNutritionEstimate(estimate);
            }
          }}
        >
          <h3 className="font-semibold text-white">Calculate a personal estimate</h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Change these values to update the adult estimate.
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
          <button
            type="submit"
            disabled={!requirements}
            className="mt-4 w-full rounded-xl border border-sky-400/35 bg-sky-500/15 px-4 py-2.5 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save estimate to database
          </button>
          {saveAttempted && dataSyncStatus === "saving" ? <p role="status" className="mt-2 text-xs text-slate-400">Saving estimate…</p> : null}
          {saveAttempted && (dataSyncStatus === "supabase" || dataSyncStatus === "local") ? <p role="status" className="mt-2 text-xs text-emerald-300">Estimate saved to {dataSyncStatus === "supabase" ? "Supabase" : "the local database"}.</p> : null}
          {saveAttempted && dataSyncStatus === "error" ? <p role="alert" className="mt-2 text-xs text-rose-300">The database did not confirm this save.</p> : null}
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

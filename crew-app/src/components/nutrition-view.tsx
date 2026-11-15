"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCrew } from "@/components/crew-provider";
import { NutritionRequirements } from "@/components/nutrition-requirements";
import { HrrChip, HrrList, Meter, RangeMeter, SectionLabel, TonePill, toneText } from "@/components/ui";
import {
  FLUID_STEP,
  FOODS,
  MACRO_META,
  MEAL_CATEGORIES,
  PORTIONS,
  findFoodByCode,
  macroCap,
  pct,
  rangeStatus,
  scaleMacros,
  searchFoods,
  type FoodNutrient,
  type Macros,
  type MealCategory,
  type Tone,
} from "@/lib/crew";

type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = { detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]> };
type BarcodeDetectorCtor = {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
};

type ScanStatus = "starting" | "scanning" | "unsupported" | "denied";

function formatNutrient(nutrient: FoodNutrient, portions: number): string {
  if (nutrient.amount === null) return "Not reported";
  const value = Number((nutrient.amount * portions).toFixed(2));
  const prefix = nutrient.qualifier === "approx" ? "~" : nutrient.qualifier === "at-least" ? "At least " : "";
  return `${prefix}${value} ${nutrient.unit}`;
}

const MACRO_TONE: Record<keyof Macros, Tone> = {
  energy: "cyan",
  protein: "stable",
  carbs: "amber",
  fat: "cyan",
  fibre: "stable",
};

const DEMO_CODES = [
  { label: "Oatmeal", code: "8901234567890" },
  { label: "Teriyaki", code: "8901234567892" },
  { label: "Electrolyte", code: "8901234567901" },
];

function ScannerModal({
  onClose,
  onDetect,
}: {
  onClose: () => void;
  onDetect: (raw: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<ScanStatus>("starting");
  const [manual, setManual] = useState("");

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | undefined;
    let timer: number | undefined;

    const start = async () => {
      const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;

      if (!Ctor || !navigator.mediaDevices?.getUserMedia) {
        setStatus("unsupported");
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        await video.play().catch(() => undefined);

        let detector: BarcodeDetectorLike;
        try {
          detector = new Ctor({
            formats: ["qr_code", "ean_13", "ean_8", "code_128", "upc_a", "upc_e"],
          });
        } catch {
          detector = new Ctor();
        }

        setStatus("scanning");

        const tick = async () => {
          if (cancelled) return;
          try {
            const codes = await detector.detect(video);
            const value = codes[0]?.rawValue;
            if (value) {
              onDetect(value);
              return;
            }
          } catch {
            /* frame not ready — keep polling */
          }
          timer = window.setTimeout(tick, 320);
        };
        timer = window.setTimeout(tick, 320);
      } catch {
        if (!cancelled) setStatus("denied");
      }
    };

    void start();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onDetect]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const statusCopy: Record<ScanStatus, string> = {
    starting: "Starting camera…",
    scanning: "Hold the label inside the frame. QR, EAN-13, UPC and Code-128 are supported.",
    unsupported: "This browser has no BarcodeDetector support. Enter the code below or pick a demo code.",
    denied: "Camera access was blocked. Allow the camera or enter the code below.",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close scanner"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="scanner-title"
        className="panel relative w-full max-w-lg rounded-3xl border-slate-700/80 bg-[#0a1220] p-5 shadow-2xl shadow-black/60"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <SectionLabel>Food scanner</SectionLabel>
            <h2 id="scanner-title" className="mt-1.5 text-xl font-semibold tracking-tight text-white">
              Scan a QR or barcode
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close scanner"
            className="rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-950">
          <video ref={videoRef} playsInline muted className="h-56 w-full object-cover" />
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="scan-line absolute inset-x-0 top-0 h-14 bg-[linear-gradient(180deg,transparent,rgba(56,189,248,0.28),transparent)]" />
            <div className="absolute left-1/2 top-1/2 h-32 w-40 -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-sky-400/50 shadow-[0_0_0_9999px_rgba(5,8,15,0.35)]" />
          </div>
          {status !== "scanning" ? (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 p-6 text-center text-sm text-slate-300">
              {status === "starting" ? "Starting camera…" : "Camera not available"}
            </div>
          ) : null}
        </div>

        <p className="mt-3 text-xs leading-5 text-slate-400">{statusCopy[status]}</p>

        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (manual.trim()) onDetect(manual.trim());
          }}
        >
          <label className="sr-only" htmlFor="manual-code">
            Barcode or QR value
          </label>
          <input
            id="manual-code"
            value={manual}
            onChange={(event) => setManual(event.target.value)}
            inputMode="numeric"
            placeholder="e.g. 8901234567892 or SPACE-FOOD:MAIN-022"
            className="min-w-0 flex-1 rounded-xl border border-slate-700/80 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400/60 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl border border-sky-400/30 bg-sky-500/15 px-3.5 py-2 text-sm font-semibold text-sky-100 transition-colors hover:border-sky-300/50 hover:bg-sky-500/25 hover:text-white"
          >
            Look up
          </button>
        </form>

        <div className="mt-3 border-t border-slate-800/80 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Demo codes</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {DEMO_CODES.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => onDetect(item.code)}
                className="rounded-full border border-slate-700/70 bg-slate-900/70 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:border-sky-400/40 hover:text-sky-200"
              >
                {item.label} · {item.code.slice(-4)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function NutritionView() {
  const { profile, meals, fluid, drinkFluid, foodWater, totals, addMeal, removeMeal, addFluid } = useCrew();
  const dailyMicronutrients = ["Iron", "Sodium", "Potassium", "Phosphorus", "Calcium", "Vitamin C"].map((label) => {
    let amount = 0;
    let missing = 0;
    let approximate = false;
    for (const meal of meals) {
      const nutrient = meal.nutrients?.find((item) => item.label === label);
      if (!nutrient || nutrient.amount === null) {
        missing += 1;
        continue;
      }
      amount += nutrient.amount;
      approximate ||= nutrient.qualifier === "approx";
    }
    return { label, amount: Number(amount.toFixed(2)), missing, approximate };
  });

  const [scanOpen, setScanOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>("scrambled-eggs");
  const [category, setCategory] = useState<MealCategory>("breakfast");
  const [portions, setPortions] = useState<number>(1);
  const [notice, setNotice] = useState<{ tone: Tone; text: string } | null>(null);

  const results = useMemo(() => searchFoods(query), [query]);
  const selected = FOODS.find((food) => food.id === selectedId) ?? null;

  const preview = useMemo<Macros>(() => {
    const base = selected?.macros ?? { energy: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 };
    return scaleMacros(base, portions);
  }, [selected, portions]);

  const fluidPercent = pct(fluid, profile.targets.fluid);
  const remaining = Math.max(0, profile.targets.fluid - fluid);
  const perMealEnergy = Math.round(profile.targets.energy / MEAL_CATEGORIES.length);

  const handleDetect = useCallback((raw: string) => {
    const food = findFoodByCode(raw);
    if (food) {
      setSelectedId(food.id);
      setQuery("");
      setScanOpen(false);
      setNotice({ tone: "stable", text: `Matched ${food.name} from code ${raw}.` });
    } else {
      setNotice({ tone: "alert", text: `No food matched “${raw}”. Try the manual search instead.` });
      setScanOpen(false);
      setQuery(raw);
    }
  }, []);

  const handleAdd = () => {
    if (!selected) {
      setNotice({ tone: "watch", text: "Pick a food first — scan a code or search the catalogue." });
      return;
    }
    addMeal(selected.id, category, portions);
    const label = MEAL_CATEGORIES.find((item) => item.key === category)?.label ?? "Meal";
    setNotice({ tone: "stable", text: `Added ${selected.name} to ${label.toLowerCase()} (${portions}×).` });
  };

  const grouped = MEAL_CATEGORIES.map((meal) => ({
    ...meal,
    entries: meals.filter((entry) => entry.category === meal.key),
  }));

  return (
    <main className="nutrition-page px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="panel rounded-[26px] p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <SectionLabel>Nutrition · {profile.callsign}</SectionLabel>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Food, fluid and fuel
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Search or scan food, set a portion, and track today&apos;s intake.
              </p>
              <p className="mt-2 text-xs text-slate-500 tabular-nums">
                {profile.sex} · {profile.age} y · {profile.heightCm} cm · {profile.weightKg} kg ·{" "}
                {profile.targets.energy.toLocaleString()} kcal/day
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-200">
                Sample profile
              </span>
              <span className="rounded-full border border-slate-700/80 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-300">
                {meals.length} items logged
              </span>
              <span className="rounded-full border border-sky-400/25 bg-sky-500/10 px-3 py-1.5 text-sm font-medium text-sky-200 tabular-nums">
                {totals.energy.toLocaleString()} kcal
              </span>
              <button
                type="button"
                onClick={() => setScanOpen(true)}
                className="rounded-full border border-sky-400/40 bg-sky-500/20 px-4 py-1.5 text-sm font-semibold text-sky-100 transition-colors hover:border-sky-300/60 hover:bg-sky-500/30 hover:text-white"
              >
                Scan food
              </button>
              <button
                type="button"
                onClick={() => addFluid(FLUID_STEP)}
                className="rounded-full border border-slate-700/70 bg-slate-900/70 px-4 py-1.5 text-sm font-semibold text-slate-200 transition-colors hover:border-sky-400/40 hover:text-sky-100"
              >
                +250 mL water
              </button>
            </div>
          </div>

          {notice ? (
            <div className="mt-4 flex items-start justify-between gap-3 rounded-2xl border border-slate-700/70 bg-slate-900/60 p-3">
              <p className={`text-sm ${toneText(notice.tone)}`} role="status">
                {notice.text}
              </p>
              <button
                type="button"
                onClick={() => setNotice(null)}
                aria-label="Dismiss message"
                className="text-xs font-semibold text-slate-500 hover:text-slate-200"
              >
                ✕
              </button>
            </div>
          ) : null}
        </section>

        <nav aria-label="Nutrition sections" className="-mx-1 flex gap-2 overflow-x-auto rounded-2xl border border-slate-800/80 bg-[#070d18]/95 p-2 backdrop-blur-lg sm:mx-0">
          {[
            ["food-log", "Add food"],
            ["daily-targets", "Daily targets"],
            ["meal-log", "Today's meals"],
            ["hydration", "Fluids"],
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

        <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          <div className="space-y-6">
            <section id="food-log" className="panel scroll-mt-40 rounded-[26px] p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <SectionLabel>Add a meal</SectionLabel>
                  <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-white">Scan or search</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setScanOpen(true)}
                  className="rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-sky-400/40 hover:text-sky-200"
                >
                  Open scanner
                </button>
              </div>

              <label className="sr-only" htmlFor="food-search">
                Search foods
              </label>
              <div className="relative">
                <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  ⌕
                </span>
                <input
                  id="food-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name, kind or barcode…"
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-900/70 py-2.5 pl-8 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-400/60 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>

              <ul className="mt-3 grid max-h-64 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
                {results.map((food) => {
                  const active = food.id === selectedId;
                  return (
                    <li key={food.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(food.id);
                          setNotice(null);
                        }}
                        aria-pressed={active}
                        className={`flex w-full items-center gap-3 rounded-xl border px-2.5 py-2 text-left transition-colors ${
                          active
                            ? "border-sky-400/40 bg-sky-500/10"
                            : "border-slate-700/60 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-800/60"
                        }`}
                      >
                        <span aria-hidden className="text-lg leading-none">
                          {food.glyph}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-slate-100">{food.name}</span>
                          <span className="block text-[10px] uppercase tracking-[0.08em] text-slate-500">
                            {food.kind} · {food.servingGrams} g · {food.macros.energy} kcal · {food.usda ? "USDA" : food.nutrientSource ? "Provided reference" : "Demo estimate"}
                          </span>
                        </span>
                        {active ? <span className="text-xs text-sky-300">✓</span> : null}
                      </button>
                    </li>
                  );
                })}
                {results.length === 0 ? (
                  <li className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-sm text-slate-400">
                    Nothing matched “{query}”. Try scanning the package instead.
                  </li>
                ) : null}
              </ul>

              {selected ? (
                <div className="mt-4 rounded-2xl border border-slate-700/70 bg-slate-900/50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span aria-hidden className="text-2xl leading-none">
                        {selected.glyph}
                      </span>
                      <div>
                        <p className="font-semibold text-white">{selected.name}</p>
                        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-slate-500">
                          {selected.code} · {selected.qr}
                        </p>
                      </div>
                    </div>
                    <TonePill tone="cyan">{selected.kind}</TonePill>
                  </div>
                  <div className="mt-3 rounded-xl border border-slate-700/60 bg-slate-950/40 px-3 py-2 text-xs leading-5 text-slate-400">
                    {selected.nutrientSource === "provided-reference" ? (
                      <>
                        Provided nutrient reference{selected.referenceCitations?.length ? ` ${selected.referenceCitations.join(", ")}` : ""} · values scale with portion. {selected.referenceNote ? `${selected.referenceNote}. ` : ""}
                        Approximate and lower-bound values are marked.
                      </>
                    ) : selected.usda ? (
                      <>
                        USDA {selected.usda.dataType} reference ·{" "}
                        <a
                          href={selected.usda.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-sky-300 underline decoration-sky-400/40 underline-offset-2 hover:text-sky-100"
                        >
                          FoodData Central #{selected.usda.fdcId}
                        </a>
                        . Values are scaled to this serving; branded recipes may differ.
                      </>
                    ) : (
                      <>Demo estimate · no exact USDA catalogue match. Use the package label for real products.</>
                    )}
                  </div>

                  <div className="mt-4">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Meal
                    </p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {MEAL_CATEGORIES.map((meal) => {
                        const active = meal.key === category;
                        return (
                          <button
                            key={meal.key}
                            type="button"
                            onClick={() => setCategory(meal.key)}
                            aria-pressed={active}
                            className={`rounded-xl border px-1 py-2 text-[11px] font-semibold transition-colors ${
                              active
                                ? "border-sky-400/40 bg-sky-500/15 text-sky-100"
                                : "border-slate-700/70 bg-slate-900/60 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                            }`}
                          >
                            <span aria-hidden className="mr-1 text-slate-500">
                              {meal.glyph}
                            </span>
                            {meal.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Portion
                      </p>
                      <p className="text-[10px] text-slate-500 tabular-nums">
                        {Number((selected.servingGrams * portions).toFixed(2))} g total
                      </p>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {PORTIONS.map((value) => {
                        const active = value === portions;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setPortions(value)}
                            aria-pressed={active}
                            className={`rounded-xl border px-1 py-2 text-[11px] font-semibold tabular-nums transition-colors ${
                              active
                                ? "border-sky-400/40 bg-sky-500/15 text-sky-100"
                                : "border-slate-700/70 bg-slate-900/60 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                            }`}
                          >
                            {value}×
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <dl className="mt-4 grid grid-cols-5 gap-1.5 border-t border-slate-800/80 pt-3 text-center">
                    {MACRO_META.map((macro) => (
                      <div key={macro.key}>
                        <dt className="text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                          {macro.label}
                        </dt>
                        <dd className={`mt-0.5 text-sm font-semibold tabular-nums ${toneText(MACRO_TONE[macro.key])}`}>
                          {preview[macro.key]}
                        </dd>
                        <dd className="text-[9px] text-slate-500">{macro.unit}</dd>
                      </div>
                    ))}
                  </dl>

                  {selected.nutrients?.length ? (
                    <details className="mt-3 rounded-xl border border-slate-700/60 bg-slate-950/30 px-3 py-2">
                      <summary className="cursor-pointer text-xs font-semibold text-slate-200">Micronutrients</summary>
                      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
                        {selected.nutrients.map((nutrient) => (
                          <div key={nutrient.label} className="flex justify-between gap-2">
                            <dt className="text-slate-400">{nutrient.label}</dt>
                            <dd className="font-medium text-slate-100 tabular-nums">{formatNutrient(nutrient, portions)}</dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleAdd}
                    className="mt-4 w-full rounded-xl border border-sky-400/40 bg-sky-500/20 px-4 py-2.5 text-sm font-semibold text-sky-100 transition-colors hover:border-sky-300/60 hover:bg-sky-500/30 hover:text-white"
                  >
                    Add {portions}× {selected.name} to{" "}
                    {MEAL_CATEGORIES.find((item) => item.key === category)?.label.toLowerCase()}
                  </button>
                </div>
              ) : null}
            </section>

            <section id="meal-log" className="panel scroll-mt-40 rounded-[26px] p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <SectionLabel>Today&apos;s meals</SectionLabel>
                  <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-white">Logged food</h2>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                  {profile.targets.energy.toLocaleString()} kcal target
                </span>
              </div>

              <div className="space-y-4">
                {grouped.map((meal) => (
                  <div key={meal.key}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        {meal.label}
                      </p>
                      <p className="text-[10px] text-slate-500 tabular-nums">
                        {meal.entries.reduce((sum, entry) => sum + entry.macros.energy, 0)} kcal
                      </p>
                    </div>

                    {meal.entries.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-700/60 px-3 py-2 text-xs text-slate-500">
                        Nothing logged for {meal.label.toLowerCase()} yet.
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {meal.entries.map((entry) => (
                          <li
                            key={entry.id}
                            className="flex items-center gap-2.5 rounded-xl border border-slate-700/60 bg-slate-900/40 px-2.5 py-2"
                          >
                            <span aria-hidden className="text-base leading-none">
                              {entry.glyph}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-medium text-slate-100">{entry.name}</p>
                              <p className="text-[10px] text-slate-500 tabular-nums">
                                {entry.portions}× · {entry.grams} g · {entry.loggedAt}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {entry.source?.record === "crew-entered" ? "Crew entry" : entry.source?.record === "migrated" ? "Restored entry" : "Sample entry"}
                                {entry.source?.nutrients === "usda-fdc" && entry.source.url ? (
                                  <> · <a href={entry.source.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">USDA FoodData Central</a></>
                                ) : entry.source?.nutrients === "provided-reference" ? ` · Provided nutrient reference ${entry.referenceCitations?.join(", ") ?? ""}` : " · Demo nutrient estimate"}
                              </p>
                              {entry.nutrients?.length ? (
                                <details className="mt-1 text-[10px] text-slate-400">
                                  <summary className="cursor-pointer">Micronutrients</summary>
                                  <p className="mt-1 leading-5">
                                    {entry.nutrients.map((nutrient) => `${nutrient.label}: ${formatNutrient(nutrient, 1)}`).join(" · ")}
                                  </p>
                                </details>
                              ) : null}
                            </div>
                            <span className="shrink-0 text-xs font-semibold text-slate-300 tabular-nums">
                              {entry.macros.energy} kcal
                            </span>
                            <button
                              type="button"
                              onClick={() => removeMeal(entry.id)}
                              aria-label={`Remove ${entry.name}`}
                              className="shrink-0 rounded-lg border border-slate-700/70 px-1.5 py-0.5 text-[11px] text-slate-500 transition-colors hover:border-rose-400/40 hover:text-rose-300"
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section id="daily-targets" className="panel scroll-mt-40 rounded-[26px] p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <SectionLabel>Consumed vs target</SectionLabel>
                  <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-white">Daily nutrients</h2>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 tabular-nums">
                  {pct(totals.energy, profile.targets.energy)}% energy
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

                  return (
                    <div key={macro.key}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-300">
                          {macro.label}
                        </p>
                        <p className="text-xs text-slate-400 tabular-nums">
                          <span className={`font-semibold ${toneText(MACRO_TONE[macro.key])}`}>
                            {consumed.toLocaleString()}
                          </span>{" "}
                          / {goal} {macro.unit}
                        </p>
                      </div>
                      {range ? (
                        <RangeMeter value={consumed} range={range} label={`${macro.label} intake`} tone={MACRO_TONE[macro.key]} />
                      ) : (
                        <Meter value={consumed} target={cap} label={`${macro.label} target`} tone={MACRO_TONE[macro.key]} />
                      )}
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p
                          className={`text-[10px] tabular-nums ${
                            status === "below"
                              ? "text-amber-300/90"
                              : status === "above"
                                ? "text-sky-300/90"
                                : "text-slate-500"
                          }`}
                        >
                          {range ? `${percent}% of upper target` : `${percent}% of target`}
                        </p>
                        <p className="text-[10px] text-slate-500 tabular-nums">
                          {range
                            ? status === "below"
                              ? `${range.min - consumed} ${macro.unit} below floor`
                              : status === "above"
                                ? `${consumed - range.max} ${macro.unit} above band`
                                : "inside band"
                            : `${Math.max(0, cap - consumed).toLocaleString()} ${macro.unit} left`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 border-t border-slate-800/80 pt-4">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-white">Minerals &amp; vitamin</h3>
                  <p className="mt-1 text-[10px] leading-4 text-slate-500">Daily totals from foods logged today · values use the provided food references.</p>
                </div>
                <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {dailyMicronutrients.map((nutrient) => (
                    <div key={nutrient.label} className="tile rounded-xl px-3 py-2.5">
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">{nutrient.label}</dt>
                      <dd className="mt-1 text-sm font-semibold text-white tabular-nums">
                        {nutrient.approximate ? "~" : ""}{nutrient.amount} mg
                      </dd>
                      {nutrient.missing > 0 ? (
                        <dd className="mt-0.5 text-[9px] leading-4 text-amber-300/80">
                          {nutrient.amount > 0 ? "Partial total" : "Not reported"} · {nutrient.missing} food{nutrient.missing === 1 ? "" : "s"} missing value
                        </dd>
                      ) : null}
                    </div>
                  ))}
                </dl>
              </div>

              <p className="mt-3 border-t border-slate-800/80 pt-3 text-[10px] leading-5 text-slate-500">
                Targets from body mass and energy share: protein 1.2–1.8 g/kg · carbs 45–65% of energy · fat 20–35% of
                energy · fibre {profile.targets.fibre} g · fluid ≥ {profile.targets.fluid.toFixed(1)} L.
              </p>

              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-800/80 pt-3">
                <HrrChip riskKey="nutrition" />
                <HrrChip riskKey="bone" />
                <HrrChip riskKey="renal" />
              </div>
            </section>

            <section id="hydration" className="panel scroll-mt-40 rounded-[26px] p-5 sm:p-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <SectionLabel>Fluids</SectionLabel>
                  <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-white">Hydration</h2>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 tabular-nums">
                  {fluidPercent}%
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative h-32 w-20 shrink-0 overflow-hidden rounded-2xl border border-sky-400/25 bg-slate-950/80">
                  <div
                    className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-sky-600/70 via-sky-400/60 to-cyan-300/50 transition-[height] duration-500 ease-out"
                    style={{ height: `${fluidPercent}%` }}
                  >
                    <div className="absolute inset-x-0 top-0 h-1 bg-white/40" />
                  </div>
                  <div aria-hidden className="absolute inset-0 flex flex-col justify-between p-1">
                    {[0, 1, 2, 3, 4].map((tick) => (
                      <span key={tick} className="h-px w-2 rounded bg-white/20" />
                    ))}
                  </div>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white/90 tabular-nums">
                    {fluidPercent}%
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-2xl font-semibold tracking-tight text-white tabular-nums">
                    {fluid.toFixed(2)} L
                  </p>
                  <p className="text-xs text-slate-400">of {profile.targets.fluid.toFixed(1)} L minimum today</p>
                  <p className="text-xs text-slate-400" data-testid="fluid-breakdown">
                    Drinks {drinkFluid.toFixed(2)} L · water in food {foodWater.toFixed(2)} L
                  </p>
                  <div className="mt-2.5">
                    <Meter value={fluid} target={profile.targets.fluid} label="Hydration minimum" tone="cyan" height="h-2" />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    {remaining > 0 ? `${remaining.toFixed(2)} L to reach the minimum` : "Daily minimum reached"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => addFluid(FLUID_STEP)}
                  className="rounded-xl border border-sky-400/40 bg-sky-500/20 px-3 py-2.5 text-sm font-semibold text-sky-100 transition-colors hover:border-sky-300/60 hover:bg-sky-500/30 hover:text-white"
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

              <p className="mt-2 text-[10px] uppercase tracking-[0.1em] text-slate-500">
                Aim for ~{perMealEnergy.toLocaleString()} kcal per meal across four sittings
              </p>
            </section>

            <section className="panel rounded-[26px] p-5 sm:p-6">
              <div className="mb-3">
                <SectionLabel>NASA HRR references</SectionLabel>
                <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-white">Why intake is monitored</h2>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Food, fluid and body-mass parameters map directly to these Human Research Roadmap risks.
                </p>
              </div>
              <HrrList keys={["nutrition", "renal", "bone"]} />
            </section>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-7xl">
        <NutritionRequirements key={profile.id} />
      </div>

      {scanOpen ? <ScannerModal onClose={() => setScanOpen(false)} onDetect={handleDetect} /> : null}
    </main>
  );
}

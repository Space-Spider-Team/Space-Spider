import { profileTargets } from "./nutrition";

export type Tone = "stable" | "watch" | "alert" | "cyan" | "green" | "amber";

/* ------------------------------------------------------------------ */
/* NASA Human Research Roadmap risks (humanresearchroadmap.nasa.gov)  */
/* ------------------------------------------------------------------ */

export type HrrKey =
  | "cardio"
  | "fitness"
  | "bone"
  | "nutrition"
  | "renal"
  | "sleep"
  | "behavior"
  | "team"
  | "immune"
  | "vision";

export type HrrRisk = {
  key: HrrKey;
  id: number;
  label: string;
  title: string;
  href: string;
};

const risk = (key: HrrKey, id: number, label: string, title: string): HrrRisk => ({
  key,
  id,
  label,
  title,
  href: `https://humanresearchroadmap.nasa.gov/Risks/?i=${id}`,
});

export const HRR: Record<HrrKey, HrrRisk> = {
  cardio: risk(
    "cardio",
    179,
    "Cardiovascular adaptations",
    "Risk of Cardiovascular Adaptations Contributing to Adverse Mission Performance and Health Outcomes",
  ),
  fitness: risk(
    "fitness",
    180,
    "Cardiorespiratory & musculoskeletal fitness",
    "Risk of Mission Performance Decrements and Adverse Health Outcomes Resulting from Reduced Cardiorespiratory and Musculoskeletal Fitness",
  ),
  bone: risk(
    "bone",
    77,
    "Bone fracture",
    "Risk of Bone Fracture due to Spaceflight-induced Changes to Bone",
  ),
  nutrition: risk(
    "nutrition",
    176,
    "Inadequate food & nutrition",
    "Risk of Performance Decrement and Crew Illness Due to Inadequate Food and Nutrition",
  ),
  renal: risk("renal", 81, "Renal stone formation", "Risk of Renal Stone Formation"),
  sleep: risk(
    "sleep",
    100,
    "Sleep loss & circadian desync",
    "Risk of Performance Decrements and Adverse Health Outcomes Resulting from Sleep Loss, Circadian Desynchronization, and Work Overload",
  ),
  behavior: risk(
    "behavior",
    99,
    "Cognitive & behavioral health",
    "Risk of Adverse Cognitive or Behavioral Changes and Psychiatric Disorders Leading to In-mission Health and Performance and Long-term Health Effects",
  ),
  team: risk(
    "team",
    101,
    "Team performance & psychosocial adaptation",
    "Risk of In-Mission Performance and Behavioral Health Decrements Due to Inadequate Cooperation, Coordination, Communication, and Psychosocial Adaptation within a Team",
  ),
  immune: risk(
    "immune",
    85,
    "Altered immune response",
    "Risk of In Mission Impacts, Adverse Health Events or Long-Term Health Impacts due to Altered Immune Response",
  ),
  vision: risk("vision", 105, "Spaceflight associated neuro-ocular syndrome", "Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS)"),
};

/* ------------------------------------------------------------------ */
/* Nutrition model                                                     */
/* ------------------------------------------------------------------ */

export type Macros = {
  energy: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
};

export const MACRO_META: { key: keyof Macros; label: string; unit: string; tone: string }[] = [
  { key: "energy", label: "Energy", unit: "kcal", tone: "bg-sky-400" },
  { key: "protein", label: "Protein", unit: "g", tone: "bg-emerald-400" },
  { key: "carbs", label: "Carbs", unit: "g", tone: "bg-amber-400" },
  { key: "fat", label: "Fat", unit: "g", tone: "bg-fuchsia-400" },
  { key: "fibre", label: "Fibre", unit: "g", tone: "bg-teal-400" },
];

export type Targets = Macros & { fluid: number };

/** Acceptable intake band for a nutrient, from the crew nutrition reference. */
export type Range = { min: number; max: number };

export type MacroRanges = Partial<Record<keyof Macros, Range>>;

export type FoodNutrient = {
  label: string;
  amount: number | null;
  unit: string;
  qualifier?: "approx" | "at-least";
};

export type Food = {
  id: string;
  name: string;
  code: string;
  qr: string;
  servingGrams: number;
  glyph: string;
  kind: string;
  mealCategory: MealCategory;
  macros: Macros;
  nutrients?: FoodNutrient[];
  nutrientSource?: "provided-reference";
  referenceNote?: string;
  referenceCitations?: string[];
  usda?: { fdcId: number; dataType: string; url: string };
};

export const FOODS: Food[] = [
  {
    id: "scrambled-eggs",
    name: "Scrambled eggs",
    code: "8901234567902",
    qr: "SPACE-FOOD:EGG-001",
    servingGrams: 100,
    glyph: "🥚",
    kind: "Breakfast",
    mealCategory: "breakfast",
    macros: { energy: 183.9, protein: 12.02, carbs: 2.81, fat: 13.6, fibre: 0 },
    nutrientSource: "provided-reference",
    referenceNote: "100 g formula-input equivalent",
    referenceCitations: ["[cite: 5]", "[cite: 6]"],
    nutrients: [
      { label: "Iron", amount: 0.96, unit: "mg" },
      { label: "Sodium", amount: 188.5, unit: "mg" },
      { label: "Potassium", amount: 155.6, unit: "mg" },
      { label: "Phosphorus", amount: 199, unit: "mg" },
      { label: "Calcium", amount: 165.7, unit: "mg" },
      { label: "Vitamin C", amount: 0.35, unit: "mg", qualifier: "approx" },
      { label: "Intrinsic water", amount: 70.1, unit: "g", qualifier: "approx" },
    ],
  },
  {
    id: "almonds",
    name: "Almonds",
    code: "8901234567904",
    qr: "SPACE-FOOD:NUT-ALM-001",
    servingGrams: 28.3,
    glyph: "🌰",
    kind: "Snack",
    mealCategory: "snack",
    macros: { energy: 165.2, protein: 6.07, carbs: 5.67, fat: 14.46, fibre: 3.05 },
    nutrientSource: "provided-reference",
    referenceNote: "One demo reference unit",
    referenceCitations: ["[cite: 4]", "[cite: 6]"],
    nutrients: [
      { label: "Iron", amount: 1.06, unit: "mg" },
      { label: "Sodium", amount: 0, unit: "mg" },
      { label: "Potassium", amount: 207.4, unit: "mg" },
      { label: "Phosphorus", amount: 142.3, unit: "mg" },
      { label: "Calcium", amount: 71.8, unit: "mg" },
      { label: "Vitamin C", amount: 0, unit: "mg" },
      { label: "Intrinsic water", amount: 1.21, unit: "g" },
    ],
  },
  {
    id: "chicken-pineapple-salad",
    name: "Chicken-pineapple salad",
    code: "8901234567903",
    qr: "SPACE-FOOD:SAL-001",
    servingGrams: 100,
    glyph: "🥗",
    kind: "Lunch",
    mealCategory: "lunch",
    macros: { energy: 155.3, protein: 15.29, carbs: 6.3, fat: 7.62, fibre: 1.06 },
    nutrientSource: "provided-reference",
    referenceNote: "100 g formula-input equivalent",
    referenceCitations: ["[cite: 5]", "[cite: 6]"],
    nutrients: [
      { label: "Iron", amount: 0.73, unit: "mg", qualifier: "approx" },
      { label: "Sodium", amount: 167.8, unit: "mg" },
      { label: "Potassium", amount: 198.6, unit: "mg", qualifier: "approx" },
      { label: "Phosphorus", amount: 128.3, unit: "mg", qualifier: "approx" },
      { label: "Calcium", amount: 18.9, unit: "mg" },
      { label: "Vitamin C", amount: 2.19, unit: "mg", qualifier: "approx" },
      { label: "Intrinsic water", amount: 58.7, unit: "g", qualifier: "at-least" },
    ],
  },
  {
    id: "cashews",
    name: "Cashews",
    code: "8901234567905",
    qr: "SPACE-FOOD:NUT-CAS-001",
    servingGrams: 28.3,
    glyph: "🥜",
    kind: "Snack",
    mealCategory: "snack",
    macros: { energy: 150.8, protein: 4.92, carbs: 10.27, fat: 11.01, fibre: 1.16 },
    nutrientSource: "provided-reference",
    referenceNote: "One demo reference unit",
    referenceCitations: ["[cite: 4]", "[cite: 6]"],
    nutrients: [
      { label: "Iron", amount: 1.7, unit: "mg" },
      { label: "Sodium", amount: 1.36, unit: "mg" },
      { label: "Potassium", amount: 180.6, unit: "mg" },
      { label: "Phosphorus", amount: 150.6, unit: "mg" },
      { label: "Calcium", amount: 11.9, unit: "mg" },
      { label: "Vitamin C", amount: null, unit: "mg" },
      { label: "Intrinsic water", amount: 1.36, unit: "g" },
    ],
  },
];

export const PORTIONS = [0.5, 1] as const;

export const MEAL_CATEGORIES = [
  { key: "breakfast", label: "Breakfast", glyph: "☀" },
  { key: "lunch", label: "Lunch", glyph: "◑" },
  { key: "dinner", label: "Dinner", glyph: "☾" },
  { key: "snack", label: "Snack", glyph: "•" },
] as const;

export type MealCategory = (typeof MEAL_CATEGORIES)[number]["key"];

export type MealEntry = {
  id: string;
  foodId: string;
  name: string;
  glyph: string;
  category: MealCategory;
  portions: number;
  grams: number;
  macros: Macros;
  nutrients?: FoodNutrient[];
  referenceCitations?: string[];
  loggedAt: string;
  /** UTC calendar day the food was logged, YYYY-MM-DD. */
  date?: string;
  source?: {
    record: "crew-entered" | "demo-seed" | "migrated";
    nutrients: "usda-fdc" | "demo-estimate" | "provided-reference";
    url?: string;
  };
};

/* ------------------------------------------------------------------ */
/* Crew profiles                                                       */
/* ------------------------------------------------------------------ */

export type Metric = {
  label: string;
  value: string;
  unit: string;
  delta: string;
  tone: Tone;
  detail: string;
  progress: number;
  hrr: HrrKey[];
};

export type SystemState = { label: string; value: string; tone: Tone; hrr: HrrKey[] };

export type Profile = {
  id: string;
  callsign: string;
  name: string;
  role: string;
  initials: string;
  sex: "Female" | "Male";
  age: number;
  heightCm: number;
  weightKg: number;
  missionDay: string;
  metrics: Metric[];
  systems: SystemState[];
  targets: Targets;
  ranges: MacroRanges;
  sleep: { hours: number; target: number };
  baseFluid: number;
  seedMeals: { foodId: string; category: MealCategory; portions: number; time: string }[];
  moodHistory: number[];
  focus: string;
};

export const PROFILES: Profile[] = [
  {
    id: "vega-06",
    callsign: "Vega-06",
    name: "Cmdr. Ana Reyes",
    role: "Commander",
    initials: "AR",
    sex: "Female",
    age: 30,
    heightCm: 165,
    weightKg: 65,
    missionDay: "SOL 184",
    focus: "Keep protein and hydration on pace before the EVA window.",
    metrics: [
      {
        label: "Resting HR",
        value: "72",
        unit: "bpm",
        delta: "+4 vs baseline",
        tone: "watch",
        detail: "Measured after 20 min rest",
        progress: 72,
        hrr: ["cardio"],
      },
      {
        label: "Blood pressure",
        value: "118/76",
        unit: "mmHg",
        delta: "Stable",
        tone: "stable",
        detail: "Seated, same cuff + arm",
        progress: 78,
        hrr: ["cardio"],
      },
      {
        label: "SpO₂",
        value: "97",
        unit: "%",
        delta: "+1 from trend",
        tone: "stable",
        detail: "Signal quality 0.91",
        progress: 89,
        hrr: ["cardio"],
      },
      {
        label: "Sleep",
        value: "7.4",
        unit: "hrs",
        delta: "-0.8 vs target",
        tone: "watch",
        detail: "Actigraphy + HRV match",
        progress: 68,
        hrr: ["sleep"],
      },
    ],
    systems: [
      { label: "Cardio", value: "92%", tone: "stable", hrr: ["cardio", "fitness"] },
      { label: "Bone", value: "81%", tone: "watch", hrr: ["bone"] },
      { label: "Muscle", value: "88%", tone: "stable", hrr: ["fitness"] },
      { label: "Eyes", value: "76%", tone: "watch", hrr: ["vision"] },
      { label: "Sleep", value: "69%", tone: "stable", hrr: ["sleep"] },
      { label: "Immune", value: "83%", tone: "stable", hrr: ["immune"] },
    ],
    // Calculated from JSC-67378 for 30 y, 165 cm, 65 kg: 2,152 kcal, protein 78–117 g, ...
    ...profileTargets({ sex: "Female", age: 30, heightCm: 165, weightKg: 65 }),
    sleep: { hours: 7.4, target: 8.2 },
    baseFluid: 1.9,
    seedMeals: [
      { foodId: "scrambled-eggs", category: "breakfast", portions: 1, time: "07:10 UTC" },
      { foodId: "almonds", category: "snack", portions: 1, time: "10:00 UTC" },
      { foodId: "chicken-pineapple-salad", category: "lunch", portions: 1, time: "12:20 UTC" },
      { foodId: "cashews", category: "snack", portions: 1, time: "15:05 UTC" },
    ],
    moodHistory: [3, 3, 4, 4, 3, 4],
  },
  {
    id: "vega-07",
    callsign: "Vega-07",
    name: "Dr. Liam Okafor",
    role: "Medical officer",
    initials: "LO",
    sex: "Male",
    age: 30,
    heightCm: 180,
    weightKg: 70,
    missionDay: "SOL 184",
    focus: "Protect sleep before tomorrow's blood draw; fibre is trending low.",
    metrics: [
      {
        label: "Resting HR",
        value: "64",
        unit: "bpm",
        delta: "-2 vs baseline",
        tone: "stable",
        detail: "Measured after 20 min rest",
        progress: 64,
        hrr: ["cardio"],
      },
      {
        label: "Blood pressure",
        value: "112/70",
        unit: "mmHg",
        delta: "Stable",
        tone: "stable",
        detail: "Seated, same cuff + arm",
        progress: 84,
        hrr: ["cardio"],
      },
      {
        label: "SpO₂",
        value: "98",
        unit: "%",
        delta: "+2 from trend",
        tone: "stable",
        detail: "Signal quality 0.94",
        progress: 93,
        hrr: ["cardio"],
      },
      {
        label: "Sleep",
        value: "6.6",
        unit: "hrs",
        delta: "-1.4 vs target",
        tone: "watch",
        detail: "Actigraphy + HRV match",
        progress: 55,
        hrr: ["sleep"],
      },
    ],
    systems: [
      { label: "Cardio", value: "95%", tone: "stable", hrr: ["cardio", "fitness"] },
      { label: "Bone", value: "86%", tone: "stable", hrr: ["bone"] },
      { label: "Muscle", value: "91%", tone: "stable", hrr: ["fitness"] },
      { label: "Eyes", value: "82%", tone: "stable", hrr: ["vision"] },
      { label: "Sleep", value: "74%", tone: "watch", hrr: ["sleep"] },
      { label: "Immune", value: "88%", tone: "stable", hrr: ["immune"] },
    ],
    // Calculated from JSC-67378 for 30 y, 180 cm, 70 kg: 2,650 kcal, protein 84–126 g, ...
    ...profileTargets({ sex: "Male", age: 30, heightCm: 180, weightKg: 70 }),
    sleep: { hours: 6.6, target: 8 },
    baseFluid: 1.6,
    seedMeals: [
      { foodId: "scrambled-eggs", category: "breakfast", portions: 1, time: "06:55 UTC" },
      { foodId: "almonds", category: "snack", portions: 1, time: "10:00 UTC" },
      { foodId: "chicken-pineapple-salad", category: "lunch", portions: 1, time: "12:05 UTC" },
      { foodId: "cashews", category: "snack", portions: 1, time: "15:45 UTC" },
    ],
    moodHistory: [4, 4, 3, 4, 5, 4],
  },
];

export const MOOD_SCALE = [
  { level: 1, glyph: "😖", label: "Drained" },
  { level: 2, glyph: "🙁", label: "Low" },
  { level: 3, glyph: "😐", label: "Okay" },
  { level: 4, glyph: "🙂", label: "Good" },
  { level: 5, glyph: "😄", label: "Great" },
] as const;

export const FLUID_STEP = 250;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export const EMPTY_MACROS: Macros = { energy: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 };

export function addMacros(a: Macros, b: Macros): Macros {
  return {
    energy: a.energy + b.energy,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
    fibre: a.fibre + b.fibre,
  };
}

export function scaleMacros(m: Macros, factor: number): Macros {
  return {
    energy: Math.round(m.energy * factor * 100) / 100,
    protein: Math.round(m.protein * factor * 100) / 100,
    carbs: Math.round(m.carbs * factor * 100) / 100,
    fat: Math.round(m.fat * factor * 100) / 100,
    fibre: Math.round(m.fibre * factor * 100) / 100,
  };
}

export function sumMacros(entries: MealEntry[]): Macros {
  return entries.reduce((acc, entry) => addMacros(acc, entry.macros), { ...EMPTY_MACROS });
}

export function pct(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((value / target) * 100));
}

/** Progress runs against the top of the acceptable band (or the single goal). */
export function macroCap(profile: Profile, key: keyof Macros): number {
  const range = profile.ranges[key];
  return range ? range.max : profile.targets[key];
}

export type RangeStatus = "below" | "within" | "above";

export function rangeStatus(value: number, range: Range): RangeStatus {
  if (value < range.min) return "below";
  if (value > range.max) return "above";
  return "within";
}

export function formatRange(range: Range, unit: string): string {
  return `${range.min}–${range.max} ${unit}`;
}

export function makeMealEntry(
  food: Food,
  category: MealCategory,
  portions: number,
  time: string,
  date?: string,
): MealEntry {
  return {
    id: `${food.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    foodId: food.id,
    name: food.name,
    glyph: food.glyph,
    category,
    portions,
    grams: Math.round(food.servingGrams * portions * 100) / 100,
    macros: scaleMacros(food.macros, portions),
    nutrients: food.nutrients?.map((nutrient) => ({
      ...nutrient,
      amount: nutrient.amount === null ? null : Math.round(nutrient.amount * portions * 100) / 100,
    })),
    referenceCitations: food.referenceCitations,
    loggedAt: time,
    date,
    source: {
      record: "crew-entered",
      nutrients: food.usda ? "usda-fdc" : food.nutrientSource ?? "demo-estimate",
      url: food.usda?.url,
    },
  };
}

export function seedEntries(profile: Profile): MealEntry[] {
  return profile.seedMeals.flatMap((seed) => {
    const food = FOODS.find((item) => item.id === seed.foodId);
    if (!food) return [];
    return [
      {
        id: `${profile.id}-${food.id}-${seed.category}`,
        foodId: food.id,
        name: food.name,
        glyph: food.glyph,
        category: seed.category,
        portions: seed.portions,
        grams: Math.round(food.servingGrams * seed.portions * 100) / 100,
        macros: scaleMacros(food.macros, seed.portions),
        nutrients: food.nutrients?.map((nutrient) => ({
          ...nutrient,
          amount: nutrient.amount === null ? null : Math.round(nutrient.amount * seed.portions * 100) / 100,
        })),
        referenceCitations: food.referenceCitations,
        loggedAt: seed.time,
        source: {
          record: "demo-seed",
          nutrients: food.usda ? "usda-fdc" : food.nutrientSource ?? "demo-estimate",
          url: food.usda?.url,
        },
      },
    ];
  });
}

export function findFoodByCode(input: string): Food | undefined {
  const value = input.trim().toUpperCase();
  if (!value) return undefined;
  return FOODS.find((food) => food.code === value || food.qr.toUpperCase() === value || food.id.toUpperCase() === value);
}

export function searchFoods(query: string): Food[] {
  const value = query.trim().toLowerCase();
  if (!value) return FOODS;
  return FOODS.filter(
    (food) =>
      food.name.toLowerCase().includes(value) ||
      food.kind.toLowerCase().includes(value) ||
      food.code.includes(value),
  );
}

export type Priority = {
  tone: Tone;
  title: string;
  body: string;
  hrr: HrrKey[];
};

export function buildPriorities(
  profile: Profile,
  totals: Macros,
  fluid: number,
  moodLevel?: number,
  /** Recent daily check-ins, oldest first; null where none was recorded. */
  recentMoodLevels: (number | null)[] = [],
): Priority[] {
  const items: Priority[] = [];
  const severity: Record<Tone, number> = { alert: 0, watch: 1, amber: 1, cyan: 2, green: 3, stable: 3 };

  const proteinRange = profile.ranges.protein;
  const proteinPct = pct(totals.protein, macroCap(profile, "protein"));
  if (proteinPct < 75) {
    const proteinGoal = proteinRange
      ? `${proteinRange.min}–${proteinRange.max} g`
      : `${profile.targets.protein} g`;
    items.push({
      tone: proteinPct < 55 ? "alert" : "watch",
      title: `Protein at ${proteinPct}% of range`,
      body: `${totals.protein} g of ${proteinGoal} logged. Add a shake or a main pouch to reach the floor.`,
      hrr: ["nutrition", "fitness"],
    });
  }

  const fluidPct = pct(fluid, profile.targets.fluid);
  if (fluidPct < 80) {
    items.push({
      tone: fluidPct < 60 ? "watch" : "cyan",
      title: `Hydration at ${fluidPct}%`,
      body: `${fluid.toFixed(1)} L of the ${profile.targets.fluid.toFixed(1)} L minimum. Log 250 mL now to keep the trend flat.`,
      hrr: ["nutrition", "renal"],
    });
  }

  if (profile.sleep.hours < profile.sleep.target - 0.5) {
    const deficit = (profile.sleep.target - profile.sleep.hours).toFixed(1);
    items.push({
      tone: profile.sleep.hours < 6.5 ? "alert" : "watch",
      title: `Sleep debt ${deficit} h`,
      body: `Last night: ${profile.sleep.hours} h against a ${profile.sleep.target} h target. Protect the next sleep window.`,
      hrr: ["sleep", "behavior"],
    });
  }

  const hr = profile.metrics.find((metric) => metric.label === "Resting HR");
  if (hr && (hr.tone === "watch" || hr.tone === "alert")) {
    items.push({
      tone: hr.tone,
      title: `Resting HR ${hr.delta.toLowerCase()}`,
      body: `${hr.value} ${hr.unit} — ${hr.detail.toLowerCase()}. Re-measure seated and compare with the 14-day baseline.`,
      hrr: ["cardio", "fitness"],
    });
  }

  if (pct(totals.fibre, profile.targets.fibre) < 70) {
    items.push({
      tone: "cyan",
      title: `Fibre at ${pct(totals.fibre, profile.targets.fibre)}%`,
      body: `${totals.fibre} g of ${profile.targets.fibre} g. Rye crackers or dried apricots cover the rest cheaply.`,
      hrr: ["nutrition"],
    });
  }

  const lastFive = recentMoodLevels.filter((level): level is number => level !== null).slice(-5);
  const lowCount = lastFive.filter((level) => level <= 2).length;
  if (lastFive.length >= 3 && lowCount >= 3) {
    items.push({
      tone: "watch",
      title: `${lowCount} of the last ${lastFive.length} mood check-ins were low`,
      body: "This describes your own check-ins over recent days. Review it with the crew medical officer in line with mission procedures.",
      hrr: ["behavior", "team"],
    });
  } else if (moodLevel !== undefined && moodLevel <= 2) {
    items.push({
      tone: "alert",
      title: "Mood check-in flagged low",
      body: "Self-reported mood is in the lower band. A short crew check-in and a schedule review are recommended.",
      hrr: ["behavior", "team"],
    });
  }

  return items
    .sort((a, b) => severity[a.tone] - severity[b.tone])
    .slice(0, 3);
}

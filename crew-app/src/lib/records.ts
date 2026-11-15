/**
 * Crew records: food, fluid and mood, each stored as dated entries so that
 * "today" can be worked out from the records and history is kept.
 * Pure functions only, so the browser and the API route can share them.
 */
import { FOODS, scaleMacros, seedEntries, type MealEntry, type Profile } from "./crew";

export type FluidRecord = {
  id: string;
  /** Volume in mL. A negative value corrects (undoes) an earlier entry. */
  ml: number;
  /** UTC calendar day, YYYY-MM-DD. */
  date: string;
  /** Time of entry, e.g. "14:32 UTC". */
  at: string;
  source: "demo-seed" | "crew-entered" | "migrated";
};

export type MoodRecord = {
  /** 1 (lowest) to 5 (highest). */
  level: number;
  date: string;
  at: string;
  source: "crew-entered" | "migrated";
};

export type ProfileLog = {
  meals: MealEntry[];
  fluidLog: FluidRecord[];
  moodLog: MoodRecord[];
  vitaminD?: { date: string; taken: boolean };
  vitaminDSource?: "crew-entered";
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Today's UTC calendar day. */
export function dayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** "14:32 UTC" */
export function timeLabel(now: Date = new Date()): string {
  return `${now.toISOString().slice(11, 16)} UTC`;
}

export function shiftDay(day: string, delta: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return dayKey(date);
}

function recordId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** A fresh log for a profile: the demo meals and fluid, dated today. */
export function defaultLog(profile: Profile, day: string): ProfileLog {
  return {
    meals: seedEntries(profile).map((meal) => ({ ...meal, date: day })),
    fluidLog: [
      { id: `${profile.id}-fluid-seed`, ml: Math.round(profile.baseFluid * 1000), date: day, at: "07:00 UTC", source: "demo-seed" },
    ],
    moodLog: [],
  };
}

/* ------------------------------------------------------------------ */
/* Reading stored logs                                                 */
/* ------------------------------------------------------------------ */

type Loose = Record<string, unknown>;

const isObject = (value: unknown): value is Loose =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isLevel = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;

function readMeal(raw: unknown, day: string): MealEntry | null {
  if (!isObject(raw) || typeof raw.id !== "string" || typeof raw.foodId !== "string") return null;
  if (typeof raw.portions !== "number" || !(raw.portions > 0) || raw.portions > 10) return null;
  if (!["breakfast", "lunch", "dinner", "snack"].includes(String(raw.category))) return null;
  const meal = raw as unknown as MealEntry;
  const food = FOODS.find((item) => item.id === meal.foodId);
  // Meals outside the active catalogue are removed when stored logs are restored.
  if (!food) return null;
  // Older entries have no date; they were shown as today's when they were saved.
  const date = typeof raw.date === "string" && DAY.test(raw.date) ? raw.date : day;
  return {
    ...meal,
    date,
    // Nutrient values always come from the current food database.
    macros: scaleMacros(food.macros, meal.portions),
    grams: Math.round(food.servingGrams * meal.portions * 100) / 100,
    source: meal.source ?? {
      record: "migrated",
      nutrients: food.usda ? "usda-fdc" : food.nutrientSource ?? "demo-estimate",
      url: food.usda?.url,
    },
    nutrients: meal.nutrients ?? food.nutrients?.map((nutrient) => ({
      ...nutrient,
      amount: nutrient.amount === null ? null : Math.round(nutrient.amount * meal.portions * 100) / 100,
    })),
    referenceCitations: meal.referenceCitations ?? food.referenceCitations,
  };
}

function readFluid(raw: unknown): FluidRecord | null {
  if (!isObject(raw) || typeof raw.id !== "string" || typeof raw.date !== "string" || !DAY.test(raw.date)) return null;
  if (typeof raw.ml !== "number" || !Number.isFinite(raw.ml) || Math.abs(raw.ml) > 5000) return null;
  const source = ["demo-seed", "crew-entered", "migrated"].includes(String(raw.source))
    ? (raw.source as FluidRecord["source"])
    : "crew-entered";
  return { id: raw.id, ml: raw.ml, date: raw.date, at: typeof raw.at === "string" ? raw.at : "", source };
}

function readMood(raw: unknown): MoodRecord | null {
  if (!isObject(raw) || !isLevel(raw.level) || typeof raw.date !== "string" || !DAY.test(raw.date)) return null;
  return {
    level: raw.level,
    date: raw.date,
    at: typeof raw.at === "string" ? raw.at : "",
    source: raw.source === "migrated" ? "migrated" : "crew-entered",
  };
}

/**
 * Turns a stored log into the current shape, or returns null if it is not a log.
 * Accepts the earlier format (one fluid total and one mood) and converts it.
 */
export function parseLog(raw: unknown, day: string): ProfileLog | null {
  if (!isObject(raw) || !Array.isArray(raw.meals)) return null;
  const meals = raw.meals.map((meal) => readMeal(meal, day)).filter((meal): meal is MealEntry => meal !== null);

  let fluidLog: FluidRecord[];
  if (Array.isArray(raw.fluidLog)) {
    fluidLog = raw.fluidLog.map(readFluid).filter((record): record is FluidRecord => record !== null);
  } else if (typeof raw.fluid === "number" && Number.isFinite(raw.fluid) && raw.fluid >= 0) {
    // Earlier format: a single running total in litres.
    fluidLog = raw.fluid > 0
      ? [{
          id: recordId("fluid"),
          ml: Math.round(raw.fluid * 1000),
          date: day,
          at: "",
          source: raw.fluidSource === "crew-entered" ? "migrated" : "demo-seed",
        }]
      : [];
  } else {
    return null;
  }

  let moodLog: MoodRecord[] = [];
  if (Array.isArray(raw.moodLog)) {
    moodLog = raw.moodLog.map(readMood).filter((record): record is MoodRecord => record !== null);
  } else if (isObject(raw.mood)) {
    // Earlier format: only the latest check-in.
    const legacy = readMood({ ...raw.mood, source: "migrated" });
    if (legacy) moodLog = [legacy];
  }

  const log: ProfileLog = { meals, fluidLog, moodLog };
  if (isObject(raw.vitaminD) && typeof raw.vitaminD.date === "string" && typeof raw.vitaminD.taken === "boolean") {
    log.vitaminD = { date: raw.vitaminD.date, taken: raw.vitaminD.taken };
    log.vitaminDSource = "crew-entered";
  }
  return log;
}

/** Restores every profile's log, falling back to the demo log where nothing usable is stored. */
export function restoreLogs(raw: unknown, profiles: Profile[], day: string): Record<string, ProfileLog> {
  const stored = isObject(raw) ? raw : {};
  return Object.fromEntries(
    profiles.map((profile) => [profile.id, parseLog(stored[profile.id], day) ?? defaultLog(profile, day)]),
  );
}

/* ------------------------------------------------------------------ */
/* Daily views                                                         */
/* ------------------------------------------------------------------ */

export function mealsForDay(meals: MealEntry[], day: string): MealEntry[] {
  return meals.filter((meal) => meal.date === day);
}

/** Fluid recorded on a day, in litres, never below zero. */
export function fluidLitresForDay(fluidLog: FluidRecord[], day: string): number {
  const ml = fluidLog.filter((record) => record.date === day).reduce((sum, record) => sum + record.ml, 0);
  return Math.max(0, Math.round(ml)) / 1000;
}

export function moodForDay(moodLog: MoodRecord[], day: string): MoodRecord | undefined {
  return moodLog.find((record) => record.date === day);
}

/**
 * Mood levels for the `days` days ending on `day`, oldest first (null = no
 * check-in). Until the crew member has check-ins before today, the profile's
 * demo history fills the earlier days and `demo` is true.
 */
export function recentMood(
  moodLog: MoodRecord[],
  day: string,
  demoHistory: number[],
  days = 7,
): { levels: (number | null)[]; demo: boolean } {
  const dates = Array.from({ length: days }, (_, index) => shiftDay(day, index - (days - 1)));
  const hasHistory = moodLog.some((record) => record.date < day);
  const levels = dates.map((date, index) => {
    const record = moodForDay(moodLog, date);
    if (record) return record.level;
    if (!hasHistory && date !== day) {
      const fromEnd = days - 1 - index;
      return demoHistory[demoHistory.length - fromEnd] ?? null;
    }
    return null;
  });
  return { levels, demo: !hasHistory && demoHistory.length > 0 };
}

/* ------------------------------------------------------------------ */
/* Changes                                                             */
/* ------------------------------------------------------------------ */

/**
 * Records a drink. A negative amount undoes part of today's fluid and is
 * limited so today's total never goes below zero.
 */
export function addFluidRecord(log: ProfileLog, ml: number, day: string, at: string): ProfileLog {
  if (!Number.isFinite(ml) || ml === 0) return log;
  const todayMl = Math.round(fluidLitresForDay(log.fluidLog, day) * 1000);
  const amount = ml < 0 ? -Math.min(-ml, todayMl) : ml;
  if (amount === 0) return log;
  const record: FluidRecord = { id: recordId("fluid"), ml: amount, date: day, at, source: "crew-entered" };
  return { ...log, fluidLog: [...log.fluidLog, record] };
}

/** One check-in per day: a new rating replaces the earlier one for that day. */
export function setMoodRecord(log: ProfileLog, level: number, day: string, at: string): ProfileLog {
  if (!isLevel(level)) return log;
  const others = log.moodLog.filter((record) => record.date !== day);
  return { ...log, moodLog: [...others, { level, date: day, at, source: "crew-entered" }] };
}

/* ------------------------------------------------------------------ */
/* Water in food                                                       */
/* ------------------------------------------------------------------ */

/** Nutrient label that carries a food's own water content (grams ≈ mL). */
export const FOOD_WATER_LABEL = "Intrinsic water";

/**
 * Water contained in logged food, in litres. JSC-67378 counts it toward the
 * daily fluid requirement ("met through food content and beverages").
 * Foods without a recorded water value add nothing.
 */
export function foodWaterLitres(meals: MealEntry[]): number {
  const ml = meals.reduce((sum, meal) => {
    const water = meal.nutrients?.find((nutrient) => nutrient.label === FOOD_WATER_LABEL);
    return sum + (water && typeof water.amount === "number" && water.amount > 0 ? water.amount : 0);
  }, 0);
  return Math.round(ml) / 1000;
}

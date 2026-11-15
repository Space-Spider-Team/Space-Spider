import { describe, expect, it } from "vitest";
import { FOODS, PROFILES, makeMealEntry, sumMacros } from "./crew";
import {
  addFluidRecord, defaultLog, fluidLitresForDay, foodWaterLitres, mealsForDay, moodForDay, parseLog,
  recentMood, restoreLogs, setMoodRecord, shiftDay, type ProfileLog,
} from "./records";

const DAY = "2026-11-15";
const YESTERDAY = "2026-11-14";
const profile = PROFILES[0];
const empty: ProfileLog = { meals: [], fluidLog: [], moodLog: [] };

describe("fluid records", () => {
  it("adds 250 mL entries for the day", () => {
    let log = addFluidRecord(empty, 250, DAY, "08:00 UTC");
    log = addFluidRecord(log, 250, DAY, "09:00 UTC");
    expect(log.fluidLog).toHaveLength(2);
    expect(fluidLitresForDay(log.fluidLog, DAY)).toBe(0.5);
  });
  it("keeps days separate", () => {
    const log = addFluidRecord(addFluidRecord(empty, 500, YESTERDAY, ""), 250, DAY, "");
    expect(fluidLitresForDay(log.fluidLog, DAY)).toBe(0.25);
    expect(fluidLitresForDay(log.fluidLog, YESTERDAY)).toBe(0.5);
  });
  it("undoes without going below zero", () => {
    const log = addFluidRecord(addFluidRecord(empty, 250, DAY, ""), -500, DAY, "");
    expect(fluidLitresForDay(log.fluidLog, DAY)).toBe(0);
    expect(addFluidRecord(log, -250, DAY, "")).toBe(log);
  });
});

describe("mood records", () => {
  it("keeps one check-in per day", () => {
    let log = setMoodRecord(empty, 2, DAY, "08:00 UTC");
    log = setMoodRecord(log, 4, DAY, "09:00 UTC");
    log = setMoodRecord(log, 3, YESTERDAY, "");
    expect(log.moodLog).toHaveLength(2);
    expect(moodForDay(log.moodLog, DAY)?.level).toBe(4);
    expect(setMoodRecord(log, 9, DAY, "")).toBe(log);
  });
  it("shows the demo history until real earlier check-ins exist", () => {
    const today = setMoodRecord(empty, 5, DAY, "");
    expect(recentMood(today.moodLog, DAY, [1, 2, 3, 4, 5, 4])).toEqual({ levels: [1, 2, 3, 4, 5, 4, 5], demo: true });
    const real = setMoodRecord(today, 2, shiftDay(DAY, -2), "");
    expect(recentMood(real.moodLog, DAY, [1, 2, 3, 4, 5, 4])).toEqual({ levels: [null, null, null, null, 2, null, 5], demo: false });
  });
});

describe("meals", () => {
  it("count only the day they were logged", () => {
    const food = FOODS.find((item) => item.id === "almonds")!;
    const log: ProfileLog = {
      ...empty,
      meals: [makeMealEntry(food, "snack", 1, "", DAY), makeMealEntry(food, "snack", 0.5, "", YESTERDAY)],
    };
    expect(sumMacros(mealsForDay(log.meals, DAY)).energy).toBeCloseTo(165.2, 1);
    expect(sumMacros(mealsForDay(log.meals, YESTERDAY)).energy).toBeCloseTo(82.6, 1);
  });
});

describe("stored logs", () => {
  it("start from the demo log, dated today", () => {
    const log = defaultLog(profile, DAY);
    expect(log.meals.every((meal) => meal.date === DAY)).toBe(true);
    expect(fluidLitresForDay(log.fluidLog, DAY)).toBe(profile.baseFluid);
  });
  it("convert the earlier format (one fluid total, latest mood)", () => {
    const legacy = {
      meals: [{ id: "m1", foodId: "almonds", category: "snack", portions: 1, loggedAt: "10:00 UTC", macros: { energy: 1 } }],
      fluid: 1.25,
      fluidSource: "crew-entered",
      mood: { level: 4, date: DAY },
    };
    const log = parseLog(legacy, DAY)!;
    expect(log.meals[0].date).toBe(DAY);
    expect(log.meals[0].macros.energy).toBeCloseTo(165.2, 1); // recalculated from the food database
    expect(fluidLitresForDay(log.fluidLog, DAY)).toBe(1.25);
    expect(log.moodLog).toEqual([{ level: 4, date: DAY, at: "", source: "migrated" }]);
  });
  it("drop malformed records and reject non-logs", () => {
    const log = parseLog({
      meals: [{ id: "x", foodId: "almonds", category: "brunch", portions: 1 }, "junk"],
      fluidLog: [{ id: "f", ml: 250, date: DAY }, { id: "g", ml: 99999, date: DAY }, { id: "h", ml: 250, date: "today" }],
      moodLog: [{ level: 7, date: DAY }],
    }, DAY)!;
    expect(log.meals).toEqual([]);
    expect(log.fluidLog.map((record) => record.id)).toEqual(["f"]);
    expect(log.moodLog).toEqual([]);
    expect(parseLog({ meals: [] }, DAY)).toBeNull();
    expect(parseLog("nope", DAY)).toBeNull();
  });
  it("fall back to the demo log per profile when nothing usable is stored", () => {
    const logs = restoreLogs({ [profile.id]: { meals: [], fluidLog: [], moodLog: [] } }, PROFILES, DAY);
    expect(logs[profile.id].meals).toEqual([]);
    expect(logs[PROFILES[1].id].meals.length).toBeGreaterThan(0);
  });
});

describe("water in food", () => {
  const food = (id: string) => FOODS.find((item) => item.id === id)!;
  it("adds each logged food's water, scaled by portion", () => {
    const meals = [
      makeMealEntry(food("scrambled-eggs"), "breakfast", 1, "", DAY), // 70.1 g
      makeMealEntry(food("chicken-pineapple-salad"), "lunch", 0.5, "", DAY), // 29.35 g
      makeMealEntry(food("almonds"), "snack", 1, "", DAY), // 1.21 g
    ];
    expect(foodWaterLitres(meals)).toBe(0.101);
  });
  it("adds nothing for foods without a water value", () => {
    expect(foodWaterLitres([makeMealEntry(food("oatmeal"), "breakfast", 1, "", DAY)])).toBe(0);
    expect(foodWaterLitres([])).toBe(0);
  });
});

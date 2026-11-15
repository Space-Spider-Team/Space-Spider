import { describe, expect, it } from "vitest";
import { FOODS, PROFILES } from "./crew";
import { calculateRequirements, energyWorking, estimatedEnergyRequirement, profileTargets } from "./nutrition";

const male = { sex: "Male" as const, age: 30, heightCm: 180, weightKg: 70 };
const female = { sex: "Female" as const, age: 30, heightCm: 165, weightKg: 65 };

describe("JSC-67378 energy requirement", () => {
  it("is 2,649.65 → 2,650 kcal/day for the male astronaut", () => {
    expect(estimatedEnergyRequirement(male)).toBeCloseTo(2649.65, 2);
    expect(energyWorking(male)).toBe("622 − 9.53 × 30 + 1.11 × (15.9 × 70 + 539.6 × 1.80) = 2649.65 ≈ 2650 kcal/day");
  });
  it("is 2,151.69 → 2,152 kcal/day for the female astronaut", () => {
    expect(estimatedEnergyRequirement(female)).toBeCloseTo(2151.69, 2);
  });
});

describe("daily requirements", () => {
  it("match the team's table for the male astronaut", () => {
    expect(calculateRequirements(male)).toMatchObject({
      energy: 2650, protein: { min: 84, max: 126 }, carbs: { min: 298, max: 431 },
      fat: { min: 59, max: 103 }, fibre: 38, fluidLitres: 2.5,
    });
  });
  it("match the team's table for the female astronaut", () => {
    expect(calculateRequirements(female)).toMatchObject({
      energy: 2152, protein: { min: 78, max: 117 }, carbs: { min: 242, max: 350 },
      fat: { min: 48, max: 84 }, fibre: 25, fluidLitres: 2.1, iron: 18,
    });
  });
  it("uses 32 mL/kg for fluid when that is above the minimum", () => {
    expect(calculateRequirements({ ...male, weightKg: 90 })?.fluidLitres).toBe(2.88);
  });
  it("refuses ages the equations do not cover", () => {
    expect(calculateRequirements({ ...male, age: 18 })).toBeNull();
    expect(calculateRequirements({ ...male, weightKg: NaN })).toBeNull();
  });
});

describe("crew profiles", () => {
  it("limits meal choices and demo meals to the four requested foods", () => {
    const expectedIds = ["scrambled-eggs", "almonds", "chicken-pineapple-salad", "cashews"];
    expect(FOODS.map((food) => food.id)).toEqual(expectedIds);
    for (const profile of PROFILES) {
      expect(profile.seedMeals.map((meal) => meal.foodId)).toEqual(expectedIds);
    }
    expect(FOODS.map((food) => food.macros.energy)).toEqual([183.9, 165.2, 155.3, 150.8]);
  });

  it("take their targets from the calculation", () => {
    for (const profile of PROFILES) {
      const expected = profileTargets({ sex: profile.sex, age: profile.age, heightCm: profile.heightCm, weightKg: profile.weightKg });
      expect(profile.targets).toEqual(expected.targets);
      expect(profile.ranges).toEqual(expected.ranges);
    }
    expect(PROFILES.map((profile) => profile.targets.energy)).toEqual([2152, 2650]);
  });
});

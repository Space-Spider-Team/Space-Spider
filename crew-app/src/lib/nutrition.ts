/**
 * Daily nutritional requirements from NASA JSC-67378 Rev 1 (April 2020),
 * "Nutritional Requirements for Exploration Missions up to 365 days".
 * https://ntrs.nasa.gov/citations/20205008306
 *
 * Every constant below is taken from that document. Profiles and the
 * requirements calculator both use these functions, so targets are always
 * calculated rather than typed in.
 */

export type Sex = "Female" | "Male";

export type Body = {
  sex: Sex;
  age: number;
  weightKg: number;
  heightCm: number;
};

export type Band = { min: number; max: number };

export type Requirements = {
  /** Unrounded estimated energy requirement, kcal/day. */
  energyExact: number;
  /** Rounded estimated energy requirement, kcal/day. */
  energy: number;
  protein: Band;
  carbs: Band;
  fat: Band;
  fibre: number;
  /** Minimum daily fluid from drinks and food water, litres. */
  fluidLitres: number;
  iron: number;
  sodium: Band;
  potassium: number;
  calcium: Band;
  vitaminC: number;
  vitaminD: number;
};

/** The EER equations are defined for adults 19 years and older. */
export const MIN_AGE = 19;

/**
 * Estimated energy requirement, kcal/day. 1.11 is the "low active" activity
 * factor JSC-67378 specifies for Orion and Gateway missions.
 *   men:   622 - 9.53 x Age + 1.11 x (15.9 x Mass + 539.6 x Height[m])
 *   women: 354 - 6.91 x Age + 1.11 x (9.36 x Mass + 726 x Height[m])
 */
export function estimatedEnergyRequirement(body: Body): number {
  const metres = body.heightCm / 100;
  return body.sex === "Male"
    ? 622 - 9.53 * body.age + 1.11 * (15.9 * body.weightKg + 539.6 * metres)
    : 354 - 6.91 * body.age + 1.11 * (9.36 * body.weightKg + 726 * metres);
}

/** 32 mL per kg body mass, and no less than 2.5 L (men) or 2.1 L (women). */
export function fluidRequirementLitres(body: Pick<Body, "sex" | "weightKg">): number {
  const floor = body.sex === "Male" ? 2500 : 2100;
  return Math.max(32 * body.weightKg, floor) / 1000;
}

/** Returns null when the inputs are outside what the equations cover. */
export function calculateRequirements(body: Body): Requirements | null {
  const { age, weightKg, heightCm } = body;
  if (![age, weightKg, heightCm].every(Number.isFinite) || age < MIN_AGE || weightKg <= 0 || heightCm <= 0) {
    return null;
  }
  const energyExact = estimatedEnergyRequirement(body);
  const male = body.sex === "Male";
  return {
    energyExact,
    energy: Math.round(energyExact),
    protein: { min: Math.round(1.2 * weightKg), max: Math.round(1.8 * weightKg) },
    carbs: { min: Math.round((0.45 * energyExact) / 4), max: Math.round((0.65 * energyExact) / 4) },
    fat: { min: Math.round((0.2 * energyExact) / 9), max: Math.round((0.35 * energyExact) / 9) },
    fibre: male ? 38 : 25,
    fluidLitres: Math.round(fluidRequirementLitres(body) * 1000) / 1000,
    iron: !male && age < 50 ? 18 : 8,
    sodium: { min: 1500, max: 2300 },
    potassium: male ? 3400 : 2600,
    calcium: { min: 1000, max: 1200 },
    vitaminC: male ? 125 : 110,
    vitaminD: 25,
  };
}

/** The equation with this person's numbers filled in, for showing the working. */
export function energyWorking(body: Body): string {
  const metres = (body.heightCm / 100).toFixed(2);
  const exact = estimatedEnergyRequirement(body);
  const formula = body.sex === "Male"
    ? `622 − 9.53 × ${body.age} + 1.11 × (15.9 × ${body.weightKg} + 539.6 × ${metres})`
    : `354 − 6.91 × ${body.age} + 1.11 × (9.36 × ${body.weightKg} + 726 × ${metres})`;
  return `${formula} = ${exact.toFixed(2)} ≈ ${Math.round(exact)} kcal/day`;
}

const midpoint = (band: Band) => Math.round((band.min + band.max) / 2);

/**
 * Profile targets in the shape the app uses: a single goal per nutrient
 * (the middle of each JSC-67378 range) plus the ranges themselves.
 */
export function profileTargets(body: Body) {
  const req = calculateRequirements(body);
  if (!req) throw new Error(`Crew profile is outside the JSC-67378 equations (age ${body.age}).`);
  return {
    targets: {
      energy: req.energy,
      protein: midpoint(req.protein),
      carbs: midpoint(req.carbs),
      fat: midpoint(req.fat),
      fibre: req.fibre,
      fluid: req.fluidLitres,
    },
    ranges: { protein: req.protein, carbs: req.carbs, fat: req.fat },
  };
}

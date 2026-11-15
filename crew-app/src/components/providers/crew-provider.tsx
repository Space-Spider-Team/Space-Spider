"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  FOODS,
  PROFILES,
  type Macros,
  type MealCategory,
  type MealEntry,
  type Profile,
  makeMealEntry,
  sumMacros,
} from "@/lib/crew";
import {
  addFluidRecord,
  dayKey,
  defaultLog,
  fluidLitresForDay,
  foodWaterLitres,
  mealsForDay,
  moodForDay,
  recentMood,
  restoreLogs,
  setMoodRecord,
  timeLabel,
  type FluidRecord,
  type MoodRecord,
  type ProfileLog,
} from "@/lib/records";
import { calculateRequirements, type Body } from "@/lib/nutrition";

export type MoodEntry = { level: number; date: string };
export type DataSyncStatus = "checking" | "saving" | "supabase" | "local" | "error";

type CrewState = {
  profile: Profile;
  profiles: Profile[];
  selectProfile: (id: string) => void;
  /** Today's meals. */
  meals: MealEntry[];
  /** Dated meals retained for weekly and monthly nutrition trends. */
  mealHistory: MealEntry[];
  /** Today's fluid in litres: drinks plus the water in today's food (JSC-67378). */
  fluid: number;
  /** Today's drinks in litres. */
  drinkFluid: number;
  /** Water contained in today's logged food, in litres. */
  foodWater: number;
  /** Today's mood check-in. */
  mood?: MoodEntry;
  /** Every fluid record for this profile, all days. */
  fluidLog: FluidRecord[];
  /** Every mood check-in for this profile, all days. */
  moodLog: MoodRecord[];
  /** Mood levels for the last 7 days, oldest first (null = no check-in). */
  moodTrack: (number | null)[];
  /** True while earlier days of moodTrack come from the demo profile. */
  moodTrackIsDemo: boolean;
  totals: Macros;
  nutritionEstimate?: Body;
  saveNutritionEstimate: (estimate: Body) => void;
  addMeal: (foodId: string, category: MealCategory, portions: number) => void;
  removeMeal: (id: string) => void;
  addFluid: (ml: number) => void;
  setMood: (level: number) => void;
  markVitaminDTaken: () => void;
  vitaminDTaken: boolean;
  currentDay: string;
  dataSyncStatus: DataSyncStatus;
  dataSyncError: string;
  reportDataSyncStatus: (status: DataSyncStatus) => void;
  hydrated: boolean;
};

const STORE_KEY = "sagecare.logs.v2";
const PROFILE_KEY = "sagecare.profile.v2";
const SETTINGS_KEY = "sagecare.settings.v1";

async function responseError(response: Response, fallback: string): Promise<string> {
  try {
    const payload = await response.json() as { error?: unknown };
    if (typeof payload.error === "string" && payload.error.trim()) {
      return `${fallback} (${response.status}): ${payload.error}`;
    }
  } catch {
    // Use the status code when the server returned a non-JSON response.
  }
  return `${fallback} (${response.status}).`;
}

const CrewContext = createContext<CrewState | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function defaultLogs(day: string): Record<string, ProfileLog> {
  return Object.fromEntries(PROFILES.map((profile) => [profile.id, defaultLog(profile, day)]));
}

function isBody(value: unknown): value is Body {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const body = value as Partial<Body>;
  return (body.sex === "Female" || body.sex === "Male")
    && typeof body.age === "number"
    && typeof body.weightKg === "number"
    && typeof body.heightCm === "number"
    && calculateRequirements(body as Body) !== null;
}

function readNutritionEstimates(value: unknown): Record<string, Body> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter(([profileId, body]) => PROFILES.some((profile) => profile.id === profileId) && isBody(body))
    .map(([profileId, body]) => [profileId, body as Body]));
}

export function CrewProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState(PROFILES[0].id);
  const [logs, setLogs] = useState<Record<string, ProfileLog>>(() => defaultLogs(""));
  const [nutritionEstimates, setNutritionEstimates] = useState<Record<string, Body>>({});
  const [hydrated, setHydrated] = useState(false);
  const [currentDay, setCurrentDay] = useState("");
  const [dataSyncStatus, setDataSyncStatus] = useState<DataSyncStatus>("checking");
  const [dataSyncError, setDataSyncError] = useState("");
  const saveQueue = useRef(Promise.resolve());
  const reportDataSyncStatus = useCallback((status: DataSyncStatus) => {
    setDataSyncStatus(status);
    if (status !== "error") setDataSyncError("");
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      let serverStates: Record<string, Record<string, unknown>> | null = null;
      try {
        const response = await fetch("/api/state", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json() as { states?: Record<string, Record<string, unknown>>; storage?: string };
          serverStates = data.states ?? null;
          setDataSyncStatus(data.storage === "supabase" ? "supabase" : "local");
        } else {
          setDataSyncStatus("error");
          setDataSyncError(await responseError(response, "Could not load saved data"));
        }
      } catch (error) {
        setDataSyncStatus("error");
        setDataSyncError(error instanceof Error ? error.message : "Could not reach the save service.");
        // Keep working from this device if the server is temporarily unavailable.
      }

      let localLogs: unknown = null;
      let localSettings: unknown = null;
      let localProfile = "";
      try {
        const rawLogs = window.localStorage.getItem(STORE_KEY);
        localLogs = rawLogs ? JSON.parse(rawLogs) as unknown : null;
        const rawSettings = window.localStorage.getItem(SETTINGS_KEY);
        localSettings = rawSettings ? JSON.parse(rawSettings) as unknown : null;
        localProfile = window.localStorage.getItem(PROFILE_KEY) ?? "";
      } catch {
        // Browser storage may be disabled.
      }

      const serverLogs = serverStates?.crew ?? {};
      const hasServerLogs = Object.keys(serverLogs).length > 0;
      const today = dayKey();
      const restored = restoreLogs(hasServerLogs ? serverLogs : localLogs, PROFILES, today);
      const remoteSettings = serverStates?.settings?.__app__;
      const savedSettings = {
        ...(isRecord(localSettings) ? localSettings : {}),
        ...(isRecord(remoteSettings) ? remoteSettings : {}),
      };
      const nextProfile = savedSettings?.activeProfileId ?? localProfile;
      if (cancelled) return;
      setLogs(restored);
      setNutritionEstimates(readNutritionEstimates(savedSettings?.nutritionEstimates));
      if (typeof nextProfile === "string" && PROFILES.some((profile) => profile.id === nextProfile)) setActiveId(nextProfile);
      setCurrentDay(today);
      setHydrated(true);
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setInterval(() => {
      const today = dayKey();
      setCurrentDay((previous) => (previous === today ? previous : today));
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(logs));
      window.localStorage.setItem(PROFILE_KEY, activeId);
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ activeProfileId: activeId, nutritionEstimates }));
    } catch {
      /* ignore quota / privacy errors */
    }

    const save = async () => {
      setDataSyncStatus("saving");
      try {
        const logResponse = await fetch("/api/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain: "crew", states: logs }),
        });
        if (!logResponse.ok) throw new Error(await responseError(logResponse, "Crew data was not saved"));
        const settingsResponse = await fetch("/api/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain: "settings", states: { __app__: { activeProfileId: activeId, nutritionEstimates } } }),
        });
        if (!settingsResponse.ok) throw new Error(await responseError(settingsResponse, "App settings were not saved"));
        const saved = await settingsResponse.json() as { storage?: string };
        setDataSyncError("");
        setDataSyncStatus(saved.storage === "supabase" ? "supabase" : "local");
      } catch (error) {
        setDataSyncStatus("error");
        setDataSyncError(error instanceof Error ? error.message : "The database did not confirm the save.");
      }
    };
    saveQueue.current = saveQueue.current.catch(() => undefined).then(save);
  }, [logs, activeId, nutritionEstimates, hydrated]);

  const profile = useMemo(
    () => PROFILES.find((item) => item.id === activeId) ?? PROFILES[0],
    [activeId],
  );

  const log = logs[profile.id];

  const selectProfile = useCallback((id: string) => {
    if (PROFILES.some((item) => item.id === id)) setActiveId(id);
  }, []);

  const saveNutritionEstimate = useCallback((estimate: Body) => {
    setNutritionEstimates((previous) => ({ ...previous, [profile.id]: estimate }));
  }, [profile.id]);

  const addMeal = useCallback(
    (foodId: string, category: MealCategory, portions: number) => {
      const food = FOODS.find((item) => item.id === foodId && item.mealCategory);
      if (!food) return;
      const now = new Date();
      const entry = makeMealEntry(food, category, portions, timeLabel(now), dayKey(now));
      setLogs((prev) => ({
        ...prev,
        [profile.id]: { ...prev[profile.id], meals: [...prev[profile.id].meals, entry] },
      }));
    },
    [profile.id],
  );

  const removeMeal = useCallback(
    (id: string) => {
      setLogs((prev) => ({
        ...prev,
        [profile.id]: {
          ...prev[profile.id],
          meals: prev[profile.id].meals.filter((entry) => entry.id !== id),
        },
      }));
    },
    [profile.id],
  );

  const addFluid = useCallback(
    (ml: number) => {
      const now = new Date();
      setLogs((prev) => ({
        ...prev,
        [profile.id]: addFluidRecord(prev[profile.id], ml, dayKey(now), timeLabel(now)),
      }));
    },
    [profile.id],
  );

  const setMood = useCallback(
    (level: number) => {
      const now = new Date();
      setLogs((prev) => ({
        ...prev,
        [profile.id]: setMoodRecord(prev[profile.id], level, dayKey(now), timeLabel(now)),
      }));
    },
    [profile.id],
  );

  const markVitaminDTaken = useCallback(() => {
    setLogs((prev) => ({
      ...prev,
      [profile.id]: {
        ...prev[profile.id],
        vitaminD: { date: dayKey(), taken: true },
        vitaminDSource: "crew-entered",
      },
    }));
  }, [profile.id]);

  const vitaminDTaken = currentDay !== "" && log.vitaminD?.date === currentDay && log.vitaminD.taken === true;
  const todayMeals = useMemo(() => mealsForDay(log.meals, currentDay), [log.meals, currentDay]);
  const totals = useMemo(() => sumMacros(todayMeals), [todayMeals]);
  const drinkFluid = fluidLitresForDay(log.fluidLog, currentDay);
  const foodWater = useMemo(() => foodWaterLitres(todayMeals), [todayMeals]);
  const fluid = Math.round((drinkFluid + foodWater) * 1000) / 1000;
  const todayMood = moodForDay(log.moodLog, currentDay);
  const mood = todayMood ? { level: todayMood.level, date: todayMood.date } : undefined;
  const track = useMemo(
    () => (currentDay ? recentMood(log.moodLog, currentDay, profile.moodHistory) : { levels: [], demo: true }),
    [log.moodLog, currentDay, profile.moodHistory],
  );

  const value: CrewState = {
    profile,
    profiles: PROFILES,
    selectProfile,
    meals: todayMeals,
    mealHistory: log.meals,
    fluid,
    drinkFluid,
    foodWater,
    mood,
    fluidLog: log.fluidLog,
    moodLog: log.moodLog,
    moodTrack: track.levels,
    moodTrackIsDemo: track.demo,
    totals,
    nutritionEstimate: nutritionEstimates[profile.id],
    saveNutritionEstimate,
    addMeal,
    removeMeal,
    addFluid,
    setMood,
    markVitaminDTaken,
    vitaminDTaken,
    currentDay,
    dataSyncStatus,
    dataSyncError,
    reportDataSyncStatus,
    hydrated,
  };

  return <CrewContext.Provider value={value}>{children}</CrewContext.Provider>;
}

export function useCrew(): CrewState {
  const ctx = useContext(CrewContext);
  if (!ctx) throw new Error("useCrew must be used inside CrewProvider");
  return ctx;
}

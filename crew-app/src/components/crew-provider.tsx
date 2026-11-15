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

export type MoodEntry = { level: number; date: string };

type CrewState = {
  profile: Profile;
  profiles: Profile[];
  selectProfile: (id: string) => void;
  /** Today's meals. */
  meals: MealEntry[];
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
  addMeal: (foodId: string, category: MealCategory, portions: number) => void;
  removeMeal: (id: string) => void;
  addFluid: (ml: number) => void;
  setMood: (level: number) => void;
  markVitaminDTaken: () => void;
  vitaminDTaken: boolean;
  hydrated: boolean;
};

const STORE_KEY = "sagecare.logs.v2";
const PROFILE_KEY = "sagecare.profile.v2";

const CrewContext = createContext<CrewState | null>(null);

function defaultLogs(day: string): Record<string, ProfileLog> {
  return Object.fromEntries(PROFILES.map((profile) => [profile.id, defaultLog(profile, day)]));
}

export function CrewProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState(PROFILES[0].id);
  const [logs, setLogs] = useState<Record<string, ProfileLog>>(() => defaultLogs(""));
  const [hydrated, setHydrated] = useState(false);
  const [currentDay, setCurrentDay] = useState("");
  const saveQueue = useRef(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      let serverStates: Record<string, Record<string, unknown>> | null = null;
      try {
        const response = await fetch("/api/state", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json() as { states?: Record<string, Record<string, unknown>> };
          serverStates = data.states ?? null;
        }
      } catch {
        // Keep working from this device if the server is temporarily unavailable.
      }

      let localLogs: unknown = null;
      let localProfile = "";
      try {
        const rawLogs = window.localStorage.getItem(STORE_KEY);
        localLogs = rawLogs ? JSON.parse(rawLogs) as unknown : null;
        localProfile = window.localStorage.getItem(PROFILE_KEY) ?? "";
      } catch {
        // Browser storage may be disabled.
      }

      const serverLogs = serverStates?.crew ?? {};
      const hasServerLogs = Object.keys(serverLogs).length > 0;
      const today = dayKey();
      const restored = restoreLogs(hasServerLogs ? serverLogs : localLogs, PROFILES, today);
      const savedSettings = serverStates?.settings?.__app__ as { activeProfileId?: string } | undefined;
      const nextProfile = savedSettings?.activeProfileId ?? localProfile;
      if (cancelled) return;
      /* eslint-disable react-hooks/set-state-in-effect -- hydrate persistent server/browser state once */
      setLogs(restored);
      if (PROFILES.some((profile) => profile.id === nextProfile)) setActiveId(nextProfile);
      setCurrentDay(today);
      setHydrated(true);
      /* eslint-enable react-hooks/set-state-in-effect */
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
    } catch {
      /* ignore quota / privacy errors */
    }

    const save = async () => {
      const logResponse = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: "crew", states: logs }),
      });
      if (!logResponse.ok) throw new Error("Crew data was not saved to the database.");
      const settingsResponse = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: "settings", states: { __app__: { activeProfileId: activeId } } }),
      });
      if (!settingsResponse.ok) throw new Error("Profile selection was not saved.");
    };
    saveQueue.current = saveQueue.current.catch(() => undefined).then(save).catch(() => undefined);
  }, [logs, activeId, hydrated]);

  const profile = useMemo(
    () => PROFILES.find((item) => item.id === activeId) ?? PROFILES[0],
    [activeId],
  );

  const log = logs[profile.id];

  const selectProfile = useCallback((id: string) => {
    if (PROFILES.some((item) => item.id === id)) setActiveId(id);
  }, []);

  const addMeal = useCallback(
    (foodId: string, category: MealCategory, portions: number) => {
      const food = FOODS.find((item) => item.id === foodId);
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
    fluid,
    drinkFluid,
    foodWater,
    mood,
    fluidLog: log.fluidLog,
    moodLog: log.moodLog,
    moodTrack: track.levels,
    moodTrackIsDemo: track.demo,
    totals,
    addMeal,
    removeMeal,
    addFluid,
    setMood,
    markVitaminDTaken,
    vitaminDTaken,
    hydrated,
  };

  return <CrewContext.Provider value={value}>{children}</CrewContext.Provider>;
}

export function useCrew(): CrewState {
  const ctx = useContext(CrewContext);
  if (!ctx) throw new Error("useCrew must be used inside CrewProvider");
  return ctx;
}

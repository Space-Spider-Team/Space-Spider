"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  FOODS,
  PROFILES,
  type Macros,
  type MealCategory,
  type MealEntry,
  type Profile,
  makeMealEntry,
  scaleMacros,
  seedEntries,
  sumMacros,
} from "@/lib/crew";

export type MoodEntry = { level: number; date: string };

type ProfileLog = {
  meals: MealEntry[];
  fluid: number;
  mood?: MoodEntry;
  vitaminD?: { date: string; taken: boolean };
};

type CrewState = {
  profile: Profile;
  profiles: Profile[];
  selectProfile: (id: string) => void;
  meals: MealEntry[];
  fluid: number;
  mood?: MoodEntry;
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

function defaultLogs(): Record<string, ProfileLog> {
  return Object.fromEntries(
    PROFILES.map((profile) => [profile.id, { meals: seedEntries(profile), fluid: profile.baseFluid }]),
  );
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowLabel(): string {
  return `${new Date().toISOString().slice(11, 16)} UTC`;
}

export function CrewProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState(PROFILES[0].id);
  const [logs, setLogs] = useState<Record<string, ProfileLog>>(defaultLogs);
  const [hydrated, setHydrated] = useState(false);
  const [currentDay, setCurrentDay] = useState("");

  useEffect(() => {
    /* Logs live in localStorage, which is only readable after mount. Loading them
       once here is intentional, so the hydrate-on-mount setState is allowed. */
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const rawLogs = window.localStorage.getItem(STORE_KEY);
      if (rawLogs) {
        const parsed = JSON.parse(rawLogs) as Record<string, ProfileLog>;
        setLogs((prev) => {
          const next = { ...prev };
          for (const profile of PROFILES) {
            const entry = parsed[profile.id];
            if (entry && Array.isArray(entry.meals) && typeof entry.fluid === "number") {
              next[profile.id] = {
                ...entry,
                meals: entry.meals.map((meal) => {
                  const food = FOODS.find((item) => item.id === meal.foodId);
                  return food ? { ...meal, macros: scaleMacros(food.macros, meal.portions) } : meal;
                }),
              };
            }
          }
          return next;
        });
      }
      const rawProfile = window.localStorage.getItem(PROFILE_KEY);
      if (rawProfile && PROFILES.some((profile) => profile.id === rawProfile)) {
        setActiveId(rawProfile);
      }
    } catch {
      /* storage unavailable — keep in-memory defaults */
    } finally {
      setHydrated(true);
    }
    setCurrentDay(todayKey());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(logs));
      window.localStorage.setItem(PROFILE_KEY, activeId);
    } catch {
      /* ignore quota / privacy errors */
    }
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
      const entry = makeMealEntry(food, category, portions, nowLabel());
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
      setLogs((prev) => {
        const current = prev[profile.id];
        const next = Math.max(0, Math.round((current.fluid + ml / 1000) * 100) / 100);
        return { ...prev, [profile.id]: { ...current, fluid: next } };
      });
    },
    [profile.id],
  );

  const setMood = useCallback(
    (level: number) => {
      setLogs((prev) => {
        const current = prev[profile.id];
        const nextMood = { level, date: todayKey() };
        return {
          ...prev,
          [profile.id]: {
            ...current,
            mood: current.mood && current.mood.date === nextMood.date ? { ...nextMood } : nextMood,
          },
        };
      });
    },
    [profile.id],
  );

  const markVitaminDTaken = useCallback(() => {
    setLogs((prev) => ({
      ...prev,
      [profile.id]: {
        ...prev[profile.id],
        vitaminD: { date: todayKey(), taken: true },
      },
    }));
  }, [profile.id]);

  const vitaminDTaken = currentDay !== "" && log.vitaminD?.date === currentDay && log.vitaminD.taken === true;
  const totals = useMemo(() => sumMacros(log.meals), [log.meals]);

  const value: CrewState = {
    profile,
    profiles: PROFILES,
    selectProfile,
    meals: log.meals,
    fluid: log.fluid,
    mood: log.mood,
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

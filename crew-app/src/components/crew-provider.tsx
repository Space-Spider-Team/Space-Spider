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
  scaleMacros,
  seedEntries,
  sumMacros,
} from "@/lib/crew";

export type MoodEntry = { level: number; date: string };

type ProfileLog = {
  meals: MealEntry[];
  fluid: number;
  fluidSource?: "demo-seed" | "crew-entered";
  mood?: MoodEntry;
  moodSource?: "crew-entered";
  vitaminD?: { date: string; taken: boolean };
  vitaminDSource?: "crew-entered";
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
    PROFILES.map((profile) => [profile.id, { meals: seedEntries(profile), fluid: profile.baseFluid, fluidSource: "demo-seed" }]),
  );
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowLabel(): string {
  return `${new Date().toISOString().slice(11, 16)} UTC`;
}

function restoreLogs(raw: unknown, defaults: Record<string, ProfileLog>): Record<string, ProfileLog> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;
  const parsed = raw as Record<string, unknown>;
  const next = { ...defaults };
  for (const profile of PROFILES) {
    const entry = parsed[profile.id] as ProfileLog | undefined;
    if (!entry || !Array.isArray(entry.meals) || typeof entry.fluid !== "number") continue;
    next[profile.id] = {
      ...entry,
      meals: entry.meals.map((meal) => {
        const food = FOODS.find((item) => item.id === meal.foodId);
        return food ? {
          ...meal,
          macros: scaleMacros(food.macros, meal.portions),
          source: meal.source ?? {
            record: "migrated" as const,
            nutrients: food.usda ? "usda-fdc" as const : "demo-estimate" as const,
            url: food.usda?.url,
          },
        } : meal;
      }),
    };
  }
  return next;
}

export function CrewProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState(PROFILES[0].id);
  const [logs, setLogs] = useState<Record<string, ProfileLog>>(defaultLogs);
  const [hydrated, setHydrated] = useState(false);
  const [currentDay, setCurrentDay] = useState("");
  const saveQueue = useRef(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    const defaults = defaultLogs();
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
      const restored = restoreLogs(hasServerLogs ? serverLogs : localLogs, defaults);
      const savedSettings = serverStates?.settings?.__app__ as { activeProfileId?: string } | undefined;
      const nextProfile = savedSettings?.activeProfileId ?? localProfile;
      if (cancelled) return;
      /* eslint-disable react-hooks/set-state-in-effect -- hydrate persistent server/browser state once */
      setLogs(restored);
      if (PROFILES.some((profile) => profile.id === nextProfile)) setActiveId(nextProfile);
      setCurrentDay(todayKey());
      setHydrated(true);
      /* eslint-enable react-hooks/set-state-in-effect */
    };
    void load();
    return () => { cancelled = true; };
  }, []);

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
        return { ...prev, [profile.id]: { ...current, fluid: next, fluidSource: "crew-entered" } };
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
            moodSource: "crew-entered",
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
        vitaminDSource: "crew-entered",
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

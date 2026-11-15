"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCrew } from "@/components/crew-provider";

type Reminder = {
  title: string;
  message: string;
  action: "water" | "meal" | "check-in";
};

export function HealthReminderToast() {
  const { profile, fluid, meals, mood, addFluid, currentDay, hydrated } = useCrew();
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const shownKey = useRef("");
  const reminderKey = `sagecare.health-reminder.${profile.id}.${currentDay}`;

  const dismiss = useCallback(() => {
    try {
      window.sessionStorage.setItem(reminderKey, "dismissed");
    } catch {
      // The toast still dismisses if browser storage is unavailable.
    }
    setReminder(null);
  }, [reminderKey]);

  useEffect(() => {
    if (!hydrated || shownKey.current === reminderKey) return;
    shownKey.current = reminderKey;
    let timeout: number | undefined;

    try {
      if (window.sessionStorage.getItem(reminderKey)) return;
    } catch {
      // Continue without session storage.
    }

    const shortfall = Math.max(0, profile.targets.fluid - fluid);
    const nextReminder: Reminder | null = shortfall >= 0.5
      ? {
          title: "Hydration check",
          message: `${shortfall.toFixed(1)} L to reach today's fluid minimum.`,
          action: "water",
        }
      : meals.length === 0
        ? { title: "Meal log is empty", message: "Add a meal to update today's nutrition summary.", action: "meal" }
        : mood?.date !== currentDay
          ? { title: "Daily check-in", message: "A quick check-in adds context to today's health snapshot.", action: "check-in" }
          : null;

    if (nextReminder) timeout = window.setTimeout(() => setReminder(nextReminder), 0);
    return () => {
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [currentDay, fluid, hydrated, meals.length, mood, profile.targets.fluid, reminderKey]);

  useEffect(() => {
    if (!reminder) return;
    const timeout = window.setTimeout(dismiss, 12_000);
    return () => window.clearTimeout(timeout);
  }, [dismiss, reminder]);

  useEffect(() => {
    if (!reminder) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dismiss, reminder]);

  if (!reminder) return null;

  return (
    <aside className="health-toast" role="status" aria-live="polite" aria-atomic="true">
      <span className="health-toast__mark" aria-hidden="true">i</span>
      <div className="min-w-0 flex-1">
        <p className="health-toast__title">{reminder.title}</p>
        <p className="health-toast__message">{reminder.message}</p>
        {reminder.action === "water" ? (
          <button
            type="button"
            className="health-toast__action"
            onClick={() => {
              addFluid(250);
              dismiss();
            }}
          >
            Log 250 mL
          </button>
        ) : (
          <Link
            className="health-toast__action"
            href={reminder.action === "meal" ? "/nutrition#food-log" : "/#daily-check-in"}
            onClick={dismiss}
          >
            {reminder.action === "meal" ? "Log a meal" : "Check in"}
          </Link>
        )}
      </div>
      <button type="button" className="health-toast__close" aria-label="Dismiss reminder" onClick={dismiss}>
        <span aria-hidden="true">×</span>
      </button>
    </aside>
  );
}

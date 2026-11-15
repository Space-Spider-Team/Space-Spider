"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCrew } from "@/components/providers/crew-provider";

type Reminder = {
  title: string;
  message: string;
  action: "water" | "meal" | "check-in";
};

export function HealthReminderToast() {
  const { profile, fluid, meals, mood, addFluid, currentDay, hydrated } = useCrew();
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const shownKey = useRef("");
  const soundedReminder = useRef("");
  const reminderKey = `sagecare.health-reminder.${profile.id}.${currentDay}`;

  const dismiss = useCallback(() => {
    try {
      window.sessionStorage.setItem(reminderKey, "dismissed");
    } catch {
      // The toast still dismisses if browser storage is unavailable.
    }
    setReminder(null);
  }, [reminderKey]);

  // Browsers require a user gesture before they allow sound. Track that gesture
  // once so future reminders can play immediately without interrupting them.
  useEffect(() => {
    const unlock = () => setAudioUnlocked(true);
    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    if (!reminder || !audioUnlocked) return;
    const soundKey = `${reminderKey}.${reminder.title}`;
    if (soundedReminder.current === soundKey) return;
    soundedReminder.current = soundKey;

    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) return;
    let context: AudioContext | undefined;
    try {
      context = new AudioContextConstructor();
      const now = context.currentTime;
      const master = context.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.035, now + 0.045);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);
      master.connect(context.destination);

      // A quiet two-note sine chime keeps health reminders noticeable but soft.
      [659.25, 880].forEach((frequency, index) => {
        const oscillator = context!.createOscillator();
        const noteGain = context!.createGain();
        const start = now + index * 0.12;
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, start);
        noteGain.gain.setValueAtTime(0.0001, start);
        noteGain.gain.exponentialRampToValueAtTime(index === 0 ? 0.68 : 0.48, start + 0.025);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.48);
        oscillator.connect(noteGain);
        noteGain.connect(master);
        oscillator.start(start);
        oscillator.stop(start + 0.5);
      });
      window.setTimeout(() => { void context?.close(); }, 800);
    } catch {
      // Notifications still work when audio is unavailable or blocked.
      void context?.close();
    }
  }, [audioUnlocked, reminder, reminderKey]);

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

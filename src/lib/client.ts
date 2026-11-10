"use client";
import { useCallback, useEffect, useState } from "react";
import { PublicExercise, Feedback } from "./exercise-types";
import { LessonContent } from "./courses";
export type Preferences = {
  language: "fr" | "en";
  theme: "light" | "dark";
  depth: "brief" | "teach";
  goal: "learn" | "td" | "exam";
  minutes: number;
  familiarity: "beginner" | "some" | "confident";
  reducedMotion: boolean;
  onboarded: boolean;
};
export const defaultPreferences: Preferences = {
  language: "fr",
  theme: "light",
  depth: "teach",
  goal: "learn",
  minutes: 20,
  familiarity: "beginner",
  reducedMotion: false,
  onboarded: false,
};
export type ClientLesson = {
  id: string;
  moduleId: string;
  slug: string;
  title: string;
  titleEn: string;
  duration: number;
  content: LessonContent;
  published: boolean;
};
export type Attempt = {
  id: string;
  exerciseId: string;
  status: string;
  answer: unknown;
  feedback: Feedback | null;
  score: number | null;
  createdAt: string;
  submittedAt: string | null;
  hintLevel: number;
  exercise: PublicExercise;
};
export type SummaryAttempt = Omit<Attempt, "exercise"> & {
  exercise: { topic: string; type: string; title: string; titleEn: string };
};
export type Exam = {
  id: string;
  title: string;
  minutes: number;
  practice: boolean;
  exerciseIds: string[];
  answers: Record<string, unknown>;
  feedback: (Feedback & { id: string; skipped: boolean })[] | null;
  score: number | null;
  status: string;
  createdAt: string;
  submittedAt: string | null;
  exercises: PublicExercise[];
};
export type Thread = {
  id: string;
  title: string;
  messages: {
    id: string;
    role: string;
    content: string;
    citations: { title: string; page: number; verified: boolean }[];
  }[];
};
export type Bootstrap = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    preferences: Partial<Preferences>;
  };
  lessons: ClientLesson[];
  progress: { lessonId: string; completed: boolean }[];
  attempts: SummaryAttempt[];
  exams: Exam[];
  bookmarks: { lessonId: string }[];
  events: { id: string; type: string; topic: string; createdAt: string }[];
  threads: Thread[];
  exercises: PublicExercise[];
  providerConfigured: boolean;
};
export async function api<T = Record<string, unknown>>(
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch("/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Request failed.");
  return data;
}
export function useData<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setError("");
    try {
      const r = await fetch(url, { cache: "no-store" });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "Request failed.");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }, [url]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { data, error, loading, refresh, setData };
}

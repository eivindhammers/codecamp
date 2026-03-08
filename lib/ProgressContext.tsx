"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
} from "react";
import { courses } from "@/lib/courses";
import { ExerciseProgressRecord, UserCatalogProgressResponse } from "@/lib/grading/contracts";
import { UserProgress } from "@/lib/types";

const STORAGE_KEY = "codecamp_progress";
const USER_STORAGE_KEY = "codecamp_user_id";

const initialState: UserProgress = {
  completedExercises: {},
  xp: 0,
  completedCourses: [],
};

type Action =
  | { type: "COMPLETE_EXERCISE"; exerciseKey: string; xp: number }
  | { type: "COMPLETE_COURSE"; slug: string }
  | { type: "LOAD"; state: UserProgress };

function reducer(state: UserProgress, action: Action): UserProgress {
  switch (action.type) {
    case "LOAD":
      return action.state;
    case "COMPLETE_EXERCISE": {
      if (state.completedExercises[action.exerciseKey]) return state;
      return {
        ...state,
        xp: state.xp + action.xp,
        completedExercises: {
          ...state.completedExercises,
          [action.exerciseKey]: true,
        },
      };
    }
    case "COMPLETE_COURSE": {
      if (state.completedCourses.includes(action.slug)) return state;
      return {
        ...state,
        completedCourses: [...state.completedCourses, action.slug],
      };
    }
    default:
      return state;
  }
}

interface ProgressContextValue {
  progress: UserProgress;
  completeExercise: (courseSlug: string, chapterId: string, exerciseId: string, xp: number) => void;
  completeCourse: (slug: string) => void;
  isExerciseDone: (courseSlug: string, chapterId: string, exerciseId: string) => boolean;
  courseProgress: (slug: string) => { completed: number; total: number; xp: number; totalXp: number };
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

function getOrCreateUserId(): string {
  if (typeof window === "undefined") return "";
  const existing = localStorage.getItem(USER_STORAGE_KEY);
  if (existing) return existing;
  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `user-${Date.now()}`;
  localStorage.setItem(USER_STORAGE_KEY, generated);
  return generated;
}

function getExerciseXpByKey(): Record<string, number> {
  const xpByKey: Record<string, number> = {};
  for (const course of courses) {
    for (const chapter of course.chapters) {
      for (const exercise of chapter.exercises) {
        xpByKey[`${course.slug}/${chapter.id}/${exercise.id}`] = exercise.xp;
      }
    }
  }
  return xpByKey;
}

function deriveCompletedCourses(completedExercises: Record<string, boolean>): string[] {
  return courses
    .filter((course) =>
      course.chapters.every((chapter) =>
        chapter.exercises.every(
          (exercise) => completedExercises[`${course.slug}/${chapter.id}/${exercise.id}`]
        )
      )
    )
    .map((course) => course.slug);
}

function mergeBackendProgress(
  local: UserProgress,
  backend: ExerciseProgressRecord[]
): UserProgress {
  const xpByKey = getExerciseXpByKey();
  const knownKeys = new Set(Object.keys(xpByKey));
  if (backend.length === 0) {
    const localExercises: Record<string, boolean> = {};
    for (const key of Object.keys(local.completedExercises)) {
      if (local.completedExercises[key] && knownKeys.has(key)) {
        localExercises[key] = true;
      }
    }
    const localXp = Object.keys(localExercises).reduce(
      (acc, key) => acc + (localExercises[key] ? (xpByKey[key] ?? 0) : 0),
      0
    );
    return {
      completedExercises: localExercises,
      completedCourses: deriveCompletedCourses(localExercises),
      xp: localXp,
    };
  }

  const backendExercises: Record<string, boolean> = {};
  let backendXp = 0;
  for (const row of backend) {
    const key = `${row.courseSlug}/${row.chapterId}/${row.exerciseId}`;
    if (!knownKeys.has(key)) continue;
    backendExercises[key] = true;
    backendXp += row.xpAwarded;
  }

  return {
    completedExercises: backendExercises,
    completedCourses: deriveCompletedCourses(backendExercises),
    xp: backendXp,
  };
}

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [progress, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        dispatch({ type: "LOAD", state: JSON.parse(saved) });
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const userId = getOrCreateUserId();
    if (!userId) return;

    let cancelled = false;
    async function hydrateFromBackend() {
      try {
        const response = await fetch(`/api/progress?userId=${encodeURIComponent(userId)}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as UserCatalogProgressResponse;
        if (cancelled) return;

        let localState = initialState;
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            localState = JSON.parse(saved) as UserProgress;
          }
        } catch {
          // ignore
        }

        dispatch({
          type: "LOAD",
          state: mergeBackendProgress(localState, payload.progress),
        });
      } catch {
        // ignore
      }
    }

    void hydrateFromBackend();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // ignore
    }
  }, [progress]);

  function completeExercise(
    courseSlug: string,
    chapterId: string,
    exerciseId: string,
    xp: number
  ) {
    const key = `${courseSlug}/${chapterId}/${exerciseId}`;
    dispatch({ type: "COMPLETE_EXERCISE", exerciseKey: key, xp });
  }

  function completeCourse(slug: string) {
    dispatch({ type: "COMPLETE_COURSE", slug });
  }

  function isExerciseDone(
    courseSlug: string,
    chapterId: string,
    exerciseId: string
  ): boolean {
    return !!progress.completedExercises[`${courseSlug}/${chapterId}/${exerciseId}`];
  }

  function courseProgress(slug: string) {
    const course = courses.find((c) => c.slug === slug);
    const allExercises = course
      ? course.chapters.flatMap((ch) =>
          ch.exercises.map((ex) => ({ chapterId: ch.id, exerciseId: ex.id, xp: ex.xp }))
        )
      : [];
    const total = allExercises.length;
    const totalXp = allExercises.reduce((acc, ex) => acc + ex.xp, 0);
    const completed = allExercises.filter(
      (ex) =>
        !!progress.completedExercises[`${slug}/${ex.chapterId}/${ex.exerciseId}`]
    ).length;
    const earnedXp = allExercises
      .filter(
        (ex) =>
          !!progress.completedExercises[`${slug}/${ex.chapterId}/${ex.exerciseId}`]
      )
      .reduce((acc, ex) => acc + ex.xp, 0);
    return { completed, total, xp: earnedXp, totalXp };
  }

  return (
    <ProgressContext.Provider
      value={{ progress, completeExercise, completeCourse, isExerciseDone, courseProgress }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used inside ProgressProvider");
  return ctx;
}

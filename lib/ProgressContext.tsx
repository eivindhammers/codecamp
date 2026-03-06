"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
} from "react";
import { courses } from "@/lib/courses";
import { UserProgress } from "@/lib/types";

const STORAGE_KEY = "codecamp_progress";

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

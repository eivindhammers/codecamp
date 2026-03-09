"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { courses } from "@/lib/courses";
import { ExerciseProgressRecord, UserCatalogProgressResponse } from "@/lib/grading/contracts";
import { useProgress } from "@/lib/ProgressContext";

const USER_STORAGE_KEY = "codecamp_user_id";

function getDayStart(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function computeStreaks(completedAt: number[], todayStart: number) {
  if (completedAt.length === 0) {
    return { currentStreak: 0, bestStreak: 0, lastCompletedAt: null as number | null };
  }

  const uniqueDays = Array.from(new Set(completedAt.map(getDayStart))).sort((a, b) => a - b);
  let bestStreak = 1;
  let running = 1;
  for (let i = 1; i < uniqueDays.length; i += 1) {
    const dayDelta = uniqueDays[i] - uniqueDays[i - 1];
    if (dayDelta === 24 * 60 * 60 * 1000) {
      running += 1;
      bestStreak = Math.max(bestStreak, running);
    } else {
      running = 1;
    }
  }

  let currentStreak = 0;
  let cursor = todayStart;
  const daySet = new Set(uniqueDays);
  while (daySet.has(cursor)) {
    currentStreak += 1;
    cursor -= 24 * 60 * 60 * 1000;
  }

  return {
    currentStreak,
    bestStreak,
    lastCompletedAt: Math.max(...completedAt),
  };
}

export default function ProgressPage() {
  const { progress, courseProgress, syncStatus } = useProgress();
  const [backendProgress, setBackendProgress] = useState<ExerciseProgressRecord[]>([]);
  const [backendProgressError, setBackendProgressError] = useState("");
  const [nowTimestamp] = useState(() => Date.now());

  useEffect(() => {
    const userId = localStorage.getItem(USER_STORAGE_KEY)?.trim() ?? "";
    if (!userId) return;

    let cancelled = false;
    async function loadCatalogProgress() {
      try {
        const response = await fetch(`/api/progress?userId=${encodeURIComponent(userId)}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          if (!cancelled) {
            setBackendProgressError(`Unable to load completion timeline (${response.status}).`);
          }
          return;
        }
        const payload = (await response.json()) as UserCatalogProgressResponse;
        if (!cancelled) {
          setBackendProgress(payload.progress);
          setBackendProgressError("");
        }
      } catch {
        if (!cancelled) {
          setBackendProgressError("Unable to load completion timeline.");
        }
      }
    }

    void loadCatalogProgress();
    return () => {
      cancelled = true;
    };
  }, []);

  const completionStats = useMemo(() => {
    return computeStreaks(backendProgress.map((item) => item.completedAt), getDayStart(nowTimestamp));
  }, [backendProgress, nowTimestamp]);
  const completedLast7Days = useMemo(() => {
    const cutoff = nowTimestamp - 7 * 24 * 60 * 60 * 1000;
    return backendProgress.filter((item) => item.completedAt >= cutoff).length;
  }, [backendProgress, nowTimestamp]);
  const topCourse = useMemo(() => {
    return courses
      .map((course) => ({
        slug: course.slug,
        title: course.title,
        xp: courseProgress(course.slug).xp,
      }))
      .sort((a, b) => b.xp - a.xp)[0];
  }, [courseProgress]);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold text-gray-900">Progress</h1>
        <p className="text-gray-600 mt-2">
          Track your XP and completion progress across all courses.
        </p>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Total XP</p>
          <p className="text-2xl font-semibold text-indigo-600">{progress.xp}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Exercises completed</p>
          <p className="text-2xl font-semibold text-indigo-600">
            {Object.keys(progress.completedExercises).length}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Courses completed</p>
          <p className="text-2xl font-semibold text-indigo-600">{progress.completedCourses.length}</p>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Current streak</p>
          <p className="text-2xl font-semibold text-indigo-600">{completionStats.currentStreak} days</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Best streak</p>
          <p className="text-2xl font-semibold text-indigo-600">{completionStats.bestStreak} days</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Completed (7 days)</p>
          <p className="text-2xl font-semibold text-indigo-600">{completedLast7Days}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Top course by XP</p>
          <p className="text-sm font-semibold text-gray-900 truncate">{topCourse?.title ?? "No activity yet"}</p>
          <p className="text-indigo-600 text-sm">{topCourse?.xp ?? 0} XP</p>
        </div>
      </section>

      {(backendProgressError || syncStatus === "error") && (
        <p className="text-sm text-rose-700">
          {backendProgressError || "Progress sync is currently unavailable; showing cached totals."}
        </p>
      )}
      {completionStats.lastCompletedAt && (
        <p className="text-sm text-gray-600">
          Last completed exercise: {new Date(completionStats.lastCompletedAt).toLocaleString()}
        </p>
      )}

      <section className="space-y-3">
        {courses.map((course) => {
          const stats = courseProgress(course.slug);
          const percent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
          return (
            <div key={course.slug} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900">{course.title}</p>
                  <p className="text-sm text-gray-600">
                    {stats.completed}/{stats.total} exercises · {stats.xp}/{stats.totalXp} XP
                  </p>
                </div>
                <Link
                  href={`/courses/${course.slug}`}
                  className="text-sm border border-gray-300 rounded-md px-3 py-1 text-gray-700 hover:bg-gray-50"
                >
                  Open course
                </Link>
              </div>
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

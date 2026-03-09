"use client";

import Link from "next/link";
import { courses } from "@/lib/courses";
import { useProgress } from "@/lib/ProgressContext";

export default function ProgressPage() {
  const { progress, courseProgress } = useProgress();

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

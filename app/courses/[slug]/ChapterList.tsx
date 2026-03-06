"use client";

import Link from "next/link";
import { Course } from "@/lib/types";
import { useProgress } from "@/lib/ProgressContext";

export default function ChapterList({ course }: { course: Course }) {
  const { isExerciseDone } = useProgress();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Course Content</h2>
      {course.chapters.map((chapter, chIdx) => {
        const completedCount = chapter.exercises.filter((ex) =>
          isExerciseDone(course.slug, chapter.id, ex.id)
        ).length;
        const total = chapter.exercises.length;
        const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

        return (
          <div
            key={chapter.id}
            className="bg-white border border-gray-200 rounded-xl overflow-hidden"
          >
            {/* Chapter header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Chapter {chIdx + 1}
                </span>
                <h3 className="font-semibold text-gray-900 mt-0.5">
                  {chapter.title}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">{chapter.description}</p>
              </div>
              <div className="text-right ml-4 shrink-0">
                <p className="text-sm font-medium text-gray-700">
                  {completedCount}/{total}
                </p>
                <div className="w-20 bg-gray-100 rounded-full h-1.5 mt-1">
                  <div
                    className="bg-indigo-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Exercise list */}
            <ul className="divide-y divide-gray-50">
              {chapter.exercises.map((exercise, exIdx) => {
                const done = isExerciseDone(course.slug, chapter.id, exercise.id);
                return (
                  <li key={exercise.id}>
                    <Link
                      href={`/courses/${course.slug}/${chapter.id}/exercise/${exercise.id}`}
                      className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors group"
                    >
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          done
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500 group-hover:bg-indigo-50 group-hover:text-indigo-600"
                        }`}
                      >
                        {done ? "✓" : exIdx + 1}
                      </span>
                      <span
                        className={`text-sm flex-1 ${
                          done ? "text-gray-400 line-through" : "text-gray-700 group-hover:text-indigo-600"
                        }`}
                      >
                        {exercise.title}
                      </span>
                      <span className="text-xs text-yellow-600 font-medium shrink-0">
                        +{exercise.xp} XP
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

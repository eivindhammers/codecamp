"use client";

import Link from "next/link";
import { Course } from "@/lib/types";
import { useProgress } from "@/lib/ProgressContext";

const levelBadge: Record<string, string> = {
  beginner: "bg-green-100 text-green-800",
  intermediate: "bg-yellow-100 text-yellow-800",
  advanced: "bg-red-100 text-red-800",
};

const langBadge: Record<string, string> = {
  r: "bg-blue-100 text-blue-800",
  python: "bg-purple-100 text-purple-800",
};

export default function CourseCard({ course }: { course: Course }) {
  const { progress } = useProgress();

  const allExercises = course.chapters.flatMap((ch) => ch.exercises);
  const totalExercises = allExercises.length;
  const completedExercises = allExercises.filter(
    (ex) =>
      progress.completedExercises[
        `${course.slug}/${course.chapters.find((ch) =>
          ch.exercises.some((e) => e.id === ex.id)
        )?.id}/${ex.id}`
      ]
  ).length;

  const pct = totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;

  return (
    <Link href={`/courses/${course.slug}`} className="block group">
      <div className="border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-indigo-300 transition-all duration-200 bg-white h-full flex flex-col">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-3xl">{course.icon}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
              {course.title}
            </h3>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4 flex-1 line-clamp-3">
          {course.description}
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${langBadge[course.language]}`}>
            {course.language === "r" ? "R" : "Python"}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelBadge[course.level]}`}>
            {course.level}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700">
            {course.xpTotal} XP
          </span>
        </div>

        <div className="mt-auto">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{completedExercises}/{totalExercises} exercises</span>
            <span>{pct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

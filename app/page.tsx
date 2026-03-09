import Link from "next/link";
import { courses } from "@/lib/courses";

export default function HomePage() {
  return (
    <div>
      <section className="text-center py-12 mb-10">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
          CodeCamp Learning Hub
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Browse courses, jump into practice, track your progress, and run your classroom
          in one place.
        </p>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
          <Link
            href="/learn"
            className="bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition-colors"
          >
            <p className="font-semibold text-gray-900">Learn</p>
            <p className="text-sm text-gray-600 mt-1">Browse all courses by level.</p>
          </Link>
          <Link
            href="/progress"
            className="bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition-colors"
          >
            <p className="font-semibold text-gray-900">Progress</p>
            <p className="text-sm text-gray-600 mt-1">Track XP and course completion.</p>
          </Link>
          <Link
            href="/classroom"
            className="bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition-colors"
          >
            <p className="font-semibold text-gray-900">Classroom</p>
            <p className="text-sm text-gray-600 mt-1">Instructor dashboard and governance.</p>
          </Link>
        </div>
      </section>
      <section className="border-t border-gray-200 pt-8 mt-4">
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-3xl font-bold text-indigo-600">{courses.length}</p>
            <p className="text-sm text-gray-500 mt-1">Courses</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-indigo-600">
              {courses.reduce(
                (acc, c) =>
                  acc + c.chapters.reduce((a, ch) => a + ch.exercises.length, 0),
                0
              )}
            </p>
            <p className="text-sm text-gray-500 mt-1">Exercises</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-indigo-600">
              {courses.reduce((acc, c) => acc + c.xpTotal, 0)}
            </p>
            <p className="text-sm text-gray-500 mt-1">XP available</p>
          </div>
        </div>
      </section>
    </div>
  );
}

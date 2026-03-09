import Link from "next/link";
import { courses } from "@/lib/courses";

export default function PracticePage() {
  const beginnerTracks = courses.filter((course) => course.level === "beginner");
  const advancedTracks = courses.filter((course) => course.level !== "beginner");

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold text-gray-900">Practice</h1>
        <p className="text-gray-600 mt-2">
          Jump directly into a track and keep earning XP with guided coding exercises.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Start here</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {beginnerTracks.map((course) => (
            <Link
              key={course.slug}
              href={`/courses/${course.slug}`}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition-colors"
            >
              <p className="font-semibold text-gray-900">
                {course.icon} {course.title}
              </p>
              <p className="text-sm text-gray-600 mt-1">{course.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {advancedTracks.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Keep leveling up</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {advancedTracks.map((course) => (
              <Link
                key={course.slug}
                href={`/courses/${course.slug}`}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition-colors"
              >
                <p className="font-semibold text-gray-900">
                  {course.icon} {course.title}
                </p>
                <p className="text-sm text-gray-600 mt-1">{course.description}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

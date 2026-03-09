import { courses } from "@/lib/courses";
import CourseCard from "@/components/CourseCard";
import { CourseLevel } from "@/lib/types";

const levelOrder: CourseLevel[] = ["beginner", "intermediate", "advanced"];

const grouped = levelOrder.flatMap((level) => {
  const filtered = courses.filter((c) => c.level === level);
  return filtered.length > 0 ? [{ level, courses: filtered }] : [];
});

export default function LearnCatalog() {
  return (
    <div>
      <section className="text-center py-12 mb-10">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
          Learn <span className="text-indigo-600">R&nbsp;&amp;&nbsp;Python</span> with
          interactive courses
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Gamified, hands-on courses for economists and data scientists. Write real code,
          earn XP, and level up your skills.
        </p>
      </section>

      {grouped.map(({ level, courses: levelCourses }) => (
        <section key={level} className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-1 capitalize">
            {level === "beginner" ? "🌱" : level === "intermediate" ? "🌿" : "🌳"}{" "}
            {level} Courses
          </h2>
          <p className="text-gray-500 text-sm mb-5">
            {level === "beginner"
              ? "No experience needed — start here."
              : level === "intermediate"
              ? "Build on your foundations and learn powerful tools."
              : "Advanced techniques for seasoned practitioners."}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {levelCourses.map((course) => (
              <CourseCard key={course.slug} course={course} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

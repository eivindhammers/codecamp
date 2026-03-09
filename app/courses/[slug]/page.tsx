import { notFound } from "next/navigation";
import Link from "next/link";
import { getCourse } from "@/lib/courses";
import ChapterList from "./ChapterList";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) return { title: "Course not found" };
  return {
    title: `${course.title} – CodeCamp`,
    description: course.description,
  };
}

export default async function CoursePage({ params }: Props) {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) notFound();

  const totalExercises = course.chapters.reduce(
    (acc, ch) => acc + ch.exercises.length,
    0
  );
  const totalXp = course.chapters.reduce(
    (acc, ch) => ch.exercises.reduce((a, ex) => a + ex.xp, acc),
    0
  );

  const langLabel = course.language === "r" ? "R" : "Python";
  const levelColor =
    course.level === "beginner"
      ? "text-green-700 bg-green-50"
      : course.level === "intermediate"
      ? "text-yellow-700 bg-yellow-50"
      : "text-red-700 bg-red-50";

  return (
    <div>
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 mb-6 transition-colors"
      >
        ← All Courses
      </Link>

      {/* Course header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-8 mb-8">
        <div className="flex items-start gap-4">
          <span className="text-5xl">{course.icon}</span>
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800">
                {langLabel}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelColor}`}>
                {course.level}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700">
                {course.category}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {course.title}
            </h1>
            <p className="text-gray-600 mb-4">{course.description}</p>
            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <span>📚 {course.chapters.length} chapters</span>
              <span>🏋️ {totalExercises} exercises</span>
              <span>⭐ {totalXp} XP available</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chapter list (client component for progress) */}
      <ChapterList course={course} />
    </div>
  );
}

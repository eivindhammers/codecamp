import { notFound } from "next/navigation";
import Link from "next/link";
import { getExercise } from "@/lib/courses";
import ExercisePageClient from "./ExercisePageClient";

interface Props {
  params: Promise<{ slug: string; chapter: string; id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug, chapter, id } = await params;
  const data = getExercise(slug, chapter, id);
  if (!data) return { title: "Exercise not found" };
  return {
    title: `${data.exercise.title} – ${data.course.title} – CodeCamp`,
  };
}

export default async function ExercisePage({ params }: Props) {
  const { slug, chapter, id } = await params;
  const data = getExercise(slug, chapter, id);
  if (!data) notFound();

  const { course, chapter: chapterData, exercise } = data;

  // Find prev/next exercise for navigation
  const allExercises = course.chapters.flatMap((ch) =>
    ch.exercises.map((ex) => ({ chapterId: ch.id, exerciseId: ex.id }))
  );
  const currentIndex = allExercises.findIndex(
    (e) => e.chapterId === chapter && e.exerciseId === id
  );
  const prev = currentIndex > 0 ? allExercises[currentIndex - 1] : null;
  const next =
    currentIndex < allExercises.length - 1
      ? allExercises[currentIndex + 1]
      : null;

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-gray-500 mb-6 flex-wrap">
        <Link href="/" className="hover:text-indigo-600 transition-colors">
          Courses
        </Link>
        <span>/</span>
        <Link
          href={`/courses/${course.slug}`}
          className="hover:text-indigo-600 transition-colors"
        >
          {course.title}
        </Link>
        <span>/</span>
        <span className="text-gray-700">{chapterData.title}</span>
        <span>/</span>
        <span className="text-gray-700">{exercise.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar – chapter exercises */}
        <aside className="lg:col-span-1 order-2 lg:order-1">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden sticky top-20">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                {chapterData.title}
              </p>
            </div>
            <ul className="divide-y divide-gray-50">
              {chapterData.exercises.map((ex, i) => (
                <li key={ex.id}>
                  <Link
                    href={`/courses/${course.slug}/${chapter}/exercise/${ex.id}`}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      ex.id === id
                        ? "bg-indigo-50 text-indigo-700 font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs shrink-0">
                      {i + 1}
                    </span>
                    {ex.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Main exercise area */}
        <div className="lg:col-span-2 order-1 lg:order-2">
          <ExercisePageClient
            exercise={exercise}
            courseSlug={course.slug}
            chapterId={chapter}
            language={course.language}
            nextHref={
              next
                ? `/courses/${course.slug}/${next.chapterId}/exercise/${next.exerciseId}`
                : undefined
            }
            prevHref={
              prev
                ? `/courses/${course.slug}/${prev.chapterId}/exercise/${prev.exerciseId}`
                : undefined
            }
            courseHref={`/courses/${course.slug}`}
          />
        </div>
      </div>
    </div>
  );
}

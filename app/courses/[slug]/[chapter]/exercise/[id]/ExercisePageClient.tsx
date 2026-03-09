"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import ExerciseEditor from "@/components/ExerciseEditor";
import { Exercise, Language } from "@/lib/types";

interface Props {
  exercise: Exercise;
  courseSlug: string;
  chapterId: string;
  language: Language;
  nextHref?: string;
  prevHref?: string;
  courseHref: string;
}

export default function ExercisePageClient({
  exercise,
  courseSlug,
  chapterId,
  language,
  nextHref,
  prevHref,
  courseHref,
}: Props) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4">
      <ExerciseEditor
        exercise={exercise}
        courseSlug={courseSlug}
        chapterId={chapterId}
        language={language}
        onNext={nextHref ? () => router.push(nextHref) : undefined}
      />

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        {prevHref ? (
          <Link
            href={prevHref}
            className="text-sm text-gray-500 hover:text-indigo-600 transition-colors"
          >
            ← Previous
          </Link>
        ) : (
          <Link
            href={courseHref}
            className="text-sm text-gray-500 hover:text-indigo-600 transition-colors"
          >
            ← Back to Course
          </Link>
        )}
        {nextHref && (
          <Link
            href={nextHref}
            className="text-sm text-gray-500 hover:text-indigo-600 transition-colors"
          >
            Next →
          </Link>
        )}
      </div>
    </div>
  );
}

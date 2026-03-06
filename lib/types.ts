export type Language = "r" | "python";

export type CourseLevel = "beginner" | "intermediate" | "advanced";

export type CourseCategory =
  | "general"
  | "economics"
  | "data-science"
  | "statistics";

export interface Exercise {
  id: string;
  title: string;
  instructions: string;
  hint: string;
  starterCode: string;
  sampleSolution: string;
  xp: number;
}

export interface Chapter {
  id: string;
  title: string;
  description: string;
  exercises: Exercise[];
}

export interface Course {
  slug: string;
  title: string;
  description: string;
  language: Language;
  level: CourseLevel;
  category: CourseCategory;
  xpTotal: number;
  chapters: Chapter[];
  tags: string[];
  icon: string;
}

export interface UserProgress {
  completedExercises: Record<string, boolean>;
  xp: number;
  completedCourses: string[];
}

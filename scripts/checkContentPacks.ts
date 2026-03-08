import { access, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { courses } from "@/lib/courses";
import { Language } from "@/lib/types";

const contentRoot = path.join(process.cwd(), "content", "exercises");

interface ExerciseMeta {
  language: Language;
}

function expectedExtension(language: Language): string {
  return language === "r" ? "R" : "py";
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function buildExerciseIndex(): Map<string, ExerciseMeta> {
  const index = new Map<string, ExerciseMeta>();
  for (const course of courses) {
    for (const chapter of course.chapters) {
      for (const exercise of chapter.exercises) {
        const key = `${course.slug}/${chapter.id}/${exercise.id}`;
        index.set(key, { language: course.language });
      }
    }
  }
  return index;
}

async function listExerciseDirs(rootDir: string): Promise<string[]> {
  const courseSlugs = await readdir(rootDir, { withFileTypes: true });
  const dirs: string[] = [];
  for (const courseDir of courseSlugs) {
    if (!courseDir.isDirectory()) continue;
    const chapterDirs = await readdir(path.join(rootDir, courseDir.name), {
      withFileTypes: true,
    });
    for (const chapterDir of chapterDirs) {
      if (!chapterDir.isDirectory()) continue;
      const exerciseDirs = await readdir(
        path.join(rootDir, courseDir.name, chapterDir.name),
        { withFileTypes: true }
      );
      for (const exerciseDir of exerciseDirs) {
        if (!exerciseDir.isDirectory()) continue;
        dirs.push(`${courseDir.name}/${chapterDir.name}/${exerciseDir.name}`);
      }
    }
  }
  return dirs;
}

async function validateExercisePack(
  key: string,
  index: Map<string, ExerciseMeta>,
  errors: string[]
) {
  const entry = index.get(key);
  const absoluteDir = path.join(contentRoot, key);
  if (!entry) {
    errors.push(`Unknown content exercise directory not defined in courses.ts: ${key}`);
    return;
  }

  const extension = expectedExtension(entry.language);
  const checkerPath = path.join(absoluteDir, `checker.${extension}`);
  const solutionPath = path.join(absoluteDir, `solution.${extension}`);
  const hasChecker = await pathExists(checkerPath);
  const hasSolution = await pathExists(solutionPath);
  if (!hasChecker) {
    errors.push(`Missing checker file for ${key}: checker.${extension}`);
  }
  if (!hasSolution) {
    errors.push(`Missing solution file for ${key}: solution.${extension}`);
  }
}

async function main() {
  const exists = await pathExists(contentRoot);
  if (!exists) {
    console.log("[content-packs] No content/exercises directory found; skipping.");
    return;
  }

  const index = buildExerciseIndex();
  const exerciseDirs = await listExerciseDirs(contentRoot);
  const errors: string[] = [];
  for (const key of exerciseDirs) {
    await validateExercisePack(key, index, errors);
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`[content-packs] ${error}`);
    }
    process.exit(1);
  }

  console.log(
    `[content-packs] OK validated=${exerciseDirs.length} indexedExercises=${index.size}`
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[content-packs] ${message}`);
  process.exit(1);
});

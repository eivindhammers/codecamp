import { access, readdir, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { courses } from "@/lib/courses";
import { Language } from "@/lib/types";

const contentRoot = path.join(process.cwd(), "content", "exercises");

interface ExerciseMeta {
  exerciseId: string;
  language: Language;
  title: string;
  instructions: string;
  starterCode: string;
  xp: number;
}

interface ExercisePackManifest {
  id?: unknown;
  language?: unknown;
  title?: unknown;
  instructions?: unknown;
  starterCode?: unknown;
  xp?: unknown;
  checker?: unknown;
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
        index.set(key, {
          exerciseId: exercise.id,
          language: course.language,
          title: exercise.title,
          instructions: exercise.instructions,
          starterCode: exercise.starterCode,
          xp: exercise.xp,
        });
      }
    }
  }
  return index;
}

async function readExerciseManifest(
  absoluteDir: string
): Promise<{ raw: string; parsed: ExercisePackManifest } | null> {
  const manifestPath = path.join(absoluteDir, "exercise.json");
  if (!(await pathExists(manifestPath))) {
    return null;
  }
  const raw = await readFile(manifestPath, "utf8");
  return { raw, parsed: JSON.parse(raw) as ExercisePackManifest };
}

function validateManifestField(
  errors: string[],
  key: string,
  field: string,
  value: unknown
): value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`Invalid exercise.json ${field} for ${key}: expected non-empty string.`);
    return false;
  }
  return true;
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

  let manifest: { raw: string; parsed: ExercisePackManifest } | null = null;
  try {
    manifest = await readExerciseManifest(absoluteDir);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`Failed to parse exercise.json for ${key}: ${message}`);
    return;
  }
  if (!manifest) {
    errors.push(`Missing exercise.json metadata file for ${key}.`);
    return;
  }

  const { parsed } = manifest;
  const idOk = validateManifestField(errors, key, "id", parsed.id);
  const languageOk = validateManifestField(errors, key, "language", parsed.language);
  const titleOk = validateManifestField(errors, key, "title", parsed.title);
  const instructionsOk = validateManifestField(
    errors,
    key,
    "instructions",
    parsed.instructions
  );
  const starterCodeOk = validateManifestField(errors, key, "starterCode", parsed.starterCode);
  const checkerOk = validateManifestField(errors, key, "checker", parsed.checker);

  if (idOk && parsed.id !== entry.exerciseId) {
    errors.push(
      `exercise.json id mismatch for ${key}: expected '${entry.exerciseId}', got '${parsed.id}'.`
    );
  }
  if (languageOk && parsed.language !== entry.language) {
    errors.push(
      `exercise.json language mismatch for ${key}: expected '${entry.language}', got '${parsed.language}'.`
    );
  }
  if (titleOk && parsed.title !== entry.title) {
    errors.push(`exercise.json title mismatch for ${key}: must match courses.ts title.`);
  }
  if (instructionsOk && parsed.instructions !== entry.instructions) {
    errors.push(`exercise.json instructions mismatch for ${key}: must match courses.ts instructions.`);
  }
  if (starterCodeOk && parsed.starterCode !== entry.starterCode) {
    errors.push(`exercise.json starterCode mismatch for ${key}: must match courses.ts starterCode.`);
  }
  if (checkerOk && parsed.checker !== `checker.${extension}`) {
    errors.push(
      `exercise.json checker mismatch for ${key}: expected 'checker.${extension}', got '${parsed.checker}'.`
    );
  }
  if (!Number.isFinite(parsed.xp) || typeof parsed.xp !== "number" || parsed.xp <= 0) {
    errors.push(`Invalid exercise.json xp for ${key}: expected positive number.`);
  } else if (parsed.xp !== entry.xp) {
    errors.push(`exercise.json xp mismatch for ${key}: must match courses.ts xp.`);
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

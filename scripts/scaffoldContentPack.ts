import { access, mkdir, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { courses } from "@/lib/courses";
import { Language } from "@/lib/types";

interface ScaffoldTarget {
  courseSlug: string;
  chapterId: string;
  exerciseId: string;
}

function usage(): string {
  return [
    "Usage:",
    "  npm run scaffold:content-pack -- --key <courseSlug/chapterId/exerciseId> [--force]",
    "",
    "Example:",
    "  npm run scaffold:content-pack -- --key intro-r/basics/hello-r",
  ].join("\n");
}

function parseArgs(argv: string[]): { target: ScaffoldTarget; force: boolean } {
  let keyValue = "";
  let force = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--key") {
      keyValue = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (arg === "--force") {
      force = true;
      continue;
    }
    throw new Error(`Unknown arg: ${arg}\n\n${usage()}`);
  }
  const [courseSlug, chapterId, exerciseId] = keyValue.split("/");
  if (!courseSlug || !chapterId || !exerciseId) {
    throw new Error(`Invalid --key value '${keyValue}'.\n\n${usage()}`);
  }
  return { target: { courseSlug, chapterId, exerciseId }, force };
}

function expectedExtension(language: Language): "R" | "py" {
  return language === "r" ? "R" : "py";
}

function checkerTemplate(language: Language): string {
  if (language === "r") {
    return [
      "args <- commandArgs(trailingOnly = TRUE)",
      'submission_path <- args[[1]]',
      'output_path <- args[[2]]',
      "source(submission_path, local = TRUE)",
      "",
      "# TODO: replace this scaffold assertion with exercise-specific checks.",
      "cat('PASS: Replace scaffold checks with real tests.\\n', file = output_path)",
    ].join("\n");
  }
  return [
    "import runpy",
    "import sys",
    "",
    "submission_path = sys.argv[1]",
    "output_path = sys.argv[2]",
    "runpy.run_path(submission_path, run_name='__main__')",
    "",
    "# TODO: replace this scaffold assertion with exercise-specific checks.",
    "with open(output_path, 'w', encoding='utf-8') as handle:",
    "    handle.write('PASS: Replace scaffold checks with real tests.\\n')",
  ].join("\n");
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function writeFileSafely(filePath: string, contents: string, force: boolean) {
  if (!force && (await pathExists(filePath))) {
    throw new Error(`File already exists: ${filePath} (use --force to overwrite).`);
  }
  await writeFile(filePath, contents, "utf8");
}

async function main() {
  const { target, force } = parseArgs(process.argv.slice(2));
  const course = courses.find((item) => item.slug === target.courseSlug);
  const chapter = course?.chapters.find((item) => item.id === target.chapterId);
  const exercise = chapter?.exercises.find((item) => item.id === target.exerciseId);
  if (!course || !chapter || !exercise) {
    throw new Error(
      `Unknown exercise key '${target.courseSlug}/${target.chapterId}/${target.exerciseId}'.`
    );
  }

  const extension = expectedExtension(course.language);
  const packDir = path.join(
    process.cwd(),
    "content",
    "exercises",
    target.courseSlug,
    target.chapterId,
    target.exerciseId
  );
  await mkdir(packDir, { recursive: true });

  const checkerFile = `checker.${extension}`;
  const solutionFile = `solution.${extension}`;
  const manifestPath = path.join(packDir, "exercise.json");
  const checkerPath = path.join(packDir, checkerFile);
  const solutionPath = path.join(packDir, solutionFile);

  const manifest = {
    id: exercise.id,
    language: course.language,
    title: exercise.title,
    instructions: exercise.instructions,
    starterCode: exercise.starterCode,
    xp: exercise.xp,
    checker: checkerFile,
  };

  await writeFileSafely(`${manifestPath}`, `${JSON.stringify(manifest, null, 2)}\n`, force);
  await writeFileSafely(checkerPath, `${checkerTemplate(course.language)}\n`, force);
  await writeFileSafely(solutionPath, `${exercise.sampleSolution}\n`, force);

  console.log(
    `[scaffold-content-pack] OK ${target.courseSlug}/${target.chapterId}/${target.exerciseId} -> ${packDir}`
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[scaffold-content-pack] ${message}`);
  process.exit(1);
});

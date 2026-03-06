import { Exercise, Language } from "./types";

export interface ValidationResult {
  isCorrect: boolean;
  message: string;
}

function stripInlineComment(line: string, language: Language): string {
  const marker = language === "python" ? "#" : "#";
  const commentIndex = line.indexOf(marker);
  return commentIndex >= 0 ? line.slice(0, commentIndex) : line;
}

function normalizeLine(line: string): string {
  return line
    .replace(/['"]/g, '"')
    .replace(/\s+/g, "")
    .trim();
}

function extractRequiredSnippets(code: string, language: Language): string[] {
  return code
    .split("\n")
    .map((line) => stripInlineComment(line, language))
    .map((line) => normalizeLine(line))
    .filter((line) => line.length > 0);
}

interface ParsedBinaryAssignment {
  variable: string;
  assignOp: "<-" | "=";
  left: string;
  operator: "+" | "*";
  right: string;
}

function parseSimpleBinaryAssignment(line: string): ParsedBinaryAssignment | null {
  const match = line.match(
    /^([A-Za-z_][A-Za-z0-9_]*)(<-|=)([A-Za-z_][A-Za-z0-9_]*|\d+(?:\.\d+)?)([+*])([A-Za-z_][A-Za-z0-9_]*|\d+(?:\.\d+)?)$/
  );
  if (!match) return null;

  const [, variable, assignRaw, left, operatorRaw, right] = match;
  const assignOp = assignRaw as "<-" | "=";
  const operator = operatorRaw as "+" | "*";

  return { variable, assignOp, left, operator, right };
}

function isEquivalentCommutativeAssignment(
  required: string,
  submittedLine: string
): boolean {
  const expected = parseSimpleBinaryAssignment(required);
  const candidate = parseSimpleBinaryAssignment(submittedLine);
  if (!expected || !candidate) return false;

  return (
    expected.variable === candidate.variable &&
    expected.assignOp === candidate.assignOp &&
    expected.operator === candidate.operator &&
    expected.left === candidate.right &&
    expected.right === candidate.left
  );
}

export function validateExerciseSubmission(
  exercise: Exercise,
  submittedCode: string,
  language: Language
): ValidationResult {
  if (submittedCode.includes("___")) {
    return {
      isCorrect: false,
      message: "Fill in all placeholders (`___`) before submitting.",
    };
  }

  const required = extractRequiredSnippets(exercise.sampleSolution, language);
  const submittedLines = extractRequiredSnippets(submittedCode, language);
  const submitted = normalizeLine(submittedCode);

  const missing = required.filter((snippet) => {
    if (submitted.includes(snippet)) return false;
    return !submittedLines.some((line) =>
      isEquivalentCommutativeAssignment(snippet, line)
    );
  });
  if (missing.length > 0) {
    return {
      isCorrect: false,
      message:
        "That does not match the expected solution yet. Check your arithmetic, variable names, and required function calls.",
    };
  }

  return {
    isCorrect: true,
    message: "Correct solution submitted.",
  };
}

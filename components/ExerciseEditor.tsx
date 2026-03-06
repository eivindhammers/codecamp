"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Exercise } from "@/lib/types";
import { useProgress } from "@/lib/ProgressContext";
import { SubmissionStatusResponse } from "@/lib/grading/contracts";
import { validateExerciseSubmission } from "@/lib/exerciseValidation";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface Props {
  exercise: Exercise;
  courseSlug: string;
  chapterId: string;
  language: "r" | "python";
  onNext?: () => void;
}

export default function ExerciseEditor({
  exercise,
  courseSlug,
  chapterId,
  language,
  onNext,
}: Props) {
  const { completeExercise, isExerciseDone } = useProgress();
  const [code, setCode] = useState(exercise.starterCode);
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState("");
  const [testFeedback, setTestFeedback] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editorTheme, setEditorTheme] = useState<"vs-dark" | "light">("light");

  const alreadyDone = isExerciseDone(courseSlug, chapterId, exercise.id);

  useEffect(() => {
    const applyTheme = () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      setEditorTheme(currentTheme === "dark" ? "vs-dark" : "light");
    };

    applyTheme();

    const observer = new MutationObserver(applyTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  const shouldUseServerGrader = language === "r" && exercise.id === "arithmetic";
  const pollIntervalMs = 400;
  const maxPollAttempts = 30;

  async function wait(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function handleSubmit() {
    setSubmitted(true);
    setIsSubmitting(true);
    setTestFeedback([]);

    try {
      if (shouldUseServerGrader) {
        const response = await fetch("/api/submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exerciseId: exercise.id,
            language,
            code,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          setIsCorrect(false);
          setFeedback(`Submission failed: ${errorText}`);
          return;
        }

        const created = (await response.json()) as SubmissionStatusResponse;
        setFeedback("Submission queued. Running hidden tests...");

        for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
          await wait(pollIntervalMs);
          const statusResponse = await fetch(
            `/api/submissions/${created.submissionId}`,
            {
              cache: "no-store",
            }
          );

          if (!statusResponse.ok) {
            const errorText = await statusResponse.text();
            setIsCorrect(false);
            setFeedback(`Failed to fetch submission status: ${errorText}`);
            return;
          }

          const statusPayload = (await statusResponse.json()) as SubmissionStatusResponse;

          if (statusPayload.status !== "completed") continue;

          if (!statusPayload.result) {
            setIsCorrect(false);
            setFeedback("Submission finished without a grading result.");
            return;
          }

          const isPassed = statusPayload.result.status === "passed";
          setIsCorrect(isPassed);
          setFeedback(statusPayload.result.feedback[0] ?? "No feedback returned.");
          setTestFeedback(
            statusPayload.result.tests.map((t) => `${t.passed ? "✓" : "✗"} ${t.name}`)
          );

          if (isPassed && !alreadyDone && !xpAwarded) {
            completeExercise(courseSlug, chapterId, exercise.id, exercise.xp);
            setXpAwarded(true);
          }

          return;
        }

        setIsCorrect(false);
        setFeedback("Submission timed out. Please try again.");
        return;
      }

      const validation = validateExerciseSubmission(exercise, code, language);
      setIsCorrect(validation.isCorrect);
      setFeedback(validation.message);
      if (validation.isCorrect && !alreadyDone && !xpAwarded) {
        completeExercise(courseSlug, chapterId, exercise.id, exercise.xp);
        setXpAwarded(true);
      }
    } catch (error) {
      setIsCorrect(false);
      setFeedback(
        error instanceof Error
          ? `Submission failed: ${error.message}`
          : "Submission failed due to an unknown error."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReset() {
    setCode(exercise.starterCode);
    setSubmitted(false);
    setShowHint(false);
    setShowSolution(false);
    setIsCorrect(null);
    setFeedback("");
    setTestFeedback([]);
    setIsSubmitting(false);
  }

  const monacoLang = language === "python" ? "python" : "r";

  return (
    <div className="flex flex-col gap-4">
      {/* Instructions */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-semibold text-gray-900 text-lg mb-2">{exercise.title}</h2>
        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
          {exercise.instructions}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium">
            +{exercise.xp} XP
          </span>
          {alreadyDone && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
              ✓ Completed
            </span>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
          <span className="text-gray-300 text-xs font-mono uppercase tracking-wide">
            {language === "r" ? "R Script" : "Python Script"}
          </span>
          <button
            onClick={handleReset}
            className="text-gray-400 hover:text-white text-xs transition-colors"
          >
            ↺ Reset
          </button>
        </div>
        <MonacoEditor
          height="280px"
          language={monacoLang}
          value={code}
          onChange={(v) => setCode(v ?? "")}
          theme={editorTheme}
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbersMinChars: 3,
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors"
        >
          {isSubmitting ? "Submitting..." : "Submit Answer"}
        </button>
        <button
          onClick={() => setShowHint(!showHint)}
          className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm transition-colors"
        >
          {showHint ? "Hide Hint" : "Show Hint"}
        </button>
        <button
          onClick={() => setShowSolution(!showSolution)}
          className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm transition-colors"
        >
          {showSolution ? "Hide Solution" : "Show Solution"}
        </button>
        {onNext && (
          <button
            onClick={onNext}
            className="ml-auto px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm transition-colors"
          >
            Next Exercise →
          </button>
        )}
      </div>

      {/* Submission Feedback */}
      {submitted && isCorrect && xpAwarded && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="font-semibold text-yellow-900 text-sm">
              Exercise submitted! You earned +{exercise.xp} XP
            </p>
            <p className="text-yellow-700 text-xs mt-0.5">
              {feedback}
            </p>
          </div>
        </div>
      )}

      {submitted && isCorrect && !xpAwarded && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          Exercise already completed — no additional XP awarded.
        </div>
      )}

      {submitted && isCorrect === false && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-800">
          {feedback}
        </div>
      )}

      {submitted && testFeedback.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700">
          {testFeedback.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}

      {/* Hint */}
      {showHint && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-900 mb-1">💡 Hint</p>
          <p className="text-sm text-amber-800">{exercise.hint}</p>
        </div>
      )}

      {/* Solution */}
      {showSolution && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-800 px-4 py-2">
            <span className="text-gray-300 text-xs font-mono uppercase tracking-wide">
              Sample Solution
            </span>
          </div>
          <MonacoEditor
            height="200px"
            language={monacoLang}
            value={exercise.sampleSolution}
            theme={editorTheme}
            options={{
              readOnly: true,
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbersMinChars: 3,
              padding: { top: 12, bottom: 12 },
            }}
          />
        </div>
      )}
    </div>
  );
}

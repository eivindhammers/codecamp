"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Exercise } from "@/lib/types";
import { useProgress } from "@/lib/ProgressContext";

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

  const alreadyDone = isExerciseDone(courseSlug, chapterId, exercise.id);

  function handleSubmit() {
    setSubmitted(true);
    if (!alreadyDone && !xpAwarded) {
      completeExercise(courseSlug, chapterId, exercise.id, exercise.xp);
      setXpAwarded(true);
    }
  }

  function handleReset() {
    setCode(exercise.starterCode);
    setSubmitted(false);
    setShowHint(false);
    setShowSolution(false);
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
          theme="vs-dark"
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
          className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors"
        >
          Submit Answer
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

      {/* XP Award Toast */}
      {submitted && xpAwarded && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="font-semibold text-yellow-900 text-sm">
              Exercise submitted! You earned +{exercise.xp} XP
            </p>
            <p className="text-yellow-700 text-xs mt-0.5">
              Check the sample solution below to compare your approach.
            </p>
          </div>
        </div>
      )}

      {submitted && !xpAwarded && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          Exercise already completed — no additional XP awarded.
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
            theme="vs-dark"
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

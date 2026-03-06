"use client";

import { useProgress } from "@/lib/ProgressContext";

export default function XPBar() {
  const { progress } = useProgress();

  const level = Math.floor(progress.xp / 100) + 1;
  const xpInLevel = progress.xp % 100;

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <span className="text-yellow-500 font-bold text-sm">⭐ {progress.xp} XP</span>
        <span className="text-gray-400 text-xs">·</span>
        <span className="text-indigo-600 font-semibold text-sm">Level {level}</span>
      </div>
      <div className="w-24 bg-gray-200 rounded-full h-1.5 hidden sm:block">
        <div
          className="bg-indigo-500 h-1.5 rounded-full transition-all duration-700"
          style={{ width: `${xpInLevel}%` }}
        />
      </div>
    </div>
  );
}

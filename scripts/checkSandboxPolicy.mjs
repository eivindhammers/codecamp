#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";

const runnerPath = path.join(process.cwd(), "lib", "grading", "runCheckerProcess.ts");
const source = readFileSync(runnerPath, "utf8");

const requiredSnippets = [
  '"--network"',
  '"none"',
  '"--memory"',
  '"--cpus"',
  '"--pids-limit"',
  '"--read-only"',
  '"--tmpfs"',
  "/tmp:rw,noexec,nosuid,size=64m",
];

const missing = requiredSnippets.filter((snippet) => !source.includes(snippet));
if (missing.length > 0) {
  for (const item of missing) {
    console.error(`[sandbox-policy] missing docker sandbox requirement: ${item}`);
  }
  process.exit(1);
}

console.log("[sandbox-policy] OK");

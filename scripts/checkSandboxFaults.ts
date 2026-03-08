import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { runCheckerProcess } from "@/lib/grading/runCheckerProcess";

const execFileAsync = promisify(execFile);

function getImage(runtime: "r" | "python") {
  if (runtime === "r") {
    return process.env.GRADER_DOCKER_R_IMAGE?.trim() || "r-base:4.4.1";
  }
  return process.env.GRADER_DOCKER_PYTHON_IMAGE?.trim() || "python:3.12-alpine";
}

async function ensureImageAvailable(image: string) {
  try {
    await execFileAsync("docker", ["image", "inspect", image], {
      timeout: 30 * 1000,
    });
  } catch {
    await execFileAsync("docker", ["pull", image], { timeout: 5 * 60 * 1000 });
  }
}

async function ensureImages() {
  await ensureImageAvailable(getImage("r"));
  await ensureImageAvailable(getImage("python"));
}

async function assertPythonTimeout() {
  const workDir = await mkdtemp(path.join(tmpdir(), "codecamp-sandbox-fault-py-"));
  try {
    const checkerPath = path.join(workDir, "checker.py");
    const submissionPath = path.join(workDir, "submission.py");
    const outputPath = path.join(workDir, "checker-output.txt");
    await writeFile(
      checkerPath,
      "import sys,time\n"
        + "time.sleep(5)\n"
        + "open(sys.argv[2], 'w', encoding='utf-8').write('STATUS:passed\\n')\n",
      "utf8"
    );
    await writeFile(submissionPath, "print('noop')\n", "utf8");

    const result = await runCheckerProcess({
      runtime: "python",
      command: "python3",
      args: [checkerPath, submissionPath, outputPath],
      outputPath,
      workDir,
      timeoutMs: 1000,
    });
    if (result.error?.kind !== "timeout") {
      throw new Error(`Expected python timeout, got: ${JSON.stringify(result.error)}`);
    }
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function assertRTimeout() {
  const workDir = await mkdtemp(path.join(tmpdir(), "codecamp-sandbox-fault-r-"));
  try {
    const checkerPath = path.join(workDir, "checker.R");
    const submissionPath = path.join(workDir, "submission.R");
    const outputPath = path.join(workDir, "checker-output.txt");
    await writeFile(
      checkerPath,
      "args <- commandArgs(trailingOnly = TRUE)\n"
        + "Sys.sleep(5)\n"
        + "writeLines('STATUS:passed', con = args[[2]])\n",
      "utf8"
    );
    await writeFile(submissionPath, "result <- 1\n", "utf8");

    const result = await runCheckerProcess({
      runtime: "r",
      command: "Rscript",
      args: [checkerPath, submissionPath, outputPath],
      outputPath,
      workDir,
      timeoutMs: 1000,
    });
    if (result.error?.kind !== "timeout") {
      throw new Error(`Expected R timeout, got: ${JSON.stringify(result.error)}`);
    }
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function assertPythonMemoryPressureFailure() {
  const workDir = await mkdtemp(path.join(tmpdir(), "codecamp-sandbox-fault-pymem-"));
  const previousMemoryLimit = process.env.GRADER_DOCKER_MEMORY_LIMIT;
  try {
    process.env.GRADER_DOCKER_MEMORY_LIMIT = "96m";
    const checkerPath = path.join(workDir, "checker.py");
    const submissionPath = path.join(workDir, "submission.py");
    const outputPath = path.join(workDir, "checker-output.txt");
    await writeFile(
      checkerPath,
      "import sys\n"
        + "x = bytearray(350 * 1024 * 1024)\n"
        + "open(sys.argv[2], 'w', encoding='utf-8').write('STATUS:passed\\n')\n",
      "utf8"
    );
    await writeFile(submissionPath, "print('noop')\n", "utf8");

    const result = await runCheckerProcess({
      runtime: "python",
      command: "python3",
      args: [checkerPath, submissionPath, outputPath],
      outputPath,
      workDir,
      timeoutMs: 8000,
    });
    if (result.error?.kind !== "execution-failed") {
      throw new Error(
        `Expected python memory pressure execution failure, got: ${JSON.stringify(result.error)}`
      );
    }
  } finally {
    if (previousMemoryLimit === undefined) {
      delete process.env.GRADER_DOCKER_MEMORY_LIMIT;
    } else {
      process.env.GRADER_DOCKER_MEMORY_LIMIT = previousMemoryLimit;
    }
    await rm(workDir, { recursive: true, force: true });
  }
}

async function assertPythonPidPressureFailure() {
  const workDir = await mkdtemp(path.join(tmpdir(), "codecamp-sandbox-fault-pypid-"));
  try {
    const checkerPath = path.join(workDir, "checker.py");
    const submissionPath = path.join(workDir, "submission.py");
    const outputPath = path.join(workDir, "checker-output.txt");
    await writeFile(
      checkerPath,
      "import subprocess\n"
        + "procs = []\n"
        + "for _ in range(400):\n"
        + "  procs.append(subprocess.Popen(['sh', '-c', 'sleep 10']))\n",
      "utf8"
    );
    await writeFile(submissionPath, "print('noop')\n", "utf8");

    const result = await runCheckerProcess({
      runtime: "python",
      command: "python3",
      args: [checkerPath, submissionPath, outputPath],
      outputPath,
      workDir,
      timeoutMs: 8000,
    });
    if (result.error?.kind !== "execution-failed") {
      throw new Error(
        `Expected python pid pressure execution failure, got: ${JSON.stringify(result.error)}`
      );
    }
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function assertNetworkIsolation() {
  const workDir = await mkdtemp(path.join(tmpdir(), "codecamp-sandbox-fault-pynet-"));
  try {
    const checkerPath = path.join(workDir, "checker.py");
    const submissionPath = path.join(workDir, "submission.py");
    const outputPath = path.join(workDir, "checker-output.txt");
    await writeFile(
      checkerPath,
      "import socket,sys\n"
        + "blocked = False\n"
        + "try:\n"
        + "  socket.create_connection(('1.1.1.1', 53), timeout=2)\n"
        + "except OSError:\n"
        + "  blocked = True\n"
        + "open(sys.argv[2], 'w', encoding='utf-8').write('STATUS:' + ('passed' if blocked else 'failed') + '\\n')\n",
      "utf8"
    );
    await writeFile(submissionPath, "print('noop')\n", "utf8");

    const result = await runCheckerProcess({
      runtime: "python",
      command: "python3",
      args: [checkerPath, submissionPath, outputPath],
      outputPath,
      workDir,
      timeoutMs: 8000,
    });
    if (result.error) {
      throw new Error(`Expected network isolation check output, got ${result.error.kind}`);
    }
    if (!result.output?.includes("STATUS:passed")) {
      throw new Error("Expected docker network isolation to block outbound socket connections.");
    }
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function assertReadOnlyRootFilesystem() {
  const workDir = await mkdtemp(path.join(tmpdir(), "codecamp-sandbox-fault-pyrofs-"));
  try {
    const checkerPath = path.join(workDir, "checker.py");
    const submissionPath = path.join(workDir, "submission.py");
    const outputPath = path.join(workDir, "checker-output.txt");
    await writeFile(
      checkerPath,
      "import sys\n"
        + "blocked = False\n"
        + "try:\n"
        + "  with open('/codecamp-rofs-check.txt', 'w', encoding='utf-8') as handle:\n"
        + "    handle.write('fail')\n"
        + "except OSError:\n"
        + "  blocked = True\n"
        + "with open(sys.argv[2], 'w', encoding='utf-8') as handle:\n"
        + "  handle.write('STATUS:' + ('passed' if blocked else 'failed') + '\\n')\n",
      "utf8"
    );
    await writeFile(submissionPath, "print('noop')\n", "utf8");

    const result = await runCheckerProcess({
      runtime: "python",
      command: "python3",
      args: [checkerPath, submissionPath, outputPath],
      outputPath,
      workDir,
      timeoutMs: 8000,
    });
    if (result.error) {
      throw new Error(
        `Expected read-only root filesystem check output, got ${result.error.kind}`
      );
    }
    if (!result.output?.includes("STATUS:passed")) {
      throw new Error("Expected docker read-only root filesystem to block root write.");
    }
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

async function main() {
  if ((process.env.GRADER_SANDBOX_MODE ?? "").trim().toLowerCase() !== "docker") {
    throw new Error("GRADER_SANDBOX_MODE must be set to 'docker' for fault checks.");
  }

  await ensureImages();
  await assertPythonTimeout();
  await assertRTimeout();
  await assertPythonMemoryPressureFailure();
  await assertPythonPidPressureFailure();
  await assertNetworkIsolation();
  await assertReadOnlyRootFilesystem();
  console.log("[sandbox-faults] OK");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[sandbox-faults] ${message}`);
  process.exit(1);
});

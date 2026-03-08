import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type CheckerErrorKind = "missing-runtime" | "timeout" | "execution-failed";
type SandboxMode = "host" | "docker";
type CheckerRuntime = "r" | "python";

interface CheckerProcessError {
  kind: CheckerErrorKind;
  message: string;
}

interface RunCheckerProcessInput {
  runtime: CheckerRuntime;
  command: string;
  args: string[];
  outputPath: string;
  workDir: string;
  timeoutMs?: number;
}

interface RunCheckerProcessResult {
  output?: string;
  error?: CheckerProcessError;
}

function getCheckerTimeoutMs(timeoutMs?: number): number {
  const fromEnv = Number.parseInt(process.env.GRADER_TIMEOUT_MS ?? "", 10);
  const candidate = timeoutMs ?? (Number.isFinite(fromEnv) ? fromEnv : 8000);
  return Math.min(Math.max(candidate, 1000), 30000);
}

function getSandboxMode(): SandboxMode {
  const configured = process.env.GRADER_SANDBOX_MODE?.trim().toLowerCase();
  if (configured === "docker") return "docker";
  if (configured === "host") return "host";
  return process.env.NODE_ENV === "production" ? "docker" : "host";
}

function getRestrictedEnv(workDir: string): NodeJS.ProcessEnv {
  return {
    NODE_ENV: process.env.NODE_ENV ?? "production",
    PATH: process.env.PATH ?? "",
    HOME: workDir,
    TMPDIR: workDir,
    TMP: workDir,
    TEMP: workDir,
    LANG: process.env.LANG ?? "C",
    LC_ALL: process.env.LC_ALL ?? "C",
    PYTHONNOUSERSITE: "1",
  };
}

function getDockerMemoryLimit(): string {
  const memory = process.env.GRADER_DOCKER_MEMORY_LIMIT?.trim();
  return memory && memory.length > 0 ? memory : "256m";
}

function getDockerCpuLimit(): string {
  const cpus = process.env.GRADER_DOCKER_CPUS?.trim();
  return cpus && cpus.length > 0 ? cpus : "1.0";
}

function getDockerImage(runtime: CheckerRuntime): string {
  if (runtime === "r") {
    const image = process.env.GRADER_DOCKER_R_IMAGE?.trim();
    return image && image.length > 0 ? image : "r-base:4.4.1";
  }

  const image = process.env.GRADER_DOCKER_PYTHON_IMAGE?.trim();
  return image && image.length > 0 ? image : "python:3.12-alpine";
}

function toContainerPath(hostPath: string, workDir: string): string {
  if (hostPath === workDir) return "/workspace";
  if (hostPath.startsWith(`${workDir}/`)) {
    return `/workspace/${hostPath.slice(workDir.length + 1)}`;
  }
  return hostPath;
}

async function runHostProcess(
  input: RunCheckerProcessInput,
  timeoutMs: number
): Promise<void> {
  await execFileAsync(input.command, input.args, {
    cwd: input.workDir,
    env: getRestrictedEnv(input.workDir),
    timeout: timeoutMs,
    killSignal: "SIGKILL",
    maxBuffer: 64 * 1024,
  });
}

async function runDockerProcess(
  input: RunCheckerProcessInput,
  timeoutMs: number
): Promise<void> {
  const image = getDockerImage(input.runtime);
  const memoryLimit = getDockerMemoryLimit();
  const cpuLimit = getDockerCpuLimit();
  const containerArgs = input.args.map((arg) => toContainerPath(arg, input.workDir));

  const dockerArgs = [
    "run",
    "--rm",
    "--network",
    "none",
    "--memory",
    memoryLimit,
    "--cpus",
    cpuLimit,
    "--pids-limit",
    "128",
    "--read-only",
    "--tmpfs",
    "/tmp:rw,noexec,nosuid,size=64m",
    "-v",
    `${input.workDir}:/workspace`,
    "-w",
    "/workspace",
    image,
    input.command,
    ...containerArgs,
  ];

  await execFileAsync("docker", dockerArgs, {
    timeout: timeoutMs,
    killSignal: "SIGKILL",
    maxBuffer: 64 * 1024,
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown execution error.";
}

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const maybeTimed = error as Error & {
    code?: number | string | null;
    killed?: boolean;
    signal?: string | null;
  };
  const message = error.message.toLowerCase();
  return (
    message.includes("timed out") ||
    message.includes("etimedout") ||
    maybeTimed.killed === true ||
    maybeTimed.code === "ETIMEDOUT" ||
    maybeTimed.signal === "SIGKILL"
  );
}

export async function runCheckerProcess(
  input: RunCheckerProcessInput
): Promise<RunCheckerProcessResult> {
  const timeoutMs = getCheckerTimeoutMs(input.timeoutMs);
  const sandboxMode = getSandboxMode();

  try {
    if (sandboxMode === "docker") {
      await runDockerProcess(input, timeoutMs);
    } else {
      await runHostProcess(input, timeoutMs);
    }

    const output = await readFile(input.outputPath, "utf8");
    return { output };
  } catch (error) {
    const message = getErrorMessage(error);
    const timeout = isTimeoutError(error);
    const missingRuntime = message.includes("ENOENT");
    const dockerUnavailable =
      sandboxMode === "docker" &&
      (message.includes("Cannot connect to the Docker daemon") ||
        message.includes("No such file or directory"));

    if (timeout) {
      return {
        error: {
          kind: "timeout",
          message: `Checker execution timed out after ${timeoutMs}ms.`,
        },
      };
    }

    if (missingRuntime) {
      return {
        error: {
          kind: "missing-runtime",
          message,
        },
      };
    }

    if (dockerUnavailable) {
      return {
        error: {
          kind: "execution-failed",
          message: `Docker sandbox unavailable: ${message}`,
        },
      };
    }

    return {
      error: {
        kind: "execution-failed",
        message,
      },
    };
  }
}

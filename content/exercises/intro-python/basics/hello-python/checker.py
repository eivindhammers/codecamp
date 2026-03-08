import io
import subprocess
import sys
from pathlib import Path


def usage() -> None:
    raise SystemExit("Usage: checker.py <submission_path> <output_path>")


def main() -> None:
    if len(sys.argv) < 3:
        usage()

    submission_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])

    test_results: list[tuple[str, bool, str]] = []
    feedback: list[str] = []
    status = "failed"

    if not submission_path.exists():
        test_results.append(("submission exists", False, "Submission file was not found."))
        feedback.append("Submission file was not found.")
    else:
        test_results.append(("submission exists", True, "Submission file exists."))

        try:
            process = subprocess.run(
                [sys.executable, str(submission_path)],
                capture_output=True,
                text=True,
                check=False,
            )
        except OSError as error:
            test_results.append(("code runs", False, "Python could not execute the submission."))
            feedback.append(f"Execution error: {error}")
        else:
            if process.returncode != 0:
                test_results.append(("code runs", False, "Your code did not run successfully."))
                stderr_text = process.stderr.strip()
                feedback.append(f"Execution error: {stderr_text or 'unknown runtime error'}")
            else:
                test_results.append(("code runs", True, "Code executed without errors."))
                output_lines = [line.strip() for line in process.stdout.splitlines() if line.strip()]
                expected_line = "Hello, Python!"
                if expected_line in output_lines:
                    test_results.append(
                        ("prints expected greeting", True, "Output includes 'Hello, Python!'.")
                    )
                    status = "passed"
                    feedback.append("Correct solution submitted.")
                else:
                    test_results.append(
                        (
                            "prints expected greeting",
                            False,
                            "Use print() to output exactly 'Hello, Python!'.",
                        )
                    )
                    feedback.append("Use print() to output exactly 'Hello, Python!'.")

    output_stream = io.StringIO()
    output_stream.write(f"STATUS:{status}\n")
    for item in feedback:
        output_stream.write(f"FEEDBACK:{item}\n")
    for name, passed, message in test_results:
        output_stream.write(f"TEST:{name}|{'pass' if passed else 'fail'}|{message}\n")

    output_path.write_text(output_stream.getvalue(), encoding="utf-8")


if __name__ == "__main__":
    main()

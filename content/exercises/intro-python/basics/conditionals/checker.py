import io
import subprocess
import sys


def main() -> None:
    submission_path = sys.argv[1]
    output_path = sys.argv[2]
    tests: list[tuple[str, bool, str]] = []
    feedback: list[str] = []
    status = "failed"

    process = subprocess.run(
        [sys.executable, submission_path],
        capture_output=True,
        text=True,
        check=False,
    )
    if process.returncode != 0:
        tests.append(("code runs", False, "Code did not run successfully."))
        feedback.append(f"Execution error: {process.stderr.strip() or 'runtime error'}")
    else:
        tests.append(("code runs", True, "Code executed without errors."))
        output_lines = [line.strip() for line in process.stdout.splitlines() if line.strip()]
        if "Middle income" in output_lines:
            tests.append(
                ("conditional output", True, "Output includes 'Middle income' for gdp=45000.")
            )
        else:
            tests.append(
                (
                    "conditional output",
                    False,
                    "Expected output 'Middle income' for gdp = 45000.",
                )
            )

    passed_all = tests and all(item[1] for item in tests)
    if passed_all:
        status = "passed"
        feedback.append("Correct solution submitted.")
    elif not feedback:
        feedback.append("Use if/elif/else so gdp = 45000 prints 'Middle income'.")

    output_stream = io.StringIO()
    output_stream.write(f"STATUS:{status}\n")
    for item in feedback:
        output_stream.write(f"FEEDBACK:{item}\n")
    for name, passed, message in tests:
        output_stream.write(f"TEST:{name}|{'pass' if passed else 'fail'}|{message}\n")

    with open(output_path, "w", encoding="utf-8") as handle:
        handle.write(output_stream.getvalue())


if __name__ == "__main__":
    main()

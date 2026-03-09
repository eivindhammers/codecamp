import io
import os
import subprocess
import sys


def main() -> None:
    submission_path = sys.argv[1]
    output_path = sys.argv[2]
    tests: list[tuple[str, bool, str]] = []
    feedback: list[str] = []
    status = "failed"

    target_plot = "/tmp/gdp_line.png"
    if os.path.exists(target_plot):
        os.remove(target_plot)

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
        output_ok = "Plot saved" in process.stdout
        tests.append(("prints confirmation", output_ok, "Expected output to include 'Plot saved'."))
        plot_exists = os.path.exists(target_plot) and os.path.getsize(target_plot) > 0
        tests.append(("plot file created", plot_exists, "Expected /tmp/gdp_line.png to be created."))

    passed_all = tests and all(item[1] for item in tests)
    if passed_all:
        status = "passed"
        feedback.append("Correct solution submitted.")
    elif not feedback:
        feedback.append("Create and save the line plot to /tmp/gdp_line.png and print 'Plot saved'.")

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

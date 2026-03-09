import io
import math
import runpy
import sys


def main() -> None:
    submission_path = sys.argv[1]
    output_path = sys.argv[2]
    tests: list[tuple[str, bool, str]] = []
    feedback: list[str] = []
    status = "failed"

    try:
        namespace = runpy.run_path(submission_path, run_name="__main__")
        tests.append(("code runs", True, "Code executed without errors."))
    except Exception as error:  # noqa: BLE001
        namespace = {}
        tests.append(("code runs", False, "Code did not run successfully."))
        feedback.append(f"Execution error: {error}")

    func = namespace.get("compound_growth")
    if callable(func):
        tests.append(("function exists", True, "compound_growth function is defined."))
        try:
            actual = func(1000, 0.05, 10)
            expected = 1000 * (1 + 0.05) ** 10
            if isinstance(actual, (int, float)) and math.isclose(actual, expected, rel_tol=1e-9):
                tests.append(("function result", True, "compound_growth returns the correct value."))
            else:
                tests.append(
                    (
                        "function result",
                        False,
                        "compound_growth should return principal * (1 + rate) ** years.",
                    )
                )
        except Exception as error:  # noqa: BLE001
            tests.append(("function result", False, f"Calling compound_growth raised an error: {error}"))
    else:
        tests.append(("function exists", False, "Define a function named compound_growth."))

    passed_all = tests and all(item[1] for item in tests)
    if passed_all:
        status = "passed"
        feedback.append("Correct solution submitted.")
    elif not feedback:
        feedback.append("Define compound_growth(principal, rate, years) using the compound growth formula.")

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

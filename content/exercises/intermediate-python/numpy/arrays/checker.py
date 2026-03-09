import io
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

    if namespace:
        matrix = namespace.get("matrix")
        if matrix is None:
            tests.append(("matrix exists", False, "Define a variable named matrix."))
        else:
            try:
                import numpy as np

                expected = np.arange(1, 10).reshape(3, 3)
                shape_ok = hasattr(matrix, "shape") and tuple(matrix.shape) == (3, 3)
                tests.append(("matrix shape", shape_ok, "matrix should have shape (3, 3)."))
                values_ok = np.array_equal(matrix, expected)
                tests.append(("matrix values", values_ok, "matrix should contain values 1 through 9."))
            except Exception as error:  # noqa: BLE001
                tests.append(("numpy validation", False, f"Could not validate matrix: {error}"))

    passed_all = tests and all(item[1] for item in tests)
    if passed_all:
        status = "passed"
        feedback.append("Correct solution submitted.")
    elif not feedback:
        feedback.append("Create matrix with np.arange(1, 10).reshape(3, 3).")

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

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
        a = namespace.get("a")
        b = namespace.get("b")
        if a is None or b is None:
            tests.append(("arrays defined", False, "Define arrays a and b as instructed."))
        else:
            try:
                import numpy as np

                a_ok = np.array_equal(a, np.array([10, 20, 30, 40]))
                b_ok = np.array_equal(b, np.array([1, 2, 3, 4]))
                tests.append(("array a values", a_ok, "a should equal np.array([10, 20, 30, 40])."))
                tests.append(("array b values", b_ok, "b should equal np.array([1, 2, 3, 4])."))

                division_ok = np.array_equal(a / b, np.array([10.0, 10.0, 10.0, 10.0]))
                tests.append(("element-wise division", division_ok, "a / b should be [10, 10, 10, 10]."))

                dot_ok = float(np.dot(a, b)) == 300.0
                tests.append(("dot product", dot_ok, "np.dot(a, b) should be 300."))

                filtered_ok = np.array_equal(a[a > 15], np.array([20, 30, 40]))
                tests.append(("filter > 15", filtered_ok, "a[a > 15] should be [20, 30, 40]."))
            except Exception as error:  # noqa: BLE001
                tests.append(("numpy validation", False, f"Could not validate arrays: {error}"))

    passed_all = tests and all(item[1] for item in tests)
    if passed_all:
        status = "passed"
        feedback.append("Correct solution submitted.")
    elif not feedback:
        feedback.append("Define arrays a and b and perform division, dot product, and filtering.")

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

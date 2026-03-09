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

    model = namespace.get("model")
    if model is None:
        tests.append(("model exists", False, "Define fitted model variable named model."))
    else:
        has_params = hasattr(model, "params")
        tests.append(("model has params", has_params, "Model should expose regression parameters."))
        if has_params:
            params_len_ok = len(model.params) >= 3
            tests.append(("model parameter count", params_len_ok, "Model should include const, education, and experience."))

    passed_all = tests and all(item[1] for item in tests)
    if passed_all:
        status = "passed"
        feedback.append("Correct solution submitted.")
    elif not feedback:
        feedback.append("Fit OLS as model = sm.OLS(wage, X).fit() and print summary.")

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

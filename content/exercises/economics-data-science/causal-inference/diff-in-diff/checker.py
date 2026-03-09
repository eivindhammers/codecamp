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

    df = namespace.get("df")
    if df is None:
        tests.append(("df exists", False, "Define DataFrame variable df."))
    else:
        has_col = "treated_post" in getattr(df, "columns", [])
        tests.append(("treated_post column", has_col, "Create df['treated_post'] = treated * post."))

    model = namespace.get("model")
    if model is None:
        tests.append(("model exists", False, "Fit OLS model and store it in model."))
    else:
        params = getattr(model, "params", {})
        has_param = "treated_post" in getattr(params, "index", []) or "treated_post" in params
        tests.append(("did parameter", has_param, "Model should include treated_post coefficient."))

    passed_all = tests and all(item[1] for item in tests)
    if passed_all:
        status = "passed"
        feedback.append("Correct solution submitted.")
    elif not feedback:
        feedback.append("Create treated_post and estimate the DiD OLS model.")

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

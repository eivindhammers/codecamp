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
    forecast = namespace.get("forecast")
    tests.append(("model exists", model is not None, "Fit ARIMA model and store it in model."))
    has_forecast = forecast is not None
    tests.append(("forecast exists", has_forecast, "Create forecast variable from model.forecast(steps=4)."))
    if has_forecast:
        try:
            length_ok = len(forecast) == 4
        except TypeError:
            length_ok = False
        tests.append(("forecast length", length_ok, "Forecast must contain 4 steps."))

    passed_all = tests and all(item[1] for item in tests)
    if passed_all:
        status = "passed"
        feedback.append("Correct solution submitted.")
    elif not feedback:
        feedback.append("Fit ARIMA(1,1,1) and generate a 4-step forecast.")

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

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
        agg = namespace.get("agg")
        if agg is None:
            tests.append(("agg exists", False, "Define aggregation DataFrame as variable agg."))
        else:
            try:
                import numpy as np
                import pandas as pd

                is_df = isinstance(agg, pd.DataFrame)
                tests.append(("agg type", is_df, "agg should be a pandas DataFrame."))
                if is_df:
                    has_cols = list(agg.columns) == ["sum", "mean"]
                    tests.append(("agg columns", has_cols, "agg columns should be ['sum', 'mean']."))
                    expected_sum = {"Americas": 1754, "Asia": 4136, "EU": 2147}
                    expected_mean = {"Americas": 1754.0, "Asia": 2068.0, "EU": 1073.5}
                    index_ok = set(agg.index.tolist()) == set(expected_sum.keys())
                    tests.append(("agg index", index_ok, "agg should group by region."))
                    if index_ok and has_cols:
                        sums_ok = all(
                            float(agg.loc[key, "sum"]) == float(value)
                            for key, value in expected_sum.items()
                        )
                        means_ok = all(
                            np.isclose(float(agg.loc[key, "mean"]), float(value))
                            for key, value in expected_mean.items()
                        )
                        tests.append(("sum values", sums_ok, "sum values per region are incorrect."))
                        tests.append(("mean values", means_ok, "mean values per region are incorrect."))
            except Exception as error:  # noqa: BLE001
                tests.append(("pandas validation", False, f"Could not validate agg: {error}"))

    passed_all = tests and all(item[1] for item in tests)
    if passed_all:
        status = "passed"
        feedback.append("Correct solution submitted.")
    elif not feedback:
        feedback.append("Group by region and aggregate exports_bn with sum and mean.")

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

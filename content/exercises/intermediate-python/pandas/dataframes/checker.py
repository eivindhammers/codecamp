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
        df = namespace.get("df")
        if df is None:
            tests.append(("df exists", False, "Define a pandas DataFrame named df."))
        else:
            try:
                import numpy as np
                import pandas as pd

                is_df = isinstance(df, pd.DataFrame)
                tests.append(("df type", is_df, "df should be a pandas DataFrame."))
                if is_df:
                    has_col = "gdp_per_capita" in df.columns
                    tests.append(
                        ("gdp_per_capita column", has_col, "Add a gdp_per_capita column to df.")
                    )
                    if has_col:
                        expected = df["gdp_billion"] * 1000 / df["population_million"]
                        values_ok = np.allclose(df["gdp_per_capita"].to_numpy(), expected.to_numpy())
                        tests.append(
                            (
                                "gdp_per_capita values",
                                values_ok,
                                "gdp_per_capita should equal gdp_billion * 1000 / population_million.",
                            )
                        )
            except Exception as error:  # noqa: BLE001
                tests.append(("pandas validation", False, f"Could not validate df: {error}"))

    passed_all = tests and all(item[1] for item in tests)
    if passed_all:
        status = "passed"
        feedback.append("Correct solution submitted.")
    elif not feedback:
        feedback.append("Create df and add gdp_per_capita with column arithmetic.")

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

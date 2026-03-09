import pandas as pd

df = pd.DataFrame({
    "country": ["Germany", "France", "Italy"],
    "gdp_billion": [3869, 2779, 1997],
    "population_million": [83.2, 67.4, 59.6]
})

df["gdp_per_capita"] = df["gdp_billion"] * 1000 / df["population_million"]
print(df)

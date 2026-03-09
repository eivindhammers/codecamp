import pandas as pd

df = pd.DataFrame({
    "region": ["EU", "EU", "Asia", "Asia", "Americas"],
    "country": ["Germany", "France", "Japan", "China", "USA"],
    "exports_bn": [1563, 584, 756, 3380, 1754]
})

agg = df.groupby("region")["exports_bn"].agg(["sum", "mean"])
print(agg)

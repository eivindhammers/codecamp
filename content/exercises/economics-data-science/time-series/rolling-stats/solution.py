import numpy as np
import pandas as pd

np.random.seed(7)
dates = pd.date_range('2015-01', periods=60, freq='MS')
gdp = 100 + np.arange(60) * 0.5 + np.random.normal(0, 2, 60)

df = pd.DataFrame({'date': dates, 'gdp': gdp}).set_index('date')
df['ma3']  = df['gdp'].rolling(window=3).mean()
df['ma12'] = df['gdp'].rolling(window=12).mean()
print(df.tail(5))

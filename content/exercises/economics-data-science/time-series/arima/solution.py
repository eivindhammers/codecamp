import numpy as np
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA

np.random.seed(42)
gdp = 100 + np.cumsum(np.random.normal(0.5, 1.5, 80))

model = ARIMA(gdp, order=(1, 1, 1)).fit()
print(model.summary())

forecast = model.forecast(steps=4)
print("\n4-step forecast:", forecast.round(2))

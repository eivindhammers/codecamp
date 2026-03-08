import numpy as np
import statsmodels.api as sm

np.random.seed(42)
n = 100
education = np.random.randint(8, 22, n)
experience = np.random.randint(0, 30, n)
wage = 5 + 2.5 * education + 0.8 * experience + np.random.normal(0, 3, n)

X = np.column_stack([education, experience])
X = sm.add_constant(X)

model = sm.OLS(wage, X).fit()
print(model.summary())

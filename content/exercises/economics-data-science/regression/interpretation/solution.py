import numpy as np
import statsmodels.api as sm

np.random.seed(42)
n = 100
education = np.random.randint(8, 22, n)
experience = np.random.randint(0, 30, n)
wage = 5 + 2.5 * education + 0.8 * experience + np.random.normal(0, 3, n)
X = sm.add_constant(np.column_stack([education, experience]))
model = sm.OLS(wage, X).fit()

edu_coef = model.params[1]
edu_pval = model.pvalues[1]
r_squared = model.rsquared

print(f"Education coef: {edu_coef:.2f}, p-value: {edu_pval:.3f}, R\u00b2: {r_squared:.3f}")

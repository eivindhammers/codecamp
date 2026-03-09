import numpy as np
import pandas as pd
import statsmodels.api as sm

np.random.seed(0)
n = 200
treated = np.repeat([0, 1], n // 2)
post = np.tile([0, 1], n // 2)
true_did = 5.0
outcome = 10 + 3 * treated + 2 * post + true_did * (treated * post) + np.random.normal(0, 2, n)

df = pd.DataFrame({'treated': treated, 'post': post, 'outcome': outcome})
df['treated_post'] = df['treated'] * df['post']

X = sm.add_constant(df[['treated', 'post', 'treated_post']])
model = sm.OLS(df['outcome'], X).fit()
print(f"DiD estimate: {model.params['treated_post']:.2f}")
print(f"True effect:  {true_did:.2f}")

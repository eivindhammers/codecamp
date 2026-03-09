library(fixest)

set.seed(99)
n <- 200
proximity <- rnorm(n)
ability <- rnorm(n)
education <- 12 + proximity * 2 + ability + rnorm(n)
wage <- 5 + education * 1.5 + ability * 3 + rnorm(n)

df <- data.frame(wage, education, proximity_to_college = proximity)

iv_model <- feols(wage ~ 1 | education ~ proximity_to_college, data = df)
print(summary(iv_model))

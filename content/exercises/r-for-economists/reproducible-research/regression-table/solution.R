library(modelsummary)

set.seed(5)
n <- 150
df <- data.frame(
  education = sample(8:20, n, replace = TRUE),
  experience = sample(0:30, n, replace = TRUE),
  age = sample(22:65, n, replace = TRUE)
)
df$wage <- 3 + 2 * df$education + 0.5 * df$experience + 0.1 * df$age + rnorm(n, 0, 4)

m1 <- lm(wage ~ education, data = df)
m2 <- lm(wage ~ education + experience, data = df)
m3 <- lm(wage ~ education + experience + age, data = df)

modelsummary(list(m1, m2, m3), stars = TRUE)

library(fixest)

set.seed(1)
panel <- data.frame(
  id = rep(1:50, each = 5),
  year = rep(2019:2023, 50),
  education = rep(sample(8:20, 50, replace = TRUE), each = 5),
  wage = exp(0.5 + rep(rnorm(50), each = 5) + rnorm(250, 0, 0.3))
)
panel$wage <- panel$wage + 2 * panel$education

model <- feols(log(wage) ~ education | id + year, cluster = ~id, data = panel)
print(summary(model))

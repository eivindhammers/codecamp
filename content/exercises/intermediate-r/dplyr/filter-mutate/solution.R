library(dplyr)

result <- mtcars |>
  filter(mpg > 20) |>
  mutate(kpl = mpg * 0.425)
print(head(result))

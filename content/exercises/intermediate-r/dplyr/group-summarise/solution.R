library(dplyr)

mtcars |>
  group_by(cyl) |>
  summarise(
    mean_mpg = mean(mpg),
    mean_hp = mean(hp)
  ) |>
  arrange(cyl)

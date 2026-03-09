library(dplyr)
library(ggplot2)

mtcars |>
  group_by(cyl) |>
  summarise(avg_mpg = mean(mpg)) |>
  ggplot(aes(x = factor(cyl), y = avg_mpg, fill = factor(cyl))) +
  geom_bar(stat = "identity") +
  geom_hline(yintercept = 20, linetype = "dashed") +
  labs(x = "Cylinders", y = "Average MPG", title = "Average MPG by Cylinder Count")

library(ggplot2)

ggplot(mtcars, aes(x = wt, y = mpg, colour = factor(cyl))) +
  geom_point() +
  labs(
    x = "Weight (1000 lbs)",
    y = "Fuel Efficiency (MPG)",
    colour = "Cylinders",
    title = "Car Weight vs Fuel Efficiency"
  )

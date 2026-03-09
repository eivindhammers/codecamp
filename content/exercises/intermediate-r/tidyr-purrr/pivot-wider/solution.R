library(tidyr)

gdp_long <- data.frame(
  country = c("Norway", "Norway", "Sweden", "Sweden"),
  year = c(2022, 2023, 2022, 2023),
  gdp = c(579.3, 601.2, 585.9, 597.1)
)

gdp_wide <- gdp_long |>
  pivot_wider(names_from = year, values_from = gdp)
print(gdp_wide)

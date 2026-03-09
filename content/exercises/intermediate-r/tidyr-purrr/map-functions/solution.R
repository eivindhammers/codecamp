library(purrr)

result <- map_dbl(mtcars, sd)
print(round(result, 2))

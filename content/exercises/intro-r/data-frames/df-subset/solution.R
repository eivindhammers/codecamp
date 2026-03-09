employees <- data.frame(
  name = c("Alice", "Bob", "Carol"),
  age = c(28, 35, 42),
  salary = c(50000, 65000, 72000)
)
subset_df <- employees[employees$age > 30, c("name", "salary")]
print(subset_df)

args <- commandArgs(trailingOnly = TRUE)

if (length(args) < 2) {
  stop("Usage: checker.R <submission_path> <output_path>")
}

submission_path <- args[[1]]
output_path <- args[[2]]

test_results <- list()
feedback <- c()
status <- "failed"

record_test <- function(name, passed, message) {
  test_results[[length(test_results) + 1]] <<- list(
    name = name,
    passed = passed,
    message = message
  )
}

env <- new.env(parent = baseenv())
execution_ok <- TRUE
execution_error <- NULL

tryCatch(
  {
    source(submission_path, local = env)
  },
  error = function(e) {
    execution_ok <<- FALSE
    execution_error <<- conditionMessage(e)
  }
)

if (!execution_ok) {
  record_test("code runs", FALSE, "Your code did not run successfully.")
  feedback <- c(feedback, paste("Execution error:", execution_error))
} else {
  record_test("code runs", TRUE, "Code executed without errors.")
  if (!exists("employees", envir = env, inherits = FALSE)) {
    record_test("employees exists", FALSE, "Define a data frame named `employees`.")
  } else {
    employees <- get("employees", envir = env, inherits = FALSE)
    expected_names <- c("Alice", "Bob", "Carol")
    expected_age <- c(28, 35, 42)
    expected_salary <- c(50000, 65000, 72000)

    is_df <- is.data.frame(employees)
    record_test("employees is data frame", is_df, "`employees` must be a data frame.")
    if (is_df) {
      has_columns <- identical(colnames(employees), c("name", "age", "salary"))
      record_test("employees columns", has_columns, "Use columns: name, age, salary.")
      has_rows <- nrow(employees) == 3
      record_test("employees rows", has_rows, "employees should contain 3 rows.")
      matches_values <- identical(as.character(employees$name), expected_names) &&
        identical(as.numeric(employees$age), expected_age) &&
        identical(as.numeric(employees$salary), expected_salary)
      record_test("employees values", matches_values, "employees values do not match the exercise.")
    }
  }
}

passed_all <- length(test_results) > 0 && all(vapply(test_results, function(t) isTRUE(t$passed), logical(1)))
if (passed_all) {
  status <- "passed"
  feedback <- c(feedback, "Correct solution submitted.")
} else if (length(feedback) == 0) {
  feedback <- c(feedback, "Create employees data frame with the requested columns and values.")
}

output_lines <- c(paste0("STATUS:", status))
for (msg in feedback) {
  output_lines <- c(output_lines, paste0("FEEDBACK:", msg))
}
for (t in test_results) {
  pass_label <- if (isTRUE(t$passed)) "pass" else "fail"
  output_lines <- c(output_lines, paste0("TEST:", t$name, "|", pass_label, "|", t$message))
}

writeLines(output_lines, con = output_path)

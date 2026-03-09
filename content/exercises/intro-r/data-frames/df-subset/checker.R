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
  if (!exists("subset_df", envir = env, inherits = FALSE)) {
    record_test("subset_df exists", FALSE, "Define `subset_df` with the filtered rows.")
  } else {
    subset_df <- get("subset_df", envir = env, inherits = FALSE)
    expected <- data.frame(
      name = c("Bob", "Carol"),
      salary = c(65000, 72000)
    )
    is_df <- is.data.frame(subset_df)
    record_test("subset_df is data frame", is_df, "`subset_df` must be a data frame.")
    if (is_df) {
      has_columns <- identical(colnames(subset_df), c("name", "salary"))
      record_test("subset_df columns", has_columns, "subset_df should include only name and salary.")
      has_rows <- nrow(subset_df) == 2
      record_test("subset_df rows", has_rows, "subset_df should contain Bob and Carol.")
      matches_values <- identical(as.character(subset_df$name), as.character(expected$name)) &&
        identical(as.numeric(subset_df$salary), as.numeric(expected$salary))
      record_test("subset_df values", matches_values, "subset_df values do not match expected output.")
    }
  }
}

passed_all <- length(test_results) > 0 && all(vapply(test_results, function(t) isTRUE(t$passed), logical(1)))
if (passed_all) {
  status <- "passed"
  feedback <- c(feedback, "Correct solution submitted.")
} else if (length(feedback) == 0) {
  feedback <- c(feedback, "Filter employees with age > 30 and keep only name/salary columns.")
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

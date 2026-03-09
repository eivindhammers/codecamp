args <- commandArgs(trailingOnly = TRUE)
if (length(args) < 2) stop("Usage: checker.R <submission_path> <output_path>")
submission_path <- args[[1]]
output_path <- args[[2]]

test_results <- list()
feedback <- c()
status <- "failed"
record_test <- function(name, passed, message) {
  test_results[[length(test_results) + 1]] <<- list(name = name, passed = passed, message = message)
}

env <- new.env(parent = baseenv())
execution_ok <- TRUE
execution_error <- NULL
last_value <- NULL
tryCatch({
  sourced <- source(submission_path, local = env)
  last_value <- sourced$value
}, error = function(e) {
  execution_ok <<- FALSE
  execution_error <<- conditionMessage(e)
})

if (!execution_ok) {
  record_test("code runs", FALSE, "Your code did not run successfully.")
  feedback <- c(feedback, paste("Execution error:", execution_error))
} else {
  record_test("code runs", TRUE, "Code executed without errors.")
  is_df <- is.data.frame(last_value)
  record_test("returns table", is_df, "Pipeline should return a summary table.")
  if (is_df) {
    has_cols <- all(c("cyl", "mean_mpg", "mean_hp") %in% colnames(last_value))
    cyl_sorted <- identical(last_value$cyl, sort(last_value$cyl))
    record_test("summary columns", has_cols, "Include cyl, mean_mpg, and mean_hp columns.")
    record_test("arranged by cyl", cyl_sorted, "Arrange results by cyl.")
  }
}

passed_all <- length(test_results) > 0 && all(vapply(test_results, function(t) isTRUE(t$passed), logical(1)))
if (passed_all) {
  status <- "passed"; feedback <- c(feedback, "Correct solution submitted.")
} else if (length(feedback) == 0) {
  feedback <- c(feedback, "Group by cyl, summarise mean_mpg/mean_hp, and arrange(cyl).")
}

output_lines <- c(paste0("STATUS:", status))
for (msg in feedback) output_lines <- c(output_lines, paste0("FEEDBACK:", msg))
for (t in test_results) output_lines <- c(output_lines, paste0("TEST:", t$name, "|", if (isTRUE(t$passed)) "pass" else "fail", "|", t$message))
writeLines(output_lines, con = output_path)

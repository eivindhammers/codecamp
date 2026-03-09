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

execution_ok <- TRUE
execution_error <- NULL
last_value <- NULL
tryCatch({
  sourced <- source(submission_path, local = new.env(parent = baseenv()))
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
  is_plot <- inherits(last_value, "ggplot")
  record_test("returns ggplot", is_plot, "Return a ggplot bar chart object.")
}

passed_all <- length(test_results) > 0 && all(vapply(test_results, function(t) isTRUE(t$passed), logical(1)))
if (passed_all) {
  status <- "passed"; feedback <- c(feedback, "Correct solution submitted.")
} else if (length(feedback) == 0) {
  feedback <- c(feedback, "Create grouped summary and return ggplot bar chart with reference line.")
}

output_lines <- c(paste0("STATUS:", status))
for (msg in feedback) output_lines <- c(output_lines, paste0("FEEDBACK:", msg))
for (t in test_results) output_lines <- c(output_lines, paste0("TEST:", t$name, "|", if (isTRUE(t$passed)) "pass" else "fail", "|", t$message))
writeLines(output_lines, con = output_path)

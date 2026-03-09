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
  test_results[[length(test_results) + 1]] <<- list(name = name, passed = passed, message = message)
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
  has_result <- exists("result", envir = env, inherits = FALSE)
  record_test("result exists", has_result, "Define filtered data frame as `result`.")
  if (has_result) {
    result <- get("result", envir = env, inherits = FALSE)
    is_df <- is.data.frame(result)
    has_kpl <- is_df && "kpl" %in% colnames(result)
    mpg_filtered <- is_df && all(result$mpg > 20)
    record_test("result is data frame", is_df, "`result` should be a data frame.")
    record_test("kpl column", has_kpl, "Add kpl = mpg * 0.425.")
    record_test("mpg filter", mpg_filtered, "Filter rows where mpg > 20.")
  }
}

passed_all <- length(test_results) > 0 && all(vapply(test_results, function(t) isTRUE(t$passed), logical(1)))
if (passed_all) {
  status <- "passed"
  feedback <- c(feedback, "Correct solution submitted.")
} else if (length(feedback) == 0) {
  feedback <- c(feedback, "Create `result` using filter(mpg > 20) and mutate(kpl = mpg * 0.425).")
}

output_lines <- c(paste0("STATUS:", status))
for (msg in feedback) output_lines <- c(output_lines, paste0("FEEDBACK:", msg))
for (t in test_results) {
  output_lines <- c(output_lines, paste0("TEST:", t$name, "|", if (isTRUE(t$passed)) "pass" else "fail", "|", t$message))
}
writeLines(output_lines, con = output_path)

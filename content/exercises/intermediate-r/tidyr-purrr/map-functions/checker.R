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
tryCatch({
  source(submission_path, local = env)
}, error = function(e) {
  execution_ok <<- FALSE
  execution_error <<- conditionMessage(e)
})

if (!execution_ok) {
  record_test("code runs", FALSE, "Your code did not run successfully.")
  feedback <- c(feedback, paste("Execution error:", execution_error))
} else {
  record_test("code runs", TRUE, "Code executed without errors.")
  has_result <- exists("result", envir = env, inherits = FALSE)
  record_test("result exists", has_result, "Define map output as result.")
  if (has_result) {
    result <- get("result", envir = env, inherits = FALSE)
    is_numeric <- is.numeric(result)
    has_mpg <- "mpg" %in% names(result)
    record_test("numeric output", is_numeric, "result should be a numeric vector.")
    record_test("includes mpg", has_mpg, "result should include mtcars column names like mpg.")
  }
}

passed_all <- length(test_results) > 0 && all(vapply(test_results, function(t) isTRUE(t$passed), logical(1)))
if (passed_all) {
  status <- "passed"; feedback <- c(feedback, "Correct solution submitted.")
} else if (length(feedback) == 0) {
  feedback <- c(feedback, "Use map_dbl(mtcars, sd) and store in result.")
}

output_lines <- c(paste0("STATUS:", status))
for (msg in feedback) output_lines <- c(output_lines, paste0("FEEDBACK:", msg))
for (t in test_results) output_lines <- c(output_lines, paste0("TEST:", t$name, "|", if (isTRUE(t$passed)) "pass" else "fail", "|", t$message))
writeLines(output_lines, con = output_path)

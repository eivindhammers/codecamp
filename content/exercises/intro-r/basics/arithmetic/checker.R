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

  has_result <- exists("result", envir = env, inherits = FALSE)
  if (!has_result) {
    record_test("creates result", FALSE, "Create a variable named `result`.")
    feedback <- c(feedback, "Create a variable named `result`.")
  } else {
    record_test("creates result", TRUE, "Variable `result` exists.")
    result_value <- get("result", envir = env, inherits = FALSE)
    is_correct <- is.numeric(result_value) && length(result_value) == 1 && result_value == 42
    if (!is_correct) {
      record_test("result equals 42", FALSE, "The variable `result` must equal 42.")
      feedback <- c(feedback, "The variable `result` must equal 42.")
    } else {
      record_test("result equals 42", TRUE, "Correct arithmetic result.")
      status <- "passed"
      feedback <- c(feedback, "Correct solution submitted.")
    }
  }
}

output_lines <- c()
output_lines <- c(output_lines, paste0("STATUS:", status))
for (msg in feedback) {
  output_lines <- c(output_lines, paste0("FEEDBACK:", msg))
}
for (t in test_results) {
  pass_label <- if (isTRUE(t$passed)) "pass" else "fail"
  output_lines <- c(
    output_lines,
    paste0("TEST:", t$name, "|", pass_label, "|", t$message)
  )
}

writeLines(output_lines, con = output_path)

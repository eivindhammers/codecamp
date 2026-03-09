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
  if (!exists("scores", envir = env, inherits = FALSE)) {
    record_test("scores exists", FALSE, "Define a vector named `scores`.")
  } else {
    scores <- get("scores", envir = env, inherits = FALSE)
    expected <- c(85, 92, 78, 95, 88)
    if (is.numeric(scores) && identical(as.numeric(scores), expected)) {
      record_test("scores values", TRUE, "scores vector has the expected values.")
    } else {
      record_test("scores values", FALSE, "Set scores to c(85, 92, 78, 95, 88).")
    }
    if (length(scores) == 5) {
      record_test("scores length", TRUE, "scores has length 5.")
    } else {
      record_test("scores length", FALSE, "scores should contain exactly 5 elements.")
    }
  }
}

passed_all <- length(test_results) > 0 && all(vapply(test_results, function(t) isTRUE(t$passed), logical(1)))
if (passed_all) {
  status <- "passed"
  feedback <- c(feedback, "Correct solution submitted.")
} else if (length(feedback) == 0) {
  feedback <- c(feedback, "Create scores with the requested values and print its length.")
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

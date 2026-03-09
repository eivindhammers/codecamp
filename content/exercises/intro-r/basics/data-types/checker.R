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

  checks <- list(
    list("age", 30, function(v) is.numeric(v) && length(v) == 1 && identical(v, 30)),
    list("name", "Alice", function(v) is.character(v) && length(v) == 1 && identical(v, "Alice")),
    list("is_student", TRUE, function(v) is.logical(v) && length(v) == 1 && identical(v, TRUE))
  )

  for (item in checks) {
    var_name <- item[[1]]
    expected <- item[[2]]
    validator <- item[[3]]
    if (!exists(var_name, envir = env, inherits = FALSE)) {
      record_test(
        paste0(var_name, " exists"),
        FALSE,
        paste0("Define variable `", var_name, "`.")
      )
      next
    }
    value <- get(var_name, envir = env, inherits = FALSE)
    if (validator(value)) {
      record_test(paste0(var_name, " value/type"), TRUE, paste0("`", var_name, "` is correct."))
    } else {
      record_test(
        paste0(var_name, " value/type"),
        FALSE,
        paste0("Set `", var_name, "` to ", deparse(expected), " with the expected type.")
      )
    }
  }
}

passed_all <- length(test_results) > 0 && all(vapply(test_results, function(t) isTRUE(t$passed), logical(1)))
if (passed_all) {
  status <- "passed"
  feedback <- c(feedback, "Correct solution submitted.")
} else if (length(feedback) == 0) {
  feedback <- c(feedback, "Define age/name/is_student with the requested values and types.")
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

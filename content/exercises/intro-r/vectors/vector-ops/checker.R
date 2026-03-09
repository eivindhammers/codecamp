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
captured_output <- character()

tryCatch(
  {
    captured_output <- capture.output(source(submission_path, local = env))
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
  if (!exists("prices", envir = env, inherits = FALSE)) {
    record_test("prices exists", FALSE, "Define vector `prices`.")
  } else {
    prices <- get("prices", envir = env, inherits = FALSE)
    expected <- c(10.5, 20.0, 15.75, 8.25)
    if (is.numeric(prices) && identical(as.numeric(prices), expected)) {
      record_test("prices values", TRUE, "prices vector has expected values.")
    } else {
      record_test("prices values", FALSE, "Set prices to c(10.5, 20.0, 15.75, 8.25).")
    }
  }

  output_text <- paste(captured_output, collapse = "\n")
  has_mean <- grepl("13\\.125", output_text)
  has_sum <- grepl("54\\.5", output_text)
  has_filtered <- grepl("20", output_text) && grepl("15\\.75", output_text)
  record_test("prints mean", has_mean, "Output should include mean(prices) = 13.125.")
  record_test("prints sum", has_sum, "Output should include sum(prices) = 54.5.")
  record_test("prints filtered prices", has_filtered, "Output should include prices above 12.")
}

passed_all <- length(test_results) > 0 && all(vapply(test_results, function(t) isTRUE(t$passed), logical(1)))
if (passed_all) {
  status <- "passed"
  feedback <- c(feedback, "Correct solution submitted.")
} else if (length(feedback) == 0) {
  feedback <- c(feedback, "Compute mean/sum and print prices filtered above 12.")
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

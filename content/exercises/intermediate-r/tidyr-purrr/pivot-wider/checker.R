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
  has_wide <- exists("gdp_wide", envir = env, inherits = FALSE)
  record_test("gdp_wide exists", has_wide, "Define widened table as gdp_wide.")
  if (has_wide) {
    gdp_wide <- get("gdp_wide", envir = env, inherits = FALSE)
    is_df <- is.data.frame(gdp_wide)
    has_cols <- all(c("country", "2022", "2023") %in% colnames(gdp_wide))
    record_test("gdp_wide data frame", is_df, "gdp_wide should be a data frame.")
    record_test("gdp_wide columns", has_cols, "Use pivot_wider to create 2022 and 2023 columns.")
  }
}

passed_all <- length(test_results) > 0 && all(vapply(test_results, function(t) isTRUE(t$passed), logical(1)))
if (passed_all) {
  status <- "passed"; feedback <- c(feedback, "Correct solution submitted.")
} else if (length(feedback) == 0) {
  feedback <- c(feedback, "Create gdp_wide using pivot_wider(names_from = year, values_from = gdp).")
}

output_lines <- c(paste0("STATUS:", status))
for (msg in feedback) output_lines <- c(output_lines, paste0("FEEDBACK:", msg))
for (t in test_results) output_lines <- c(output_lines, paste0("TEST:", t$name, "|", if (isTRUE(t$passed)) "pass" else "fail", "|", t$message))
writeLines(output_lines, con = output_path)

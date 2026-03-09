args <- commandArgs(trailingOnly = TRUE)
submission_path <- args[[1]]
output_path <- args[[2]]
source(submission_path, local = TRUE)

# TODO: replace this scaffold assertion with exercise-specific checks.
cat('PASS: Replace scaffold checks with real tests.\n', file = output_path)

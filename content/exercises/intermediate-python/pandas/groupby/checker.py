import runpy
import sys

submission_path = sys.argv[1]
output_path = sys.argv[2]
runpy.run_path(submission_path, run_name='__main__')

# TODO: replace this scaffold assertion with exercise-specific checks.
with open(output_path, 'w', encoding='utf-8') as handle:
    handle.write('PASS: Replace scaffold checks with real tests.\n')

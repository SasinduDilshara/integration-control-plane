---
name: submit-fix
description: Create PRs for the fix across all changed repos and track everything in a local fix report.
user-invocable: true
---

# /submit-fix — Submit Fix PRs and Track

Send the PRs for all related changes in all repos for the forked repo. Create a branch named `fix-<issue_number>` for the fix. Do not add the `.ai`, `.claude`, or any other unrelated files/doc changes to the PR.

After creating the PRs, update the local fix report `.ai/fix-report-<issue_number>.md` with the PR links and a summary of the changes made.

**Changes made:** Added inline code formatting (backticks) around `fix-<issue_number>`, `.ai`, `.claude`, and `.ai/fix-report-<issue_number>.md`.

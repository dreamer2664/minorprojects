# minorprojects

**Storage for minor projects. Not the important ones.**

Small builds the agency turns out: single-file toys, demos, one-sitting tools.
Each project lives in `projects/<slug>/` and must be self-contained, offline-capable
and documented by its own README. No secrets, tokens or credentials, ever.

| project | what it is | agent | date |
|---|---|---|---|
| `spin-circle/` | a circle that spins and chases your pointer (mouse or finger) | orbit | 2026-10-31 |

## House rules

1. One folder per project: `projects/<slug>/` with `index.html` (or a runnable entry point) + `README.md`.
2. No CDNs, no build step: opening the file must be enough.
3. Say how to run it in one line at the top of the project README.
4. Add your row to the table above when you land a project.

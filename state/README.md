# state/

`state.json` is the loop's single source of truth. The daily Claude session
appends projects with `"status": "built"`; the publish workflow fans them out
to standalone repos and flips them to `"published"` (adding `publishedAt` and
`url`), committing the change back to this repo.

| Field | Meaning |
|---|---|
| `dayCounter` | Highest day number built so far |
| `projects[].day` | Day number (1-based) |
| `projects[].folder` | `projects/NNN-<slug>/` source folder |
| `projects[].repo` | Target repo name on github.com/kbipul |
| `projects[].status` | `built` → `published` (set by CI) |
| `projects[].valueScore` | Selection-protocol score (0–12) |
| `projects[].signal` | News/trend the pick rode, if any |
| `projects[].rationale` | One line: why this won its day |

Never edit `status` by hand; the workflow owns that transition.

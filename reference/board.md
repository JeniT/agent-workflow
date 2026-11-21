# The board

GitHub Issues is the board; closed issues are done. `gh` fills in `{owner}/{repo}` from the clone it runs in.

## Labels

| Label         | Means                                                                            |
| ------------- | -------------------------------------------------------------------------------- |
| `inbox`       | A raw report or observation, waiting for triage; built only once triaged         |
| `ready`       | Fully specified: an agent can start now and builds it as written                 |
| `backlog`     | Waits on its blockers (blocked-by links) or on a decision                        |
| `in-progress` | Claimed: its branch exists                                                       |
| `decision`    | The owner's to make: the question, the options, a recommendation, what it blocks |
| `grill`       | Needs a design conversation with the owner before anyone builds it               |
| `epic`        | An umbrella for one step of the roadmap; its tasks are sub-issues                |
| type          | `bug`, `enhancement`, `documentation` (the project may add more)                 |

The project's `docs/agents/triage.md` lists its milestones and any labels of its own.

## Epics

Every `ready` or `backlog` issue sits under an epic, as a GitHub sub-issue, so the next agent's duplicate check finds
it. Linking wants the issue's database id, not its number:

```bash
epic=26
url=$(gh issue create --label enhancement --label ready --milestone "<milestone>" --title "..." --body "...")
id=$(gh api repos/{owner}/{repo}/issues/${url##*/} --jq .id)
gh api --method POST repos/{owner}/{repo}/issues/$epic/sub_issues -F sub_issue_id=$id
```

An epic's sub-issues, with state and labels, are what to read before filing or building anything in its area:

```bash
gh api repos/{owner}/{repo}/issues/<epic>/sub_issues --paginate --jq '.[] | "#\(.number) \(.state) [\([.labels[].name] | join(","))] \(.title)"'
```

`gh api repos/{owner}/{repo}/issues/<n>/parent --jq .number` prints an issue's epic. An epic may hold issues from
another repository of the same owner; use that repository's `owner/name` in place of `{owner}/{repo}` for them.

## Blockers

A task that waits on another issue says so with GitHub's blocked-by link, which GitHub shows on the issue and counts
only while the blocker is open. Label the task `backlog` and add one link per blocker:

```bash
blocker=$(gh api repos/{owner}/{repo}/issues/<blocker> --jq .id)
gh api --method POST repos/{owner}/{repo}/issues/<task>/dependencies/blocked_by -F issue_id=$blocker
```

`gh api repos/{owner}/{repo}/issues/<task>/dependencies/blocked_by --jq '[.[].number]'` lists its blockers. When the
last one closes, `aw promote-unblocked` (run by `aw land`) makes the task `ready`. A `backlog` issue with no blockers
waits on a decision and is promoted by hand.

// `aw promote-unblocked [--dry-run]`: promotes every `backlog` issue that was blocked and no longer is. GitHub's
// blocked-by edges name its blockers, and once every one is closed `backlog` becomes `ready`. `aw land` runs it after
// the landed issue has closed. Prints what it promoted (or would, with --dry-run). A `backlog` issue with no blockers
// waits on a decision, so it is never promoted here.
import { spawnSync } from 'node:child_process'

/**
 * The backlog issues to promote. GitHub reports `issue_dependencies_summary` on each: `blocked_by` counts the blockers
 * still open and `total_blocked_by` all of them, so "had blockers, none open" is the unblocked case.
 */
export function promotable(issues) {
  return issues.filter((issue) => {
    const blockers = issue.issue_dependencies_summary
    return (
      !issue.pull_request &&
      !!blockers &&
      blockers.total_blocked_by > 0 &&
      blockers.blocked_by === 0
    )
  })
}

function gh(args) {
  const r = spawnSync('gh', args, { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`gh ${args.join(' ')} failed: ${r.stderr.trim()}`)
  return r.stdout
}

/** Promotes what is unblocked; returns the exit code. */
export function main(args) {
  const dryRun = args.includes('--dry-run')
  try {
    // --slurp gathers the pages into one array of arrays.
    const pages = JSON.parse(
      gh([
        'api',
        '--paginate',
        '--slurp',
        'repos/{owner}/{repo}/issues?labels=backlog&state=open&per_page=100',
      ]),
    )
    const promoted = promotable(pages.flat())
    for (const issue of promoted) {
      if (!dryRun) {
        gh([
          'issue',
          'edit',
          String(issue.number),
          '--add-label',
          'ready',
          '--remove-label',
          'backlog',
        ])
      }
      console.log(`${dryRun ? 'would promote' : 'promoted'} #${issue.number} ${issue.title}`)
    }
    if (promoted.length === 0) console.log('nothing to promote')
    return 0
  } catch (e) {
    console.error(e.message)
    return 1
  }
}

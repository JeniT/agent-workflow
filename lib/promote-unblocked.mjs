// `aw promote-unblocked [--after <n>] [--dry-run]`: promotes every `backlog` issue that was blocked and no longer is.
// GitHub's blocked-by edges name its blockers, and once every one is closed `backlog` becomes `ready`.
// With `--after <n>` (what `aw land` passes), it first promotes the issues <n> was blocking, in whichever repository
// they live, then scans this repository's backlog, which still catches an issue unblocked by one closed by hand.
// Prints what it promoted (or would, with --dry-run). A `backlog` issue with no blockers waits on a decision, so it is
// never promoted here.
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

/** `owner/name` from an issue's `repository_url`. */
const repoOf = (issue) => issue.repository_url.split('/').slice(-2).join('/')

/**
 * Of the issues a landed issue was blocking (any repository, any state or label), the promotions to make: open,
 * `backlog`, and no blocker left.
 */
export function unblockedBy(blocking) {
  const waiting = blocking.filter(
    (issue) => issue.state === 'open' && issue.labels.some((label) => label.name === 'backlog'),
  )
  return promotable(waiting).map((issue) => ({
    repo: repoOf(issue),
    number: issue.number,
    title: issue.title,
  }))
}

function realGh(args) {
  const r = spawnSync('gh', args, { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`gh ${args.join(' ')} failed: ${r.stderr.trim()}`)
  return r.stdout
}

/** Every page of a list endpoint, as one array (--slurp gathers the pages into an array of arrays). */
const list = (gh, path) => JSON.parse(gh(['api', '--paginate', '--slurp', path])).flat()

/** Promotes what is unblocked; returns the exit code. `gh` runs the gh CLI and answers its output. */
export function main(args, _config, gh = realGh) {
  const dryRun = args.includes('--dry-run')
  const at = args.indexOf('--after')
  const after = at === -1 ? undefined : Number(args[at + 1])
  if (at !== -1 && !(Number.isInteger(after) && after > 0)) {
    console.error('usage: aw promote-unblocked [--after <issue number>] [--dry-run]')
    return 1
  }
  const done = new Set()
  const promote = ({ repo, number, title }) => {
    const key = `${repo}#${number}`
    if (done.has(key)) return
    done.add(key)
    if (!dryRun) {
      gh([
        'issue',
        'edit',
        String(number),
        '--repo',
        repo,
        '--add-label',
        'ready',
        '--remove-label',
        'backlog',
      ])
    }
    console.log(`${dryRun ? 'would promote' : 'promoted'} ${key} ${title}`)
  }

  if (after !== undefined) {
    // Its own failure (no access to another repository, say) must not stop landing, so it is reported and passed over.
    try {
      unblockedBy(
        list(gh, `repos/{owner}/{repo}/issues/${after}/dependencies/blocking?per_page=100`),
      ).forEach(promote)
    } catch (e) {
      console.error(`Could not promote the issues #${after} blocked: ${e.message}`)
    }
  }
  try {
    const backlog = list(gh, 'repos/{owner}/{repo}/issues?labels=backlog&state=open&per_page=100')
    promotable(backlog)
      .map((issue) => ({ repo: repoOf(issue), number: issue.number, title: issue.title }))
      .forEach(promote)
  } catch (e) {
    console.error(e.message)
    return 1
  }
  if (done.size === 0) console.log('nothing to promote')
  return 0
}

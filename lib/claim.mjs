// `aw claim 7`: claims issue 7, stopping at the first step that fails. Creating the branch on GitHub comes first
// because only one agent can: "Reference already exists" means someone else has the task.
// Run from the main checkout. Exit 0: claimed, with the worktree at .worktrees/issue-7. Exit 1: the reason.
import { spawnSync } from 'node:child_process'

/** Why this issue can't be claimed, or undefined when it can. `issue` is `gh issue view --json state,labels`. */
export function refusal(issue) {
  const labels = issue.labels.map((l) => l.name)
  if (issue.state !== 'OPEN') return 'it is closed'
  if (labels.includes('in-progress')) return 'it is already in-progress'
  if (labels.includes('decision')) return 'it is a decision for the owner, not a task'
  if (labels.includes('grill'))
    return 'it needs a design conversation with the owner first; make its worktree by hand'
  if (labels.includes('epic')) return 'it is an epic; claim one of its tasks'
  return undefined
}

/**
 * The commands that claim issue `n` from `sha`, in order, as argument lists. `who` goes in the comment; `install` runs
 * inside the new worktree. `{owner}/{repo}` is filled in by gh from the repository it runs in.
 */
export function claimSteps(n, sha, who, install = ['pnpm', 'install']) {
  const branch = `issue-${n}`
  return [
    [
      'gh',
      'api',
      '--silent',
      'repos/{owner}/{repo}/git/refs',
      '-f',
      `ref=refs/heads/${branch}`,
      '-f',
      `sha=${sha}`,
    ],
    ['gh', 'issue', 'edit', String(n), '--add-label', 'in-progress', '--remove-label', 'ready'],
    ['gh', 'issue', 'comment', String(n), '--body', `claimed: ${who} · branch: ${branch}`],
    ['git', 'fetch', 'origin'],
    ['git', 'worktree', 'add', `.worktrees/${branch}`, '-b', branch, `origin/${branch}`],
    install,
  ]
}

function capture(args) {
  const r = spawnSync(args[0], args.slice(1), { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`${args.join(' ')} failed: ${r.stderr.trim()}`)
  return r.stdout.trim()
}

/** Claims the issue named in `args`; returns the exit code. */
export function main(args, config) {
  const n = Number(args[0])
  if (!Number.isInteger(n) || n < 1) {
    console.error('usage: aw claim <issue number>')
    return 1
  }
  try {
    capture(['git', 'fetch', 'origin'])
    const issue = JSON.parse(capture(['gh', 'issue', 'view', String(n), '--json', 'state,labels']))
    const why = refusal(issue)
    if (why) throw new Error(`can't claim #${n}: ${why}`)
    const sha = capture(['git', 'rev-parse', 'origin/main'])
    const who = process.env.CLAIM_AS ?? 'Claude Code session'
    const steps = claimSteps(n, sha, who, config.install)
    for (const [i, step] of steps.entries()) {
      // The install runs inside the new worktree; every other step runs here.
      const cwd = i === steps.length - 1 ? `.worktrees/issue-${n}` : undefined
      const r = spawnSync(step[0], step.slice(1), { stdio: 'inherit', cwd })
      if (r.status !== 0) throw new Error(`\`${step.join(' ')}\` failed; claim stopped there.`)
    }
    console.log(`\nClaimed #${n}. Work in .worktrees/issue-${n}.`)
    return 0
  } catch (e) {
    console.error(e.message)
    return 1
  }
}

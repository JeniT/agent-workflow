// `aw rebase-overlap`: decides whether a rebase onto origin/main needs the checks rerun.
// Run it after `git fetch origin` and BEFORE `git rebase origin/main`: once rebased, the merge-base is
// origin/main itself and "what came in" can no longer be seen.
// Exit 0: nothing incoming touches what this branch changed. Exit 1: overlap (printed), with the project's advice.
import { execFileSync } from 'node:child_process'

/**
 * The files that came in and either this branch changed too, or are one of the project's shared spots. A dependency
 * change shows in the lockfile, so list the lockfile as a shared spot rather than package.json.
 */
export function findOverlap(mine, incoming, sharedSpots = []) {
  const mineSet = new Set(mine)
  return [...new Set(incoming)]
    .filter((file) => mineSet.has(file) || sharedSpots.includes(file))
    .sort()
}

function changedFiles(...range) {
  return execFileSync('git', ['diff', '--name-only', ...range], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
}

/** Prints the answer; returns the exit code. */
export function main(_args, config) {
  const base = execFileSync('git', ['merge-base', 'HEAD', 'origin/main'], {
    encoding: 'utf8',
  }).trim()
  const overlap = findOverlap(
    changedFiles(base, 'HEAD'),
    changedFiles(base, 'origin/main'),
    config.sharedSpots,
  )
  if (overlap.length === 0) {
    console.log(`no overlap: ${config.afterRebase.noOverlap}`)
    return 0
  }
  console.log(`overlap: ${overlap.join(', ')}\n${config.afterRebase.overlap}`)
  return 1
}

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { carriesOn, landSteps, refusal } from '../lib/land.mjs'

test('refuses a branch that is missing or not yet on origin/main', () => {
  assert.match(refusal(7, false, false), /no local branch issue-7/)
  assert.match(refusal(7, true, false), /not on origin\/main/)
  assert.equal(refusal(7, true, true), undefined)
})

test('removes the worktree only after the main checkout is brought up to date, and the branch last', () => {
  const steps = landSteps(7)
  const at = (word) => steps.findIndex((s) => s.includes(word))
  assert.ok(at('--ff-only') < at('worktree'))
  assert.deepEqual(steps.at(-1), ['git', 'branch', '-d', 'issue-7'])
  assert.ok(steps[0].includes('--remove-label'))
  assert.ok(at('promote-unblocked') > at('--delete'), 'promotes once the landed issue has closed')
  assert.deepEqual(steps[at('promote-unblocked')].slice(-3), ['promote-unblocked', '--after', '7'])
})

test('carries on past a remote branch already gone or a refused fast-forward, and stops at anything else', () => {
  assert.deepEqual(
    landSteps(7)
      .filter(carriesOn)
      .map((s) => s[1]),
    ['push', 'merge'],
  )
})

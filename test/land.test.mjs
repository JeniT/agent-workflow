import { test } from 'node:test'
import assert from 'node:assert/strict'
import { carriesOn, closeStep, landSteps, refusal } from '../lib/land.mjs'

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

test('closes the issue only when the push left it open, saying which commit landed it', () => {
  assert.equal(closeStep(7, 'CLOSED', 'abc1234'), undefined)
  const step = closeStep(7, 'OPEN', 'abc1234')
  assert.deepEqual(step.slice(0, 4), ['gh', 'issue', 'close', '7'])
  assert.match(step.at(-1), /abc1234/)
  assert.match(step.at(-1), /Closes #7/)
})

test('a close comes before the promotion, which needs the landed issue closed', () => {
  const close = closeStep(7, 'OPEN', 'abc1234')
  const steps = landSteps(7, close)
  assert.ok(steps.indexOf(close) > 0, 'after in-progress is removed')
  assert.ok(steps.indexOf(close) < steps.findIndex((s) => s.includes('promote-unblocked')))
  assert.equal(landSteps(7).length, steps.length - 1, 'no close step when GitHub closed it')
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { claimSteps, refusal } from '../lib/claim.mjs'

const open = { state: 'OPEN', labels: [{ name: 'ready' }] }

test('an open, unclaimed task can be claimed', () => {
  assert.equal(refusal(open), undefined)
})

test('refuses a closed issue, a claimed one and an owner decision, saying why', () => {
  assert.match(refusal({ ...open, state: 'CLOSED' }), /closed/)
  assert.match(refusal({ ...open, labels: [{ name: 'in-progress' }] }), /in-progress/)
  assert.match(refusal({ ...open, labels: [{ name: 'decision' }] }), /decision/)
})

test('refuses a task that needs a conversation first even when it is ready, and an epic', () => {
  const grill = { ...open, labels: [{ name: 'ready' }, { name: 'grill' }] }
  assert.match(refusal(grill), /conversation/)
  assert.match(refusal({ ...open, labels: [{ name: 'epic' }] }), /epic/)
})

test('creates the branch on GitHub first, and the worktree only after the label and comment', () => {
  const steps = claimSteps(7, 'abc123', 'me')
  assert.deepEqual(steps[0].slice(0, 2), ['gh', 'api'])
  assert.ok(steps[0].includes('ref=refs/heads/issue-7'))
  assert.ok(steps[0].includes('sha=abc123'))
  const worktree = steps.findIndex((s) => s[1] === 'worktree')
  assert.ok(worktree > steps.findIndex((s) => s[1] === 'issue' && s[2] === 'comment'))
  assert.deepEqual(steps[worktree].slice(-3), ['-b', 'issue-7', 'origin/issue-7'])
  assert.ok(steps.some((s) => s.includes('claimed: me · branch: issue-7')))
  assert.ok(steps[0].includes('repos/{owner}/{repo}/git/refs'), 'gh fills in the repository')
})

test("runs the project's install command last", () => {
  assert.deepEqual(claimSteps(7, 'abc', 'me').at(-1), ['pnpm', 'install'])
  assert.deepEqual(claimSteps(7, 'abc', 'me', ['npm', 'ci']).at(-1), ['npm', 'ci'])
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { promotable } from '../lib/promote-unblocked.mjs'

// `blocked_by` counts the blockers still open; `total_blocked_by` counts every blocker, closed ones too.
const issue = (number, blockedBy, totalBlockedBy, extra = {}) => ({
  number,
  title: `Issue ${number}`,
  issue_dependencies_summary: { blocked_by: blockedBy, total_blocked_by: totalBlockedBy },
  ...extra,
})
const numbers = (issues) => promotable(issues).map((i) => i.number)

test('promotes an issue whose blockers are all closed', () => {
  assert.deepEqual(numbers([issue(1, 0, 2)]), [1])
})

test('leaves an issue with a blocker still open', () => {
  assert.deepEqual(numbers([issue(1, 1, 2), issue(2, 2, 2)]), [])
})

test('leaves an issue that never had a blocker: it waits on a decision, not on an issue', () => {
  assert.deepEqual(numbers([issue(1, 0, 0)]), [])
})

test('promotes only the unblocked ones among several', () => {
  assert.deepEqual(
    numbers([issue(1, 0, 1), issue(2, 1, 1), issue(3, 0, 0), issue(4, 0, 3)]),
    [1, 4],
  )
})

test('an issue with no dependency summary is left alone', () => {
  assert.deepEqual(numbers([{ number: 1, title: 'Issue 1' }]), [])
})

test('a pull request is never promoted', () => {
  assert.deepEqual(numbers([issue(1, 0, 1, { pull_request: {} })]), [])
})

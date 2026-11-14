import test from 'node:test'
import assert from 'node:assert/strict'
import { applyTickets, owed, schoolMonths, weekdays } from './records.js'

test('평일만, 쉬는 날 제외', () => {
  // 2026년 3월 1일은 일요일
  assert.deepEqual(weekdays(2026, 3, [2]).slice(0, 5), [3, 4, 5, 6, 9])
  assert.equal(weekdays(2026, 3).length, 22)
})

test('학년도 1~2월은 다음 해', () => {
  const months = schoolMonths(2026)
  assert.equal(months[0].id, '2026-03')
  assert.equal(months[11].id, '2027-02')
})

test('면제권은 받은 개수보다 많이 쓸 수 없다', () => {
  assert.deepEqual(applyTickets(undefined, 'give', 2).next, { got: 2, used: 0 })
  assert.deepEqual(applyTickets({ got: 2, used: 1 }, 'use', 1).next, { got: 2, used: 2 })
  assert.ok(applyTickets({ got: 2, used: 2 }, 'use', 1).error)
  assert.ok(applyTickets({ got: 2, used: 2 }, 'take', 1).error)
  assert.ok(applyTickets(undefined, 'take', 1).error)
})

test('지각 3회마다 벌칙 1건', () => {
  assert.equal(owed(2, 0), 0)
  assert.equal(owed(3, 0), 1)
  assert.equal(owed(7, 1), 1)
  assert.equal(owed(2, 1), 0)
})

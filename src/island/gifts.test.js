import test from 'node:test'
import assert from 'node:assert/strict'
import { giftCount, giftParts, perfectMonth } from './gifts.js'

test('아무 기록이 없으면 0', () => assert.equal(giftCount(undefined), 0))
test('잘한 달·제출·면제권 5장·선생님 선물을 더한다', () => {
  const g = { months: { '2026-03': { perfect: true, book: true }, '2026-04': { book: true }, '2026-05': {} }, got: 11, bonus: 1 }
  assert.deepEqual(giftParts(g), { perfect: 1, book: 2, tickets: 2, bonus: 1 })
  assert.equal(giftCount(g), 6)
})
test('면제권 4장은 아직 0', () => assert.equal(giftCount({ got: 4 }), 0))
test('한 달을 다 냈으면 잘한 달', () => assert.equal(perfectMonth(['o', 'o', 'o']), true))
test('기타 사유는 괜찮다', () => assert.equal(perfectMonth(['o', '병결', 'o']), true))
test('✕가 있으면 아니다', () => assert.equal(perfectMonth(['o', 'x', 'o']), false))
test('마지막 날이 아직 기록되지 않았으면 아니다', () => assert.equal(perfectMonth(['o', 'o', undefined]), false))
test('중간에 빈 날은 무시', () => assert.equal(perfectMonth(['o', undefined, 'o']), true))

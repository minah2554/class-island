import test from 'node:test'
import assert from 'node:assert/strict'
import { catchBlock, giftCount, giftParts, perfectMonth, readingStreak, topRanks } from './gifts.js'

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

test('랭킹: 동점은 같은 등수, 다음 등수는 건너뛴다', () => {
  const rows = [{ name: '가', v: 5 }, { name: '나', v: 5 }, { name: '다', v: 3 }, { name: '라', v: 1 }, { name: '마', v: 0 }]
  assert.deepEqual(topRanks(rows, 'v'), [{ rank: 1, v: 5, names: '가, 나' }, { rank: 3, v: 3, names: '다' }])
})
test('랭킹: 작은 순은 0도 넣고, 많으면 줄인다', () => {
  const rows = ['가', '나', '다', '라', '마'].map((name) => ({ name, v: 0 }))
  assert.deepEqual(topRanks(rows, 'v', true), [{ rank: 1, v: 0, names: '가, 나, 다 외 2명' }])
})

test('채집: 기록이 없으면 할 수 있다', () => assert.equal(catchBlock({}, [], '2026-11-16'), null))
test('채집: 오늘 지각하면 못 한다', () => assert.match(catchBlock({ '2026-11-16': 'o' }, ['2026-11-16'], '2026-11-16'), /지각/))
test('채집: 어제 지각은 상관없다', () => assert.equal(catchBlock({}, ['2026-11-15'], '2026-11-16'), null))
test('채집: 가장 최근 독서기록이 ✕면 못 한다', () => assert.match(catchBlock({ '2026-11-13': 'o', '2026-11-16': 'x' }, [], '2026-11-16'), /독서기록장/))
test('채집: 다시 내면 풀린다, 기타 사유는 괜찮다', () => {
  assert.equal(catchBlock({ '2026-11-13': 'x', '2026-11-16': 'o' }, [], '2026-11-16'), null)
  assert.equal(catchBlock({ '2026-11-16': '병결' }, [], '2026-11-16'), null)
})

test('독서 연속: 최근 달부터 ✕ 없는 달이 이어진 수', () => {
  assert.equal(readingStreak([['o', 'x'], ['o', 'o'], ['o', '병결']]), 2)
  assert.equal(readingStreak([['o'], ['x']]), 0)
  assert.equal(readingStreak([['o'], []]), 0)
  assert.equal(readingStreak([]), 0)
})

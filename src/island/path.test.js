import test from 'node:test'
import assert from 'node:assert/strict'
import { blockedAt, clearWay, route } from './path.js'

const rock = [{ x: 50, y: 50, rx: 10, ry: 5 }]
test('장애물 안은 막힌 곳', () => assert.equal(blockedAt(rock, { x: 52, y: 51 }), true))
test('가로지르면 막힌다', () => assert.equal(clearWay(rock, { x: 20, y: 50 }, { x: 80, y: 50 }), false))
test('비켜 가면 안 막힌다', () => assert.equal(clearWay(rock, { x: 20, y: 80 }, { x: 80, y: 80 }), true))
test('그 건물 앞으로 가는 길은 봐준다', () => assert.equal(clearWay(rock, { x: 50, y: 80 }, { x: 50, y: 54 }), true))
test('막히면 돌아가는 점이 하나 생기고 그 길은 뚫려 있다', () => {
  const a = { x: 20, y: 50 }
  const b = { x: 80, y: 50 }
  const r = route(rock, a, b)
  assert.equal(r.length, 2)
  assert.ok(clearWay(rock, a, r[0]) && clearWay(rock, r[0], b))
})

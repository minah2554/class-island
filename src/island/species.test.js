import test from 'node:test'
import assert from 'node:assert/strict'
import { ALL, KINDS, draw, imageOf, medianAttemptsToComplete, nameOf, tierOf } from './species.js'

test('도감은 100종이고 이름과 그림 경로가 있다', () => {
  assert.equal(ALL.length, 100)
  assert.equal(KINDS.fish.names.length, 50)
  assert.equal(KINDS.bug.names.length, 50)
  assert.equal(nameOf('fish_07'), '메기')
  assert.equal(nameOf('bug_50'), '황금풍뎅이')
  assert.equal(imageOf('bug_03'), 'assets/species/bug_03.webp')
})

test('번호가 클수록 희귀하다', () => {
  assert.deepEqual([1, 20, 21, 35, 36, 44, 45, 49, 50].map(tierOf), [0, 0, 1, 1, 2, 2, 3, 3, 4])
})

test('뽑기: 난수 0은 1번, 1에 가까우면 50번, 흔한 종이 훨씬 자주 나온다', () => {
  assert.equal(draw(0), 1)
  assert.equal(draw(0.999999), 50)
  let common = 0
  for (let i = 0; i < 1000; i++) if (draw(i / 1000) <= 20) common++
  assert.ok(common > 600)
})

test('난이도: 한 분야 완성까지 중앙값이 너무 빠르거나 느리지 않다', () => {
  const m = medianAttemptsToComplete()
  assert.ok(m > 1500 && m < 3500, `중앙값 ${m}`)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { phaseOf, toMin, weatherKind } from './sky.js'
import { isClassTime, kst } from '../clock.js'

test('시간대: 일출 6:30 일몰 18:00 기준', () => {
  const at = (hhmm) => phaseOf(toMin(hhmm), toMin('06:30'), toMin('18:00'))
  assert.deepEqual(['03:00', '06:10', '12:00', '17:10', '18:20', '21:00'].map(at), ['night', 'dawn', 'day', 'dusk', 'dusk', 'night'])
})

test('날씨 코드를 효과 종류로 바꾼다', () => {
  const k = (c) => weatherKind(c).kind
  assert.deepEqual([0, 3, 45, 61, 80, 73, 95, 999].map(k), ['clear', 'cloudy', 'fog', 'rain', 'rain', 'snow', 'storm', 'storm'])
})

test('한국 시간과 수업 시간(평일 9~16시)', () => {
  const mon = kst(new Date('2026-11-16T00:30:00Z')) // 월요일 09:30 KST
  assert.deepEqual([mon.ymd, mon.h, mon.dow], ['2026-11-16', 9, 1])
  assert.equal(isClassTime(mon), true)
  assert.equal(isClassTime(kst(new Date('2026-11-16T07:00:00Z'))), false) // 16:00
  assert.equal(isClassTime(kst(new Date('2026-11-14T00:30:00Z'))), false) // 토요일
})

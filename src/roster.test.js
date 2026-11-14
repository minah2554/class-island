import test from 'node:test'
import assert from 'node:assert/strict'
import { parseRoster } from './roster.js'

test('탭·쉼표·공백 구분과 머리글을 처리한다', () => {
  const { students, errors } = parseRoster('학번\t이름\n2101\t김하나\r\n2102, 이 둘\n\n2103 박셋')
  assert.deepEqual(students, [
    { no: '2101', name: '김하나' },
    { no: '2102', name: '이 둘' },
    { no: '2103', name: '박셋' },
  ])
  assert.equal(errors.length, 0)
})

test('잘못된 줄은 빼고 이유를 알려 준다', () => {
  const { students, errors } = parseRoster('210 김\n2101\n2102 가\n2102 나')
  assert.deepEqual(students, [{ no: '2102', name: '나' }])
  assert.equal(errors.length, 3)
})

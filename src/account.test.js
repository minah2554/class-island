import test from 'node:test'
import assert from 'node:assert/strict'
import { parseEmail, studentEmail } from './account.js'

test('학생 이메일을 만들고 다시 학년도·학번을 꺼낸다', () => {
  assert.deepEqual(parseEmail(studentEmail(2026, '2101', 3)), { year: 2026, no: '2101' })
  assert.equal(parseEmail('teacher@chongchong.example'), null)
  assert.equal(parseEmail(undefined), null)
})

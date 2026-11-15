import test from 'node:test'
import assert from 'node:assert/strict'
import { badWord } from './banned.js'

test('깨끗한 글은 통과', () => assert.equal(badWord('오늘 같이 놀자, 총총!'), null))
test('낱말을 잡는다', () => assert.equal(badWord('너 진짜 병신'), '병신'))
test('띄어쓰기·기호로 피해도 잡는다', () => assert.equal(badWord('시 - 발'), '시발'))
test('자음만 쓴 말도 잡는다', () => assert.equal(badWord('ㅅㅂ'), 'ㅅㅂ'))
test('섬주인이 추가한 낱말', () => assert.equal(badWord('바보야', ['바보']), '바보'))
test('빈 추가 낱말은 무시', () => assert.equal(badWord('안녕', ['', ' ']), null))

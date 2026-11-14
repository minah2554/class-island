import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { firebaseConfig } from './firebaseConfig'

export const configured = !!firebaseConfig.apiKey
const app = configured ? initializeApp(firebaseConfig) : null
export const auth = app && getAuth(app)
export const db = app && getFirestore(app)

export const TEACHER_EMAIL = 'teacher@chongchong.example'
// Firebase는 6자 이상만 받아서 짧은 비밀번호 뒤에 고정 문자열을 붙인다. 이 문자열은 비밀이 아니다.
export const pad = (pw) => pw + '#chongchong'

// 학년도: 1~2월은 전년도에 속한다.
export const schoolYear = (d = new Date()) => (d.getMonth() < 2 ? d.getFullYear() - 1 : d.getFullYear())

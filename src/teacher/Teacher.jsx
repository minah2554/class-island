import { useEffect, useState } from 'react'
import {
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import { TEACHER_EMAIL, auth, db, pad, schoolYear } from '../firebase'
import Roster from './Roster'

const teacherDoc = () => doc(db, 'config', 'teacher')

function message(e) {
  if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password') return '비밀번호가 틀렸습니다.'
  if (e.code === 'auth/operation-not-allowed')
    return 'Firebase 콘솔 → Authentication에서 "이메일/비밀번호" 로그인을 켜 주세요.'
  if (e.code === 'auth/too-many-requests') return '여러 번 틀려서 잠시 잠겼습니다. 조금 뒤에 다시 시도해 주세요.'
  return e.message
}

export default function Teacher() {
  const [state, setState] = useState('loading') // loading | setup | login | ok
  const [error, setError] = useState('')

  useEffect(
    () =>
      onAuthStateChanged(auth, async (user) => {
        try {
          const snap = await getDoc(teacherDoc())
          if (!snap.exists()) setState('setup')
          else setState(user?.uid === snap.data().uid ? 'ok' : 'login')
        } catch (e) {
          setError(message(e))
          setState('login')
        }
      }),
    [],
  )

  async function submit(e) {
    e.preventDefault()
    setError('')
    const form = new FormData(e.target)
    const pw = pad(form.get('pw'))
    try {
      // 교실 공용 PC에 로그인이 남지 않도록 탭을 닫으면 로그아웃된다.
      await setPersistence(auth, browserSessionPersistence)
      if (state === 'login') return void (await signInWithEmailAndPassword(auth, TEACHER_EMAIL, pw))
      if (form.get('pw') !== form.get('pw2')) return setError('두 비밀번호가 서로 다릅니다.')
      const { user } = await createUserWithEmailAndPassword(auth, TEACHER_EMAIL, pw).catch((err) => {
        // 계정만 만들어지고 등록이 끊긴 경우 이어서 진행
        if (err.code === 'auth/email-already-in-use') return signInWithEmailAndPassword(auth, TEACHER_EMAIL, pw)
        throw err
      })
      await setDoc(teacherDoc(), { uid: user.uid })
      setState('ok')
    } catch (err) {
      setError(message(err))
    }
  }

  if (state === 'loading') return <p className="card center">불러오는 중…</p>
  if (state === 'ok') return <Dashboard />
  return (
    <form className="card center narrow" onSubmit={submit}>
      <h1>총총섬 교사실</h1>
      {state === 'setup' && <p>처음 한 번, 교사 비밀번호를 정합니다.</p>}
      <label>
        비밀번호
        <input name="pw" type="password" required autoFocus autoComplete="off" />
      </label>
      {state === 'setup' && (
        <label>
          비밀번호 확인
          <input name="pw2" type="password" required autoComplete="off" />
        </label>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      <button>{state === 'setup' ? '교사 계정 만들기' : '들어가기'}</button>
    </form>
  )
}

function Dashboard() {
  const thisYear = schoolYear()
  const [year, setYear] = useState(thisYear)
  const [country, setCountry] = useState('')
  const years = Array.from({ length: Math.max(thisYear + 1, 2026) - 2025 }, (_, i) => 2026 + i)

  useEffect(
    () => onSnapshot(doc(db, 'years', String(year)), (snap) => setCountry(snap.data()?.countryName ?? '')),
    [year],
  )

  return (
    <main className="page">
      <header className="bar">
        <h1>총총섬 교사실</h1>
        <label>
          학년도
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        <label>
          나라 이름
          <input
            value={country}
            placeholder="우리 반 섬나라"
            onChange={(e) => setCountry(e.target.value)}
            onBlur={() => setDoc(doc(db, 'years', String(year)), { countryName: country.trim() }, { merge: true })}
          />
        </label>
        <button className="ghost" onClick={() => signOut(auth)}>
          로그아웃
        </button>
      </header>
      <Roster year={year} />
    </main>
  )
}

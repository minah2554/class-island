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
import { askText, tell } from '../popup'
import { useYears } from '../years'
import { Village } from '../island/Island'
import { useDocs, useStudents } from '../data'
import { mismatched } from '../records'
import RoomLinks from '../RoomLinks'
import Corrections from './Corrections'
import Reading from './Reading'
import Manage from './Manage'
import Report from './Report'
import Notices from './Notices'
import Post from './Post'
import Roster from './Roster'
import Tardy from './Tardy'
import Tickets from './Tickets'

const Letters = (p) => <Post {...p} only="letters" />
const Complaints = (p) => <Post {...p} only="complaints" />
// 메뉴 묶음: 학급 / 기록 / 소통 / 섬
const GROUPS = [
  ['학급', { 명단: Roster, 통계: Report }],
  ['기록', { 지각: Tardy, 청소면제권: Tickets, 독서기록장: Reading, 정정요청: Corrections }],
  ['소통', { 공지: Notices, 편지: Letters, 민원: Complaints }],
  ['섬', { 섬마을: Village, 설정: Manage }],
]
const TABS = Object.assign({}, ...GROUPS.map(([, t]) => t))

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
  const [slow, setSlow] = useState(false)

  // Firestore가 없으면 SDK가 오류 없이 계속 재시도하므로 오래 걸리면 안내한다.
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 8000)
    return () => clearTimeout(t)
  }, [])

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

  if (state === 'loading') return (
      <p className="card center">
        {slow ? '서버에 연결하지 못했습니다. 인터넷 연결과 Firebase 콘솔의 Firestore Database 생성 여부를 확인해 주세요.' : '불러오는 중…'}
      </p>
    )
  if (state === 'ok') return <Dashboard />
  return (
    <form className="card center narrow" onSubmit={submit}>
      <h1 className="title">선생님 방</h1>
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
      <RoomLinks />
    </form>
  )
}

function Dashboard() {
  const [year, setYear] = useState(schoolYear)
  const years = useYears()
  const [tab, setTab] = useState('명단')
  const [cfg, setCfg] = useState({})
  const save = (patch) => setDoc(doc(db, 'years', String(year)), patch, { merge: true })
  const students = useStudents(year)
  const Tab = TABS[tab]
  // 탭 이름 옆에 확인할 건수를 보여 준다
  const alerts = {
    청소면제권: useDocs(year, 'tickets').filter(mismatched).length,
    정정요청: useDocs(year, 'corrections').filter((c) => !c.done).length,
    민원: useDocs(year, 'complaints').filter((c) => !c.reply).length,
  }

  useEffect(
    () => onSnapshot(doc(db, 'years', String(year)), (snap) => {
        setCfg(snap.data() ?? {})
      }),
    [year],
  )

  return (
    <main className="page">
      <header className="bar">
        <h1 className="title">선생님 방</h1>
        <label>
          학년도
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        <button
          className="ghost"
          onClick={async () => {
            const typed = await askText('추가할 학년도를 숫자로 적어 주세요. 예: 2027')
            if (typed === null) return
            const y = Number(typed.trim())
            if (!Number.isInteger(y) || y < 2020 || y > 2100) return tell('2020~2100 사이의 학년도(숫자)를 적어 주세요.')
            await setDoc(doc(db, 'config', 'years'), { list: [...new Set([...years, y])] }, { merge: true })
            setYear(y)
          }}
        >
          학년도 추가
        </button>
        <RoomLinks />
        <button className="ghost" onClick={() => signOut(auth)}>
          로그아웃
        </button>
      </header>
      <nav className="menu" aria-label="선생님 메뉴">
        {GROUPS.map(([group, tabs]) => (
          <div key={group} className="menu-group">
            <small>{group}</small>
            {Object.keys(tabs).map((name) => (
              <button key={name} className={name === tab ? '' : 'ghost'} aria-pressed={name === tab} onClick={() => setTab(name)}>
                {name}
                {alerts[name] > 0 && <b className="count">{alerts[name]}</b>}
              </button>
            ))}
          </div>
        ))}
      </nav>
      {alerts.청소면제권 > 0 && (
        <p className="card alert" role="alert">
          청소면제권 기록이 담당 학생과 다른 학생이 {alerts.청소면제권}명 있습니다.{' '}
          <button onClick={() => setTab('청소면제권')}>확인하기</button>
        </p>
      )}
      {alerts.정정요청 > 0 && (
        <p className="card alert" role="alert">
          담당 학생의 정정 요청이 {alerts.정정요청}건 있습니다. <button onClick={() => setTab('정정요청')}>확인하기</button>
        </p>
      )}
      <Tab year={year} students={students} cfg={cfg} />
    </main>
  )
}

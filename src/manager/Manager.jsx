import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import { addDoc, doc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import StudentGate from '../StudentGate'
import { useStudents, yearCol } from '../data'
import { auth } from '../firebase'
import RoomLinks from '../RoomLinks'
import { ROLES } from '../roles'
import Reading from '../teacher/Reading'
import Tardy from '../teacher/Tardy'
import Tickets from '../teacher/Tickets'

const TABS = { tardy: Tardy, tickets: Tickets, reading: Reading }

export default function Manager() {
  return <StudentGate title="총총섬 담당자실">{(me) => <Room me={me} />}</StudentGate>
}

function Room({ me }) {
  const roles = Object.keys(ROLES).filter((r) => me.roles?.includes(r))
  const [saved, setSaved] = useState(undefined) // 저장된 담당자 비밀번호 문서
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [role, setRole] = useState(roles[0])
  const students = useStudents(me.year)
  const pinRef = doc(yearCol(me.year, 'managerPins'), me.no)

  useEffect(() => onSnapshot(pinRef, (s) => setSaved(s.data() ?? null)), [me.year, me.no])

  const out = (
    <button className="ghost" onClick={() => signOut(auth)}>
      로그아웃
    </button>
  )

  if (!roles.length)
    return (
      <main className="card center narrow">
        <h1>총총섬 담당자실</h1>
        <p>{me.name} 님은 맡은 1인 1역이 없어요.</p>
        {out}
      </main>
    )

  async function unlock(e) {
    e.preventDefault()
    setError('')
    const f = new FormData(e.target)
    if (saved) return f.get('pin') === saved.pin ? setOpen(true) : setError('담당자 비밀번호가 틀렸습니다.')
    if (f.get('pin') !== f.get('pin2')) return setError('두 비밀번호가 서로 다릅니다.')
    await setDoc(pinRef, { pin: f.get('pin') })
    setOpen(true)
  }

  if (saved === undefined) return <p className="card center">불러오는 중…</p>
  if (!open)
    return (
      <form className="card center narrow" onSubmit={unlock}>
        <h1>총총섬 담당자실</h1>
        <p>
          {me.name} · {roles.map((r) => ROLES[r]).join(', ')} 담당
        </p>
        <label>
          {saved ? '담당자 비밀번호' : '담당자 비밀번호 정하기 (숫자 4자리)'}
          <input name="pin" type="password" required inputMode="numeric" pattern="\d{4}" maxLength="4" autoFocus autoComplete="off" />
        </label>
        {!saved && (
          <label>
            한 번 더
            <input name="pin2" type="password" required inputMode="numeric" pattern="\d{4}" maxLength="4" autoComplete="off" />
          </label>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        <button>들어가기</button>
        {out}
      </form>
    )

  const Tab = TABS[role]
  return (
    <main className="page">
      <header className="bar">
        <h1>총총섬 담당자실</h1>
        <span>
          {me.name} · {me.year}학년도
        </span>
        <RoomLinks />
        {out}
      </header>
      <nav className="tabs">
        {roles.map((r) => (
          <button key={r} className={r === role ? '' : 'ghost'} aria-pressed={r === role} onClick={() => setRole(r)}>
            {ROLES[r]}
          </button>
        ))}
      </nav>
      <Tab year={me.year} students={students} me={me.no} />
      <Correction me={me} role={role} />
    </main>
  )
}

// 저장한 기록은 담당자가 고칠 수 없으므로 선생님께 메모를 보낸다.
function Correction({ me, role }) {
  const [sent, setSent] = useState(false)
  const [mine, setMine] = useState([])
  // 내가 보낸 요청과 선생님의 처리 결과
  useEffect(
    () =>
      onSnapshot(query(yearCol(me.year, 'corrections'), where('by', '==', me.no)), (s) =>
        setMine(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.at?.seconds ?? 0) - (a.at?.seconds ?? 0))),
      ),
    [me.year, me.no],
  )
  async function send(e) {
    e.preventDefault()
    const text = new FormData(e.target).get('text').trim()
    if (!text) return
    await addDoc(yearCol(me.year, 'corrections'), { role, text, by: me.no, byName: me.name, at: serverTimestamp() })
    e.target.reset()
    setSent(true)
  }
  return (
    <form className="card" onSubmit={send}>
      <h3>잘못 입력했나요? 선생님께 정정 요청</h3>
      <label>
        누구의 어떤 기록을 어떻게 고쳐야 하는지 적어 주세요
        <textarea name="text" rows="2" required placeholder="예: 3월 12일 5번 지각 아님, 잘못 눌렀어요" onChange={() => setSent(false)} />
      </label>
      <button>보내기</button>
      {sent && <span className="hint" role="status"> 선생님께 보냈어요.</span>}
      {mine.map((c) => (
        <p key={c.id} className={`memo ${c.done ? 'done' : ''}`}>
          <strong>{c.done ? '처리 완료' : '선생님 확인 중'}</strong> · {c.text}
          {c.reply && ` → 선생님: ${c.reply}`}
        </p>
      ))}
    </form>
  )
}

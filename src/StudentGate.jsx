import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { parseEmail } from './account'
import { auth, db, schoolYear } from './firebase'
import { useYears } from './years'
import RoomLinks from './RoomLinks'
import { cancel, enter, register } from './student'

// 학생 로그인을 통과해야 children(me)를 보여 준다. me = 학생 문서 + year
export default function StudentGate({ title, landing, children }) {
  const [user, setUser] = useState(undefined)
  const [me, setMe] = useState(null)

  useEffect(() => onAuthStateChanged(auth, setUser), [])
  const id = parseEmail(user?.email)
  useEffect(() => {
    setMe(null)
    if (!id) return
    return onSnapshot(
      doc(db, 'years', String(id.year), 'students', id.no),
      { includeMetadataChanges: true }, // 서버 반영이 끝났다는 알림도 받는다
      // 등록 직후에는 서버에 반영되기 전의 값이 먼저 온다. 그때 들여보내면 다음 화면의 읽기가 거부된다.
      (s) => s.metadata.hasPendingWrites || setMe(s.data() ?? null),
      () => setMe(null),
    )
  }, [user])

  if (user === undefined) return <p className="card center">불러오는 중…</p>
  if (id && me?.uid === user.uid) return children({ ...me, year: id.year })
  return <Login title={title} landing={landing} />
}

function Login({ title, landing }) {
  const years = useYears()
  const [started, setStarted] = useState(!landing) // 첫 화면은 그림과 [로그인하기]만 보여 준다
  const [step, setStep] = useState('form') // form | confirm(처음 온 학생의 비밀번호 확인)
  const [form, setForm] = useState({ year: schoolYear(), no: '', name: '', pin: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (step === 'form') {
        if ((await enter(form.year, form.no, form.name, form.pin)) === 'new') setStep('confirm')
      } else if (new FormData(e.target).get('pin2') === form.pin) {
        await register(form.year, form.no)
      } else {
        await cancel()
        setStep('form')
        setError('두 비밀번호가 서로 달라요. 처음부터 다시 입력해 주세요.')
      }
    } catch (err) {
      setError(err.code === 'auth/too-many-requests' ? '여러 번 틀려서 잠시 잠겼어요. 조금 뒤에 다시 해 주세요.' : err.message)
    }
    setBusy(false)
  }

  if (!started)
    return (
      <div className="landing">
        <img className="landing-bg" src="assets/scenes/title.webp" alt="" />
        <div className="landing-fx" aria-hidden="true">
          <i className="cloud" style={{ top: '8%', animationDuration: '60s' }} />
          <i className="cloud" style={{ top: '22%', animationDuration: '85s', animationDelay: '-30s', scale: '0.7' }} />
          <i className="cloud" style={{ top: '14%', animationDuration: '110s', animationDelay: '-70s', scale: '1.2' }} />
          <img className="plane" src="assets/ui/plane.webp" alt="" />
          <b className="glint" />
        </div>
        <h1 className="title">우리 반 섬나라</h1>
        <div className="landing-cta">
          <button onClick={() => setStarted(true)}>로그인하기</button>
          <RoomLinks />
        </div>
      </div>
    )

  return (
    <form className="card center narrow" onSubmit={submit}>
      <img className="login-banner" src="assets/scenes/title.webp" alt="" />
      {title && <h1 className="title">{title}</h1>}
      {step === 'form' ? (
        <>
          <label>
            학년도
            <select value={form.year} onChange={set('year')}>
              {years.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
          <label>
            학번
            <input value={form.no} onChange={set('no')} required inputMode="numeric" pattern="\d{4}" maxLength="4" />
          </label>
          <label>
            이름
            <input value={form.name} onChange={set('name')} required />
          </label>
          <label>
            비밀번호 (숫자 4자리 · 처음이면 지금 정하는 숫자가 내 비밀번호)
            <input value={form.pin} onChange={set('pin')} type="password" required inputMode="numeric" pattern="\d{4}" maxLength="4" autoComplete="off" />
          </label>
        </>
      ) : (
        <label>
          처음 오셨네요! 비밀번호를 한 번 더 입력해 주세요.
          <input name="pin2" type="password" required inputMode="numeric" pattern="\d{4}" maxLength="4" autoFocus autoComplete="off" />
        </label>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      <button disabled={busy}>{step === 'form' ? '들어가기' : '비밀번호 정하기'}</button>
      <RoomLinks />
    </form>
  )
}

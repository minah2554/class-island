import { useState } from 'react'
import { addDoc, serverTimestamp } from 'firebase/firestore'
import { useStudents, yearCol } from '../data'
import { tell } from '../popup'
import { badWord } from './banned'
import { useWhere, when } from './hooks'

// 우편함: 받은 편지 / 편지 쓰기 / 보낸 편지. 반장님께 쓰는 편지도 같은 방식이다.
export default function Mail({ me, settings, to: first }) {
  const [tab, setTab] = useState(first ? 'write' : 'in')
  const [to, setTo] = useState(first ?? '')
  const students = useStudents(me.year)
  const inbox = useWhere(me.year, 'letters', 'to', me.no)
  const sent = useWhere(me.year, 'letters', 'from', me.no)
  const president = students.find((s) => s.no === settings.president)

  async function send(e) {
    e.preventDefault()
    const text = new FormData(e.target).get('text').trim()
    const target = students.find((s) => s.no === to)
    if (!target) return tell('받는 사람을 골라 주세요.')
    if (!text) return tell('내용을 적어 주세요.')
    if (badWord(text, settings.banned)) return tell('나쁜 말이 들어 있어요. 고운 말로 다시 써 주세요, 총총!')
    await addDoc(yearCol(me.year, 'letters'), { from: me.no, fromName: me.name, to: target.no, toName: target.name, text, at: serverTimestamp() })
    e.target.reset()
    setTab('out')
    tell('편지를 보냈어요!')
  }

  const list = tab === 'in' ? inbox : sent
  return (
    <section>
      <h2>우편함</h2>
      <div className="tabs">
        {[['in', `받은 편지 ${inbox.length}`], ['write', '편지 쓰기'], ['out', '보낸 편지']].map(([k, label]) => (
          <button key={k} className={tab === k ? '' : 'ghost'} aria-pressed={tab === k} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'write' ? (
        <form className="card" onSubmit={send}>
          <label>
            받는 사람
            <select value={to} onChange={(e) => setTo(e.target.value)}>
              <option value="">고르기</option>
              {president && <option value={president.no}>반장 {president.name}에게</option>}
              {students
                .filter((s) => s.no !== me.no && s.no !== president?.no)
                .map((s) => (
                  <option key={s.no} value={s.no}>
                    {s.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            내용 (300자까지)
            <textarea name="text" maxLength="300" rows="5" required />
          </label>
          <button>보내기</button>
          <small>선생님도 편지를 볼 수 있어요. 따뜻한 말만 써요.</small>
        </form>
      ) : (
        <div className="stack">
          {list.map((l) => (
            <article key={l.id} className="card">
              <small>
                {when(l)} · {tab === 'in' ? `${l.fromName}에게서` : `${l.toName}에게`}
              </small>
              <p className="memo">{l.text}</p>
            </article>
          ))}
          {!list.length && <p className="card">편지가 없어요.</p>}
        </div>
      )}
    </section>
  )
}

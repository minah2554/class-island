import { deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { useDocs, yearCol } from '../data'
import { askText } from '../popup'
import { ROLES } from '../roles'

const when = (t) => (t ? new Date(t.seconds * 1000).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }) : '')

// 섬 관리인이 보낸 정정 요청. 해당 탭에서 직접 고친 뒤 [처리 완료]를 누르면 섬 관리인 화면에도 완료로 보인다.
export default function Corrections({ year }) {
  const list = useDocs(year, 'corrections').sort((a, b) => !!a.done - !!b.done || (a.at?.seconds ?? 0) - (b.at?.seconds ?? 0))
  const ref = (c) => doc(yearCol(year, 'corrections'), c.id)

  async function finish(c) {
    const reply = await askText(`${c.byName}에게 남길 말 (없으면 비워 두고 확인)`)
    if (reply !== null) updateDoc(ref(c), { done: true, reply: reply.trim(), doneAt: serverTimestamp() })
  }

  return (
    <section>
      <h2>{year}학년도 정정 요청함</h2>
      <p className="hint">요청을 읽고 해당 탭(지각·청소면제권·독서기록장)에서 직접 고친 다음 [처리 완료]를 누릅니다. 섬 관리인 화면에도 완료로 표시됩니다.</p>
      {list.length === 0 && <p className="card">들어온 정정 요청이 없습니다.</p>}
      {list.map((c) => (
        <div key={c.id} className={`card row ${c.done ? 'done' : ''}`}>
          <div style={{ flex: 1 }}>
            <strong>
              [{ROLES[c.role] ?? c.role}] {c.by} {c.byName}
            </strong>{' '}
            <small>{when(c.at)}</small>
            <p className="memo">{c.text}</p>
            {c.done && (
              <small>
                처리 완료 {when(c.doneAt)}
                {c.reply && ` — ${c.reply}`}
              </small>
            )}
          </div>
          {c.done ? (
            <button className="ghost" onClick={() => deleteDoc(ref(c))}>
              목록에서 지우기
            </button>
          ) : (
            <button onClick={() => finish(c)}>처리 완료</button>
          )}
        </div>
      ))}
    </section>
  )
}

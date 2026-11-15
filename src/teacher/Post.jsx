import { deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { useDocs, yearCol } from '../data'
import { ask } from '../popup'
import { short, dateOf } from '../records'

const newest = (a, b) => (b.at?.seconds ?? 9e9) - (a.at?.seconds ?? 9e9)
const when = (x) => (x.at ? short(dateOf(x)) : '방금')

// 학생들의 편지·방명록·민원. 선생님은 이름과 함께 모두 보고 지울 수 있다.
export default function Post({ year, only }) {
  const letters = useDocs(year, 'letters').sort(newest)
  const notes = useDocs(year, 'guestbook').sort(newest)
  const complaints = useDocs(year, 'complaints').sort(newest)
  const remove = async (col, id, what) => (await ask(`이 ${what}을(를) 지울까요? 되돌릴 수 없습니다.`)) && deleteDoc(doc(yearCol(year, col), id))
  const reply = (c) => (e) => updateDoc(doc(yearCol(year, 'complaints'), c.id), { reply: e.target.value.trim() })

  return (
    <section>
      {only !== 'letters' && (
        <>
      <h2>민원 ({complaints.filter((c) => !c.reply).length}건 답변 전)</h2>
      {complaints.map((c) => (
        <article key={c.id} className="card">
          <small>
            {when(c)} · {c.fromName} ({c.from})
          </small>
          <p className="memo">{c.text}</p>
          <label>
            답변 (입력 후 칸 밖을 누르면 저장)
            <input key={c.reply} defaultValue={c.reply ?? ''} onBlur={reply(c)} />
          </label>
          <button className="ghost" onClick={() => remove('complaints', c.id, '민원')}>
            지우기
          </button>
        </article>
      ))}
      {!complaints.length && <p>민원이 없습니다.</p>}
        </>
      )}
      {only !== 'complaints' && (
        <>

      <h2>편지 ({letters.length})</h2>
      <table className="sheet">
        <thead>
          <tr>
            <th>날짜</th>
            <th>보낸 사람</th>
            <th>받는 사람</th>
            <th>내용</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {letters.map((l) => (
            <tr key={l.id}>
              <td>{when(l)}</td>
              <td>{l.fromName}</td>
              <td>{l.toName}</td>
              <td className="left-text">{l.text}</td>
              <td>
                <button className="ghost" onClick={() => remove('letters', l.id, '편지')}>
                  지우기
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>방명록 ({notes.length})</h2>
      <table className="sheet">
        <tbody>
          {notes.map((n) => (
            <tr key={n.id}>
              <td>{when(n)}</td>
              <td>{n.fromName}</td>
              <td>{n.to}번 섬</td>
              <td className="left-text">{n.text}</td>
              <td>
                <button className="ghost" onClick={() => remove('guestbook', n.id, '방명록 글')}>
                  지우기
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
        </>
      )}
    </section>
  )
}

import { addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { useDocs, yearCol } from '../data'
import { ask } from '../popup'
import { dateOf, short } from '../records'

// 공지: 학생 섬의 게시판에 보인다
export default function Notices({ year }) {
  const list = useDocs(year, 'notices').sort((a, b) => (b.at?.seconds ?? 9e9) - (a.at?.seconds ?? 9e9))
  async function add(e) {
    e.preventDefault()
    const text = new FormData(e.target).get('text').trim()
    if (!text) return
    await addDoc(yearCol(year, 'notices'), { text, at: serverTimestamp() })
    e.target.reset()
  }
  return (
    <section>
      <h2>공지</h2>
      <form className="card" onSubmit={add}>
        <textarea name="text" rows="3" maxLength="500" required placeholder="학생 게시판에 올릴 공지" />
        <button>올리기</button>
      </form>
      {list.map((n) => (
        <article key={n.id} className="card">
          <small>{n.at ? short(dateOf(n)) : '방금'}</small>
          <p className="memo">{n.text}</p>
          <button className="ghost" onClick={async () => (await ask('이 공지를 지울까요?')) && deleteDoc(doc(yearCol(year, 'notices'), n.id))}>
            지우기
          </button>
        </article>
      ))}
    </section>
  )
}

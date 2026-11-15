import { addDoc, serverTimestamp } from 'firebase/firestore'
import { useDocs, yearCol } from '../data'
import { tell } from '../popup'
import { badWord } from './banned'
import { when } from './hooks'

// 친구 섬 방명록(반 모두가 읽을 수 있다). 지우는 것은 섬 관리자만 할 수 있다.
export default function Guestbook({ me, friend, settings }) {
  const notes = useDocs(me.year, 'guestbook')
    .filter((n) => n.to === friend.no)
    .sort((a, b) => (b.at?.seconds ?? 9e9) - (a.at?.seconds ?? 9e9))

  async function write(e) {
    e.preventDefault()
    const text = new FormData(e.target).get('text').trim()
    if (!text) return
    if (badWord(text, settings.banned)) return tell('나쁜 말이 들어 있어요. 고운 말로 다시 써 주세요, 총총!')
    await addDoc(yearCol(me.year, 'guestbook'), { to: friend.no, from: me.no, fromName: me.name, text, at: serverTimestamp() })
    e.target.reset()
  }

  return (
    <section className="card catch">
      <h3>{friend.islandName || friend.name} 방명록</h3>
      {!me.teacher && (
      <form className="row" onSubmit={write}>
        <input name="text" maxLength="100" placeholder="한마디 남기기 (100자)" required aria-label="방명록 글" style={{ flex: 1 }} />
        <button>남기기</button>
      </form>
      )}
      {notes.map((n) => (
        <p key={n.id} className="memo">
          <b>{n.fromName}</b> {n.text} <small>{when(n)}</small>
        </p>
      ))}
      {!notes.length && <small>첫 방명록을 남겨 보세요!</small>}
    </section>
  )
}

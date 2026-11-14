import { useDocs } from '../data'
import { when } from './hooks'

// 게시판: 선생님이 올린 공지
export default function Board({ me }) {
  const notices = useDocs(me.year, 'notices').sort((a, b) => (b.at?.seconds ?? 9e9) - (a.at?.seconds ?? 9e9))
  return (
    <section>
      <h2>게시판</h2>
      {notices.map((n) => (
        <article key={n.id} className="card">
          <small>{when(n)}</small>
          <p className="memo">{n.text}</p>
        </article>
      ))}
      {!notices.length && <p className="card">아직 공지가 없어요.</p>}
    </section>
  )
}

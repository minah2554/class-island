import { useDocs } from '../data'
import { when } from './hooks'

// 게시판: 선생님이 올린 공지
export default function Board({ me }) {
  const notices = useDocs(me.year, 'notices').sort((a, b) => (b.at?.seconds ?? 9e9) - (a.at?.seconds ?? 9e9))
  const tilt = (i) => [-2.2, 1.5, -0.8, 2.4, -1.6, 0.9][i % 6]
  return (
    <section>
      <h2>게시판</h2>
      <div className="corkboard">
        <img className="board-icon" src="assets/buildings/board.webp" alt="" />
        {notices.map((n, i) => (
          <article key={n.id} className={`note n${i % 4}`} style={{ rotate: `${tilt(i)}deg` }}>
            <i className="pin" aria-hidden="true" />
            <time>{when(n)}</time>
            <p>{n.text}</p>
          </article>
        ))}
        {!notices.length && <p className="note n0 empty">아직 붙은 공지가 없어요.</p>}
      </div>
    </section>
  )
}

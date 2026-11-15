import { useDocs } from '../data'
import { when } from './hooks'

// 게시판: 선생님이 올린 공지
const MEDAL = ['🥇', '🥈', '🥉']
const RANKS = [['tickets', '청소면제권 부자', '장'], ['reading', '독서기록장 성실왕', '일'], ['tardy', '지각 없는 친구', '번']]

export default function Board({ me, settings = {} }) {
  const ranks = settings.ranks
  const notices = useDocs(me.year, 'notices').sort((a, b) => (b.at?.seconds ?? 9e9) - (a.at?.seconds ?? 9e9))
  const tilt = (i) => [-2.2, 1.5, -0.8, 2.4, -1.6, 0.9][i % 6]
  return (
    <section>
      <h2>게시판</h2>
      {ranks && (
        <div className="corkboard ranks">
          {RANKS.map(([k, title, unit], i) => (
            <article key={k} className={`note n${(i + 1) % 4}`} style={{ rotate: `${tilt(i + 1)}deg` }}>
              <i className="pin" aria-hidden="true" />
              <time>우리 반 랭킹왕</time>
              <h3>{title}</h3>
              <ol>
                {(ranks[k] ?? []).map((r, j) => (
                  <li key={j}>
                    {MEDAL[r.rank - 1]} {r.names} <small>{r.v}{unit}</small>
                  </li>
                ))}
              </ol>
              {!(ranks[k] ?? []).length && <p>아직 기록이 없어요.</p>}
            </article>
          ))}
        </div>
      )}
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

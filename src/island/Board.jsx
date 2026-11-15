import { useDocs } from '../data'
import { when } from './hooks'

// 게시판: 섬주인이 올린 공지
const MEDAL = ['🥇', '🥈', '🥉']

export default function Board({ me, settings = {} }) {
  const ranks = settings.ranks
  const notices = useDocs(me.year, 'notices').sort((a, b) => (b.at?.seconds ?? 9e9) - (a.at?.seconds ?? 9e9))
  const tilt = (i) => [-2.2, 1.5, -0.8, 2.4, -1.6, 0.9][i % 6]
  // 순위 쪽지: [제목, 목록, 단위], 이름 쪽지: [제목, 이름들]
  const tops = ranks ? [['청소면제권 최다 소유자', ranks.tickets, '장'], ['독서기록장 연속 성실왕', ranks.streak, '달 연속'], ['지각이 많은 친구', ranks.tardyMost, '번']] : []
  const lists = ranks ? [[`${ranks.month ? `${ranks.month}월 ` : ''}독서기록장 성실왕`, ranks.readingNow], ['3월부터 지각이 한 번도 없는 친구', ranks.noTardy]] : []
  return (
    <section>
      <h2>게시판</h2>
      {ranks?.tickets && (
        <div className="corkboard ranks">
          {tops.map(([title, list = [], unit], i) => (
            <article key={title} className={`note n${(i + 1) % 4}`} style={{ rotate: `${tilt(i + 1)}deg` }}>
              <i className="pin" aria-hidden="true" />
              <time>우리 반 랭킹</time>
              <h3>{title}</h3>
              <ol>
                {list.map((r, j) => (
                  <li key={j}>
                    {MEDAL[r.rank - 1]} {r.names} <small>{r.v}{unit}</small>
                  </li>
                ))}
              </ol>
              {!list.length && <p>아직 기록이 없어요.</p>}
            </article>
          ))}
          {lists.map(([title, names = []], i) => (
            <article key={title} className={`note n${i % 4}`} style={{ rotate: `${tilt(i + 4)}deg` }}>
              <i className="pin" aria-hidden="true" />
              <time>우리 반 랭킹 · {names.length}명</time>
              <h3>{title}</h3>
              <p>{names.join(', ') || '아직 없어요.'}</p>
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

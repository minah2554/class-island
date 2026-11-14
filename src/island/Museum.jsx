import { useMemo, useState } from 'react'
import { short } from '../records'
import Scene from './Scene'
import { ALL, KINDS, TIERS, imageOf, nameOf, tierOf } from './species'

const ymdOf = (t) => (t ? new Date(t * 1000).toISOString().slice(0, 10) : '')

function Detail({ id, who, me, onClose }) {
  const n = Number(id.slice(-2))
  return (
    <dialog className="popup detail" ref={(d) => d && !d.open && d.showModal()} onClose={onClose}>
      <form method="dialog">
        <img src={imageOf(id)} alt="" className={who.length ? '' : 'shadow'} />
        <h3>{who.length ? nameOf(id) : '???'}</h3>
        <p>
          <span className="chip">{TIERS[tierOf(n)].label}</span> No.{String(n).padStart(2, '0')}
        </p>
        {who.length ? (
          <>
            <p>
              처음 잡은 친구: <b>{who[0].name}</b> <small>{short(ymdOf(who[0].first))}</small>
            </p>
            <p className="chips">
              {who.map((w) => (
                <span key={w.no} className={`chip ${w.no === me.no ? 'mine' : ''}`}>
                  {w.name} ×{w.n}
                </span>
              ))}
            </p>
          </>
        ) : (
          <p>아직 아무도 잡지 못했어요.</p>
        )}
        <button>닫기</button>
      </form>
    </dialog>
  )
}

// 반 공동 도감. cols: years/{year}/collections 문서들 (학번이 id)
// 전시장 바닥에서 종마다 정해진 자리(%). 물고기 50은 위쪽 5줄, 곤충 50은 아래쪽 5줄.
const place = (id) => {
  const n = Number(id.slice(-2)) - 1
  const row = Math.floor(n / 10) + (id[0] === 'b' ? 5 : 0)
  const j = (k) => ((n * 37 + k * 11) % 10) / 10 - 0.5
  return { x: 11 + (n % 10) * 8.6 + j(1) * 3, y: 40 + row * 5.6 + j(2) * 2, d: 3.5 + ((n * 7) % 5) * 0.8, a: 0.6 + ((n * 3) % 4) * 0.25 }
}

export default function Museum({ me, cols, settings, scene }) {
  const [dex, setDex] = useState(false)
  const [tab, setTab] = useState('fish')
  const [open, setOpen] = useState(null)

  // 종마다 잡은 친구 목록(먼저 잡은 순서)
  const by = useMemo(() => {
    const m = Object.fromEntries(ALL.map((id) => [id, []]))
    cols.forEach((c) => Object.entries(c.items ?? {}).forEach(([id, v]) => m[id]?.push({ no: c.id, name: c.name, n: v.n, first: v.first?.seconds ?? Infinity })))
    Object.values(m).forEach((l) => l.sort((a, b) => a.first - b.first))
    return m
  }, [cols])

  const count = (kind) => Object.keys(KINDS[kind].names).filter((i) => by[`${kind}_${String(Number(i) + 1).padStart(2, '0')}`].length).length
  const found = ALL.filter((id) => by[id].length).length
  const rank = cols
    .map((c) => ({ no: c.id, name: c.name, kinds: Object.keys(c.items ?? {}).length, total: Object.values(c.items ?? {}).reduce((s, v) => s + v.n, 0) }))
    .filter((r) => r.total)
    .sort((a, b) => b.kinds - a.kinds || b.total - a.total)

  return (
    <section>
      <div className="museum-head">
        <div>
          <h2>반 도감 박물관</h2>
          <p>
            <small>우리 반이 잡은 물고기와 곤충이 살아 움직이는 모습으로 전시돼요. 누르면 누가 처음 잡았는지 알 수 있어요.</small>
          </p>
          <p>
            전체 <b>{found}</b>/100 · 물고기 {count('fish')}/50 · 곤충 {count('bug')}/50
          </p>
          <div className="meter" role="img" aria-label={`도감 ${found}종 완성`}>
            <span className="left" style={{ width: `${found}%` }} />
          </div>
        </div>
      </div>
      {found === 100 && (
        <p className="card reward" role="status">
          도감 완성! 축하해요 🎉 {settings.reward && <b>{settings.reward}</b>}
        </p>
      )}
      {scene && (
        <Scene {...scene} spots={[]}>
          {ALL.filter((id) => by[id].length).map((id) => {
            const p = place(id)
            return (
              <button key={id} className={`exhibit ${id[0] === 'f' ? 'fish' : 'bug'}`} style={{ left: `${p.x}%`, top: `${p.y}%`, zIndex: Math.round(p.y), '--d': `${p.d}s`, '--a': p.a }} onClick={() => setOpen(id)} aria-label={nameOf(id)} title={nameOf(id)}>
                <img src={imageOf(id)} alt="" draggable="false" />
              </button>
            )
          })}
          {!found && <p className="empty-note">아직 전시된 친구가 없어요. 바다와 숲에서 잡아 보세요!</p>}
        </Scene>
      )}
      <p>
        <button className="ghost" aria-expanded={dex} onClick={() => setDex(!dex)}>
          {dex ? '도감 닫기' : '도감 보기'}
        </button>
      </p>
      {dex && (
        <>
      <div className="tabs">
        {[['fish', '물고기'], ['bug', '곤충'], ['rank', '랭킹']].map(([k, label]) => (
          <button key={k} className={tab === k ? '' : 'ghost'} aria-pressed={tab === k} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'rank' ? (
        <table className="sheet">
          <thead>
            <tr>
              <th>순위</th>
              <th>이름</th>
              <th>잡은 종류</th>
              <th>잡은 횟수</th>
            </tr>
          </thead>
          <tbody>
            {rank.map((r, i) => (
              <tr key={r.no} className={r.no === me.no ? 'sel' : ''}>
                <td>{i + 1}</td>
                <td>{r.name}</td>
                <td>{r.kinds}</td>
                <td>{r.total}</td>
              </tr>
            ))}
            {!rank.length && (
              <tr>
                <td colSpan="4">아직 잡은 친구가 없어요.</td>
              </tr>
            )}
          </tbody>
        </table>
      ) : (
        <div className="dex">
          {KINDS[tab].names.map((name, i) => {
            const id = `${tab}_${String(i + 1).padStart(2, '0')}`
            const who = by[id]
            const mine = who.some((w) => w.no === me.no)
            return (
              <button key={id} className={`dex-card ${who.length ? '' : 'unknown'} ${mine ? 'mine' : ''}`} onClick={() => setOpen(id)}>
                <img src={imageOf(id)} alt="" loading="lazy" className={who.length ? '' : 'shadow'} />
                <span>{who.length ? name : '???'}</span>
                <small>{who.length ? `${who[0].name}${who.length > 1 ? ` 외 ${who.length - 1}` : ''}` : `No.${String(i + 1).padStart(2, '0')}`}</small>
              </button>
            )
          })}
        </div>
      )}
        </>
      )}
      {open && <Detail id={open} who={by[open]} me={me} onClose={() => setOpen(null)} />}
    </section>
  )
}

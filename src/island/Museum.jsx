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

// 곤충 전시 칸(%): 그림 속 유리 진열장 7개와 벽 액자 5개. 그림에 맞춘 좌표다.
const SLOTS = [
  { x: 32, y: 21, w: 7, glass: 1 }, { x: 50, y: 21, w: 8, glass: 1 }, { x: 68, y: 21, w: 7, glass: 1 },
  { x: 14, y: 41, w: 6, glass: 1 }, { x: 7, y: 58, w: 6, glass: 1 }, { x: 87, y: 38, w: 6, glass: 1 }, { x: 94, y: 57, w: 6, glass: 1 },
  { x: 32, y: 9, w: 6 }, { x: 50, y: 8, w: 8 }, { x: 68, y: 9, w: 6 }, { x: 5, y: 26, w: 5 }, { x: 92, y: 22, w: 6 },
]
// 수족관 안 물고기 자리(수족관 크기에 대한 %)
const TANK = [[12, 30], [32, 22], [52, 34], [72, 24], [90, 36], [20, 68], [41, 74], [61, 66], [80, 76], [50, 52]]

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
  // 전시 칸에는 잡은 것 중 희귀한 친구부터 놓인다(100종을 다 놓을 수는 없다)
  const rarest = (kind, n) =>
    ALL.filter((id) => id.startsWith(kind) && by[id].length)
      .sort((x, y) => tierOf(Number(y.slice(-2))) - tierOf(Number(x.slice(-2))) || Number(y.slice(-2)) - Number(x.slice(-2)))
      .slice(0, n)
  const bugs = rarest('bug', SLOTS.length)
  const fish = rarest('fish', TANK.length)
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
            <small>우리 반이 잡은 곤충은 유리 진열장에, 물고기는 수족관에 전시돼요. 많이 잡을수록 박물관이 채워지고, 희귀한 친구부터 놓여요. 누르면 누가 처음 잡았는지 알 수 있어요.</small>
          </p>
        </div>
      </div>
      {found === 100 && (
        <p className="card reward" role="status">
          도감 완성! 축하해요 🎉 {settings.reward && <b>{settings.reward}</b>}
        </p>
      )}
      <div className="museum-view">
        {scene && (
          <Scene {...scene} indoor scale={1.5} spots={[]} blocks={[{ x: 50, y: 74, rx: 25, ry: 10 }]}>
            {bugs.map((id, i) => (
              <button key={id} className={`exhibit ${SLOTS[i].glass ? 'case' : ''}`} style={{ left: `${SLOTS[i].x}%`, top: `${SLOTS[i].y}%`, width: `${SLOTS[i].w}%`, zIndex: Math.round(SLOTS[i].y) }} onClick={() => setOpen(id)} aria-label={nameOf(id)} title={nameOf(id)}>
                <img src={imageOf(id)} alt="" draggable="false" />
              </button>
            ))}
            <div className="aqua" aria-label="수족관">
              <img src="assets/scenes/aquarium.webp" alt="" draggable="false" />
              <div className="water">
                {fish.map((id, i) => (
                  <button key={id} className="fish-ex" style={{ left: `${TANK[i][0]}%`, top: `${TANK[i][1]}%` }} onClick={() => setOpen(id)} aria-label={nameOf(id)} title={nameOf(id)}>
                    <img src={imageOf(id)} alt="" draggable="false" />
                  </button>
                ))}
              </div>
            </div>
            {!found && <p className="empty-note">아직 전시된 친구가 없어요. 바다와 숲에서 잡아 보세요!</p>}
          </Scene>
        )}
        <aside className="card museum-side">
          <h3>박물관 채우기</h3>
          <p>
            곤충 채집 완성도 <b>{count('bug')}</b>/50
          </p>
          <div className="meter" role="img" aria-label={`곤충 ${count('bug')}종`}>
            <span className="left" style={{ width: `${count('bug') * 2}%` }} />
          </div>
          <p>
            수족관 완성률 <b>{count('fish')}</b>/50
          </p>
          <div className="meter" role="img" aria-label={`물고기 ${count('fish')}종`}>
            <span className="left" style={{ width: `${count('fish') * 2}%` }} />
          </div>
          <p>
            전체 도감 <b>{found}</b>/100
          </p>
          <div className="meter" role="img" aria-label={`도감 ${found}종 완성`}>
            <span className="left" style={{ width: `${found}%` }} />
          </div>
          <small>진열장 {bugs.length}/{SLOTS.length}칸 · 수족관 {fish.length}/{TANK.length}마리</small>
        </aside>
      </div>
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

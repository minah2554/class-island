import { useDoc, useWhere } from './hooks'
import { short } from '../records'

// 내 집: 내 지각·청소면제권·독서기록장을 볼 수 있다(남의 기록은 규칙상 볼 수 없다)
export default function Home({ me }) {
  const tardies = useWhere(me.year, 'tardies', 'no', me.no)
  const penalties = useWhere(me.year, 'penalties', 'no', me.no)
  const logs = useWhere(me.year, 'ticketLog', 'no', me.no)
  const ticket = useDoc(me.year, 'tickets', me.no)
  const stats = useDoc(me.year, 'stats', me.no)

  const dates = tardies.map((t) => t.date).filter(Boolean).sort()
  const paid = penalties.filter((p) => p.kind === 'ticket').length
  const clean5 = penalties.filter((p) => p.kind === 'clean5').length
  const v = ticket?.t ?? ticket?.m ?? { got: 0, used: 0 } // 선생님 확인 값이 있으면 그것을 보여 준다
  const got = v.got ?? 0
  const used = (v.used ?? 0) + paid
  const left = Math.max(0, got - used)
  const given = logs.filter((l) => l.by === 'teacher' && (l.type === 'give' || l.type === 'use' || l.type === 'take'))

  // 독서기록: { '2026-03-05': 'o'|'x'|사유 } → 달별로 묶는다
  const months = {}
  Object.entries(stats?.reading ?? {}).forEach(([d, val]) => (months[d.slice(0, 7)] ||= []).push([d, val]))

  return (
    <section>
      <div className="museum-head">
        <img src="assets/scenes/house.webp" alt="" />
        <div>
          <h2>{me.islandName ? `${me.islandName}의 집` : '내 집'}</h2>
          <p>
            {me.no} {me.name}
          </p>
        </div>
      </div>

      <div className="card">
        <h3>청소면제권</h3>
        <p>
          받은 <b>{got}</b>장 · 사용 <b>{used}</b>장 · 남은 <b>{left}</b>장
        </p>
        <div className="meter" role="img" aria-label={`남은 면제권 ${left}장`}>
          <span className="left" style={{ width: `${got ? (left / got) * 100 : 0}%` }} />
        </div>
        <p className="chips">
          {given.map((l) => (
            <span key={l.id} className="chip">
              {short(l.date)} {l.type === 'give' ? `+${l.n}` : l.type === 'take' ? `−${l.n}` : `${l.n}장 사용`}
              {l.reason ? ` (${l.reason})` : ''}
            </span>
          ))}
          {penalties
            .filter((p) => p.kind === 'ticket')
            .map((p) => (
              <span key={p.id} className="chip">
                {short(p.date)} 지각 반납 1장
              </span>
            ))}
          {!given.length && !paid && <small>아직 내역이 없어요.</small>}
        </p>
        {ticket && !ticket.t && ticket.m && <small>선생님 확인 전의 숫자예요.</small>}
      </div>

      <div className="card">
        <h3>지각</h3>
        <p>
          올해 <b>{dates.length}</b>번 · 3번째마다 청소면제권 1장 제출 (지금까지 {paid}장 제출{clean5 ? `, 청소 5번 ${clean5}건` : ''})
        </p>
        <p className="chips">
          {dates.map((d, i) => (
            <span key={d + i} className={`chip ${(i + 1) % 3 === 0 ? 'mine' : ''}`}>
              {i + 1}회 {short(d)}
            </span>
          ))}
          {!dates.length && <small>지각이 없어요. 멋져요, 총총!</small>}
        </p>
        <small>다음 제출까지 {3 - (dates.length % 3)}번 남았어요.</small>
      </div>

      <div className="card">
        <h3>독서기록장</h3>
        {Object.keys(months)
          .sort()
          .map((m) => {
            const list = months[m].sort()
            const o = list.filter(([, x]) => x === 'o').length
            const miss = list.filter(([, x]) => x === 'x').map(([d]) => short(d))
            const other = list.filter(([, x]) => x !== 'o' && x !== 'x' && x)
            return (
              <p key={m}>
                <b>{Number(m.slice(5))}월</b> 제출 {o}일
                {miss.length > 0 && ` · 안 낸 날 ${miss.join(', ')}`}
                {other.length > 0 && ` · ${other.map(([d, x]) => `${short(d)} ${x}`).join(', ')}`}
              </p>
            )
          })}
        {!Object.keys(months).length && <small>아직 기록이 없어요.</small>}
      </div>
    </section>
  )
}

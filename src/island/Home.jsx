import { useDoc, useWhere } from './hooks'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { tell } from '../popup'
import { badWord } from './banned'
import { short } from '../records'
import { giftParts } from './gifts'

// 내 집: 내 지각·청소면제권·독서기록장을 볼 수 있다(남의 기록은 규칙상 볼 수 없다)
export default function Home({ me, settings = {} }) {
  const tardies = useWhere(me.year, 'tardies', 'no', me.no)
  const penalties = useWhere(me.year, 'penalties', 'no', me.no)
  const logs = useWhere(me.year, 'ticketLog', 'no', me.no)
  const ticket = useDoc(me.year, 'tickets', me.no)
  const stats = useDoc(me.year, 'stats', me.no)
  const gp = giftParts(useDoc(me.year, 'gifts', me.no))

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

  // 내 캐릭터를 누르면 나오는 말풍선을 고친다
  async function saveGreeting(e) {
    e.preventDefault()
    const greeting = new FormData(e.target).get('greeting').trim()
    if (badWord(greeting, settings.banned)) return tell('나쁜 말이 들어 있어요. 고운 말로 다시 써 주세요, 총총!')
    await updateDoc(doc(db, 'years', String(me.year), 'students', me.no), { greeting })
    tell(greeting ? '말풍선을 바꿨어요!' : '말풍선을 처음 인사말로 되돌렸어요.')
  }

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

      <form className="card" onSubmit={saveGreeting}>
        <h3>내 말풍선</h3>
        <p>
          <small>내 캐릭터를 누르면 나오는 말이에요. 친구가 내 섬에 놀러 와도 보여요. (30자까지)</small>
        </p>
        <div className="row">
          <input name="greeting" maxLength="30" defaultValue={me.greeting ?? ''} placeholder={`안녕! ${me.catchphrase ?? ''}`} aria-label="내 말풍선" style={{ flex: 1 }} />
          <button>바꾸기</button>
        </div>
      </form>

      <div className="card">
        <h3>내 섬 선물 {gp.perfect + gp.book + gp.tickets + gp.bonus}개</h3>
        <p>선물 1개마다 내 섬에 낮 아이템 1개와 밤 조명 1개가 생겨요.</p>
        <p className="chips">
          <span className="chip">한 달 독서 모두 제출 {gp.perfect}</span>
          <span className="chip">월말 기록장 제출 {gp.book}</span>
          <span className="chip">청소면제권 5장마다 {gp.tickets}</span>
          <span className="chip">선생님 선물 {gp.bonus}</span>
        </p>
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

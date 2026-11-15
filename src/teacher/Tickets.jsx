import { useState } from 'react'
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { utils, writeFile } from 'xlsx'
import { db } from '../firebase'
import { useDocs, yearCol } from '../data'
import { ask, tell } from '../popup'
import { applyTickets, dateOf, mismatched, short, ymd } from '../records'

const KIND = { give: '배부', take: '삭제(회수)', use: '사용', late: '지각 반납', edit: '수정', confirm: '확정' }

// 받은 개수 전체를 막대로, 그중 사용한 만큼을 다른 색으로 보여 준다. 반에서 가장 많이 받은 학생이 막대 끝.
function Meter({ got, used, max }) {
  const left = got - used
  return (
    <div className="status">
      <div className="meter" role="img" aria-label={`받음 ${got}, 사용 ${used}, 남음 ${left}`}>
        <span className="used" style={{ width: `${(used / max) * 100}%` }} />
        <span className="left" style={{ width: `${(left / max) * 100}%` }} />
      </div>
      <div>
        <b className="big">{left}</b>장 남음 <small>받음 {got} · 사용 {used}</small>
      </div>
    </div>
  )
}

// 장부는 두 개: 담당 학생(m)과 섬주인(t). me가 있으면 담당 학생 화면이라 m에만 쓰고, 저장한 뒤에는 못 고친다.
export default function Tickets({ year, students, me }) {
  const tickets = useDocs(year, 'tickets')
  const penalties = useDocs(year, 'penalties')
  const logs = useDocs(year, 'ticketLog')
  const [picked, setPicked] = useState(new Set())
  const [n, setN] = useState(1)
  const [date, setDate] = useState(ymd)
  const [reason, setReason] = useState('')
  const [openNo, setOpenNo] = useState(null) // 날짜별 내역을 펼쳐 볼 학생
  const side = me ? 'm' : 't'
  const by = me ?? 'teacher'

  const row = (no) => tickets.find((t) => t.id === no) ?? {}
  // 지각 3회로 반납한 기록. 두 장부의 사용 개수에 똑같이 더해 보여 준다.
  const late = (no) => penalties.filter((p) => p.no === no && p.kind === 'ticket')
  const paid = (no) => late(no).length
  // 화면에 보이는 값(사용 = 장부 사용 + 지각 반납)
  const view = (no, k = side) => {
    const v = row(no)[k] ?? { got: 0, used: 0 }
    return { got: v.got ?? 0, used: (v.used ?? 0) + paid(no) }
  }
  const max = Math.max(1, ...students.map((s) => view(s.no).got))

  // 이 장부의 날짜별 내역: 내 쪽에서 입력한 것 + 확정 + 지각 반납
  const history = (no) =>
    [
      ...logs.filter((l) => l.no === no && (l.type === 'confirm' || (l.by === 'teacher') === !me)),
      ...late(no).map((p) => ({ ...p, type: 'late', n: 1 })),
    ]
      .map((l) => ({ ...l, date: dateOf(l) }))
      .sort((a, b) => a.date.localeCompare(b.date))
  const text = (l, col) => {
    const d = short(l.date)
    const why = l.reason ? ` (${l.reason})` : ''
    if (l.type === 'give') return `${d} +${l.n}${why}`
    if (l.type === 'take') return `${d} −${l.n} 회수${why}`
    if (l.type === 'use') return `${d} ${l.n}장${why}`
    if (l.type === 'late') return `${d} 지각 반납 1장`
    if (l.type === 'confirm') return `${d} 확정 ${(col === 'got' ? l.got : l.used) ?? ''}장`
    return `${d} ${l.n}장으로 수정`
  }
  // 받은 쪽 내역인지 사용 쪽 내역인지
  const isGot = (l) => l.type === 'give' || l.type === 'take' || l.type === 'confirm' || l.field === 'got'
  const isUsed = (l) => l.type === 'use' || l.type === 'late' || l.type === 'confirm' || l.field === 'used'

  const toggle = (no) => setPicked((p) => (p.has(no) ? new Set([...p].filter((x) => x !== no)) : new Set(p).add(no)))
  const all = students.length > 0 && picked.size === students.length

  // changes: [{ no, next }] — next는 화면 값이라 저장할 때 지각 반납분을 뺀다.
  async function write(changes, log, sides = [side]) {
    const batch = writeBatch(db)
    changes.forEach(({ no, next }) => {
      const stored = { got: next.got, used: next.used - paid(no) }
      batch.set(doc(yearCol(year, 'tickets'), no), Object.fromEntries(sides.map((k) => [k, stored])), { merge: true })
      batch.set(doc(yearCol(year, 'gifts'), no), { got: next.got }, { merge: true })
      batch.set(doc(yearCol(year, 'ticketLog')), { no, date: ymd(), ...log, by, at: serverTimestamp() })
    })
    await batch.commit()
  }

  async function bulk(type) {
    if (!date) return tell('날짜를 골라 주세요.')
    const results = students.filter((s) => picked.has(s.no)).map((s) => ({ s, ...applyTickets(view(s.no), type, n) }))
    const bad = results.filter((r) => r.error)
    // 한 명이라도 안 되면 아무도 바꾸지 않는다
    if (bad.length) return tell('처리할 수 없습니다.\n' + bad.map((r) => `${r.s.name}: ${r.error}`).join('\n'))
    if (me && !(await ask(`${short(date)} — ${results.length}명에게 ${n}장 ${KIND[type]}.\n저장한 뒤에는 고칠 수 없습니다. 저장할까요?`))) return
    await write(results.map((r) => ({ no: r.s.no, next: r.next })), { type, n, date, reason })
    setPicked(new Set())
  }

  // 숫자 직접 수정 (섬주인만)
  function edit(s, field, input) {
    const value = Number(input.value)
    const cur = view(s.no)
    const next = { ...cur, [field]: value }
    if (!Number.isInteger(value) || value < 0 || next.used > next.got || next.used < paid(s.no)) {
      tell(`${s.name}: 사용 개수는 받은 개수(${next.got}장)를 넘을 수 없고, 지각으로 반납한 ${paid(s.no)}장보다 적을 수 없습니다.`)
      return (input.value = cur[field])
    }
    if (value !== cur[field]) write([{ no: s.no, next }], { type: 'edit', field, n: value })
  }

  // 불일치 확정: 고른 값으로 두 장부를 맞춘다.
  async function settle(s, k) {
    const v = view(s.no, k)
    if (await ask(`${s.name}의 청소면제권을 ${k === 'm' ? '담당자' : '섬주인'} 값(받음 ${v.got} · 사용 ${v.used})으로 확정할까요?`))
      write([{ no: s.no, next: v }], { type: 'confirm', got: v.got, used: v.used }, ['m', 't'])
  }

  function download() {
    const num = (s) => Number(s.no.slice(2))
    const summary = students.map((s) => {
      const t = view(s.no)
      const h = history(s.no)
      return [num(s), s.no, s.name, t.got, t.used, t.got - t.used, h.filter(isGot).map((l) => text(l, 'got')).join(', '), h.filter(isUsed).map((l) => text(l, 'used')).join(', ')]
    })
    const detail = students.flatMap((s) =>
      history(s.no).map((l) => [l.date, num(s), s.no, s.name, KIND[l.type], l.n ?? '', l.reason ?? '', l.by === 'teacher' ? '섬주인' : l.by]),
    )
    const book = utils.book_new()
    utils.book_append_sheet(book, utils.aoa_to_sheet([['번호', '학번', '이름', '받음', '사용', '남음', '배부 내역', '사용 내역'], ...summary]), '현황')
    utils.book_append_sheet(book, utils.aoa_to_sheet([['날짜', '번호', '학번', '이름', '구분', '개수', '사유', '입력'], ...detail.sort((a, b) => a[0].localeCompare(b[0]))]), '날짜별 내역')
    writeFile(book, `섬마을_청소면제권_${year}.xlsx`)
  }


  return (
    <section>
      <h2>{year}학년도 청소면제권</h2>
      <div className="card row">
        <label>
          날짜
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          개수
          <input type="number" min="1" value={n} onChange={(e) => setN(Math.max(1, Number(e.target.value) || 1))} style={{ width: '5em' }} />
        </label>
        <label>
          사유
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예: 3월 모범" />
        </label>
        <button disabled={!picked.size} onClick={() => bulk('give')}>
          일괄 배부
        </button>
        <button disabled={!picked.size} onClick={() => bulk('use')}>
          일괄 반납(사용)
        </button>
        <button className="ghost danger" disabled={!picked.size} onClick={() => bulk('take')}>
          일괄 삭제(회수)
        </button>
        <span className="hint">{picked.size}명 선택</span>
        <button className="ghost" onClick={download}>
          엑셀 다운로드
        </button>
      </div>
      {me && <p className="hint">저장한 기록은 고칠 수 없으니 잘못 입력했으면 아래 정정 요청으로 섬주인께 알려 주세요.</p>}
      <div className="scroll">
        <table className="sheet tickets">
          <thead>
            <tr>
              <th>
                <label className="check">
                  <input type="checkbox" checked={all} onChange={() => setPicked(all ? new Set() : new Set(students.map((s) => s.no)))} />
                  전체
                </label>
              </th>
              <th>번호</th>
              <th>이름</th>
              <th>현황</th>
              {!me && <th>받음</th>}
              {!me && <th>사용</th>}
              {!me && <th>담당자 기록</th>}
              {!me && <th>이중 체크</th>}
              <th>날짜별 내역</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const t = view(s.no)
              const r = row(s.no)
              const m = view(s.no, 'm')
              const h = history(s.no)
              return (
                <tr key={s.no} className={!me && mismatched(r) ? 'bad' : ''}>
                  <td>
                    <input type="checkbox" checked={picked.has(s.no)} onChange={() => toggle(s.no)} aria-label={`${s.name} 선택`} />
                  </td>
                  <td>{Number(s.no.slice(2))}</td>
                  <td>{s.name}</td>
                  <td>
                    <Meter got={t.got} used={t.used} max={max} />
                  </td>
                  {!me &&
                    ['got', 'used'].map((f) => (
                      <td key={f}>
                        <input
                          key={t[f]}
                          type="number"
                          min="0"
                          defaultValue={t[f]}
                          className="num"
                          aria-label={`${s.name} ${f === 'got' ? '받은' : '사용'} 개수`}
                          onBlur={(e) => edit(s, f, e.target)}
                        />
                      </td>
                    ))}
                  {!me && <td>{r.m ? `받음 ${m.got} · 사용 ${m.used}` : '-'}</td>}
                  {!me && (
                    <td>
                      {mismatched(r) ? (
                        <>
                          <span className="warn">불일치 </span>
                          <button onClick={() => settle(s, 'm')}>담당자 값으로</button>
                          <button onClick={() => settle(s, 't')}>섬주인 값으로</button>
                        </>
                      ) : r.m && r.t ? (
                        '일치'
                      ) : r.m ? (
                        '담당자만 입력'
                      ) : (
                        '-'
                      )}
                    </td>
                  )}
                  <td>
                    <button className="ghost" onClick={() => setOpenNo(s.no)} disabled={!h.length}>
                      내역 {h.length}건
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {openNo && <History student={students.find((s) => s.no === openNo)} list={history(openNo)} onClose={() => setOpenNo(null)} />}
    </section>
  )
}

// 한 학생의 날짜별 내역: 최근 날짜가 위, 달마다 묶는다(1년이 쌓여도 표가 늘어나지 않는다)
function History({ student, list, onClose }) {
  const label = (l) => {
    if (l.type === 'give') return `+${l.n}장 배부`
    if (l.type === 'take') return `${l.n}장 회수`
    if (l.type === 'use') return `${l.n}장 사용`
    if (l.type === 'late') return '지각 반납 1장'
    if (l.type === 'confirm') return `확정 (받음 ${l.got ?? '?'} · 사용 ${l.used ?? '?'})`
    return `${l.field === 'got' ? '받음' : '사용'} ${l.n}장으로 수정`
  }
  const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date))
  const months = [...new Set(sorted.map((l) => l.date.slice(0, 7) || '이전'))]
  return (
    <dialog className="popup history" ref={(d) => d && !d.open && d.showModal()} onClose={onClose}>
      <form method="dialog">
        <h3>
          {student?.name} 청소면제권 내역 <small>{list.length}건</small>
        </h3>
        <div className="history-body">
          {months.map((m) => (
            <div key={m}>
              <h4>{m === '이전' ? '날짜 없음' : `${Number(m.slice(0, 4))}년 ${Number(m.slice(5))}월`}</h4>
              <table className="sheet">
                <tbody>
                  {sorted
                    .filter((l) => (l.date.slice(0, 7) || '이전') === m)
                    .map((l) => (
                      <tr key={l.id}>
                        <td>{short(l.date)}</td>
                        <td className="left-text">{label(l)}</td>
                        <td className="left-text">{l.reason ?? ''}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
        <button>닫기</button>
      </form>
    </dialog>
  )
}

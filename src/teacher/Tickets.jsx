import { useState } from 'react'
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { utils, writeFile } from 'xlsx'
import { db } from '../firebase'
import { useDocs, yearCol } from '../data'
import { applyTickets, mismatched } from '../records'

// 기존 종이 양식처럼 칸으로 개수를 보여 준다(5칸마다 음영).
function Strip({ total, filled, label }) {
  return (
    <div className="strip" role="img" aria-label={`${label} ${filled}`}>
      {Array.from({ length: Math.max(total, filled) }, (_, i) => (
        <span key={i} className={`${i < filled ? 'on' : ''} ${(i + 1) % 5 ? '' : 'shade'}`} />
      ))}
    </div>
  )
}

// 장부는 두 개: 담당 학생(m)과 선생님(t). me가 있으면 담당 학생 화면이라 m에만 쓰고, 저장한 뒤에는 못 고친다.
export default function Tickets({ year, students, me }) {
  const tickets = useDocs(year, 'tickets')
  const penalties = useDocs(year, 'penalties')
  const [picked, setPicked] = useState(new Set())
  const [n, setN] = useState(1)
  const [reason, setReason] = useState('')
  const side = me ? 'm' : 't'
  const by = me ?? 'teacher'

  const row = (no) => tickets.find((t) => t.id === no) ?? {}
  // 지각 3회로 반납한 장수. 두 장부의 사용 개수에 똑같이 더해 보여 준다.
  const paid = (no) => penalties.filter((p) => p.no === no && p.kind === 'ticket').length
  // 화면에 보이는 값(사용 = 장부 사용 + 지각 반납)
  const view = (no, k = side) => {
    const v = row(no)[k] ?? { got: 0, used: 0 }
    return { got: v.got ?? 0, used: (v.used ?? 0) + paid(no) }
  }

  const toggle = (no) => setPicked((p) => (p.has(no) ? new Set([...p].filter((x) => x !== no)) : new Set(p).add(no)))
  const all = students.length > 0 && picked.size === students.length

  // changes: [{ no, next }] — next는 화면 값이라 저장할 때 지각 반납분을 뺀다.
  async function write(changes, type, count, sides = [side]) {
    const batch = writeBatch(db)
    changes.forEach(({ no, next }) => {
      const stored = { got: next.got, used: next.used - paid(no) }
      batch.set(doc(yearCol(year, 'tickets'), no), Object.fromEntries(sides.map((k) => [k, stored])), { merge: true })
      batch.set(doc(yearCol(year, 'ticketLog')), { no, type, n: count, reason, by, at: serverTimestamp() })
    })
    await batch.commit()
  }

  async function bulk(type, label) {
    const results = students.filter((s) => picked.has(s.no)).map((s) => ({ s, ...applyTickets(view(s.no), type, n) }))
    const bad = results.filter((r) => r.error)
    // 한 명이라도 안 되면 아무도 바꾸지 않는다
    if (bad.length) return alert('처리할 수 없습니다.\n' + bad.map((r) => `${r.s.name}: ${r.error}`).join('\n'))
    if (me && !confirm(`${results.length}명에게 ${n}장 ${label}.\n저장한 뒤에는 고칠 수 없습니다. 저장할까요?`)) return
    await write(results.map((r) => ({ no: r.s.no, next: r.next })), type, n)
    setPicked(new Set())
  }

  // 숫자 직접 수정 (선생님만)
  function edit(s, field, input) {
    const value = Number(input.value)
    const cur = view(s.no)
    const next = { ...cur, [field]: value }
    if (!Number.isInteger(value) || value < 0 || next.used > next.got || next.used < paid(s.no)) {
      alert(`${s.name}: 사용 개수는 받은 개수(${next.got}장)를 넘을 수 없고, 지각으로 반납한 ${paid(s.no)}장보다 적을 수 없습니다.`)
      return (input.value = cur[field])
    }
    if (value !== cur[field]) write([{ no: s.no, next }], 'edit', value)
  }

  // 불일치 확정: 고른 값으로 두 장부를 맞춘다.
  const settle = (s, k) =>
    confirm(`${s.name}의 청소면제권을 ${k === 'm' ? '담당자' : '선생님'} 값(받음 ${view(s.no, k).got} · 사용 ${view(s.no, k).used})으로 확정할까요?`) &&
    write([{ no: s.no, next: view(s.no, k) }], 'confirm', 0, ['m', 't'])

  function download() {
    const rows = students.map((s) => {
      const t = view(s.no)
      return [Number(s.no.slice(2)), s.no, s.name, t.got, t.used, t.got - t.used]
    })
    const book = utils.book_new()
    utils.book_append_sheet(book, utils.aoa_to_sheet([['번호', '학번', '이름', '받음', '사용', '남음'], ...rows]), '청소면제권')
    writeFile(book, `총총섬_청소면제권_${year}.xlsx`)
  }

  return (
    <section>
      <h2>{year}학년도 청소면제권</h2>
      <div className="card row">
        <label>
          개수
          <input type="number" min="1" value={n} onChange={(e) => setN(Math.max(1, Number(e.target.value) || 1))} style={{ width: '5em' }} />
        </label>
        <label>
          사유
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예: 3월 모범" />
        </label>
        <button disabled={!picked.size} onClick={() => bulk('give', '배부')}>
          일괄 배부
        </button>
        <button disabled={!picked.size} onClick={() => bulk('use', '반납(사용)')}>
          일괄 반납(사용)
        </button>
        <button className="ghost danger" disabled={!picked.size} onClick={() => bulk('take', '삭제(회수)')}>
          일괄 삭제(회수)
        </button>
        <span className="hint">{picked.size}명 선택</span>
        <button className="ghost" onClick={download}>
          엑셀 다운로드
        </button>
      </div>
      {me && <p className="hint">저장한 기록은 고칠 수 없으니 잘못 입력했으면 아래 정정 요청으로 선생님께 알려 주세요.</p>}
      <div className="scroll">
        <table className="sheet">
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
              <th>보유 현황</th>
              <th>사용 현황</th>
              <th>받음</th>
              <th>사용</th>
              <th>남음</th>
              {!me && <th>담당자 기록</th>}
              {!me && <th>이중 체크</th>}
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const t = view(s.no)
              const r = row(s.no)
              const m = view(s.no, 'm')
              return (
                <tr key={s.no} className={!me && mismatched(r) ? 'bad' : ''}>
                  <td>
                    <input type="checkbox" checked={picked.has(s.no)} onChange={() => toggle(s.no)} aria-label={`${s.name} 선택`} />
                  </td>
                  <td>{Number(s.no.slice(2))}</td>
                  <td>{s.name}</td>
                  <td>
                    <Strip total={30} filled={t.got} label="받은 개수" />
                  </td>
                  <td>
                    <Strip total={10} filled={t.used} label="사용 개수" />
                  </td>
                  {['got', 'used'].map((f) => (
                    <td key={f}>
                      {me ? (
                        t[f]
                      ) : (
                        <input
                          key={t[f]}
                          type="number"
                          min="0"
                          defaultValue={t[f]}
                          className="num"
                          aria-label={`${s.name} ${f === 'got' ? '받은' : '사용'} 개수`}
                          onBlur={(e) => edit(s, f, e.target)}
                        />
                      )}
                    </td>
                  ))}
                  <td>{t.got - t.used}</td>
                  {!me && <td>{r.m ? `받음 ${m.got} · 사용 ${m.used}` : '-'}</td>}
                  {!me && (
                    <td>
                      {mismatched(r) ? (
                        <>
                          <span className="warn">불일치 </span>
                          <button onClick={() => settle(s, 'm')}>담당자 값으로</button>
                          <button onClick={() => settle(s, 't')}>선생님 값으로</button>
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
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

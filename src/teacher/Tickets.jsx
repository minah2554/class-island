import { useState } from 'react'
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { utils, writeFile } from 'xlsx'
import { db } from '../firebase'
import { useDocs, yearCol } from '../data'
import { applyTickets } from '../records'

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

export default function Tickets({ year, students }) {
  const tickets = useDocs(year, 'tickets')
  const [picked, setPicked] = useState(new Set())
  const [n, setN] = useState(1)
  const [reason, setReason] = useState('')

  const row = (no) => tickets.find((t) => t.id === no) ?? {}
  const mine = (no) => row(no).t ?? { got: 0, used: 0 } // 선생님 장부

  const toggle = (no) => setPicked((p) => (p.has(no) ? new Set([...p].filter((x) => x !== no)) : new Set(p).add(no)))
  const all = students.length > 0 && picked.size === students.length

  async function write(changes, type, count) {
    const batch = writeBatch(db)
    changes.forEach(({ no, next }) => {
      batch.set(doc(yearCol(year, 'tickets'), no), { t: next }, { merge: true })
      batch.set(doc(yearCol(year, 'ticketLog')), { no, type, n: count, reason, by: 'teacher', at: serverTimestamp() })
    })
    await batch.commit()
  }

  async function bulk(type) {
    const results = students.filter((s) => picked.has(s.no)).map((s) => ({ s, ...applyTickets(mine(s.no), type, n) }))
    const bad = results.filter((r) => r.error)
    // 한 명이라도 안 되면 아무도 바꾸지 않는다
    if (bad.length) return alert('처리할 수 없습니다.\n' + bad.map((r) => `${r.s.name}: ${r.error}`).join('\n'))
    await write(results.map((r) => ({ no: r.s.no, next: r.next })), type, n)
    setPicked(new Set())
  }

  // 숫자 직접 수정
  function edit(s, field, input) {
    const value = Number(input.value)
    const next = { ...mine(s.no), [field]: value }
    if (!Number.isInteger(value) || value < 0 || next.used > next.got) {
      alert(`${s.name}: 사용 개수는 받은 개수(${next.got}장)를 넘을 수 없습니다.`)
      return (input.value = mine(s.no)[field])
    }
    if (value !== mine(s.no)[field]) write([{ no: s.no, next }], 'edit', value)
  }

  function download() {
    const rows = students.map((s) => {
      const t = mine(s.no)
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
              <th>담당자 기록</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const t = mine(s.no)
              const m = row(s.no).m
              return (
                <tr key={s.no}>
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
                  <td>{t.got - t.used}</td>
                  <td>{m ? `받음 ${m.got ?? 0} · 사용 ${m.used ?? 0}` : '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

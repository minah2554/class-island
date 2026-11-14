import { useRef, useState } from 'react'
import { addDoc, deleteDoc, doc, increment, serverTimestamp, writeBatch } from 'firebase/firestore'
import { utils, writeFile } from 'xlsx'
import { db } from '../firebase'
import { useDocs, yearCol } from '../data'
import { owed, pad2 } from '../records'

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
const short = (date) => (date ? `${Number(date.slice(5, 7))}/${Number(date.slice(8))}` : '이전')

export default function Tardy({ year, students }) {
  const tardies = useDocs(year, 'tardies')
  const penalties = useDocs(year, 'penalties')
  const tickets = useDocs(year, 'tickets')
  const [date, setDate] = useState(today)
  const table = useRef()

  const of = (list, no) => list.filter((x) => x.no === no)
  const cols = Math.max(18, ...students.map((s) => of(tardies, s.no).length))

  async function add(s) {
    await addDoc(yearCol(year, 'tardies'), { no: s.no, date, by: 'teacher', at: serverTimestamp() })
    const n = of(tardies, s.no).length + 1
    if (n % 3 === 0 && confirm(`${s.name} 지각 ${n}회 — 청소면제권 1장 제출.\n지금 제출 처리할까요?`)) submit(s)
  }

  // 제출 처리: 면제권이 있으면 1장 반납, 없으면 청소 5번
  async function submit(s) {
    const t = tickets.find((x) => x.id === s.no) ?? {}
    const sides = ['m', 't'].filter((k) => t[k]) // 담당자·선생님 장부에 똑같이 반영해 불일치를 만들지 않는다
    const shown = t.m ?? t.t
    const has = !!shown && shown.got - shown.used >= 1
    const batch = writeBatch(db)
    const stamp = { no: s.no, by: 'teacher', at: serverTimestamp() }
    if (has) {
      batch.set(doc(yearCol(year, 'tickets'), s.no), Object.fromEntries(sides.map((k) => [k, { used: increment(1) }])), {
        merge: true,
      })
      batch.set(doc(yearCol(year, 'ticketLog')), { ...stamp, type: 'use', n: 1, reason: '지각 3회' })
    }
    batch.set(doc(yearCol(year, 'penalties')), { ...stamp, kind: has ? 'ticket' : 'clean5' })
    await batch.commit()
    if (!has) alert(`${s.name}: 제출할 청소면제권이 없습니다. 청소 5번 하기`)
  }

  const remove = (s, t) =>
    confirm(`${s.name}의 지각 기록(${short(t.date)})을 삭제할까요?`) && deleteDoc(doc(yearCol(year, 'tardies'), t.id))

  function download() {
    writeFile(utils.table_to_book(table.current, { raw: true }), `총총섬_지각_${year}.xlsx`)
  }

  return (
    <section>
      <h2>{year}학년도 지각</h2>
      <div className="row">
        <label>
          지각 날짜 (비우면 날짜 없는 이전 기록)
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <button className="ghost" onClick={download}>
          엑셀 다운로드
        </button>
      </div>
      <p className="hint">[+ 지각]을 누르면 위 날짜로 기록됩니다. 기록된 칸을 누르면 삭제할 수 있습니다. 3회마다 청소면제권 1장 제출.</p>
      <div className="scroll">
        <table ref={table} className="sheet">
          <thead>
            <tr>
              <th>번호</th>
              <th>이름</th>
              <th>입력</th>
              {Array.from({ length: cols }, (_, i) => (
                <th key={i} className={(i + 1) % 3 ? '' : 'shade'}>
                  {i + 1}
                </th>
              ))}
              <th>제출</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const mine = of(tardies, s.no).sort((a, b) => a.date.localeCompare(b.date))
              const done = of(penalties, s.no)
              const due = owed(mine.length, done.length)
              const clean = done.filter((p) => p.kind === 'clean5').length
              return (
                <tr key={s.no}>
                  <td>{Number(s.no.slice(2))}</td>
                  <td>{s.name}</td>
                  <td>
                    <button onClick={() => add(s)}>+ 지각</button>
                  </td>
                  {Array.from({ length: cols }, (_, i) => (
                    <td key={i} className={(i + 1) % 3 ? '' : 'shade'}>
                      {mine[i] && (
                        <button className="cell" onClick={() => remove(s, mine[i])} aria-label={`${s.name} ${i + 1}번째 지각 삭제`}>
                          {short(mine[i].date)}
                        </button>
                      )}
                    </td>
                  ))}
                  <td>
                    {due > 0 && <button onClick={() => submit(s)}>제출 처리 ({due})</button>}
                    {clean > 0 && <span className="warn"> 청소 5번 ×{clean}</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

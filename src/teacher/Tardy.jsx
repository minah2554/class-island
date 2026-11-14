import { useRef, useState } from 'react'
import { addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { utils, writeFile } from 'xlsx'
import { useDocs, yearCol } from '../data'
import { owed, pad2 } from '../records'

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
const short = (date) => (date ? `${Number(date.slice(5, 7))}/${Number(date.slice(8))}` : '이전')

// me가 있으면 담당 학생 화면: 추가만 할 수 있고 삭제는 못 한다.
export default function Tardy({ year, students, me }) {
  const tardies = useDocs(year, 'tardies')
  const penalties = useDocs(year, 'penalties')
  const tickets = useDocs(year, 'tickets')
  const [date, setDate] = useState(today)
  const table = useRef()
  const by = me ?? 'teacher'

  const of = (list, no) => list.filter((x) => x.no === no)
  const cols = Math.max(18, ...students.map((s) => of(tardies, s.no).length))

  async function add(s) {
    if (me && !confirm(`${s.name} — ${short(date)} 지각으로 저장할까요?\n저장한 뒤에는 고칠 수 없습니다.`)) return
    await addDoc(yearCol(year, 'tardies'), { no: s.no, date, by, at: serverTimestamp() })
    const n = of(tardies, s.no).length + 1
    if (n % 3 === 0 && confirm(`${s.name} 지각 ${n}회 — 청소면제권 1장 제출.\n지금 제출 처리할까요?`)) submit(s)
  }

  // 제출 처리: 면제권이 남아 있으면 1장 반납, 없으면 청소 5번.
  // 반납은 벌칙 기록으로만 남기고, 면제권 화면이 사용 개수에 더해 보여 준다(두 장부에 똑같이 반영됨).
  async function submit(s) {
    const t = tickets.find((x) => x.id === s.no) ?? {}
    const shown = t.m ?? t.t ?? { got: 0, used: 0 }
    const paid = of(penalties, s.no).filter((p) => p.kind === 'ticket').length
    const has = shown.got - shown.used - paid >= 1
    await addDoc(yearCol(year, 'penalties'), { no: s.no, kind: has ? 'ticket' : 'clean5', by, at: serverTimestamp() })
    alert(has ? `${s.name}: 청소면제권 1장을 반납 처리했습니다.` : `${s.name}: 제출할 청소면제권이 없습니다. 청소 5번 하기`)
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
      <p className="hint">
        [+ 지각]을 누르면 위 날짜로 기록됩니다. 3회마다 청소면제권 1장 제출.
        {me ? ' 저장한 기록은 고칠 수 없으니 아래 정정 요청으로 선생님께 알려 주세요.' : ' 기록된 칸을 누르면 삭제할 수 있습니다.'}
      </p>
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
                      {mine[i] &&
                        (me ? (
                          short(mine[i].date)
                        ) : (
                          <button className="cell" onClick={() => remove(s, mine[i])} aria-label={`${s.name} ${i + 1}번째 지각 삭제`}>
                            {short(mine[i].date)}
                          </button>
                        ))}
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

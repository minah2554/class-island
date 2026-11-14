import { useEffect, useRef, useState } from 'react'
import { deleteField, doc, onSnapshot, setDoc } from 'firebase/firestore'
import { utils, writeFile } from 'xlsx'
import { yearCol } from '../data'
import { pad2, schoolMonths, weekdays } from '../records'

// 칸 값: 'o' 제출 / 'x' 안 냄 / 그 밖의 글자 = 기타 사유 / 없음 = 아직 기록 안 함
export default function Reading({ year, students }) {
  const months = schoolMonths(year)
  const now = new Date()
  const [month, setMonth] = useState(() => months.find((x) => x.m === now.getMonth() + 1 && x.y === now.getFullYear()) ?? months[0])
  const [data, setData] = useState({})
  const [day, setDay] = useState(now.getDate())
  const table = useRef()

  const ref = doc(yearCol(year, 'reading'), month.id)
  useEffect(() => onSnapshot(ref, (s) => setData(s.data() ?? {})), [year, month.id])

  const days = weekdays(month.y, month.m, data.off)
  const value = (d, no) => data.days?.[pad2(d)]?.[no]
  const put = (d, entries) => setDoc(ref, { days: { [pad2(d)]: entries } }, { merge: true })

  function cycle(d, s) {
    const v = value(d, s.no)
    let next = 'o'
    if (v === 'o') next = 'x'
    else if (v === 'x') next = prompt(`${s.name} ${month.m}/${d} 기타 사유 (비우면 기록 지움)`)?.trim() || deleteField()
    else if (v) next = deleteField()
    put(d, { [s.no]: next })
  }

  const count = (s) => days.filter((d) => value(d, s.no) === 'o').length
  const submitted = (d) => students.filter((s) => value(d, s.no) === 'o').length
  const recorded = days.filter((d) => students.some((s) => value(d, s.no)))
  const average = recorded.length && students.length
    ? Math.round((recorded.reduce((sum, d) => sum + submitted(d), 0) / (recorded.length * students.length)) * 100)
    : 0

  function saveOff(text) {
    const off = [...new Set(text.split(/[,\s]+/).map(Number).filter((n) => n >= 1 && n <= 31))]
    setDoc(ref, { off }, { merge: true })
  }

  return (
    <section>
      <h2>{year}학년도 일일 독서기록장</h2>
      <div className="tabs" role="tablist">
        {months.map((x) => (
          <button key={x.id} role="tab" aria-selected={x.id === month.id} className={x.id === month.id ? '' : 'ghost'} onClick={() => setMonth(x)}>
            {x.m}월
          </button>
        ))}
      </div>
      <div className="row">
        <label>
          날짜
          <select value={days.includes(day) ? day : ''} onChange={(e) => setDay(Number(e.target.value))}>
            <option value="" disabled>
              선택
            </option>
            {days.map((d) => (
              <option key={d} value={d}>
                {month.m}/{d}
              </option>
            ))}
          </select>
        </label>
        <button disabled={!days.includes(day)} onClick={() => put(day, Object.fromEntries(students.map((s) => [s.no, 'o'])))}>
          모두 제출
        </button>
        <label>
          쉬는 날 (일, 쉼표로 구분)
          <input key={month.id + (data.off ?? '')} defaultValue={(data.off ?? []).join(', ')} placeholder="예: 1, 15" onBlur={(e) => saveOff(e.target.value)} />
        </label>
        <button className="ghost" onClick={() => writeFile(utils.table_to_book(table.current, { raw: true }), `총총섬_독서기록장_${month.id}.xlsx`)}>
          엑셀 다운로드
        </button>
      </div>
      <p className="hint">
        [모두 제출]을 누른 뒤 안 낸 학생 칸을 눌러 ✕로 바꿉니다. 칸을 누를 때마다 ○ → ✕ → 기타 사유 → 빈칸 순서로 바뀝니다. 이 달 반 평균 제출률 {average}%
      </p>
      <div className="scroll">
        <table ref={table} className="sheet reading">
          <thead>
            <tr>
              <th className="no">번호</th>
              <th>성명</th>
              {days.map((d) => (
                <th key={d} className={d === day ? 'sel' : ''}>
                  {month.m}/{d}
                </th>
              ))}
              <th className="sum">계</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.no}>
                <td className="no">{Number(s.no.slice(2))}</td>
                <td>{s.name}</td>
                {days.map((d) => {
                  const v = value(d, s.no)
                  return (
                    <td key={d} className={v === 'x' ? 'miss' : d === day ? 'sel' : ''}>
                      <button className="cell" onClick={() => cycle(d, s)} aria-label={`${s.name} ${month.m}월 ${d}일`}>
                        {v === 'o' ? '○' : v === 'x' ? '✕' : v || ' '}
                      </button>
                    </td>
                  )
                })}
                <td className="sum">{count(s)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan="2">제출 인원</th>
              {days.map((d) => (
                <td key={d}>{submitted(d) || ''}</td>
              ))}
              <td className="sum" />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}

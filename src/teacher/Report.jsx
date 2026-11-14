import { useRef } from 'react'
import { utils, writeFile } from 'xlsx'
import { useDocs } from '../data'

// 통계 리포트: 학생별 지각·청소면제권·독서·도감을 한 표로 모아 보고 엑셀로 내려받는다.
export default function Report({ year, students }) {
  const tardies = useDocs(year, 'tardies')
  const penalties = useDocs(year, 'penalties')
  const tickets = useDocs(year, 'tickets')
  const months = useDocs(year, 'reading')
  const cols = useDocs(year, 'collections')
  const table = useRef()

  const rows = students.map((s) => {
    const paid = penalties.filter((p) => p.no === s.no && p.kind === 'ticket').length
    const t = tickets.find((x) => x.id === s.no)
    const v = t?.t ?? t?.m ?? {} // 선생님 장부가 있으면 그것을 쓴다
    const got = v.got ?? 0
    const used = (v.used ?? 0) + paid
    let submitted = 0
    let recorded = 0
    months.forEach((m) =>
      Object.values(m.days ?? {}).forEach((day) => {
        if (day[s.no] === undefined) return
        recorded++
        if (day[s.no] === 'o') submitted++
      }),
    )
    const c = cols.find((x) => x.id === s.no)
    return {
      no: Number(s.no.slice(2)),
      name: s.name,
      tardy: tardies.filter((x) => x.no === s.no).length,
      got,
      used,
      left: got - used,
      submitted,
      recorded,
      rate: recorded ? Math.round((submitted / recorded) * 100) : null,
      kinds: Object.keys(c?.items ?? {}).length,
      caught: Object.values(c?.items ?? {}).reduce((sum, i) => sum + (i.n ?? 0), 0),
    }
  })
  const sum = (k) => rows.reduce((a, r) => a + r[k], 0)
  const rated = rows.filter((r) => r.rate !== null)
  const avg = rated.length ? Math.round(rated.reduce((a, r) => a + r.rate, 0) / rated.length) : 0

  return (
    <section>
      <h2>{year}학년도 통계 리포트</h2>
      <div className="row stats">
        <div className="card">
          <small>지각 합계</small>
          <b>{sum('tardy')}번</b>
        </div>
        <div className="card">
          <small>청소면제권 남은 장수</small>
          <b>{sum('left')}장</b>
        </div>
        <div className="card">
          <small>독서 평균 제출률</small>
          <b>{avg}%</b>
        </div>
        <div className="card">
          <small>도감 종류 합계</small>
          <b>{sum('kinds')}종</b>
        </div>
      </div>
      <button className="ghost" onClick={() => writeFile(utils.table_to_book(table.current, { raw: true }), `섬마을_통계_${year}.xlsx`)}>
        엑셀 다운로드
      </button>
      <div className="scroll">
        <table ref={table} className="sheet">
          <thead>
            <tr>
              <th>번호</th>
              <th>이름</th>
              <th>지각</th>
              <th>면제권 받음</th>
              <th>사용</th>
              <th>남음</th>
              <th>독서 제출</th>
              <th>기록한 날</th>
              <th>제출률(%)</th>
              <th>도감 종류</th>
              <th>잡은 횟수</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.no}>
                <td>{r.no}</td>
                <td>{r.name}</td>
                <td>{r.tardy}</td>
                <td>{r.got}</td>
                <td>{r.used}</td>
                <td>{r.left}</td>
                <td>{r.submitted}</td>
                <td>{r.recorded}</td>
                <td>{r.rate ?? ''}</td>
                <td>{r.kinds}</td>
                <td>{r.caught}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

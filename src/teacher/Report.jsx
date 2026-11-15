import { useEffect, useRef } from 'react'
import { utils, writeFile } from 'xlsx'
import { doc, setDoc } from 'firebase/firestore'
import { useDocs, yearCol } from '../data'
import { giftCount } from '../island/gifts'
import { readingStreak, topRanks } from '../island/gifts'
import { db } from '../firebase'

// 통계 리포트: 학생별 지각·청소면제권·독서·도감을 한 표로 모아 보고 엑셀로 내려받는다.
export default function Report({ year, students }) {
  const tardies = useDocs(year, 'tardies')
  const penalties = useDocs(year, 'penalties')
  const tickets = useDocs(year, 'tickets')
  const months = useDocs(year, 'reading')
  const cols = useDocs(year, 'collections')
  const gifts = useDocs(year, 'gifts')
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
    // 달마다 이 학생의 독서 기록 값(오래된 달부터)
    const byMonth = [...months].sort((x, y) => x.id.localeCompare(y.id)).filter((m) => Object.keys(m.days ?? {}).length).map((m) => Object.values(m.days).map((day) => day[s.no]).filter((v) => v !== undefined))
    return {
      id: s.no,
      gift: gifts.find((x) => x.id === s.no),
      no: Number(s.no.slice(2)),
      name: s.name,
      tardy: tardies.filter((x) => x.no === s.no).length,
      streak: readingStreak(byMonth),
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
  // 게시판 랭킹: 면제권 남은 장수, 독서 제출 일수는 많은 순, 지각은 적은 순(1~3위, 동점은 함께)
  const lastMonth = months.map((m) => m.id).filter((id) => Object.keys(months.find((m) => m.id === id).days ?? {}).length).sort().pop()
  const board = {
    tickets: topRanks(rows, 'left'), // 청소면제권 최다 소유자
    tardyMost: topRanks(rows, 'tardy'), // 지각이 많은 친구
    streak: topRanks(rows, 'streak'), // 독서 연속 성실(달)
    readingNow: rows.filter((r) => r.streak > 0).map((r) => r.name), // 이번 달 빠짐없이 낸 학생
    noTardy: rows.filter((r) => r.tardy === 0).map((r) => r.name), // 3월부터 지각이 한 번도 없는 학생
    month: lastMonth ? Number(lastMonth.slice(5)) : null,
  }
  const ranks = JSON.stringify(board)
  useEffect(() => {
    if (!rows.length || !(tardies.length + tickets.length + months.length)) return
    const t = setTimeout(() => setDoc(doc(db, 'years', String(year)), { ranks: JSON.parse(ranks) }, { merge: true }), 1500)
    return () => clearTimeout(t)
  }, [ranks, year])
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
      <div className="card">
        <h3>게시판 랭킹 (학생 게시판에 그대로 보입니다)</h3>
        {[['청소면제권 최다 소유자', board.tickets, '장'], ['지각이 많은 친구', board.tardyMost, '번'], ['독서기록장 연속 성실왕', board.streak, '달 연속']].map(([title, list, unit]) => (
          <p key={title}>
            <b>{title}</b>: {list.map((r) => `${r.rank}위 ${r.names} (${r.v}${unit})`).join(' · ') || '아직 없음'}
          </p>
        ))}
        <p>
          <b>{board.month ? `${board.month}월 ` : ''}독서기록장 성실왕 ({board.readingNow.length}명)</b>: {board.readingNow.join(', ') || '아직 없음'}
        </p>
        <p>
          <b>3월부터 지각이 한 번도 없는 친구 ({board.noTardy.length}명)</b>: {board.noTardy.join(', ') || '없음'}
        </p>
        <small>이 화면을 열 때마다 학생 게시판의 랭킹이 최신 기록으로 바뀝니다.</small>
      </div>
      <p className="hint">섬 선물 1개마다 학생의 섬에 낮에는 나무나 꽃이, 밤에는 가로등이 하나씩 늘어납니다: 한 달 독서 모두 제출 · 월말 기록장 제출 체크 · 청소면제권 받은 5장마다 · 선생님 선물(1인 1역을 잘한 학생 등).</p>
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
              <th>섬 선물(합계)</th>
              <th>선생님 선물</th>
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
                <td>{giftCount(r.gift)}</td>
                <td>
                  <input
                    key={r.gift?.bonus}
                    type="number"
                    min="0"
                    className="num"
                    defaultValue={r.gift?.bonus ?? 0}
                    aria-label={`${r.name} 선생님 선물 개수`}
                    onBlur={(e) => setDoc(doc(yearCol(year, 'gifts'), r.id), { bonus: Math.max(0, Math.floor(Number(e.target.value)) || 0) }, { merge: true })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

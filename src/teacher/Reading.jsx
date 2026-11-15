import { useEffect, useRef, useState } from 'react'
import { deleteField, doc, onSnapshot, setDoc, writeBatch } from 'firebase/firestore'
import { utils, writeFile } from 'xlsx'
import { useDocs, yearCol } from '../data'
import { perfectMonth } from '../island/gifts'
import { db } from '../firebase'
import { ask, tell } from '../popup'
import { pad2, schoolMonths, weekdays } from '../records'

// 칸 값: 'o' 제출 / 'x' 안 냄 / 그 밖의 글자 = 기타 사유 / 없음 = 아직 기록 안 함
// me가 있으면 담당 학생 화면: 고른 날짜를 임시로 체크한 뒤 [저장]하고, 저장한 날짜는 못 고친다.
export default function Reading({ year, students, me }) {
  const months = schoolMonths(year)
  const now = new Date()
  const [month, setMonth] = useState(() => months.find((x) => x.m === now.getMonth() + 1 && x.y === now.getFullYear()) ?? months[0])
  const [data, setData] = useState({})
  const [day, setDay] = useState(now.getDate())
  const [draft, setDraft] = useState({})
  const [mode, setMode] = useState('toggle') // 칸을 누르면: toggle(○↔✕) | reason(기타 사유 넣기) | clear(지우기)
  const [reason, setReason] = useState('')
  const table = useRef()
  const gifts = useDocs(year, 'gifts')

  const ref = doc(yearCol(year, 'reading'), month.id)
  useEffect(() => onSnapshot(ref, (s) => setData(s.data() ?? {})), [year, month.id])
  useEffect(() => setDraft({}), [day, month.id])

  const days = weekdays(month.y, month.m, data.off)
  const savedDay = (d) => data.days?.[pad2(d)]
  const locked = !!me && !!savedDay(day) // 담당자는 이미 저장된 날짜를 못 고친다
  const drafting = !!me && !locked
  const value = (d, no) => (drafting && d === day ? draft[no] : savedDay(d)?.[no])
  // 날짜마다 "반 전원 제출" 표시를 함께 남긴다(학생 채집 보너스용)
  const put = (d, entries) => {
    const merged = { ...savedDay(d), ...entries }
    const allRead = students.length > 0 && students.every((s) => merged[s.no] === 'o')
    const date = `${month.y}-${pad2(month.m)}-${pad2(d)}`
    setDoc(doc(yearCol(year, 'daily'), date), { allRead })
    // 학생이 '내 집'에서 자기 기록만 볼 수 있도록 학생별로도 남긴다
    const b = writeBatch(db)
    Object.entries(entries).forEach(([no, v]) => b.set(doc(yearCol(year, 'stats'), no), { reading: { [date]: v } }, { merge: true }))
    // 섬 선물: 이번 저장으로 "한 달을 잘한 학생"이 바뀌면 그 학생의 선물 기록을 고친다
    students.forEach((s) => {
      const vals = days.map((dd) => (dd === d ? merged[s.no] : savedDay(dd)?.[s.no]))
      const now = perfectMonth(vals)
      const was = !!gifts.find((g) => g.id === s.no)?.months?.[month.id]?.perfect
      if (now !== was) b.set(doc(yearCol(year, 'gifts'), s.no), { months: { [month.id]: { perfect: now } } }, { merge: true })
    })
    b.commit()
    return setDoc(ref, { days: { [pad2(d)]: entries } }, { merge: true })
  }

  // 칸을 누르면 고른 방식대로 값을 넣는다. ○와 ✕는 누를 때마다 서로 바뀐다.
  function press(d, s) {
    if (me && (d !== day || locked)) return
    if (mode === 'reason' && !reason.trim()) return tell('기타 사유를 먼저 적어 주세요.')
    const next = mode === 'toggle' ? (value(d, s.no) === 'o' ? 'x' : 'o') : mode === 'reason' ? reason.trim() : undefined
    if (!me) return put(d, { [s.no]: next ?? deleteField() })
    const { [s.no]: _, ...rest } = draft
    setDraft(next ? { ...rest, [s.no]: next } : rest)
  }

  const everyone = () => Object.fromEntries(students.map((s) => [s.no, 'o']))

  async function saveDraft() {
    // 체크하지 않은 학생은 안 낸 것으로 저장한다
    const entries = Object.fromEntries(students.map((s) => [s.no, draft[s.no] ?? 'x']))
    const done = Object.values(entries).filter((v) => v === 'o').length
    if (await ask(`${month.m}/${day} — 제출 ${done}명, 그 밖 ${students.length - done}명.\n저장한 뒤에는 고칠 수 없습니다. 저장할까요?`)) put(day, entries)
  }

  // 월말 독서기록장 제출 체크(섬주인만). 체크하면 섬 선물이 하나 더 생긴다.
  function setBook(s, on) {
    setDoc(ref, { book: { [s.no]: on } }, { merge: true })
    setDoc(doc(yearCol(year, 'gifts'), s.no), { months: { [month.id]: { book: on } } }, { merge: true })
  }
  const perfect = (s) => perfectMonth(days.map((d) => value(d, s.no)))

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

  const picked = days.includes(day)

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
          <select value={picked ? day : ''} onChange={(e) => setDay(Number(e.target.value))}>
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
        <button disabled={!picked || locked} onClick={() => (me ? setDraft(everyone()) : put(day, everyone()))}>
          모두 제출
        </button>
        {me && (
          <button disabled={!picked || locked || !Object.keys(draft).length} onClick={saveDraft}>
            저장
          </button>
        )}
        {!me && (
          <label>
            쉬는 날 (일, 쉼표로 구분)
            <input key={month.id + (data.off ?? '')} defaultValue={(data.off ?? []).join(', ')} placeholder="예: 1, 15" onBlur={(e) => saveOff(e.target.value)} />
          </label>
        )}
        <button className="ghost" onClick={() => writeFile(utils.table_to_book(table.current, { raw: true }), `섬마을_독서기록장_${month.id}.xlsx`)}>
          엑셀 다운로드
        </button>
      </div>
      <fieldset className="modes">
        <legend>칸을 누르면</legend>
        <label className="check">
          <input type="radio" name="mode" checked={mode === 'toggle'} onChange={() => setMode('toggle')} />○ ↔ ✕ 바꾸기
        </label>
        <label className="check">
          <input type="radio" name="mode" checked={mode === 'reason'} onChange={() => setMode('reason')} />
          기타 사유 넣기
          <input value={reason} onChange={(e) => setReason(e.target.value)} onFocus={() => setMode('reason')} placeholder="예: 병결" aria-label="기타 사유" size="8" />
        </label>
        <label className="check">
          <input type="radio" name="mode" checked={mode === 'clear'} onChange={() => setMode('clear')} />
          빈칸으로 지우기
        </label>
      </fieldset>
      <p className="hint">
        {me
          ? locked
            ? '이 날짜는 이미 저장했어요. 고칠 것이 있으면 아래 정정 요청으로 섬주인께 알려 주세요.'
            : '날짜를 고르고 [모두 제출] → 안 낸 친구 칸을 눌러 ✕로 바꾸기 → [저장].'
          : '[모두 제출]을 누른 뒤 안 낸 학생 칸을 눌러 ✕로 바꿉니다. 한 번 더 누르면 다시 ○가 됩니다.'}{' '}
        이 달 반 평균 제출률 {average}% · 달의 마지막 날까지 ✕ 없이 낸 학생은 이름이 노란색이 됩니다.
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
              <th>기록장 제출</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.no}>
                <td className="no">{Number(s.no.slice(2))}</td>
                <td className={perfect(s) ? 'star' : ''} title={perfect(s) ? '이번 달을 모두 잘했어요' : undefined}>
                  {s.name}
                </td>
                {days.map((d) => {
                  const v = value(d, s.no)
                  return (
                    <td key={d} className={v === 'x' ? 'miss' : d === day ? 'sel' : ''}>
                      <button className="cell" onClick={() => press(d, s)} aria-label={`${s.name} ${month.m}월 ${d}일`}>
                        {v === 'o' ? '○' : v === 'x' ? '✕' : v || ' '}
                      </button>
                    </td>
                  )
                })}
                <td className="sum">{count(s)}</td>
                <td>
                  {me ? (
                    data.book?.[s.no] ? '✓' : ''
                  ) : (
                    <input type="checkbox" checked={!!data.book?.[s.no]} onChange={(e) => setBook(s, e.target.checked)} aria-label={`${s.name} ${month.m}월 독서기록장 제출`} />
                  )}
                </td>
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
              <td>{students.filter((s) => data.book?.[s.no]).length || ''}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}

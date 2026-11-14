import { useEffect, useState } from 'react'
import {
  collection,
  deleteField,
  doc,
  getDocs,
  increment,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { read, utils, writeFile } from 'xlsx'
import { db } from '../firebase'
import { yearCol } from '../data'
import { parseRoster } from '../roster'

export default function Roster({ year }) {
  const [students, setStudents] = useState([])
  const [text, setText] = useState('')
  const [notes, setNotes] = useState([])
  const path = ['years', String(year), 'students']

  useEffect(() => {
    setNotes([])
    return onSnapshot(
      collection(db, ...path),
      (snap) => setStudents(snap.docs.map((d) => d.data()).sort((a, b) => a.no.localeCompare(b.no))),
      (e) => setNotes([e.message]),
    )
  }, [year])

  // 이미 있는 학번은 이름만 바뀌고 비밀번호·섬 정보는 그대로 남는다(merge).
  async function save(input) {
    const { students: list, errors } = parseRoster(input)
    if (list.length) {
      const batch = writeBatch(db)
      list.forEach((s) => batch.set(doc(db, ...path, s.no), s, { merge: true }))
      await batch.commit()
    }
    setNotes([`${list.length}명 저장했습니다.`, ...errors])
    return list.length > 0
  }

  async function upload(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    const book = read(await file.arrayBuffer())
    const rows = utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1 })
    save(rows.map((r) => `${r[0] ?? ''}\t${r[1] ?? ''}`).join('\n'))
  }

  function template() {
    const book = utils.book_new()
    utils.book_append_sheet(book, utils.aoa_to_sheet([['학번', '이름'], ['2101', '홍길동']]), '명단')
    writeFile(book, '총총섬_명단_양식.xlsx')
  }

  async function addOne(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    if (await save(`${f.get('no')}\t${f.get('name')}`)) e.target.reset()
  }

  const ref = (s) => doc(db, ...path, s.no)
  const rename = (s, name) => name.trim() && name.trim() !== s.name && updateDoc(ref(s), { name: name.trim() })
  // 비밀번호 리셋: 학생이 다음 접속 때 새 비밀번호를 만든다.
  const resetPw = (s) =>
    confirm(`${s.no} ${s.name}의 비밀번호를 리셋할까요?`) &&
    updateDoc(ref(s), { resetCount: increment(1), uid: deleteField() })
  // 학생과 그 학생의 지각·벌칙·면제권 기록을 함께 지운다.
  // shortcut: 독서기록장 칸은 달 문서 안에 남는다(명단에 없으면 화면에 안 보임), 년도 삭제 때 함께 지워진다.
  async function remove(s) {
    if (!confirm(`${s.no} ${s.name}을(를) 명단에서 삭제할까요?
이 학생의 지각·청소면제권 기록도 함께 삭제됩니다.`)) return
    const batch = writeBatch(db)
    for (const name of ['tardies', 'penalties', 'ticketLog'])
      (await getDocs(query(yearCol(year, name), where('no', '==', s.no)))).forEach((d) => batch.delete(d.ref))
    batch.delete(doc(yearCol(year, 'tickets'), s.no))
    batch.delete(ref(s))
    await batch.commit()
  }

  return (
    <section>
      <h2>
        {year}학년도 명단 <small>{students.length}명</small>
      </h2>

      <div className="grid">
        <form className="card" onSubmit={(e) => (e.preventDefault(), save(text).then((ok) => ok && setText('')))}>
          <h3>일괄 입력</h3>
          <label>
            한 줄에 한 명씩 "학번 이름" (엑셀에서 두 열을 복사해 붙여 넣어도 됩니다)
            <textarea rows="6" value={text} onChange={(e) => setText(e.target.value)} placeholder={'2101 홍길동\n2102 김총총'} />
          </label>
          <button disabled={!text.trim()}>저장</button>
        </form>

        <div className="card">
          <form onSubmit={addOne}>
            <h3>개별 추가</h3>
            <div className="row">
              <label>
                학번
                <input name="no" required inputMode="numeric" pattern="\d{4}" maxLength="4" size="5" />
              </label>
              <label>
                이름
                <input name="name" required size="8" />
              </label>
              <button>추가</button>
            </div>
          </form>
          <h3>엑셀 업로드</h3>
          <div className="row">
            <label>
              파일 (A열 학번, B열 이름)
              <input type="file" accept=".xlsx,.xls,.csv" onChange={upload} />
            </label>
            <button type="button" className="ghost" onClick={template}>
              양식 다운로드
            </button>
          </div>
        </div>
      </div>

      {notes.length > 0 && (
        <ul className="card notes" role="status">
          {notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}

      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>번호</th>
              <th>학번</th>
              <th>이름</th>
              <th>섬 등록</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.no}>
                <td>{Number(s.no.slice(2))}</td>
                <td>{s.no}</td>
                <td>
                  <input
                    key={s.name}
                    aria-label={`${s.no} 이름`}
                    defaultValue={s.name}
                    onBlur={(e) => rename(s, e.target.value)}
                  />
                </td>
                <td>{s.uid ? '완료' : '-'}</td>
                <td>
                  <button className="ghost" onClick={() => resetPw(s)}>
                    비번 리셋
                  </button>
                  <button className="ghost danger" onClick={() => remove(s)}>
                    삭제
                  </button>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan="5">아직 등록된 학생이 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

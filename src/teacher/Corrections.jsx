import { deleteDoc, doc } from 'firebase/firestore'
import { useDocs, yearCol } from '../data'
import { ROLES } from '../roles'

// 담당 학생이 보낸 정정 요청. 해당 탭에서 직접 고친 뒤 [처리 완료]로 지운다.
export default function Corrections({ year }) {
  const list = useDocs(year, 'corrections').sort((a, b) => (a.at?.seconds ?? 0) - (b.at?.seconds ?? 0))
  return (
    <section>
      <h2>{year}학년도 정정 요청함</h2>
      {list.length === 0 && <p className="card">들어온 정정 요청이 없습니다.</p>}
      {list.map((c) => (
        <div key={c.id} className="card row">
          <div style={{ flex: 1 }}>
            <strong>
              [{ROLES[c.role] ?? c.role}] {c.by} {c.byName}
            </strong>{' '}
            <small>{c.at ? new Date(c.at.seconds * 1000).toLocaleString('ko-KR') : ''}</small>
            <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{c.text}</p>
          </div>
          <button onClick={() => deleteDoc(doc(yearCol(year, 'corrections'), c.id))}>처리 완료</button>
        </div>
      ))}
    </section>
  )
}

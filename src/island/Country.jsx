import { useDocs, useStudents } from '../data'
import { ALL } from './species'
import { fund } from './Shop'
import { when } from './hooks'

// 섬나라 전체: 반 소식과 모든 친구 섬. [놀러가기]로 친구 섬에 간다.
export default function Country({ me, cols, settings, bought, onVisit, onBoard }) {
  const students = useStudents(me.year).filter((s) => s.character) // 여권을 만든 친구만
  const notices = useDocs(me.year, 'notices').sort((a, b) => (b.at?.seconds ?? 9e9) - (a.at?.seconds ?? 9e9))
  const found = ALL.filter((id) => cols.some((c) => c.items?.[id])).length
  const kinds = (no) => Object.keys(cols.find((c) => c.id === no)?.items ?? {}).length
  const latest = notices[0]

  return (
    <section>
      <h2>{settings.countryName || '우리 반 섬나라'}</h2>
      <div className="card">
        <p>
          섬 주민 <b>{students.length}</b>명 · 반 도감 <b>{found}</b>/100 · 반 기금 <b>{fund(cols, bought)}</b>개
        </p>
        <div className="meter" role="img" aria-label={`도감 ${found}종`}>
          <span className="left" style={{ width: `${found}%` }} />
        </div>
        {latest && (
          <p>
            <button className="ghost" onClick={onBoard}>
              공지
            </button>{' '}
            {when(latest)} {latest.text.slice(0, 40)}
          </p>
        )}
      </div>
      <div className="dex islands">
        {students.map((s) => (
          <div key={s.no} className={`dex-card ${s.no === me.no ? 'mine' : ''}`}>
            <img src={`assets/characters/char_0${s.character}.webp`} alt="" loading="lazy" />
            <span>{s.islandName || '이름 없는 섬'}</span>
            <small>
              {s.name} · 도감 {kinds(s.no)}종
            </small>
            <button onClick={() => onVisit(s)}>{s.no === me.no ? '내 섬' : '놀러가기'}</button>
          </div>
        ))}
        {!students.length && <p>아직 여권을 만든 친구가 없어요.</p>}
      </div>
    </section>
  )
}

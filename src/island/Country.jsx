import { useDocs, useStudents } from '../data'
import { ALL } from './species'
import { fund } from './Shop'
import { when } from './hooks'

// 전경 그림(scenes/world) 속 작은 섬들의 자리(%). 번호 순서대로 학생 한 명이 섬 하나를 맡는다.
// shortcut: 그림에 맞춰 손으로 찍은 40자리다. 학생이 40명을 넘으면 남는 학생은 아래 목록으로만 보인다.
const ISLES = [
  [10, 9], [33, 5], [63, 5], [82, 10], [94, 8], [23, 13], [47, 11], [69, 18], [11, 21], [33, 21],
  [56, 20], [94, 24], [80, 27], [6, 32], [20, 33], [72, 36], [88, 39], [28, 41], [11, 46], [77, 48],
  [95, 51], [23, 56], [6, 60], [86, 60], [71, 65], [13, 70], [33, 69], [60, 73], [95, 70], [22, 78],
  [44, 77], [79, 78], [5, 84], [30, 87], [55, 89], [90, 86], [15, 91], [70, 91], [41, 95], [84, 95],
]

// 섬나라 전경: 우리 반 섬이 한눈에 보이고, 섬을 누르면 그 친구 섬으로 간다. 가운데 큰 섬은 마을 광장.
export default function Country({ me, cols, settings, bought, onVisit, onBoard, onPlaza }) {
  const students = useStudents(me.year)
  const notices = useDocs(me.year, 'notices').sort((a, b) => (b.at?.seconds ?? 9e9) - (a.at?.seconds ?? 9e9))
  const found = ALL.filter((id) => cols.some((c) => c.items?.[id])).length
  const kinds = (no) => Object.keys(cols.find((c) => c.id === no)?.items ?? {}).length
  const latest = notices[0]
  const extra = students.slice(ISLES.length).filter((s) => s.character)

  return (
    <section>
      <div className="scene worldmap">
        <img className="bg" src="assets/scenes/world.webp" alt="" draggable="false" />
        <div className="clouds" aria-hidden="true">
          <i style={{ top: '10%', animationDuration: '80s' }} />
          <i style={{ top: '55%', animationDuration: '110s', animationDelay: '-50s' }} />
        </div>
        <button className="isle plaza" style={{ left: '50%', top: '47%' }} onClick={onPlaza}>
          <span>{settings.countryName || '우리 반 섬나라'} · 마을 광장</span>
        </button>
        {students.slice(0, ISLES.length).map((s, i) => (
          <button
            key={s.no}
            className={`isle ${s.no === me.no ? 'mine' : ''} ${s.character ? '' : 'empty'}`}
            style={{ left: `${ISLES[i][0]}%`, top: `${ISLES[i][1]}%`, animationDelay: `${(i % 7) * -0.6}s` }}
            disabled={!s.character}
            onClick={() => onVisit(s)}
            title={s.character ? `${s.name} · 도감 ${kinds(s.no)}종` : `${s.name} · 아직 여권을 만들지 않았어요`}
          >
            {s.character && <img src={`assets/characters/char_0${s.character}.webp`} alt="" draggable="false" />}
            <span>{s.character ? s.islandName || s.name : s.name}</span>
          </button>
        ))}
      </div>
      <p className="hint">섬을 누르면 그 친구 섬으로 놀러 가요. 가운데 큰 섬은 마을 광장이에요.</p>

      <div className="card">
        <p>
          섬 주민 <b>{students.filter((s) => s.character).length}</b>명 · 반 도감 <b>{found}</b>/100 · 반 기금 <b>{fund(cols, bought)}</b>개
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
        {extra.length > 0 && (
          <p className="chips">
            {extra.map((s) => (
              <button key={s.no} className="ghost" onClick={() => onVisit(s)}>
                {s.islandName || s.name}
              </button>
            ))}
          </p>
        )}
      </div>
    </section>
  )
}

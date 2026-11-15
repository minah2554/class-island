import { collection, deleteDoc, doc, getDocs, onSnapshot, setDoc, writeBatch } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { askText, tell } from '../popup'

// 학년도 아래 컬렉션 이름 전부(백업·삭제 대상)
const PARTS = ['students', 'tardies', 'penalties', 'tickets', 'ticketLog', 'reading', 'corrections', 'managerPins', 'collections', 'daily', 'stats', 'letters', 'complaints', 'notices', 'guestbook', 'plaza', 'gifts']
const yearDoc = (y) => doc(db, 'years', String(y))

// 설정(반장·나쁜 말 목록)과 학년도 백업·삭제
export default function Manage({ year, students }) {
  const [cfg, setCfg] = useState({})
  useEffect(() => onSnapshot(yearDoc(year), (s) => setCfg(s.data() ?? {})), [year])
  const save = (patch) => setDoc(yearDoc(year), patch, { merge: true })

  async function backup() {
    const out = { year, saved: new Date().toISOString(), settings: cfg }
    for (const p of PARTS) out[p] = (await getDocs(collection(yearDoc(year), p))).docs.map((d) => ({ id: d.id, ...d.data() }))
    const url = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' }))
    Object.assign(document.createElement('a'), { href: url, download: `섬마을_${year}학년도_백업.json` }).click()
    URL.revokeObjectURL(url)
  }

  async function wipe() {
    const typed = await askText(`${year}학년도의 모든 기록을 지웁니다. 먼저 백업을 받으셨나요?\n계속하려면 ${year} 를 입력하세요.`)
    if (typed === null) return
    if (typed.trim() !== String(year)) return tell('학년도가 맞지 않아 취소했습니다.')
    for (const p of PARTS) {
      const docs = (await getDocs(collection(yearDoc(year), p))).docs
      for (let i = 0; i < docs.length; i += 400) {
        const b = writeBatch(db)
        docs.slice(i, i + 400).forEach((d) => b.delete(d.ref))
        await b.commit()
      }
    }
    await deleteDoc(yearDoc(year))
    await deleteDoc(doc(db, 'loginIndex', String(year)))
    tell(`${year}학년도 기록을 지웠습니다. (로그인 계정 자체는 Firebase 콘솔 Authentication에서 따로 지울 수 있습니다.)`)
  }

  return (
    <section>
      <h2>설정</h2>
      <div className="card">
        <label>
          나라 이름 (학생 화면 맨 위에 나옵니다)
          <input key={cfg.countryName} defaultValue={cfg.countryName ?? ''} placeholder="우리 반 섬나라" onBlur={(e) => save({ countryName: e.target.value.trim() })} />
        </label>
        <label>
          하루 채집 횟수
          <input type="number" min="1" max="10" style={{ width: '6em' }} key={cfg.catchPerDay} defaultValue={cfg.catchPerDay ?? 2} onBlur={(e) => save({ catchPerDay: Math.min(10, Math.max(1, Number(e.target.value) || 2)) })} />
        </label>
        <label>
          도감 완성 보상
          <input key={cfg.reward} defaultValue={cfg.reward ?? ''} placeholder="예: 단체 간식!" onBlur={(e) => save({ reward: e.target.value.trim() })} />
        </label>
        <label>
          추가로 막을 낱말 (쉼표로 구분, 기본 나쁜 말은 이미 막혀 있습니다)
          <input
            key={(cfg.banned ?? []).join()}
            defaultValue={(cfg.banned ?? []).join(', ')}
            placeholder="예: 바보, 못생김"
            onBlur={(e) => save({ banned: e.target.value.split(/[,\s]+/).map((w) => w.trim()).filter(Boolean) })}
          />
        </label>
      </div>
      <div className="card">
        <label>
          담임 선생님 말씀 (한 줄에 하나) — 학생마다 자기 섬 우편함에 "새 소식"으로 뜨고, 주민센터 이장님도 이 말을 차례로 합니다
          <textarea
            key={(cfg.mayorLines ?? []).join('|')}
            rows="5"
            maxLength="600"
            defaultValue={(cfg.mayorLines ?? []).join('\n')}
            placeholder={'예:\n이번 주 목표는 지각 없는 한 주, 총총!\n독서기록장 꼭 챙기기!'}
            onBlur={(e) => save({ mayorLines: e.target.value.split('\n').map((w) => w.trim()).filter(Boolean).slice(0, 20) })}
          />
        </label>
        <small>고치면 모든 학생의 우편함에 새 소식 표시가 다시 뜹니다. 비워 두면 이장님은 기본 말을 합니다.</small>
      </div>
      <h2>백업과 삭제</h2>
      <div className="card">
        <p>{year}학년도의 명단·지각·면제권·독서기록·편지·민원 등 모든 기록을 파일 하나로 내려받습니다.</p>
        <div className="row">
          <button onClick={backup}>{year}학년도 백업 받기</button>
          <button className="danger" onClick={wipe}>
            {year}학년도 기록 모두 지우기
          </button>
        </div>
      </div>
    </section>
  )
}

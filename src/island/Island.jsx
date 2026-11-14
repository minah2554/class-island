import { useEffect, useMemo, useState } from 'react'
import { signOut } from 'firebase/auth'
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'
import StudentGate from '../StudentGate'
import { syncClock, kst } from '../clock'
import { useDocs } from '../data'
import { auth, db } from '../firebase'
import { tell } from '../popup'
import Catch from './Catch'
import Museum from './Museum'
import Scene from './Scene'
import { phaseOf, toMin, weatherKind } from './sky'
import { getWeather } from './weather'

// 걸어 다닐 수 있는 영역(%)
const WALK = {
  island: { cx: 50, cy: 47, rx: 41, ry: 33 },
  plaza: { x0: 6, x1: 94, y0: 24, y1: 90 },
  sea: { x0: 6, x1: 94, y0: 52, y1: 92 },
  forest: { x0: 14, x1: 86, y0: 34, y1: 90 },
}
const NAV = [['island', '내 섬'], ['plaza', '마을 광장'], ['sea', '바다 낚시'], ['forest', '숲 곤충'], ['museum', '박물관']]

export default function Island() {
  return <StudentGate title="총총섬">{(me) => (me.character ? <World me={me} /> : <Passport me={me} />)}</StudentGate>
}

// 여권: 캐릭터와 섬 이름, 말버릇을 정한다
function Passport({ me }) {
  const [pick, setPick] = useState(1)
  async function save(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    await updateDoc(doc(db, 'years', String(me.year), 'students', me.no), {
      character: pick,
      islandName: f.get('island').trim(),
      catchphrase: f.get('phrase').trim(),
    })
  }
  return (
    <form className="card center narrow" onSubmit={save}>
      <h1>섬 주민 여권</h1>
      <p>
        {me.no} {me.name}
      </p>
      <div className="picker" role="radiogroup" aria-label="캐릭터 고르기">
        {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
          <button type="button" key={n} role="radio" aria-checked={pick === n} className={pick === n ? 'on' : ''} onClick={() => setPick(n)}>
            <img src={`assets/characters/char_0${n}.webp`} alt={`캐릭터 ${n}`} />
          </button>
        ))}
      </div>
      <label>
        내 섬 이름
        <input name="island" required maxLength="12" placeholder="예: 보리섬" />
      </label>
      <label>
        내 말버릇 (말 끝에 붙는 한마디)
        <input name="phrase" maxLength="8" placeholder="예: 총총!" />
      </label>
      <button>섬으로 출발!</button>
    </form>
  )
}

function World({ me }) {
  const [scene, setScene] = useState('island')
  const [wx, setWx] = useState(undefined) // undefined: 불러오는 중, null: 실패
  const [, tick] = useState(0)
  const [settings, setSettings] = useState({})
  const cols = useDocs(me.year, 'collections')
  const daily = useDocs(me.year, 'daily')
  // 주소 뒤에 ?sky=night&wx=rain 을 붙이면 시간대·날씨를 미리 볼 수 있다
  const forced = useMemo(() => new URLSearchParams(location.hash.split('?')[1] ?? ''), [])

  useEffect(() => {
    syncClock()
    getWeather().then(setWx)
    const t = setInterval(() => tick((n) => n + 1), 60000) // 시간대가 바뀌면 배경도 바뀐다
    return () => clearInterval(t)
  }, [])
  useEffect(() => onSnapshot(doc(db, 'years', String(me.year)), (s) => setSettings(s.data() ?? {})), [me.year])

  const t = kst()
  const phase = forced.get('sky') ?? phaseOf(t.h * 60 + t.min, wx ? toMin(wx.sunrise) : undefined, wx ? toMin(wx.sunset) : undefined)
  const w = forced.get('wx') ? { kind: forced.get('wx'), label: forced.get('wx') } : wx ? weatherKind(wx.code) : { kind: 'clear', label: '' }

  // 오늘 채집 횟수: 기본 + 반 전원 독서기록 제출 보너스
  const mine = cols.find((c) => c.id === me.no) ?? {}
  const limit = (settings.catchPerDay ?? 2) + (daily.find((d) => d.id === t.ymd)?.allRead ? 1 : 0)
  const left = Math.max(0, limit - (mine.days?.[t.ymd] ?? 0))

  const soon = (what) => () => tell(`${what}은(는) 곧 열려요. 조금만 기다려 주세요, 총총!`)
  const spots = {
    island: [
      { x: 50, y: 33, w: 20, img: 'buildings/house', label: '내 집', onClick: soon('내 집') },
      { x: 72, y: 56, w: 9, img: 'buildings/mailbox', label: '우편함', onClick: soon('우편함') },
    ],
    plaza: [
      { x: 50, y: 62, w: 17, img: 'decor/decor_01', label: '', onClick: () => {} },
      { x: 50, y: 30, w: 19, img: 'buildings/museum', label: '박물관', onClick: () => setScene('museum') },
      { x: 84, y: 52, w: 16, img: 'buildings/center', label: '주민센터', onClick: soon('주민센터') },
      { x: 15, y: 56, w: 11, img: 'buildings/board', label: '게시판', onClick: soon('게시판') },
    ],
  }[scene]

  return (
    <main className="page">
      <header className="bar">
        <h1>{settings.countryName || '우리 반 섬나라'}</h1>
        <span className="wx" role="status">
          궁동 {w.label || (wx === undefined ? '날씨 불러오는 중' : '날씨 정보 없음')} {wx ? `${wx.temp}°C` : ''}
        </span>
        <span>
          {me.islandName ? `${me.islandName} · ` : ''}
          {me.name}
        </span>
        <button className="ghost" onClick={() => signOut(auth)}>
          로그아웃
        </button>
      </header>
      <nav className="tabs">
        {NAV.map(([k, label]) => (
          <button key={k} className={scene === k ? '' : 'ghost'} aria-pressed={scene === k} onClick={() => setScene(k)}>
            {label}
          </button>
        ))}
      </nav>

      {scene === 'museum' ? (
        <Museum me={me} cols={cols} settings={settings} />
      ) : (
        <>
          <Scene
            key={scene}
            bg={scene}
            phase={phase}
            kind={w.kind}
            walk={WALK[scene]}
            character={me.character}
            bubble={`안녕! ${me.catchphrase ?? ''}`}
            spots={spots}
          />
          {scene === 'sea' && <Catch me={me} kind="fish" cols={cols} left={left} limit={limit} />}
          {scene === 'forest' && <Catch me={me} kind="bug" cols={cols} left={left} limit={limit} />}
        </>
      )}
    </main>
  )
}

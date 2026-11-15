import { useEffect, useRef, useState } from 'react'
import { doc, increment, serverTimestamp, setDoc } from 'firebase/firestore'
import { isClassTime, kst } from '../clock'
import { yearCol } from '../data'
import { tell } from '../popup'
import { catchBlock } from './gifts'
import { useDoc, useWhere } from './hooks'
import Scene from './Scene'
import { KINDS, TIERS, draw, imageOf, nameOf, speciesId, tierOf } from './species'

const SHELLS = [1, 2, 4, 8, 20]
// 생물이 나타나는 구역(%)과, 잡으러 갈 때 캐릭터가 서는 곳
const AREA = {
  fish: { x0: 6, x1: 94, y0: 6, y1: 26, skip: (x) => x > 54 && x < 82 }, // 물 위(선착장 자리는 피한다)
  bug: { x0: 22, x1: 82, y0: 34, y1: 86, skip: () => false },
}
// 숲 그림 속 숨을 곳(나무 밑동·덤불·꽃·그루터기)의 자리(%)
const HIDES = [
  [16, 31], [13, 34], [23, 23], [29, 19], [42, 16], [50, 14], [58, 16], [67, 17], [76, 22], [82, 24],
  [90, 36], [93, 44], [8, 50], [10, 62], [9, 84], [15, 90], [91, 64], [88, 86], [83, 90],
]
const MAX = 3 // 한 번에 보이는 생물 수

let seq = 0
function spawn(kind, taken = []) {
  const a = AREA[kind]
  const n = draw()
  const tier = tierOf(n)
  let x
  let y = a.y0 + Math.random() * (a.y1 - a.y0)
  do x = a.x0 + Math.random() * (a.x1 - a.x0)
  while (a.skip(x))
  // 곤충은 아직 비어 있는 숨을 곳 가운데 한 곳에 나타난다
  if (kind === 'bug') {
    const free = HIDES.filter(([hx, hy]) => !taken.some((c) => Math.hypot(c.x - hx, c.y - hy) < 5))
    ;[x, y] = (free.length ? free : HIDES)[Math.floor(Math.random() * (free.length || HIDES.length))]
  }
  return {
    key: `c${++seq}`,
    n,
    tier,
    id: speciesId(kind, n),
    x,
    y,
    // 희귀할수록 빨리 사라진다
    until: Date.now() + (16 - tier * 2.5 + Math.random() * 6) * 1000,
    dur: 5 + Math.random() * 4,
  }
}

// 막대 위를 오가는 표시가 초록 구간 안에 있을 때 누르면 성공. 희귀할수록 구간이 좁고 빠르다.
function Timing({ tier, label, onDone }) {
  const t = TIERS[tier]
  const [zone] = useState(() => ({ x: 0.1 + Math.random() * (0.8 - t.zone), w: t.zone }))
  const mark = useRef()
  const at = useRef(0)
  useEffect(() => {
    const t0 = performance.now()
    let raf
    const loop = (now) => {
      const ph = (((now - t0) / 1000) * t.speed) % 2
      at.current = ph < 1 ? ph : 2 - ph
      if (mark.current) mark.current.style.left = `${at.current * 100}%`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [t.speed])
  return (
    <div className="timing">
      <div className="bar-track" aria-hidden="true">
        <span className="zone" style={{ left: `${zone.x * 100}%`, width: `${zone.w * 100}%` }} />
        <span className="mark" ref={mark} />
      </div>
      <button autoFocus onClick={() => onDone(at.current >= zone.x && at.current <= zone.x + zone.w)}>
        {label}
      </button>
    </div>
  )
}

// 낚시터·숲: 물고기 그림자나 곤충이 나타났다 사라진다. 눌러서 다가가 잡는다.
// stage: idle(둘러보기) → go(다가가는 중) → wait(찌를 던지고 기다림) → play(타이밍) → result
export default function Hunt({ me, kind, cols, left, limit, scene }) {
  const [critters, setCritters] = useState([])
  const [stage, setStage] = useState('idle')
  const [cur, setCur] = useState(null)
  const [got, setGot] = useState(false)
  const stageRef = useRef(stage)
  stageRef.current = stage
  const curRef = useRef(cur)
  curRef.current = cur
  const k = KINDS[kind]
  const mine = cols.find((c) => c.id === me.no) ?? {}
  const ref = doc(yearCol(me.year, 'collections'), me.no)
  // 독서기록장을 내고 지각하지 않은 날에만 채집할 수 있다
  const stats = useDoc(me.year, 'stats', me.no)
  const tardies = useWhere(me.year, 'tardies', 'no', me.no)
  const block = catchBlock(stats?.reading, tardies.map((x) => x.date), kst().ymd)

  // 생물이 하나씩 나타나고, 시간이 지나면 달아난다(쫓는 중인 것은 남는다)
  useEffect(() => {
    setCritters(() => {
      const first = spawn(kind)
      return [first, spawn(kind, [first])]
    })
    const t = setInterval(() => {
      setCritters((list) => {
        const alive = list.filter((c) => c.key === curRef.current?.key || c.until > Date.now())
        return alive.length < MAX && stageRef.current === 'idle' && Math.random() < 0.6 ? [...alive, spawn(kind, alive)] : alive
      })
    }, 1500)
    return () => clearInterval(t)
  }, [kind])

  // 누를 수 있는지 먼저 확인한다(수업 시간·남은 횟수)
  function guard() {
    if (stage !== 'idle') return false
    if (isClassTime(kst())) return tell('수업 시간이에요. 쉬는 시간이나 방과 후에 다시 와요, 총총!'), false
    if (block) return tell(block), false
    if (left < 1) return tell('오늘 횟수를 다 썼어요. 내일 또 만나요!'), false
    return true
  }

  // 다가가서 도구를 쓰는 순간 횟수를 쓴다. 놓친 뒤에 새로고침해도 되살릴 수 없다.
  async function arrive(c) {
    try {
      await setDoc(ref, { name: me.name, days: { [kst().ymd]: increment(1) } }, { merge: true })
    } catch {
      // 저장이 안 되면 횟수를 쓰지 않고 처음으로 돌아간다
      setCur(null)
      setStage('idle')
      return tell('기록을 저장하지 못했어요. 잠시 뒤에 다시 해 봐요.')
    }
    if (kind === 'fish') {
      setStage('wait')
      setTimeout(() => setStage('play'), 1200 + Math.random() * 1800) // 입질을 기다린다
    } else setStage('play')
  }

  async function finish(ok) {
    setGot(ok)
    setStage('result')
    if (!ok) return
    const first = !mine.items?.[cur.id]
    await setDoc(ref, { name: me.name, shells: increment(SHELLS[cur.tier]), items: { [cur.id]: { n: increment(1), ...(first ? { first: serverTimestamp() } : {}) } } }, { merge: true })
  }

  function done() {
    setCritters((list) => list.filter((c) => c.key !== cur.key))
    setCur(null)
    setStage('idle')
  }

  const classNew = cur && !cols.some((c) => c.items?.[cur.id])
  const spots = critters.map((c) => ({
    key: c.key,
    x: c.x,
    y: c.y,
    w: kind === 'fish' ? 5 + c.tier * 1.6 : 4,
    cls: `critter ${kind} ${cur?.key === c.key ? 'picked' : ''}`,
    style: { '--dur': `${c.dur}s` },
    // 물고기는 그림자만, 곤충은 모습이 보인다
    node: kind === 'fish' ? <i className="shadow-fish" /> : <img src={imageOf(c.id)} alt="" draggable="false" />,
    name: kind === 'fish' ? '물고기 그림자' : '곤충',
    stand: kind === 'fish' ? { x: c.x, y: 54 } : { x: c.x + (c.x > 50 ? -7 : 7), y: c.y + 3 },
    guard: () => guard() && (setCur(c), setStage('go'), true),
    onClick: () => arrive(c),
  }))

  return (
    <Scene {...scene} spots={spots} hold={stage !== 'idle'}>
      <p className="hunt-top" role="status">
        {k.label} · {block ? '오늘은 쉬는 날' : <>오늘 남은 횟수 <b>{left}</b>/{limit}</>}
      </p>
      {stage === 'idle' && <p className="hunt-tip">{kind === 'fish' ? '물속에 그림자가 보이면 눌러서 낚싯대를 던져요.' : '나무와 꽃 근처를 잘 봐요. 곤충이 고개를 내밀면 눌러서 살금살금 다가가요.'}</p>}
      {stage === 'go' && <p className="hunt-tip">{kind === 'fish' ? '물가로 가는 중…' : '살금살금…'}</p>}
      {cur && kind === 'fish' && (stage === 'wait' || stage === 'play') && (
        <i className={`bobber ${stage === 'play' ? 'bite' : ''}`} style={{ left: `${cur.x}%`, top: `${cur.y}%` }} aria-hidden="true" />
      )}
      {stage === 'wait' && <p className="hunt-tip">찌를 던졌어요. 입질을 기다려요…</p>}
      {stage === 'play' && (
        <div className="hunt-ui card">
          <p>
            <b>{kind === 'fish' ? '입질이 왔어요!' : '바로 앞이에요!'}</b> 표시가 초록 구간에 올 때 누르세요.
          </p>
          <Timing tier={cur.tier} label={kind === 'fish' ? '당기기!' : '휘두르기!'} onDone={finish} />
        </div>
      )}
      {stage === 'result' && (
        <div className="hunt-ui card result">
          <img src={imageOf(cur.id)} alt="" className={got ? 'pop' : 'shadow'} />
          {got ? (
            <p>
              <b>{nameOf(cur.id)}</b> 잡았어요! 조개 +{SHELLS[cur.tier]} <span className="chip">{TIERS[cur.tier].label}</span>
              {classNew && <strong className="new"> 반에서 처음 발견!</strong>}
            </p>
          ) : (
            <p>{kind === 'fish' ? '앗, 놓쳤어요… 뭔가 큰 녀석이었는데!' : '앗, 날아가 버렸어요…'}</p>
          )}
          <button autoFocus onClick={done}>
            확인
          </button>
        </div>
      )}
    </Scene>
  )
}

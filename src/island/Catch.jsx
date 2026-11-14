import { useEffect, useRef, useState } from 'react'
import { doc, increment, serverTimestamp, setDoc } from 'firebase/firestore'
import { syncClock, isClassTime, kst } from '../clock'
import { yearCol } from '../data'
import { tell } from '../popup'
import { KINDS, TIERS, draw, imageOf, nameOf, speciesId, tierOf } from './species'

// 막대 위를 오가는 표시가 초록 구간 안에 있을 때 [지금!]을 누르면 성공. 희귀할수록 구간이 좁고 빠르다.
const SHELLS = [1, 2, 4, 8, 20]

function Timing({ tier, onDone }) {
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
        지금!
      </button>
    </div>
  )
}

// kind: 'fish' | 'bug'. cols: 반 전체 도감 기록, left: 오늘 남은 횟수
export default function Catch({ me, kind, cols, left, limit }) {
  const [stage, setStage] = useState('idle') // idle | play | result
  const [cur, setCur] = useState(null)
  const [got, setGot] = useState(false)
  const k = KINDS[kind]
  const mine = cols.find((c) => c.id === me.no) ?? {}
  const ref = doc(yearCol(me.year, 'collections'), me.no)

  async function cast() {
    await syncClock()
    const t = kst()
    if (isClassTime(t)) return tell('수업 시간이에요. 쉬는 시간이나 방과 후에 다시 와요, 총총!')
    if (left < 1) return tell('오늘 횟수를 다 썼어요. 내일 또 만나요!')
    // 던지는 순간 횟수를 쓴다. 놓친 뒤에 새로고침해도 되살릴 수 없다.
    await setDoc(ref, { name: me.name, days: { [t.ymd]: increment(1) } }, { merge: true })
    const n = draw()
    setCur({ n, id: speciesId(kind, n), tier: tierOf(n) })
    setStage('play')
  }

  async function finish(ok) {
    setGot(ok)
    setStage('result')
    if (!ok) return
    const first = !mine.items?.[cur.id]
    // 희귀할수록 조개를 많이 준다(꾸미기 상점에서 쓴다)
    await setDoc(ref, { name: me.name, shells: increment(SHELLS[cur.tier]), items: { [cur.id]: { n: increment(1), ...(first ? { first: serverTimestamp() } : {}) } } }, { merge: true })
  }

  const classNew = cur && !cols.some((c) => c.items?.[cur.id])

  return (
    <section className="card catch">
      <h3>
        {k.label} 잡기 <small>오늘 남은 횟수 {left}/{limit}</small>
      </h3>
      {stage === 'idle' && (
        <button onClick={cast} disabled={left < 1}>
          {k.tool}
        </button>
      )}
      {stage === 'play' && (
        <>
          <p>뭔가 걸렸어요! 표시가 초록 구간에 올 때 누르세요.</p>
          <Timing tier={cur.tier} onDone={finish} />
        </>
      )}
      {stage === 'result' && (
        <div className="result">
          <img src={imageOf(cur.id)} alt="" className={got ? '' : 'shadow'} />
          {got ? (
            <p>
              <b>{nameOf(cur.id)}</b> 잡았어요! 조개 +{SHELLS[cur.tier]} <span className="chip">{TIERS[cur.tier].label}</span>
              {classNew && <strong className="new"> 반에서 처음 발견!</strong>}
            </p>
          ) : (
            <p>앗, 놓쳤어요… 뭔가 큰 녀석이었는데!</p>
          )}
          <button onClick={() => setStage('idle')}>확인</button>
        </div>
      )}
    </section>
  )
}

import { useMemo, useRef, useState } from 'react'

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

// 걸어 다닐 수 있는 영역 안으로 목표 지점을 끌어온다. walk: 타원 {cx,cy,rx,ry} 또는 사각형 {x0,x1,y0,y1} (모두 %)
export function limit(walk, x, y) {
  if (walk.rx) {
    const dx = (x - walk.cx) / walk.rx
    const dy = (y - walk.cy) / walk.ry
    const d = Math.hypot(dx, dy)
    return d <= 1 ? [x, y] : [walk.cx + dx / d * walk.rx, walk.cy + dy / d * walk.ry]
  }
  return [clamp(x, walk.x0, walk.x1), clamp(y, walk.y0, walk.y1)]
}

// 같은 번호는 항상 같은 값이라 화면이 다시 그려져도 효과가 깜빡이지 않는다.
const spread = (n, f) => Array.from({ length: n }, (_, i) => f(i))
const pr = (i, k) => ((i * k) % 97) / 97

function Weather({ kind }) {
  const drops = useMemo(() => spread(70, (i) => ({ left: pr(i, 37) * 100, delay: pr(i, 53) * 2, dur: 0.6 + pr(i, 29) * 0.5 })), [])
  const flakes = useMemo(() => spread(50, (i) => ({ left: pr(i, 41) * 100, delay: pr(i, 59) * 8, dur: 6 + pr(i, 23) * 6, size: 5 + pr(i, 31) * 6 })), [])
  if (kind === 'rain' || kind === 'storm')
    return (
      <div className="fx rain" aria-hidden="true">
        {drops.map((d, i) => (
          <i key={i} style={{ left: `${d.left}%`, animationDelay: `${d.delay}s`, animationDuration: `${d.dur}s` }} />
        ))}
        {kind === 'storm' && <div className="flash" />}
      </div>
    )
  if (kind === 'snow')
    return (
      <div className="fx snow" aria-hidden="true">
        {flakes.map((f, i) => (
          <i key={i} style={{ left: `${f.left}%`, width: f.size, height: f.size, animationDelay: `${f.delay}s`, animationDuration: `${f.dur}s` }} />
        ))}
      </div>
    )
  if (kind === 'fog')
    return (
      <div className="fx fog" aria-hidden="true">
        <b />
        <b />
      </div>
    )
  return null
}

// 배경 그림 위에 시간대 색, 떠다니는 구름 그림자, 날씨를 겹치고 그 위를 캐릭터가 걸어 다닌다.
// bg: scenes/ 아래 파일 이름, phase: dawn|day|dusk|night, kind: 날씨 종류, spots: [{x,y,w,img,label,onClick}]
export default function Scene({ bg, phase, kind, walk, character, bubble, spots = [], children }) {
  const [pos, setPos] = useState({ x: 50, y: (walk.cy ?? (walk.y0 + walk.y1) / 2) + 6, flip: false, moving: false })
  const [talk, setTalk] = useState(false)
  const timer = useRef()
  const dim = phase === 'night' || kind === 'cloudy' || kind === 'rain' || kind === 'storm'
  const bugs = useMemo(() => spread(14, (i) => ({ left: pr(i, 43) * 100, top: pr(i, 61) * 100, delay: pr(i, 17) * 6 })), [])

  function go(x, y) {
    const [nx, ny] = limit(walk, x, y)
    setPos((p) => ({ x: nx, y: ny, flip: nx < p.x, moving: true }))
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setPos((p) => ({ ...p, moving: false })), 900)
  }
  function click(e) {
    const r = e.currentTarget.getBoundingClientRect()
    go(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100)
  }
  function key(e) {
    const step = { ArrowLeft: [-7, 0], ArrowRight: [7, 0], ArrowUp: [0, -7], ArrowDown: [0, 7] }[e.key]
    if (step) {
      e.preventDefault()
      go(pos.x + step[0], pos.y + step[1])
    }
  }

  return (
    <div className="scene" data-phase={phase} data-wx={kind} onClick={click} onKeyDown={key} tabIndex={0} role="application" aria-label="화면을 누르면 캐릭터가 걸어가요. 방향키로도 움직여요.">
      <img className="bg" src={`assets/scenes/${bg}.webp`} alt="" draggable="false" />

      {/* 시간대 색 */}
      <div className="sky" aria-hidden="true" />
      {/* 떠다니는 구름 그림자(밤에는 없음) */}
      {phase !== 'night' && (
        <div className={`clouds ${dim ? 'heavy' : ''}`} aria-hidden="true">
          <i style={{ top: '8%', animationDuration: '70s' }} />
          <i style={{ top: '45%', animationDuration: '95s', animationDelay: '-40s' }} />
          <i style={{ top: '72%', animationDuration: '80s', animationDelay: '-15s' }} />
        </div>
      )}
      {phase === 'night' && (
        <div className="fireflies" aria-hidden="true">
          {bugs.map((b, i) => (
            <i key={i} style={{ left: `${b.left}%`, top: `${b.top}%`, animationDelay: `${b.delay}s` }} />
          ))}
        </div>
      )}

      {spots.map((s) => (
        <button
          key={s.img}
          className="spot"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.w}%`, zIndex: Math.round(s.y) }}
          onClick={(e) => {
            e.stopPropagation()
            s.onClick()
          }}
        >
          <img src={`assets/${s.img}.webp`} alt="" draggable="false" />
          {s.label && <span>{s.label}</span>}
        </button>
      ))}

      {character && (
        <button
          className={`me ${pos.moving ? 'walking' : ''}`}
          style={{ left: `${pos.x}%`, top: `${pos.y}%`, zIndex: Math.round(pos.y) }}
          onClick={(e) => {
            e.stopPropagation()
            setTalk(!talk)
          }}
          aria-label="내 캐릭터"
        >
          {talk && bubble && <span className="bubble">{bubble}</span>}
          <img src={`assets/characters/char_0${character}.webp`} alt="" draggable="false" style={{ transform: pos.flip ? 'scaleX(-1)' : undefined }} />
        </button>
      )}

      <Weather kind={kind} />
      {children}
    </div>
  )
}

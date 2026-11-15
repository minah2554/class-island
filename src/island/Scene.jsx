import { useEffect, useMemo, useRef, useState } from 'react'
import { blockedAt, clearWay, route } from './path'

// 멀리(위쪽) 있을수록 작게 보이게 해서 깊이감을 준다
// 캐릭터는 건물의 절반쯤 크기(멀리 5% ~ 가까이 9%)
const depth = (y) => 6.2 + y * 0.05
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

// 혼자 돌아다니는 캐릭터. target이 생기면 그곳으로 걸어가고 도착하면 onArrive를 부른다.
function Walker({ walk, blocks = [], character, bubble, name, who, start, target, onArrive, hold }) {
  const [pos, setPos] = useState({ ...start, flip: false, view: '', moving: false, dur: 0 })
  const [missingViews, setMissingViews] = useState({})
  const [talk, setTalk] = useState(false)
  const at = useRef(start) // 지금 향하는 곳
  const timers = useRef([])
  const solid = useRef(blocks)
  solid.current = blocks
  const fit = (p) => {
    const [x, y] = limit(walk, p.x, p.y)
    return { x, y }
  }
  // 점들을 차례로 걷고, 다 걸으면 done을 부른다
  const walkAlong = (points, done) => {
    const [p, ...rest] = points
    const dur = go(p.x, p.y)
    later(() => (rest.length ? walkAlong(rest, done) : done?.()), dur * 1000 + (rest.length ? 0 : 150))
  }
  const later = (f, ms) => timers.current.push(setTimeout(f, ms))

  // 걷는 속도는 늘 같게: 먼 곳은 오래, 가까운 곳은 짧게 (화면이 3:2라 가로를 1.5배로 계산). 걸리는 시간(초)을 돌려준다.
  function go(x, y) {
    const [nx, ny] = limit(walk, x, y)
    const p = at.current
    const dur = Math.min(3.5, Math.max(0.2, Math.hypot((nx - p.x) * 1.5, ny - p.y) * 0.06))
    const dx = nx - p.x
    const dy = ny - p.y
    const view = Math.abs(dx * 1.5) >= Math.abs(dy) && dx !== 0 ? 'side' : dy < 0 ? 'back' : ''
    at.current = { x: nx, y: ny }
    setPos((q) => ({ x: nx, y: ny, flip: view === 'side' ? dx < 0 : Math.abs(dx) < 0.5 ? q.flip : dx < 0, view, moving: true, dur }))
    later(() => setPos((q) => ({ ...q, moving: false })), dur * 1000)
    return dur
  }

  useEffect(() => {
    const clear = () => (timers.current.forEach(clearTimeout), (timers.current = []))
    clear()
    if (target) {
      // 건물 앞까지: 막는 물건이 있으면 옆으로 돌아서 간다
      walkAlong(route(solid.current, at.current, fit(target), fit), onArrive)
      return clear
    }
    if (hold) return clear // 낚시·채집 중에는 제자리에 있는다
    // 산책: 가까운 곳으로 조금 걷고, 잠깐 쉬었다가 다시 걷는다
    const stroll = () => {
      const p = at.current
      // 물건이 없는 곳, 가는 길이 뚫린 곳을 고른다(몇 번 해 봐도 없으면 이번에는 쉰다)
      let dur = 0
      for (let i = 0; i < 8 && !dur; i++) {
        const d = fit({ x: p.x + (Math.random() - 0.5) * 50, y: p.y + (Math.random() - 0.5) * 34 })
        if (!blockedAt(solid.current, d) && clearWay(solid.current, p, d)) dur = go(d.x, d.y)
      }
      later(stroll, dur * 1000 + 500 + Math.random() * 1300)
    }
    later(stroll, 300 + Math.random() * 500)
    return clear
  }, [target, hold])

  const front = `assets/characters/char_${String(character).padStart(2, '0')}`
  const variant = pos.moving && pos.view ? `${front}_${pos.view}` : null
  const sprite = variant && !missingViews[variant] ? variant : front

  return (
    <button
      className={`me ${pos.moving ? 'walking' : ''}`}
      style={{ left: `${pos.x}%`, top: `${pos.y}%`, width: `${depth(pos.y)}%`, zIndex: Math.round(pos.y), transitionDuration: `${pos.dur}s`, '--lean': pos.flip ? -1 : 1 }}
      onClick={() => setTalk(!talk)}
      aria-label={name || '내 캐릭터'}
    >
      {talk && bubble && (
        <span className="bubble">
          {(who || name) && <b className="who">{who || name}</b>}
          {bubble}
        </span>
      )}
      <img src={`${sprite}.webp`} alt="" draggable="false" onError={() => { if (sprite !== front) setMissingViews((views) => ({ ...views, [sprite]: true })) }} style={{ transform: (sprite === front ? pos.flip : pos.view === 'side' && pos.flip) ? 'scaleX(-1)' : undefined }} />
      {name && <span className="tag">{name}</span>}
    </button>
  )
}

// 배경 그림 위에 시간대 색, 떠다니는 구름 그림자, 날씨를 겹치고 그 위를 캐릭터가 스스로 돌아다닌다.
// 건물(이름표가 있는 spot)을 누르면 캐릭터가 그 앞까지 걸어간 뒤 onClick이 불린다.
// bg: scenes/ 아래 파일 이름, phase: dawn|day|dusk|night, kind: 날씨 종류, spots: [{x,y,w,img,label,onClick}]
export default function Scene({ bg, phase, kind, walk, character, bubble, who, spots = [], others = [], hold, lights = 0, indoor, blocks = [], children }) {
  if (indoor) { phase = "day"; kind = "clear" }
  const [target, setTarget] = useState(null)
  const dim = phase === 'night' || kind === 'cloudy' || kind === 'rain' || kind === 'storm'
  const bugs = useMemo(() => spread(14, (i) => ({ left: pr(i, 43) * 100, top: pr(i, 61) * 100, delay: pr(i, 17) * 6 })), [])
  // 발밑 타원: 건물·장식은 밟고 지나갈 수 없다(물고기 그림자·곤충은 뺀다)
  const solid = [
    ...spots.filter((s) => s.w && !(s.cls ?? '').includes('critter')).map((s) => ({ x: s.x, y: s.y - 0.5, rx: s.w * 0.42 + 1.5, ry: s.w * 0.26 + 1.5 })),
    ...blocks,
  ]
  const center = { x: 50, y: (walk.cy ?? (walk.y0 + walk.y1) / 2) + 6 }
  // 처음 서는 곳이 물건 위라면 그 앞(아래쪽)으로 내려 선다
  for (let i = 0; i < 20 && blockedAt(solid, center); i++) center.y += 2

  return (
    <div className="scene" data-phase={phase} data-wx={kind} style={{ '--lights': lights }}>
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

      {spots.map((s) => {
        const style = { left: `${s.x}%`, top: `${s.y}%`, width: `${s.w}%`, zIndex: Math.round(s.y) }
        const key = s.key ?? s.img
        const img = s.node ?? <img src={`assets/${s.img}.webp`} alt="" draggable="false" />
        // onClick이 없는 것은 장식이라 누를 수 없다
        if (!s.onClick) return <div key={key} className={`spot decor ${s.cls ?? ''}`} style={style}>{img}</div>
        return (
          <button
            key={key}
            className={`spot ${s.cls ?? ''} ${target?.key === key ? 'going' : ''}`}
            style={{ ...style, ...s.style }}
            aria-label={s.label || s.name}
            onClick={() => {
              if (s.guard && !s.guard()) return
              // 캐릭터가 그 앞(stand)까지 걸어간 뒤에 onClick이 불린다
              character ? setTarget({ ...(s.stand ?? { x: s.x, y: s.y + s.w * 0.26 + 3 }), key, fn: s.onClick }) : s.onClick()
            }}
          >
            {img}
            {s.label && <span>{s.label}</span>}
          </button>
        )
      })}

      {character && (
        <Walker
          walk={walk}
          blocks={solid}
          character={character}
          bubble={bubble}
          who={who}
          start={center}
          target={target}
          hold={hold}
          onArrive={() => {
            const fn = target?.fn
            setTarget(null)
            fn?.()
          }}
        />
      )}
      {others.map((o) => (
        <Walker key={o.id} walk={walk} blocks={solid} character={o.character} bubble={o.bubble} name={o.name} start={{ x: o.x, y: o.y }} />
      ))}

      <Weather kind={kind} />
      {children}
    </div>
  )
}

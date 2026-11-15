// 캐릭터가 건물·장식을 뚫고 지나가지 않게 하는 간단한 길 찾기.
// 장애물은 발밑 타원 { x, y, rx, ry } (모두 화면 %).
const inside = (o, p) => ((p.x - o.x) / o.rx) ** 2 + ((p.y - o.y) / o.ry) ** 2 < 1
export const blockedAt = (blocks, p) => blocks.some((o) => inside(o, p))

// a에서 b까지 곧게 갈 수 있는가. 출발점이나 도착점을 품은 장애물은 봐준다(그 앞에 서 있거나 그 앞으로 가는 중).
export function clearWay(blocks, a, b) {
  const solid = blocks.filter((o) => !inside(o, a) && !inside(o, b))
  const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 1.2))
  for (let i = 1; i < n; i++) {
    const p = { x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n }
    if (solid.some((o) => inside(o, p))) return false
  }
  return true
}

// a에서 b까지 가는 점들. 막혀 있으면 막는 장애물 옆을 돌아가는 점을 하나 끼운다.
// shortcut: 한 번만 돌아간다. 장애물이 겹겹이면 그냥 지나가므로, 물건이 훨씬 많아지면 격자 길 찾기로 바꾼다.
export function route(blocks, a, b, fit = (p) => p) {
  if (clearWay(blocks, a, b)) return [b]
  const around = blocks
    .filter((o) => !inside(o, a) && !inside(o, b))
    .flatMap((o) => [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]].map(([sx, sy]) => fit({ x: o.x + sx * (o.rx + 3), y: o.y + sy * (o.ry + 2.5) })))
    .filter((w) => !blockedAt(blocks, w) && clearWay(blocks, a, w) && clearWay(blocks, w, b))
    .sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) + Math.hypot(b.x - p.x, b.y - p.y) - Math.hypot(q.x - a.x, q.y - a.y) - Math.hypot(b.x - q.x, b.y - q.y))
  return around.length ? [around[0], b] : [b]
}

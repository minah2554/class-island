// 섬 선물: 기록이 좋으면 내 섬에 낮 아이템 1개 + 밤 조명 1개가 한 쌍으로 생긴다.
// g = years/{year}/gifts/{학번} 문서: { months: { 'YYYY-MM': { perfect, book } }, got(받은 청소면제권), bonus(선생님이 직접 준 것) }
//  - 한 달 독서기록을 모두 낸 달마다 1쌍 (perfect)
//  - 월말 독서기록장 제출 체크마다 1쌍 (book)
//  - 받은 청소면제권 5장마다 1쌍
//  - 선생님이 따로 준 선물(1인 1역 등)마다 1쌍
export function giftParts(g = {}) {
  const months = Object.values(g.months ?? {})
  return {
    perfect: months.filter((m) => m.perfect).length,
    book: months.filter((m) => m.book).length,
    tickets: Math.floor((g.got ?? 0) / 5),
    bonus: Math.max(0, g.bonus ?? 0),
  }
}
export const giftCount = (g) => Object.values(giftParts(g)).reduce((a, b) => a + b, 0)

// 한 달을 잘했는지: 그 달 마지막 날까지 기록됐고 ✕가 하나도 없다(기타 사유는 괜찮다). vals: 그 달 평일 순서대로의 값
export const perfectMonth = (vals) => !!vals.length && typeof vals[vals.length - 1] === 'string' && !vals.includes('x')

// 내 섬에 놓이는 자리(%). 낮에는 나무·꽃이, 밤에는 가로등이 받은 선물 수만큼 앞에서부터 놓인다.
// 나무·꽃은 섬 배경 그림에서 오려 낸 것이라(scripts/nature.mjs) 배경과 같은 그림체다.
export const DAY_ITEMS = [
  { img: 'nature/flower_a', x: 34, y: 60, w: 9.5 },
  { img: 'nature/tree_apple', x: 26, y: 46, w: 15 },
  { img: 'nature/flower_b', x: 62, y: 76, w: 11.5 },
  { img: 'nature/tree_lemon', x: 71, y: 42, w: 14 },
  { img: 'nature/flower_a', x: 19, y: 66, w: 9.5 },
  { img: 'nature/tree_apple', x: 31, y: 74, w: 15 },
  { img: 'nature/flower_b', x: 58, y: 54, w: 11.5 },
  { img: 'nature/tree_lemon', x: 47, y: 74, w: 14 },
].map((d, i) => ({ ...d, key: `nature${i}`, cls: 'patch' }))
export const LIGHTS = [[40, 46], [61, 40], [54, 66], [27, 60], [77, 54], [46, 84], [18, 48], [84, 46]].map(([x, y]) => ({ img: 'decor/decor_03', x, y, w: 6 }))

// 오늘 채집을 할 수 있는가. 못 하면 이유(글)를, 할 수 있으면 null을 돌려준다.
//  - 오늘 지각했으면 안 된다.
//  - 가장 최근에 기록된 독서기록장이 ✕(안 냄)이면 안 된다. 기타 사유(병결 등)는 괜찮다.
// reading: { 'YYYY-MM-DD': 'o'|'x'|사유 }, tardyDates: ['YYYY-MM-DD'], today: 'YYYY-MM-DD'
export function catchBlock(reading = {}, tardyDates = [], today) {
  if (tardyDates.includes(today)) return '오늘은 지각을 해서 채집을 쉬어요. 내일은 일찍 와요, 총총!'
  const last = Object.keys(reading).filter((d) => d <= today && reading[d]).sort().pop()
  if (last && reading[last] === 'x') return '독서기록장을 내지 않아서 채집을 쉬어요. 다음에 내면 다시 할 수 있어요, 총총!'
  return null
}

// 게시판 랭킹: rows에서 key 값이 큰 순(asc면 작은 순)으로 1~3위. 동점은 같은 등수로 이름을 묶는다.
// 큰 순 랭킹에서 0은 뺀다. 한 등수에 4명이 넘으면 "외 N명"으로 줄인다.
export function topRanks(rows, key, asc = false) {
  const vals = [...new Set(rows.map((r) => r[key]))].filter((v) => asc || v > 0).sort((a, b) => (asc ? a - b : b - a))
  const out = []
  let rank = 1
  for (const v of vals) {
    if (rank > 3) break
    const who = rows.filter((r) => r[key] === v).map((r) => r.name)
    out.push({ rank, v, names: who.length > 4 ? `${who.slice(0, 3).join(', ')} 외 ${who.length - 3}명` : who.join(', ') })
    rank += who.length
  }
  return out
}

// 독서기록장 연속 성실 달 수. months: 오래된 달부터, 그 학생의 그 달 기록 값들.
// 가장 최근 달부터 거꾸로, "기록이 있고 ✕가 없는 달"이 이어진 수를 센다(기타 사유는 괜찮다).
export function readingStreak(months) {
  let n = 0
  for (let i = months.length - 1; i >= 0 && months[i].length && !months[i].includes('x'); i--) n++
  return n
}

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

// 내 섬에 놓이는 자리(%). 낮 아이템과 밤 조명은 받은 쌍의 수만큼 앞에서부터 놓인다.
export const DAY_ITEMS = [
  { img: 'decor/decor_04', x: 30, y: 50, w: 10 },
  { img: 'decor/decor_02', x: 66, y: 42, w: 9 },
  { img: 'decor/decor_06', x: 38, y: 74, w: 6 },
  { img: 'decor/decor_08', x: 22, y: 66, w: 11 },
  { img: 'decor/decor_05', x: 70, y: 76, w: 11 },
  { img: 'decor/decor_12', x: 35, y: 36, w: 7 },
  { img: 'decor/decor_10', x: 50, y: 56, w: 12 },
  { img: 'decor/decor_01', x: 58, y: 72, w: 11 },
]
export const LIGHTS = [
  { img: 'decor/decor_03', x: 40, y: 44, w: 5 },
  { img: 'decor/decor_03', x: 61, y: 38, w: 5 },
  { img: 'decor/decor_11', x: 54, y: 66, w: 7 },
  { img: 'decor/decor_03', x: 27, y: 58, w: 5 },
  { img: 'decor/decor_03', x: 76, y: 52, w: 5 },
  { img: 'decor/decor_03', x: 46, y: 82, w: 5 },
  { img: 'decor/decor_03', x: 18, y: 46, w: 5 },
  { img: 'decor/decor_03', x: 84, y: 44, w: 5 },
]

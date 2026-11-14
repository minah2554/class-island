export const pad2 = (n) => String(n).padStart(2, '0')

// 그 달의 평일 날짜 목록(주말과 쉬는 날 제외)
export function weekdays(year, month, off = []) {
  const days = []
  for (let d = new Date(year, month - 1, 1); d.getMonth() === month - 1; d.setDate(d.getDate() + 1))
    if (d.getDay() % 6 && !off.includes(d.getDate())) days.push(d.getDate())
  return days
}

// 학년도의 달: 3~12월은 그 해, 1~2월은 다음 해
export const schoolMonths = (sy) =>
  [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2].map((m) => {
    const y = m < 3 ? sy + 1 : sy
    return { m, y, id: `${y}-${pad2(m)}` }
  })

// 면제권 변경 검증. type: give(배부) | use(반납·사용) | take(삭제·회수)
export function applyTickets(cur, type, n) {
  const got = cur?.got ?? 0
  const used = cur?.used ?? 0
  const next = { got: got + (type === 'give' ? n : type === 'take' ? -n : 0), used: used + (type === 'use' ? n : 0) }
  if (next.used > next.got)
    return { error: `받은 ${got}장, 사용 ${used}장이라 ${n}장을 ${type === 'use' ? '사용' : '삭제'}할 수 없습니다` }
  return { next }
}

// 아직 처리하지 않은 지각 벌칙 수 (3회마다 1건)
export const owed = (tardyCount, penaltyCount) => Math.max(0, Math.floor(tardyCount / 3) - penaltyCount)

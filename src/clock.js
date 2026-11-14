// 서버 시계: 학생이 기기 시간을 바꿔도 수업 시간 잠금이 풀리지 않도록, 접속한 서버의 Date 헤더로 보정한다.
let offset = 0
export const syncClock = () =>
  fetch(location.origin + location.pathname, { method: 'HEAD', cache: 'no-store' })
    .then((r) => {
      const d = r.headers.get('date')
      if (d) offset = new Date(d) - Date.now()
    })
    .catch(() => {}) // 실패하면 기기 시계를 그대로 쓴다
export const now = () => new Date(Date.now() + offset)

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
// 한국 시간(KST) 기준의 날짜·시·요일
export function kst(d = now()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short',
    }).formatToParts(d).map((x) => [x.type, x.value]),
  )
  return { ymd: `${p.year}-${p.month}-${p.day}`, h: Number(p.hour), min: Number(p.minute), dow: DOW.indexOf(p.weekday) }
}

// 평일 9시~16시는 수업 시간
export const isClassTime = ({ h, dow }) => dow >= 1 && dow <= 5 && h >= 9 && h < 16

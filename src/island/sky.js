export const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// 하루를 새벽·낮·노을·밤으로 나눈다. 일출·일몰은 날씨 서버가 알려 주는 값(분), 없으면 기본값.
export function phaseOf(min, rise = 390, set = 1080) {
  if (min >= rise - 40 && min < rise + 50) return 'dawn'
  if (min >= rise + 50 && min < set - 60) return 'day'
  if (min >= set - 60 && min < set + 30) return 'dusk'
  return 'night'
}

// 날씨 코드(WMO) → 화면 효과 종류
export function weatherKind(code) {
  if (code === 0 || code === 1) return { kind: 'clear', label: '맑음' }
  if (code === 2 || code === 3) return { kind: 'cloudy', label: '구름 많음' }
  if (code === 45 || code === 48) return { kind: 'fog', label: '안개' }
  if (code >= 95) return { kind: 'storm', label: '천둥번개' }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { kind: 'snow', label: '눈' }
  if (code >= 51 && code <= 82) return { kind: 'rain', label: '비' }
  return { kind: 'clear', label: '맑음' }
}

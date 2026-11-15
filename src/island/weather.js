// 서울 구로구 궁동 날씨(Open-Meteo, 키 없이 무료). 위도·경도만 보내고 개인정보는 보내지 않는다.
// shortcut: 좌표는 궁동 근처 대략값이다(예보 격자가 수 km라 영향 없음). 정확히 바꾸려면 아래 두 숫자만 고친다.
const URL =
  'https://api.open-meteo.com/v1/forecast?latitude=37.495&longitude=126.836' +
  '&current=temperature_2m,weather_code&daily=sunrise,sunset&timezone=Asia%2FSeoul&forecast_days=1'
const KEY = 'chongchong-weather'
const TTL = 30 * 60 * 1000 // 30분 동안은 저장해 둔 값을 쓴다

// 반환: { temp, code, sunrise: '06:41', sunset: '17:20' } 또는 실패 시 null
export async function getWeather() {
  let saved = null
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (saved && Date.now() - saved.at < TTL) return saved.data
  } catch {
    /* 저장소를 못 쓰면 매번 새로 받는다 */
  }
  try {
    const j = await (await fetch(URL, { signal: AbortSignal.timeout(8000) })).json()
    const data = {
      temp: Math.round(j.current.temperature_2m),
      code: j.current.weather_code,
      sunrise: j.daily.sunrise[0].slice(11, 16),
      sunset: j.daily.sunset[0].slice(11, 16),
    }
    try {
      localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), data }))
    } catch {
      /* 무시 */
    }
    return data
  } catch {
    // 못 받았으면 6시간 안에 저장한 값이라도 보여 준다(맑음·흐림은 금방 바뀌지 않는다)
    return saved && Date.now() - saved.at < 6 * 3600 * 1000 ? saved.data : null
  }
}

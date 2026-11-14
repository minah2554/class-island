import { useEffect, useRef, useState } from 'react'

// 시간에 따라 바뀌는 배경음악: 오전(5~12시)·오후(12~18시)·밤. 작게 틀고, 버튼으로 끌 수 있다.
export const trackOf = (hour) => (hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 18 ? 'afternoon' : 'night')
const VOLUME = 0.18
const KEY = 'island-bgm-off'

// track을 주면 그 곡을, 아니면 hour(시)에 맞는 곡을 튼다. float면 화면 오른쪽 위에 떠 있는 버튼이 된다.
export default function Bgm({ hour, track: fixed, float }) {
  const audio = useRef()
  const [off, setOff] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  })
  const track = fixed ?? trackOf(hour)

  useEffect(() => {
    const el = audio.current
    el.volume = VOLUME
    if (off) return el.pause()
    // 브라우저는 화면을 한 번 누르기 전에는 소리를 못 틀게 한다. 막히면 첫 터치 때 다시 튼다.
    const play = () => el.play().catch(() => {})
    play()
    addEventListener('pointerdown', play, { once: true })
    return () => removeEventListener('pointerdown', play)
  }, [off, track])

  function toggle() {
    try {
      localStorage.setItem(KEY, off ? '0' : '1')
    } catch {
      /* 저장 못 해도 이번에는 적용된다 */
    }
    setOff(!off)
  }

  return (
    <>
      <audio ref={audio} src={`assets/bgm/${track}.mp3`} loop preload="none" />
      <button type="button" className={`ghost sound ${float ? 'float' : ''}`} onClick={toggle} aria-pressed={!off} aria-label={off ? '배경음악 켜기' : '배경음악 끄기'} title={off ? '배경음악 켜기' : '배경음악 끄기'}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
          {off ? <path d="M17 9l5 6M22 9l-5 6" /> : <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />}
        </svg>
      </button>
    </>
  )
}

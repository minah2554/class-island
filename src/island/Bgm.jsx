import { useEffect, useRef, useState } from 'react'

// 시간에 따라 바뀌는 배경음악: 오전(5~12시)·오후(12~18시)·밤. 작게 틀고, 버튼으로 끌 수 있다.
export const trackOf = (hour) => (hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 18 ? 'afternoon' : 'night')
const VOLUME = 0.18
const KEY = 'island-bgm-off'

export default function Bgm({ hour }) {
  const audio = useRef()
  const [off, setOff] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  })
  const track = trackOf(hour)

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
      <button className="ghost" onClick={toggle} aria-pressed={!off}>
        {off ? '음악 켜기' : '음악 끄기'}
      </button>
    </>
  )
}

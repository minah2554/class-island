import { useState } from 'react'
import { addDoc, serverTimestamp } from 'firebase/firestore'
import { yearCol } from '../data'
import { tell } from '../popup'
import { badWord } from './banned'
import { useWhere, when } from './hooks'

const LINES = [
  '어서 와, 총총!',
  '오늘도 섬 한 바퀴 돌아볼까, 총총?',
  '낚시도 곤충 채집도 시간이 날 때 하자, 총총!',
  '도감을 다 채우면 큰 선물이 있대, 총총!',
  '친구 섬에도 놀러 가 봐. 방명록도 남기고, 총총!',
  '불편한 일이 있으면 민원함에 말해 줘, 총총!',
]

// 주민센터: 토끼 이장님과 이야기하고 민원을 낸다. 민원은 선생님만 이름을 볼 수 있다.
export default function Center({ me, settings, left }) {
  const [line, setLine] = useState(0)
  const mine = useWhere(me.year, 'complaints', 'from', me.no)

  async function send(e) {
    e.preventDefault()
    const text = new FormData(e.target).get('text').trim()
    if (!text) return
    if (badWord(text, settings.banned)) return tell('나쁜 말이 들어 있어요. 차분하게 다시 써 주세요, 총총!')
    await addDoc(yearCol(me.year, 'complaints'), { from: me.no, fromName: me.name, text, at: serverTimestamp() })
    e.target.reset()
    tell('민원을 냈어요. 이름은 다른 친구들에게 보이지 않아요.')
  }

  const say = line === 0 ? LINES[0] : line === 1 ? `오늘 채집 기회가 ${left}번 남았어, 총총!` : LINES[line - 1]
  return (
    <section>
      <div className="museum-head">
        <img src="assets/scenes/center.webp" alt="" />
        <div>
          <h2>주민센터</h2>
          <p>이장님: 토끼</p>
        </div>
      </div>
      <button className="mayor" onClick={() => setLine((line + 1) % (LINES.length + 1))} aria-label="이장님과 이야기하기">
        <img src="assets/npc/rabbit_talk.webp" alt="" />
        <span className="bubble">{say}</span>
      </button>
      <form className="card" onSubmit={send}>
        <h3>민원함</h3>
        <p>
          <small>다른 친구들에게는 이름이 보이지 않고, 선생님은 볼 수 있어요.</small>
        </p>
        <textarea name="text" maxLength="300" rows="4" required placeholder="바라는 점이나 불편한 점" />
        <button>민원 내기</button>
      </form>
      {mine.map((c) => (
        <article key={c.id} className="card">
          <small>{when(c)}</small>
          <p className="memo">{c.text}</p>
          {c.reply && (
            <p className="memo">
              <b>답변</b> {c.reply}
            </p>
          )}
        </article>
      ))}
    </section>
  )
}

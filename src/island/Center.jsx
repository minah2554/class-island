import { useEffect, useState } from 'react'
import { addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { yearCol } from '../data'
import { ask, tell } from '../popup'
import Scene from './Scene'
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

const KINDS = ['상담 신청', '고민', '바라는 점', '불편한 점']

// 주민센터: 토끼 섬 관리자와 이야기하고, 섬 관리자께 상담·고민·건의를 보낸다. 보낸 글은 섬 관리자와 나만 볼 수 있다.
export default function Center({ me, settings, left, scene }) {
  const [line, setLine] = useState(0)
  const [editing, setEditing] = useState(null) // 고치는 중인 글의 id
  const sent = useWhere(me.year, 'complaints', 'from', me.no)
  const ref = (id) => doc(yearCol(me.year, 'complaints'), id)
  const clean = (text) => (badWord(text, settings.banned) ? (tell('나쁜 말이 들어 있어요. 차분하게 다시 써 주세요, 총총!'), false) : true)

  async function send(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    const text = f.get('text').trim()
    if (!text || !clean(text)) return
    await addDoc(yearCol(me.year, 'complaints'), { from: me.no, fromName: me.name, kind: f.get('kind'), text, at: serverTimestamp() })
    e.target.reset()
    tell('섬 관리자께 보냈어요. 다른 친구들에게는 보이지 않아요.')
  }
  async function fix(e, id) {
    e.preventDefault()
    const text = new FormData(e.target).get('text').trim()
    if (!text || !clean(text)) return
    try {
      await updateDoc(ref(id), { text })
      setEditing(null)
    } catch {
      tell('섬 관리자가 이미 확인해서 고칠 수 없어요.')
    }
  }
  const cancel = async (id) => (await ask('보낸 글을 취소할까요? 섬 관리자께 보이지 않게 지워져요.')) && deleteDoc(ref(id)).catch(() => tell('섬 관리자가 이미 확인해서 취소할 수 없어요.'))

  // 섬 관리자가 설정에서 쓴 말이 있으면 그것을, 없으면 기본 말을 한다
  const mine = settings.mayorLines?.length ? settings.mayorLines : null
  const lines = mine ?? [...LINES.slice(0, 1), `오늘 채집 기회가 ${left}번 남았어, 총총!`, ...LINES.slice(1)]
  const n = line % lines.length
  // 가만히 있어도 7초마다 다음 말로 넘어간다
  useEffect(() => {
    const t = setTimeout(() => setLine((x) => x + 1), 7000)
    return () => clearTimeout(t)
  }, [line])
  const next = () => setLine((x) => x + 1)

  return (
    <section>
      <h2>주민센터</h2>
      {scene && (
        <Scene {...scene} indoor scale={1.5} spots={[{ x: 50, y: 64, w: 24, img: 'npc/rabbit_talk', label: '섬 관리자', cls: 'npc', onClick: next }]}>
          <button className="bubble mayor-say" onClick={next} aria-label="섬 관리자의 다음 말 듣기">
            <b className="who">섬 관리자</b>
            {lines[n]}
            <small>
              {n + 1}/{lines.length} · 눌러서 다음 말 ▶
            </small>
          </button>
        </Scene>
      )}
      {!me.teacher && (
        <form className="card" onSubmit={send}>
          <h3>섬 관리자께 보내기</h3>
          <p>
            <small>상담 신청, 고민, 바라는 점, 불편한 점을 보낼 수 있어요. 다른 친구들에게는 보이지 않고 섬 관리자만 봐요.</small>
          </p>
          <label>
            어떤 이야기인가요?
            <select name="kind">
              {KINDS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <textarea name="text" maxLength="300" rows="4" required placeholder="예: 섬 관리자, 이번 주에 상담하고 싶어요." aria-label="보낼 내용" />
          <button>보내기</button>
        </form>
      )}
      {sent.map((c) => {
        const open = !c.seen && !c.reply // 섬 관리자가 확인하기 전에는 고치거나 취소할 수 있다
        return (
          <article key={c.id} className="card">
            <small>
              {when(c)} · <span className="chip">{c.kind ?? '건의'}</span> {c.reply ? '답변이 왔어요' : c.seen ? '섬 관리자가 확인했어요' : '섬 관리자 확인 전'}
            </small>
            {editing === c.id ? (
              <form onSubmit={(e) => fix(e, c.id)}>
                <textarea name="text" maxLength="300" rows="3" required defaultValue={c.text} aria-label="고칠 내용" />
                <div className="row">
                  <button>저장</button>
                  <button type="button" className="ghost" onClick={() => setEditing(null)}>
                    그만두기
                  </button>
                </div>
              </form>
            ) : (
              <p className="memo">{c.text}</p>
            )}
            {c.reply && (
              <p className="memo">
                <b>답변</b> {c.reply}
              </p>
            )}
            {open && editing !== c.id && (
              <div className="row">
                <button className="ghost" onClick={() => setEditing(c.id)}>
                  고치기
                </button>
                <button className="ghost danger" onClick={() => cancel(c.id)}>
                  보내기 취소
                </button>
              </div>
            )}
          </article>
        )
      })}
    </section>
  )
}

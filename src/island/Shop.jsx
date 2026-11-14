import { useState } from 'react'
import { doc, increment, setDoc } from 'firebase/firestore'
import { yearCol } from '../data'
import { ask, tell } from '../popup'
import Scene from './Scene'

// 광장 꾸미기: 학생들이 조개를 모아 기부하면, 모인 돈으로 광장에 놓을 물건을 산다.
// 위치(x, y, w)는 정해 둔 자리다. decor_01(분수)은 처음부터 있다.
export const DECOR = [
  { id: 'decor_02', name: '벤치', cost: 30, x: 30, y: 76, w: 10 },
  { id: 'decor_03', name: '가로등', cost: 40, x: 70, y: 40, w: 6 },
  { id: 'decor_04', name: '꽃밭', cost: 50, x: 68, y: 80, w: 12 },
  { id: 'decor_05', name: '피크닉 테이블', cost: 60, x: 80, y: 72, w: 12 },
  { id: 'decor_06', name: '이정표', cost: 30, x: 30, y: 48, w: 7 },
  { id: 'decor_07', name: '작은 다리', cost: 80, x: 50, y: 88, w: 14 },
  { id: 'decor_08', name: '그네', cost: 80, x: 13, y: 82, w: 12 },
  { id: 'decor_09', name: '시계탑', cost: 120, x: 33, y: 33, w: 9 },
  { id: 'decor_10', name: '풍선 아치', cost: 100, x: 62, y: 52, w: 13 },
  { id: 'decor_11', name: '모닥불', cost: 60, x: 72, y: 64, w: 7 },
  { id: 'decor_12', name: '토끼 동상', cost: 150, x: 44, y: 84, w: 8 },
]

// 나의 조개 / 반 전체 기금 계산 (cols: collections 문서들, bought: 산 물건 { id: true })
export const shells = (c) => (c?.shells ?? 0) - (c?.donated ?? 0)
export const fund = (cols, bought = {}) =>
  cols.reduce((s, c) => s + (c.donated ?? 0), 0) - DECOR.filter((d) => bought[d.id]).reduce((s, d) => s + d.cost, 0)

// 상점 안에 물건이 놓이는 자리(%): 앞줄 6개, 뒷줄 5개
const SLOT = [[20, 52], [32, 52], [44, 52], [56, 52], [68, 52], [80, 52], [26, 74], [38, 74], [50, 74], [62, 74], [74, 74]]

export default function Shop({ me, cols, bought = {}, scene }) {
  const [list, setList] = useState(false)
  const mine = cols.find((c) => c.id === me.no) ?? {}
  const have = shells(mine)
  const pool = fund(cols, bought)

  async function donate(e) {
    e.preventDefault()
    const n = Math.floor(Number(new FormData(e.target).get('n')))
    if (!(n >= 1) || n > have) return tell(`1~${have}개 사이로 적어 주세요.`)
    await setDoc(doc(yearCol(me.year, 'collections'), me.no), { name: me.name, donated: increment(n) }, { merge: true })
    e.target.reset()
  }
  async function buy(d) {
    if (me.teacher) return tell('선생님은 구경만 할 수 있어요.')
    if (pool < d.cost) return tell(`기금이 모자라요. ${d.cost - pool}개 더 모여야 해요.`)
    if (await ask(`${d.name}을(를) ${d.cost}개로 살까요? 광장에 바로 놓여요.`))
      await setDoc(doc(yearCol(me.year, 'plaza'), 'decor'), { bought: { [d.id]: true } }, { merge: true })
  }

  const spots = DECOR.map((d, i) => ({
    x: SLOT[i][0],
    y: SLOT[i][1],
    w: 10,
    img: `decor/${d.id}`,
    label: bought[d.id] ? `${d.name} · 광장에 있음` : `${d.name} ${d.cost}개`,
    cls: bought[d.id] ? 'sold' : '',
    onClick: () => (bought[d.id] ? tell(`${d.name}은(는) 이미 마을 광장에 놓여 있어요.`) : buy(d)),
  }))

  return (
    <section>
      <h2>꾸미기 상점</h2>
      <p className="card">
        <b>이곳은 반 친구들이 함께 마을 광장을 꾸미는 가게예요.</b>
        <br />① 바다·숲에서 물고기와 곤충을 잡아 조개를 모아요. ② 내 조개를 아래에서 반 기금에 보태요. ③ 기금이 모이면 가게 안 물건을 눌러 사요. 산 물건은 마을 광장에 바로 놓여요.
      </p>
      {scene && <Scene {...scene} indoor spots={spots} />}
      <div className="card shopbar">
        <span>
          <img src="assets/ui/shell.webp" alt="" className="mini" /> 내 조개 <b>{have}</b>개 · 반 기금 <b>{pool}</b>개
        </span>
        {!me.teacher && (
          <form className="row" onSubmit={donate}>
            <input name="n" type="number" min="1" max={have} placeholder="기부할 개수" style={{ width: '9em' }} aria-label="기부할 조개 개수" />
            <button disabled={have < 1}>기금에 보태기</button>
          </form>
        )}
        <button className="ghost" aria-expanded={list} onClick={() => setList(!list)}>
          {list ? '아이템 닫기' : '아이템 보기'}
        </button>
      </div>
      <small>물고기·곤충을 잡으면 조개를 얻어요. 희귀할수록 많이 줘요.</small>
      {list && (
        <div className="dex">
          {DECOR.map((d) => (
            <div key={d.id} className="dex-card">
              <img src={`assets/decor/${d.id}.webp`} alt="" />
              <span>{d.name}</span>
              {bought[d.id] ? (
                <small>광장에 놓였어요</small>
              ) : (
                <button onClick={() => buy(d)} disabled={me.teacher || pool < d.cost}>
                  {d.cost}개로 사기
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

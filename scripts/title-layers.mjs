// 첫 화면 그림(scenes/title.webp)을 움직일 수 있게 나눈다: 구름·비행기를 오려 내고(투명 배경), 배경에서는 지운다.
// 실행: node scripts/title-layers.mjs  → public/assets/title/{bg,cloud1,cloud2,cloud3,plane}.webp
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const SRC = 'public/assets/scenes/title.webp'
const OUT = 'public/assets/title'
// 그림(1024x1536) 속 위치: [이름, left, top, width, height]
const PARTS = [
  ['cloud1', 40, 595, 240, 150],
  ['cloud2', 275, 720, 125, 80],
  ['cloud3', 808, 685, 180, 120],
  ['plane', 462, 600, 270, 195],
]

mkdirSync(OUT, { recursive: true })
const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H } = info
const at = (x, y) => (y * W + x) * 4
// 하늘은 위아래로만 색이 변하므로, 각 줄의 하늘색은 그림 왼쪽 끝에서 가져온다
const sky = (y) => [data[at(4, y)], data[at(4, y) + 1], data[at(4, y) + 2]]

const bg = Buffer.from(data)
for (const [name, l, t, w, h] of PARTS) {
  const cut = Buffer.alloc(w * h * 4)
  for (let y = 0; y < h; y++) {
    const s = sky(t + y)
    for (let x = 0; x < w; x++) {
      const i = at(l + x, t + y)
      const d = Math.hypot(data[i] - s[0], data[i + 1] - s[1], data[i + 2] - s[2])
      const o = (y * w + x) * 4
      cut[o] = data[i]
      cut[o + 1] = data[i + 1]
      cut[o + 2] = data[i + 2]
      cut[o + 3] = Math.max(0, Math.min(255, (d - 14) * 9)) // 하늘색과 비슷하면 투명
      bg[i] = s[0] // 배경에서는 하늘색으로 덮는다
      bg[i + 1] = s[1]
      bg[i + 2] = s[2]
    }
  }
  await sharp(cut, { raw: { width: w, height: h, channels: 4 } }).webp({ quality: 90 }).toFile(`${OUT}/${name}.webp`)
}
await sharp(bg, { raw: { width: W, height: H, channels: 4 } }).webp({ quality: 88 }).toFile(`${OUT}/bg.webp`)

// 양옆을 이어 칠할 색(위 하늘, 수평선 바로 위 하늘, 바다 위·아래)
const hex = (x, y) => '#' + [0, 1, 2].map((k) => data[at(x, y) + k].toString(16).padStart(2, '0')).join('')
console.log('sky top', hex(4, 600), 'sky horizon', hex(4, 1120), 'sea top', hex(4, 1150), 'sea bottom', hex(4, 1525))

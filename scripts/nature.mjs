// 내 섬 배경에 그려진 나무·꽃을 가장자리가 흐려지게 오려 public/assets/nature/ 에 저장한다(섬 선물로 늘어나는 나무·꽃).
// 배경과 같은 그림이라 잔디 위 어디에 놓아도 어울린다. 사용: node scripts/nature.mjs (배경이 바뀔 때만)
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const src = '이미지/개인 섬 배경.png'
const m = await sharp(src).metadata()
// [이름, 왼쪽, 위, 너비, 높이] — 배경 크기에 대한 비율
const crops = [['tree_apple', 0.07, 0.025, 0.15, 0.23], ['tree_lemon', 0.745, 0.01, 0.14, 0.21], ['flower_a', 0.225, 0.035, 0.095, 0.085], ['flower_b', 0.745, 0.635, 0.115, 0.095]]
mkdirSync('public/assets/nature', { recursive: true })
for (const [name, fx, fy, fw, fh] of crops) {
  const w = Math.round(fw * m.width), h = Math.round(fh * m.height)
  const mask = Buffer.from(`<svg width="${w}" height="${h}"><defs><radialGradient id="g"><stop offset="0.66" stop-color="#fff"/><stop offset="0.9" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}" fill="url(#g)"/></svg>`)
  await sharp(src).extract({ left: Math.round(fx * m.width), top: Math.round(fy * m.height), width: w, height: h }).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).webp({ quality: 85 }).toFile(`public/assets/nature/${name}.webp`)
}
console.log('nature', crops.length)

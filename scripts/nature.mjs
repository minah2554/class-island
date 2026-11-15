// 이미지/섬 꽃 01~05.png, 섬 나무 01~05.png(투명 배경)를 가장자리까지 잘라 public/assets/nature/ 에 저장한다(섬 선물로 늘어나는 꽃·나무).
// 사용: node scripts/nature.mjs
import sharp from 'sharp'
import { mkdirSync, readdirSync, rmSync } from 'node:fs'

mkdirSync('public/assets/nature', { recursive: true })
for (const f of readdirSync('public/assets/nature')) rmSync(`public/assets/nature/${f}`)
for (const [kor, en] of [['꽃', 'flower'], ['나무', 'tree']])
  for (let i = 1; i <= 5; i++) {
    await sharp(`이미지/섬 ${kor} 0${i}.png`).trim().resize({ width: 420, withoutEnlargement: true }).webp({ quality: 88 }).toFile(`public/assets/nature/${en}_${i}.webp`)
  }
console.log('nature 10')

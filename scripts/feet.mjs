// 건물·장식 그림에서 실제 그림이 차지하는 범위(왼쪽·오른쪽·아래, 0~1)를 재서 src/island/feet.json에 적는다.
// 그림마다 아래 여백이 달라서, 이 값으로 발밑 위치와 그림자를 맞춘다. 사용: node scripts/feet.mjs (그림이 바뀔 때만)
import sharp from 'sharp'
import { readdirSync, writeFileSync } from 'node:fs'

const out = {}
for (const dir of ['buildings', 'decor', 'nature']) {
  for (const f of readdirSync(`public/assets/${dir}`)) {
    const { data, info } = await sharp(`public/assets/${dir}/${f}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    let l = info.width, r = 0, b = 0
    for (let y = 0; y < info.height; y++)
      for (let x = 0; x < info.width; x++)
        if (data[(y * info.width + x) * 4 + 3] > 200) { // 흐린 그림자는 빼고 또렷한 부분만
          if (x < l) l = x
          if (x > r) r = x
          if (y > b) b = y
        }
    const p = (v, n) => Math.round((v / n) * 100) / 100
    if (dir === 'nature') { l = info.width * 0.12; r = info.width * 0.88 - 1 } // 잎이 넓어도 그림자는 밑동 쪽에만
    out[`${dir}/${f.replace('.webp', '')}`] = { l: p(l, info.width), r: p(r + 1, info.width), b: p(b + 1, info.height) }
  }
}
writeFileSync('src/island/feet.json', JSON.stringify(out, null, 1) + '\n')
console.log(out)

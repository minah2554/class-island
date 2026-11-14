// 이미지/ 폴더의 원본(한글 이름)을 앱용 WebP로 줄여 public/assets/ 에 영문 이름으로 저장한다.
// 사용: npm run images   (원본이 바뀔 때만 다시 실행)
import sharp from 'sharp'
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const SRC = '이미지'
const OUT = 'public/assets'
const pad = (n) => String(n).padStart(2, '0')

// [원본 이름, 저장 경로, 가로 최대 픽셀]
const jobs = [
  ['섬 타이틀 배경', 'scenes/title', 1024],
  ['세계 지도', 'scenes/world', 1536],
  ['개인 섬 배경', 'scenes/island', 1536],
  ['마을 광장', 'scenes/plaza', 1536],
  ['해변 배경', 'scenes/sea', 1536],
  ['숲속 공터', 'scenes/forest', 1536],
  ['주민센터 실내', 'scenes/center', 1536],
  ['박물관 전시실', 'scenes/museum', 1536],
  ['잡화점 실내', 'scenes/shop', 1536],
  ['원룸 실내', 'scenes/house', 1536],
  ...Array.from({ length: 16 }, (_, i) => [`섬 주민 아이 ${pad(i + 1)}`, `characters/char_${pad(i + 1)}`, 512]),
  ...Array.from({ length: 16 }, (_, i) => ['side', 'back'].map((view) => [
    `섬 주민 아이 ${pad(i + 1)}_${view}`, `characters/char_${pad(i + 1)}_${view}`, 512,
  ])).flat(),
  ['토끼 촌장 기본', 'npc/rabbit', 512],
  ['토끼 촌장 말하기', 'npc/rabbit_talk', 512],
  ['빨간 지붕 목조 집', 'buildings/house', 512],
  ['빨간 우체통', 'buildings/mailbox', 512],
  ['마을 주민센터', 'buildings/center', 512],
  ['박물관', 'buildings/museum', 512],
  ['줄무늬 차양 상점', 'buildings/shop', 512],
  ['나무 게시판', 'buildings/board', 512],
  ...['돌 분수', '나무 벤치', '가로등', '화단', '피크닉 테이블', '나무 이정표', '작은 아치 다리', '그네', '시계탑', '풍선 아치', '모닥불', '토끼 석상'].map(
    (name, i) => [name, `decor/decor_${pad(i + 1)}`, 512],
  ),
  ['초록 여권', 'ui/passport', 512],
  ['노란 수상비행기', 'ui/plane', 512],
  ['별표 티켓', 'ui/ticket', 512],
  ['분홍 조개 동전', 'ui/shell', 256],
  ['흰 말풍선', 'ui/bubble', 512],
  ['곤충 채집망', 'ui/net', 512],
  ['낚싯대', 'ui/rod', 512],
  ...readdirSync(join(SRC, 'species'))
    .filter((f) => f.endsWith('.png'))
    .map((f) => [`species/${f.slice(0, -4)}`, `species/${f.slice(0, -4)}`, 256]),
]

let ok = 0
const selected = process.argv.slice(2)
for (const [name, dest, width] of jobs) {
  if (selected.length && !selected.includes(dest)) continue
  const from = join(SRC, `${name}.png`)
  if (!existsSync(from)) {
    console.warn('없음:', from)
    continue
  }
  const to = join(OUT, `${dest}.webp`)
  mkdirSync(join(OUT, dest.split('/')[0]), { recursive: true })
  await sharp(from).resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toFile(to)
  ok++
}
console.log(`${ok}/${jobs.length}장 변환 완료 → ${OUT}`)

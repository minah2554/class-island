// 물고기 50 + 곤충 50. 번호가 클수록 희귀하다(월별 구분 없이 아무 때나 잡힌다).
const FISH = '붕어 잉어 송사리 미꾸라지 금붕어 피라미 메기 가재 올챙이 개구리 은어 쏘가리 자라 다슬기 버들치 전갱이 고등어 멸치 오징어 해파리 넙치 도미 농어 문어 꽃게 흰동가리 블루탱 나비고기 해마 복어 연어 송어 뱀장어 갈치 새우 가오리 날치 불가사리 성게 소라 참치 방어 대구 아귀 바다거북 개복치 청새치 고래상어 실러캔스 황금잉어'
const BUG = '배추흰나비 노랑나비 꿀벌 무당벌레 개미 호랑나비 꽃등에 공벌레 달팽이 지렁이 소금쟁이 물방개 실잠자리 메뚜기 사마귀 매미 장수풍뎅이 사슴벌레 풍뎅이 반딧불이 말매미 하늘소 비단벌레 왕잠자리 모기 고추잠자리 귀뚜라미 방울벌레 여치 방아깨비 베짱이 대벌레 노린재 거미 물자라 도롱이벌레 무당거미 쇠똥구리 땅강아지 집게벌레 제비나비 부전나비 박각시 누에나방 말벌 넓적사슴벌레 꽃사마귀 모르포나비 헤라클레스장수풍뎅이 황금풍뎅이'

export const KINDS = {
  fish: { label: '물고기', names: FISH.split(' '), place: 'sea', tool: '낚싯대 던지기' },
  bug: { label: '곤충', names: BUG.split(' '), place: 'forest', tool: '채집망 휘두르기' },
}

// 희귀도: 뽑힐 비중(weight), 타이밍 게임의 성공 구간 너비(zone)와 속도(speed), 평균 성공률(skill, 계산용)
export const TIERS = [
  { label: '흔함', weight: 10, zone: 0.3, speed: 0.9, skill: 0.9 },
  { label: '보통', weight: 6, zone: 0.22, speed: 1.1, skill: 0.7 },
  { label: '희귀', weight: 3, zone: 0.16, speed: 1.4, skill: 0.5 },
  { label: '매우 희귀', weight: 1.4, zone: 0.11, speed: 1.7, skill: 0.35 },
  { label: '전설', weight: 0.6, zone: 0.08, speed: 2.0, skill: 0.25 },
]
export const tierOf = (n) => (n <= 20 ? 0 : n <= 35 ? 1 : n <= 44 ? 2 : n <= 49 ? 3 : 4)
export const speciesId = (kind, n) => `${kind}_${String(n).padStart(2, '0')}`
export const nameOf = (id) => KINDS[id.slice(0, -3)].names[Number(id.slice(-2)) - 1]
export const imageOf = (id) => `assets/species/${id}.webp`
export const ALL = Object.keys(KINDS).flatMap((k) => KINDS[k].names.map((_, i) => speciesId(k, i + 1)))

const totalWeight = Array.from({ length: 50 }, (_, i) => TIERS[tierOf(i + 1)].weight).reduce((a, b) => a + b)

// 희귀도 비중대로 1~50번 중 하나를 뽑는다. rand는 0~1 난수(테스트에서 고정값을 넣는다).
export function draw(rand = Math.random()) {
  let r = rand * totalWeight
  for (let n = 1; n <= 50; n++) {
    r -= TIERS[tierOf(n)].weight
    if (r < 0) return n
  }
  return 50
}

// 한 분야(50종)를 모두 모으는 데 필요한 시도 횟수의 중앙값(평균 실력 기준). 난이도 조절 확인용.
export function medianAttemptsToComplete() {
  const q = Array.from({ length: 50 }, (_, i) => {
    const t = TIERS[tierOf(i + 1)]
    return (t.weight / totalWeight) * t.skill
  })
  for (let T = 1; T < 100000; T++) if (q.reduce((p, x) => p * (1 - Math.pow(1 - x, T)), 1) >= 0.5) return T
}

// 나쁜 말 걸러내기. 띄어쓰기·기호를 섞어 피하려는 글도 잡도록 글자만 남겨서 비교한다.
// shortcut: 기본 낱말 몇 개 + 섬 관리자가 추가한 낱말만 본다. 완벽하지 않으니 섬 관리자가 편지·방명록을 보고 지울 수 있다.
export const WORDS = ['시발', '씨발', '병신', '개새끼', '새끼', '좆', '지랄', '닥쳐', '꺼져', '미친', '썅', '죽어', '죽일', '멍청', '한심', 'ㅅㅂ', 'ㅂㅅ', 'ㅈㄹ', 'ㅁㅊ', 'fuck', 'shit']

const flat = (s) => s.toLowerCase().replace(/[^0-9a-zㄱ-ㅎ가-힣]/g, '')

// 걸린 낱말을 돌려주고, 깨끗하면 null
export const badWord = (text, extra = []) =>
  [...WORDS, ...extra].find((w) => flat(w) && flat(text).includes(flat(w))) ?? null

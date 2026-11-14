export const studentEmail = (year, no, resets) => `y${year}-s${no}-r${resets}@chongchong.example`

// 로그인한 계정 이메일에서 학년도와 학번을 꺼낸다. 학생 계정이 아니면 null.
export function parseEmail(email) {
  const m = /^y(\d{4})-s(\d{4})-r\d+@/.exec(email ?? '')
  return m && { year: Number(m[1]), no: m[2] }
}

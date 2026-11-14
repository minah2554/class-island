// "학번 이름" 줄들(붙여넣기·엑셀)을 학생 목록으로 바꾼다. 구분자는 탭·쉼표·공백 모두 허용.
export function parseRoster(text) {
  const byNo = new Map()
  const errors = []
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim()
    if (!line) return
    const [no, ...rest] = line.split(/[\t,\s]+/)
    const name = rest.join(' ').trim()
    if (no === '학번') return // 머리글 줄
    if (!/^\d{4}$/.test(no)) return errors.push(`${i + 1}번째 줄: 학번은 숫자 4자리여야 합니다 (${line})`)
    if (!name) return errors.push(`${i + 1}번째 줄: 이름이 없습니다 (${line})`)
    if (byNo.has(no)) errors.push(`${i + 1}번째 줄: 학번 ${no}이 중복되어 마지막 줄로 저장합니다`)
    byNo.set(no, { no, name })
  })
  return { students: [...byNo.values()], errors }
}

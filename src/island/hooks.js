import { useEffect, useState } from 'react'
import { doc, onSnapshot, query, where } from 'firebase/firestore'
import { yearCol } from '../data'
import { short, dateOf } from '../records'

// field가 val인 문서만 실시간으로 받는다(규칙이 "내 것만 읽기"라서 조건을 꼭 붙여야 한다).
export function useWhere(year, name, field, val) {
  const [docs, setDocs] = useState([])
  useEffect(
    () => onSnapshot(query(yearCol(year, name), where(field, '==', val)), (s) => setDocs(s.docs.map((d) => ({ id: d.id, ...d.data() })))),
    [year, name, field, val],
  )
  return docs.sort((a, b) => (b.at?.seconds ?? 9e9) - (a.at?.seconds ?? 9e9)) // 새 글이 위로
}

// 문서 하나를 실시간으로 받는다. 아직 불러오기 전에는 undefined
export function useDoc(year, name, id) {
  const [data, setData] = useState(undefined)
  useEffect(() => onSnapshot(doc(yearCol(year, name), id), (s) => setData(s.data() ?? {})), [year, name, id])
  return data
}

export const when = (x) => (x.at ? short(dateOf(x)) : '방금')

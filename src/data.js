import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'

export const yearCol = (year, name) => collection(db, 'years', String(year), name)

// 학년도 아래 컬렉션을 실시간으로 구독한다.
export function useDocs(year, name) {
  const [docs, setDocs] = useState([])
  useEffect(
    () => onSnapshot(yearCol(year, name), (s) => setDocs(s.docs.map((d) => ({ id: d.id, ...d.data() })))),
    [year, name],
  )
  return docs
}

export const useStudents = (year) => useDocs(year, 'students').sort((a, b) => a.no.localeCompare(b.no))

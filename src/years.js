import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db, yearOptions } from './firebase'

// 기본 학년도(2026~내년)에 섬 관리자가 추가한 학년도를 합친 목록. 추가한 목록은 config/years에 저장된다.
export function useYears() {
  const [extra, setExtra] = useState([])
  useEffect(() => onSnapshot(doc(db, 'config', 'years'), (s) => setExtra(s.data()?.list ?? []), () => {}), [])
  return [...new Set([...yearOptions(), ...extra])].sort((a, b) => a - b)
}

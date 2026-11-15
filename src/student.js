import { createUserWithEmailAndPassword, deleteUser, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { studentEmail } from './account'
import { auth, db, pad } from './firebase'

const studentRef = (year, no) => doc(db, 'years', String(year), 'students', no)

// 학생 입장. 'ok' 또는 'new'(처음이라 비밀번호 확인 뒤 register 필요)를 돌려주고, 실패하면 Error를 던진다.
export async function enter(year, no, name, pin) {
  const index = (await getDoc(doc(db, 'loginIndex', String(year)))).data() ?? {}
  if (!(no in index)) throw new Error('명단에 없는 학번입니다. 섬 관리자께 문의하세요.')
  const email = studentEmail(year, no, index[no])
  let created = false
  try {
    await signInWithEmailAndPassword(auth, email, pad(pin))
  } catch (e) {
    if (e.code !== 'auth/invalid-credential' && e.code !== 'auth/user-not-found') throw e
    // 계정이 없으면 처음 온 학생이다. 이미 있으면 비밀번호가 틀린 것.
    await createUserWithEmailAndPassword(auth, email, pad(pin)).catch((e2) => {
      throw e2.code === 'auth/email-already-in-use' ? new Error('비밀번호가 틀렸습니다.') : e2
    })
    created = true
  }
  const me = (await getDoc(studentRef(year, no))).data()
  if (me?.name !== name.trim()) {
    await cancel(created)
    throw new Error('학번과 이름이 맞지 않습니다.')
  }
  if (!me.uid) return 'new'
  if (me.uid !== auth.currentUser.uid) {
    await signOut(auth)
    throw new Error('계정이 맞지 않습니다. 섬 관리자께 비밀번호 리셋을 요청하세요.')
  }
  return 'ok'
}

export const register = (year, no) => updateDoc(studentRef(year, no), { uid: auth.currentUser.uid })

// 등록을 끝내지 않은 계정은 지워서 다시 시도할 수 있게 한다.
export const cancel = (created = true) => (created ? deleteUser(auth.currentUser) : signOut(auth))

import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { configured } from './firebase'
import Teacher from './teacher/Teacher'
import Footer from './Footer'
import './styles.css'

function Page() {
  const [hash, setHash] = useState(location.hash)
  useEffect(() => {
    const onHash = () => setHash(location.hash)
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

  if (!configured)
    return <p className="card">Firebase 설정이 비어 있습니다. <code>src/firebaseConfig.js</code>에 값을 넣어 주세요.</p>
  if (hash.startsWith('#/teacher')) return <Teacher />
  return (
    <main className="card center">
      <h1>총총섬</h1>
      <p>섬은 아직 공사 중이에요, 총총!</p>
    </main>
  )
}

function App() {
  return (
    <>
      <Page />
      <Footer />
    </>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

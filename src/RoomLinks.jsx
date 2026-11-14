// 세 화면(섬·담당자실·교사실)을 오가는 링크. 지금 있는 화면은 빼고 보여 준다.
const ROOMS = [['#/', '섬 마을'], ['#/manager', '담당자실'], ['#/teacher', '교사실']]

export default function RoomLinks() {
  const here = location.hash.startsWith('#/teacher') ? '#/teacher' : location.hash.startsWith('#/manager') ? '#/manager' : '#/'
  return (
    <nav className="rooms" aria-label="다른 화면으로 가기">
      {ROOMS.filter(([h]) => h !== here).map(([h, label]) => (
        <a key={h} href={h}>
          {label}
        </a>
      ))}
    </nav>
  )
}

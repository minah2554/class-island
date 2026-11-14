// 세 화면(섬·담당 친구·선생님)을 오가는 버튼. 지금 있는 화면은 빼고 보여 준다. show로 보일 화면을 줄일 수 있다.
const ROOMS = [['#/', '섬으로'], ['#/manager', '담당 친구'], ['#/teacher', '선생님']]

export default function RoomLinks({ show }) {
  const here = location.hash.startsWith('#/teacher') ? '#/teacher' : location.hash.startsWith('#/manager') ? '#/manager' : '#/'
  return (
    <nav className="rooms" aria-label="다른 화면으로 가기">
      {ROOMS.filter(([h]) => h !== here && (!show || show.includes(h))).map(([h, label]) => (
        <button key={h} type="button" className="ghost" onClick={() => (location.hash = h)}>
          {label}
        </button>
      ))}
    </nav>
  )
}

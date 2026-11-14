import { VERSION } from './version'

export default function Footer() {
  return (
    <footer className="footer no-print">
      <div className="footer-in">
        <div className="f-brand">
          {/* 로고 파일이 아직 없으면 자리를 비워 둔다 */}
          <img
            src="assets/minari-logo.png"
            alt="MINARI STUDIO 로고"
            style={{ width: 34, height: 34, objectFit: 'contain' }}
            onError={(e) => (e.target.hidden = true)}
          />
          <div>
            <span className="f-wm">MINARI STUDIO</span>
            <span className="f-tag">Classroom Tools for Teachers · 총총섬</span>
          </div>
        </div>
        <div className="f-legal">
          © 2026 MINARI STUDIO. All rights reserved.<span className="sep">|</span>Chongchong Island Web App {VERSION}
          <span className="f-long">
            <br />
            본 웹앱의 디자인·아이콘·소스 코드에 대한 권리는 MINARI STUDIO에 있으며, 무단 복제 및 재배포를 금합니다.
          </span>
        </div>
      </div>
    </footer>
  )
}

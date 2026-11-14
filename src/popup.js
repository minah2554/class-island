// 화면 가운데 뜨는 알림창. 브라우저 기본 alert/confirm은 일부 기기·앱 안 브라우저에서 막히므로 직접 그린다.
function popup(message, { cancel = false, input = false } = {}) {
  return new Promise((resolve) => {
    const d = document.createElement('dialog')
    d.className = 'popup'
    d.innerHTML = '<form method="dialog"><p></p><div class="row"></div></form>'
    d.querySelector('p').textContent = message
    const row = d.querySelector('.row')
    let field
    if (input) {
      field = document.createElement('input')
      field.setAttribute('aria-label', message)
      d.querySelector('form').insertBefore(field, row)
    }
    if (cancel) {
      const no = document.createElement('button')
      no.type = 'button'
      no.className = 'ghost'
      no.textContent = '취소'
      no.onclick = () => d.close('cancel')
      row.append(no)
    }
    const yes = document.createElement('button')
    yes.value = 'ok'
    yes.textContent = '확인'
    row.append(yes)
    d.addEventListener('close', () => {
      d.remove()
      const ok = d.returnValue === 'ok'
      resolve(input ? (ok ? field.value : null) : ok)
    })
    document.body.append(d)
    d.showModal()
  })
}

export const tell = (message) => popup(message) // 알림
export const ask = (message) => popup(message, { cancel: true }) // 예/아니오 → true/false
export const askText = (message) => popup(message, { cancel: true, input: true }) // 글 입력 → 글 또는 null(취소)

import './main'
import { initShapePlayground } from './playground'
import './components/IsoRoundedCube'
import './components/IsoCylinder'

initShapePlayground()

document.querySelectorAll('[data-copy]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const text = (btn as HTMLElement).dataset.copy || ''
    try {
      await navigator.clipboard.writeText(text)
      const prev = btn.textContent
      btn.textContent = '已复制'
      setTimeout(() => { btn.textContent = prev }, 1200)
    } catch { /* ignore */ }
  })
})

const panel = document.querySelector('.config-panel')
const toggle = document.getElementById('panel-fold')
toggle?.addEventListener('click', () => {
  panel?.classList.toggle('folded')
  toggle.textContent = panel?.classList.contains('folded') ? '展开' : '收起'
})

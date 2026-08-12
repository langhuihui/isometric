import { renderSvgScene, buildSceneNodes } from './render'
import {
  getCpuPopupContent,
  getMemoryPopupContent,
  getNicPopupContent
} from './data'

// ========== 场景状态 ==========
const sceneState = {
  rotateX: 60,
  rotateZ: 45,
  perspective: 0, // SVG 正交，保留 UI 兼容
  shellDepth: 140,
  shellZ: 0,
  shellCollapsed: false,
  panX: 0,
  panY: 0,
  scale: 1,
  bendRadius: 14,
  perpLength: 28
}

const sceneHolder = () => document.getElementById('scene-holder')

function paint() {
  const el = sceneHolder()
  if (!el) return
  el.innerHTML = renderSvgScene({
    rotateX: sceneState.rotateX,
    rotateZ: sceneState.rotateZ,
    shellDepth: sceneState.shellDepth,
    shellZ: sceneState.shellZ,
    bendRadius: sceneState.bendRadius,
    perpLength: sceneState.perpLength,
    width: 1400,
    height: 950
  })
  applyPanZoom()
}

function applyPanZoom() {
  const root = sceneHolder()?.querySelector('.scene-root') as SVGGElement | null
  if (!root) return
  root.setAttribute(
    'transform',
    `translate(${sceneState.panX} ${sceneState.panY}) scale(${sceneState.scale})`
  )
}

// ========== 初始化 ==========
export function initAdminScene() {
  paint()
  setupAngleControls()
  setupShellToggle()
  setupPanZoom()
  setupNodeDelegation()
}

// ========== 角度配置 ==========
function setupAngleControls() {
  const rotateXSlider = document.getElementById('rotateX-slider') as HTMLInputElement
  const rotateZSlider = document.getElementById('rotateZ-slider') as HTMLInputElement
  const perspectiveSlider = document.getElementById('perspective-slider') as HTMLInputElement
  const bendSlider = document.getElementById('bend-slider') as HTMLInputElement
  const perpSlider = document.getElementById('perp-slider') as HTMLInputElement
  const rotateXValue = document.getElementById('rotateX-value')
  const rotateZValue = document.getElementById('rotateZ-value')
  const perspectiveValue = document.getElementById('perspective-value')
  const bendValue = document.getElementById('bend-value')
  const perpValue = document.getElementById('perp-value')
  const resetBtn = document.getElementById('reset-angles')

  function updateAngles() {
    if (rotateXSlider) sceneState.rotateX = parseInt(rotateXSlider.value, 10)
    if (rotateZSlider) sceneState.rotateZ = parseInt(rotateZSlider.value, 10)
    if (perspectiveSlider) sceneState.perspective = parseInt(perspectiveSlider.value, 10)
    if (bendSlider) sceneState.bendRadius = parseInt(bendSlider.value, 10)
    if (perpSlider) sceneState.perpLength = parseInt(perpSlider.value, 10)
    if (rotateXValue) rotateXValue.textContent = String(sceneState.rotateX)
    if (rotateZValue) rotateZValue.textContent = String(sceneState.rotateZ)
    if (perspectiveValue) perspectiveValue.textContent = String(sceneState.perspective)
    if (bendValue) bendValue.textContent = String(sceneState.bendRadius)
    if (perpValue) perpValue.textContent = String(sceneState.perpLength)
    paint()
  }

  rotateXSlider?.addEventListener('input', updateAngles)
  rotateZSlider?.addEventListener('input', updateAngles)
  bendSlider?.addEventListener('input', updateAngles)
  perpSlider?.addEventListener('input', updateAngles)
  perspectiveSlider?.addEventListener('input', () => {
    sceneState.perspective = parseInt(perspectiveSlider.value, 10)
    if (perspectiveValue) perspectiveValue.textContent = String(sceneState.perspective)
    // SVG 场景为正交投影，透视滑条仅作展示兼容
  })

  resetBtn?.addEventListener('click', () => {
    if (rotateXSlider) rotateXSlider.value = '60'
    if (rotateZSlider) rotateZSlider.value = '45'
    if (perspectiveSlider) perspectiveSlider.value = '0'
    if (bendSlider) bendSlider.value = '14'
    if (perpSlider) perpSlider.value = '28'
    sceneState.panX = 0
    sceneState.panY = 0
    sceneState.scale = 1
    updateAngles()
  })
}

// ========== 罩子收起/展开 ==========
function setupShellToggle() {
  const btn = document.getElementById('toggle-shell')
  if (!btn) return

  const originalDepth = 140
  const originalZ = 0
  const collapsedDepth = 10
  const collapsedZ = -30
  let raf: number | null = null

  function animate(toDepth: number, toZ: number, done?: () => void) {
    const fromD = sceneState.shellDepth
    const fromZ = sceneState.shellZ
    const t0 = performance.now()
    const dur = 480

    function step(t: number) {
      const p = Math.min((t - t0) / dur, 1)
      const e = 1 - Math.pow(1 - p, 3)
      sceneState.shellDepth = fromD + (toDepth - fromD) * e
      sceneState.shellZ = fromZ + (toZ - fromZ) * e
      paint()
      if (p < 1) raf = requestAnimationFrame(step)
      else done?.()
    }
    if (raf) cancelAnimationFrame(raf)
    raf = requestAnimationFrame(step)
  }

  btn.addEventListener('click', () => {
    if (sceneState.shellCollapsed) {
      animate(originalDepth, originalZ, () => { btn.textContent = '收起罩子' })
    } else {
      animate(collapsedDepth, collapsedZ, () => { btn.textContent = '展开罩子' })
    }
    sceneState.shellCollapsed = !sceneState.shellCollapsed
  })
}

// ========== 拖拽平移 / 滚轮缩放 ==========
function setupPanZoom() {
  const holder = sceneHolder()
  if (!holder) return

  let dragging = false
  let lastX = 0
  let lastY = 0

  holder.addEventListener('mousedown', (e) => {
    if ((e.target as Element).closest('.scene-node.interactive')) return
    dragging = true
    lastX = e.clientX
    lastY = e.clientY
    holder.classList.add('dragging')
  })
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return
    sceneState.panX += e.clientX - lastX
    sceneState.panY += e.clientY - lastY
    lastX = e.clientX
    lastY = e.clientY
    applyPanZoom()
  })
  window.addEventListener('mouseup', () => {
    dragging = false
    holder.classList.remove('dragging')
  })

  holder.addEventListener('wheel', (e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.92 : 1.08
    sceneState.scale = Math.min(2.5, Math.max(0.4, sceneState.scale * delta))
    applyPanZoom()
  }, { passive: false })
}

// ========== 实体交互 ==========
const entityInfo = document.getElementById('entity-info')
const infoPopup = document.getElementById('info-popup')

function showEntityInfo(g: SVGGElement) {
  if (!entityInfo) return
  entityInfo.style.display = 'block'
  const set = (id: string, v: string) => {
    const el = document.getElementById(id)
    if (el) el.textContent = v
  }
  set('entity-id', g.dataset.id || '-')
  set('entity-x', g.dataset.x || '-')
  set('entity-y', g.dataset.y || '-')
  set('entity-z', g.dataset.z || '-')
  set('entity-width', g.dataset.w || '-')
  set('entity-height', g.dataset.h || '-')
  set('entity-depth', g.dataset.d || '-')
  set('entity-zindex', '-')
}

function showInfoPopup(moduleId: string, g: SVGGElement) {
  let content = ''
  switch (moduleId) {
    case 'cpu-module': content = getCpuPopupContent(); break
    case 'memory-module': content = getMemoryPopupContent(); break
    case 'nic-module': content = getNicPopupContent(); break
    default: return
  }
  if (!infoPopup) return
  infoPopup.innerHTML = content
  const rect = g.getBoundingClientRect()
  const popupWidth = 280
  const popupHeight = 300
  let left = rect.left + rect.width / 2 - popupWidth / 2
  let top = rect.top - popupHeight - 15
  if (left < 10) left = 10
  if (left + popupWidth > window.innerWidth - 10) left = window.innerWidth - popupWidth - 10
  if (top < 10) top = rect.bottom + 15
  infoPopup.style.left = `${left}px`
  infoPopup.style.top = `${top}px`
  infoPopup.classList.add('visible')
}

function hideInfoPopup() {
  infoPopup?.classList.remove('visible')
}

function setupNodeDelegation() {
  const holder = sceneHolder()
  if (!holder) return

  holder.addEventListener('click', (e) => {
    const g = (e.target as Element).closest('.scene-node.interactive') as SVGGElement | null
    if (g) {
      e.stopPropagation()
      showEntityInfo(g)
      return
    }
    if (entityInfo) entityInfo.style.display = 'none'
  })

  holder.addEventListener('mouseover', (e) => {
    const g = (e.target as Element).closest('.scene-node.interactive') as SVGGElement | null
    if (!g) return
    const id = g.dataset.id || ''
    if (['cpu-module', 'memory-module', 'nic-module'].includes(id)) {
      showInfoPopup(id, g)
    } else if (g.dataset.tooltip) {
      tipEl.textContent = g.dataset.tooltip
      tipEl.classList.add('visible')
    }
  })

  holder.addEventListener('mousemove', (e) => {
    if (!tipEl.classList.contains('visible')) return
    tipEl.style.left = `${e.clientX + 12}px`
    tipEl.style.top = `${e.clientY - 10}px`
  })

  holder.addEventListener('mouseout', (e) => {
    const related = e.relatedTarget as Element | null
    const from = (e.target as Element).closest('.scene-node.interactive')
    if (!from) return
    if (related && from.contains(related)) return
    hideInfoPopup()
    hideSimpleTooltip()
  })
}

const tipEl = document.createElement('div')
tipEl.className = 'svg-tooltip'
document.body.appendChild(tipEl)

function hideSimpleTooltip() {
  tipEl.classList.remove('visible')
}

export { paint, sceneState, buildSceneNodes }

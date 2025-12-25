import './components/IsoScene.ts'
import './components/IsoCube.ts'
import './components/IsoConsole.ts'
import './components/IsoConnector.ts'
import { renderScene } from './render'
import {
  getCpuPopupContent,
  getMemoryPopupContent,
  getNicPopupContent
} from './data'

// ========== 初始化场景内容 ==========
document.addEventListener('DOMContentLoaded', () => {
  const scene = document.querySelector('iso-scene')
  if (scene) {
    scene.innerHTML = renderScene()
  }
})

// ========== Tooltip 定位逻辑 ==========
customElements.whenDefined('iso-cube').then(() => {
  setTimeout(() => {
    document.querySelectorAll('.tooltip-trigger').forEach(trigger => {
      const tooltip = trigger.querySelector('.tooltip')
      if (!tooltip) return

      trigger.addEventListener('mouseenter', () => {
        const rect = trigger.getBoundingClientRect()
        ;(tooltip as HTMLElement).style.left = `${rect.left + rect.width / 2}px`
        ;(tooltip as HTMLElement).style.top = `${rect.top - 10}px`
        ;(tooltip as HTMLElement).style.transform = 'translateX(-50%) translateY(-100%)'
      })
    })
  }, 100)
})

// ========== 角度配置控制 ==========
const rotateXSlider = document.getElementById('rotateX-slider') as HTMLInputElement
const rotateZSlider = document.getElementById('rotateZ-slider') as HTMLInputElement
const perspectiveSlider = document.getElementById('perspective-slider') as HTMLInputElement
const rotateXValue = document.getElementById('rotateX-value')
const rotateZValue = document.getElementById('rotateZ-value')
const perspectiveValue = document.getElementById('perspective-value')
const resetBtn = document.getElementById('reset-angles')

function updateAngles() {
  const rotateX = parseInt(rotateXSlider.value)
  const rotateZ = parseInt(rotateZSlider.value)
  const perspective = parseInt(perspectiveSlider.value)
  if (rotateXValue) rotateXValue.textContent = rotateX.toString()
  if (rotateZValue) rotateZValue.textContent = rotateZ.toString()
  if (perspectiveValue) perspectiveValue.textContent = perspective.toString()
  
  // 动态更新 CSS 变量或重新渲染场景
  const scene = document.querySelector('iso-scene')
  if (scene && (scene as any).updateAngles) {
    (scene as any).updateAngles(rotateX, rotateZ)
  }
  
  // 通过自定义事件通知所有组件更新
  window.dispatchEvent(new CustomEvent('iso-angles-changed', {
    detail: { rotateX, rotateZ, perspective }
  }))
}

if (rotateXSlider) rotateXSlider.addEventListener('input', updateAngles)
if (rotateZSlider) rotateZSlider.addEventListener('input', updateAngles)
if (perspectiveSlider) perspectiveSlider.addEventListener('input', updateAngles)

if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    rotateXSlider.value = '60'
    rotateZSlider.value = '45'
    perspectiveSlider.value = '0'
    updateAngles()
  })
}

// ========== 实体点击显示属性 ==========
const entityInfo = document.getElementById('entity-info')
const entityIdEl = document.getElementById('entity-id')
const entityXEl = document.getElementById('entity-x')
const entityYEl = document.getElementById('entity-y')
const entityZEl = document.getElementById('entity-z')
const entityWidthEl = document.getElementById('entity-width')
const entityHeightEl = document.getElementById('entity-height')
const entityDepthEl = document.getElementById('entity-depth')
const entityZIndexEl = document.getElementById('entity-zindex')

function showEntityInfo(entity: any) {
  if (entityInfo) entityInfo.style.display = 'block'
  if (entityIdEl) entityIdEl.textContent = entity.getAttribute('entity-id') || entity.id || '-'
  if (entityXEl) entityXEl.textContent = (entity as any).x
  if (entityYEl) entityYEl.textContent = (entity as any).y
  if (entityZEl) entityZEl.textContent = (entity as any).z
  if (entityWidthEl) entityWidthEl.textContent = (entity as any).width
  if (entityHeightEl) entityHeightEl.textContent = (entity as any).height
  if (entityDepthEl) entityDepthEl.textContent = (entity as any).depth
  if (entityZIndexEl) entityZIndexEl.textContent = getComputedStyle(entity).zIndex
}

// 等待组件加载完成后绑定点击事件
customElements.whenDefined('iso-cube').then(() => {
  setTimeout(() => {
    document.querySelectorAll('iso-cube').forEach(entity => {
      entity.addEventListener('click', (e: Event) => {
        e.stopPropagation()
        showEntityInfo(entity)
      })
    })
  }, 100)
})

// 点击空白处隐藏属性面板
const sceneEl = document.querySelector('iso-scene')
if (sceneEl) {
  sceneEl.addEventListener('click', (e: Event) => {
    const target = e.target as Element
    if (target.tagName === 'ISO-SCENE' && entityInfo) {
      entityInfo.style.display = 'none'
    }
  })
}

// ========== 罩子收起/展开动画 ==========
const toggleShellBtn = document.getElementById('toggle-shell')
const mainShell = document.getElementById('main-shell')
let shellCollapsed = false
const originalDepth = 140
const originalZ = 0
const collapsedDepth = 10
const collapsedZ = -30
let animationFrame: number | null = null

function animateShell(targetDepth: number, targetZ: number, callback?: () => void) {
  const shell = mainShell
  if (!shell) return
  
  let currentDepth = parseFloat(shell.getAttribute('depth') || originalDepth.toString())
  let currentZ = parseFloat(shell.getAttribute('z') || originalZ.toString())
  
  const duration = 500 // ms
  const startTime = performance.now()
  const startDepth = currentDepth
  const startZ = currentZ
  
  function step(timestamp: number) {
    const elapsed = timestamp - startTime
    const progress = Math.min(elapsed / duration, 1)
    // easeOutCubic
    const eased = 1 - Math.pow(1 - progress, 3)
    
    const newDepth = startDepth + (targetDepth - startDepth) * eased
    const newZ = startZ + (targetZ - startZ) * eased
    
    shell?.setAttribute('depth', newDepth.toString())
    shell?.setAttribute('z', newZ.toString())
    
    if (progress < 1) {
      animationFrame = requestAnimationFrame(step)
    } else {
      if (callback) callback()
    }
  }
  
  if (animationFrame) cancelAnimationFrame(animationFrame)
  animationFrame = requestAnimationFrame(step)
}

if (toggleShellBtn) {
  toggleShellBtn.addEventListener('click', () => {
    if (shellCollapsed) {
      animateShell(originalDepth, originalZ, () => {
        toggleShellBtn.textContent = '收起罩子'
      })
    } else {
      animateShell(collapsedDepth, collapsedZ, () => {
        toggleShellBtn.textContent = '展开罩子'
      })
    }
    shellCollapsed = !shellCollapsed
  })
}

// ========== 详细信息浮动框逻辑 ==========
const infoPopup = document.getElementById('info-popup')
let currentHoveredModule: string | null = null

// 显示浮动框
function showInfoPopup(moduleId: string, event: MouseEvent) {
  let content = ''
  switch (moduleId) {
    case 'cpu-module':
      content = getCpuPopupContent()
      break
    case 'memory-module':
      content = getMemoryPopupContent()
      break
    case 'nic-module':
      content = getNicPopupContent()
      break
    default:
      return
  }

  if (infoPopup) {
    infoPopup.innerHTML = content
    
    // 定位浮动框
    const rect = (event.target as Element).closest('iso-cube')?.getBoundingClientRect()
    if (!rect) return
    
    const popupWidth = 280
    const popupHeight = 300
    
    let left = rect.left + rect.width / 2 - popupWidth / 2
    let top = rect.top - popupHeight - 15
    
    // 边界检测
    if (left < 10) left = 10
    if (left + popupWidth > window.innerWidth - 10) left = window.innerWidth - popupWidth - 10
    if (top < 10) {
      top = rect.bottom + 15
    }
    
    infoPopup.style.left = `${left}px`
    infoPopup.style.top = `${top}px`
    infoPopup.classList.add('visible')
    currentHoveredModule = moduleId
  }
}

// 隐藏浮动框
function hideInfoPopup() {
  if (infoPopup) {
    infoPopup.classList.remove('visible')
  }
  currentHoveredModule = null
}

// 等待组件加载完成后绑定 hover 事件
customElements.whenDefined('iso-cube').then(() => {
  setTimeout(() => {
    const moduleIds = ['cpu-module', 'memory-module', 'nic-module']
    
    moduleIds.forEach(moduleId => {
      const entity = document.querySelector(`iso-cube[entity-id="${moduleId}"]`)
      if (entity) {
        entity.addEventListener('mouseenter', (e: Event) => {
          showInfoPopup(moduleId, e as MouseEvent)
        })
        entity.addEventListener('mouseleave', () => {
          hideInfoPopup()
        })
        // 鼠标移动时更新位置
        entity.addEventListener('mousemove', (_e: Event) => {
          if (currentHoveredModule === moduleId && infoPopup) {
            const rect = entity.getBoundingClientRect()
            const popupWidth = 280
            const popupHeight = infoPopup.offsetHeight || 300
            
            let left = rect.left + rect.width / 2 - popupWidth / 2
            let top = rect.top - popupHeight - 15
            
            if (left < 10) left = 10
            if (left + popupWidth > window.innerWidth - 10) left = window.innerWidth - popupWidth - 10
            if (top < 10) {
              top = rect.bottom + 15
            }
            
            infoPopup.style.left = `${left}px`
            infoPopup.style.top = `${top}px`
          }
        })
      }
    })
  }, 200)
})

// 导出供外部使用
export { showEntityInfo, hideInfoPopup }

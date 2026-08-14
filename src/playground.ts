/**
 * 圆角盒 / 圆柱实时预览（官网工坊 & demo-rounded 共用）
 */

import { renderRoundedBox } from './core/RoundedBox'
import { renderCylinder } from './core/Cylinder'
import {
  ANCHOR_STYLES,
  renderAnchor,
  visibleFaceAnchors,
  cylinderVisibleAnchors,
  type AnchorStyle
} from './core/Anchor'
import {
  MATERIALS,
  THEMES,
  cssColor,
  deriveFaceColors,
  isMaterialName,
  isThemeName,
  parseColor,
  type MaterialName,
  type ThemeName
} from './core/isoSvg'

const SLIDERS = [
  'w', 'h', 'd', 'r', 'rx', 'rz', 'stops',
  'rxr', 'ryr', 'rings', 'top-rings',
  'thi', 'spec', 'shade', 'op', 'sw', 'grain', 'grid',
  'led-hz', 'fan-u', 'fan-v',
  'su-dx', 'su-dy', 'su-scale', 'su-stretch', 'su-op', 'su-blur',
  'sp-dx', 'sp-dy', 'sp-scale', 'sp-stretch', 'sp-op', 'sp-blur'
]

const PRESETS: Record<string, Record<string, unknown>> = {
  device: { shape: 'box', w: 200, h: 200, d: 56, r: 60, top: '#1c1626', front: '#8a5cf6', right: '#5b34c4', thi: 40, spec: 30 },
  server: { shape: 'box', w: 170, h: 130, d: 72, r: 16, top: '#1a1a2e', front: '#2d3748', right: '#1a202c', leds: 4, fan: true, fanU: 28, fanV: 32, ledHz: 1.2, neon: true, panel: true, thi: 25, spec: 20 },
  chip: { shape: 'box', w: 200, h: 200, d: 34, r: 24, top: '#1f2a44', front: '#31415f', right: '#1a2338' },
  tower: { shape: 'box', w: 90, h: 90, d: 220, r: 26, top: '#e8ebf2', front: '#c3cad8', right: '#9aa4b8' },
  pill: { shape: 'box', w: 200, h: 120, d: 70, r: 60, top: '#a8e6c8', front: '#5cbf94', right: '#3d9a72' },
  sharp: { shape: 'box', w: 140, h: 140, d: 96, r: 0, top: '#7fa8ef', front: '#4f7fd9', right: '#3763b0' },
  glass: { shape: 'box', w: 150, h: 150, d: 110, r: 22, top: '#7fa8ef', front: '#4f7fd9', right: '#3763b0', material: 'glass' },
  plate: { shape: 'box', w: 220, h: 180, d: 16, r: 10, top: '#3a455c', front: '#2a3344', right: '#222a38', material: 'matte', grid: 36 },
  db: { shape: 'cyl', rxr: 52, ryr: 52, d: 120, rings: 3, top: '#8ad8e8', front: '#4fa8c4', right: '#3a84a0', thi: 65, spec: 80, hologram: true, leds: 3 },
  barrel: { shape: 'cyl', rxr: 64, ryr: 48, d: 150, rings: 4, top: '#d4a574', front: '#b07840', right: '#8a5a2a', thi: 40, spec: 45 },
  coin: { shape: 'cyl', rxr: 70, ryr: 70, d: 18, rings: 0, topRings: 3, top: '#ffe08a', front: '#e0b040', right: '#c49420', thi: 80, spec: 90 }
}

export function initShapePlayground(): void {
  const $ = (id: string) => document.getElementById(id)
  const stageEl = $('shape-stage') || $('stage')
  if (!stageEl) return
  const stage = stageEl

  let shape: 'box' | 'cyl' = 'box'
  let anchorStyle: AnchorStyle = 'dot'
  let material: MaterialName | '' = ''

  const setMaterial = (name: MaterialName | '', syncKnobs = true) => {
    material = name
    document.querySelectorAll('[data-mat]').forEach(b => {
      b.classList.toggle('on', (b as HTMLElement).dataset.mat === name)
    })
    if (!syncKnobs || !name) return
    const p = MATERIALS[name]
    const setNum = (id: string, v: number | undefined, scale = 1) => {
      const el = $(id) as HTMLInputElement | null
      if (el && v != null) el.value = String(Math.round(v * scale))
    }
    setNum('thi', p.topHighlight, 100)
    setNum('spec', p.specular, 100)
    setNum('shade', p.shade, 100)
    setNum('op', p.opacity ?? 1, 100)
    const setChk = (id: string, v: boolean | undefined) => {
      const el = $(id) as HTMLInputElement | null
      if (el && v != null) el.checked = v
    }
    setChk('shadow', p.shadow)
    setChk('rim', p.rim)
    setChk('ao', p.ao)
    setChk('bevel', p.bevel)
    setChk('glow', p.glow)
    const stroke = $('do-stroke') as HTMLInputElement | null
    if (stroke) stroke.checked = !!p.stroke
    setNum('grain', p.grain ?? 0, 100)
  }

  const setTheme = (name: ThemeName) => {
    const t = THEMES[name]
    document.querySelectorAll('[data-theme]').forEach(b => {
      b.classList.toggle('on', (b as HTMLElement).dataset.theme === name)
    })
    const canvas = stage.closest('.shape-stage-wrap') || stage
    canvas.classList.remove('theme-dark-product', 'theme-navy-glass', 'theme-light-plate')
    canvas.classList.add(t.canvasClass)
    const base = $('c-base') as HTMLInputElement | null
    if (base) base.value = t.color
    setMaterial(t.material, true)
    deriveFaces()
  }

  const deriveFaces = () => {
    const base = ($('c-base') as HTMLInputElement | null)?.value
    if (!base) return
    const shade = +(($('shade') as HTMLInputElement)?.value || 62) / 100
    const faces = deriveFaceColors(parseColor(base), shade)
    const set = (id: string, c: { r: number; g: number; b: number; a: number }) => {
      const el = $(id) as HTMLInputElement | null
      if (el) el.value = cssColor({ ...c, a: 1 })
    }
    set('c-top', faces.top)
    set('c-front', faces.front)
    set('c-right', faces.right)
  }

  const setShape = (next: 'box' | 'cyl') => {
    shape = next
    $('shape-box')?.classList.toggle('on', next === 'box')
    $('shape-cyl')?.classList.toggle('on', next === 'cyl')
    document.querySelectorAll('.box-only').forEach(el => {
      (el as HTMLElement).hidden = next !== 'box'
    })
    document.querySelectorAll('.cyl-only').forEach(el => {
      (el as HTMLElement).hidden = next !== 'cyl'
    })
    refresh()
  }

  $('shape-box')?.addEventListener('click', () => setShape('box'))
  $('shape-cyl')?.addEventListener('click', () => setShape('cyl'))

  document.querySelectorAll('[data-pg-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = (btn as HTMLElement).dataset.pgTab
      document.querySelectorAll('[data-pg-tab]').forEach(b => b.classList.toggle('on', b === btn))
      document.querySelectorAll('[data-pg-pane]').forEach(pane => {
        (pane as HTMLElement).hidden = (pane as HTMLElement).dataset.pgPane !== tab
      })
    })
  })

  const grid = $('anchor-grid')
  if (grid) {
    for (const s of ANCHOR_STYLES) {
      const cell = document.createElement('button')
      cell.type = 'button'
      cell.className = 'anchor-cell' + (s === anchorStyle ? ' on' : '')
      cell.dataset.style = s
      cell.innerHTML =
        `<svg width="28" height="28" viewBox="-14 -14 28 28">${renderAnchor(0, 0, { style: s, size: 7, color: '#7ee0ff' })}</svg>` +
        `<span>${s}</span>`
      cell.addEventListener('click', () => {
        anchorStyle = s as AnchorStyle
        const show = $('show-anc') as HTMLInputElement | null
        if (show) show.checked = true
        grid.querySelectorAll('.anchor-cell').forEach(c =>
          c.classList.toggle('on', (c as HTMLElement).dataset.style === s)
        )
        refresh()
      })
      grid.appendChild(cell)
    }
  }

  function styleOpts() {
    const strokeOn = ($('do-stroke') as HTMLInputElement | null)?.checked
    const showAnc = ($('show-anc') as HTMLInputElement | null)?.checked
    return {
      rotateX: +(($('rx') as HTMLInputElement)?.value || 60),
      rotateZ: +(($('rz') as HTMLInputElement)?.value || 45),
      gradientStops: +(($('stops') as HTMLInputElement)?.value || 8),
      material: material || undefined,
      shadow: ($('shadow') as HTMLInputElement | null)?.checked ?? true,
      shadowUmbra: {
        dx: +(($('su-dx') as HTMLInputElement)?.value || 13),
        dy: +(($('su-dy') as HTMLInputElement)?.value || -8),
        scale: +(($('su-scale') as HTMLInputElement)?.value || 107) / 100,
        stretch: +(($('su-stretch') as HTMLInputElement)?.value || 19) / 100,
        opacity: +(($('su-op') as HTMLInputElement)?.value || 70) / 100,
        blur: +(($('su-blur') as HTMLInputElement)?.value || 7.5)
      },
      shadowPenumbra: {
        dx: +(($('sp-dx') as HTMLInputElement)?.value || 54),
        dy: +(($('sp-dy') as HTMLInputElement)?.value || -12),
        scale: +(($('sp-scale') as HTMLInputElement)?.value || 88) / 100,
        stretch: +(($('sp-stretch') as HTMLInputElement)?.value || 28) / 100,
        opacity: +(($('sp-op') as HTMLInputElement)?.value || 38) / 100,
        blur: +(($('sp-blur') as HTMLInputElement)?.value || 12)
      },
      rim: ($('rim') as HTMLInputElement | null)?.checked ?? true,
      ao: ($('ao') as HTMLInputElement | null)?.checked ?? false,
      bevel: ($('bevel') as HTMLInputElement | null)?.checked ?? false,
      glow: ($('glow') as HTMLInputElement | null)?.checked ?? false,
      glowColor: ($('c-glow') as HTMLInputElement | null)?.value,
      stroke: strokeOn ? ($('c-stroke') as HTMLInputElement)?.value : undefined,
      strokeWidth: +(($('sw') as HTMLInputElement)?.value || 1.4),
      topHighlight: +(($('thi') as HTMLInputElement)?.value || 0) / 100,
      specular: +(($('spec') as HTMLInputElement)?.value || 0) / 100,
      shade: +(($('shade') as HTMLInputElement)?.value || 62) / 100,
      opacity: +(($('op') as HTMLInputElement)?.value || 100) / 100,
      grain: +(($('grain') as HTMLInputElement)?.value || 0) / 100,
      grid: shape === 'box' ? +(($('grid') as HTMLInputElement)?.value || 0) : undefined,
      label: (($('shape-label') as HTMLInputElement | null)?.value || '').trim() || undefined,
      leds: ($('fx-leds') as HTMLInputElement | null)?.checked ? 4 : undefined,
      ledHz: ($('fx-leds') as HTMLInputElement | null)?.checked
        ? +(($('led-hz') as HTMLInputElement)?.value || 0.8)
        : undefined,
      fan: ($('fx-fan') as HTMLInputElement | null)?.checked || undefined,
      fanFace: ($('fx-fan') as HTMLInputElement | null)?.checked
        ? ((($('fan-face') as HTMLSelectElement | null)?.value || 'top') as 'top' | 'front' | 'right' | 'left' | 'back')
        : undefined,
      fanU: ($('fx-fan') as HTMLInputElement | null)?.checked
        ? +(($('fan-u') as HTMLInputElement)?.value || 50) / 100
        : undefined,
      fanV: ($('fx-fan') as HTMLInputElement | null)?.checked
        ? +(($('fan-v') as HTMLInputElement)?.value || 50) / 100
        : undefined,
      hologram: ($('fx-holo') as HTMLInputElement | null)?.checked ? 'SYS' : undefined,
      panel: ($('fx-panel') as HTMLInputElement | null)?.checked ? 'ONLINE' : undefined,
      neon: ($('fx-neon') as HTMLInputElement | null)?.checked || undefined,
      colors: {
        top: ($('c-top') as HTMLInputElement)?.value,
        front: ($('c-front') as HTMLInputElement)?.value,
        right: ($('c-right') as HTMLInputElement)?.value
      },
      anchors: showAnc
        ? (shape === 'cyl' ? cylinderVisibleAnchors : visibleFaceAnchors)(anchorStyle, 7, '#5eead4')
          .map(a => ({ ...a, glow: true }))
        : undefined
    }
  }

  function refresh() {
    for (const id of SLIDERS) {
      const el = $(id + '-v')
      const input = $(id) as HTMLInputElement | null
      if (el && input) el.textContent = input.value
    }
    const t0 = performance.now()
    const result = shape === 'cyl'
      ? renderCylinder({
        radiusX: +(($('rxr') as HTMLInputElement)?.value || 56),
        radiusY: +(($('ryr') as HTMLInputElement)?.value || 56),
        depth: +(($('d') as HTMLInputElement)?.value || 96),
        rings: +(($('rings') as HTMLInputElement)?.value || 0),
        topRings: +(($('top-rings') as HTMLInputElement)?.value || 0),
        ...styleOpts()
      })
      : renderRoundedBox({
        width: +(($('w') as HTMLInputElement)?.value || 140),
        height: +(($('h') as HTMLInputElement)?.value || 140),
        depth: +(($('d') as HTMLInputElement)?.value || 96),
        radius: +(($('r') as HTMLInputElement)?.value || 28),
        ...styleOpts()
      })
    const ms = (performance.now() - t0).toFixed(2)
    stage.innerHTML = result.svg
    const svg = stage.firstElementChild as SVGSVGElement | null
    if (svg) {
      svg.style.maxWidth = '92%'
      svg.style.maxHeight = '92%'
    }
    const meta = $('shape-meta') || $('meta')
    if (meta) {
      const nodes = stage.querySelectorAll('*').length
      const kb = (result.svg.length / 1024).toFixed(1)
      meta.innerHTML =
        `生成 <b>${ms} ms</b> · <b>${nodes}</b> 节点 · <b>${kb} KB</b>`
    }
  }

  document.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = PRESETS[(btn as HTMLElement).dataset.preset || '']
      if (!p) return
      const setNum = (id: string, v: unknown) => {
        const el = $(id) as HTMLInputElement | null
        if (el && v != null) el.value = String(v)
      }
      setNum('w', p.w); setNum('h', p.h); setNum('r', p.r)
      setNum('rxr', p.rxr); setNum('ryr', p.ryr); setNum('d', p.d)
      setNum('rings', p.rings ?? 2); setNum('top-rings', p.topRings ?? 0)
      setNum('thi', p.thi ?? 0); setNum('spec', p.spec ?? 0); setNum('op', p.op ?? 100)
      setNum('grid', p.grid ?? 0)
      const top = $('c-top') as HTMLInputElement | null
      const front = $('c-front') as HTMLInputElement | null
      const right = $('c-right') as HTMLInputElement | null
      if (top) top.value = String(p.top)
      if (front) front.value = String(p.front)
      if (right) right.value = String(p.right)
      const stroke = $('do-stroke') as HTMLInputElement | null
      const glow = $('glow') as HTMLInputElement | null
      const ao = $('ao') as HTMLInputElement | null
      const bevel = $('bevel') as HTMLInputElement | null
      if (stroke) stroke.checked = !!p.stroke
      if (glow) glow.checked = !!p.glow
      if (ao) ao.checked = !!p.ao
      if (bevel) bevel.checked = !!p.bevel
      const setChk = (id: string, on: boolean) => {
        const el = $(id) as HTMLInputElement | null
        if (el) el.checked = on
      }
      setChk('fx-leds', !!p.leds)
      setChk('fx-fan', !!p.fan)
      setNum('led-hz', p.ledHz ?? 0.8)
      const faceEl = $('fan-face') as HTMLSelectElement | null
      if (faceEl) faceEl.value = String(p.fanFace ?? 'top')
      setNum('fan-u', p.fanU ?? 50)
      setNum('fan-v', p.fanV ?? 50)
      setChk('fx-holo', !!p.hologram)
      setChk('fx-panel', !!p.panel)
      setChk('fx-neon', !!p.neon)
      const mat = isMaterialName(String(p.material ?? '')) ? p.material as MaterialName : ''
      setMaterial(mat, !!mat)
      setShape((p.shape as 'box' | 'cyl') || 'box')
    })
  })

  const listen = [
    ...SLIDERS, 'c-top', 'c-front', 'c-right', 'shadow', 'rim',
    'ao', 'bevel', 'glow', 'c-glow', 'do-stroke', 'c-stroke', 'show-anc', 'shape-label',
    'fx-leds', 'fx-fan', 'fx-holo', 'fx-panel', 'fx-neon', 'led-hz', 'fan-face', 'fan-u', 'fan-v'
  ]
  for (const id of listen) $(id)?.addEventListener('input', refresh)
  $('c-base')?.addEventListener('input', () => { deriveFaces(); refresh() })
  $('derive-faces')?.addEventListener('click', () => { deriveFaces(); refresh() })
  document.querySelectorAll('[data-mat]').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = (btn as HTMLElement).dataset.mat || ''
      setMaterial(isMaterialName(name) ? name : '', true)
      refresh()
    })
  })
  document.querySelectorAll('[data-theme]').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = (btn as HTMLElement).dataset.theme || ''
      if (!isThemeName(name)) return
      setTheme(name)
      refresh()
    })
  })
  refresh()
}

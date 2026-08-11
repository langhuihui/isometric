/**
 * 形体装饰：贴面 LED、风扇、全息、悬浮面板、霓虹描边。
 */

import {
  type FaceName,
  type IsoShapeStyle,
  type PositionName,
  type Vec2,
  type Vec3,
  POS_UV,
  boxFaceUV,
  clamp,
  cssColor,
  cylinderAnchorPoint,
  fmt,
  parseColor,
  parseFanFace,
  projectedFaceBasis,
  shadeColor,
  towardWhite,
  xmlEscape
} from './isoSvg'

const LED_COLORS = ['#3dff8a', '#7dff6a', '#ffd447', '#ff5a7a']

export function isoFxStyle(): string {
  return `<style>` +
    `.iso-led{animation:iso-led-blink 1.35s ease-in-out infinite}` +
    `@keyframes iso-led-blink{0%,100%{opacity:.3}42%{opacity:1}58%{opacity:.45}}` +
    `.iso-fan-spin{transform-origin:0 0;animation:iso-fan-spin .55s linear infinite}` +
    `@keyframes iso-fan-spin{to{transform:rotate(360deg)}}` +
    `.iso-holo{animation:iso-holo-bob 2.8s ease-in-out infinite}` +
    `@keyframes iso-holo-bob{50%{transform:translate(0,-4px)}}` +
    `.iso-holo-ring{animation:iso-holo-ring 2.1s ease-out infinite}` +
    `@keyframes iso-holo-ring{0%{opacity:.85}100%{opacity:.05}}` +
    `.iso-panel{animation:iso-panel-bob 3s ease-in-out infinite}` +
    `@keyframes iso-panel-bob{50%{transform:translate(0,-3px)}}` +
    `.iso-neon{animation:iso-neon-pulse 1.7s ease-in-out infinite}` +
    `@keyframes iso-neon-pulse{50%{opacity:.4}}` +
    `</style>`
}

export function hasShapeFx(style: IsoShapeStyle): boolean {
  return !!(style.leds || fanOn(style) || style.hologram || style.panel || style.neon)
}

function fanOn(style: IsoShapeStyle): boolean {
  if (style.fan === false) return false
  return !!(style.fan || style.fanU != null || style.fanV != null)
}

export function renderShapeFx(options: {
  pid: string
  project: (p: Vec3) => Vec2
  kind: 'box' | 'cyl'
  w: number
  h: number
  d: number
  topPath: string
  style: IsoShapeStyle
}): { defs: string; markup: string } {
  const s = options.style
  if (!hasShapeFx(s)) return { defs: '', markup: '' }

  const { pid, project, kind, w, h, d, topPath } = options
  let defs = isoFxStyle()
  let markup = ''

  const nLed = Math.max(0, Math.round(s.leds ?? 0))
  if (nLed > 0) {
    const leds = ledsMarkup(pid, project, kind, w, h, d, nLed, s.ledHz)
    defs += leds.defs
    markup += leds.markup
  }

  if (fanOn(s)) markup += fanMarkup(project, kind, w, h, d, s)

  if (s.neon) {
    const color = typeof s.neon === 'string' && s.neon !== 'true' ? s.neon : '#5eead4'
    const glow = neonMarkup(pid, topPath, color)
    defs += glow.defs
    markup += glow.markup
  }

  if (s.hologram) {
    const text = typeof s.hologram === 'string' && s.hologram !== 'true' ? s.hologram : ''
    const holo = holoMarkup(pid, project, kind, w, h, d, text)
    defs += holo.defs
    markup += holo.markup
  }

  if (s.panel) {
    const title = typeof s.panel === 'string' && s.panel !== 'true' ? s.panel : (s.label || 'ONLINE')
    markup += panelMarkup(project, w, d, title)
  }

  return { defs, markup }
}

function xform(origin: Vec2, basis: { u: Vec2; v: Vec2 }): string {
  return `matrix(${fmt(basis.u[0])} ${fmt(basis.u[1])} ${fmt(basis.v[0])} ${fmt(basis.v[1])} ${fmt(origin[0])} ${fmt(origin[1])})`
}

function ledsMarkup(
  pid: string,
  project: (p: Vec3) => Vec2,
  kind: 'box' | 'cyl',
  w: number, h: number, d: number,
  n: number,
  hz?: number
): { defs: string; markup: string } {
  const count = Math.min(8, Math.max(1, n))
  const freq = hz ?? 0.75
  const dur = freq > 0.01 ? 1 / freq : 0
  let defs = `<filter id="${pid}-ledglow" x="-80%" y="-80%" width="260%" height="260%">` +
    `<feGaussianBlur stdDeviation="1.9"/></filter>`
  let out = ''
  for (let i = 0; i < count; i++) {
    const color = LED_COLORS[i % LED_COLORS.length]
    const c = parseColor(color)
    const hi = cssColor(towardWhite(c, 0.72))
    const mid = cssColor(c)
    const rim = cssColor(shadeColor(c, 0.38))
    defs += `<radialGradient id="${pid}-led${i}" cx="38%" cy="32%" r="72%">` +
      `<stop offset="0" stop-color="${hi}"/>` +
      `<stop offset="0.48" stop-color="${mid}"/>` +
      `<stop offset="1" stop-color="${rim}"/></radialGradient>` +
      `<radialGradient id="${pid}-led${i}-in" cx="50%" cy="50%" r="50%">` +
      `<stop offset="0.42" stop-color="#000" stop-opacity="0"/>` +
      `<stop offset="1" stop-color="#000" stop-opacity="0.55"/></radialGradient>`

    let loc: Vec3
    let basis: { u: Vec2; v: Vec2 }
    if (kind === 'box') {
      const u = count === 1 ? 0.5 : 0.16 + (0.68 * i) / (count - 1)
      loc = [w * u, h, d * 0.72]
      basis = projectedFaceBasis('front', project)
    } else {
      const t = count === 1 ? 0.5 : 0.22 + (0.56 * i) / (count - 1)
      loc = cylinderAnchorPoint(w / 2, h / 2, d, 'side', 'mc', 90, t)
      basis = projectedFaceBasis('side', project, 90, w / 2, h / 2)
    }
    const p = project(loc)
    const delay = dur > 0 ? (i * 0.17 / freq).toFixed(2) : '0'
    const blink = dur > 0
      ? ` class="iso-led" style="animation-duration:${fmt(dur)}s;animation-delay:${delay}s"`
      : ''
    out += `<g transform="${xform(p, basis)}">` +
      `<circle r="3.35" fill="#0b0d14"/>` +
      `<circle r="3.05" fill="none" stroke="#6a7388" stroke-width="0.85" vector-effect="non-scaling-stroke"/>` +
      `<circle r="2.62" fill="none" stroke="#171b26" stroke-width="0.4" vector-effect="non-scaling-stroke"/>` +
      `<g${blink}>` +
      `<circle r="6.4" fill="${mid}" opacity="0.42" filter="url(#${pid}-ledglow)"/>` +
      `<circle r="3.8" fill="${mid}" opacity="0.22"/>` +
      `<circle r="2.28" fill="url(#${pid}-led${i})"/>` +
      `<circle r="2.28" fill="url(#${pid}-led${i}-in)"/>` +
      `<ellipse cx="-0.55" cy="-0.7" rx="0.82" ry="0.42" fill="#fff" opacity="0.62"/>` +
      `</g></g>`
  }
  return { defs, markup: `<g data-fx="leds">${out}</g>` }
}

function fanUV(style: IsoShapeStyle): Vec2 {
  if (typeof style.fan === 'string' && style.fan !== 'true') {
    const named = POS_UV[style.fan as PositionName]
    if (named) return named
    const tokens = style.fan.split(/[:\s,]+/).filter(Boolean)
    const nums = (parseFanFace(tokens[0]) ? tokens.slice(1) : tokens).map(Number)
    if (nums.length >= 2 && Number.isFinite(nums[0]) && Number.isFinite(nums[1])) {
      return [clamp(nums[0], 0, 1), clamp(nums[1], 0, 1)]
    }
  }
  return [clamp(style.fanU ?? 0.5, 0, 1), clamp(style.fanV ?? 0.5, 0, 1)]
}

function fanFaceOf(style: IsoShapeStyle): FaceName | 'side' {
  return style.fanFace
    ?? parseFanFace(typeof style.fan === 'string' ? style.fan : undefined)
    ?? 'top'
}

const SIDE_DEG: Record<string, number> = {
  right: 0, front: 90, left: 180, back: 270, side: 90
}

function fanMarkup(
  project: (p: Vec3) => Vec2,
  kind: 'box' | 'cyl',
  w: number, h: number, d: number,
  style: IsoShapeStyle
): string {
  const [u, v] = fanUV(style)
  const face = fanFaceOf(style)

  let loc: Vec3
  let basis: { u: Vec2; v: Vec2 }
  let R: number
  if (kind === 'cyl') {
    const rx = w / 2, ry = h / 2
    if (face === 'top' || face === 'bottom') {
      loc = [w * u, h * v, face === 'top' ? d : 0]
      basis = projectedFaceBasis(face, project)
      R = Math.min(w, h) * 0.42
    } else {
      const ang = (SIDE_DEG[face] ?? 90) + (u - 0.5) * 90
      loc = cylinderAnchorPoint(rx, ry, d, 'side', 'mc', ang, 1 - v)
      basis = projectedFaceBasis('side', project, ang, rx, ry)
      R = Math.min(Math.min(w, h) * 0.38, d * 0.32)
    }
  } else {
    const boxFace: FaceName = face === 'side' ? 'front' : face
    loc = boxFaceUV(w, h, d, boxFace, u, v)
    basis = projectedFaceBasis(boxFace, project)
    const span = boxFace === 'top' || boxFace === 'bottom' ? Math.min(w, h)
      : boxFace === 'front' || boxFace === 'back' ? Math.min(w, d)
      : Math.min(h, d)
    R = span * 0.22
  }
  const p = project(loc)
  let blades = ''
  for (let i = 0; i < 3; i++) {
    const a = (i * 120) * Math.PI / 180
    const a2 = a + Math.PI / 2
    const x2 = Math.cos(a) * R * 0.9, y2 = Math.sin(a) * R * 0.9
    const px = Math.cos(a2) * R * 0.28, py = Math.sin(a2) * R * 0.28
    blades += `M${fmt(Math.cos(a) * R * 0.12)} ${fmt(Math.sin(a) * R * 0.12)}` +
      `Q${fmt(x2 + px)} ${fmt(y2 + py)} ${fmt(x2)} ${fmt(y2)}` +
      `Q${fmt(x2 - px)} ${fmt(y2 - py)} ${fmt(Math.cos(a) * R * 0.12)} ${fmt(Math.sin(a) * R * 0.12)}Z`
  }
  return `<g data-fx="fan" transform="${xform(p, basis)}">` +
    `<circle r="${fmt(R)}" fill="#161622" stroke="#4a5168" stroke-width="1.1" vector-effect="non-scaling-stroke"/>` +
    `<circle r="${fmt(R * 0.78)}" fill="none" stroke="#2a3044" stroke-width="0.6" vector-effect="non-scaling-stroke"/>` +
    `<g class="iso-fan-spin"><path d="${blades}" fill="#8b95b0" opacity="0.92"/></g>` +
    `<circle r="${fmt(R * 0.16)}" fill="#d5dbe8"/>` +
    `</g>`
}

function neonMarkup(pid: string, topPath: string, color: string): { defs: string; markup: string } {
  const defs = `<filter id="${pid}-neon" x="-20%" y="-20%" width="140%" height="140%">` +
    `<feGaussianBlur stdDeviation="2.4"/></filter>`
  const markup =
    `<path d="${topPath}" fill="none" stroke="${color}" stroke-width="3.6" opacity="0.35" ` +
    `filter="url(#${pid}-neon)" stroke-linejoin="round"/>` +
    `<path class="iso-neon" d="${topPath}" fill="none" stroke="${color}" stroke-width="1.35" ` +
    `stroke-linejoin="round" opacity="0.95"/>`
  return { defs, markup }
}

function holoMarkup(
  pid: string,
  project: (p: Vec3) => Vec2,
  kind: 'box' | 'cyl',
  w: number, h: number, d: number,
  text: string
): { defs: string; markup: string } {
  const cx = w / 2, cy = h / 2
  const span = Math.min(w, h)
  const lift = Math.max(42, span * 0.72)
  const z0 = d
  const z1 = d + lift
  const pyramid = kind === 'box'

  let sideFill = ''
  let sideCore = ''
  let base: Vec2[]
  let top: Vec2[]
  let rings = ''

  if (pyramid) {
    const hw0 = w * 0.07, hh0 = h * 0.07
    const hw1 = w * 0.4, hh1 = h * 0.4
    const bot = rectLoop(project, cx, cy, hw0, hh0, z0)
    const cap = rectLoop(project, cx, cy, hw1, hh1, z1)
    sideFill = pyramidFaces(bot, cap, `fill="url(#${pid}-holo)"`)
    sideCore = pyramidFaces(
      rectLoop(project, cx, cy, hw0 * 0.4, hh0 * 0.4, z0),
      rectLoop(project, cx, cy, hw1 * 0.4, hh1 * 0.4, z1),
      `fill="url(#${pid}-holocore)"`
    )
    base = bot
    top = cap
    rings = [0.22, 0.4, 0.55].map((t, i) => {
      const hw = hw0 + (hw1 - hw0) * t
      const hh = hh0 + (hh1 - hh0) * t
      const pts = rectLoop(project, cx, cy, hw, hh, z0 + lift * t)
      const op = (0.85 - i * 0.28).toFixed(2)
      return `<path class="iso-holo-ring" d="${poly(pts)}Z" fill="none" stroke="#c8fbff" ` +
        `stroke-width="1.1" opacity="${op}" style="animation-delay:${(i * 0.7).toFixed(1)}s"/>`
    }).join('')
  } else {
    const r0 = span * 0.07
    const r1 = span * 0.46
    sideFill = `<path d="${frustumSidePath(project, cx, cy, r0, r0, r1, r1, z0, z1)}" fill="url(#${pid}-holo)"/>`
    sideCore = `<path d="${frustumSidePath(project, cx, cy, r0 * 0.4, r0 * 0.4, r1 * 0.4, r1 * 0.4, z0, z1)}" fill="url(#${pid}-holocore)"/>`
    base = ellipseLoop(project, cx, cy, r0, r0, z0)
    top = ellipseLoop(project, cx, cy, r1, r1, z1)
    rings = [0.22, 0.4, 0.55].map((t, i) => {
      const r = r0 + (r1 - r0) * t
      const pts = ellipseLoop(project, cx, cy, r, r, z0 + lift * t)
      const op = (0.85 - i * 0.28).toFixed(2)
      return `<path class="iso-holo-ring" d="${poly(pts)}Z" fill="none" stroke="#c8fbff" ` +
        `stroke-width="1.1" opacity="${op}" style="animation-delay:${(i * 0.7).toFixed(1)}s"/>`
    }).join('')
  }

  const yBot = Math.max(...base.map(p => p[1]))
  const yTop = Math.min(...top.map(p => p[1]))
  const defs =
    `<linearGradient id="${pid}-holo" gradientUnits="userSpaceOnUse" ` +
    `x1="0" y1="${fmt(yBot)}" x2="0" y2="${fmt(yTop)}">` +
    `<stop offset="0" stop-color="#7ef0ff" stop-opacity="0.4"/>` +
    `<stop offset="0.38" stop-color="#7ef0ff" stop-opacity="0.14"/>` +
    `<stop offset="0.72" stop-color="#7ef0ff" stop-opacity="0"/>` +
    `<stop offset="1" stop-color="#7ef0ff" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="${pid}-holocore" gradientUnits="userSpaceOnUse" ` +
    `x1="0" y1="${fmt(yBot)}" x2="0" y2="${fmt(yTop)}">` +
    `<stop offset="0" stop-color="#e8ffff" stop-opacity="0.5"/>` +
    `<stop offset="0.68" stop-color="#e8ffff" stop-opacity="0"/>` +
    `<stop offset="1" stop-color="#e8ffff" stop-opacity="0"/></linearGradient>` +
    `<filter id="${pid}-holobloom" x="-35%" y="-35%" width="170%" height="170%">` +
    `<feGaussianBlur stdDeviation="3.2"/></filter>`

  const origin = project([cx, cy, z0 + lift * 0.78])
  const basis = projectedFaceBasis('top', project)
  const fs = span * 0.12
  const label = text
    ? `<text transform="${xform(origin, basis)}" text-anchor="middle" dominant-baseline="middle" ` +
      `font-size="${fmt(fs)}" font-weight="700" fill="#e9ffff" opacity="0.92" ` +
      `style="pointer-events:none">${xmlEscape(text)}</text>`
    : `<g transform="${xform(origin, basis)}" fill="none" stroke="#e9ffff" stroke-width="0.9" opacity="0.85">` +
      `<rect x="${fmt(-span * 0.14)}" y="${fmt(-span * 0.1)}" ` +
      `width="${fmt(span * 0.28)}" height="${fmt(span * 0.2)}"/>` +
      `<path d="M${fmt(-span * 0.07)} ${fmt(span * 0.03)} L0 ${fmt(-span * 0.05)} L${fmt(span * 0.07)} ${fmt(span * 0.03)}"/></g>`

  const markup =
    `<g class="iso-holo" data-fx="holo">` +
    `<g filter="url(#${pid}-holobloom)" opacity="0.85">${sideFill}</g>` +
    `${sideFill}` +
    `<path d="${poly(base)}Z" fill="rgba(140,240,255,0.22)" stroke="rgba(190,250,255,0.55)" stroke-width="0.9"/>` +
    `${sideCore}` +
    `${rings}` +
    `${label}</g>`
  return { defs, markup }
}

const HOLO_SEGS = 24

function ellipseLoop(
  project: (p: Vec3) => Vec2,
  cx: number, cy: number, rx: number, ry: number, z: number
): Vec2[] {
  const pts: Vec2[] = []
  for (let i = 0; i < HOLO_SEGS; i++) {
    const a = (i / HOLO_SEGS) * Math.PI * 2
    pts.push(project([cx + rx * Math.cos(a), cy + ry * Math.sin(a), z]))
  }
  return pts
}

function poly(pts: Vec2[]): string {
  return 'M' + pts.map(p => `${fmt(p[0])} ${fmt(p[1])}`).join('L')
}

function rectLoop(
  project: (p: Vec3) => Vec2,
  cx: number, cy: number, hw: number, hh: number, z: number
): Vec2[] {
  return [
    project([cx - hw, cy - hh, z]),
    project([cx + hw, cy - hh, z]),
    project([cx + hw, cy + hh, z]),
    project([cx - hw, cy + hh, z])
  ]
}

function pyramidFaces(bot: Vec2[], top: Vec2[], attrs: string): string {
  const faces = [0, 1, 2, 3].map(i => {
    const j = (i + 1) % 4
    const d =
      `M${fmt(bot[i][0])} ${fmt(bot[i][1])}` +
      `L${fmt(bot[j][0])} ${fmt(bot[j][1])}` +
      `L${fmt(top[j][0])} ${fmt(top[j][1])}` +
      `L${fmt(top[i][0])} ${fmt(top[i][1])}Z`
    const y = (bot[i][1] + bot[j][1] + top[i][1] + top[j][1]) / 4
    return { d, y }
  })
  faces.sort((a, b) => a.y - b.y)
  return faces.map(f => `<path d="${f.d}" ${attrs}/>`).join('')
}

function frustumSidePath(
  project: (p: Vec3) => Vec2,
  cx: number, cy: number,
  rx0: number, ry0: number, rx1: number, ry1: number,
  z0: number, z1: number
): string {
  const top = ellipseLoop(project, cx, cy, rx1, ry1, z1)
  const bot = ellipseLoop(project, cx, cy, rx0, ry0, z0)
  let iL = 0, iR = 0, minX = Infinity, maxX = -Infinity
  for (let i = 0; i < top.length; i++) {
    if (top[i][0] < minX) { minX = top[i][0]; iL = i }
    if (top[i][0] > maxX) { maxX = top[i][0]; iR = i }
  }
  const front = frontArc(top, iL, iR)
  const back = [...front].reverse()
  let d = `M${fmt(top[iL][0])} ${fmt(top[iL][1])}`
  for (const i of front.slice(1)) d += `L${fmt(top[i][0])} ${fmt(top[i][1])}`
  d += `L${fmt(bot[iR][0])} ${fmt(bot[iR][1])}`
  for (const i of back.slice(1)) d += `L${fmt(bot[i][0])} ${fmt(bot[i][1])}`
  return d + 'Z'
}

function frontArc(pts: Vec2[], iL: number, iR: number): number[] {
  const n = pts.length
  const walk = (step: number) => {
    const idx: number[] = []
    for (let i = iL; ; i = (i + step + n) % n) {
      idx.push(i)
      if (i === iR) break
    }
    return idx
  }
  const a = walk(1), b = walk(-1)
  const avgY = (idx: number[]) => idx.reduce((s, i) => s + pts[i][1], 0) / idx.length
  return avgY(a) >= avgY(b) ? a : b
}

function panelMarkup(
  project: (p: Vec3) => Vec2,
  w: number, d: number,
  title: string
): string {
  const p = project([w, 0, d])
  const x = p[0] + 10
  const y = p[1] - 42
  return `<g data-fx="panel" transform="translate(${fmt(x)} ${fmt(y)})" ` +
    `font-family="ui-sans-serif,system-ui,sans-serif">` +
    `<g class="iso-panel">` +
    `<rect width="82" height="38" rx="6" fill="rgba(10,16,34,0.78)" ` +
    `stroke="rgba(120,200,255,0.55)" stroke-width="1.15"/>` +
    `<rect width="82" height="38" rx="6" fill="none" stroke="rgba(180,230,255,0.2)" stroke-width="2.4"/>` +
    `<text x="10" y="15" fill="#d7f0ff" font-size="9.5" font-weight="700">${xmlEscape(title.slice(0, 14))}</text>` +
    `<rect x="10" y="22" width="58" height="5" rx="2" fill="rgba(70,130,255,0.22)"/>` +
    `<rect x="10" y="22" width="36" height="5" rx="2" fill="#5eead4"/>` +
    `</g></g>`
}

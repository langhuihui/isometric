/**
 * 等距 SVG 连线：世界坐标轴对齐折线 → 投影后的渐变/发光/流向 path
 */

import {
  type FaceName,
  type Vec2,
  type Vec3,
  FACE_NORMALS,
  cssColor,
  fmt,
  parseColor,
  projectPoint,
  towardWhite,
  xmlEscape
} from './isoSvg'

export interface IsoLinkOptions {
  from: Vec3
  to: Vec3
  rotateX?: number
  rotateZ?: number
  /** auto | direct | x-y | y-x | x-z-y … */
  route?: string
  fromFace?: FaceName | string
  toFace?: FaceName | string
  perpLength?: number
  bendRadius?: number
  color?: string
  colorTo?: string
  width?: number
  dashed?: boolean | string
  flow?: boolean | number
  arrow?: boolean
  glow?: boolean
  opacity?: number
  label?: string
  id?: string
  dataLink?: string | number
}

let uid = 0

const isFace = (f: string | undefined): f is FaceName =>
  !!f && f in FACE_NORMALS

export function isoLinkStyle(): string {
  return `<style>` +
    `.iso-link-flow{stroke-dasharray:7 10;animation:iso-link-flow 1.1s linear infinite}` +
    `@keyframes iso-link-flow{to{stroke-dashoffset:-17}}` +
    `</style>`
}

export function routeIsoWaypoints(
  from: Vec3,
  to: Vec3,
  route = 'auto',
  fromFace: string = 'top',
  toFace: string = 'top',
  perpLength = 0
): Vec3[] {
  const n0 = FACE_NORMALS[isFace(fromFace) ? fromFace : 'bottom']
  const n1 = FACE_NORMALS[isFace(toFace) ? toFace : 'bottom']
  const len = Math.max(0, perpLength)

  const fromExt: Vec3 = len > 0
    ? [from[0] + n0[0] * len, from[1] + n0[1] * len, from[2] + n0[2] * len]
    : from
  const toExt: Vec3 = len > 0
    ? [to[0] + n1[0] * len, to[1] + n1[1] * len, to[2] + n1[2] * len]
    : to

  const pts: Vec3[] = [from]
  if (len > 0) pts.push(fromExt)

  for (const p of axisRoute(fromExt, toExt, route)) {
    const last = pts[pts.length - 1]
    if (Math.hypot(p[0] - last[0], p[1] - last[1], p[2] - last[2]) > 0.1) pts.push(p)
  }

  {
    const last = pts[pts.length - 1]
    if (Math.hypot(last[0] - toExt[0], last[1] - toExt[1], last[2] - toExt[2]) > 0.1) {
      pts.push(toExt)
    }
  }

  if (len > 0) {
    const last = pts[pts.length - 1]
    if (Math.hypot(last[0] - to[0], last[1] - to[1], last[2] - to[2]) > 0.1) pts.push(to)
  }

  return pts
}

export function renderIsoLink(options: IsoLinkOptions): { markup: string; defs: string; d: string } {
  const pid = options.id || `ilk${++uid}`
  const rx = options.rotateX ?? 60
  const rz = options.rotateZ ?? 45
  const pts = routeIsoWaypoints(
    options.from, options.to,
    options.route ?? 'auto',
    options.fromFace ?? 'top',
    options.toFace ?? 'top',
    options.perpLength ?? 20
  )
  const screen = pts.map(p => projectPoint(p[0], p[1], p[2], rx, rz))
  const d = polylinePath(screen, options.bendRadius ?? 12)
  if (!d) return { markup: '', defs: '', d: '' }

  const color = options.color ?? '#6fa8e0'
  const colorTo = options.colorTo ?? cssColor(towardWhite(parseColor(color), 0.42))
  const w = options.width ?? 2.2
  const op = options.opacity ?? 0.92
  const a = screen[0]
  const b = screen[screen.length - 1]

  let defs =
    `<linearGradient id="${pid}-g" gradientUnits="userSpaceOnUse" ` +
    `x1="${fmt(a[0])}" y1="${fmt(a[1])}" x2="${fmt(b[0])}" y2="${fmt(b[1])}">` +
    `<stop offset="0" stop-color="${color}"/>` +
    `<stop offset="1" stop-color="${colorTo}"/></linearGradient>`

  if (options.arrow) {
    defs += `<marker id="${pid}-arr" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto">` +
      `<path d="M0 .6L9 4.5L0 8.4Z" fill="${colorTo}"/></marker>`
  }
  if (options.glow !== false) {
    defs += `<filter id="${pid}-gl" x="-40%" y="-40%" width="180%" height="180%">` +
      `<feGaussianBlur stdDeviation="2.2"/></filter>`
  }

  const dashed = options.dashed === false
    ? ''
    : ` stroke-dasharray="${typeof options.dashed === 'string' ? options.dashed : '7 10'}"`
  const flowOn = options.flow !== false
  const flowClass = flowOn ? ' iso-link-flow' : ''
  const dur = typeof options.flow === 'number' && options.flow > 0
    ? ` style="animation-duration:${fmt(1 / options.flow)}s"`
    : ''
  const marker = options.arrow ? ` marker-end="url(#${pid}-arr)"` : ''

  let markup = ''
  if (options.glow !== false) {
    markup += `<path d="${d}" fill="none" stroke="${color}" stroke-width="${fmt(w * 2.3)}" ` +
      `stroke-linecap="round" stroke-linejoin="round" opacity="0.2" filter="url(#${pid}-gl)"/>`
  }
  markup += `<path class="iso-link${flowClass}" d="${d}" fill="none" stroke="url(#${pid}-g)" ` +
    `stroke-width="${fmt(w)}" stroke-linecap="round" stroke-linejoin="round" opacity="${fmt(op)}"` +
    dashed + marker + dur + '/>'

  if (options.label) {
    const mid = screen[Math.floor(screen.length / 2)]
    markup += `<text x="${fmt(mid[0])}" y="${fmt(mid[1] - 7)}" text-anchor="middle" ` +
      `font-size="11" font-weight="600" fill="${colorTo}" opacity="0.88" ` +
      `style="pointer-events:none">${xmlEscape(options.label)}</text>`
  }

  const extra = options.dataLink != null ? ` data-link="${options.dataLink}"` : ''
  return { markup: `<g class="iso-link-g"${extra}>${markup}</g>`, defs, d }
}

type RouteAxis = 'x' | 'y' | 'z'

function axisRoute(from: Vec3, to: Vec3, route: string): Vec3[] {
  if (route === 'direct') {
    if (Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]) < 0.1) return []
    return [to]
  }

  const userAxes: RouteAxis[] =
    !route || route === 'auto'
      ? ['x', 'z', 'y']
      : (route.split('-').filter((d): d is RouteAxis => d === 'x' || d === 'y' || d === 'z'))

  const allAxes: RouteAxis[] = ['x', 'z', 'y']
  const routeOrder = [...userAxes, ...allAxes.filter(a => !userAxes.includes(a))]
  const idx = { x: 0, y: 1, z: 2 } as const
  const cur: Vec3 = [from[0], from[1], from[2]]
  const target = { x: to[0], y: to[1], z: to[2] }
  const pts: Vec3[] = []

  for (const axis of routeOrder) {
    const i = idx[axis]
    if (Math.abs(cur[i] - target[axis]) < 0.1) continue
    cur[i] = target[axis]
    pts.push([cur[0], cur[1], cur[2]])
  }
  return pts
}

function polylinePath(screenPts: Vec2[], bendRadius = 12): string {
  if (screenPts.length === 0) return ''
  if (screenPts.length === 1) return `M${fmt(screenPts[0][0])} ${fmt(screenPts[0][1])}`
  if (screenPts.length === 2 || bendRadius <= 0) {
    return 'M' + screenPts.map(p => `${fmt(p[0])} ${fmt(p[1])}`).join('L')
  }

  let d = `M${fmt(screenPts[0][0])} ${fmt(screenPts[0][1])}`
  for (let i = 1; i < screenPts.length - 1; i++) {
    const prev = screenPts[i - 1]
    const curr = screenPts[i]
    const next = screenPts[i + 1]
    const v1: Vec2 = [curr[0] - prev[0], curr[1] - prev[1]]
    const v2: Vec2 = [next[0] - curr[0], next[1] - curr[1]]
    const len1 = Math.hypot(v1[0], v1[1])
    const len2 = Math.hypot(v2[0], v2[1])
    if (len1 < 0.5 || len2 < 0.5) {
      d += `L${fmt(curr[0])} ${fmt(curr[1])}`
      continue
    }
    const r = Math.min(bendRadius, len1 / 2, len2 / 2)
    const p1: Vec2 = [curr[0] - (v1[0] / len1) * r, curr[1] - (v1[1] / len1) * r]
    const p2: Vec2 = [curr[0] + (v2[0] / len2) * r, curr[1] + (v2[1] / len2) * r]
    d += `L${fmt(p1[0])} ${fmt(p1[1])}Q${fmt(curr[0])} ${fmt(curr[1])} ${fmt(p2[0])} ${fmt(p2[1])}`
  }
  const last = screenPts[screenPts.length - 1]
  d += `L${fmt(last[0])} ${fmt(last[1])}`
  return d
}

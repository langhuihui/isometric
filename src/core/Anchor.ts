/**
 * 等距 SVG 锚点（端口）—— 屏幕对齐，不随形体透视变形
 */

import {
  type FaceName,
  type PositionName,
  type Vec2,
  cssColor,
  fmt,
  parseColor,
  towardWhite
} from './isoSvg'

export type AnchorStyle =
  | 'dot'
  | 'ring'
  | 'double'
  | 'diamond'
  | 'square'
  | 'plus'
  | 'cross'
  | 'pin'
  | 'arrow'
  | 'hex'
  | 'dash'

export const ANCHOR_STYLES: AnchorStyle[] = [
  'dot', 'ring', 'double', 'diamond', 'square',
  'plus', 'cross', 'pin', 'arrow', 'hex', 'dash'
]

export interface AnchorOptions {
  style?: AnchorStyle
  size?: number
  color?: string
  fill?: string
  stroke?: string
  strokeWidth?: number
  glow?: boolean
  opacity?: number
  /** 屏幕旋转角（度），arrow / dash 用 */
  rotate?: number
}

export interface ShapeAnchor extends AnchorOptions {
  face: FaceName | 'side'
  position?: PositionName
  /** 圆柱圆周角（度），覆盖 position 的默认角 */
  angle?: number
  /** 侧面高度 0=底 1=顶 */
  t?: number
}

let uid = 0

export function renderAnchor(x: number, y: number, options: AnchorOptions = {}, id?: string): string {
  const style = options.style ?? 'dot'
  const s = Math.max(2, options.size ?? 8)
  const color = options.color ?? '#5eead4'
  const fill = options.fill ?? color
  const stroke = options.stroke ?? '#ffffff'
  const sw = options.strokeWidth ?? (style === 'plus' || style === 'cross' || style === 'dash' ? 1.8 : 1.15)
  const op = options.opacity ?? 1
  const pid = id || `ia${++uid}`
  const fillCss = cssColor(parseColor(fill))
  const strokeCss = cssColor(parseColor(stroke))
  const rot = options.rotate ?? 0

  let defs = ''
  if (options.glow) {
    const g = towardWhite(parseColor(fill), 0.2)
    defs = `<filter id="${pid}-g" x="-80%" y="-80%" width="260%" height="260%">` +
      `<feDropShadow dx="0" dy="0" stdDeviation="${fmt(s * 0.28)}" ` +
      `flood-color="${cssColor(g)}" flood-opacity="0.9"/></filter>`
  }

  const inner = drawStyle(style, s, fillCss, strokeCss, sw)
  const filter = options.glow ? ` filter="url(#${pid}-g)"` : ''
  const t = rot
    ? `translate(${fmt(x)} ${fmt(y)}) rotate(${fmt(rot)})`
    : `translate(${fmt(x)} ${fmt(y)})`
  const opacity = op < 0.999 ? ` opacity="${fmt(op)}"` : ''

  return (defs ? `<defs>${defs}</defs>` : '') +
    `<g${filter}${opacity} transform="${t}">${inner}</g>`
}

function drawStyle(
  style: AnchorStyle,
  s: number,
  fill: string,
  stroke: string,
  sw: number
): string {
  const r = fmt(s)
  switch (style) {
    case 'ring':
      return `<circle cx="0" cy="0" r="${r}" fill="none" stroke="${fill}" stroke-width="${fmt(sw + 0.6)}"/>`
    case 'double':
      return `<circle cx="0" cy="0" r="${r}" fill="none" stroke="${fill}" stroke-width="${fmt(sw)}"/>` +
        `<circle cx="0" cy="0" r="${fmt(s * 0.38)}" fill="${fill}"/>`
    case 'diamond':
      return `<path d="M0 ${fmt(-s)} L${r} 0 L0 ${r} L${fmt(-s)} 0 Z" ` +
        `fill="${fill}" stroke="${stroke}" stroke-width="${fmt(sw)}" stroke-linejoin="round"/>`
    case 'square':
      return `<rect x="${fmt(-s * 0.78)}" y="${fmt(-s * 0.78)}" width="${fmt(s * 1.56)}" height="${fmt(s * 1.56)}" ` +
        `rx="1.2" fill="${fill}" stroke="${stroke}" stroke-width="${fmt(sw)}"/>`
    case 'plus':
      return `<path d="M0 ${fmt(-s)} L0 ${r} M${fmt(-s)} 0 L${r} 0" ` +
        `fill="none" stroke="${fill}" stroke-width="${fmt(sw)}" stroke-linecap="round"/>`
    case 'cross':
      return `<path d="M${fmt(-s * 0.78)} ${fmt(-s * 0.78)} L${fmt(s * 0.78)} ${fmt(s * 0.78)} ` +
        `M${fmt(s * 0.78)} ${fmt(-s * 0.78)} L${fmt(-s * 0.78)} ${fmt(s * 0.78)}" ` +
        `fill="none" stroke="${fill}" stroke-width="${fmt(sw)}" stroke-linecap="round"/>`
    case 'pin':
      return `<path d="M0 ${fmt(s * 1.15)} C${fmt(-s)} ${fmt(s * 0.15)} ${fmt(-s * 0.95)} ${fmt(-s)} 0 ${fmt(-s)} ` +
        `C${fmt(s * 0.95)} ${fmt(-s)} ${r} ${fmt(s * 0.15)} 0 ${fmt(s * 1.15)}Z" ` +
        `fill="${fill}" stroke="${stroke}" stroke-width="${fmt(sw * 0.8)}" stroke-linejoin="round"/>` +
        `<circle cx="0" cy="${fmt(-s * 0.28)}" r="${fmt(s * 0.32)}" fill="${stroke}"/>`
    case 'arrow':
      return `<path d="M0 ${fmt(-s)} L${fmt(s * 0.85)} ${fmt(s * 0.55)} L0 ${fmt(s * 0.15)} ` +
        `L${fmt(-s * 0.85)} ${fmt(s * 0.55)} Z" ` +
        `fill="${fill}" stroke="${stroke}" stroke-width="${fmt(sw)}" stroke-linejoin="round"/>`
    case 'hex': {
      const pts: string[] = []
      for (let i = 0; i < 6; i++) {
        const a = (30 + i * 60) * Math.PI / 180
        pts.push(`${fmt(s * Math.cos(a))} ${fmt(s * Math.sin(a))}`)
      }
      return `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="${stroke}" ` +
        `stroke-width="${fmt(sw)}" stroke-linejoin="round"/>`
    }
    case 'dash':
      return `<path d="M${fmt(-s * 1.1)} 0 L${fmt(s * 1.1)} 0" ` +
        `fill="none" stroke="${fill}" stroke-width="${fmt(Math.max(2.2, sw + 0.8))}" stroke-linecap="round"/>`
    case 'dot':
    default:
      return `<circle cx="0" cy="0" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${fmt(sw)}"/>`
  }
}

export function renderAnchorsAt(
  points: Array<{ p: Vec2; opts?: AnchorOptions }>,
  idPrefix: string
): string {
  return points.map((item, i) =>
    renderAnchor(item.p[0], item.p[1], item.opts ?? {}, `${idPrefix}-a${i}`)
  ).join('')
}

export function visibleFaceAnchors(style: AnchorStyle = 'dot', size = 6, color?: string): ShapeAnchor[] {
  return (['top', 'front', 'right'] as FaceName[]).map(face => ({
    face,
    position: 'mc',
    style,
    size,
    color
  }))
}

/** 圆柱：顶心 + 可见侧面腰线（右 / 前右 / 前） */
export function cylinderVisibleAnchors(style: AnchorStyle = 'dot', size = 6, color?: string): ShapeAnchor[] {
  return [
    { face: 'top', position: 'mc', style, size, color },
    { face: 'side', angle: 0, t: 0.5, style, size, color },
    { face: 'side', angle: 45, t: 0.5, style, size, color },
    { face: 'side', angle: 90, t: 0.5, style, size, color }
  ]
}

export function parseAnchorsAttr(raw: string | null, show: boolean, style: AnchorStyle, color?: string): ShapeAnchor[] | undefined {
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as ShapeAnchor[]
      if (Array.isArray(parsed)) return parsed
    } catch { /* ignore */ }
  }
  if (show) return visibleFaceAnchors(style, 6, color)
  return undefined
}

export function maxAnchorExtent(anchors: ShapeAnchor[] | undefined): number {
  if (!anchors || !anchors.length) return 0
  let m = 0
  for (const a of anchors) {
    const s = a.size ?? 8
    m = Math.max(m, a.style === 'pin' ? s * 1.4 : s + 3)
  }
  return m
}

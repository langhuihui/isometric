/**
 * SVG 等距投影与着色的共用数学（RoundedBox / Cylinder / Anchor）
 */

export type Vec3 = [number, number, number]
export type Vec2 = [number, number]

export type FaceName = 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right'
export type PositionName = 'tl' | 'tc' | 'tr' | 'ml' | 'mc' | 'mr' | 'bl' | 'bc' | 'br'

export const RAD = Math.PI / 180

export const FACE_NORMALS: Record<FaceName, Vec3> = {
  top: [0, 0, 1],
  bottom: [0, 0, -1],
  front: [0, 1, 0],
  back: [0, -1, 0],
  left: [-1, 0, 0],
  right: [1, 0, 0]
}

/** 面上相对坐标：u 沿 +X（左→右），v 沿 +Y（后→前）；侧面 v=0 为顶边 */
export const POS_UV: Record<PositionName, Vec2> = {
  tl: [0, 0], tc: [0.5, 0], tr: [1, 0],
  ml: [0, 0.5], mc: [0.5, 0.5], mr: [1, 0.5],
  bl: [0, 1], bc: [0.5, 1], br: [1, 1]
}

export const dot3 = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

/** 数字格式化（截断到 0.01px） */
export const fmt = (n: number): string => {
  const v = Math.round(n * 100) / 100
  return Object.is(v, -0) ? '0' : String(v)
}

export const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n))

// ---------------------------------------------------------------------------
// 颜色
// ---------------------------------------------------------------------------

export interface RGBA { r: number; g: number; b: number; a: number }

export function parseColor(input: string): RGBA {
  const s = (input || '').trim()
  if (s.startsWith('#')) {
    let hex = s.slice(1)
    if (hex.length === 3 || hex.length === 4) hex = hex.split('').map(c => c + c).join('')
    const num = parseInt(hex.slice(0, 6), 16)
    if (!Number.isNaN(num)) {
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
      return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255, a }
    }
  }
  const m = s.match(/rgba?\(([^)]+)\)/i)
  if (m) {
    const p = m[1].split(',').map(t => parseFloat(t))
    return { r: p[0] || 0, g: p[1] || 0, b: p[2] || 0, a: p.length > 3 ? p[3] : 1 }
  }
  return { r: 136, g: 136, b: 136, a: 1 }
}

export function cssColor(c: RGBA): string {
  const r = Math.round(clamp(c.r, 0, 255))
  const g = Math.round(clamp(c.g, 0, 255))
  const b = Math.round(clamp(c.b, 0, 255))
  if (c.a >= 0.999) {
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
  }
  return `rgba(${r},${g},${b},${Math.round(c.a * 1000) / 1000})`
}

interface HSL { h: number; s: number; l: number; a: number }

function rgbToHsl(c: RGBA): HSL {
  const r = c.r / 255, g = c.g / 255, b = c.b / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d < 1e-6) return { h: 0, s: 0, l, a: c.a }
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return { h: h * 360, s, l, a: c.a }
}

function hslToRgb(h: number, s: number, l: number, a: number): RGBA {
  const hh = (((h % 360) + 360) % 360) / 360
  const sat = clamp(s, 0, 1)
  const lit = clamp(l, 0, 1)
  if (sat < 1e-6) {
    const v = lit * 255
    return { r: v, g: v, b: v, a }
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  const q = lit < 0.5 ? lit * (1 + sat) : lit + sat - lit * sat
  const p = 2 * lit - q
  return {
    r: hue2rgb(p, q, hh + 1 / 3) * 255,
    g: hue2rgb(p, q, hh) * 255,
    b: hue2rgb(p, q, hh - 1 / 3) * 255,
    a
  }
}

/** 暗面：降明度，色相偏冷蓝。f=1 原色，f=0.62 为默认暗面 */
export function shadeColor(c: RGBA, f: number): RGBA {
  const k = clamp(f, 0, 1)
  const t = 1 - k
  const hsl = rgbToHsl(c)
  const h = hsl.s < 0.05 ? 230 : hsl.h + 12 * t
  const s = hsl.s < 0.05 ? 0.1 * t : hsl.s * (1 - 0.06 * t)
  return hslToRgb(h, s, hsl.l * k, c.a)
}

/** 亮面：提明度，色相偏暖黄 */
export function liftColor(c: RGBA, t: number): RGBA {
  const k = clamp(t, 0, 1)
  const hsl = rgbToHsl(c)
  const h = hsl.s < 0.05 ? 42 : hsl.h - 8 * k
  const s = hsl.s < 0.05 ? 0.12 * k : clamp(hsl.s + 0.08 * k, 0, 1)
  return hslToRgb(h, s, hsl.l + (1 - hsl.l) * k * 0.85, c.a)
}

export const towardWhite = (c: RGBA, t: number): RGBA => ({
  r: c.r + (255 - c.r) * t,
  g: c.g + (255 - c.g) * t,
  b: c.b + (255 - c.b) * t,
  a: c.a
})

/** 单色派生三面：顶亮暖、前为基色、右暗冷 */
export function deriveFaceColors(base: RGBA, shade = 0.62): { top: RGBA; front: RGBA; right: RGBA } {
  return {
    top: liftColor(base, 0.28),
    front: base,
    right: shadeColor(base, shade)
  }
}

export function resolveFaceColors(
  colors: { top?: string; front?: string; right?: string; side?: string } | undefined,
  base: string | undefined,
  shade: number
): { top: RGBA; front: RGBA; right: RGBA } {
  const derived = base ? deriveFaceColors(parseColor(base), shade) : null
  const frontSrc = colors?.front ?? colors?.side
  const rightSrc = colors?.right ?? colors?.side
  return {
    top: colors?.top ? parseColor(colors.top) : derived?.top ?? parseColor('#7fa8ef'),
    front: frontSrc ? parseColor(frontSrc) : derived?.front ?? parseColor('#4f7fd9'),
    right: rightSrc ? parseColor(rightSrc) : derived?.right ?? parseColor('#3763b0')
  }
}

// ---------------------------------------------------------------------------
// 正交投影
// ---------------------------------------------------------------------------

export interface Projection {
  view: Vec3
  rotateX: number
  rotateZ: number
  project(p: Vec3): Vec2
}

export function makeProjection(rotateXDeg: number, rotateZDeg: number): Projection {
  const a = clamp(rotateXDeg, 1, 89) * RAD
  const b = clamp(rotateZDeg, 1, 89) * RAD
  const cosB = Math.cos(b), sinB = Math.sin(b)
  const cosA = Math.cos(a), sinA = Math.sin(a)
  return {
    view: [sinA * sinB, sinA * cosB, cosA],
    rotateX: rotateXDeg,
    rotateZ: rotateZDeg,
    project: (p: Vec3): Vec2 => [
      p[0] * cosB - p[1] * sinB,
      (p[0] * sinB + p[1] * cosB) * cosA - p[2] * sinA
    ]
  }
}

export function projectPoint(x: number, y: number, z: number, rotateX = 60, rotateZ = 45): Vec2 {
  return makeProjection(rotateX, rotateZ).project([x, y, z])
}

export function viewDepth(x: number, y: number, z: number, rotateX = 60, rotateZ = 45): number {
  return dot3([x, y, z], makeProjection(rotateX, rotateZ).view)
}

export interface ViewBox {
  x: number
  y: number
  width: number
  height: number
}

export function boundsOf(points: Vec2[], margin: number): ViewBox {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0])
    minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1])
  }
  if (!Number.isFinite(minX)) {
    minX = 0; minY = 0; maxX = 1; maxY = 1
  }
  return {
    x: minX - margin, y: minY - margin,
    width: maxX - minX + margin * 2, height: maxY - minY + margin * 2
  }
}

export function wrapSvg(markup: string, viewBox: ViewBox): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `viewBox="${fmt(viewBox.x)} ${fmt(viewBox.y)} ${fmt(viewBox.width)} ${fmt(viewBox.height)}" ` +
    `width="${fmt(viewBox.width)}" height="${fmt(viewBox.height)}">${markup}</svg>`
}

/** 盒体局部坐标：原点在 (0,0,0) 角点，尺寸 (w,h,d) */
export function boxFacePoint(w: number, h: number, d: number, face: FaceName, pos: PositionName = 'mc'): Vec3 {
  const [u, v] = POS_UV[pos] || POS_UV.mc
  switch (face) {
    case 'top': return [w * u, h * v, d]
    case 'bottom': return [w * u, h * v, 0]
    case 'front': return [w * u, h, d * (1 - v)]
    case 'back': return [w * u, 0, d * (1 - v)]
    case 'right': return [w, h * u, d * (1 - v)]
    case 'left': return [0, h * u, d * (1 - v)]
  }
}

/** 顶面 9 宫格 → 椭圆极坐标（mc 在圆心，其余在圆周） */
const TOP_POLAR: Record<PositionName, { ang: number; rad: number }> = {
  mc: { ang: 0, rad: 0 },
  mr: { ang: 0, rad: 1 },
  br: { ang: 45, rad: 1 },
  bc: { ang: 90, rad: 1 },
  bl: { ang: 135, rad: 1 },
  ml: { ang: 180, rad: 1 },
  tl: { ang: 225, rad: 1 },
  tc: { ang: 270, rad: 1 },
  tr: { ang: 315, rad: 1 }
}

const SIDE_ANGLE: Record<string, number> = {
  right: 0, front: 90, left: 180, back: 270
}

export function cylinderAnchorPoint(
  rx: number,
  ry: number,
  d: number,
  face: FaceName | 'side',
  pos: PositionName = 'mc',
  angle?: number,
  t?: number
): Vec3 {
  const cx = rx, cy = ry
  if (face === 'top' || face === 'bottom') {
    const polar = TOP_POLAR[pos] || TOP_POLAR.mc
    const deg = angle ?? polar.ang
    const rad = angle != null ? 1 : polar.rad
    const z = face === 'top' ? d : 0
    return [
      cx + rx * rad * Math.cos(deg * RAD),
      cy + ry * rad * Math.sin(deg * RAD),
      z
    ]
  }
  const deg = angle ?? SIDE_ANGLE[face] ?? 90
  const [, v] = POS_UV[pos] || POS_UV.mc
  const height = t ?? (1 - v)
  return [
    cx + rx * Math.cos(deg * RAD),
    cy + ry * Math.sin(deg * RAD),
    d * clamp(height, 0, 1)
  ]
}

// ---------------------------------------------------------------------------
// 共用外观
// ---------------------------------------------------------------------------

export type MaterialName = 'matte' | 'plastic' | 'glass' | 'metal'

export const MATERIALS: Record<MaterialName, Partial<IsoShapeStyle>> = {
  matte: {
    topHighlight: 0.18, specular: 0.08, shade: 0.68,
    rim: true, rimWidth: 0.9, rimOpacity: 0.55,
    ao: true, aoStrength: 0.22, bevel: false, glow: false,
    shadow: true, shadowOpacity: 0.28, shadowCast: 0.85
  },
  plastic: {
    topHighlight: 0.42, specular: 0.45, shade: 0.62,
    rim: true, rimWidth: 1.2, rimOpacity: 0.85,
    ao: true, aoStrength: 0.28, bevel: true, glow: false,
    shadow: true, shadowOpacity: 0.3, shadowCast: 1
  },
  glass: {
    opacity: 0.46, topHighlight: 0.7, specular: 0.55, shade: 0.72,
    rim: true, rimWidth: 1.6, rimOpacity: 0.95,
    stroke: 'rgba(255,255,255,0.4)', strokeWidth: 1.1,
    glow: true, glowBlur: 10, ao: false, bevel: true,
    shadow: true, shadowOpacity: 0.2, shadowCast: 1.15
  },
  metal: {
    topHighlight: 0.55, specular: 0.9, shade: 0.48,
    rim: true, rimWidth: 1.4, rimOpacity: 0.9,
    ao: true, aoStrength: 0.18, bevel: true, glow: false,
    shadow: true, shadowOpacity: 0.32, shadowCast: 1
  }
}

export const isMaterialName = (v: string | null | undefined): v is MaterialName =>
  v === 'matte' || v === 'plastic' || v === 'glass' || v === 'metal'

/** 材质作底，显式字段覆盖 */
export function applyMaterial<T extends IsoShapeStyle>(options: T): T {
  const name = options.material
  if (!name || !MATERIALS[name]) return options
  const merged = { ...MATERIALS[name] } as T
  for (const key of Object.keys(options) as (keyof T)[]) {
    const v = options[key]
    if (v !== undefined) merged[key] = v
  }
  return merged
}

export interface IsoShapeStyle {
  /** 具名材质，作外观默认值；显式字段优先 */
  material?: MaterialName
  /** 主色；未手填 top/front/right 时派生三面 */
  color?: string
  /** 整体透明度 0–1 */
  opacity?: number
  /** 轮廓描边色，缺省不描边 */
  stroke?: string
  strokeWidth?: number
  strokeOpacity?: number
  /** 顶面径向高光 0–1（0 = 纯色） */
  topHighlight?: number
  /** 顶边高光 */
  rim?: boolean
  rimWidth?: number
  rimOpacity?: number
  /** 侧面底部环境光遮蔽 */
  ao?: boolean
  aoStrength?: number
  /** 外发光 */
  glow?: boolean
  glowColor?: string
  glowBlur?: number
  /** 顶面斜切高光带 */
  bevel?: boolean
  /** 暗面着色倍率，默认 0.62 */
  shade?: number
  /** 侧面高光（类镜面），0–1 */
  specular?: number
  /** 地面软阴影（接触 + 投射） */
  shadow?: boolean
  shadowOpacity?: number
  /** 投射阴影长度倍率，0 = 仅接触阴影，默认 1 */
  shadowCast?: number
}

export interface IsoShapeResult {
  svg: string
  markup: string
  viewBox: ViewBox
  topPath: string
  project: (x: number, y: number, z: number) => Vec2
}

export function styleMargin(style: IsoShapeStyle, extra = 0): number {
  let m = 2
  if (style.shadow) m = Math.max(m, 20 + (style.shadowCast ?? 1) * 24)
  if (style.glow) m = Math.max(m, (style.glowBlur ?? 8) * 2 + 6)
  if (style.stroke) m = Math.max(m, (style.strokeWidth ?? 1.4) + 2)
  return Math.max(m, extra)
}

/** 光线从左前上方来，影子落向 +X −Y（rz=45 时屏幕右下） */
export function shadowOffset(
  project: (p: Vec3) => Vec2,
  depth: number,
  cast = 1
): Vec2 {
  const len = Math.max(6, depth * 0.32 * clamp(cast, 0, 3))
  const a = project([0, 0, 0])
  const b = project([0.62 * len, -0.38 * len, 0])
  return [b[0] - a[0], b[1] - a[1]]
}

export function groundShadowMarkup(
  footprint: string,
  pid: string,
  style: IsoShapeStyle,
  size: number,
  offset: Vec2
): { defs: string; markup: string } {
  const op = style.shadowOpacity ?? 0.3
  const contactBlur = Math.max(1.2, Math.min(4, size * 0.022 + 1))
  const castBlur = Math.max(5, Math.min(18, size * 0.07 + 6))
  const cast = style.shadowCast ?? 1
  let defs = shadowFilterDef(`${pid}-shc`, contactBlur)
  let markup =
    `<path d="${footprint}" fill="#000" opacity="${fmt(Math.min(0.5, op * 1.2))}" ` +
    `filter="url(#${pid}-shc)"/>`
  if (cast > 0.01) {
    defs += shadowFilterDef(`${pid}-shd`, castBlur)
    markup =
      `<path d="${footprint}" fill="#000" opacity="${fmt(op * 0.5)}" ` +
      `filter="url(#${pid}-shd)" transform="translate(${fmt(offset[0])} ${fmt(offset[1])})"/>` +
      markup
  }
  return { defs, markup }
}

export function isoStyleFromElement(el: HTMLElement): IsoShapeStyle {
  const num = (name: string): number | undefined => {
    if (!el.hasAttribute(name)) return undefined
    const v = parseFloat(el.getAttribute(name) ?? '')
    return Number.isFinite(v) ? v : undefined
  }
  const flag = (on: string, off: string): boolean | undefined => {
    if (el.hasAttribute(off)) return false
    if (el.hasAttribute(on)) return true
    return undefined
  }
  const material = el.getAttribute('material')
  return {
    material: isMaterialName(material) ? material : undefined,
    color: el.getAttribute('color') ?? undefined,
    shadow: flag('shadow', 'no-shadow'),
    rim: el.hasAttribute('no-rim') ? false : undefined,
    stroke: el.getAttribute('stroke') ?? undefined,
    strokeWidth: num('stroke-width'),
    topHighlight: num('top-highlight'),
    shade: num('shade'),
    specular: num('specular'),
    ao: flag('ao', 'no-ao'),
    glow: flag('glow', 'no-glow'),
    glowColor: el.getAttribute('glow-color') ?? undefined,
    glowBlur: num('glow-blur'),
    bevel: flag('bevel', 'no-bevel'),
    opacity: num('opacity'),
    rimWidth: num('rim-width'),
    shadowCast: num('shadow-cast')
  }
}

export function glowFilterDef(id: string, color: string, blur: number): string {
  return `<filter id="${id}" x="-40%" y="-40%" width="180%" height="180%" ` +
    `color-interpolation-filters="sRGB">` +
    `<feGaussianBlur in="SourceAlpha" stdDeviation="${fmt(blur)}" result="b"/>` +
    `<feFlood flood-color="${color}" flood-opacity="0.85" result="c"/>` +
    `<feComposite in="c" in2="b" operator="in" result="g"/>` +
    `<feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>` +
    `</filter>`
}

export function shadowFilterDef(id: string, blur: number): string {
  return `<filter id="${id}" x="-40%" y="-40%" width="180%" height="180%">` +
    `<feGaussianBlur stdDeviation="${fmt(blur)}"/></filter>`
}

export function aoGradientDef(
  id: string,
  yTop: number,
  yBot: number,
  strength: number
): string {
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" ` +
    `x1="0" y1="${fmt(yTop)}" x2="0" y2="${fmt(yBot)}">` +
    `<stop offset="0" stop-color="#000" stop-opacity="0"/>` +
    `<stop offset="0.72" stop-color="#000" stop-opacity="0"/>` +
    `<stop offset="1" stop-color="#000" stop-opacity="${fmt(clamp(strength, 0, 1))}"/>` +
    `</linearGradient>`
}

export function topHighlightGradientDef(
  id: string,
  cx: number,
  cy: number,
  r: number,
  fx: number,
  fy: number,
  base: RGBA,
  amount: number
): string {
  const hi = liftColor(base, clamp(amount, 0, 1) * 0.62)
  const edge = shadeColor(base, 1 - 0.1 * amount)
  return `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" ` +
    `cx="${fmt(cx)}" cy="${fmt(cy)}" r="${fmt(Math.max(4, r))}" ` +
    `fx="${fmt(fx)}" fy="${fmt(fy)}">` +
    `<stop offset="0" stop-color="${cssColor({ ...hi, a: 1 })}"/>` +
    `<stop offset="0.55" stop-color="${cssColor({ ...base, a: 1 })}"/>` +
    `<stop offset="1" stop-color="${cssColor({ ...edge, a: 1 })}"/>` +
    `</radialGradient>`
}

/** Lambert 高光：把侧面色按法线与水平视线的对齐程度提亮 */
export function applySpecular(c: RGBA, nx: number, ny: number, rotateZDeg: number, amount: number): RGBA {
  if (amount <= 0) return c
  const b = clamp(rotateZDeg, 1, 89) * RAD
  const lit = Math.max(0, nx * Math.sin(b) + ny * Math.cos(b))
  return towardWhite(c, Math.pow(lit, 6) * clamp(amount, 0, 1) * 0.75)
}

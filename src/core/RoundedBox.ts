/**
 * RoundedBox —— 水平圆角立方体（圆角柱）SVG 渲染器
 *
 * 形体：俯视为圆角矩形、沿 Z 轴垂直拉伸的柱体 —— 即效果图里常见的
 * 「四条垂直棱为圆角、上下边缘保持锐利」的圆角立方体。
 *
 * 渲染原理（纯数学，全部精确，不依赖 CSS 3D / Canvas / WebGL）：
 *
 * 1. 正交投影是仿射变换，水平面上的圆弧投影成椭圆弧。贝塞尔曲线具有
 *    仿射不变性，因此把平面圆角矩形的贝塞尔控制点直接投影，就得到
 *    顶面/底面的精确轮廓。
 *
 * 2. 侧面是垂直拉伸面，拉伸方向（Z 轴）投影后是屏幕竖直方向，
 *    所以侧面上「等法线角 φ」的母线投影后都是竖直线段。
 *    整个可见侧面可以用一条路径 + 一个水平 userSpaceOnUse 线性渐变
 *    精确着色：每个 stop 的位置 = 该母线的屏幕 x，颜色由统一着色函数给出。
 *
 * 3. 可见侧面的左右边界（轮廓母线）出现在平面法线垂直于视线的地方，
 *    解析解为 φ_L = 180° − rotateZ、φ_R = 360° − rotateZ。
 *
 * 4. 统一着色函数 c(n) = nx²·c(x侧) + ny²·c(y侧)：在平坦墙面上退化为
 *    该面纯色，在圆角圆柱上按 cos²/sin² 平滑插值，接缝处颜色严格连续。
 */

// ---------------------------------------------------------------------------
// 基础类型与工具
// ---------------------------------------------------------------------------

export type Vec3 = [number, number, number]
export type Vec2 = [number, number]

const RAD = Math.PI / 180
const dot3 = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

/** 数字格式化（截断到 0.01px，减小输出体积） */
const fmt = (n: number): string => {
  const v = Math.round(n * 100) / 100
  return Object.is(v, -0) ? '0' : String(v)
}

// ---------------------------------------------------------------------------
// 颜色工具（支持 #rgb/#rrggbb/#rrggbbaa/rgb()/rgba()，含透明度）
// ---------------------------------------------------------------------------

interface RGBA { r: number; g: number; b: number; a: number }

function parseColor(input: string): RGBA {
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

function cssColor(c: RGBA): string {
  const r = Math.round(Math.max(0, Math.min(255, c.r)))
  const g = Math.round(Math.max(0, Math.min(255, c.g)))
  const b = Math.round(Math.max(0, Math.min(255, c.b)))
  if (c.a >= 0.999) {
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
  }
  return `rgba(${r},${g},${b},${Math.round(c.a * 1000) / 1000})`
}

const shadeColor = (c: RGBA, f: number): RGBA => ({ r: c.r * f, g: c.g * f, b: c.b * f, a: c.a })
const towardWhite = (c: RGBA, t: number): RGBA => ({
  r: c.r + (255 - c.r) * t,
  g: c.g + (255 - c.g) * t,
  b: c.b + (255 - c.b) * t,
  a: c.a
})

// ---------------------------------------------------------------------------
// 正交投影
// ---------------------------------------------------------------------------

interface Projection {
  view: Vec3
  project(p: Vec3): Vec2
}

function makeProjection(rotateXDeg: number, rotateZDeg: number): Projection {
  // 避开完全边缘正对的退化角度
  const a = Math.max(1, Math.min(89, rotateXDeg)) * RAD
  const b = Math.max(1, Math.min(89, rotateZDeg)) * RAD
  const cosB = Math.cos(b), sinB = Math.sin(b)
  const cosA = Math.cos(a), sinA = Math.sin(a)
  return {
    view: [sinA * sinB, sinA * cosB, cosA],
    project: (p: Vec3): Vec2 => [
      p[0] * cosB - p[1] * sinB,
      (p[0] * sinB + p[1] * cosB) * cosA - p[2] * sinA
    ]
  }
}

/** 把模型/世界坐标投影到屏幕坐标（用于场景内摆放多个物体） */
export function projectPoint(x: number, y: number, z: number, rotateX = 60, rotateZ = 45): Vec2 {
  return makeProjection(rotateX, rotateZ).project([x, y, z])
}

/** 观察深度（越大越靠近观察者，用于多物体的画家算法排序） */
export function viewDepth(x: number, y: number, z: number, rotateX = 60, rotateZ = 45): number {
  return dot3([x, y, z], makeProjection(rotateX, rotateZ).view)
}

// ---------------------------------------------------------------------------
// 选项与结果
// ---------------------------------------------------------------------------

export interface RoundedBoxOptions {
  /** X 方向尺寸（向右下） */
  width?: number
  /** Y 方向尺寸（向左下，俯视纵深） */
  height?: number
  /** Z 方向尺寸（垂直高度） */
  depth?: number
  /** 水平圆角半径，自动钳制到 min(width,height)/2 */
  radius?: number
  colors?: { top?: string; front?: string; right?: string }
  rotateX?: number
  rotateZ?: number
  /** 每个圆角的渐变采样数，默认 8 */
  gradientStops?: number
  /** 顶面边缘高光 */
  rim?: boolean
  /** 是否绘制地面软阴影 */
  shadow?: boolean
  shadowOpacity?: number
  /** 元素 id 前缀（保证渐变 id 唯一），缺省自动生成 */
  id?: string
}

export interface RoundedBoxResult {
  /** 完整 <svg> 字符串（自带 viewBox，可直接 innerHTML） */
  svg: string
  /** 不含外层 <svg> 的内容（defs + 图形），坐标原点 = 模型 (0,0,0) 的投影，用于组合场景 */
  markup: string
  viewBox: { x: number; y: number; width: number; height: number }
  /** 顶面圆角矩形的投影路径（d 字符串），可用来裁剪/放置顶面内容 */
  topPath: string
  /** 该盒使用的投影函数（模型坐标 → 本地屏幕坐标） */
  project: (x: number, y: number, z: number) => Vec2
}

// ---------------------------------------------------------------------------
// 主渲染函数
// ---------------------------------------------------------------------------

let uid = 0

export function renderRoundedBox(options: RoundedBoxOptions = {}): RoundedBoxResult {
  const W = Math.max(1, options.width ?? 100)
  const H = Math.max(1, options.height ?? 100)
  const D = Math.max(1, options.depth ?? 100)
  const r = Math.max(0, Math.min(options.radius ?? 16, Math.min(W, H) / 2))
  const stopsPerArc = Math.max(2, Math.min(24, Math.round(options.gradientStops ?? 8)))
  const pid = options.id || `irb${++uid}`

  const rotateX = options.rotateX ?? 60
  const rotateZ = options.rotateZ ?? 45
  const P = makeProjection(rotateX, rotateZ)

  // ---- 颜色
  const cTop = parseColor(options.colors?.top ?? '#7fa8ef')
  const cFront = parseColor(options.colors?.front ?? '#4f7fd9')
  const cRight = parseColor(options.colors?.right ?? '#3763b0')
  const cLeft = shadeColor(cFront, 0.62)
  const cBack = shadeColor(cRight, 0.62)

  /** 统一着色函数：水平法线 (nx, ny) → 侧面颜色 */
  const sideColorAt = (nx: number, ny: number): RGBA => {
    const wx = nx * nx, wy = ny * ny
    const cx = nx >= 0 ? cRight : cLeft
    const cy = ny >= 0 ? cFront : cBack
    return {
      r: wx * cx.r + wy * cy.r,
      g: wx * cx.g + wy * cy.g,
      b: wx * cx.b + wy * cy.b,
      a: wx * cx.a + wy * cy.a
    }
  }

  // ---- 俯视圆角矩形几何
  const x0 = r, x1 = W - r
  const y0 = r, y1 = H - r
  // 四个圆角中心与其外法线角度范围（度）：
  // BL(x0,y0):[180,270]  BR(x1,y0):[270,360]  FR(x1,y1):[0,90]  FL(x0,y1):[90,180]
  const corner = {
    BL: [x0, y0] as Vec2, BR: [x1, y0] as Vec2,
    FR: [x1, y1] as Vec2, FL: [x0, y1] as Vec2
  }

  /** 俯视平面点 (px, py, z) → 屏幕 */
  const pr = (p: Vec2, z: number): Vec2 => P.project([p[0], p[1], z])
  /** 圆角上角度 φ（度）处的平面点 */
  const arcPt = (c: Vec2, deg: number): Vec2 =>
    [c[0] + r * Math.cos(deg * RAD), c[1] + r * Math.sin(deg * RAD)]

  /**
   * 生成从 a0 到 a1（度，可正反向）的投影圆弧路径段（不含起点 M/L）。
   * 平面圆弧 → 三次贝塞尔（仿射不变，投影后依然精确）。
   */
  const arcSeg = (c: Vec2, a0: number, a1: number, z: number): string => {
    if (r < 0.05 || Math.abs(a1 - a0) < 0.01) {
      const p = pr(arcPt(c, a1), z)
      return `L${fmt(p[0])} ${fmt(p[1])}`
    }
    let d = ''
    const total = a1 - a0
    const nSeg = Math.ceil(Math.abs(total) / 90)
    for (let i = 0; i < nSeg; i++) {
      const s = a0 + (total * i) / nSeg
      const e = a0 + (total * (i + 1)) / nSeg
      const half = ((e - s) / 2) * RAD
      const k = (4 / 3) * Math.tan(half / 2) * r
      const ps = arcPt(c, s)
      const pe = arcPt(c, e)
      // 切线方向（逆时针参数化的导数，反向弧自动取负）
      const t1: Vec2 = [-Math.sin(s * RAD), Math.cos(s * RAD)]
      const t2: Vec2 = [-Math.sin(e * RAD), Math.cos(e * RAD)]
      const sign = Math.sign(total)
      const c1 = pr([ps[0] + sign * k * t1[0], ps[1] + sign * k * t1[1]], z)
      const c2 = pr([pe[0] - sign * k * t2[0], pe[1] - sign * k * t2[1]], z)
      const p2 = pr(pe, z)
      d += `C${fmt(c1[0])} ${fmt(c1[1])} ${fmt(c2[0])} ${fmt(c2[1])} ${fmt(p2[0])} ${fmt(p2[1])}`
    }
    return d
  }

  const lineTo = (p: Vec2, z: number): string => {
    const q = pr(p, z)
    return `L${fmt(q[0])} ${fmt(q[1])}`
  }

  // ------------------------------------------------------------------
  // 1) 顶面 / 底面轮廓路径（完整圆角矩形）
  // ------------------------------------------------------------------
  const roundRectPath = (z: number): string => {
    const start = pr([x0, 0], z)
    return `M${fmt(start[0])} ${fmt(start[1])}` +
      lineTo([x1, 0], z) + arcSeg(corner.BR, 270, 360, z) +
      lineTo([W, y1], z) + arcSeg(corner.FR, 0, 90, z) +
      lineTo([x0, H], z) + arcSeg(corner.FL, 90, 180, z) +
      lineTo([0, y0], z) + arcSeg(corner.BL, 180, 270, z) +
      'Z'
  }
  const topPath = roundRectPath(D)

  // ------------------------------------------------------------------
  // 2) 可见侧面：单条路径 + 单个水平渐变
  //    轮廓母线角度：φ_L = 180 − rotateZ，φ_R = 360 − rotateZ
  // ------------------------------------------------------------------
  const rz = Math.max(1, Math.min(89, rotateZ))
  const phiL = 180 - rz
  const phiR = 360 - rz

  const Ltop = pr(arcPt(corner.FL, phiL), D)
  const Rbot = pr(arcPt(corner.BR, phiR), 0)

  // 上边缘：φ_L → 前 → 右 → φ_R（沿顶面轮廓）
  const sidePath =
    `M${fmt(Ltop[0])} ${fmt(Ltop[1])}` +
    arcSeg(corner.FL, phiL, 90, D) +
    lineTo([x1, H], D) + arcSeg(corner.FR, 90, 0, D) +
    lineTo([W, y0], D) + arcSeg(corner.BR, 360, phiR, D) +
    // 右侧轮廓母线（竖直向下）
    `L${fmt(Rbot[0])} ${fmt(Rbot[1])}` +
    // 下边缘：反向走回
    arcSeg(corner.BR, phiR, 360, 0) +
    lineTo([W, y1], 0) + arcSeg(corner.FR, 0, 90, 0) +
    lineTo([x0, H], 0) + arcSeg(corner.FL, 90, phiL, 0) +
    'Z'

  // ---- 渐变 stop：沿可见轮廓采样母线（screenX 单调递增）
  const sxL = Ltop[0]
  const sxR = Rbot[0]
  const span = sxR - sxL || 1

  interface StopSample { off: number; c: RGBA }
  const samples: StopSample[] = []
  const sampleArc = (c: Vec2, a0: number, a1: number) => {
    for (let k = 0; k <= stopsPerArc; k++) {
      const deg = a0 + ((a1 - a0) * k) / stopsPerArc
      const sx = pr(arcPt(c, deg), 0)[0]
      samples.push({
        off: (sx - sxL) / span,
        c: sideColorAt(Math.cos(deg * RAD), Math.sin(deg * RAD))
      })
    }
  }
  sampleArc(corner.FL, phiL, 90)
  sampleArc(corner.FR, 90, 0)
  sampleArc(corner.BR, 360, phiR)

  let stops = ''
  let prevOff = 0
  for (const s of samples) {
    const off = Math.max(prevOff, Math.min(1, s.off))
    prevOff = off
    stops += `<stop offset="${fmt(off)}" stop-color="${cssColor({ ...s.c, a: 1 })}"` +
      (s.c.a < 0.999 ? ` stop-opacity="${fmt(s.c.a)}"` : '') + '/>'
  }

  let defs =
    `<linearGradient id="${pid}-side" gradientUnits="userSpaceOnUse" ` +
    `x1="${fmt(sxL)}" y1="0" x2="${fmt(sxR)}" y2="0">${stops}</linearGradient>`

  // ------------------------------------------------------------------
  // 3) 顶面边缘高光（可选）：更亮的侧面色沿顶面轮廓描边
  // ------------------------------------------------------------------
  let rimMarkup = ''
  if (options.rim !== false) {
    let rimStops = ''
    prevOff = 0
    for (const s of samples) {
      const off = Math.max(prevOff, Math.min(1, s.off))
      prevOff = off
      const c = towardWhite(s.c, 0.5)
      rimStops += `<stop offset="${fmt(off)}" stop-color="${cssColor({ ...c, a: 1 })}"/>`
    }
    defs += `<linearGradient id="${pid}-rim" gradientUnits="userSpaceOnUse" ` +
      `x1="${fmt(sxL)}" y1="0" x2="${fmt(sxR)}" y2="0">${rimStops}</linearGradient>`
    rimMarkup = `<path d="${topPath}" fill="none" stroke="url(#${pid}-rim)" ` +
      `stroke-width="1.2" stroke-opacity="0.85" stroke-linejoin="round"/>`
  }

  // ------------------------------------------------------------------
  // 4) 地面软阴影（可选）
  // ------------------------------------------------------------------
  let shadowMarkup = ''
  if (options.shadow) {
    const blur = Math.max(3, Math.min(12, Math.min(W, H) * 0.05 + 3))
    defs += `<filter id="${pid}-sh" x="-40%" y="-40%" width="180%" height="180%">` +
      `<feGaussianBlur stdDeviation="${fmt(blur)}"/></filter>`
    shadowMarkup = `<path d="${roundRectPath(0)}" fill="#000" ` +
      `opacity="${options.shadowOpacity ?? 0.3}" filter="url(#${pid}-sh)"/>`
  }

  // ------------------------------------------------------------------
  // 5) 组装（侧面 → 顶面 → 高光）
  // ------------------------------------------------------------------
  const sideFill = `url(#${pid}-side)`
  const markup =
    `<defs>${defs}</defs>` +
    shadowMarkup +
    `<path d="${sidePath}" fill="${sideFill}"/>` +
    `<path d="${topPath}" fill="${cssColor(cTop)}"/>` +
    rimMarkup

  // ---- 视口范围：顶/底轮廓采样点包围盒
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const z of [0, D]) {
    for (let deg = 0; deg < 360; deg += 5) {
      const c = deg < 90 ? corner.FR : deg < 180 ? corner.FL : deg < 270 ? corner.BL : corner.BR
      const p = pr(arcPt(c, deg), z)
      minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0])
      minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1])
    }
  }
  const margin = options.shadow ? 16 : 2
  const viewBox = {
    x: minX - margin, y: minY - margin,
    width: maxX - minX + margin * 2, height: maxY - minY + margin * 2
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `viewBox="${fmt(viewBox.x)} ${fmt(viewBox.y)} ${fmt(viewBox.width)} ${fmt(viewBox.height)}" ` +
    `width="${fmt(viewBox.width)}" height="${fmt(viewBox.height)}">${markup}</svg>`

  return {
    svg,
    markup,
    viewBox,
    topPath,
    project: (x, y, z) => P.project([x, y, z])
  }
}

/** 直接创建 SVG DOM 元素（浏览器环境） */
export function createRoundedBoxSvg(options: RoundedBoxOptions = {}): SVGSVGElement {
  const holder = document.createElement('div')
  holder.innerHTML = renderRoundedBox(options).svg
  return holder.firstElementChild as SVGSVGElement
}

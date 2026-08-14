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

import { maxAnchorExtent, renderAnchorsAt, type ShapeAnchor } from './Anchor'
import {
  type IsoShapeResult,
  type IsoShapeStyle,
  type RGBA,
  type Vec2,
  RAD,
  aoGradientDef,
  applyMaterial,
  applySpecular,
  boxFacePoint,
  boundsOf,
  projectedFaceBasis,
  clippedLabelMarkup,
  cssColor,
  fmt,
  glowFilterDef,
  groundShadowMarkup,
  isoGridLines,
  makeProjection,
  resolveFaceColors,
  shadeColor,
  shadowOffset,
  styleMargin,
  surfaceExtras,
  topHighlightGradientDef,
  towardWhite,
  wrapSvg
} from './isoSvg'
import { renderShapeFx } from './IsoFx'

export type { Vec2, Vec3 } from './isoSvg'
export { projectPoint, viewDepth } from './isoSvg'

export interface RoundedBoxOptions extends IsoShapeStyle {
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
  /** 元素 id 前缀（保证渐变 id 唯一），缺省自动生成 */
  id?: string
  anchors?: ShapeAnchor[]
}

export type RoundedBoxResult = IsoShapeResult

let uid = 0

export function renderRoundedBox(raw: RoundedBoxOptions = {}): RoundedBoxResult {
  const options = applyMaterial(raw)
  const W = Math.max(1, options.width ?? 100)
  const H = Math.max(1, options.height ?? 100)
  const D = Math.max(1, options.depth ?? 100)
  const r = Math.max(0, Math.min(options.radius ?? 16, Math.min(W, H) / 2))
  const stopsPerArc = Math.max(2, Math.min(24, Math.round(options.gradientStops ?? 8)))
  const pid = options.id || `irb${++uid}`

  const rotateX = options.rotateX ?? 60
  const rotateZ = options.rotateZ ?? 45
  const P = makeProjection(rotateX, rotateZ)

  const shade = options.shade ?? 0.62
  const { top: cTop, front: cFront, right: cRight } =
    resolveFaceColors(options.colors, options.color, shade)
  const cLeft = shadeColor(cFront, shade)
  const cBack = shadeColor(cRight, shade)
  const specular = options.specular ?? 0

  const sideColorAt = (nx: number, ny: number): RGBA => {
    const wx = nx * nx, wy = ny * ny
    const cx = nx >= 0 ? cRight : cLeft
    const cy = ny >= 0 ? cFront : cBack
    const c: RGBA = {
      r: wx * cx.r + wy * cy.r,
      g: wx * cx.g + wy * cy.g,
      b: wx * cx.b + wy * cy.b,
      a: wx * cx.a + wy * cy.a
    }
    return applySpecular(c, nx, ny, rotateZ, specular)
  }

  const x0 = r, x1 = W - r
  const y0 = r, y1 = H - r
  const corner = {
    BL: [x0, y0] as Vec2, BR: [x1, y0] as Vec2,
    FR: [x1, y1] as Vec2, FL: [x0, y1] as Vec2
  }

  const pr = (p: Vec2, z: number): Vec2 => P.project([p[0], p[1], z])
  const arcPt = (c: Vec2, deg: number): Vec2 =>
    [c[0] + r * Math.cos(deg * RAD), c[1] + r * Math.sin(deg * RAD)]

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
      const k = (4 / 3) * Math.tan(Math.abs(half) / 2) * r
      const ps = arcPt(c, s)
      const pe = arcPt(c, e)
      const t1: Vec2 = [-Math.sin(s * RAD), Math.cos(s * RAD)]
      const t2: Vec2 = [-Math.sin(e * RAD), Math.cos(e * RAD)]
      const sign = Math.sign(total) || 1
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

  const rz = Math.max(1, Math.min(89, rotateZ))
  const phiL = 180 - rz
  const phiR = 360 - rz

  const Ltop = pr(arcPt(corner.FL, phiL), D)
  const Rbot = pr(arcPt(corner.BR, phiR), 0)
  const Rtop = pr(arcPt(corner.BR, phiR), D)
  const Lbot = pr(arcPt(corner.FL, phiL), 0)

  const sidePath =
    `M${fmt(Ltop[0])} ${fmt(Ltop[1])}` +
    arcSeg(corner.FL, phiL, 90, D) +
    lineTo([x1, H], D) + arcSeg(corner.FR, 90, 0, D) +
    lineTo([W, y0], D) + arcSeg(corner.BR, 360, phiR, D) +
    `L${fmt(Rbot[0])} ${fmt(Rbot[1])}` +
    arcSeg(corner.BR, phiR, 360, 0) +
    lineTo([W, y1], 0) + arcSeg(corner.FR, 0, 90, 0) +
    lineTo([x0, H], 0) + arcSeg(corner.FL, 90, phiL, 0) +
    'Z'

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

  const topHi = options.topHighlight ?? 0
  let topFill = cssColor(cTop)
  if (topHi > 0) {
    const center = pr([W / 2, H / 2], D)
    const far = pr([W, H], D)
    const rad = Math.hypot(far[0] - center[0], far[1] - center[1]) * 0.95
    const focal = pr([W * 0.32, H * 0.32], D)
    defs += topHighlightGradientDef(pid + '-th', center[0], center[1], rad, focal[0], focal[1], cTop, topHi)
    topFill = `url(#${pid}-th)`
  }

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
    const rw = options.rimWidth ?? 1.2
    const ro = options.rimOpacity ?? 0.85
    rimMarkup = `<path d="${topPath}" fill="none" stroke="url(#${pid}-rim)" ` +
      `stroke-width="${fmt(rw)}" stroke-opacity="${fmt(ro)}" stroke-linejoin="round"/>`
  }

  let shadowMarkup = ''
  let shadowPts: Vec2[] = []
  if (options.shadow) {
    const sh = groundShadowMarkup(
      [pr([0, 0], 0), pr([W, 0], 0), pr([W, H], 0), pr([0, H], 0)],
      pid, options,
      shadowOffset(P.project, D, options.shadowCast ?? 1)
    )
    defs += sh.defs
    shadowMarkup = sh.markup
    shadowPts = sh.pts
  }

  const yTop = Math.min(Ltop[1], Rtop[1])
  const yBot = Math.max(Lbot[1], Rbot[1])
  let aoMarkup = ''
  if (options.ao) {
    defs += aoGradientDef(`${pid}-ao`, yTop, yBot, options.aoStrength ?? 0.32)
    aoMarkup = `<path d="${sidePath}" fill="url(#${pid}-ao)"/>`
  }

  if (options.glow) {
    defs += glowFilterDef(`${pid}-glow`, options.glowColor ?? cssColor(cFront), options.glowBlur ?? 8)
  }

  let bevelMarkup = ''
  if (options.bevel) {
    const hi = cssColor(towardWhite(cTop, 0.55))
    bevelMarkup = `<path d="${topPath}" fill="none" stroke="${hi}" ` +
      `stroke-width="2.2" stroke-opacity="0.38" stroke-linejoin="round"/>`
  }

  let strokeMarkup = ''
  if (options.stroke) {
    const sc = options.stroke
    const sw = options.strokeWidth ?? 1.4
    const so = options.strokeOpacity ?? 1
    strokeMarkup =
      `<path d="${sidePath}" fill="none" stroke="${sc}" stroke-width="${fmt(sw)}" ` +
      `stroke-opacity="${fmt(so)}" stroke-linejoin="round"/>` +
      `<path d="${topPath}" fill="none" stroke="${sc}" stroke-width="${fmt(sw)}" ` +
      `stroke-opacity="${fmt(so)}" stroke-linejoin="round"/>`
  }

  const gridStep = options.grid ?? 0
  const gridMarkup = gridStep > 0
    ? isoGridLines(P.project, W, H, D, gridStep)
    : ''
  const extras = surfaceExtras(pid, topPath, sidePath, options, gridMarkup)
  defs += extras.defs

  const z0 = P.project([0, 0, 0])
  const ux = P.project([1, 0, 0])
  const vy = P.project([0, 1, 0])
  const label = clippedLabelMarkup(
    pid, topPath, options.label ?? '',
    P.project([W / 2, H / 2, D]),
    [ux[0] - z0[0], ux[1] - z0[1]],
    [vy[0] - z0[0], vy[1] - z0[1]],
    options.labelSize ?? Math.min(W, H) * 0.16,
    options.labelColor ?? 'rgba(255,255,255,0.92)'
  )
  defs += label.defs
  const fx = renderShapeFx({
    pid, project: P.project, kind: 'box', w: W, h: H, d: D, topPath, style: options
  })
  defs += fx.defs

  let body =
    `<path d="${sidePath}" fill="url(#${pid}-side)"/>` +
    aoMarkup +
    `<path d="${topPath}" fill="${topFill}"/>` +
    extras.markup + bevelMarkup + rimMarkup + strokeMarkup + label.markup

  if (options.glow) {
    body = `<g filter="url(#${pid}-glow)">${body}</g>`
  }

  const op = options.opacity ?? 1
  if (op < 0.999) body = `<g opacity="${fmt(op)}">${body}</g>`

  let anchorMarkup = ''
  if (options.anchors?.length) {
    const pts = options.anchors.map(a => {
      const face = a.face === 'side' ? 'front' : a.face
      const loc = boxFacePoint(W, H, D, face, a.position ?? 'mc')
      return {
        p: P.project(loc),
        opts: { ...a, basis: a.basis ?? projectedFaceBasis(face, P.project) }
      }
    })
    anchorMarkup = renderAnchorsAt(pts, pid)
  }

  const samplePts: Vec2[] = []
  for (const z of [0, D]) {
    for (let deg = 0; deg < 360; deg += 5) {
      const c = deg < 90 ? corner.FR : deg < 180 ? corner.FL : deg < 270 ? corner.BL : corner.BR
      samplePts.push(pr(arcPt(c, deg), z))
    }
  }
  const viewBox = boundsOf(
    samplePts.concat(shadowPts),
    styleMargin(options, maxAnchorExtent(options.anchors))
  )

  const markup = `<defs>${defs}</defs>` + shadowMarkup + body + fx.markup + anchorMarkup
  return {
    svg: wrapSvg(markup, viewBox),
    markup,
    viewBox,
    topPath,
    project: (x, y, z) => P.project([x, y, z])
  }
}

export function createRoundedBoxSvg(options: RoundedBoxOptions = {}): SVGSVGElement {
  const holder = document.createElement('div')
  holder.innerHTML = renderRoundedBox(options).svg
  return holder.firstElementChild as SVGSVGElement
}

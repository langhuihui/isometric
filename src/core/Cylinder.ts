/**
 * Cylinder —— 竖直圆柱 / 椭圆柱 SVG 渲染器
 *
 * 顶面是 XY 平面上的椭圆（圆是特例），沿 Z 轴拉伸。
 * 侧面着色与 RoundedBox 同一套法线插值；可选腰线、顶面同心环。
 */

import { renderAnchorsAt, maxAnchorExtent, type ShapeAnchor } from './Anchor'
import {
  type IsoShapeResult,
  type IsoShapeStyle,
  type RGBA,
  type Vec2,
  RAD,
  aoGradientDef,
  applyMaterial,
  applySpecular,
  clamp,
  clippedLabelMarkup,
  cssColor,
  cylinderAnchorPoint,
  fmt,
  projectedFaceBasis,
  glowFilterDef,
  groundShadowMarkup,
  makeProjection,
  resolveFaceColors,
  shadeColor,
  shadowOffset,
  styleMargin,
  surfaceExtras,
  topHighlightGradientDef,
  towardWhite,
  wrapSvg,
  boundsOf
} from './isoSvg'
import { renderShapeFx } from './IsoFx'

export interface CylinderOptions extends IsoShapeStyle {
  /** 圆形半径；若同时给 radiusX/radiusY 则忽略 */
  radius?: number
  radiusX?: number
  radiusY?: number
  /** Z 向高度 */
  depth?: number
  colors?: { top?: string; front?: string; right?: string; side?: string }
  rotateX?: number
  rotateZ?: number
  gradientStops?: number
  /** 侧面腰线数量 */
  rings?: number
  ringColor?: string
  ringWidth?: number
  ringOpacity?: number
  /** 顶面同心环数量 */
  topRings?: number
  id?: string
  anchors?: ShapeAnchor[]
}

let uid = 0

export function renderCylinder(raw: CylinderOptions = {}): IsoShapeResult {
  const options = applyMaterial(raw)
  const rx = Math.max(1, options.radiusX ?? options.radius ?? 50)
  const ry = Math.max(1, options.radiusY ?? options.radiusX ?? options.radius ?? 50)
  const D = Math.max(1, options.depth ?? 100)
  const stopsN = Math.max(4, Math.min(32, Math.round(options.gradientStops ?? 12)))
  const pid = options.id || `icy${++uid}`

  const rotateX = options.rotateX ?? 60
  const rotateZ = options.rotateZ ?? 45
  const P = makeProjection(rotateX, rotateZ)
  const cx = rx, cy = ry

  const shade = options.shade ?? 0.62
  const { top: cTop, front: cFront, right: cRight } =
    resolveFaceColors(options.colors, options.color, shade)
  const cLeft = shadeColor(cFront, shade)
  const cBack = shadeColor(cRight, shade)
  const specular = options.specular ?? 0

  const sideColorAt = (nx: number, ny: number): RGBA => {
    const wx = nx * nx, wy = ny * ny
    const colx = nx >= 0 ? cRight : cLeft
    const coly = ny >= 0 ? cFront : cBack
    const c: RGBA = {
      r: wx * colx.r + wy * coly.r,
      g: wx * colx.g + wy * coly.g,
      b: wx * colx.b + wy * coly.b,
      a: wx * colx.a + wy * coly.a
    }
    return applySpecular(c, nx, ny, rotateZ, specular)
  }

  /** 椭圆参数角 → 平面点。法线方向取 (ry cos, rx sin) 再归一，着色仍用参数角的 cos/sin 以保持与盒体一致 */
  const arcPt = (deg: number): Vec2 => [
    cx + rx * Math.cos(deg * RAD),
    cy + ry * Math.sin(deg * RAD)
  ]
  const pr = (p: Vec2, z: number): Vec2 => P.project([p[0], p[1], z])

  const ellipseSeg = (a0: number, a1: number, z: number): string => {
    let d = ''
    const total = a1 - a0
    const nSeg = Math.max(1, Math.ceil(Math.abs(total) / 90))
    for (let i = 0; i < nSeg; i++) {
      const s = a0 + (total * i) / nSeg
      const e = a0 + (total * (i + 1)) / nSeg
      const half = ((e - s) / 2) * RAD
      const k = (4 / 3) * Math.tan(Math.abs(half) / 2)
      const ps = arcPt(s)
      const pe = arcPt(e)
      const sign = Math.sign(total) || 1
      const t1: Vec2 = [-rx * Math.sin(s * RAD), ry * Math.cos(s * RAD)]
      const t2: Vec2 = [-rx * Math.sin(e * RAD), ry * Math.cos(e * RAD)]
      const c1 = pr([ps[0] + sign * k * t1[0], ps[1] + sign * k * t1[1]], z)
      const c2 = pr([pe[0] - sign * k * t2[0], pe[1] - sign * k * t2[1]], z)
      const p2 = pr(pe, z)
      d += `C${fmt(c1[0])} ${fmt(c1[1])} ${fmt(c2[0])} ${fmt(c2[1])} ${fmt(p2[0])} ${fmt(p2[1])}`
    }
    return d
  }

  const ellipsePath = (z: number): string => {
    const start = pr(arcPt(0), z)
    return `M${fmt(start[0])} ${fmt(start[1])}` +
      ellipseSeg(0, 90, z) + ellipseSeg(90, 180, z) +
      ellipseSeg(180, 270, z) + ellipseSeg(270, 360, z) + 'Z'
  }

  // 椭圆柱轮廓母线：n·view_xy = 0 → tanθ = -(ry/rx) tan(rotateZ)
  const b = clamp(rotateZ, 1, 89) * RAD
  const theta = Math.atan2(-ry * Math.sin(b), rx * Math.cos(b)) / RAD
  const cand = [theta, theta + 180]
  const sx0 = pr(arcPt(cand[0]), D)[0]
  const sx1 = pr(arcPt(cand[1]), D)[0]
  const phiL = sx0 <= sx1 ? cand[0] : cand[1]
  const phiR = sx0 <= sx1 ? cand[1] : cand[0]

  // 可见弧：从 phiL 走到 phiR，途经前右（φ≈45°）。取两方向中更短且朝向相机的那段。
  const visSweep = visibleSweep(phiL, phiR, rotateZ)

  const Ltop = pr(arcPt(phiL), D)
  const Rbot = pr(arcPt(phiR), 0)
  const Rtop = pr(arcPt(phiR), D)
  const Lbot = pr(arcPt(phiL), 0)

  const topPath = ellipsePath(D)
  const sidePath =
    `M${fmt(Ltop[0])} ${fmt(Ltop[1])}` +
    ellipseSeg(phiL, phiL + visSweep, D) +
    `L${fmt(Rbot[0])} ${fmt(Rbot[1])}` +
    ellipseSeg(phiR, phiR - visSweep, 0) +
    'Z'

  const sxL = Ltop[0]
  const sxR = Rtop[0]
  const span = sxR - sxL || 1

  const samples: Array<{ off: number; c: RGBA }> = []
  for (let k = 0; k <= stopsN; k++) {
    const deg = phiL + (visSweep * k) / stopsN
    const sx = pr(arcPt(deg), 0)[0]
    const nx0 = ry * Math.cos(deg * RAD)
    const ny0 = rx * Math.sin(deg * RAD)
    const nlen = Math.hypot(nx0, ny0) || 1
    samples.push({
      off: (sx - sxL) / span,
      c: sideColorAt(nx0 / nlen, ny0 / nlen)
    })
  }

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
    const center = pr([cx, cy], D)
    const rimPt = pr(arcPt(45), D)
    const rad = Math.hypot(rimPt[0] - center[0], rimPt[1] - center[1]) * 1.15
    const focal = pr([cx - rx * 0.28, cy - ry * 0.28], D)
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
      [0, 90, 180, 270].map(a => pr(arcPt(a), 0)),
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

  const ringN = Math.max(0, Math.round(options.rings ?? 0))
  let ringMarkup = ''
  if (ringN > 0) {
    const rc = options.ringColor ?? cssColor(towardWhite(cFront, 0.25))
    const rw = options.ringWidth ?? 1.1
    const ro = options.ringOpacity ?? 0.55
    for (let i = 1; i <= ringN; i++) {
      const z = (D * i) / (ringN + 1)
      const a = pr(arcPt(phiL), z)
      ringMarkup += `<path d="M${fmt(a[0])} ${fmt(a[1])}${ellipseSeg(phiL, phiL + visSweep, z)}" ` +
        `fill="none" stroke="${rc}" stroke-width="${fmt(rw)}" opacity="${fmt(ro)}" stroke-linecap="round"/>`
    }
  }

  const topRingN = Math.max(0, Math.round(options.topRings ?? 0))
  let topRingMarkup = ''
  if (topRingN > 0) {
    const rc = options.ringColor ?? cssColor(towardWhite(cTop, 0.15))
    for (let i = 1; i <= topRingN; i++) {
      const k = i / (topRingN + 1)
      const srx = rx * k, sry = ry * k
      const pt = (deg: number): Vec2 => [
        cx + srx * Math.cos(deg * RAD),
        cy + sry * Math.sin(deg * RAD)
      ]
      const start = pr(pt(0), D)
      let d = `M${fmt(start[0])} ${fmt(start[1])}`
      for (let q = 0; q < 4; q++) {
        const a0 = q * 90, a1 = a0 + 90
        const half = 45 * RAD
        const kk = (4 / 3) * Math.tan(half / 2)
        const ps = pt(a0), pe = pt(a1)
        const t1: Vec2 = [-srx * Math.sin(a0 * RAD), sry * Math.cos(a0 * RAD)]
        const t2: Vec2 = [-srx * Math.sin(a1 * RAD), sry * Math.cos(a1 * RAD)]
        const c1 = pr([ps[0] + kk * t1[0], ps[1] + kk * t1[1]], D)
        const c2 = pr([pe[0] - kk * t2[0], pe[1] - kk * t2[1]], D)
        const p2 = pr(pe, D)
        d += `C${fmt(c1[0])} ${fmt(c1[1])} ${fmt(c2[0])} ${fmt(c2[1])} ${fmt(p2[0])} ${fmt(p2[1])}`
      }
      topRingMarkup += `<path d="${d}Z" fill="none" stroke="${rc}" stroke-width="1" opacity="0.35"/>`
    }
  }

  let bevelMarkup = ''
  if (options.bevel) {
    const hi = cssColor(towardWhite(cTop, 0.55))
    bevelMarkup = `<path d="${topPath}" fill="none" stroke="${hi}" ` +
      `stroke-width="2.2" stroke-opacity="0.35" stroke-linejoin="round"/>`
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

  const extras = surfaceExtras(pid, topPath, sidePath, options)
  defs += extras.defs

  const z0 = P.project([0, 0, 0])
  const ux = P.project([1, 0, 0])
  const vy = P.project([0, 1, 0])
  const label = clippedLabelMarkup(
    pid, topPath, options.label ?? '',
    P.project([cx, cy, D]),
    [ux[0] - z0[0], ux[1] - z0[1]],
    [vy[0] - z0[0], vy[1] - z0[1]],
    options.labelSize ?? Math.min(rx, ry) * 0.28,
    options.labelColor ?? 'rgba(255,255,255,0.92)'
  )
  defs += label.defs
  const fx = renderShapeFx({
    pid, project: P.project, kind: 'cyl', w: rx * 2, h: ry * 2, d: D, topPath, style: options
  })
  defs += fx.defs

  let body =
    `<path d="${sidePath}" fill="url(#${pid}-side)"/>` +
    aoMarkup + ringMarkup +
    `<path d="${topPath}" fill="${topFill}"/>` +
    extras.markup + topRingMarkup + bevelMarkup + rimMarkup + strokeMarkup + label.markup

  if (options.glow) {
    body = `<g filter="url(#${pid}-glow)">${body}</g>`
  }

  const op = options.opacity ?? 1
  if (op < 0.999) body = `<g opacity="${fmt(op)}">${body}</g>`

  let anchorMarkup = ''
  if (options.anchors?.length) {
    const pts = options.anchors.map(a => {
      const loc = cylinderAnchorPoint(rx, ry, D, a.face, a.position ?? 'mc', a.angle, a.t)
      const side = a.face !== 'top' && a.face !== 'bottom'
      const ang = a.angle ?? (a.face === 'right' ? 0 : a.face === 'left' ? 180 : a.face === 'back' ? 270 : 90)
      return {
        p: P.project(loc),
        opts: {
          ...a,
          basis: a.basis ?? projectedFaceBasis(side ? 'side' : a.face, P.project, ang, rx, ry)
        }
      }
    })
    anchorMarkup = renderAnchorsAt(pts, pid)
  }

  const samplesPts: Vec2[] = []
  for (const z of [0, D]) {
    for (let deg = 0; deg < 360; deg += 6) samplesPts.push(pr(arcPt(deg), z))
  }
  const viewBox = boundsOf(
    samplesPts.concat(shadowPts),
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

export function createCylinderSvg(options: CylinderOptions = {}): SVGSVGElement {
  const holder = document.createElement('div')
  holder.innerHTML = renderCylinder(options).svg
  return holder.firstElementChild as SVGSVGElement
}

/** 从左轮廓走到右轮廓、途经前侧的有向扫角（度，通常为负，从 φL 往 φ=90→0 方向） */
function visibleSweep(phiL: number, phiR: number, rotateZ: number): number {
  const target = 90 - rotateZ // 相机水平方向对应的参数角附近
  const wrap = (a: number) => ((a % 360) + 360) % 360
  const toR = wrap(phiR - phiL)
  const toRneg = toR - 360
  const midPos = wrap(phiL + toR / 2)
  const midNeg = wrap(phiL + toRneg / 2)
  const dist = (a: number, b: number) => {
    const d = Math.abs(wrap(a) - wrap(b))
    return Math.min(d, 360 - d)
  }
  return dist(midPos, target) <= dist(midNeg, target) ? toR : toRneg
}

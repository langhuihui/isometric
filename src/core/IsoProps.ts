/**
 * 等距小人 / 道具：用 RoundedBox + Cylinder 拼装，画家算法排序。
 * 本地原点在脚底中心（植物在盆底中心）。
 */

import { renderRoundedBox } from './RoundedBox'
import { renderCylinder } from './Cylinder'
import {
  type IsoShapeResult,
  type Vec3,
  boundsOf,
  fmt,
  projectPoint,
  viewDepth,
  wrapSvg
} from './isoSvg'

export interface IsoPersonOptions {
  rotateX?: number
  rotateZ?: number
  /** 衣服主色 */
  color?: string
  skin?: string
  pants?: string
  scale?: number
  shadow?: boolean
  id?: string
}

export interface IsoPlantOptions {
  rotateX?: number
  rotateZ?: number
  pot?: string
  foliage?: string
  scale?: number
  shadow?: boolean
  id?: string
}

let uid = 0

interface Part {
  markup: string
  depth: number
}

function stamp(
  markup: string,
  origin: Vec3,
  size: Vec3,
  rx: number,
  rz: number
): Part {
  const [sx, sy] = projectPoint(origin[0], origin[1], origin[2], rx, rz)
  return {
    markup: `<g transform="translate(${fmt(sx)} ${fmt(sy)})">${markup}</g>`,
    depth: viewDepth(
      origin[0] + size[0] / 2,
      origin[1] + size[1] / 2,
      origin[2] + size[2] / 2,
      rx, rz
    )
  }
}

function pack(parts: Part[], corners: Vec3[], rx: number, rz: number, shadow: boolean): IsoShapeResult {
  parts.sort((a, b) => a.depth - b.depth)
  const pts = corners.map(p => projectPoint(p[0], p[1], p[2], rx, rz))
  const viewBox = boundsOf(pts, shadow ? 28 : 8)
  const markup = parts.map(p => p.markup).join('')
  return {
    svg: wrapSvg(markup, viewBox),
    markup,
    viewBox,
    topPath: '',
    project: (x, y, z) => projectPoint(x, y, z, rx, rz)
  }
}

export function renderIsoPerson(options: IsoPersonOptions = {}): IsoShapeResult {
  const s = options.scale ?? 1
  const rx = options.rotateX ?? 60
  const rz = options.rotateZ ?? 45
  const pid = options.id || `ipn${++uid}`
  const shirt = options.color ?? '#4f7fd9'
  const skin = options.skin ?? '#e8c4a8'
  const pants = options.pants ?? '#3d4a66'
  const sh = options.shadow !== false

  const legW = 7 * s, legH = 8 * s, legD = 22 * s
  const gap = 3 * s
  const torsoW = 20 * s, torsoH = 12 * s, torsoD = 24 * s
  const headR = 8 * s, headD = 14 * s
  const armW = 6 * s, armH = 7 * s, armD = 18 * s

  const leftLeg: Vec3 = [-(gap / 2 + legW), -legH / 2, 0]
  const rightLeg: Vec3 = [gap / 2, -legH / 2, 0]
  const torso: Vec3 = [-torsoW / 2, -torsoH / 2, legD]
  const head: Vec3 = [-headR, -headR, legD + torsoD]
  const arm: Vec3 = [torsoW / 2 - armW * 0.35, -armH / 2, legD + torsoD - armD - 3 * s]

  const look = { rotateX: rx, rotateZ: rz, material: 'plastic' as const, rim: true }

  const parts: Part[] = [
    stamp(renderRoundedBox({
      width: legW, height: legH, depth: legD, radius: 2 * s,
      color: pants, ...look, shadow: sh, shadowOpacity: 0.28, id: `${pid}-ll`
    }).markup, leftLeg, [legW, legH, legD], rx, rz),
    stamp(renderRoundedBox({
      width: legW, height: legH, depth: legD, radius: 2 * s,
      color: pants, ...look, shadow: sh, shadowOpacity: 0.22, id: `${pid}-rl`
    }).markup, rightLeg, [legW, legH, legD], rx, rz),
    stamp(renderRoundedBox({
      width: torsoW, height: torsoH, depth: torsoD, radius: 5 * s,
      color: shirt, ...look, shadow: false, id: `${pid}-bd`
    }).markup, torso, [torsoW, torsoH, torsoD], rx, rz),
    stamp(renderRoundedBox({
      width: armW, height: armH, depth: armD, radius: 2.5 * s,
      color: shirt, ...look, shadow: false, id: `${pid}-arm`
    }).markup, arm, [armW, armH, armD], rx, rz),
    stamp(renderCylinder({
      radius: headR, depth: headD, color: skin, ...look, shadow: false, id: `${pid}-hd`
    }).markup, head, [headR * 2, headR * 2, headD], rx, rz)
  ]

  const h = legD + torsoD + headD
  return pack(parts, [
    [-torsoW / 2 - 2, -torsoH / 2 - 2, 0],
    [torsoW / 2 + armW, torsoH / 2 + 2, 0],
    [-torsoW / 2, -torsoH / 2, h],
    [torsoW / 2 + armW, torsoH / 2, h]
  ], rx, rz, sh)
}

export function renderIsoPlant(options: IsoPlantOptions = {}): IsoShapeResult {
  const s = options.scale ?? 1
  const rx = options.rotateX ?? 60
  const rz = options.rotateZ ?? 45
  const pid = options.id || `ipl${++uid}`
  const potC = options.pot ?? '#c47a5a'
  const leafC = options.foliage ?? '#3d9a6e'
  const sh = options.shadow !== false
  const look = { rotateX: rx, rotateZ: rz, material: 'plastic' as const }

  const potR = 11 * s, potD = 12 * s
  const trunkR = 2.6 * s, trunkD = 16 * s
  const crownR = 16 * s, crownD = 20 * s
  const crown2R = 11 * s, crown2D = 12 * s

  const pot: Vec3 = [-potR, -potR, 0]
  const trunk: Vec3 = [-trunkR, -trunkR, potD]
  const crown: Vec3 = [-crownR, -crownR, potD + trunkD]
  const crown2: Vec3 = [-crown2R, -crown2R, potD + trunkD + crownD * 0.55]

  const parts: Part[] = [
    stamp(renderCylinder({
      radius: potR, depth: potD, color: potC, ...look, shadow: sh, rings: 1, id: `${pid}-pot`
    }).markup, pot, [potR * 2, potR * 2, potD], rx, rz),
    stamp(renderCylinder({
      radius: trunkR, depth: trunkD, color: '#7a4e32', ...look, shadow: false, id: `${pid}-tr`
    }).markup, trunk, [trunkR * 2, trunkR * 2, trunkD], rx, rz),
    stamp(renderCylinder({
      radius: crownR, depth: crownD, color: leafC, ...look, shadow: false, id: `${pid}-cr`
    }).markup, crown, [crownR * 2, crownR * 2, crownD], rx, rz),
    stamp(renderCylinder({
      radius: crown2R, depth: crown2D, color: '#54bd8b', ...look, shadow: false, id: `${pid}-cr2`
    }).markup, crown2, [crown2R * 2, crown2R * 2, crown2D], rx, rz)
  ]

  const h = potD + trunkD + crownD * 0.55 + crown2D
  return pack(parts, [
    [-crownR, -crownR, 0], [crownR, crownR, 0],
    [-crownR, -crownR, h], [crownR, crownR, h]
  ], rx, rz, sh)
}

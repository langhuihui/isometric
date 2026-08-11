/**
 * Monibuca Admin 场景 —— 基于 RoundedBox 的 SVG 渲染
 *
 * 坐标约定与原 IsoEntity 一致：x/y 为实体中心，z 为底面高度。
 * RoundedBox 本地原点在盒子角点 (0,0,0)，摆放时 translate 到 (x-w/2, y-h/2, z)。
 */

import { renderRoundedBox, projectPoint, viewDepth } from './core/RoundedBox'
import { isoLinkStyle, renderIsoLink } from './core/IsoLink'
import { FACE_NORMALS, POS_UV, type FaceName } from './core/isoSvg'
import { plugins, downstreams, storages, connectors } from './data'

export interface SceneNode {
  id: string
  /** 中心 X（与旧 IsoEntity 一致） */
  x: number
  /** 中心 Y */
  y: number
  z: number
  w: number
  h: number
  d: number
  r: number
  colors: { top: string; front: string; right: string }
  /** 贴在顶面的标签 */
  label?: string
  /** 贴在前面的标签 */
  frontLabel?: string
  tooltip?: string
  /** 是否参与指针事件 */
  interactive?: boolean
  /** 绘制层：platform 最底，shell 罩子，entity 普通实体 */
  layer?: 'platform' | 'shell' | 'entity'
  shadow?: boolean
  rim?: boolean
}

export interface SceneRenderOptions {
  rotateX?: number
  rotateZ?: number
  /** 罩子当前深度 / z（用于收起动画） */
  shellDepth?: number
  shellZ?: number
  width?: number
  height?: number
  /** 连线拐点圆弧半径，0 = 直角折线，默认 14 */
  bendRadius?: number
  /**
   * 进出连接面的正交延伸长度（模型单位）。
   * >0 时：先沿面法线离开，中间再折线，最后沿面法线进入。
   * 默认 28；单条连线可在 data 里用 perpendicularLength 覆盖。
   */
  perpLength?: number
}

/** 盒子角点原点（用于 RoundedBox translate） */
function originOf(n: SceneNode): [number, number, number] {
  return [n.x - n.w / 2, n.y - n.h / 2, n.z]
}

/**
 * 指定面 + 面上相对位置 → 世界坐标锚点
 * （中心制实体；u/v 约定与旧 IsoEntity 一致）
 */
function faceAnchorIso(n: SceneNode, face: string, pos: string): [number, number, number] {
  const [u, v] = POS_UV[pos as keyof typeof POS_UV] || [0.5, 0.5]
  const cx = n.x, cy = n.y
  const f = (FACE_NORMALS[face as FaceName] ? face : 'bottom') as FaceName

  switch (f) {
    case 'top':
      return [cx + n.w * (u - 0.5), cy + n.h * (v - 0.5), n.z + n.d]
    case 'bottom':
      return [cx + n.w * (u - 0.5), cy + n.h * (v - 0.5), n.z]
    case 'front':
      return [cx + n.w * (u - 0.5), cy + n.h / 2, n.z + n.d * (1 - v)]
    case 'back':
      return [cx + n.w * (u - 0.5), cy - n.h / 2, n.z + n.d * (1 - v)]
    case 'right':
      return [cx + n.w / 2, cy + n.h * (u - 0.5), n.z + n.d * (1 - v)]
    case 'left':
      return [cx - n.w / 2, cy + n.h * (u - 0.5), n.z + n.d * (1 - v)]
  }
}

function parseEndpoint(ep: string): { id: string; face: string; pos: string } {
  const [id, rest] = ep.split('@')
  if (!rest) return { id, face: 'bottom', pos: 'mc' }
  const [face, pos] = rest.split(':')
  return { id, face: face || 'bottom', pos: pos || 'mc' }
}

/** 顶面仿射矩阵文字（贴在顶面） */
function topLabelMarkup(
  n: SceneNode,
  text: string,
  rx: number,
  rz: number,
  fontSize = 14,
  fill = 'rgba(255,255,255,0.92)'
): string {
  if (!text) return ''
  const u = projectPoint(1, 0, 0, rx, rz)
  const v = projectPoint(0, 1, 0, rx, rz)
  const lo = projectPoint(n.w / 2, n.h / 2, n.d, rx, rz)
  return `<text transform="matrix(${u[0]} ${u[1]} ${v[0]} ${v[1]} ${lo[0]} ${lo[1]})"
            text-anchor="middle" dominant-baseline="middle"
            font-size="${fontSize}" font-weight="600" fill="${fill}"
            style="pointer-events:none">${escapeXml(text)}</text>`
}

/** 前面仿射矩阵文字（贴在前面） */
function frontLabelMarkup(
  n: SceneNode,
  text: string,
  rx: number,
  rz: number,
  fontSize = 12,
  fill = 'rgba(255,255,255,0.95)'
): string {
  if (!text) return ''
  // 前面：x 沿 width，z 沿 depth 向上；y = h（前缘）
  const u = projectPoint(1, 0, 0, rx, rz)
  const v = projectPoint(0, 0, -1, rx, rz) // 屏幕上「向上」对应模型 +Z，矩阵第二列向下为正时取 -Z
  const o = projectPoint(n.w / 2, n.h, n.d / 2, rx, rz)
  return `<text transform="matrix(${u[0]} ${u[1]} ${v[0]} ${v[1]} ${o[0]} ${o[1]})"
            text-anchor="middle" dominant-baseline="middle"
            font-size="${fontSize}" font-weight="600" fill="${fill}"
            style="pointer-events:none">${escapeXml(text)}</text>`
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** 构建完整节点列表（罩子深度/高度可变） */
export function buildSceneNodes(shellDepth = 140, shellZ = 0): SceneNode[] {
  const nodes: SceneNode[] = [
    // 底座
    {
      id: 'main-platform',
      x: 0, y: 0, z: -20,
      w: 420, h: 380, d: 20, r: 12,
      colors: { top: '#3a3a4a', front: '#2a2a36', right: '#222230' },
      layer: 'platform', shadow: false, rim: false, interactive: false
    },
    // 半透明罩子
    {
      id: 'main-shell',
      x: 0, y: 0, z: shellZ,
      w: 400, h: 360, d: shellDepth, r: 20,
      colors: {
        top: 'rgba(102,126,234,0.22)',
        front: 'rgba(255,255,255,0.12)',
        right: 'rgba(180,190,255,0.10)'
      },
      layer: 'shell', shadow: false, rim: true, interactive: false
    },
    // 内部模块
    {
      id: 'cpu-module',
      x: 0, y: 0, z: 10,
      w: 80, h: 80, d: 15, r: 8,
      colors: { top: '#1a1a2e', front: '#2d3748', right: '#1a202c' },
      label: 'CPU', frontLabel: 'ARM64',
      tooltip: 'CPU 处理器', interactive: true, shadow: true
    },
    {
      id: 'memory-module',
      x: -60, y: -80, z: 0,
      w: 80, h: 12, d: 35, r: 3,
      colors: { top: '#1a1a2e', front: '#2d5016', right: '#1a3009' },
      label: 'DDR5', frontLabel: '76.8%',
      tooltip: '内存 32GB', interactive: true, shadow: true
    },
    {
      id: 'nic-module',
      x: 120, y: -100, z: 0,
      w: 60, h: 25, d: 45, r: 6,
      colors: { top: '#37474F', front: '#455A64', right: '#37474F' },
      label: 'NIC', frontLabel: '↑↓',
      tooltip: '网络接口', interactive: true, shadow: true
    },
    {
      id: 'stream-module',
      x: 120, y: 100, z: 0,
      w: 50, h: 50, d: 40, r: 10,
      colors: { top: '#2196F3', front: '#64B5F6', right: '#1976D2' },
      label: '流',
      tooltip: '流管理', interactive: true, shadow: true
    },
    {
      id: 'task-module',
      x: 60, y: 100, z: 0,
      w: 60, h: 50, d: 40, r: 8,
      colors: { top: '#1a1a2e', front: '#2d3748', right: '#1a202c' },
      label: '任务',
      tooltip: '任务调度', interactive: true, shadow: true
    },
    {
      id: 'log-module',
      x: 0, y: -100, z: 0,
      w: 60, h: 50, d: 50, r: 8,
      colors: { top: '#455A64', front: '#546E7A', right: '#37474F' },
      label: '日志',
      tooltip: '系统日志', interactive: true, shadow: true
    },
    // 远端 / 周边
    {
      id: 'remote-server-1',
      x: -400, y: -250, z: 0,
      w: 70, h: 50, d: 90, r: 10,
      colors: { top: '#e0e0e0', front: '#f5f5f5', right: '#d0d0d0' },
      frontLabel: 'RTSP://',
      tooltip: '远端服务器 · RTSP', interactive: true, shadow: true
    },
    {
      id: 'remote-server-2',
      x: -400, y: -160, z: 0,
      w: 70, h: 50, d: 90, r: 10,
      colors: { top: '#e0e0e0', front: '#f5f5f5', right: '#d0d0d0' },
      frontLabel: 'RTMP://',
      tooltip: '远端服务器 · RTMP', interactive: true, shadow: true
    },
    {
      id: 'nvr-device',
      x: -380, y: 20, z: 0,
      w: 60, h: 60, d: 50, r: 14,
      colors: { top: '#37474F', front: '#455A64', right: '#37474F' },
      label: 'NVR',
      tooltip: 'NVR / 摄像头', interactive: true, shadow: true
    },
    {
      id: 'player-1',
      x: -400, y: 200, z: 0,
      w: 55, h: 55, d: 45, r: 12,
      colors: { top: '#424242', front: '#616161', right: '#424242' },
      frontLabel: '▶',
      tooltip: '播放器', interactive: true, shadow: true
    },
    {
      id: 'player-2',
      x: -400, y: 280, z: 0,
      w: 55, h: 55, d: 45, r: 12,
      colors: { top: '#424242', front: '#616161', right: '#424242' },
      frontLabel: 'Web',
      tooltip: 'Web 播放器', interactive: true, shadow: true
    },
    {
      id: 'upstream-server',
      x: 380, y: -250, z: 0,
      w: 70, h: 50, d: 90, r: 10,
      colors: { top: '#e0e0e0', front: '#f5f5f5', right: '#d0d0d0' },
      frontLabel: '上级',
      tooltip: '上级 M7S 节点', interactive: true, shadow: true
    },
    {
      id: 'cdn-server',
      x: 380, y: -150, z: 0,
      w: 70, h: 50, d: 90, r: 10,
      colors: { top: '#e0e0e0', front: '#f5f5f5', right: '#d0d0d0' },
      frontLabel: 'CDN',
      tooltip: '远端 CDN', interactive: true, shadow: true
    },
    {
      id: 'pusher-device',
      x: 380, y: 20, z: 0,
      w: 60, h: 60, d: 50, r: 14,
      colors: { top: '#37474F', front: '#455A64', right: '#37474F' },
      label: 'OBS',
      tooltip: '推流器', interactive: true, shadow: true
    },
    {
      id: 'control-console-front',
      x: -100, y: -350, z: 0,
      w: 120, h: 80, d: 50, r: 12,
      colors: { top: '#1a1a2e', front: '#2d3748', right: '#1a202c' },
      label: '控制台',
      tooltip: '操作控制台 FRONT', interactive: true, shadow: true
    },
    {
      id: 'control-console-right',
      x: 100, y: -350, z: 0,
      w: 120, h: 80, d: 50, r: 12,
      colors: { top: '#1a1a2e', front: '#2d3748', right: '#2d3748' },
      label: '控制台',
      tooltip: '操作控制台 RIGHT', interactive: true, shadow: true
    }
  ]

  // 插件卡
  plugins.forEach((p, i) => {
    nodes.push({
      id: `plugin-module-${i + 1}`,
      x: p.x, y: 100, z: 0,
      w: 14, h: 40, d: 50, r: 3,
      colors: { top: '#1a1a2e', front: '#2d3748', right: '#1a202c' },
      frontLabel: p.name.slice(0, 4),
      tooltip: p.tooltip.replace(/<br>/g, ' · '),
      interactive: true, shadow: true
    })
  })

  // 存储堆叠
  storages.forEach((s) => {
    nodes.push({
      id: `storage-${s.id}`,
      x: 380, y: 180, z: s.z,
      w: 70, h: 70, d: 20, r: 8,
      colors: { top: '#78909C', front: '#90A4AE', right: '#78909C' },
      label: s.id === 1 ? '存储' : '',
      tooltip: s.tooltip?.replace(/<br>/g, ' · ') || '录像存储',
      interactive: true, shadow: s.id === 1
    })
  })

  // 下级节点
  downstreams.forEach((d) => {
    nodes.push({
      id: `downstream-${d.id}`,
      x: d.x, y: 350, z: 0,
      w: 60, h: 45, d: 70, r: 10,
      colors: { top: '#e0e0e0', front: '#f5f5f5', right: '#d0d0d0' },
      frontLabel: d.name,
      tooltip: d.tooltip.replace(/<br>/g, ' · '),
      interactive: true, shadow: true
    })
  })

  return nodes
}

/** 渲染完整 SVG 场景字符串 */
export function renderSvgScene(options: SceneRenderOptions = {}): string {
  const rx = options.rotateX ?? 60
  const rz = options.rotateZ ?? 45
  const shellDepth = options.shellDepth ?? 140
  const shellZ = options.shellZ ?? 0
  const viewW = options.width ?? 1400
  const viewH = options.height ?? 950
  const bendRadius = options.bendRadius ?? 14
  const defaultPerp = options.perpLength ?? 28

  const nodes = buildSceneNodes(shellDepth, shellZ)
  const byId = new Map(nodes.map(n => [n.id, n]))

  // 遮挡排序：由远及近；罩子最后画（半透明盖在内部模块上）
  const sorted = [...nodes].sort((a, b) => {
    const la = a.layer === 'shell' ? 2 : a.layer === 'platform' ? 0 : 1
    const lb = b.layer === 'shell' ? 2 : b.layer === 'platform' ? 0 : 1
    if (la !== lb) return la - lb
    return (
      viewDepth(a.x, a.y, a.z + a.d / 2, rx, rz) -
      viewDepth(b.x, b.y, b.z + b.d / 2, rx, rz)
    )
  })

  // 连线：正交进出 + 轴对齐折线（渐变 / 发光 / 流向）
  const linkBits = connectors.map((c, i) => {
    const a = parseEndpoint(c.from)
    const b = parseEndpoint(c.to)
    const na = byId.get(a.id)
    const nb = byId.get(b.id)
    if (!na || !nb) return { defs: '', markup: '' }
    const fromIso = faceAnchorIso(na, a.face, a.pos)
    const toIso = faceAnchorIso(nb, b.face, b.pos)
    const route = (c as { route?: string }).route || 'auto'
    const perp = (c as { perpendicularLength?: number }).perpendicularLength ?? defaultPerp
    const speed = parseFloat(String((c as { animation?: string }).animation || '').replace(/[^\d.]/g, ''))
    return renderIsoLink({
      from: fromIso, to: toIso,
      fromFace: a.face, toFace: b.face,
      route, perpLength: perp, bendRadius,
      color: c.color, flow: Number.isFinite(speed) && speed > 0 ? speed : true,
      glow: true, rotateX: rx, rotateZ: rz, id: `lk${i}`, dataLink: i
    })
  })
  const linesDefs = linkBits.map(l => l.defs).join('')
  const linesMarkup = linkBits.map(l => l.markup).join('')

  const platformMarkup: string[] = []
  const entityMarkup: string[] = []
  const shellMarkup: string[] = []

  for (const n of sorted) {
    const box = renderRoundedBox({
      width: n.w, height: n.h, depth: n.d, radius: n.r,
      rotateX: rx, rotateZ: rz, colors: n.colors,
      material: n.layer === 'entity' || !n.layer ? 'plastic' : undefined,
      shadow: n.shadow !== false && n.layer !== 'shell' && n.layer !== 'platform',
      rim: n.rim !== false,
      shadowOpacity: 0.28,
      grid: n.layer === 'platform' ? 36 : undefined,
      grain: n.layer === 'shell' ? 0.4 : n.layer === 'platform' ? 0.12 : undefined,
      innerRim: n.layer === 'shell' ? true : undefined,
      id: `n-${n.id}`
    })
    const [ox, oy, oz] = originOf(n)
    const [sx, sy] = projectPoint(ox, oy, oz, rx, rz)
    const labels =
      topLabelMarkup(n, n.label || '', rx, rz, n.w < 40 ? 9 : 13) +
      frontLabelMarkup(n, n.frontLabel || '', rx, rz, n.w < 40 ? 8 : 11,
        n.colors.front.startsWith('#f') || n.colors.front.startsWith('#e') || n.colors.front === '#f5f5f5'
          ? '#333' : 'rgba(255,255,255,0.95)')

    const cls = [
      'scene-node',
      n.interactive === false ? 'no-pointer' : 'interactive',
      n.layer || 'entity'
    ].join(' ')

    const g =
      `<g class="${cls}" data-id="${n.id}" ` +
      `data-x="${n.x}" data-y="${n.y}" data-z="${n.z}" ` +
      `data-w="${n.w}" data-h="${n.h}" data-d="${n.d}" ` +
      `data-tooltip="${escapeXml(n.tooltip || '')}" ` +
      `transform="translate(${sx.toFixed(2)} ${sy.toFixed(2)})">` +
      box.markup + labels + `</g>`

    if (n.layer === 'platform') platformMarkup.push(g)
    else if (n.layer === 'shell') shellMarkup.push(g)
    else entityMarkup.push(g)
  }

  // 视口：固定画布，原点居中（与旧 center-origin 一致）
  const halfW = viewW / 2
  const halfH = viewH / 2

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg-scene" ` +
    `viewBox="${(-halfW).toFixed(0)} ${(-halfH).toFixed(0)} ${viewW} ${viewH}" ` +
    `width="100%" height="100%" preserveAspectRatio="xMidYMid meet">` +
    `<defs>` +
    isoLinkStyle() +
    linesDefs +
    `<style>` +
    `.scene-node.interactive{cursor:pointer}` +
    `.scene-node.interactive:hover{filter:brightness(1.15) drop-shadow(0 0 6px rgba(120,160,255,.45))}` +
    `.scene-node.no-pointer{pointer-events:none}` +
    `.scene-node.shell{pointer-events:none}` +
    `</style>` +
    `</defs>` +
    `<g class="scene-root">` +
    platformMarkup.join('') +
    `<g class="connectors-layer">${linesMarkup}</g>` +
    entityMarkup.join('') +
    shellMarkup.join('') +
    `</g></svg>`
  )
}

/** 兼容旧入口名 */
export function renderScene(options?: SceneRenderOptions): string {
  return renderSvgScene(options)
}

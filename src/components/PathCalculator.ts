import { COS_ANGLE, SIN_ANGLE, COS_Z, SIN_Z, COS_X, SIN_X } from '../utils/isometric'

/** 路由方向类型 */
export type RouteAxis = 'x' | 'y' | 'z'

/** 等距坐标点 */
export interface IsoPoint {
  x: number
  y: number
  z: number
}

/** 屏幕坐标点（带 z 用于 z-index） */
export interface ScreenPoint3D {
  x: number
  y: number
  z: number
}

/** 屏幕坐标点 */
export interface ScreenPoint {
  x: number
  y: number
}

/** 路径段 */
export interface PathSegment {
  screenPoints: ScreenPoint[]
  avgZ: number
}

/** 带 z-index 的路径 */
export interface PathWithZIndex {
  path: string
  zIndex: number
}

/**
 * 路径计算器
 * 负责计算等距连线的路径
 */
export class PathCalculator {
  private zOffset: number

  constructor(zOffset = 0) {
    this.zOffset = zOffset
  }

  /**
   * 设置 z-index 偏移
   */
  setZOffset(offset: number): void {
    this.zOffset = offset
  }

  /**
   * 解析路由顺序
   */
  parseRoute(route: string): RouteAxis[] {
    if (route === 'auto') {
      return ['x', 'y', 'z']
    }
    return route.split('-').filter((d): d is RouteAxis => ['x', 'y', 'z'].includes(d))
  }

  /**
   * 等距偏移转屏幕偏移
   * 使用 CSS 3D 变换矩阵
   */
  private isoOffsetToScreen(dx: number, dy: number, dz: number): ScreenPoint {
    return {
      x: COS_Z * dx - COS_Z * dy,
      y: SIN_Z * COS_X * dx + SIN_Z * COS_X * dy - SIN_X * dz
    }
  }

  /**
   * 计算屏幕路径（使用屏幕坐标）
   */
  calculateScreenPath(
    fromScreen: ScreenPoint3D,
    _toScreen: ScreenPoint3D,
    fromIso: IsoPoint,
    toIso: IsoPoint,
    route: string,
    sceneOffset: ScreenPoint
  ): PathSegment[] {
    const routeAxes = this.parseRoute(route)
    const segments: PathSegment[] = []

    const currentIso = { ...fromIso }
    const currentScreen = { x: fromScreen.x, y: fromScreen.y }
    const { x: offsetX, y: offsetY } = sceneOffset

    for (const axis of routeAxes) {
      const targetIso = toIso[axis]
      if (Math.abs(currentIso[axis] - targetIso) < 0.1) continue

      const startScreen = { ...currentScreen }
      
      // 计算等距偏移
      const nextIso = { ...currentIso }
      nextIso[axis] = targetIso
      
      const dIso = {
        dx: nextIso.x - currentIso.x,
        dy: nextIso.y - currentIso.y,
        dz: nextIso.z - currentIso.z
      }
      
      // 转换为屏幕偏移
      const screenOffset = this.isoOffsetToScreen(dIso.dx, dIso.dy, dIso.dz)
      
      const endScreen = {
        x: currentScreen.x + screenOffset.x,
        y: currentScreen.y + screenOffset.y
      }

      // 计算这段路径的平均深度
      const avgZ = (currentIso.x + currentIso.y + nextIso.x + nextIso.y) / 2 + (currentIso.z + nextIso.z) / 2

      segments.push({
        screenPoints: [
          { x: startScreen.x + offsetX, y: startScreen.y + offsetY },
          { x: endScreen.x + offsetX, y: endScreen.y + offsetY }
        ],
        avgZ
      })

      currentIso.x = nextIso.x
      currentIso.y = nextIso.y
      currentIso.z = nextIso.z
      currentScreen.x = endScreen.x
      currentScreen.y = endScreen.y
    }

    return segments
  }

  /**
   * 等距坐标转屏幕坐标（简化版，不带 origin）
   * @deprecated 使用 calculateScreenPath 代替
   */
  private isoToScreenSimple(x: number, y: number, z: number): ScreenPoint {
    return {
      x: (x - y) * COS_ANGLE,
      y: (x + y) * SIN_ANGLE * COS_X - z * SIN_X
    }
  }

  /**
   * 计算等距路径（沿轴向走线）
   * @deprecated 使用 calculateScreenPath 代替
   */
  calculateIsometricPath(
    fromIso: IsoPoint,
    toIso: IsoPoint,
    route: string,
    sceneOffset: ScreenPoint
  ): PathSegment[] {
    const routeAxes = this.parseRoute(route)
    const segments: PathSegment[] = []

    const current = { ...fromIso }
    const { x: offsetX, y: offsetY } = sceneOffset

    for (const axis of routeAxes) {
      const target = toIso[axis]
      if (Math.abs(current[axis] - target) < 0.1) continue

      const startScreen = this.isoToScreenSimple(current.x, current.y, current.z)
      const nextPos = { ...current }
      nextPos[axis] = target

      const endScreen = this.isoToScreenSimple(nextPos.x, nextPos.y, nextPos.z)

      // 计算这段路径的平均深度
      const avgZ = (current.x + current.y + nextPos.x + nextPos.y) / 2 + (current.z + nextPos.z) / 2

      segments.push({
        screenPoints: [
          { x: startScreen.x + offsetX, y: startScreen.y + offsetY },
          { x: endScreen.x + offsetX, y: endScreen.y + offsetY }
        ],
        avgZ
      })

      current.x = nextPos.x
      current.y = nextPos.y
      current.z = nextPos.z
    }

    return segments
  }

  /**
   * 生成 SVG 路径
   */
  generatePath(segments: PathSegment[]): { paths: PathWithZIndex[]; arrowTransform: string } {
    if (segments.length === 0) {
      return { paths: [], arrowTransform: '' }
    }

    const result: PathWithZIndex[] = []

    // 收集所有点
    const allPoints: ScreenPoint[] = []
    for (const seg of segments) {
      if (allPoints.length === 0) {
        allPoints.push(seg.screenPoints[0])
      }
      allPoints.push(seg.screenPoints[1])
    }

    if (allPoints.length < 2) {
      return { paths: [], arrowTransform: '' }
    }

    // 生成路径
    let pathD = `M ${allPoints[0].x.toFixed(2)} ${allPoints[0].y.toFixed(2)}`

    for (let i = 1; i < allPoints.length; i++) {
      const curr = allPoints[i]
      pathD += ` L ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}`
    }

    // 计算整体 z-index
    const avgZ = segments.reduce((sum, s) => sum + s.avgZ, 0) / segments.length
    const zIndex = Math.round(avgZ * 100) + this.zOffset

    result.push({ path: pathD, zIndex })

    // 计算箭头变换
    let arrowTransform = ''
    if (allPoints.length >= 2) {
      const lastPoint = allPoints[allPoints.length - 1]
      const prevPoint = allPoints[allPoints.length - 2]
      const arrowAngle = Math.atan2(lastPoint.y - prevPoint.y, lastPoint.x - prevPoint.x) * 180 / Math.PI
      arrowTransform = `translate(${lastPoint.x}, ${lastPoint.y}) rotate(${arrowAngle})`
    }

    return { paths: result, arrowTransform }
  }
}

import type { IsometricPosition, ScreenPosition } from '../types'
import { ISO_ANGLES } from '../constants/defaults'

/** 运行时角度配置（可动态修改） */
export const runtimeAngles: { rotateX: number; rotateZ: number } = {
  rotateX: ISO_ANGLES.rotateX,
  rotateZ: ISO_ANGLES.rotateZ
}

/** 获取当前 rotateZ 角度（度） */
export function getRotateZDeg(): number {
  return runtimeAngles.rotateZ
}

/** 获取当前 rotateX 角度（度） */
export function getRotateXDeg(): number {
  return runtimeAngles.rotateX
}

/** 获取预计算的三角函数值 */
export function getTrigValues() {
  const rotateZRad = runtimeAngles.rotateZ * Math.PI / 180
  const rotateXRad = runtimeAngles.rotateX * Math.PI / 180
  return {
    cosZ: Math.cos(rotateZRad),
    sinZ: Math.sin(rotateZRad),
    cosX: Math.cos(rotateXRad),
    sinX: Math.sin(rotateXRad)
  }
}

/** 更新运行时角度 */
export function updateAngles(rotateX: number, rotateZ: number): void {
  runtimeAngles.rotateX = rotateX
  runtimeAngles.rotateZ = rotateZ
}

// 静态导出（用于初始值，不会随动态更新变化）
/** rotateZ 角度（度） */
export const ROTATE_Z_DEG = ISO_ANGLES.rotateZ

/** rotateX 角度（度）- 等距倾斜角 */
export const ROTATE_X_DEG = ISO_ANGLES.rotateX

/** rotateZ 角度（弧度） */
export const ROTATE_Z_RAD = ROTATE_Z_DEG * Math.PI / 180

/** rotateX 角度（弧度） */
export const ROTATE_X_RAD = ROTATE_X_DEG * Math.PI / 180

/** 预计算的 cos/sin 值 */
export const COS_Z = Math.cos(ROTATE_Z_RAD)
export const SIN_Z = Math.sin(ROTATE_Z_RAD)
export const COS_X = Math.cos(ROTATE_X_RAD)
export const SIN_X = Math.sin(ROTATE_X_RAD)

// 保留旧的导出名以兼容
export const ISO_ANGLE_DEG = ROTATE_Z_DEG
export const ISO_ANGLE_RAD = ROTATE_Z_RAD
export const COS_ANGLE = COS_Z
export const SIN_ANGLE = SIN_Z

/**
 * 等距坐标转屏幕坐标
 * 
 * CSS 3D 变换：rotateX(60deg) rotateZ(45deg)
 * 
 * 变换顺序（从右到左应用）：
 * 1. rotateZ(45deg): 在 XY 平面旋转
 *    x' = x*cos(45) - y*sin(45)
 *    y' = x*sin(45) + y*cos(45)
 *    z' = z
 * 
 * 2. rotateX(60deg): 绕 X 轴旋转，压缩 Y 轴
 *    x'' = x'
 *    y'' = y'*cos(60) - z'*sin(60)
 *    (屏幕 Y 轴向下为正)
 * 
 * 最终屏幕坐标：
 *    screenX = x'' = (x - y) * cos(45)
 *    screenY = y'' = (x + y) * sin(45) * cos(60) - z * sin(60)
 */
export function isoToScreen(
  pos: IsometricPosition,
  scale = 1,
  origin: ScreenPosition = { x: 0, y: 0 }
): ScreenPosition {
  const { cosZ, sinZ, cosX, sinX } = getTrigValues()
  
  // rotateZ
  const xRotZ = (pos.x - pos.y) * cosZ
  const yRotZ = (pos.x + pos.y) * sinZ
  
  // rotateX - Y 轴被压缩，Z 轴投影到 Y
  const screenX = xRotZ
  const screenY = yRotZ * cosX - pos.z * sinX
  
  return {
    x: screenX * scale + origin.x,
    y: screenY * scale + origin.y
  }
}

/**
 * 屏幕坐标转等距坐标（假设 z = 0）
 * 
 * 逆变换：
 * screenX = (x - y) * COS_Z
 * screenY = (x + y) * SIN_Z * COS_X - z * SIN_X
 * 
 * 当 z = 0 时：
 * screenX = (x - y) * COS_Z
 * screenY = (x + y) * SIN_Z * COS_X
 * 
 * 解方程：
 * x - y = screenX / COS_Z
 * x + y = screenY / (SIN_Z * COS_X)
 * 
 * x = (screenX/COS_Z + screenY/(SIN_Z*COS_X)) / 2
 * y = (screenY/(SIN_Z*COS_X) - screenX/COS_Z) / 2
 */
export function screenToIso(
  screen: ScreenPosition,
  z = 0,
  scale = 1,
  origin: ScreenPosition = { x: 0, y: 0 }
): IsometricPosition {
  const { cosZ, sinZ, cosX, sinX } = getTrigValues()
  
  const screenX = (screen.x - origin.x) / scale
  const screenY = (screen.y - origin.y) / scale + z * sinX
  
  const xMinusY = screenX / cosZ
  const xPlusY = screenY / (sinZ * cosX)
  
  const x = (xMinusY + xPlusY) / 2
  const y = (xPlusY - xMinusY) / 2

  return { x, y, z }
}

/**
 * 计算 Z-Index 排序值
 * 用于正确的遮挡关系
 * 
 * 在等距视图中（rotateX=60°, rotateZ=45°），使用底部面的右下角作为比较点：
 * 1. 右下角的 x+y 权重最高：x+y 越大越靠前（靠近观察者）
 * 2. z（底部高度）次之：同一 x+y 时，z 越高越靠前
 * 
 * 注意：对于包含关系（如半透明外壳），需要通过 CSS z-index 覆盖
 * 
 * @param pos - 实体中心的等距坐标
 * @param depth - 实体高度（未使用）
 * @param width - 实体宽度（用于计算右下角）
 * @param height - 实体高度（用于计算右下角）
 */
export function calculateZIndex(
  pos: IsometricPosition, 
  _depth = 0, 
  width = 0, 
  height = 0
): number {
  // 计算底部面右下角的坐标
  const cornerX = pos.x + width / 2
  const cornerY = pos.y + height / 2
  
  // x+y 权重最高（决定前后关系），z 次之（决定上下层级）
  return Math.round((cornerX + cornerY) * 10 + pos.z * 1)
}

/**
 * 计算两个等距坐标之间的距离
 */
export function distance(a: IsometricPosition, b: IsometricPosition): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const dz = b.z - a.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

/**
 * 网格坐标系 - 用于更直观的布局
 * 
 * 在等距视图中：
 * - row（行）：沿着屏幕左下到右上方向（等距 X 轴）
 * - col（列）：沿着屏幕右下到左上方向（等距 Y 轴）
 * - layer（层）：垂直高度（等距 Z 轴）
 * 
 * 这样布局时：
 * - 同一行的元素在视觉上是水平对齐的
 * - 同一列的元素在视觉上是垂直对齐的
 */
export interface GridPosition {
  row: number    // 行号（沿等距 X 轴）
  col: number    // 列号（沿等距 Y 轴）
  layer?: number // 层高（等距 Z 轴）
}

/**
 * 网格坐标转等距坐标
 * 
 * @param grid - 网格坐标 { row, col, layer }
 * @param cellSize - 单元格大小（默认 20）
 * @param origin - 网格原点的等距坐标（默认 {0, 0, 0}）
 */
export function gridToIso(
  grid: GridPosition,
  cellSize = 20,
  origin: IsometricPosition = { x: 0, y: 0, z: 0 }
): IsometricPosition {
  return {
    x: origin.x + grid.row * cellSize,
    y: origin.y + grid.col * cellSize,
    z: origin.z + (grid.layer ?? 0) * cellSize
  }
}

/**
 * 等距坐标转网格坐标
 */
export function isoToGrid(
  pos: IsometricPosition,
  cellSize = 20,
  origin: IsometricPosition = { x: 0, y: 0, z: 0 }
): GridPosition {
  return {
    row: Math.round((pos.x - origin.x) / cellSize),
    col: Math.round((pos.y - origin.y) / cellSize),
    layer: Math.round((pos.z - origin.z) / cellSize)
  }
}

/**
 * 创建一排水平对齐的位置（在等距视图中看起来是水平的）
 * 
 * 在等距视图中，要让元素看起来在同一水平线上，
 * 需要让 x 增加的同时 y 减少相同的量
 * 
 * @param count - 元素数量
 * @param spacing - 元素间距
 * @param start - 起始等距坐标
 */
export function createHorizontalRow(
  count: number,
  spacing: number,
  start: IsometricPosition = { x: 0, y: 0, z: 0 }
): IsometricPosition[] {
  const positions: IsometricPosition[] = []
  for (let i = 0; i < count; i++) {
    positions.push({
      x: start.x + i * spacing,
      y: start.y - i * spacing,
      z: start.z
    })
  }
  return positions
}

/**
 * 创建一列垂直对齐的位置（在等距视图中看起来是垂直的）
 * 
 * 在等距视图中，要让元素看起来在同一垂直线上，
 * 需要让 x 和 y 同时增加相同的量
 * 
 * @param count - 元素数量
 * @param spacing - 元素间距
 * @param start - 起始等距坐标
 */
export function createVerticalColumn(
  count: number,
  spacing: number,
  start: IsometricPosition = { x: 0, y: 0, z: 0 }
): IsometricPosition[] {
  const positions: IsometricPosition[] = []
  for (let i = 0; i < count; i++) {
    positions.push({
      x: start.x + i * spacing,
      y: start.y + i * spacing,
      z: start.z
    })
  }
  return positions
}

/**
 * 创建堆叠的位置（在 Z 轴上堆叠）
 */
export function createStack(
  count: number,
  heightSpacing: number,
  start: IsometricPosition = { x: 0, y: 0, z: 0 }
): IsometricPosition[] {
  const positions: IsometricPosition[] = []
  for (let i = 0; i < count; i++) {
    positions.push({
      x: start.x,
      y: start.y,
      z: start.z + i * heightSpacing
    })
  }
  return positions
}

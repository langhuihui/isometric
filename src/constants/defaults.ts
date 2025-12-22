import type { IsometricPosition, Size3D } from '../types'

/**
 * 默认立方体颜色
 */
export const DEFAULT_COLORS = {
  top: '#6C9BCF',
  left: '#4A7AB0',
  right: '#3A6691'
} as const

/**
 * 默认立方体颜色 RGB 值
 */
export const DEFAULT_COLORS_RGB = {
  top: { r: 108, g: 155, b: 207 },
  left: { r: 74, g: 122, b: 176 },
  right: { r: 58, g: 102, b: 145 }
} as const

/**
 * 默认尺寸
 */
export const DEFAULT_SIZE: Size3D = {
  width: 100,
  height: 100,
  depth: 50
}

/**
 * 默认位置
 */
export const DEFAULT_POSITION: IsometricPosition = {
  x: 0,
  y: 0,
  z: 0
}

/**
 * 等距视图角度配置
 * 
 * rotateX: 绕 X 轴旋转角度（俯视倾斜角），控制 Y 轴压缩程度
 *          60° 是标准等距视图，值越小越接近俯视图
 * 
 * rotateZ: 绕 Z 轴旋转角度（平面旋转角），控制 X/Y 轴方向
 *          45° 使 X 轴向右下，Y 轴向左下
 */
export const ISO_ANGLES = {
  rotateX: 60,  // 俯视倾斜角（度）
  rotateZ: 45   // 平面旋转角（度）
} as const

/**
 * 默认等距角度（rotateX，保留以兼容旧代码）
 */
export const DEFAULT_ISO_ANGLE = ISO_ANGLES.rotateX

/**
 * 默认透视距离
 */
export const DEFAULT_PERSPECTIVE = 1000

/**
 * 默认缩放比例
 */
export const DEFAULT_SCALE = 1

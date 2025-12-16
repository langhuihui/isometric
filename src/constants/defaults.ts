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
 * 默认等距角度（用于 CSS 3D 变换）
 */
export const DEFAULT_ISO_ANGLE = 60

/**
 * 默认透视距离
 */
export const DEFAULT_PERSPECTIVE = 1000

/**
 * 默认缩放比例
 */
export const DEFAULT_SCALE = 1

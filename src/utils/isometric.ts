import type { IsometricPosition, ScreenPosition } from '../types'

/** 默认等距角度（度） */
export const ISO_ANGLE_DEG = 45

/** 默认等距角度（弧度） */
export const ISO_ANGLE_RAD = ISO_ANGLE_DEG * Math.PI / 180

/** 预计算的 cos 值 (rotateZ 45度) */
export const COS_ANGLE = Math.cos(ISO_ANGLE_RAD)

/** 预计算的 sin 值 (rotateZ 45度) */
export const SIN_ANGLE = Math.sin(ISO_ANGLE_RAD)

/**
 * 等距坐标转屏幕坐标
 * 
 * 注意：这个函数用于计算实体中心点的屏幕位置
 * CSS 3D 变换会在此基础上应用 rotateX(60deg) rotateZ(45deg)
 */
export function isoToScreen(
  pos: IsometricPosition,
  scale = 1,
  origin: ScreenPosition = { x: 0, y: 0 }
): ScreenPosition {
  return {
    x: (pos.x - pos.y) * COS_ANGLE * scale + origin.x,
    y: (pos.x + pos.y) * SIN_ANGLE * scale - pos.z * scale + origin.y
  }
}

/**
 * 屏幕坐标转等距坐标（假设 z = 0）
 */
export function screenToIso(
  screen: ScreenPosition,
  z = 0,
  scale = 1,
  origin: ScreenPosition = { x: 0, y: 0 }
): IsometricPosition {
  const adjustedX = (screen.x - origin.x) / scale
  const adjustedY = (screen.y - origin.y + z * scale) / scale

  const x = adjustedX / (2 * COS_ANGLE) + adjustedY / (2 * SIN_ANGLE)
  const y = adjustedY / (2 * SIN_ANGLE) - adjustedX / (2 * COS_ANGLE)

  return { x, y, z }
}

/**
 * 计算 Z-Index 排序值
 * 用于正确的遮挡关系
 */
export function calculateZIndex(pos: IsometricPosition): number {
  return Math.round((pos.x + pos.y) * 100 + pos.z * 10)
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

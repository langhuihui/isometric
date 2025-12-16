import type { IsometricPosition, ScreenPosition, SceneOptions } from '../types'
import {
  isoToScreen as isoToScreenUtil,
  screenToIso as screenToIsoUtil,
  calculateZIndex as calculateZIndexUtil,
  distance as distanceUtil,
  ISO_ANGLE_RAD
} from '../utils/isometric'
import { DEFAULT_PERSPECTIVE, DEFAULT_SCALE } from '../constants/defaults'

/**
 * 等距坐标变换核心类
 * 负责等距坐标与屏幕坐标之间的转换
 */
export class Transform {
  /** 等距角度 (弧度) */
  private angle: number
  /** 透视距离 */
  private perspective: number
  /** 缩放比例 */
  private scale: number
  /** 原点位置 */
  private origin: ScreenPosition

  constructor(options: SceneOptions = {}) {
    this.angle = options.angle !== undefined
      ? (options.angle * Math.PI) / 180
      : ISO_ANGLE_RAD
    this.perspective = options.perspective ?? DEFAULT_PERSPECTIVE
    this.scale = options.scale ?? DEFAULT_SCALE
    this.origin = options.origin ?? { x: 0, y: 0 }
  }

  /**
   * 将等距坐标转换为屏幕坐标
   */
  isoToScreen(pos: IsometricPosition): ScreenPosition {
    return isoToScreenUtil(pos, this.scale, this.origin)
  }

  /**
   * 将屏幕坐标转换为等距坐标 (假设 z = 0)
   */
  screenToIso(screen: ScreenPosition, z = 0): IsometricPosition {
    return screenToIsoUtil(screen, z, this.scale, this.origin)
  }

  /**
   * 获取 CSS 3D Transform 字符串
   */
  getCSS3DTransform(pos: IsometricPosition): string {
    return `translate3d(${pos.x}px, ${pos.y}px, ${pos.z}px)`
  }

  /**
   * 获取等距平面的 CSS Transform
   */
  getIsometricPlaneTransform(): string {
    const angleDeg = (this.angle * 180) / Math.PI
    return `rotateX(60deg) rotateZ(${angleDeg}deg)`
  }

  /**
   * 获取透视容器的 CSS 样式
   */
  getPerspectiveStyle(): Partial<CSSStyleDeclaration> {
    return {
      perspective: `${this.perspective}px`,
      perspectiveOrigin: '50% 50%',
      transformStyle: 'preserve-3d',
    }
  }

  /**
   * 计算两个等距坐标之间的距离
   */
  distance(a: IsometricPosition, b: IsometricPosition): number {
    return distanceUtil(a, b)
  }

  /**
   * 计算 Z-Index 排序值
   */
  calculateZIndex(pos: IsometricPosition): number {
    return calculateZIndexUtil(pos)
  }

  /**
   * 更新变换参数
   */
  update(options: Partial<SceneOptions>): void {
    if (options.angle !== undefined) {
      this.angle = (options.angle * Math.PI) / 180
    }
    if (options.perspective !== undefined) {
      this.perspective = options.perspective
    }
    if (options.scale !== undefined) {
      this.scale = options.scale
    }
    if (options.origin !== undefined) {
      this.origin = options.origin
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): SceneOptions {
    return {
      angle: (this.angle * 180) / Math.PI,
      perspective: this.perspective,
      scale: this.scale,
      origin: { ...this.origin },
    }
  }
}

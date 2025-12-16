import type { LightOptions, IsometricPosition } from '../types'
import { generateId } from '../utils/id'
import { distance } from '../utils/isometric'

/**
 * 光源
 */
export class Light {
  /** 唯一标识符 */
  readonly id: string
  /** 光源位置 */
  position: IsometricPosition
  /** 光源颜色 */
  color: string
  /** 光源强度 */
  intensity: number
  /** 光源类型 */
  type: 'point' | 'directional' | 'ambient'

  constructor(options: LightOptions) {
    this.id = generateId('light')
    this.position = options.position
    this.color = options.color ?? '#ffffff'
    this.intensity = options.intensity ?? 1
    this.type = options.type ?? 'point'
  }
}

/**
 * 光影系统
 * 管理场景中的光源和阴影效果
 */
export class LightingSystem {
  /** 光源集合 */
  private lights: Map<string, Light> = new Map()
  /** 环境光颜色 */
  private _ambientColor = 'rgba(100, 100, 100, 0.3)'
  /** 阴影启用状态 */
  private shadowsEnabled = true
  /** 阴影模糊度 */
  private shadowBlur = 10
  /** 阴影偏移 */
  private shadowOffset = { x: 5, y: 5 }

  /**
   * 添加光源
   */
  addLight(options: LightOptions): Light {
    const light = new Light(options)
    this.lights.set(light.id, light)
    return light
  }

  /**
   * 移除光源
   */
  removeLight(id: string): boolean {
    return this.lights.delete(id)
  }

  /**
   * 获取光源
   */
  getLight(id: string): Light | undefined {
    return this.lights.get(id)
  }

  /**
   * 获取所有光源
   */
  getAllLights(): Light[] {
    return Array.from(this.lights.values())
  }

  /**
   * 设置环境光
   */
  setAmbientLight(color: string): this {
    this._ambientColor = color
    return this
  }

  /**
   * 获取环境光颜色
   */
  getAmbientColor(): string {
    return this._ambientColor
  }

  /**
   * 启用/禁用阴影
   */
  setShadowsEnabled(enabled: boolean): this {
    this.shadowsEnabled = enabled
    return this
  }

  /**
   * 设置阴影参数
   */
  setShadowParams(blur: number, offset: { x: number; y: number }): this {
    this.shadowBlur = blur
    this.shadowOffset = offset
    return this
  }

  /**
   * 计算元素在指定位置受到的光照效果
   */
  calculateLighting(position: IsometricPosition): Partial<CSSStyleDeclaration> {
    const styles: Partial<CSSStyleDeclaration> = {}

    if (this.lights.size === 0) {
      return styles
    }

    let totalIntensity = 0

    this.lights.forEach((light) => {
      if (light.type === 'ambient') {
        totalIntensity += light.intensity
      } else {
        const dist = distance(position, light.position)
        const attenuation = light.type === 'directional' ? 1 : 1 / (1 + dist * 0.01)
        totalIntensity += light.intensity * attenuation
      }
    })

    if (totalIntensity > 0) {
      const brightness = Math.min(1.5, totalIntensity)
      styles.filter = `brightness(${brightness})`
    }

    if (this.shadowsEnabled) {
      styles.boxShadow = `${this.shadowOffset.x}px ${this.shadowOffset.y}px ${this.shadowBlur}px rgba(0, 0, 0, 0.3)`
    }

    return styles
  }

  /**
   * 生成阴影 CSS
   */
  generateShadowCSS(position: IsometricPosition): string {
    if (!this.shadowsEnabled || this.lights.size === 0) {
      return ''
    }

    // 找到主光源
    let mainLight: Light | null = null
    let maxIntensity = 0

    this.lights.forEach((light) => {
      if (light.type !== 'ambient' && light.intensity > maxIntensity) {
        mainLight = light
        maxIntensity = light.intensity
      }
    })

    if (!mainLight) {
      return `${this.shadowOffset.x}px ${this.shadowOffset.y}px ${this.shadowBlur}px rgba(0, 0, 0, 0.3)`
    }

    const ml = mainLight as Light
    const dx = position.x - ml.position.x
    const dy = position.y - ml.position.y
    const len = Math.sqrt(dx * dx + dy * dy) || 1

    const shadowX = (dx / len) * this.shadowOffset.x
    const shadowY = (dy / len) * this.shadowOffset.y

    return `${shadowX}px ${shadowY}px ${this.shadowBlur}px rgba(0, 0, 0, 0.3)`
  }

  /**
   * 清除所有光源
   */
  clear(): void {
    this.lights.clear()
  }

  /**
   * 销毁光影系统
   */
  destroy(): void {
    this.clear()
  }
}

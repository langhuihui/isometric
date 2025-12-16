import type { Size3D } from '../types'
import { DEFAULT_COLORS, DEFAULT_ISO_ANGLE } from '../constants/defaults'
import { adjustBrightness, brighten, darken, rgbToHex, parseHexColor } from '../utils/color'

/**
 * 面配置
 */
export interface FaceConfig {
  name: string
  width: number
  height: number
  color: string
  transform: string
  transformOrigin: string
}

/**
 * 立方体渲染器
 * 负责创建和更新等距立方体的 DOM 结构
 */
export class CubeRenderer {
  private container: HTMLElement
  private size: Size3D
  private colors: { top: string; left: string; right: string }

  constructor(container: HTMLElement, size: Size3D, baseColor?: string) {
    this.container = container
    this.size = size
    this.colors = this.calculateColors(baseColor)
  }

  /**
   * 计算三个面的颜色
   */
  private calculateColors(baseColor?: string): { top: string; left: string; right: string } {
    if (baseColor) {
      return {
        top: baseColor,
        left: adjustBrightness(baseColor, -20),
        right: adjustBrightness(baseColor, -40)
      }
    }
    return { ...DEFAULT_COLORS }
  }

  /**
   * 创建立方体
   */
  render(): void {
    const { width: w, height: d, depth: h } = this.size

    // 创建立方体容器
    const cube = document.createElement('div')
    cube.className = 'cube'
    Object.assign(cube.style, {
      position: 'absolute',
      width: `${w}px`,
      height: `${d}px`,
      transformStyle: 'preserve-3d',
      transform: `translate3d(-50%, -50%, 0) rotateX(${DEFAULT_ISO_ANGLE}deg) rotateZ(45deg)`,
      pointerEvents: 'none'
    })

    // 创建三个面
    const faces: FaceConfig[] = [
      {
        name: 'top',
        width: w,
        height: d,
        color: this.colors.top,
        transform: `translateZ(${h}px)`,
        transformOrigin: 'center'
      },
      {
        name: 'left',
        width: w,
        height: h,
        color: this.colors.left,
        transform: `translateY(${d}px) rotateX(90deg)`,
        transformOrigin: 'left top'
      },
      {
        name: 'right',
        width: h,
        height: d,
        color: this.colors.right,
        transform: `translateX(${w}px) rotateY(-90deg)`,
        transformOrigin: 'left top'
      }
    ]

    faces.forEach(config => {
      cube.appendChild(this.createFace(config))
    })

    this.container.appendChild(cube)
  }

  /**
   * 创建单个面
   */
  private createFace(config: FaceConfig): HTMLElement {
    const face = document.createElement('div')
    face.className = `isometric-face isometric-face-${config.name}`
    Object.assign(face.style, {
      position: 'absolute',
      width: `${config.width}px`,
      height: `${config.height}px`,
      background: config.color,
      transform: config.transform,
      transformOrigin: config.transformOrigin,
      backfaceVisibility: 'visible',
      boxSizing: 'border-box',
      pointerEvents: 'auto'
    })
    return face
  }

  /**
   * 更新尺寸
   */
  updateSize(size: Size3D): void {
    this.size = size
    this.container.innerHTML = ''
    this.render()
  }

  /**
   * 更新颜色
   */
  updateColors(baseColor: string): void {
    this.colors = this.calculateColors(baseColor)
    
    const topFace = this.container.querySelector('.isometric-face-top') as HTMLElement
    const leftFace = this.container.querySelector('.isometric-face-left') as HTMLElement
    const rightFace = this.container.querySelector('.isometric-face-right') as HTMLElement

    if (topFace) topFace.style.background = this.colors.top
    if (leftFace) leftFace.style.background = this.colors.left
    if (rightFace) rightFace.style.background = this.colors.right
  }

  /**
   * 设置光照强度
   * @param intensity 光照强度 0-100
   */
  setLightIntensity(intensity: number): void {
    const normalizedIntensity = Math.max(0, Math.min(100, intensity)) / 100

    // 基础颜色 RGB
    const baseTop = parseHexColor(DEFAULT_COLORS.top)
    const baseLeft = parseHexColor(DEFAULT_COLORS.left)
    const baseRight = parseHexColor(DEFAULT_COLORS.right)

    // 对比度调整量
    const contrastAmount = (normalizedIntensity - 0.5) * 80

    const topColor = brighten(baseTop, contrastAmount)
    const leftColor = darken(baseLeft, contrastAmount * 0.5)
    const rightColor = darken(baseRight, contrastAmount)

    // 应用颜色
    const topFace = this.container.querySelector('.isometric-face-top') as HTMLElement
    const leftFace = this.container.querySelector('.isometric-face-left') as HTMLElement
    const rightFace = this.container.querySelector('.isometric-face-right') as HTMLElement

    if (topFace) topFace.style.background = rgbToHex(topColor)
    if (leftFace) leftFace.style.background = rgbToHex(leftColor)
    if (rightFace) rightFace.style.background = rgbToHex(rightColor)
  }

  /**
   * 获取指定面的元素
   */
  getFaceElement(face: 'top' | 'left' | 'right'): HTMLElement | null {
    return this.container.querySelector(`.isometric-face-${face}`) as HTMLElement | null
  }

  /**
   * 设置面的内容
   */
  setFaceContent(face: 'top' | 'left' | 'right', content: string | HTMLElement): void {
    const faceElement = this.getFaceElement(face)
    if (!faceElement) return

    if (typeof content === 'string') {
      faceElement.innerHTML = content
    } else {
      faceElement.innerHTML = ''
      faceElement.appendChild(content)
    }
  }
}

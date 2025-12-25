import { LitElement, css, TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { isoToScreen, getTrigValues } from '../utils/isometric'
import { DEFAULT_COLORS } from '../constants/defaults'

// 面类型
export type FaceType = 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right'
// 面上的位置类型
export type PositionType = 'tl' | 'tc' | 'tr' | 'ml' | 'mc' | 'mr' | 'bl' | 'bc' | 'br'

/**
 * 安全地将值转换为数字
 * @param value 要转换的值
 * @param defaultValue 默认值
 * @returns 转换后的数字，如果转换失败则返回默认值
 */
export function safeNumber(value: unknown, defaultValue: number = 0): number {
  const num = Number(value)
  return isNaN(num) ? defaultValue : num
}

// 位置在面上的相对坐标 (0-1)
const POSITION_MAP: Record<PositionType, { u: number; v: number }> = {
  tl: { u: 0, v: 0 },
  tc: { u: 0.5, v: 0 },
  tr: { u: 1, v: 0 },
  ml: { u: 0, v: 0.5 },
  mc: { u: 0.5, v: 0.5 },
  mr: { u: 1, v: 0.5 },
  bl: { u: 0, v: 1 },
  bc: { u: 0.5, v: 1 },
  br: { u: 1, v: 1 }
}

/**
 * 等距实体基类 Web Component
 * 
 * 核心思路：场景层已经做了 3D 旋转，实体只需要用 translate3d(x, y, z) 定位
 * 浏览器会自动根据 3D 空间位置计算遮挡关系
 * 
 * 子类需要：
 * 1. 实现 render() 方法渲染具体形状
 * 2. 可选覆盖 static styles 添加额外样式
 */
export abstract class IsoEntity extends LitElement {
  // 位置属性（等距坐标）
  @property({ type: Number }) x = 0
  @property({ type: Number }) y = 0
  @property({ type: Number }) z = 0

  // 网格坐标（可选，用于更直观的布局）
  @property({ type: Number }) row: number | null = null
  @property({ type: Number }) col: number | null = null
  @property({ type: Number, attribute: 'grid-size' }) gridSize = 30

  // 尺寸属性
  @property({ type: Number }) width = 100
  @property({ type: Number }) height = 100
  @property({ type: Number }) depth = 50

  // 颜色属性
  @property({ type: String, attribute: 'top-color' }) topColor = DEFAULT_COLORS.top
  @property({ type: String, attribute: 'front-color' }) frontColor = DEFAULT_COLORS.left
  @property({ type: String, attribute: 'right-color' }) rightColor = DEFAULT_COLORS.right

  // 实体 ID
  @property({ type: String, attribute: 'entity-id' }) entityId = ''

  // 是否禁用鼠标事件
  @property({ type: Boolean, attribute: 'no-pointer' }) noPointer = false

  // 场景引用
  @state() protected _scene: HTMLElement | null = null

  /** 基类样式，子类可通过 static styles 扩展 */
  static baseStyles = css`
    :host {
      display: block;
      position: absolute;
      cursor: pointer;
      user-select: none;
      transform-style: preserve-3d;
    }

    :host([no-pointer]) {
      pointer-events: none !important;
      cursor: default;
    }

    :host([no-pointer]) .face {
      pointer-events: none !important;
    }

    .face {
      position: absolute;
      backface-visibility: hidden;
      box-sizing: border-box;
      pointer-events: auto;
      overflow: hidden;
    }

    .face ::slotted(*) {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .shadow-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.15);
      pointer-events: none;
    }
  `

  connectedCallback() {
    super.connectedCallback()
    this._scene = this.closest('iso-scene')
    // 初始化 CSS 变量，子类可直接使用
    this.style.setProperty('--entity-width', `${safeNumber(this.width, 100)}px`)
    this.style.setProperty('--entity-height', `${safeNumber(this.height, 100)}px`)
    this.style.setProperty('--entity-depth', `${safeNumber(this.depth, 50)}px`)
    this.style.setProperty('--entity-top-color', this.topColor)
    this.style.setProperty('--entity-front-color', this.frontColor)
    this.style.setProperty('--entity-right-color', this.rightColor)
    this.updatePosition()
  }

  updated(changedProperties: Map<string, unknown>) {
    // 更新位置相关的 CSS 变量，子类可直接使用
    if (changedProperties.has('width')) {
      this.style.setProperty('--entity-width', `${safeNumber(this.width, 100)}px`)
    }
    if (changedProperties.has('height')) {
      this.style.setProperty('--entity-height', `${safeNumber(this.height, 100)}px`)
    }
    if (changedProperties.has('depth')) {
      this.style.setProperty('--entity-depth', `${safeNumber(this.depth, 50)}px`)
    }

    if (changedProperties.has('x') || changedProperties.has('y') || changedProperties.has('z') ||
        changedProperties.has('width') || changedProperties.has('height') ||
        changedProperties.has('row') || changedProperties.has('col') || changedProperties.has('gridSize')) {
      this.updatePosition()
    }
  }

  /**
   * 更新位置
   */
  updatePosition() {
    // 确保所有值都是数字类型
    const x = safeNumber(this.x, 0) - (this.width / 2)
    const y = safeNumber(this.y, 0) - (this.height / 2)
    const z = safeNumber(this.z, 0)

    // 对于 row 和 col，如果值是 null 或 NaN，则视为未设置
    const row = this.row === null || Number.isNaN(Number(this.row)) ? null : safeNumber(this.row, 0)
    const col = this.col === null || Number.isNaN(Number(this.col)) ? null : safeNumber(this.col, 0)
    const gridSize = safeNumber(this.gridSize, 30)

    let isoX = x
    let isoY = y

    if (row !== null && col !== null) {
      isoX = row * gridSize - col * gridSize
      isoY = row * gridSize + col * gridSize
    }

    this.style.transform = `translate3d(${isoX}px, ${isoY}px, ${z}px) `
  }

  /**
   * 获取实体中心点的屏幕坐标
   */
  getConnectionPoint(): { x: number; y: number } {
    const rect = this.getBoundingClientRect()
    const sceneRect = this._scene?.getBoundingClientRect() ?? { left: 0, top: 0 }

    return {
      x: rect.left + rect.width / 2 - sceneRect.left,
      y: rect.top + rect.height / 2 - sceneRect.top
    }
  }

  /**
   * 获取指定面和位置的等距坐标
   */
  getFaceConnectionPoint(
    face: FaceType = 'top',
    position: PositionType = 'mc'
  ): { x: number; y: number; z: number } {
    const { width: w, height: h, depth: d } = this
    const { u, v } = POSITION_MAP[position] || POSITION_MAP.mc

    // 确保所有值都是数字
    const width = safeNumber(w, 100)
    const height = safeNumber(h, 100)
    const depth = safeNumber(d, 50)
    const x = safeNumber(this.x, 0)
    const y = safeNumber(this.y, 0)
    const z = safeNumber(this.z, 0)

    let dx = 0, dy = 0, dz = 0

    switch (face) {
      case 'top':
        dx = width * (u - 0.5)
        dy = height * (v - 0.5)
        dz = depth
        break
      case 'bottom':
        dx = width * (u - 0.5)
        dy = height * (v - 0.5)
        dz = 0
        break
      case 'front':
        dx = width * (u - 0.5)
        dy = height / 2
        dz = depth * (1 - v)
        break
      case 'back':
        dx = width * (u - 0.5)
        dy = -height / 2
        dz = depth * (1 - v)
        break
      case 'left':
        dx = -width / 2
        dy = height * (u - 0.5)
        dz = depth * (1 - v)
        break
      case 'right':
        dx = width / 2
        dy = height * (u - 0.5)
        dz = depth * (1 - v)
        break
    }

    return {
      x: x + dx,
      y: y + dy,
      z: z + dz
    }
  }

  /**
   * 获取指定面和位置的屏幕坐标
   */
  getFaceConnectionPointScreen(
    face: FaceType = 'top',
    position: PositionType = 'mc'
  ): { x: number; y: number; z: number } {
    const { width: w, height: h, depth: d } = this
    const { u, v } = POSITION_MAP[position] || POSITION_MAP.mc

    // 确保所有值都是数字
    const width = safeNumber(w, 100)
    const height = safeNumber(h, 100)
    const depth = safeNumber(d, 50)
    const x = safeNumber(this.x, 0)
    const y = safeNumber(this.y, 0)
    const z = safeNumber(this.z, 0)

    let dx = 0, dy = 0, dz = 0

    switch (face) {
      case 'top':
        dx = width * (u - 0.5)
        dy = height * (v - 0.5)
        dz = depth
        break
      case 'bottom':
        dx = width * (u - 0.5)
        dy = height * (v - 0.5)
        dz = 0
        break
      case 'front':
        dx = width * (u - 0.5)
        dy = height / 2
        dz = depth * (1 - v)
        break
      case 'back':
        dx = width * (u - 0.5)
        dy = -height / 2
        dz = depth * (1 - v)
        break
      case 'left':
        dx = -width / 2
        dy = height * (u - 0.5)
        dz = depth * (1 - v)
        break
      case 'right':
        dx = width / 2
        dy = height * (u - 0.5)
        dz = depth * (1 - v)
        break
    }

    const entityScreen = isoToScreen({ x, y, z })
    const { cosZ, sinZ, cosX, sinX } = getTrigValues()
    const screenDx = cosZ * dx - cosZ * dy
    const screenDy = sinZ * cosX * dx + sinZ * cosX * dy - sinX * dz

    const isoPoint = {
      x: x + dx,
      y: y + dy,
      z: z + dz
    }

    return {
      x: entityScreen.x + screenDx,
      y: entityScreen.y + screenDy,
      z: isoPoint.x + isoPoint.y + isoPoint.z
    }
  }

  /** 子类必须实现渲染方法 */
  abstract render(): TemplateResult
}

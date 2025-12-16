import { LitElement, html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { isoToScreen, calculateZIndex } from '../utils/isometric'
import { DEFAULT_COLORS, DEFAULT_ISO_ANGLE } from '../constants/defaults'

// 面类型
type FaceType = 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right'
// 面上的位置类型
type PositionType = 'tl' | 'tc' | 'tr' | 'ml' | 'mc' | 'mr' | 'bl' | 'bc' | 'br'

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

// CSS 3D 变换矩阵系数（对应 rotateX(60deg) rotateZ(45deg)）
const ROTATE_X_RAD = DEFAULT_ISO_ANGLE * Math.PI / 180
const ROTATE_Z_RAD = 45 * Math.PI / 180
const COS_Z = Math.cos(ROTATE_Z_RAD)
const SIN_Z = Math.sin(ROTATE_Z_RAD)
const COS_X = Math.cos(ROTATE_X_RAD)
const SIN_X = Math.sin(ROTATE_X_RAD)

/**
 * 等距实体 Web Component
 */
@customElement('iso-entity')
export class IsoEntity extends LitElement {
  // 位置属性
  @property({ type: Number }) x = 0
  @property({ type: Number }) y = 0
  @property({ type: Number }) z = 0

  // 尺寸属性
  @property({ type: Number }) width = 100
  @property({ type: Number }) height = 100
  @property({ type: Number }) depth = 50

  // 颜色属性
  @property({ type: String, attribute: 'top-color' }) topColor = DEFAULT_COLORS.top
  @property({ type: String, attribute: 'left-color' }) leftColor = DEFAULT_COLORS.left
  @property({ type: String, attribute: 'right-color' }) rightColor = DEFAULT_COLORS.right

  // 实体 ID
  @property({ type: String, attribute: 'entity-id' }) entityId = ''

  // 场景引用
  @state() private _scene: HTMLElement | null = null

  static styles = css`
    :host {
      display: block;
      position: absolute;
      cursor: pointer;
      user-select: none;
      transform-style: preserve-3d;
    }

    .cube {
      position: absolute;
      transform-style: preserve-3d;
      pointer-events: none;
    }

    .face {
      position: absolute;
      backface-visibility: visible;
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

    /* 补偿左面旋转导致的内容颠倒 */
    .face-left ::slotted(*) {
      transform: scaleY(-1);
    }

    /* 补偿右面旋转导致的内容旋转90度 */
    .face-right ::slotted(*) {
      transform: rotate(90deg) scaleX(-1);
    }
  `

  connectedCallback() {
    super.connectedCallback()
    this._scene = this.closest('iso-scene')
    this.updatePosition()
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('x') || changedProperties.has('y') || changedProperties.has('z')) {
      this.updatePosition()
    }
  }

  /**
   * 更新位置
   */
  updatePosition() {
    const screenPos = isoToScreen({ x: this.x, y: this.y, z: this.z })

    this.style.left = `${screenPos.x}px`
    this.style.top = `${screenPos.y}px`

    const zIndex = calculateZIndex({ x: this.x, y: this.y, z: this.z })
    this.style.zIndex = String(zIndex)
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
   * 
   * 面的定义（基于等距视角）：
   * - top: 顶面（水平面，z = depth）
   * - bottom: 底面（水平面，z = 0）
   * - left: 左面（在等距视角中朝向左下方的面，对应 CSS 中的 face-left）
   * - right: 右面（在等距视角中朝向右下方的面，对应 CSS 中的 face-right）
   * - front: 前面（y = height/2 的面，在标准等距视角中不可见）
   * - back: 后面（y = -height/2 的面，在标准等距视角中不可见）
   * 
   * 位置坐标系统（u, v）：
   * - 对于 top/bottom 面：u 沿 x 轴，v 沿 y 轴
   * - 对于 left 面：u 沿 x 轴，v 沿 z 轴（从上到下）
   * - 对于 right 面：u 沿 y 轴，v 沿 z 轴（从上到下）
   * - 对于 front/back 面：u 沿 x 轴，v 沿 z 轴（从上到下）
   */
  getFaceConnectionPoint(
    face: FaceType = 'top',
    position: PositionType = 'mc'
  ): { x: number; y: number; z: number } {
    const { width: w, height: h, depth: d } = this
    const { u, v } = POSITION_MAP[position] || POSITION_MAP.mc

    let dx = 0, dy = 0, dz = 0

    switch (face) {
      case 'top':
        // 顶面：水平面，z = depth
        // u: 0->1 对应 x: -w/2 -> w/2
        // v: 0->1 对应 y: -h/2 -> h/2
        dx = w * (u - 0.5)
        dy = h * (v - 0.5)
        dz = d
        break
      case 'bottom':
        // 底面：水平面，z = 0
        dx = w * (u - 0.5)
        dy = h * (v - 0.5)
        dz = 0
        break
      case 'left':
        // 左面（等距视角中朝向左下方的面）
        // 这是 CSS 中 translateY(h) rotateX(90deg) 变换后的面
        // 在 3D 空间中，这个面位于 y = h/2（前边缘）
        // u: 0->1 对应 x: -w/2 -> w/2
        // v: 0->1 对应 z: d -> 0（从上到下）
        dx = w * (u - 0.5)
        dy = h / 2
        dz = d * (1 - v)
        break
      case 'right':
        // 右面（等距视角中朝向右下方的面）
        // 这是 CSS 中 translateX(w) rotateY(-90deg) 变换后的面
        // 在 3D 空间中，这个面位于 x = w/2（右边缘）
        // u: 0->1 对应 y: -h/2 -> h/2
        // v: 0->1 对应 z: d -> 0（从上到下）
        dx = w / 2
        dy = h * (u - 0.5)
        dz = d * (1 - v)
        break
      case 'front':
        // 前面（y = h/2 的面，通常不可见）
        dx = w * (u - 0.5)
        dy = h / 2
        dz = d * (1 - v)
        break
      case 'back':
        // 后面（y = -h/2 的面，通常不可见）
        dx = w * (u - 0.5)
        dy = -h / 2
        dz = d * (1 - v)
        break
    }

    return {
      x: this.x + dx,
      y: this.y + dy,
      z: this.z + dz
    }
  }

  /**
   * 获取指定面和位置的屏幕坐标
   * 
   * 使用 CSS 3D 变换矩阵将等距坐标转换为屏幕坐标：
   * - rotateZ(45deg): 将 x,y 轴旋转 45 度
   * - rotateX(60deg): 将 y 轴压缩为 cos(60°)，z 轴投影为 sin(60°)
   */
  getFaceConnectionPointScreen(
    face: FaceType = 'top',
    position: PositionType = 'mc'
  ): { x: number; y: number; z: number } {
    const { width: w, height: h, depth: d } = this
    const { u, v } = POSITION_MAP[position] || POSITION_MAP.mc

    let dx = 0, dy = 0, dz = 0

    switch (face) {
      case 'top':
        dx = w * (u - 0.5)
        dy = h * (v - 0.5)
        dz = d
        break
      case 'bottom':
        dx = w * (u - 0.5)
        dy = h * (v - 0.5)
        dz = 0
        break
      case 'left':
        dx = w * (u - 0.5)
        dy = h / 2
        dz = d * (1 - v)
        break
      case 'right':
        dx = w / 2
        dy = h * (u - 0.5)
        dz = d * (1 - v)
        break
      case 'front':
        dx = w * (u - 0.5)
        dy = h / 2
        dz = d * (1 - v)
        break
      case 'back':
        dx = w * (u - 0.5)
        dy = -h / 2
        dz = d * (1 - v)
        break
    }

    // 计算实体中心点的屏幕位置
    const entityScreen = isoToScreen({ x: this.x, y: this.y, z: this.z })

    // 使用 CSS 变换矩阵将偏移转换为屏幕偏移
    // 矩阵：rotateX(60deg) rotateZ(45deg)
    // screen_dx = COS_Z * dx - COS_Z * dy
    // screen_dy = SIN_Z * COS_X * dx + SIN_Z * COS_X * dy - SIN_X * dz
    const screenDx = COS_Z * dx - COS_Z * dy
    const screenDy = SIN_Z * COS_X * dx + SIN_Z * COS_X * dy - SIN_X * dz

    // 计算等距坐标用于 z-index
    const isoPoint = {
      x: this.x + dx,
      y: this.y + dy,
      z: this.z + dz
    }

    return {
      x: entityScreen.x + screenDx,
      y: entityScreen.y + screenDy,
      z: isoPoint.x + isoPoint.y + isoPoint.z // 用于 z-index 计算
    }
  }

  render() {
    const { width: w, height: h, depth: d } = this

    return html`
      <div class="cube" style="
        width: ${w}px;
        height: ${h}px;
        transform: translate3d(-50%, -50%, 0) rotateX(${DEFAULT_ISO_ANGLE}deg) rotateZ(45deg);
      ">
        <!-- 顶面 -->
        <div class="face face-top" style="
          width: ${w}px;
          height: ${h}px;
          background: ${this.topColor};
          transform: translateZ(${d}px);
        ">
          <slot name="top"></slot>
        </div>
        
        <!-- 左面 -->
        <div class="face face-left" style="
          width: ${w}px;
          height: ${d}px;
          background: ${this.leftColor};
          transform-origin: left top;
          transform: translateY(${h}px) rotateX(90deg);
        ">
          <slot name="left"></slot>
        </div>
        
        <!-- 右面 -->
        <div class="face face-right" style="
          width: ${d}px;
          height: ${h}px;
          background: ${this.rightColor};
          transform-origin: left top;
          transform: translateX(${w}px) rotateY(-90deg);
        ">
          <slot name="right"></slot>
        </div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'iso-entity': IsoEntity
  }
}

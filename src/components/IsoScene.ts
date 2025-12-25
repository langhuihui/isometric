import { LitElement, html, css } from 'lit'
import { property, state } from 'lit/decorators.js'
import type { IsoEntity } from './IsoEntity'
import type { IsoConnector } from './IsoConnector'
import { getRotateXDeg, getRotateZDeg, updateAngles } from '../utils/isometric'

/**
 * 等距场景 Web Component
 * 作为实体和连线的容器
 * 
 * 核心思路：只在场景层做一次 3D 旋转，子元素只需要用 translate3d 定位
 * 浏览器会自动根据 3D 空间位置计算遮挡关系
 * 
 * 使用方式:
 * <iso-scene center-origin>
 *   <iso-cube ...></iso-cube>
 *   <iso-connector ...></iso-connector>
 * </iso-scene>
 */
export class IsoScene extends LitElement {
  // 是否将原点居中
  @property({ type: Boolean, attribute: 'center-origin' }) centerOrigin = false

  // 场景尺寸
  @property({ type: Number }) width = 800
  @property({ type: Number }) height = 500

  // 原点偏移
  @property({ type: Number, attribute: 'origin-x' }) originX = 0
  @property({ type: Number, attribute: 'origin-y' }) originY = 0

  // 透视距离（0 表示无透视，即正交投影）
  @property({ type: Number }) perspective = 0

  // 原点位置（用于子组件计算和渲染）
  @state() _originPosition = { x: 0, y: 0 }

  // 当前角度
  @state() private _rotateX = getRotateXDeg()
  @state() private _rotateZ = getRotateZDeg()

  // 内部透视值（支持动态更新）
  @state() private _perspective = 0

  private _resizeObserver: ResizeObserver | null = null

  private _anglesHandler = ((e: CustomEvent) => {
    const { rotateX, rotateZ, perspective } = e.detail
    if (rotateX !== undefined && rotateZ !== undefined) {
      updateAngles(rotateX, rotateZ)
      this._rotateX = rotateX
      this._rotateZ = rotateZ
    }
    if (perspective !== undefined) {
      this._perspective = perspective
    }
  }) as EventListener

  static styles = css`
    :host {
      display: block;
      position: relative;
      overflow: visible;
      /* 让点击事件穿透到子元素 */
      pointer-events: none;
    }

    .scene-container {
      position: relative;
      width: 100%;
      height: 100%;
      /* 保持 3D 上下文 */
      transform-style: preserve-3d;
      overflow: visible;
      /* 容器本身不捕获事件，让子元素可以被点击 */
      pointer-events: none;
    }

    .origin {
      position: absolute;
      /* 关键：保持 3D 上下文传递给子元素 */
      transform-style: preserve-3d;
      /* 原点元素本身不应该捕获事件 */
      pointer-events: none;
    }

    .origin ::slotted(*) {
      pointer-events: auto;
    }

    .connectors-layer {
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
      /* 保持 3D 上下文 */
      transform-style: preserve-3d;
    }
  `

  connectedCallback() {
    super.connectedCallback()

    // 初始化透视值
    this._perspective = this.perspective

    // 监听尺寸变化
    this._resizeObserver = new ResizeObserver(() => {
      this._updateOrigin()
      this._updateConnectors()
    })
    this._resizeObserver.observe(this)

    // 监听角度变化事件
    window.addEventListener('iso-angles-changed', this._anglesHandler)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this._resizeObserver?.disconnect()
    window.removeEventListener('iso-angles-changed', this._anglesHandler)
  }

  firstUpdated() {
    this._updateOrigin()
    // 延迟更新连线
    setTimeout(() => {
      this._updateConnectors()
    }, 100)
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('centerOrigin') ||
      changedProperties.has('originX') ||
      changedProperties.has('originY')) {
      this._updateOrigin()
    }
  }

  private _updateOrigin() {
    let x = this.originX
    let y = this.originY

    if (this.centerOrigin) {
      const rect = this.getBoundingClientRect()
      x = rect.width / 2
      y = rect.height / 2
    }

    this._originPosition = { x, y }
  }

  private _updateConnectors() {
    // 通知所有连线更新
    const connectors = this.querySelectorAll('iso-connector') as NodeListOf<IsoConnector>
    connectors.forEach(connector => {
      connector.requestUpdate()
    })
  }

  /**
   * 获取原点位置
   */
  getOriginPosition(): { x: number; y: number } {
    return { ...this._originPosition }
  }

  /**
   * 获取所有实体
   */
  getEntities(): IsoEntity[] {
    return Array.from(this.querySelectorAll('[entity-id]'))
  }

  /**
   * 根据 ID 获取实体
   */
  getEntityById(id: string): IsoEntity | null {
    return this.querySelector(`[entity-id="${id}"]`)
  }

  /**
   * 获取所有连线
   */
  getConnectors(): IsoConnector[] {
    return Array.from(this.querySelectorAll('iso-connector'))
  }

  render() {
    // 在 .origin 上应用 3D 旋转，所有子元素只需要用 translate3d 定位
    // left/top 必须在这里设置，否则 Lit 重新渲染时会丢失
    // 连线也放在 .origin 内，让它们一起参与 3D 变换
    const { x, y } = this._originPosition

    // 确保所有值都是数字
    const width = Number(this.width) || 800
    const height = Number(this.height) || 500
    const perspective = Number(this._perspective) || 0

    // 透视：0 表示无透视（正交），>0 表示透视距离
    const perspectiveStyle = perspective > 0
      ? `perspective: ${perspective}px; perspective-origin: ${x}px ${y}px;`
      : ''
    return html`
      <div class="scene-container" style="width: ${width}px; height: ${height}px; ${perspectiveStyle}">
        <div class="origin" style="left: ${x}px; top: ${y}px; transform: rotateX(${this._rotateX}deg) rotateZ(${this._rotateZ}deg);">
          <div class="connectors-layer">
            <slot name="connectors"></slot>
          </div>
          <slot></slot>
        </div>
      </div>
    `
  }
}

// 条件注册，避免 HMR 重复定义
if (!customElements.get('iso-scene')) {
  customElements.define('iso-scene', IsoScene)
}

declare global {
  interface HTMLElementTagNameMap {
    'iso-scene': IsoScene
  }
}

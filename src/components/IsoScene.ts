import { LitElement, html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import type { IsoEntity } from './IsoEntity'
import type { IsoConnector } from './IsoConnector'

/**
 * 等距场景 Web Component
 * 作为实体和连线的容器
 * 
 * 使用方式:
 * <iso-scene center-origin>
 *   <iso-entity ...></iso-entity>
 *   <iso-connector ...></iso-connector>
 * </iso-scene>
 */
@customElement('iso-scene')
export class IsoScene extends LitElement {
  // 是否将原点居中
  @property({ type: Boolean, attribute: 'center-origin' }) centerOrigin = false

  // 场景尺寸
  @property({ type: Number }) width = 800
  @property({ type: Number }) height = 500

  // 原点偏移
  @property({ type: Number, attribute: 'origin-x' }) originX = 0
  @property({ type: Number, attribute: 'origin-y' }) originY = 0

  // 原点位置（用于子组件计算）
  @state() _originPosition = { x: 0, y: 0 }

  private _resizeObserver: ResizeObserver | null = null

  static styles = css`
    :host {
      display: block;
      position: relative;
      overflow: hidden;
    }

    .scene-container {
      position: relative;
      width: 100%;
      height: 100%;
    }

    .origin {
      position: absolute;
      transform-style: preserve-3d;
    }

    .connectors-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
    }
  `

  connectedCallback() {
    super.connectedCallback()
    
    // 监听尺寸变化
    this._resizeObserver = new ResizeObserver(() => {
      this._updateOrigin()
      this._updateConnectors()
    })
    this._resizeObserver.observe(this)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this._resizeObserver?.disconnect()
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
    const origin = this.shadowRoot?.querySelector('.origin') as HTMLElement
    if (!origin) return

    let x = this.originX
    let y = this.originY

    if (this.centerOrigin) {
      const rect = this.getBoundingClientRect()
      x = rect.width / 2
      y = rect.height / 2
    }

    this._originPosition = { x, y }
    origin.style.left = `${x}px`
    origin.style.top = `${y}px`
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
    return Array.from(this.querySelectorAll('iso-entity'))
  }

  /**
   * 根据 ID 获取实体
   */
  getEntityById(id: string): IsoEntity | null {
    return this.querySelector(`iso-entity[entity-id="${id}"]`)
  }

  /**
   * 获取所有连线
   */
  getConnectors(): IsoConnector[] {
    return Array.from(this.querySelectorAll('iso-connector'))
  }

  render() {
    return html`
      <div class="scene-container" style="width: ${this.width}px; height: ${this.height}px;">
        <div class="connectors-layer">
          <slot name="connectors"></slot>
        </div>
        <div class="origin">
          <slot></slot>
        </div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'iso-scene': IsoScene
  }
}

import { LitElement, html, css } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * 等距单面 Web Component
 *
 * 只渲染一个水平面，可用于地板等
 */
export class IsoPlane extends LitElement {
  // 位置属性
  @property({ type: Number }) x = 0
  @property({ type: Number }) y = 0
  @property({ type: Number }) z = 0

  // 尺寸属性
  @property({ type: Number }) width = 100
  @property({ type: Number }) height = 100

  // 面颜色
  @property({ type: String }) color = '#8BC34A'

  // 实体 ID
  @property({ type: String, attribute: 'entity-id' }) entityId = ''

  // 是否禁用鼠标事件
  @property({ type: Boolean, attribute: 'no-pointer' }) noPointer = false

  static styles = css`
    :host {
      display: block;
      position: absolute;
      transform-style: preserve-3d;
    }

    :host([no-pointer]) {
      pointer-events: none !important;
    }

    .plane {
      position: absolute;
      width: var(--plane-width, 100px);
      height: var(--plane-height, 100px);
      background: var(--plane-color, #8BC34A);
      transform-style: preserve-3d;
      overflow: hidden;
    }

    .plane ::slotted(*) {
      width: 100%;
      height: 100%;
    }
  `

  connectedCallback() {
    super.connectedCallback()
    this._updateStyles()
    this._updatePosition()
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('width') || changedProperties.has('height') || changedProperties.has('color')) {
      this._updateStyles()
    }
    if (changedProperties.has('x') || changedProperties.has('y') || changedProperties.has('z') ||
        changedProperties.has('width') || changedProperties.has('height')) {
      this._updatePosition()
    }
  }

  private _updateStyles() {
    this.style.setProperty('--plane-width', `${this.width}px`)
    this.style.setProperty('--plane-height', `${this.height}px`)
    this.style.setProperty('--plane-color', this.color)
  }

  private _updatePosition() {
    const x = this.x - this.width / 2
    const y = this.y - this.height / 2
    this.style.transform = `translate3d(${x}px, ${y}px, ${this.z}px)`
  }

  render() {
    return html`
      <div class="plane">
        <slot></slot>
      </div>
    `
  }
}

// 条件注册，避免重复定义
if (!customElements.get('iso-plane')) {
  customElements.define('iso-plane', IsoPlane)
}

declare global {
  interface HTMLElementTagNameMap {
    'iso-plane': IsoPlane
  }
}

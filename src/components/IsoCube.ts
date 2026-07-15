import { html, css } from 'lit'
import { property } from 'lit/decorators.js'
import { IsoEntity, safeNumber } from './IsoEntity'

/**
 * 等距立方体 Web Component
 * 继承自 IsoEntity 基类，渲染立方体形状
 */
export class IsoCube extends IsoEntity {
  // 圆角半径
  @property({ type: Number }) radius = 0

  static styles = [
    IsoEntity.baseStyles,
    css`
      /* 顶面：水平放置在 Z=depth 高度 */
      .face-top {
        transform-origin: top left;
        width: var(--entity-width);
        height: var(--entity-height);
        background: var(--entity-top-color, #4CAF50);
        transform: translateZ(var(--entity-depth));
        border-radius: var(--entity-radius, 0px);
      }

      /* 前面：立在顶面前边缘 */
      .face-front {
        transform-origin: top left;
        width: calc(var(--entity-width) - 2 * var(--entity-radius, 0px));
        height: var(--entity-depth);
        background: var(--entity-front-color, #388E3C);
        transform: translate3d(var(--entity-radius, 0px), var(--entity-height), var(--entity-depth)) rotateX(-90deg);
      }

      /* 右面：立在顶面右边缘 */
      .face-right {
        transform-origin: top left;
        width: calc(var(--entity-height) - 2 * var(--entity-radius, 0px));
        height: var(--entity-depth);
        background: var(--entity-right-color, #2E7D32);
        transform: translate3d(var(--entity-width), calc(var(--entity-height) - var(--entity-radius, 0px)), var(--entity-depth)) rotateX(-90deg) rotateY(-90deg);
      }

      /* 圆角过渡面 */
      .corner {
        position: absolute;
        box-sizing: border-box;
        transform-origin: top left;
        width: calc(var(--entity-radius, 0px) * 1.414);
        height: var(--entity-depth);
        display: var(--entity-corner-display, none);
      }

      /* 前右圆角 */
      .corner-fr {
        background: linear-gradient(to right, var(--entity-front-color, #388E3C), var(--entity-right-color, #2E7D32));
        transform: translate3d(calc(var(--entity-width) - var(--entity-radius, 0px)), var(--entity-height), var(--entity-depth)) rotateX(-90deg) rotateY(45deg);
      }

      /* 前左圆角 */
      .corner-fl {
        background: linear-gradient(to right, var(--entity-right-color, #2E7D32), var(--entity-front-color, #388E3C));
        transform: translate3d(0, calc(var(--entity-height) - var(--entity-radius, 0px)), var(--entity-depth)) rotateX(-90deg) rotateY(-45deg);
      }

      /* 后右圆角 */
      .corner-br {
        background: linear-gradient(to right, var(--entity-right-color, #2E7D32), var(--entity-right-color, #2E7D32));
        transform: translate3d(var(--entity-width), var(--entity-radius, 0px), var(--entity-depth)) rotateX(-90deg) rotateY(135deg);
      }
    `
  ]

  connectedCallback() {
    super.connectedCallback()
    this.style.setProperty('--entity-radius', `${safeNumber(this.radius, 0)}px`)
    this.style.setProperty('--entity-corner-display', this.radius > 0 ? 'block' : 'none')
  }

  updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties)
    if (changedProperties.has('radius')) {
      this.style.setProperty('--entity-radius', `${safeNumber(this.radius, 0)}px`)
      this.style.setProperty('--entity-corner-display', this.radius > 0 ? 'block' : 'none')
    }
  }

  render() {
    return html`
        <!-- 顶面 -->
        <div class="face face-top">
          <slot name="top"></slot>
        </div>

        <!-- 前面 -->
        <div class="face face-front">
          <slot name="front"></slot>
        </div>

        <!-- 右面 -->
        <div class="face face-right">
          <slot name="right"></slot>
          <div class="shadow-overlay"></div>
        </div>

        <!-- 圆角过渡面 -->
        ${this.radius > 0 ? html`
          <div class="corner corner-fr"></div>
          <div class="corner corner-fl"></div>
          <div class="corner corner-br"></div>
        ` : ''}
    `
  }
}

// 条件注册
if (!customElements.get('iso-cube')) {
  customElements.define('iso-cube', IsoCube)
}

declare global {
  interface HTMLElementTagNameMap {
    'iso-cube': IsoCube
  }
}

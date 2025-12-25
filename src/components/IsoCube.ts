import { html, css } from 'lit'
import { IsoEntity } from './IsoEntity'

/**
 * 等距立方体 Web Component
 * 继承自 IsoEntity 基类，渲染立方体形状
 */
export class IsoCube extends IsoEntity {
  static styles = [
    IsoEntity.baseStyles,
    css`
      /* 顶面：水平放置在 Z=depth 高度 */
      .face-top {
        width: var(--entity-width);
        height: var(--entity-height);
        background: var(--entity-top-color, #4CAF50);
        transform: translateZ(var(--entity-depth));
      }

      /* 前面：立在顶面前边缘 */
      .face-front {
        width: var(--entity-width);
        height: var(--entity-depth);
        background: var(--entity-front-color, #388E3C);
        transform: 
          rotateX(-90deg)
          translateY(calc(0px - var(--entity-depth) / 2))
          translateZ(calc(var(--entity-height) - var(--entity-depth) / 2));
      }

      /* 右面：立在顶面右边缘 */
      .face-right {
        width: var(--entity-height);
        height: var(--entity-depth);
        background: var(--entity-right-color, #2E7D32);
        transform: 
          rotateY(90deg)
          rotateZ(-90deg)
          translateZ(calc(var(--entity-width) - var(--entity-height) / 2))
          translateY(calc(0px - var(--entity-depth) / 2))
          translateX(calc(var(--entity-depth) / 2 - var(--entity-height) / 2));
      }
    `
  ]

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

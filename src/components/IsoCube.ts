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
      .cube {
        position: absolute;
        transform-style: preserve-3d;
        pointer-events: none;
      }
    `
  ]

  render() {
    const { width: w, height: h, depth: d } = this

    return html`
      <div class="cube shape" style="
        width: ${w}px;
        height: ${h}px;
        transform: translate(-50%, -50%);
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
        
        <!-- 前面 -->
        <div class="face face-front" style="
          width: ${w}px;
          height: ${d}px;
          background: ${this.frontColor};
          transform-origin: left top;
          transform: translateY(${h}px) rotateX(90deg);
        ">
          <slot name="front"></slot>
        </div>
        
        <!-- 右面 -->
        <div class="face face-right" style="
          width: ${h}px;
          height: ${d}px;
          background: ${this.rightColor};
          transform-origin: left top;
          transform: translateX(${w}px) translateY(${h}px) rotateX(90deg) rotateY(-90deg);
        ">
          <slot name="right"></slot>
          <div class="shadow-overlay"></div>
        </div>
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

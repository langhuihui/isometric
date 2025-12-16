import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'

/**
 * 等距立方体 Web Component
 * 使用 CSS 3D Transform 渲染正确的等距立方体
 */
@customElement('iso-cube')
export class IsoCube extends LitElement {
  @property({ type: Number }) width = 100
  @property({ type: Number }) height = 100
  @property({ type: Number }) depth = 100
  @property({ type: Number }) x = 0
  @property({ type: Number }) y = 0
  @property({ type: Number }) z = 0
  @property({ type: String, attribute: 'top-color' }) topColor = '#6C9BCF'
  @property({ type: String, attribute: 'left-color' }) leftColor = '#4A7AB0'
  @property({ type: String, attribute: 'right-color' }) rightColor = '#3A6691'

  static styles = css`
    :host {
      display: block;
      position: absolute;
      transform-style: preserve-3d;
    }

    .cube {
      position: relative;
      transform-style: preserve-3d;
    }

    .face {
      position: absolute;
      backface-visibility: visible;
      box-sizing: border-box;
    }
  `

  render() {
    const { width: w, height: h, depth: d } = this
    
    // 等距投影角度 - 使用60度让视角更平缓（俯视角度更小）
    const isoAngle = 60

    return html`
      <div class="cube" style="
        width: ${w}px;
        height: ${d}px;
        transform: rotateX(${isoAngle}deg) rotateZ(45deg);
      ">
        <!-- 顶面 (XY平面, Z=height) -->
        <div class="face" style="
          width: ${w}px;
          height: ${d}px;
          background: ${this.topColor};
          transform: translateZ(${h}px);
        "></div>
        
        <!-- 左面 (XZ平面, Y=depth) 视觉左侧 -->
        <div class="face" style="
          width: ${w}px;
          height: ${h}px;
          background: ${this.leftColor};
          transform-origin: left top;
          transform: translateY(${d}px) rotateX(90deg);
        "></div>
        
        <!-- 右面 (YZ平面, X=width) 视觉右侧 -->
        <div class="face" style="
          width: ${h}px;
          height: ${d}px;
          background: ${this.rightColor};
          transform-origin: left top;
          transform: translateX(${w}px) rotateY(-90deg);
        "></div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'iso-cube': IsoCube
  }
}

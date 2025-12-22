import { html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { IsoEntity } from './IsoEntity'

/**
 * 等距操作台 Web Component
 * 
 * 类似立方体但顶面倾斜，模拟操作台/控制台的外观
 * 由倾斜顶面 + 前面 + 右面组成
 */
@customElement('iso-console')
export class IsoConsole extends IsoEntity {
  // 顶面倾斜角度（度数，0-45）
  @property({ type: Number }) tilt = 30

  // 操作台朝向：front 表示面向前方，right 表示面向右方
  @property({ type: String }) facing: 'front' | 'right' = 'front'

  static styles = [
    IsoEntity.baseStyles
  ]

  render() {
    const { width, height, depth, topColor, frontColor, rightColor, tilt, facing } = this

    // 计算倾斜后的顶面高度变化
    const tiltRad = (tilt * Math.PI) / 180
    const topDepthReduction = depth * (1 - Math.cos(tiltRad))

    if (facing === 'front') {
      // 面向前方：显示前面 + 右面，顶面向前倾斜
      return html`
        <div class="shape">
          <!-- 前面（梯形效果通过 clip-path 实现） -->
          <div
            class="face face-front"
            style="
              width: ${width}px;
              height: ${depth}px;
              background: ${frontColor};
              transform: translate(-50%, -50%) translateY(${height / 2}px) rotateX(90deg);
            "
          >
            <slot name="front"></slot>
          </div>

          <!-- 倾斜顶面 -->
          <div
            class="face face-top"
            style="
              width: ${width}px;
              height: ${height}px;
              background: ${topColor};
              transform: translate(-50%, -50%) translateY(${-height / 2 + height}px) translateZ(${depth - topDepthReduction}px) rotateX(${-tilt}deg);
              transform-origin: center top;
            "
          >
            <slot name="top"></slot>
            <slot></slot>
          </div>
        </div>
      `
    } else {
      // 面向右方：显示前面 + 右面，顶面向右倾斜
      return html`
        <div class="shape">
          <!-- 右面（梯形效果） -->
          <div
            class="face face-right"
            style="
              width: ${height}px;
              height: ${depth}px;
              background: ${rightColor};
              transform: translate(-50%, -50%) translateX(${width / 2}px) rotateY(90deg);
            "
          >
            <slot name="right"></slot>
          </div>

          <!-- 倾斜顶面（向右倾斜时，额外旋转90度） -->
          <div
            class="face face-top"
            style="
              width: ${width}px;
              height: ${height}px;
              background: ${topColor};
              transform: translate(-50%, -50%) translateX(${-width / 2 + width}px) translateZ(${depth - topDepthReduction}px) rotateY(${tilt}deg) rotateZ(-90deg);
              transform-origin: center;
            "
          >
            <slot name="top"></slot>
            <slot></slot>
          </div>
        </div>
      `
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'iso-console': IsoConsole
  }
}

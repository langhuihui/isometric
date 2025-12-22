import { html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { IsoEntity } from './IsoEntity'
import type { FaceType } from './IsoEntity'

/**
 * 等距单面 Web Component
 * 
 * 只渲染一个面，可用于地板、墙壁等
 */
@customElement('iso-plane')
export class IsoPlane extends IsoEntity {
  // 面朝向
  @property({ type: String }) face: FaceType = 'top'

  // 面颜色
  @property({ type: String }) color = '#8BC34A'

  static styles = [
    IsoEntity.baseStyles,
    css`
      .plane {
        position: absolute;
        box-sizing: border-box;
        border: 1px solid rgba(0, 0, 0, 0.3);
      }
    `
  ]

  render() {
    const { width, height, depth, face, color } = this

    let transform = ''
    let planeWidth = width
    let planeHeight = height

    switch (face) {
      case 'top':
        // 顶面：水平面在 z=depth 高度
        transform = `translateZ(${depth}px)`
        planeWidth = width
        planeHeight = height
        break
      case 'bottom':
        // 底面：水平面在 z=0 高度
        transform = `translateZ(0)`
        planeWidth = width
        planeHeight = height
        break
      case 'front':
        // 前面：Y 正方向的垂直面
        transform = `translateY(${height / 2}px) translateZ(${depth / 2}px) rotateX(90deg)`
        planeWidth = width
        planeHeight = depth
        break
      case 'back':
        // 后面：Y 负方向的垂直面
        transform = `translateY(${-height / 2}px) translateZ(${depth / 2}px) rotateX(90deg)`
        planeWidth = width
        planeHeight = depth
        break
      case 'left':
        // 左面：X 负方向的垂直面
        transform = `translateX(${-width / 2}px) translateZ(${depth / 2}px) rotateY(90deg)`
        planeWidth = height
        planeHeight = depth
        break
      case 'right':
        // 右面：X 正方向的垂直面
        transform = `translateX(${width / 2}px) translateZ(${depth / 2}px) rotateY(90deg)`
        planeWidth = height
        planeHeight = depth
        break
    }

    return html`
      <div class="shape">
        <div
          class="plane"
          style="
            width: ${planeWidth}px;
            height: ${planeHeight}px;
            background: ${color};
            transform: translate(-50%, -50%) ${transform};
          "
        >
          <slot></slot>
        </div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'iso-plane': IsoPlane
  }
}

import { css, CSSResult } from 'lit'
import { customElement } from 'lit/decorators.js'
import { IsoCube } from './IsoCube'

/**
 * 等距操作台 - 顶面向前倾斜
 *
 * 类似立方体但顶面倾斜，模拟操作台/控制台的外观
 * 由倾斜顶面 + 前面组成（隐藏右面）
 */
@customElement('iso-console-front')
export class IsoConsoleFront extends IsoCube {
  static styles: CSSResult[] = [
    ...IsoCube.styles,
    css`
      .face-top {
        transform: 
          translateZ(var(--entity-depth))
          rotateX(-30deg)
      }
      .face-front {
        transform: 
          rotateX(-90deg)
          translateY(calc(0px - var(--entity-depth) / 2))
          translateZ(calc(var(--entity-height) / 2 - var(--entity-depth) / 2));
      }
      .face-right {
        display: none;
      }
    `
  ]
}

/**
 * 等距操作台 - 顶面向右倾斜
 *
 * 类似立方体但顶面倾斜，模拟操作台/控制台的外观
 * 由倾斜顶面 + 右面组成（隐藏前面）
 */
@customElement('iso-console-right')
export class IsoConsoleRight extends IsoCube {
  static styles: CSSResult[] = [
    ...IsoCube.styles,
    css`
      .face-top {
        width: var(--entity-height);
        height: var(--entity-width);
        transform: 
          translateX(calc(var(--entity-width) / 2 - var(--entity-height) / 2))
          translateY(calc(var(--entity-height) / 2 - var(--entity-width) / 2))
          translateZ(var(--entity-depth))
          rotateZ(-90deg)
          rotateX(-30deg)
      }
      .face-right {
        transform: 
          rotateY(90deg)
          rotateZ(-90deg)
          translateZ(calc(var(--entity-width) /2 - var(--entity-height) / 2))
          translateY(calc(0px - var(--entity-depth) / 2))
          translateX(calc(var(--entity-depth) / 2 - var(--entity-height) / 2));
      }
      .face-front {
        display: none;
      }
    `
  ]
}

declare global {
  interface HTMLElementTagNameMap {
    'iso-console-front': IsoConsoleFront
    'iso-console-right': IsoConsoleRight
  }
}

import { renderRoundedBox } from '../core/RoundedBox'

/**
 * <iso-rounded-cube> 圆角立方体 Web Component（SVG 渲染）
 *
 * 与 <iso-cube>（CSS 3D）不同，本组件输出的是已完成等距投影的 SVG，
 * 是一个普通的行内元素，不需要放在 3D 变换的场景容器中。
 *
 * 用法：
 *   <iso-rounded-cube width="120" height="120" depth="80" radius="20"
 *                     top-color="#7fa8ef" front-color="#4f7fd9" right-color="#3763b0"
 *                     shadow></iso-rounded-cube>
 */
export class IsoRoundedCube extends HTMLElement {
  static observedAttributes = [
    'width', 'height', 'depth', 'radius',
    'top-color', 'front-color', 'right-color',
    'rotate-x', 'rotate-z', 'gradient-stops',
    'shadow', 'no-rim', 'scale'
  ]

  connectedCallback() {
    this.style.display = 'inline-block'
    this.style.lineHeight = '0'
    this.renderSvg()
  }

  attributeChangedCallback() {
    if (this.isConnected) this.renderSvg()
  }

  private num(name: string, fallback: number): number {
    const v = parseFloat(this.getAttribute(name) ?? '')
    return Number.isFinite(v) ? v : fallback
  }

  private renderSvg() {
    const result = renderRoundedBox({
      width: this.num('width', 100),
      height: this.num('height', 100),
      depth: this.num('depth', 100),
      radius: this.num('radius', 16),
      rotateX: this.num('rotate-x', 60),
      rotateZ: this.num('rotate-z', 45),
      gradientStops: this.num('gradient-stops', 8),
      shadow: this.hasAttribute('shadow'),
      rim: !this.hasAttribute('no-rim'),
      colors: {
        top: this.getAttribute('top-color') ?? undefined,
        front: this.getAttribute('front-color') ?? undefined,
        right: this.getAttribute('right-color') ?? undefined
      }
    })
    this.innerHTML = result.svg
    const scale = this.num('scale', 1)
    const svg = this.firstElementChild as SVGSVGElement | null
    if (svg && scale !== 1) {
      svg.setAttribute('width', String(result.viewBox.width * scale))
      svg.setAttribute('height', String(result.viewBox.height * scale))
    }
  }
}

if (!customElements.get('iso-rounded-cube')) {
  customElements.define('iso-rounded-cube', IsoRoundedCube)
}

declare global {
  interface HTMLElementTagNameMap {
    'iso-rounded-cube': IsoRoundedCube
  }
}

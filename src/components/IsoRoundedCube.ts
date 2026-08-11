import { renderRoundedBox } from '../core/RoundedBox'
import { parseAnchorsAttr, type AnchorStyle } from '../core/Anchor'
import { isoStyleFromElement } from '../core/isoSvg'

/**
 * <iso-rounded-cube> 圆角立方体 Web Component（SVG 渲染）
 *
 * 与 <iso-cube>（CSS 3D）不同，本组件输出的是已完成等距投影的 SVG，
 * 是一个普通的行内元素，不需要放在 3D 变换的场景容器中。
 *
 * 用法：
 *   <iso-rounded-cube width="120" height="120" depth="80" radius="20"
 *                     color="#4f7fd9" material="plastic" shadow>
 *   </iso-rounded-cube>
 */
export class IsoRoundedCube extends HTMLElement {
  static observedAttributes = [
    'width', 'height', 'depth', 'radius',
    'top-color', 'front-color', 'right-color', 'color', 'material',
    'rotate-x', 'rotate-z', 'gradient-stops',
    'shadow', 'no-shadow', 'no-rim', 'scale',
    'stroke', 'stroke-width', 'top-highlight', 'shade', 'specular',
    'ao', 'no-ao', 'glow', 'no-glow', 'glow-color', 'glow-blur',
    'bevel', 'no-bevel', 'opacity', 'rim-width', 'shadow-cast',
    'grain', 'inner-rim', 'no-inner-rim', 'grid', 'label', 'label-color', 'label-size',
    'leds', 'led-hz', 'fan', 'fan-face', 'fan-u', 'fan-v', 'hologram', 'panel', 'neon',
    'show-anchors', 'anchor-style', 'anchor-color', 'anchors'
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
      ...isoStyleFromElement(this),
      colors: {
        top: this.getAttribute('top-color') ?? undefined,
        front: this.getAttribute('front-color') ?? undefined,
        right: this.getAttribute('right-color') ?? undefined
      },
      anchors: parseAnchorsAttr(
        this.getAttribute('anchors'),
        this.hasAttribute('show-anchors'),
        (this.getAttribute('anchor-style') as AnchorStyle) || 'dot',
        this.getAttribute('anchor-color') ?? undefined
      )
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

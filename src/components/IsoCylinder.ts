import { renderCylinder } from '../core/Cylinder'
import { cylinderVisibleAnchors, parseAnchorsAttr, type AnchorStyle } from '../core/Anchor'
import { isoStyleFromElement } from '../core/isoSvg'

/**
 * <iso-cylinder> 圆柱 / 椭圆柱 Web Component（SVG 渲染）
 *
 *   <iso-cylinder radius="48" depth="110" rings="2"
 *                 color="#4fa8c4" material="plastic" shadow>
 *   </iso-cylinder>
 */
export class IsoCylinder extends HTMLElement {
  static observedAttributes = [
    'radius', 'radius-x', 'radius-y', 'depth',
    'top-color', 'front-color', 'right-color', 'side-color', 'color', 'material',
    'rotate-x', 'rotate-z', 'gradient-stops',
    'shadow', 'no-shadow', 'no-rim', 'scale',
    'rings', 'ring-color', 'ring-width', 'top-rings',
    'stroke', 'stroke-width', 'top-highlight', 'shade', 'specular',
    'ao', 'no-ao', 'glow', 'no-glow', 'glow-color', 'glow-blur',
    'bevel', 'no-bevel', 'opacity', 'rim-width', 'shadow-cast',
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
    const rx = this.getAttribute('radius-x')
    const ry = this.getAttribute('radius-y')
    const result = renderCylinder({
      radius: this.num('radius', 50),
      radiusX: rx != null ? this.num('radius-x', 50) : undefined,
      radiusY: ry != null ? this.num('radius-y', 50) : undefined,
      depth: this.num('depth', 100),
      rotateX: this.num('rotate-x', 60),
      rotateZ: this.num('rotate-z', 45),
      gradientStops: this.num('gradient-stops', 12),
      rings: this.num('rings', 0),
      ringColor: this.getAttribute('ring-color') ?? undefined,
      ringWidth: this.hasAttribute('ring-width') ? this.num('ring-width', 1.1) : undefined,
      topRings: this.num('top-rings', 0),
      ...isoStyleFromElement(this),
      colors: {
        top: this.getAttribute('top-color') ?? undefined,
        front: this.getAttribute('front-color') ?? undefined,
        right: this.getAttribute('right-color') ?? undefined,
        side: this.getAttribute('side-color') ?? undefined
      },
      anchors: parseAnchorsAttr(
        this.getAttribute('anchors'),
        false,
        (this.getAttribute('anchor-style') as AnchorStyle) || 'dot',
        this.getAttribute('anchor-color') ?? undefined
      ) ?? (this.hasAttribute('show-anchors')
        ? cylinderVisibleAnchors(
          (this.getAttribute('anchor-style') as AnchorStyle) || 'dot',
          6,
          this.getAttribute('anchor-color') ?? undefined
        )
        : undefined)
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

if (!customElements.get('iso-cylinder')) {
  customElements.define('iso-cylinder', IsoCylinder)
}

declare global {
  interface HTMLElementTagNameMap {
    'iso-cylinder': IsoCylinder
  }
}

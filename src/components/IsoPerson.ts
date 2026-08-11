import { renderIsoPerson, renderIsoPlant } from '../core/IsoProps'

function num(el: HTMLElement, name: string, fallback: number): number {
  const v = parseFloat(el.getAttribute(name) ?? '')
  return Number.isFinite(v) ? v : fallback
}

function mount(el: HTMLElement, svg: string, scale: number, viewW: number, viewH: number) {
  el.style.display = 'inline-block'
  el.style.lineHeight = '0'
  el.innerHTML = svg
  const node = el.firstElementChild as SVGSVGElement | null
  if (node && scale !== 1) {
    node.setAttribute('width', String(viewW * scale))
    node.setAttribute('height', String(viewH * scale))
  }
}

/**
 * <iso-person color="#4f7fd9" shadow></iso-person>
 */
export class IsoPerson extends HTMLElement {
  static observedAttributes = [
    'color', 'skin', 'pants', 'rotate-x', 'rotate-z', 'scale', 'shadow', 'no-shadow'
  ]

  connectedCallback() { this.renderSvg() }
  attributeChangedCallback() { if (this.isConnected) this.renderSvg() }

  private renderSvg() {
    const result = renderIsoPerson({
      color: this.getAttribute('color') ?? undefined,
      skin: this.getAttribute('skin') ?? undefined,
      pants: this.getAttribute('pants') ?? undefined,
      rotateX: num(this, 'rotate-x', 60),
      rotateZ: num(this, 'rotate-z', 45),
      shadow: !this.hasAttribute('no-shadow'),
      id: this.id || undefined
    })
    mount(this, result.svg, num(this, 'scale', 1), result.viewBox.width, result.viewBox.height)
  }
}

/**
 * <iso-plant foliage="#3d9a6e" shadow></iso-plant>
 */
export class IsoPlant extends HTMLElement {
  static observedAttributes = [
    'pot', 'foliage', 'rotate-x', 'rotate-z', 'scale', 'shadow', 'no-shadow'
  ]

  connectedCallback() { this.renderSvg() }
  attributeChangedCallback() { if (this.isConnected) this.renderSvg() }

  private renderSvg() {
    const result = renderIsoPlant({
      pot: this.getAttribute('pot') ?? undefined,
      foliage: this.getAttribute('foliage') ?? undefined,
      rotateX: num(this, 'rotate-x', 60),
      rotateZ: num(this, 'rotate-z', 45),
      shadow: !this.hasAttribute('no-shadow'),
      id: this.id || undefined
    })
    mount(this, result.svg, num(this, 'scale', 1), result.viewBox.width, result.viewBox.height)
  }
}

if (!customElements.get('iso-person')) customElements.define('iso-person', IsoPerson)
if (!customElements.get('iso-plant')) customElements.define('iso-plant', IsoPlant)

declare global {
  interface HTMLElementTagNameMap {
    'iso-person': IsoPerson
    'iso-plant': IsoPlant
  }
}

import { LitElement, html, css, svg } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import type { IsoEntity } from './IsoEntity'
import type { IsoScene } from './IsoScene'
import { PathCalculator, type PathWithZIndex } from './PathCalculator'

// 面类型
type FaceType = 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right'
// 面上的位置类型
type PositionType = 'tl' | 'tc' | 'tr' | 'ml' | 'mc' | 'mr' | 'bl' | 'bc' | 'br'

/**
 * 等距连线 Web Component
 */
@customElement('iso-connector')
export class IsoConnector extends LitElement {
  // 连接的实体 ID
  @property({ type: String }) from = ''
  @property({ type: String }) to = ''

  // 连接的面
  @property({ type: String, attribute: 'from-face' }) fromFace: FaceType = 'top'
  @property({ type: String, attribute: 'to-face' }) toFace: FaceType = 'top'

  // 面上的位置
  @property({ type: String, attribute: 'from-position' }) fromPosition: PositionType = 'mc'
  @property({ type: String, attribute: 'to-position' }) toPosition: PositionType = 'mc'

  // 路由配置
  @property({ type: String }) route: string = 'auto'

  // 样式属性
  @property({ type: String }) color = '#00d4ff'
  @property({ type: Number }) width = 2
  @property({ type: String, attribute: 'line-style' }) lineStyle: 'solid' | 'dashed' | 'dotted' = 'solid'
  @property({ type: Boolean }) arrow = false
  @property({ type: Number, attribute: 'corner-radius' }) cornerRadius = 8

  // 动效
  @property({ type: String, attribute: 'animation' }) animationType: 'none' | 'flow' | 'pulse' | 'glow' = 'none'
  @property({ type: Number, attribute: 'animate-speed' }) animateSpeed = 1
  @property({ type: String, attribute: 'animate-color' }) animateColor = ''

  // z-index 偏移
  @property({ type: Number, attribute: 'z-offset' }) zOffset = 0

  // 内部状态
  private _pathSegments: PathWithZIndex[] = []
  private _arrowTransform = ''
  private _isUpdatingPath = false
  private _fromEntity: IsoEntity | null = null
  private _toEntity: IsoEntity | null = null
  private _scene: IsoScene | null = null
  private _resizeObserver: ResizeObserver | null = null
  private _updateTimer: number | null = null
  private _pathCalculator: PathCalculator

  constructor() {
    super()
    this._pathCalculator = new PathCalculator()
  }

  static styles = css`
    :host {
      display: block;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .connector-segment {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: visible;
    }

    svg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    path {
      fill: none;
      pointer-events: stroke;
      cursor: pointer;
    }

    path.glow {
      filter: drop-shadow(0 0 4px var(--glow-color, currentColor))
              drop-shadow(0 0 8px var(--glow-color, currentColor));
    }

    polygon {
      pointer-events: auto;
    }

    @keyframes flow {
      from { stroke-dashoffset: 0; }
      to { stroke-dashoffset: -24; }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    @keyframes glow-pulse {
      0%, 100% { 
        filter: drop-shadow(0 0 2px var(--glow-color, currentColor))
                drop-shadow(0 0 4px var(--glow-color, currentColor));
      }
      50% { 
        filter: drop-shadow(0 0 6px var(--glow-color, currentColor))
                drop-shadow(0 0 12px var(--glow-color, currentColor));
      }
    }

    .animate-flow {
      stroke-dasharray: 12, 12;
      animation: flow calc(1s / var(--animate-speed, 1)) linear infinite;
    }

    .animate-pulse {
      animation: pulse calc(2s / var(--animate-speed, 1)) ease-in-out infinite;
    }

    .animate-glow {
      animation: glow-pulse calc(2s / var(--animate-speed, 1)) ease-in-out infinite;
    }
  `

  connectedCallback() {
    super.connectedCallback()
    this._scene = this.closest('iso-scene') as IsoScene
    this._setupObservers()
    setTimeout(() => {
      this._findEntities()
      this._updatePath()
    }, 100)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this._cleanupObservers()
    if (this._updateTimer) {
      clearTimeout(this._updateTimer)
    }
  }

  private _setupObservers() {
    this._resizeObserver = new ResizeObserver(() => {
      this._scheduleUpdate()
    })

    if (this._scene) {
      this._resizeObserver.observe(this._scene)
    }
  }

  private _cleanupObservers() {
    this._resizeObserver?.disconnect()
  }

  private _scheduleUpdate() {
    if (this._updateTimer) {
      clearTimeout(this._updateTimer)
    }
    this._updateTimer = window.setTimeout(() => {
      this._updatePath()
    }, 16)
  }

  private _findEntities() {
    if (!this._scene) {
      this._scene = this.closest('iso-scene') as IsoScene
    }
    if (!this._scene) return

    if (this.from) {
      this._fromEntity = this._scene.querySelector(`iso-entity[entity-id="${this.from}"]`) as IsoEntity
    }

    if (this.to) {
      this._toEntity = this._scene.querySelector(`iso-entity[entity-id="${this.to}"]`) as IsoEntity
    }
  }

  updated(changedProperties: Map<string, unknown>) {
    if (this._isUpdatingPath) {
      this._isUpdatingPath = false
      return
    }

    const relevantProps = ['from', 'to', 'fromFace', 'toFace', 'fromPosition', 'toPosition', 'route', 'cornerRadius', 'zOffset']
    const needsUpdate = relevantProps.some(prop => changedProperties.has(prop))

    if (changedProperties.has('from') || changedProperties.has('to')) {
      this._findEntities()
    }

    if (changedProperties.has('cornerRadius')) {
      this._pathCalculator.setCornerRadius(this.cornerRadius)
    }

    if (changedProperties.has('zOffset')) {
      this._pathCalculator.setZOffset(this.zOffset)
    }

    if (needsUpdate) {
      this._updatePath()
    }
  }

  private _updatePath() {
    if (!this._fromEntity || !this._toEntity || !this._scene) return

    // 获取等距坐标（用于路由计算）
    const fromIso = this._fromEntity.getFaceConnectionPoint(this.fromFace, this.fromPosition)
    const toIso = this._toEntity.getFaceConnectionPoint(this.toFace, this.toPosition)

    // 获取屏幕坐标（使用 CSS 变换矩阵）
    const fromScreen = this._fromEntity.getFaceConnectionPointScreen(this.fromFace, this.fromPosition)
    const toScreen = this._toEntity.getFaceConnectionPointScreen(this.toFace, this.toPosition)

    const sceneRect = this._scene.getBoundingClientRect()
    const sceneOffset = {
      x: sceneRect.width / 2,
      y: sceneRect.height / 2
    }

    const segments = this._pathCalculator.calculateScreenPath(fromScreen, toScreen, fromIso, toIso, this.route, sceneOffset)
    const { paths, arrowTransform } = this._pathCalculator.generatePathWithCorners(segments)

    this._pathSegments = paths
    this._arrowTransform = arrowTransform
    this._isUpdatingPath = true
    this.requestUpdate()
  }

  private _getStrokeDasharray(): string {
    if (this.animationType === 'flow') {
      return '12,12'
    }
    switch (this.lineStyle) {
      case 'dashed': return '8,4'
      case 'dotted': return '2,4'
      default: return 'none'
    }
  }

  private _getAnimationClass(): string {
    switch (this.animationType) {
      case 'flow': return 'animate-flow'
      case 'pulse': return 'animate-pulse'
      case 'glow': return 'animate-glow glow'
      default: return ''
    }
  }

  render() {
    const animClass = this._getAnimationClass()
    const glowColor = this.animateColor || this.color

    return html`
      ${this._pathSegments.map(segment => html`
        <div class="connector-segment" style="z-index: ${segment.zIndex}">
          <svg>
            <path
              class="${animClass}"
              d="${segment.path}"
              stroke="${this.color}"
              stroke-width="${this.width}"
              stroke-dasharray="${this._getStrokeDasharray()}"
              stroke-linecap="round"
              stroke-linejoin="round"
              style="--animate-speed: ${this.animateSpeed}; --glow-color: ${glowColor}"
            />
            ${this.arrow && segment === this._pathSegments[this._pathSegments.length - 1] ? svg`
              <polygon
                points="-10,-5 0,0 -10,5"
                fill="${this.color}"
                transform="${this._arrowTransform}"
              />
            ` : ''}
          </svg>
        </div>
      `)}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'iso-connector': IsoConnector
  }
}

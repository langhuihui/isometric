import type { ConnectorOptions, IsometricPosition, EventType, EventHandler } from '../types'
import type { Scene } from '../core/Scene'
import type { Entity } from './Entity'
import { EventDispatcher } from '../events/EventDispatcher'
import { generateId } from '../utils/id'

/**
 * 连线组件
 * 用于连接两个实体
 */
export class Connector {
  /** 唯一标识符 */
  readonly id: string
  /** DOM 元素 (SVG) */
  protected element: SVGSVGElement
  /** 路径元素 */
  protected pathElement: SVGPathElement
  /** 箭头元素 */
  protected arrowElement: SVGPolygonElement | null = null
  /** 起始实体 */
  protected fromEntity: Entity
  /** 目标实体 */
  protected toEntity: Entity
  /** 所属场景 */
  protected scene: Scene | null = null
  /** 事件分发器 */
  protected eventDispatcher: EventDispatcher<Connector>
  /** 配置选项 */
  protected options: ConnectorOptions

  constructor(from: Entity, to: Entity, options: ConnectorOptions = {}) {
    this.id = generateId('connector')
    this.fromEntity = from
    this.toEntity = to
    this.options = {
      color: options.color ?? '#666',
      width: options.width ?? 2,
      style: options.style ?? 'solid',
      arrow: options.arrow ?? false,
      curvature: options.curvature ?? 0,
    }

    this.element = this.createElement()
    this.pathElement = this.createPath()
    this.element.appendChild(this.pathElement)

    if (this.options.arrow) {
      this.arrowElement = this.createArrow()
      this.element.appendChild(this.arrowElement)
    }

    this.eventDispatcher = new EventDispatcher<Connector>(this)
    this.bindDOMEvents()
  }

  /**
   * 创建 SVG 容器
   */
  protected createElement(): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('class', 'isometric-connector')
    Object.assign(svg.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      overflow: 'visible',
      zIndex: '100000'
    })
    return svg
  }

  /**
   * 创建路径元素
   */
  protected createPath(): SVGPathElement {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', this.options.color!)
    path.setAttribute('stroke-width', String(this.options.width))
    path.style.pointerEvents = 'stroke'
    path.style.cursor = 'pointer'

    if (this.options.style === 'dashed') {
      path.setAttribute('stroke-dasharray', '8,4')
    } else if (this.options.style === 'dotted') {
      path.setAttribute('stroke-dasharray', '2,4')
    }

    return path
  }

  /**
   * 创建箭头
   */
  protected createArrow(): SVGPolygonElement {
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
    arrow.setAttribute('fill', this.options.color!)
    return arrow
  }

  /**
   * 绑定 DOM 事件
   */
  protected bindDOMEvents(): void {
    this.pathElement.addEventListener('click', (e) => this.emitEvent('click', e))
    this.pathElement.addEventListener('mouseenter', (e) => this.emitEvent('hover', e))
    this.pathElement.addEventListener('mouseleave', (e) => this.emitEvent('hoverEnd', e))
  }

  /**
   * 触发事件
   */
  protected emitEvent(type: EventType, originalEvent: Event): void {
    const screenPos = {
      x: (originalEvent as MouseEvent).clientX ?? 0,
      y: (originalEvent as MouseEvent).clientY ?? 0,
    }

    this.eventDispatcher.emit(
      type,
      originalEvent,
      this.fromEntity.getAbsolutePosition(),
      screenPos
    )
  }

  /**
   * 添加事件监听器
   */
  on(type: EventType, handler: EventHandler<Connector>): this {
    this.eventDispatcher.on(type, handler)
    return this
  }

  /**
   * 移除事件监听器
   */
  off(type: EventType, handler: EventHandler<Connector>): this {
    this.eventDispatcher.off(type, handler)
    return this
  }

  /**
   * 更新连线路径
   */
  update(): void {
    if (!this.scene) return

    const fromPos = this.fromEntity.getAbsolutePosition()
    const toPos = this.toEntity.getAbsolutePosition()

    const transform = this.scene.getTransform()
    const fromScreen = transform.isoToScreen(this.getCenterPosition(fromPos, this.fromEntity))
    const toScreen = transform.isoToScreen(this.getCenterPosition(toPos, this.toEntity))

    const path = this.calculatePath(fromScreen, toScreen)
    this.pathElement.setAttribute('d', path)

    if (this.arrowElement) {
      this.updateArrow(fromScreen, toScreen)
    }
  }

  /**
   * 获取实体中心位置
   */
  protected getCenterPosition(pos: IsometricPosition, entity: Entity): IsometricPosition {
    const size = entity.getSize()
    return {
      x: pos.x,
      y: pos.y,
      z: pos.z + size.depth / 2,
    }
  }

  /**
   * 计算 SVG 路径
   */
  protected calculatePath(
    from: { x: number; y: number },
    to: { x: number; y: number }
  ): string {
    const curvature = this.options.curvature ?? 0

    if (curvature === 0) {
      return `M ${from.x} ${from.y} L ${to.x} ${to.y}`
    }

    const midX = (from.x + to.x) / 2
    const midY = (from.y + to.y) / 2
    const dx = to.x - from.x
    const dy = to.y - from.y
    const len = Math.sqrt(dx * dx + dy * dy)

    const offsetX = (-dy / len) * curvature * len * 0.5
    const offsetY = (dx / len) * curvature * len * 0.5

    const ctrlX = midX + offsetX
    const ctrlY = midY + offsetY

    return `M ${from.x} ${from.y} Q ${ctrlX} ${ctrlY} ${to.x} ${to.y}`
  }

  /**
   * 更新箭头位置
   */
  protected updateArrow(
    from: { x: number; y: number },
    to: { x: number; y: number }
  ): void {
    if (!this.arrowElement) return

    const dx = to.x - from.x
    const dy = to.y - from.y
    const angle = Math.atan2(dy, dx)
    const arrowSize = 10

    const x1 = to.x - arrowSize * Math.cos(angle - Math.PI / 6)
    const y1 = to.y - arrowSize * Math.sin(angle - Math.PI / 6)
    const x2 = to.x - arrowSize * Math.cos(angle + Math.PI / 6)
    const y2 = to.y - arrowSize * Math.sin(angle + Math.PI / 6)

    this.arrowElement.setAttribute('points', `${to.x},${to.y} ${x1},${y1} ${x2},${y2}`)
  }

  /**
   * 附加到场景
   */
  attachToScene(scene: Scene): void {
    this.scene = scene
    scene.getWrapper().appendChild(this.element)
    this.update()
  }

  /**
   * 从场景分离
   */
  detachFromScene(): void {
    this.element.parentNode?.removeChild(this.element)
    this.scene = null
  }

  /**
   * 获取 DOM 元素
   */
  getElement(): SVGSVGElement {
    return this.element
  }

  /**
   * 设置颜色
   */
  setColor(color: string): this {
    this.options.color = color
    this.pathElement.setAttribute('stroke', color)
    this.arrowElement?.setAttribute('fill', color)
    return this
  }

  /**
   * 设置线宽
   */
  setWidth(width: number): this {
    this.options.width = width
    this.pathElement.setAttribute('stroke-width', String(width))
    return this
  }

  /**
   * 销毁连线
   */
  destroy(): void {
    this.detachFromScene()
    this.eventDispatcher.destroy()
  }
}

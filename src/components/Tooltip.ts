import type { TooltipOptions } from '../types'
import type { Scene } from '../core/Scene'
import type { Entity } from './Entity'
import { generateId } from '../utils/id'

/**
 * 浮层组件
 * 用于显示实体的悬浮提示信息
 */
export class Tooltip {
  /** 唯一标识符 */
  readonly id: string
  /** DOM 元素 */
  protected element: HTMLElement
  /** 目标实体 */
  protected target: Entity
  /** 所属场景 */
  protected scene: Scene | null = null
  /** 配置选项 */
  protected options: TooltipOptions
  /** 是否可见 */
  protected visible = false
  /** 事件监听器引用 */
  private boundHandlers: {
    show?: () => void
    hide?: () => void
    click?: () => void
  } = {}

  constructor(target: Entity, options: TooltipOptions) {
    this.id = generateId('tooltip')
    this.target = target
    this.options = {
      content: options.content,
      position: options.position ?? 'top',
      offset: options.offset ?? { x: 0, y: 0 },
      trigger: options.trigger ?? 'hover',
      className: options.className,
    }

    this.element = this.createElement()
    this.bindTriggerEvents()
  }

  /**
   * 创建浮层 DOM 元素
   */
  protected createElement(): HTMLElement {
    const el = document.createElement('div')
    el.className = 'isometric-tooltip'

    if (this.options.className) {
      el.classList.add(this.options.className)
    }

    Object.assign(el.style, {
      position: 'absolute',
      zIndex: '10000',
      padding: '8px 12px',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      color: '#fff',
      borderRadius: '4px',
      fontSize: '14px',
      lineHeight: '1.4',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      opacity: '0',
      transform: 'scale(0.9)',
      transition: 'opacity 0.2s, transform 0.2s',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    })

    // 设置内容
    const content = this.options.content
    if (typeof content === 'string') {
      el.innerHTML = content
    } else {
      el.appendChild(content)
    }

    return el
  }

  /**
   * 绑定触发事件
   */
  protected bindTriggerEvents(): void {
    const targetElement = this.target.getElement()

    if (this.options.trigger === 'hover') {
      this.boundHandlers.show = () => this.show()
      this.boundHandlers.hide = () => this.hide()

      targetElement.addEventListener('mouseenter', this.boundHandlers.show)
      targetElement.addEventListener('mouseleave', this.boundHandlers.hide)
    } else if (this.options.trigger === 'click') {
      this.boundHandlers.click = () => this.toggle()
      targetElement.addEventListener('click', this.boundHandlers.click)
    }
  }

  /**
   * 设置内容
   */
  setContent(content: string | HTMLElement): this {
    this.options.content = content

    if (typeof content === 'string') {
      this.element.innerHTML = content
    } else {
      this.element.innerHTML = ''
      this.element.appendChild(content)
    }

    return this
  }

  /**
   * 更新位置
   */
  protected updatePosition(): void {
    if (!this.scene) return

    const targetPos = this.target.getAbsolutePosition()
    const targetSize = this.target.getSize()

    const topCenterIso = {
      x: targetPos.x,
      y: targetPos.y,
      z: targetPos.z + targetSize.depth,
    }

    const transform = this.scene.getTransform()
    const screenPos = transform.isoToScreen(topCenterIso)

    const tooltipRect = this.element.getBoundingClientRect()

    let x = screenPos.x - tooltipRect.width / 2
    let y = screenPos.y

    const gap = 10
    switch (this.options.position) {
      case 'top':
        y -= tooltipRect.height + gap
        break
      case 'bottom':
        y += gap
        break
      case 'left':
        x -= tooltipRect.width / 2 + gap
        y -= tooltipRect.height / 2
        break
      case 'right':
        x += tooltipRect.width / 2 + gap
        y -= tooltipRect.height / 2
        break
    }

    x += this.options.offset?.x ?? 0
    y += this.options.offset?.y ?? 0

    this.element.style.left = `${x}px`
    this.element.style.top = `${y}px`
  }

  /**
   * 显示浮层
   */
  show(): this {
    if (!this.scene) return this

    if (!this.element.parentNode) {
      this.scene.getContainer().appendChild(this.element)
    }

    this.visible = true
    this.updatePosition()

    requestAnimationFrame(() => {
      this.element.style.opacity = '1'
      this.element.style.transform = 'scale(1)'
    })

    return this
  }

  /**
   * 隐藏浮层
   */
  hide(): this {
    this.visible = false
    this.element.style.opacity = '0'
    this.element.style.transform = 'scale(0.9)'
    return this
  }

  /**
   * 切换显示状态
   */
  toggle(): this {
    return this.visible ? this.hide() : this.show()
  }

  /**
   * 附加到场景
   */
  attachToScene(scene: Scene): void {
    this.scene = scene
  }

  /**
   * 从场景分离
   */
  detachFromScene(): void {
    this.hide()
    this.element.parentNode?.removeChild(this.element)
    this.scene = null
  }

  /**
   * 获取 DOM 元素
   */
  getElement(): HTMLElement {
    return this.element
  }

  /**
   * 是否可见
   */
  isVisible(): boolean {
    return this.visible
  }

  /**
   * 销毁浮层
   */
  destroy(): void {
    const targetElement = this.target.getElement()

    if (this.boundHandlers.show) {
      targetElement.removeEventListener('mouseenter', this.boundHandlers.show)
    }
    if (this.boundHandlers.hide) {
      targetElement.removeEventListener('mouseleave', this.boundHandlers.hide)
    }
    if (this.boundHandlers.click) {
      targetElement.removeEventListener('click', this.boundHandlers.click)
    }

    this.detachFromScene()
  }
}

import type { EventType, EventHandler, IsometricPosition, ScreenPosition } from '../types'
import type { Scene } from './Scene'
import { EventDispatcher } from '../events/EventDispatcher'
import { generateId } from '../utils/id'

/**
 * 组件基类
 * 提供统一的 ID 生成、事件处理、场景管理等功能
 */
export abstract class BaseComponent<T extends BaseComponent<T> = any> {
  /** 唯一标识符 */
  readonly id: string
  /** DOM 元素 */
  protected element!: HTMLElement | SVGElement
  /** 所属场景 */
  protected scene: Scene | null = null
  /** 事件分发器 */
  protected eventDispatcher!: EventDispatcher<T>

  constructor(idPrefix: string) {
    this.id = generateId(idPrefix)
  }

  /**
   * 初始化事件分发器
   * 子类构造函数中调用
   */
  protected initEventDispatcher(): void {
    this.eventDispatcher = new EventDispatcher<T>(this as unknown as T)
  }

  /**
   * 触发事件
   */
  protected emitEvent(
    type: EventType,
    originalEvent: Event,
    position: IsometricPosition,
    screenPosition?: ScreenPosition
  ): void {
    const screenPos = screenPosition ?? {
      x: (originalEvent as MouseEvent).clientX ?? 0,
      y: (originalEvent as MouseEvent).clientY ?? 0
    }
    this.eventDispatcher.emit(type, originalEvent, position, screenPos)
  }

  /**
   * 添加事件监听器
   */
  on(type: EventType, handler: EventHandler<T>): this {
    this.eventDispatcher.on(type, handler)
    return this
  }

  /**
   * 移除事件监听器
   */
  off(type: EventType, handler: EventHandler<T>): this {
    this.eventDispatcher.off(type, handler)
    return this
  }

  /**
   * 附加到场景
   */
  attachToScene(scene: Scene): void {
    this.scene = scene
    this.onAttach()
  }

  /**
   * 从场景分离
   */
  detachFromScene(): void {
    this.onDetach()
    this.scene = null
  }

  /**
   * 附加到场景时的钩子
   */
  protected onAttach(): void {
    // 子类可重写
  }

  /**
   * 从场景分离时的钩子
   */
  protected onDetach(): void {
    // 子类可重写
  }

  /**
   * 获取 DOM 元素
   */
  getElement(): HTMLElement | SVGElement {
    return this.element
  }

  /**
   * 获取所属场景
   */
  getScene(): Scene | null {
    return this.scene
  }

  /**
   * 销毁组件
   */
  destroy(): void {
    this.detachFromScene()
    this.eventDispatcher?.destroy()
    this.element?.remove()
  }
}

import type { EventType, EventHandler, IsometricPosition, ScreenPosition } from '../types'
import { IsometricEventImpl } from './EventTypes'

/**
 * 事件分发器
 * 管理事件监听和分发
 */
export class EventDispatcher<T = unknown> {
  /** 事件监听器映射 */
  private listeners: Map<EventType, Set<EventHandler<T>>> = new Map()
  /** 目标对象 */
  private target: T

  constructor(target: T) {
    this.target = target
  }

  /**
   * 添加事件监听器
   */
  on(type: EventType, handler: EventHandler<T>): this {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(handler)
    return this
  }

  /**
   * 移除事件监听器
   */
  off(type: EventType, handler: EventHandler<T>): this {
    const handlers = this.listeners.get(type)
    if (handlers) {
      handlers.delete(handler)
      if (handlers.size === 0) {
        this.listeners.delete(type)
      }
    }
    return this
  }

  /**
   * 添加一次性事件监听器
   */
  once(type: EventType, handler: EventHandler<T>): this {
    const onceHandler: EventHandler<T> = (event) => {
      this.off(type, onceHandler)
      handler(event)
    }
    return this.on(type, onceHandler)
  }

  /**
   * 触发事件
   */
  emit(
    type: EventType,
    originalEvent: Event,
    position: IsometricPosition,
    screenPosition: ScreenPosition
  ): void {
    const handlers = this.listeners.get(type)
    if (!handlers || handlers.size === 0) return

    const event = new IsometricEventImpl(
      type,
      this.target,
      originalEvent,
      position,
      screenPosition
    )

    handlers.forEach((handler) => {
      if (!event.propagationStopped) {
        handler(event)
      }
    })
  }

  /**
   * 检查是否有指定类型的监听器
   */
  hasListeners(type: EventType): boolean {
    const handlers = this.listeners.get(type)
    return handlers !== undefined && handlers.size > 0
  }

  /**
   * 移除所有监听器
   */
  removeAllListeners(type?: EventType): this {
    if (type) {
      this.listeners.delete(type)
    } else {
      this.listeners.clear()
    }
    return this
  }

  /**
   * 销毁事件分发器
   */
  destroy(): void {
    this.listeners.clear()
  }
}

import type { EventType, IsometricPosition, ScreenPosition } from '../types'

/**
 * 等距事件对象实现
 */
export class IsometricEventImpl<T = unknown> {
  readonly type: EventType
  readonly target: T
  readonly originalEvent: Event
  readonly position: IsometricPosition
  readonly screenPosition: ScreenPosition

  private _defaultPrevented = false
  private _propagationStopped = false

  constructor(
    type: EventType,
    target: T,
    originalEvent: Event,
    position: IsometricPosition,
    screenPosition: ScreenPosition
  ) {
    this.type = type
    this.target = target
    this.originalEvent = originalEvent
    this.position = position
    this.screenPosition = screenPosition
  }

  preventDefault(): void {
    this._defaultPrevented = true
    this.originalEvent.preventDefault()
  }

  stopPropagation(): void {
    this._propagationStopped = true
    this.originalEvent.stopPropagation()
  }

  get defaultPrevented(): boolean {
    return this._defaultPrevented
  }

  get propagationStopped(): boolean {
    return this._propagationStopped
  }
}

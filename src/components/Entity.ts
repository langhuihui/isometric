import type {
  EntityOptions,
  IsometricPosition,
  Size3D,
  EventType,
  EventHandler,
  EffectOptions,
} from '../types'
import type { Scene } from '../core/Scene'
import { EventDispatcher } from '../events/EventDispatcher'
import { generateId } from '../utils/id'
import { DEFAULT_POSITION, DEFAULT_SIZE } from '../constants/defaults'
import { CubeRenderer } from './CubeRenderer'

/**
 * 实体组件
 * 场景中可渲染的基础组件
 */
export class Entity {
  /** 唯一标识符 */
  readonly id: string
  /** DOM 元素 */
  protected element: HTMLElement
  /** 等距坐标位置 */
  protected position: IsometricPosition
  /** 三维尺寸 */
  protected size: Size3D
  /** 所属场景 */
  protected scene: Scene | null = null
  /** 事件分发器 */
  protected eventDispatcher: EventDispatcher<Entity>
  /** 父实体（用于堆叠） */
  protected parent: Entity | null = null
  /** 子实体集合 */
  protected children: Set<Entity> = new Set()
  /** 相对于父实体的偏移 */
  protected stackOffset: IsometricPosition = { x: 0, y: 0, z: 0 }
  /** 当前应用的特效 */
  protected activeEffects: Set<string> = new Set()
  /** 配置选项 */
  protected options: EntityOptions
  /** 立方体渲染器 */
  protected cubeRenderer: CubeRenderer

  constructor(options: EntityOptions = {}) {
    this.id = generateId('entity')
    this.options = options

    this.position = options.position ?? { ...DEFAULT_POSITION }
    this.size = options.size ?? { ...DEFAULT_SIZE }

    // 创建 DOM 元素
    this.element = this.createElement()
    this.eventDispatcher = new EventDispatcher<Entity>(this)

    // 创建立方体渲染器
    const baseColor = options.style?.backgroundColor
    this.cubeRenderer = new CubeRenderer(this.element, this.size, baseColor)
    this.cubeRenderer.render()

    // 应用纹理
    if (options.texture) {
      this.setTexture(options.texture)
    }

    // 应用自定义样式
    if (options.style) {
      Object.assign(this.element.style, options.style)
    }

    // 应用类名
    if (options.className) {
      this.element.classList.add(options.className)
    }

    // 绑定 DOM 事件
    this.bindDOMEvents()
  }

  /**
   * 创建实体 DOM 元素
   */
  protected createElement(): HTMLElement {
    const el = document.createElement('div')
    el.className = 'isometric-entity'
    el.dataset.entityId = this.id

    Object.assign(el.style, {
      position: 'absolute',
      cursor: 'pointer',
      userSelect: 'none',
      width: '0',
      height: '0',
      overflow: 'visible',
      transformStyle: 'preserve-3d',
    })

    return el
  }

  /**
   * 更新 CSS 变换
   */
  updateTransform(): void {
    if (!this.scene) return

    const transform = this.scene.getTransform()
    const absPos = this.getAbsolutePosition()
    const screenPos = transform.isoToScreen(absPos)

    this.element.style.left = `${screenPos.x}px`
    this.element.style.top = `${screenPos.y}px`

    this.scene.updateEntityZIndex(this)

    // 更新子实体
    this.children.forEach((child) => child.updateTransform())
  }

  /**
   * 绑定 DOM 事件
   */
  protected bindDOMEvents(): void {
    this.element.addEventListener('click', (e) => {
      this.emitEvent('click', e)
    })

    this.element.addEventListener('mouseover', (e) => {
      if (!this.element.contains(e.relatedTarget as Node)) {
        this.emitEvent('hover', e)
      }
    })

    this.element.addEventListener('mouseout', (e) => {
      if (!this.element.contains(e.relatedTarget as Node)) {
        this.emitEvent('hoverEnd', e)
      }
    })

    // 拖拽事件
    let isDragging = false
    this.element.addEventListener('mousedown', (e) => {
      isDragging = true
      this.emitEvent('dragStart', e)
    })

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        this.emitEvent('drag', e)
      }
    })

    document.addEventListener('mouseup', (e) => {
      if (isDragging) {
        isDragging = false
        this.emitEvent('dragEnd', e)
      }
    })
  }

  /**
   * 触发事件
   */
  protected emitEvent(type: EventType, originalEvent: Event): void {
    const screenPos = {
      x: (originalEvent as MouseEvent).clientX ?? 0,
      y: (originalEvent as MouseEvent).clientY ?? 0,
    }

    this.eventDispatcher.emit(type, originalEvent, this.getAbsolutePosition(), screenPos)
  }

  /**
   * 添加事件监听器
   */
  on(type: EventType, handler: EventHandler<Entity>): this {
    this.eventDispatcher.on(type, handler)
    return this
  }

  /**
   * 移除事件监听器
   */
  off(type: EventType, handler: EventHandler<Entity>): this {
    this.eventDispatcher.off(type, handler)
    return this
  }

  /**
   * 设置位置
   */
  setPosition(pos: Partial<IsometricPosition>): this {
    Object.assign(this.position, pos)
    this.updateTransform()
    return this
  }

  /**
   * 获取相对位置
   */
  getPosition(): IsometricPosition {
    return { ...this.position }
  }

  /**
   * 获取绝对位置（考虑父实体）
   */
  getAbsolutePosition(): IsometricPosition {
    if (this.parent) {
      const parentPos = this.parent.getAbsolutePosition()
      return {
        x: parentPos.x + this.position.x + this.stackOffset.x,
        y: parentPos.y + this.position.y + this.stackOffset.y,
        z: parentPos.z + this.position.z + this.stackOffset.z,
      }
    }
    return { ...this.position }
  }

  /**
   * 设置尺寸
   */
  setSize(size: Partial<Size3D>): this {
    Object.assign(this.size, size)
    this.cubeRenderer.updateSize(this.size)
    this.updateTransform()
    return this
  }

  /**
   * 获取尺寸
   */
  getSize(): Size3D {
    return { ...this.size }
  }

  /**
   * 设置纹理
   */
  setTexture(texture: string | HTMLElement): this {
    const topFace = this.cubeRenderer.getFaceElement('top')
    if (!topFace) return this

    if (typeof texture === 'string') {
      if (texture.startsWith('http') || texture.startsWith('/')) {
        topFace.style.backgroundImage = `url(${texture})`
        topFace.style.backgroundSize = 'cover'
        topFace.style.backgroundPosition = 'center'
      } else {
        topFace.innerHTML = texture
      }
    } else {
      topFace.innerHTML = ''
      topFace.appendChild(texture)
    }

    return this
  }

  /**
   * 设置指定面的 innerHTML
   */
  setFaceInnerHTML(face: 'top' | 'left' | 'right', content: string | HTMLElement): this {
    this.cubeRenderer.setFaceContent(face, content)
    return this
  }

  /**
   * 获取指定面的 DOM 元素
   */
  getFaceElement(face: 'top' | 'left' | 'right'): HTMLElement | null {
    return this.cubeRenderer.getFaceElement(face)
  }

  /**
   * 设置光照强度
   */
  setLightIntensity(intensity: number): this {
    this.cubeRenderer.setLightIntensity(intensity)
    return this
  }

  /**
   * 附加到场景
   */
  attachToScene(scene: Scene): void {
    this.scene = scene
    this.updateTransform()
  }

  /**
   * 从场景分离
   */
  detachFromScene(): void {
    this.scene = null
  }

  /**
   * 获取 DOM 元素
   */
  getElement(): HTMLElement {
    return this.element
  }

  /**
   * 堆叠到另一个实体上
   */
  stackOn(parent: Entity, offset: IsometricPosition = { x: 0, y: 0, z: 0 }): this {
    if (this.parent) {
      this.parent.children.delete(this)
    }

    this.parent = parent
    this.stackOffset = offset

    if (offset.z === 0) {
      this.stackOffset.z = parent.size.depth
    }

    parent.children.add(this)

    if (parent.scene && !this.scene) {
      parent.scene.add(this)
    }

    this.updateTransform()
    return this
  }

  /**
   * 取消堆叠
   */
  unstack(): this {
    if (this.parent) {
      this.parent.children.delete(this)
      this.parent = null
      this.stackOffset = { x: 0, y: 0, z: 0 }
      this.updateTransform()
    }
    return this
  }

  /**
   * 获取父实体
   */
  getParent(): Entity | null {
    return this.parent
  }

  /**
   * 获取子实体
   */
  getChildren(): Entity[] {
    return Array.from(this.children)
  }

  /**
   * 应用特效
   */
  applyEffect(effect: EffectOptions): this {
    const effectClass = `isometric-effect-${effect.type}`
    this.element.classList.add(effectClass)
    this.activeEffects.add(effect.type)

    const duration = effect.duration ?? 1000
    const intensity = effect.intensity ?? 1

    this.element.style.setProperty('--effect-duration', `${duration}ms`)
    this.element.style.setProperty('--effect-intensity', String(intensity))

    if (effect.color) {
      this.element.style.setProperty('--effect-color', effect.color)
    }

    if (!effect.loop) {
      setTimeout(() => {
        this.removeEffect(effect.type)
      }, duration)
    }

    return this
  }

  /**
   * 移除特效
   */
  removeEffect(type: string): this {
    const effectClass = `isometric-effect-${type}`
    this.element.classList.remove(effectClass)
    this.activeEffects.delete(type)
    return this
  }

  /**
   * 移除所有特效
   */
  clearEffects(): this {
    this.activeEffects.forEach((type) => {
      this.element.classList.remove(`isometric-effect-${type}`)
    })
    this.activeEffects.clear()
    return this
  }

  /**
   * 设置可见性
   */
  setVisible(visible: boolean): this {
    this.element.style.display = visible ? '' : 'none'
    return this
  }

  /**
   * 设置透明度
   */
  setOpacity(opacity: number): this {
    this.element.style.opacity = String(Math.max(0, Math.min(1, opacity)))
    return this
  }

  /**
   * 销毁实体
   */
  destroy(): void {
    this.unstack()

    this.children.forEach((child) => child.destroy())
    this.children.clear()

    if (this.scene) {
      this.scene.remove(this)
    }

    this.eventDispatcher.destroy()
    this.element.remove()
  }
}

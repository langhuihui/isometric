import type { SceneOptions, IsometricPosition, ScreenPosition } from '../types'
import { Transform } from './Transform'
import type { Entity } from '../components/Entity'

/**
 * 场景管理器
 * 负责管理场景容器、实体集合和渲染调度
 */
export class Scene {
  /** 场景容器元素 */
  private container: HTMLElement
  /** 场景内部包装器 */
  private wrapper: HTMLElement
  /** 等距视角容器 */
  private isoContainer: HTMLElement = null as unknown as HTMLElement
  /** 坐标变换器 */
  private transform: Transform
  /** 场景中的实体集合 */
  private entities: Set<Entity> = new Set()
  /** 场景配置 */
  private options: SceneOptions

  constructor(container: HTMLElement, options: SceneOptions = {}) {
    this.container = container
    this.options = {
      angle: options.angle ?? 45,
      perspective: options.perspective ?? 1000,
      scale: options.scale ?? 1,
      origin: options.origin ?? { x: 0, y: 0 },
    }

    // 初始化变换器
    this.transform = new Transform(this.options)

    // 创建场景包装器
    this.wrapper = this.createWrapper()
    this.container.appendChild(this.wrapper)

    // 应用容器样式
    this.applyContainerStyles()
  }

  /**
   * 创建场景内部包装器
   */
  private createWrapper(): HTMLElement {
    const wrapper = document.createElement('div')
    wrapper.className = 'isometric-scene-wrapper'

    Object.assign(wrapper.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      width: '100%',
      height: '100%',
      overflow: 'visible',
    })

    // 创建等距视角容器 - 不使用 3D 旋转，用 2D 等距投影
    this.isoContainer = document.createElement('div')
    this.isoContainer.className = 'isometric-container'
    Object.assign(this.isoContainer.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      width: '0',
      height: '0',
    })
    wrapper.appendChild(this.isoContainer)

    return wrapper
  }

  /**
   * 应用容器样式
   */
  private applyContainerStyles(): void {
    Object.assign(this.container.style, {
      position: 'relative',
      overflow: 'hidden',
    })

    // 添加场景标识类
    this.container.classList.add('isometric-scene')
  }

  /**
   * 添加实体到场景
   */
  add(entity: Entity): this {
    if (!this.entities.has(entity)) {
      this.entities.add(entity)
      entity.attachToScene(this)
      this.isoContainer.appendChild(entity.getElement())
      this.updateEntityZIndex(entity)
    }
    return this
  }

  /**
   * 从场景移除实体
   */
  remove(entity: Entity): this {
    if (this.entities.has(entity)) {
      this.entities.delete(entity)
      entity.detachFromScene()
      const element = entity.getElement()
      if (element.parentNode === this.isoContainer) {
        this.isoContainer.removeChild(element)
      }
    }
    return this
  }

  /**
   * 更新实体的 z-index
   */
  updateEntityZIndex(entity: Entity): void {
    // 使用绝对位置计算 z-index，确保堆叠实体正确排序
    const absPos = entity.getAbsolutePosition()
    const zIndex = this.transform.calculateZIndex(absPos)
    entity.getElement().style.zIndex = String(zIndex)
  }

  /**
   * 更新所有实体的 z-index
   */
  updateAllZIndices(): void {
    this.entities.forEach((entity) => {
      this.updateEntityZIndex(entity)
    })
  }

  /**
   * 获取坐标变换器
   */
  getTransform(): Transform {
    return this.transform
  }

  /**
   * 获取场景包装器元素
   */
  getWrapper(): HTMLElement {
    return this.wrapper
  }

  /**
   * 获取场景容器元素
   */
  getContainer(): HTMLElement {
    return this.container
  }

  /**
   * 将屏幕坐标转换为等距坐标
   */
  screenToIso(screen: ScreenPosition, z = 0): IsometricPosition {
    // 获取容器相对于视口的位置
    const rect = this.container.getBoundingClientRect()
    const relativeX = screen.x - rect.left - rect.width / 2
    const relativeY = screen.y - rect.top - rect.height / 2

    return this.transform.screenToIso({ x: relativeX, y: relativeY }, z)
  }

  /**
   * 将等距坐标转换为屏幕坐标
   */
  isoToScreen(pos: IsometricPosition): ScreenPosition {
    const screenPos = this.transform.isoToScreen(pos)
    const rect = this.container.getBoundingClientRect()

    return {
      x: screenPos.x + rect.left + rect.width / 2,
      y: screenPos.y + rect.top + rect.height / 2,
    }
  }

  /**
   * 更新场景配置
   */
  update(options: Partial<SceneOptions>): void {
    Object.assign(this.options, options)
    this.transform.update(options)

    // 重新渲染所有实体
    this.entities.forEach((entity) => {
      entity.updateTransform()
      this.updateEntityZIndex(entity)
    })
  }

  /**
   * 获取场景中的所有实体
   */
  getEntities(): Entity[] {
    return Array.from(this.entities)
  }

  /**
   * 清空场景
   */
  clear(): void {
    this.entities.forEach((entity) => {
      entity.detachFromScene()
    })
    this.entities.clear()
    this.isoContainer.innerHTML = ''
  }

  /**
   * 销毁场景
   */
  destroy(): void {
    this.clear()
    this.container.removeChild(this.wrapper)
    this.container.classList.remove('isometric-scene')
  }

  /**
   * 设置场景原点（通常设置为容器中心）
   */
  centerOrigin(): void {
    const rect = this.container.getBoundingClientRect()
    this.update({
      origin: { x: rect.width / 2, y: rect.height / 2 },
    })
  }
}

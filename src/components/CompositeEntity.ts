import type { EntityOptions, IsometricPosition } from '../types'
import { Entity } from './Entity'

/**
 * 复合实体选项
 */
export interface CompositeEntityOptions extends EntityOptions {
  /** 子实体配置 */
  children?: Array<{
    entity: Entity | EntityOptions
    offset: IsometricPosition
  }>
}

/**
 * 复合实体
 * 支持将多个实体组合成一个整体
 */
export class CompositeEntity extends Entity {
  constructor(options: CompositeEntityOptions = {}) {
    super(options)

    // 添加子实体
    if (options.children) {
      options.children.forEach(({ entity, offset }) => {
        const childEntity = entity instanceof Entity ? entity : new Entity(entity)
        childEntity.stackOn(this, offset)
      })
    }
  }

  /**
   * 添加子实体
   */
  addChild(entity: Entity, offset: IsometricPosition = { x: 0, y: 0, z: 0 }): this {
    entity.stackOn(this, offset)
    return this
  }

  /**
   * 移除子实体
   */
  removeChild(entity: Entity): this {
    if (this.children.has(entity)) {
      entity.unstack()
    }
    return this
  }

  /**
   * 获取所有后代实体（递归）
   */
  getAllDescendants(): Entity[] {
    const descendants: Entity[] = []

    const collect = (entity: Entity) => {
      entity.getChildren().forEach((child) => {
        descendants.push(child)
        collect(child)
      })
    }

    collect(this)
    return descendants
  }

  /**
   * 设置整体位置（移动所有子实体）
   */
  override setPosition(pos: Partial<IsometricPosition>): this {
    super.setPosition(pos)
    // 子实体会通过 updateTransform 自动更新
    return this
  }

  /**
   * 对所有子实体应用特效
   */
  applyEffectToAll(effect: Parameters<Entity['applyEffect']>[0]): this {
    this.applyEffect(effect)
    this.children.forEach((child) => {
      child.applyEffect(effect)
    })
    return this
  }

  /**
   * 清除所有子实体的特效
   */
  clearAllEffects(): this {
    this.clearEffects()
    this.children.forEach((child) => {
      child.clearEffects()
    })
    return this
  }
}

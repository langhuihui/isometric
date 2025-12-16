import type {
  SceneOptions,
  EntityOptions,
  ConnectorOptions,
  TooltipOptions,
  LightOptions,
} from '../types'
import { Scene } from './Scene'
import { Entity } from '../components/Entity'
import { CompositeEntity, type CompositeEntityOptions } from '../components/CompositeEntity'
import { Connector } from '../components/Connector'
import { Tooltip } from '../components/Tooltip'
import { effectManager } from '../effects/EffectManager'
import { LightingSystem } from '../effects/LightingSystem'

/**
 * 等距引擎主类
 * 提供创建和管理等距场景的统一 API
 */
export class IsometricEngine {
  /** 引擎版本 */
  static readonly VERSION = '0.1.0'

  /** 场景集合 */
  private scenes: Map<string, Scene> = new Map()
  /** 连线集合 */
  private connectors: Map<string, Connector> = new Map()
  /** 浮层集合 */
  private tooltips: Map<string, Tooltip> = new Map()
  /** 光影系统 */
  private lightingSystem: LightingSystem

  constructor() {
    // 确保特效样式已注入
    effectManager.ensureStyles()
    this.lightingSystem = new LightingSystem()
  }

  /**
   * 创建场景
   */
  createScene(container: HTMLElement, options?: SceneOptions): Scene {
    const scene = new Scene(container, options)
    const id = `scene-${this.scenes.size + 1}`
    this.scenes.set(id, scene)
    return scene
  }

  /**
   * 创建实体
   */
  createEntity(options?: EntityOptions): Entity {
    return new Entity(options)
  }

  /**
   * 创建复合实体
   */
  createCompositeEntity(options?: CompositeEntityOptions): CompositeEntity {
    return new CompositeEntity(options)
  }

  /**
   * 创建连线
   */
  createConnector(from: Entity, to: Entity, options?: ConnectorOptions): Connector {
    const connector = new Connector(from, to, options)
    this.connectors.set(connector.id, connector)
    return connector
  }

  /**
   * 将连线添加到场景
   */
  addConnectorToScene(connector: Connector, scene: Scene): void {
    connector.attachToScene(scene)
  }

  /**
   * 创建浮层
   */
  createTooltip(target: Entity, options: TooltipOptions): Tooltip {
    const tooltip = new Tooltip(target, options)
    this.tooltips.set(tooltip.id, tooltip)
    return tooltip
  }

  /**
   * 将浮层添加到场景
   */
  addTooltipToScene(tooltip: Tooltip, scene: Scene): void {
    tooltip.attachToScene(scene)
  }

  /**
   * 添加光源
   */
  addLight(options: LightOptions) {
    return this.lightingSystem.addLight(options)
  }

  /**
   * 获取光影系统
   */
  getLightingSystem(): LightingSystem {
    return this.lightingSystem
  }

  /**
   * 注册自定义特效
   */
  registerEffect(name: string, definition: Parameters<typeof effectManager.register>[1]): this {
    effectManager.register(name, definition)
    return this
  }

  /**
   * 获取所有可用特效
   */
  getAvailableEffects(): string[] {
    return effectManager.getNames()
  }

  /**
   * 销毁引擎
   */
  destroy(): void {
    // 销毁所有场景
    this.scenes.forEach((scene) => scene.destroy())
    this.scenes.clear()

    // 销毁所有连线
    this.connectors.forEach((connector) => connector.destroy())
    this.connectors.clear()

    // 销毁所有浮层
    this.tooltips.forEach((tooltip) => tooltip.destroy())
    this.tooltips.clear()

    // 销毁光影系统
    this.lightingSystem.destroy()
  }
}

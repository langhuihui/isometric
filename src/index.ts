// Core
export { IsometricEngine } from './core/IsometricEngine'
export { Scene } from './core/Scene'
export { Transform } from './core/Transform'
export { BaseComponent } from './core/BaseComponent'

// Components
export { Entity } from './components/Entity'
export { CompositeEntity } from './components/CompositeEntity'
export type { CompositeEntityOptions } from './components/CompositeEntity'
export { Connector } from './components/Connector'
export { Tooltip } from './components/Tooltip'
export { CubeRenderer } from './components/CubeRenderer'
export { PathCalculator } from './components/PathCalculator'

// Web Components (声明式组件)
export { IsoEntity } from './components/IsoEntity'
export { IsoConnector } from './components/IsoConnector'
export { IsoScene } from './components/IsoScene'

// Effects
export { effectManager, EffectManager } from './effects/EffectManager'
export type { EffectDefinition } from './effects/EffectManager'
export { LightingSystem, Light } from './effects/LightingSystem'

// Events
export { EventDispatcher } from './events/EventDispatcher'
export { IsometricEventImpl } from './events/EventTypes'

// Utils
export * from './utils'

// Constants
export * from './constants'

// Types
export type {
  IsometricPosition,
  Size3D,
  ScreenPosition,
  EntityOptions,
  SceneOptions,
  EffectType,
  EffectOptions,
  EventType,
  EventHandler,
  IsometricEvent,
  ConnectorOptions,
  TooltipOptions,
  LightOptions,
} from './types'

// Default export
export { IsometricEngine as default } from './core/IsometricEngine'

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

// SVG 圆角立方体 / 圆柱渲染器
export { renderRoundedBox, createRoundedBoxSvg, projectPoint, viewDepth } from './core/RoundedBox'
export type { RoundedBoxOptions, RoundedBoxResult } from './core/RoundedBox'
export { renderCylinder, createCylinderSvg } from './core/Cylinder'
export type { CylinderOptions } from './core/Cylinder'
export { renderAnchor, renderAnchorsAt, ANCHOR_STYLES, visibleFaceAnchors, cylinderVisibleAnchors } from './core/Anchor'
export type { AnchorStyle, AnchorOptions, ShapeAnchor } from './core/Anchor'
export { renderIsoLink, isoLinkStyle, routeIsoWaypoints } from './core/IsoLink'
export type { IsoLinkOptions } from './core/IsoLink'
export { renderIsoPerson, renderIsoPlant } from './core/IsoProps'
export type { IsoPersonOptions, IsoPlantOptions } from './core/IsoProps'
export type { IsoShapeStyle, IsoShapeResult, FaceName, PositionName, Vec2, Vec3, MaterialName, ThemeName } from './core/isoSvg'
export {
  boxFacePoint,
  cylinderAnchorPoint,
  applyMaterial,
  deriveFaceColors,
  MATERIALS,
  THEMES,
  parseColor,
  cssColor,
  isMaterialName,
  isThemeName
} from './core/isoSvg'

// Web Components (声明式组件)
export { IsoEntity, type FaceType, type PositionType } from './components/IsoEntity'
export { IsoCube } from './components/IsoCube'
export { IsoRoundedCube } from './components/IsoRoundedCube'
export { IsoCylinder } from './components/IsoCylinder'
export { IsoPerson, IsoPlant } from './components/IsoPerson'
export { IsoPlane } from './components/IsoPlane'
export { IsoConsoleFront, IsoConsoleRight } from './components/IsoConsole'
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

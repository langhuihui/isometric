/**
 * 等距坐标位置
 */
export interface IsometricPosition {
  /** 等距 X 坐标 */
  x: number
  /** 等距 Y 坐标 */
  y: number
  /** 高度层级 (Z 轴) */
  z: number
}

/**
 * 三维尺寸
 */
export interface Size3D {
  width: number
  height: number
  depth: number
}

/**
 * 屏幕坐标
 */
export interface ScreenPosition {
  x: number
  y: number
}

/**
 * 实体配置选项
 */
export interface EntityOptions {
  /** 等距坐标位置 */
  position?: IsometricPosition
  /** 三维尺寸 */
  size?: Size3D
  /** 纹理内容：可以是 HTML 字符串、DOM 元素或图片 URL */
  texture?: string | HTMLElement
  /** 是否可堆叠 */
  stackable?: boolean
  /** CSS 类名 */
  className?: string
  /** 自定义样式 */
  style?: Partial<CSSStyleDeclaration>
}

/**
 * 场景配置选项
 */
export interface SceneOptions {
  /** 等距角度 (默认 45°) */
  angle?: number
  /** 透视距离 (默认 1000px) */
  perspective?: number
  /** 缩放比例 */
  scale?: number
  /** 原点位置 */
  origin?: ScreenPosition
}

/**
 * 特效类型
 */
export type EffectType = 'bounce' | 'blink' | 'glow' | 'shake' | 'pulse'

/**
 * 特效配置选项
 */
export interface EffectOptions {
  /** 特效类型 */
  type: EffectType | string
  /** 持续时间 (ms) */
  duration?: number
  /** 是否循环 */
  loop?: boolean
  /** 动画延迟 (ms) */
  delay?: number
  /** 特效强度 (0-1) */
  intensity?: number
  /** 自定义颜色 */
  color?: string
}

/**
 * 事件类型
 */
export type EventType = 'click' | 'hover' | 'hoverEnd' | 'drag' | 'dragStart' | 'dragEnd'

/**
 * 事件处理器
 */
export type EventHandler<T = unknown> = (event: IsometricEvent<T>) => void

/**
 * 等距事件对象
 */
export interface IsometricEvent<T = unknown> {
  /** 事件类型 */
  type: EventType
  /** 事件目标 */
  target: T
  /** 原生 DOM 事件 */
  originalEvent: Event
  /** 等距坐标位置 */
  position: IsometricPosition
  /** 屏幕坐标位置 */
  screenPosition: ScreenPosition
  /** 阻止默认行为 */
  preventDefault: () => void
  /** 停止传播 */
  stopPropagation: () => void
}

/**
 * 连线配置选项
 */
export interface ConnectorOptions {
  /** 线条颜色 */
  color?: string
  /** 线条宽度 */
  width?: number
  /** 线条样式 */
  style?: 'solid' | 'dashed' | 'dotted'
  /** 是否显示箭头 */
  arrow?: boolean
  /** 曲线弯曲程度 */
  curvature?: number
}

/**
 * 浮层配置选项
 */
export interface TooltipOptions {
  /** 浮层内容 */
  content: string | HTMLElement
  /** 显示位置 */
  position?: 'top' | 'bottom' | 'left' | 'right'
  /** 偏移量 */
  offset?: ScreenPosition
  /** 触发方式 */
  trigger?: 'hover' | 'click' | 'manual'
  /** 自定义类名 */
  className?: string
}

/**
 * 光源配置
 */
export interface LightOptions {
  /** 光源位置 */
  position: IsometricPosition
  /** 光源颜色 */
  color?: string
  /** 光源强度 (0-1) */
  intensity?: number
  /** 光源类型 */
  type?: 'point' | 'directional' | 'ambient'
}

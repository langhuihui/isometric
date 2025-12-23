import { LitElement, html, css } from 'lit'
import { property, state } from 'lit/decorators.js'
import type { IsoEntity } from './IsoEntity'
import type { IsoScene } from './IsoScene'

// 面类型
type FaceType = 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right'
// 面上的位置类型
type PositionType = 'tl' | 'tc' | 'tr' | 'ml' | 'mc' | 'mr' | 'bl' | 'bc' | 'br'
// 路由方向类型
type RouteAxis = 'x' | 'y' | 'z'
// 小球特效类型
type ParticleEffect = 'none' | 'glow' | 'trail' | 'pulse' | 'rainbow' | 'spark'
// 粒子方向类型
type ParticleDirection = 'forward' | 'backward' | 'bidirectional'
// 动画类型
type AnimationType = 'none' | 'flow' | 'pulse' | 'glow'

// 面的法向量（垂直于面向外的方向）
const FACE_NORMALS: Record<FaceType, { x: number; y: number; z: number }> = {
  top: { x: 0, y: 0, z: 1 },     // 顶面朝上
  bottom: { x: 0, y: 0, z: -1 }, // 底面朝下
  front: { x: 0, y: 1, z: 0 },   // 前面朝向观察者 (+y)
  back: { x: 0, y: -1, z: 0 },   // 后面背向观察者 (-y)
  left: { x: -1, y: 0, z: 0 },   // 左面 (-x)
  right: { x: 1, y: 0, z: 0 },   // 右面 (+x)
}

/** 3D 线段 */
interface LineSegment3D {
  start: { x: number; y: number; z: number }
  end: { x: number; y: number; z: number }
  length: number
  axis: RouteAxis | 'direct'
}

/** 粒子（发光小球）数据 */
interface Particle {
  id: number
  progress: number  // 0-1，表示在整条路径上的位置
  createdAt: number
}

/** 解析后的粒子配置 */
interface ParticleConfig {
  enabled: boolean
  color: string
  size: number
  rate: number
  speed: number
  effect: ParticleEffect
  direction: ParticleDirection
  trailLength: number
}

/** 解析后的动画配置 */
interface AnimationConfig {
  type: AnimationType
  speed: number
  color: string
}

/** 解析后的连接点配置 */
interface ConnectionConfig {
  entityId: string
  face: FaceType
  position: PositionType
}

/**
 * 等距连线 Web Component
 * 
 * 使用 3D 变换在等距空间中绘制连线，和实体一样由场景层统一做旋转变换
 * 
 * 属性格式：
 * - from/to: "entityId" 或 "entityId@face:position"（如 "box1@bottom:mr"）
 * - animation: "type" 或 "type speed" 或 "type speed color"（如 "flow 1.5 #ff0000"）
 * - particles: "color size rate speed effect direction trail"（如 "#fff 8 2 0.5 glow forward 3"）
 */
export class IsoConnector extends LitElement {
  // 连接配置：格式为 "entityId" 或 "entityId@face:position"
  @property({ type: String }) from = ''
  @property({ type: String }) to = ''

  // 路由配置
  @property({ type: String }) route: string = 'auto'

  // 样式属性
  @property({ type: String }) color = '#00d4ff'
  @property({ type: Number }) width = 2
  @property({ type: String, attribute: 'line-style' }) lineStyle: 'solid' | 'dashed' | 'dotted' = 'solid'

  // 动画配置：格式为 "type" 或 "type speed" 或 "type speed color"
  // 如 "flow"、"pulse 2"、"glow 1.5 #ff0000"
  @property({ type: String }) animation = 'none'

  // 垂直延伸距离（从连接点垂直于面向外延伸的距离）
  @property({ type: Number, attribute: 'perpendicular-length' }) perpendicularLength = 0

  // 选中状态（用于高亮，避免使用 filter 破坏 3D 变换）
  @property({ type: Boolean, reflect: true }) selected = false

  // 粒子配置：格式为 "color size rate speed effect direction trail"
  // 如 "#ffffff 8 2 0.5 glow forward 3" 或简写 "8 2 0.5"（使用默认值）
  // 设置为空字符串或 "none" 禁用粒子
  @property({ type: String }) particles = ''

  // 内部状态
  @state() private _segments: LineSegment3D[] = []
  @state() private _particles: Particle[] = []
  @state() private _reverseParticles: Particle[] = [] // 反向粒子（双向模式）

  private _fromEntity: IsoEntity | null = null
  private _toEntity: IsoEntity | null = null
  private _scene: IsoScene | null = null
  private _resizeObserver: ResizeObserver | null = null
  private _updateTimer: number | null = null
  private _particleIdCounter = 0
  private _lastEmitTime = 0
  private _lastReverseEmitTime = 0
  private _animationFrameId: number | null = null
  private _totalPathLength = 0
  private _lastFrameTime = 0

  // 缓存解析结果
  private _cachedFromConfig: ConnectionConfig | null = null
  private _cachedToConfig: ConnectionConfig | null = null
  private _cachedAnimationConfig: AnimationConfig | null = null
  private _cachedParticleConfig: ParticleConfig | null = null
  private _lastFrom = ''
  private _lastTo = ''
  private _lastAnimation = ''
  private _lastParticles = ''

  /**
   * 解析连接点字符串
   * 格式: "entityId" 或 "entityId@face:position"
   */
  private _parseConnection(value: string): ConnectionConfig {
    const atIndex = value.indexOf('@')
    if (atIndex === -1) {
      return {
        entityId: value,
        face: 'top',
        position: 'mc'
      }
    }
    
    const entityId = value.substring(0, atIndex)
    const anchor = value.substring(atIndex + 1)
    const [face, position] = anchor.split(':')
    
    return {
      entityId,
      face: (face || 'top') as FaceType,
      position: (position || 'mc') as PositionType
    }
  }

  /**
   * 解析动画字符串
   * 格式: "type" 或 "type speed" 或 "type speed color"
   */
  private _parseAnimation(value: string): AnimationConfig {
    const parts = value.trim().split(/\s+/)
    const type = (parts[0] || 'none') as AnimationType
    const speed = parts[1] ? parseFloat(parts[1]) : 1
    const color = parts[2] || ''
    
    return { type, speed, color }
  }

  /**
   * 解析粒子配置字符串
   * 格式: "color size rate speed effect direction trail"
   * 支持带单位的参数（顺序无关）：
   * - size: 数字或带 px 后缀，如 "8" 或 "8px"
   * - rate: 带 hz 后缀，如 "2hz"
   * - speed: 带 ms 后缀（毫秒转秒），如 "500ms"
   * - trail: 带 trail 后缀，如 "3trail"
   * 
   * 示例：
   * - "#fff 8px 2hz 500ms glow forward 3trail"
   * - "500ms 8px 2hz" (顺序无关)
   * - "8 2 0.5" (无单位按顺序解析)
   */
  private _parseParticles(value: string): ParticleConfig {
    const trimmed = value.trim()
    if (!trimmed || trimmed === 'none') {
      return {
        enabled: false,
        color: '',
        size: 8,
        rate: 2,
        speed: 0.5,
        effect: 'glow',
        direction: 'forward',
        trailLength: 3
      }
    }

    const parts = trimmed.split(/\s+/)
    const config: ParticleConfig = {
      enabled: true,
      color: '',
      size: 8,
      rate: 2,
      speed: 0.5,
      effect: 'glow',
      direction: 'forward',
      trailLength: 3
    }

    // 跟踪无单位数字的解析顺序
    let bareNumberIndex = 0

    for (const part of parts) {
      const lowerPart = part.toLowerCase()

      // 颜色（以 # 或 rgb/hsl 开头）
      if (part.startsWith('#') || lowerPart.startsWith('rgb') || lowerPart.startsWith('hsl')) {
        config.color = part
      }
      // 特效类型
      else if (['none', 'glow', 'trail', 'pulse', 'rainbow', 'spark'].includes(lowerPart)) {
        config.effect = lowerPart as ParticleEffect
      }
      // 方向
      else if (['forward', 'backward', 'bidirectional'].includes(lowerPart)) {
        config.direction = lowerPart as ParticleDirection
      }
      // size: 带 px 后缀
      else if (lowerPart.endsWith('px')) {
        const num = parseFloat(lowerPart)
        if (!isNaN(num)) config.size = num
      }
      // rate: 带 hz 后缀
      else if (lowerPart.endsWith('hz')) {
        const num = parseFloat(lowerPart)
        if (!isNaN(num)) config.rate = num
      }
      // speed: 带 ms 后缀（毫秒转秒）
      else if (lowerPart.endsWith('ms')) {
        const num = parseFloat(lowerPart)
        if (!isNaN(num)) config.speed = num / 1000
      }
      // speed: 带 s 后缀（秒）
      else if (lowerPart.endsWith('s') && !lowerPart.endsWith('ms')) {
        const num = parseFloat(lowerPart)
        if (!isNaN(num)) config.speed = num
      }
      // trail: 带 trail 后缀
      else if (lowerPart.endsWith('trail')) {
        const num = parseFloat(lowerPart)
        if (!isNaN(num)) config.trailLength = num
      }
      // 无单位数字：按顺序解析为 size, rate, speed, trailLength
      else if (!isNaN(parseFloat(part))) {
        const num = parseFloat(part)
        switch (bareNumberIndex) {
          case 0: config.size = num; break
          case 1: config.rate = num; break
          case 2: config.speed = num; break
          case 3: config.trailLength = num; break
        }
        bareNumberIndex++
      }
    }

    return config
  }

  // 获取解析后的 from 配置
  get fromConfig(): ConnectionConfig {
    if (this._lastFrom !== this.from || !this._cachedFromConfig) {
      this._cachedFromConfig = this._parseConnection(this.from)
      this._lastFrom = this.from
    }
    return this._cachedFromConfig
  }

  // 获取解析后的 to 配置
  get toConfig(): ConnectionConfig {
    if (this._lastTo !== this.to || !this._cachedToConfig) {
      this._cachedToConfig = this._parseConnection(this.to)
      this._lastTo = this.to
    }
    return this._cachedToConfig
  }

  // 获取解析后的动画配置
  get animationConfig(): AnimationConfig {
    if (this._lastAnimation !== this.animation || !this._cachedAnimationConfig) {
      this._cachedAnimationConfig = this._parseAnimation(this.animation)
      this._lastAnimation = this.animation
    }
    return this._cachedAnimationConfig
  }

  // 获取解析后的粒子配置
  get particleConfig(): ParticleConfig {
    if (this._lastParticles !== this.particles || !this._cachedParticleConfig) {
      this._cachedParticleConfig = this._parseParticles(this.particles)
      this._lastParticles = this.particles
    }
    return this._cachedParticleConfig
  }

  // 兼容旧 API 的 getter
  get fromFace(): FaceType {
    return this.fromConfig.face
  }

  get fromPosition(): PositionType {
    return this.fromConfig.position
  }

  get toFace(): FaceType {
    return this.toConfig.face
  }

  get toPosition(): PositionType {
    return this.toConfig.position
  }

  static styles = css`
    :host {
      display: block;
      position: absolute;
      left: 0;
      top: 0;
      pointer-events: none;
      transform-style: preserve-3d;
    }

    .line-segment {
      position: absolute;
      left: 0;
      top: 0;
      transform-style: preserve-3d;
      pointer-events: none;
    }

    .line-inner {
      position: absolute;
      transform-origin: left center;
      pointer-events: auto;
      cursor: pointer;
    }

    .line-inner.selected {
      box-shadow: 0 0 6px 2px rgba(255, 255, 255, 0.8);
    }

    .line-inner.glow {
      box-shadow: 0 0 4px var(--glow-color, currentColor),
                  0 0 8px var(--glow-color, currentColor);
    }

    @keyframes flow {
      from { background-position: 0 0; }
      to { background-position: 24px 0; }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    @keyframes glow-pulse {
      0%, 100% { 
        box-shadow: 0 0 2px var(--glow-color, currentColor),
                    0 0 4px var(--glow-color, currentColor);
      }
      50% { 
        box-shadow: 0 0 6px var(--glow-color, currentColor),
                    0 0 12px var(--glow-color, currentColor);
      }
    }

    .animate-flow {
      animation: flow calc(1s / var(--animate-speed, 1)) linear infinite;
    }

    .animate-pulse {
      animation: pulse calc(2s / var(--animate-speed, 1)) ease-in-out infinite;
    }

    .animate-glow {
      animation: glow-pulse calc(2s / var(--animate-speed, 1)) ease-in-out infinite;
    }

    /* 锚点样式 */
    .anchor-point {
      position: absolute;
      left: 0;
      top: 0;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-left: -4px;
      margin-top: -4px;
      pointer-events: none;
      transform-style: preserve-3d;
    }

    .from-anchor {
      background: #00ff00;
      box-shadow: 0 0 4px #00ff00;
    }

    .to-anchor {
      background: #ff0000;
      box-shadow: 0 0 4px #ff0000;
    }

    /* ========== 粒子（发光小球）样式 ========== */
    .particle {
      position: absolute;
      left: 0;
      top: 0;
      border-radius: 50%;
      pointer-events: none;
      transform-style: preserve-3d;
      will-change: transform;
    }

    /* 发光特效 */
    .particle.effect-glow {
      box-shadow: 0 0 6px 2px var(--particle-glow-color),
                  0 0 12px 4px var(--particle-glow-color);
    }

    /* 脉冲特效 */
    .particle.effect-pulse {
      box-shadow: 0 0 6px 2px var(--particle-glow-color),
                  0 0 12px 4px var(--particle-glow-color);
      animation: particle-pulse 0.5s ease-in-out infinite;
    }

    @keyframes particle-pulse {
      0%, 100% { 
        transform: translate3d(var(--px), var(--py), var(--pz)) scale(1);
        opacity: 1;
      }
      50% { 
        transform: translate3d(var(--px), var(--py), var(--pz)) scale(1.3);
        opacity: 0.7;
      }
    }

    /* 火花特效 */
    .particle.effect-spark {
      box-shadow: 0 0 4px 1px var(--particle-glow-color),
                  0 0 8px 2px var(--particle-glow-color),
                  0 0 16px 4px var(--particle-glow-color);
      animation: particle-spark 0.3s ease-in-out infinite;
    }

    @keyframes particle-spark {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    /* 彩虹特效 - 带发光 */
    .particle.effect-rainbow {
      box-shadow: 0 0 8px 3px var(--particle-glow-color),
                  0 0 16px 6px var(--particle-glow-color);
    }

    /* 拖尾容器 */
    .particle-trail {
      position: absolute;
      left: 0;
      top: 0;
      pointer-events: none;
      transform-style: preserve-3d;
    }

    .trail-dot {
      position: absolute;
      left: 0;
      top: 0;
      border-radius: 50%;
      pointer-events: none;
      transform-style: preserve-3d;
    }
  `

  private _anglesHandler = (() => {
    this._updatePath()
  }) as EventListener

  connectedCallback() {
    super.connectedCallback()
    this._scene = this.closest('iso-scene') as IsoScene
    this._setupObservers()
    setTimeout(() => {
      this._findEntities()
      this._updatePath()
      this._startParticleAnimation()
    }, 100)

    window.addEventListener('iso-angles-changed', this._anglesHandler)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this._cleanupObservers()
    this._stopParticleAnimation()
    if (this._updateTimer) {
      clearTimeout(this._updateTimer)
    }
    window.removeEventListener('iso-angles-changed', this._anglesHandler)
  }

  private _setupObservers() {
    this._resizeObserver = new ResizeObserver(() => {
      this._scheduleUpdate()
    })

    if (this._scene) {
      this._resizeObserver.observe(this._scene)
    }
  }

  private _cleanupObservers() {
    this._resizeObserver?.disconnect()
  }

  private _scheduleUpdate() {
    if (this._updateTimer) {
      clearTimeout(this._updateTimer)
    }
    this._updateTimer = window.setTimeout(() => {
      this._updatePath()
    }, 16)
  }

  private _findEntities() {
    if (!this._scene) {
      this._scene = this.closest('iso-scene') as IsoScene
    }
    if (!this._scene) return

    const fromId = this.fromConfig.entityId
    const toId = this.toConfig.entityId

    if (fromId) {
      this._fromEntity = this._scene.querySelector(`iso-cube[entity-id="${fromId}"]`) as IsoEntity
    }

    if (toId) {
      this._toEntity = this._scene.querySelector(`iso-cube[entity-id="${toId}"]`) as IsoEntity
    }
  }

  updated(changedProperties: Map<string, unknown>) {

    if (changedProperties.has('from') || changedProperties.has('to')) {
      this._findEntities()
    }

    // 任何路径相关属性变化都需要重新计算
    const pathProps = ['from', 'to', 'route', 'perpendicularLength']
    if (pathProps.some(prop => changedProperties.has(prop))) {
      this._updatePath()
    }

    // 粒子配置变化
    if (changedProperties.has('particles')) {
      const config = this.particleConfig
      if (config.enabled) {
        this._startParticleAnimation()
      } else {
        this._stopParticleAnimation()
        this._particles = []
        this._reverseParticles = []
      }
      // 方向变化时清除现有粒子
      this._particles = []
      this._reverseParticles = []
      this._lastEmitTime = 0
      this._lastReverseEmitTime = 0
    }
  }

  /**
   * 获取面的法线对应的主轴
   */
  private _getFaceAxis(face: FaceType): RouteAxis {
    const normal = FACE_NORMALS[face]
    if (Math.abs(normal.z) > 0.5) return 'z'
    if (Math.abs(normal.y) > 0.5) return 'y'
    return 'x'
  }

  /**
   * 解析路由顺序（仅用于中间段）
   */
  private _parseRoute(route: string): RouteAxis[] {
    if (route === 'auto' || route === 'direct') {
      return ['x', 'z', 'y']
    }
    return route.split('-').filter((d): d is RouteAxis => ['x', 'z', 'y'].includes(d))
  }

  /**
   * 计算 3D 路径段
   * 
   * 路由策略：
   * 1. 如果 perpendicularLength > 0：从起点沿起点面的法线方向出发
   * 2. 中间按用户指定的轴顺序走线（自动补充缺失的轴）
   * 3. 如果 perpendicularLength > 0：沿终点面的法线方向进入终点
   */
  private _updatePath() {
    if (!this._fromEntity || !this._toEntity || !this._scene) return

    // 获取等距坐标
    const fromIso = this._fromEntity.getFaceConnectionPoint(this.fromFace, this.fromPosition)
    const toIso = this._toEntity.getFaceConnectionPoint(this.toFace, this.toPosition)

    const segments: LineSegment3D[] = []

    if (this.route === 'direct') {
      // 直线连接
      const dx = toIso.x - fromIso.x
      const dy = toIso.y - fromIso.y
      const dz = toIso.z - fromIso.z
      const length = Math.sqrt(dx * dx + dy * dy + dz * dz)

      segments.push({
        start: { ...fromIso },
        end: { ...toIso },
        length,
        axis: 'direct'
      })
    } else {
      // 获取起点和终点面的法线轴
      const fromAxis = this._getFaceAxis(this.fromFace)
      const toAxis = this._getFaceAxis(this.toFace)
      const fromNormal = FACE_NORMALS[this.fromFace]
      const toNormal = FACE_NORMALS[this.toFace]
      const perpLen = this.perpendicularLength

      // 计算延伸点（如果有垂直延伸）
      const fromExtended = perpLen > 0 ? {
        x: fromIso.x + fromNormal.x * perpLen,
        y: fromIso.y + fromNormal.y * perpLen,
        z: fromIso.z + fromNormal.z * perpLen
      } : { ...fromIso }

      const toExtended = perpLen > 0 ? {
        x: toIso.x + toNormal.x * perpLen,
        y: toIso.y + toNormal.y * perpLen,
        z: toIso.z + toNormal.z * perpLen
      } : { ...toIso }

      // 1. 起点 -> 起点延伸点（沿法线出发，仅当 perpLen > 0）
      if (perpLen > 0) {
        segments.push({
          start: { ...fromIso },
          end: { ...fromExtended },
          length: perpLen,
          axis: fromAxis
        })
      }

      // 2. 中间走线：从 fromExtended 到 toExtended
      // 获取用户指定的路由轴
      const userAxes = this._parseRoute(this.route)
      // 确保所有轴都被覆盖（补充未指定的轴）
      const allAxes: RouteAxis[] = ['x', 'z', 'y']
      const remainingAxes = allAxes.filter(a => !userAxes.includes(a))
      const routeOrder = [...userAxes, ...remainingAxes]

      const current = { ...fromExtended }

      for (const axis of routeOrder) {
        const target = toExtended[axis]
        const diff = target - current[axis]
        if (Math.abs(diff) < 0.1) continue

        const start = { ...current }
        const end = { ...current }
        end[axis] = target

        segments.push({
          start,
          end,
          length: Math.abs(diff),
          axis
        })

        current[axis] = target
      }

      // 3. 终点延伸点 -> 终点（沿法线进入，仅当 perpLen > 0）
      if (perpLen > 0) {
        segments.push({
          start: { ...toExtended },
          end: { ...toIso },
          length: perpLen,
          axis: toAxis
        })
      }
    }

    this._segments = [...segments]

    // 计算总路径长度
    this._totalPathLength = segments.reduce((sum, seg) => sum + seg.length, 0)

    this.requestUpdate()
  }

  // ========== 粒子动画相关方法 ==========

  /**
   * 启动粒子动画
   */
  private _startParticleAnimation() {
    if (this._animationFrameId !== null) return
    if (!this.particleConfig.enabled) return

    this._lastFrameTime = 0
    const animate = (timestamp: number) => {
      this._updateParticles(timestamp)
      this._animationFrameId = requestAnimationFrame(animate)
    }
    this._animationFrameId = requestAnimationFrame(animate)
  }

  /**
   * 停止粒子动画
   */
  private _stopParticleAnimation() {
    if (this._animationFrameId !== null) {
      cancelAnimationFrame(this._animationFrameId)
      this._animationFrameId = null
    }
  }

  /**
   * 更新粒子状态
   */
  private _updateParticles(timestamp: number) {
    const config = this.particleConfig
    if (!config.enabled || this._totalPathLength === 0) return

    // 计算真实的 deltaTime
    if (this._lastFrameTime === 0) {
      this._lastFrameTime = timestamp
    }
    const deltaTime = (timestamp - this._lastFrameTime) / 1000 // 转换为秒
    this._lastFrameTime = timestamp

    const emitInterval = 1000 / config.rate // 发射间隔（毫秒）

    // 正向粒子发射
    if (config.direction === 'forward' || config.direction === 'bidirectional') {
      if (timestamp - this._lastEmitTime >= emitInterval) {
        this._particles.push({
          id: this._particleIdCounter++,
          progress: 0,
          createdAt: timestamp
        })
        this._lastEmitTime = timestamp
      }
    }

    // 反向粒子发射（双向模式）
    if (config.direction === 'backward' || config.direction === 'bidirectional') {
      if (timestamp - this._lastReverseEmitTime >= emitInterval) {
        this._reverseParticles.push({
          id: this._particleIdCounter++,
          progress: 1,
          createdAt: timestamp
        })
        this._lastReverseEmitTime = timestamp
      }
    }

    // 更新正向粒子位置
    this._particles = this._particles
      .map(p => ({
        ...p,
        progress: p.progress + config.speed * deltaTime
      }))
      .filter(p => p.progress <= 1)

    // 更新反向粒子位置
    this._reverseParticles = this._reverseParticles
      .map(p => ({
        ...p,
        progress: p.progress - config.speed * deltaTime
      }))
      .filter(p => p.progress >= 0)

    this.requestUpdate()
  }

  /**
   * 根据进度（0-1）计算粒子在 3D 空间中的位置
   */
  private _getPositionAtProgress(progress: number): { x: number; y: number; z: number } {
    if (this._segments.length === 0) {
      return { x: 0, y: 0, z: 0 }
    }

    const targetDistance = progress * this._totalPathLength
    let accumulatedDistance = 0

    for (const segment of this._segments) {
      if (accumulatedDistance + segment.length >= targetDistance) {
        // 粒子在这个线段上
        const segmentProgress = (targetDistance - accumulatedDistance) / segment.length
        return {
          x: segment.start.x + (segment.end.x - segment.start.x) * segmentProgress,
          y: segment.start.y + (segment.end.y - segment.start.y) * segmentProgress,
          z: segment.start.z + (segment.end.z - segment.start.z) * segmentProgress
        }
      }
      accumulatedDistance += segment.length
    }

    // 到达终点
    const lastSegment = this._segments[this._segments.length - 1]
    return { ...lastSegment.end }
  }

  /**
   * 获取彩虹颜色（rainbow 特效）
   */
  private _getRainbowColor(progress: number): string {
    const hue = (progress * 360) % 360
    return `hsl(${hue}, 100%, 60%)`
  }

  /**
   * 渲染单个粒子
   */
  private _renderParticle(particle: Particle, isReverse: boolean = false) {
    const config = this.particleConfig
    const pos = this._getPositionAtProgress(particle.progress)
    const color = config.color || this.color
    const size = config.size
    const halfSize = size / 2

    // 根据特效类型决定颜色
    let particleColorFinal = color
    if (config.effect === 'rainbow') {
      particleColorFinal = this._getRainbowColor(particle.progress)
    }

    // 拖尾特效需要特殊处理
    if (config.effect === 'trail') {
      return this._renderTrailParticle(particle, isReverse)
    }

    const effectClass = config.effect !== 'none'
      ? `effect-${config.effect}`
      : ''

    return html`
      <div 
        class="particle ${effectClass}"
        style="
          width: ${size}px;
          height: ${size}px;
          background: ${particleColorFinal};
          margin-left: ${-halfSize}px;
          margin-top: ${-halfSize}px;
          transform: translate3d(${pos.x}px, ${pos.y}px, ${pos.z}px);
          --px: ${pos.x}px;
          --py: ${pos.y}px;
          --pz: ${pos.z}px;
          --particle-glow-color: ${particleColorFinal};
        "
      ></div>
    `
  }

  /**
   * 渲染带拖尾的粒子
   */
  private _renderTrailParticle(particle: Particle, isReverse: boolean) {
    const config = this.particleConfig
    const color = config.color || this.color
    const size = config.size
    const trailCount = config.trailLength
    const trailStep = 0.03 // 每个拖尾点的进度间隔

    const trails = []
    for (let i = 0; i <= trailCount; i++) {
      const trailProgress = isReverse
        ? Math.min(1, particle.progress + i * trailStep)
        : Math.max(0, particle.progress - i * trailStep)

      const pos = this._getPositionAtProgress(trailProgress)
      const trailSize = size * (1 - i * 0.15) // 拖尾逐渐变小
      const opacity = 1 - i * (0.8 / trailCount) // 拖尾逐渐变透明
      const halfSize = trailSize / 2

      let trailColor = color
      if (config.effect === 'rainbow') {
        trailColor = this._getRainbowColor(trailProgress)
      }

      trails.push(html`
        <div 
          class="trail-dot"
          style="
            width: ${trailSize}px;
            height: ${trailSize}px;
            background: ${trailColor};
            opacity: ${opacity};
            margin-left: ${-halfSize}px;
            margin-top: ${-halfSize}px;
            transform: translate3d(${pos.x}px, ${pos.y}px, ${pos.z}px);
            box-shadow: 0 0 ${4 * opacity}px ${trailColor};
          "
        ></div>
      `)
    }

    return html`<div class="particle-trail">${trails}</div>`
  }

  /**
   * 计算线段的 3D 变换
   * 
   * 线段默认沿 X 轴正方向绘制（从原点向右），通过旋转来改变方向
   * 在等距空间中：
   * - X 轴：rotateZ(0°) 或 rotateZ(180°)
   * - Y 轴：rotateZ(90°) 或 rotateZ(-90°)
   * - Z 轴：rotateX(-90°) 或 rotateX(90°)（绕 X 轴旋转，让线段朝上或朝下）
   */
  private _getSegmentTransform(segment: LineSegment3D): string {
    const { start, end, axis } = segment

    // 定位到起点（等距坐标）
    let transform = `translate3d(${start.x}px, ${start.y}px, ${start.z}px)`

    if (axis === 'direct') {
      // 直线：需要计算 3D 旋转
      const dx = end.x - start.x
      const dy = end.y - start.y
      const dz = end.z - start.z

      // 在 XY 平面上的角度
      const rotateZ = Math.atan2(dy, dx) * 180 / Math.PI
      // 在 XZ 平面上的角度（俯仰）
      const xyLength = Math.sqrt(dx * dx + dy * dy)
      const rotateX = Math.atan2(dz, xyLength) * 180 / Math.PI

      transform += ` rotateZ(${rotateZ}deg) rotateX(${-rotateX}deg)`
    } else if (axis === 'x') {
      // 沿 X 轴：方向取决于正负
      const dir = end.x > start.x ? 0 : 180
      transform += ` rotateZ(${dir}deg)`
    } else if (axis === 'y') {
      // 沿 Y 轴：方向取决于正负
      const dir = end.y > start.y ? 90 : -90
      transform += ` rotateZ(${dir}deg)`
    } else if (axis === 'z') {
      // 沿 Z 轴：需要绕 Y 轴旋转让线段指向 Z 轴方向
      // 在 CSS 3D 中，线段默认沿 X 轴正方向绘制
      // rotateY(-90deg) 会让 X 轴正方向旋转到 Z 轴正方向（朝向观察者）
      // 但在等距空间中，Z 轴是"高度"，正方向是"向上"
      // 由于 IsoScene 已经做了 rotateX(60deg)，所以 Z 轴正方向在视觉上是"向上"的
      const dir = end.z > start.z ? -90 : 90
      transform += ` rotateY(${dir}deg)`
    }

    return transform
  }

  private _getLineStyle(): string {
    const animConfig = this.animationConfig
    const baseStyle = `
      width: var(--line-length);
      height: ${this.width}px;
      background: ${this.color};
      margin-top: ${-this.width / 2}px;
    `

    if (this.lineStyle === 'dashed') {
      return baseStyle + `
        background: repeating-linear-gradient(
          90deg,
          ${this.color} 0px,
          ${this.color} 8px,
          transparent 8px,
          transparent 12px
        );
      `
    } else if (this.lineStyle === 'dotted') {
      return baseStyle + `
        background: repeating-linear-gradient(
          90deg,
          ${this.color} 0px,
          ${this.color} 2px,
          transparent 2px,
          transparent 6px
        );
      `
    }

    // flow 动画使用虚线背景
    if (animConfig.type === 'flow') {
      return baseStyle + `
        background: repeating-linear-gradient(
          90deg,
          ${this.color} 0px,
          ${this.color} 12px,
          transparent 12px,
          transparent 24px
        );
        background-size: 24px 100%;
      `
    }

    return baseStyle
  }

  private _getAnimationClass(): string {
    switch (this.animationConfig.type) {
      case 'flow': return 'animate-flow'
      case 'pulse': return 'animate-pulse'
      case 'glow': return 'animate-glow glow'
      default: return ''
    }
  }

  render() {
    const animConfig = this.animationConfig
    const particleConfig = this.particleConfig
    const animClass = this._getAnimationClass()
    const glowColor = animConfig.color || this.color
    const selectedClass = this.selected ? 'selected' : ''

    // 直接从实体获取连接点坐标（而不是从 segments）
    const fromIso = this._fromEntity ? this._fromEntity.getFaceConnectionPoint(this.fromFace, this.fromPosition) : null
    const toIso = this._toEntity ? this._toEntity.getFaceConnectionPoint(this.toFace, this.toPosition) : null

    return html`
      ${this._segments.map(segment => html`
        <div 
          class="line-segment"
          style="transform: ${this._getSegmentTransform(segment)};"
        >
          <div 
            class="line-inner ${animClass} ${selectedClass}"
            style="
              ${this._getLineStyle()}
              --line-length: ${segment.length}px;
              --animate-speed: ${animConfig.speed};
              --glow-color: ${glowColor};
            "
          ></div>
        </div>
      `)}
      
      <!-- 起点锚点 -->
      ${fromIso ? html`
        <div 
          class="anchor-point from-anchor"
          style="transform: translate3d(${fromIso.x}px, ${fromIso.y}px, ${fromIso.z}px);"
        ></div>
      ` : ''}
      
      <!-- 终点锚点 -->
      ${toIso ? html`
        <div 
          class="anchor-point to-anchor"
          style="transform: translate3d(${toIso.x}px, ${toIso.y}px, ${toIso.z}px);"
        ></div>
      ` : ''}

      <!-- 粒子（发光小球） -->
      ${particleConfig.enabled ? html`
        ${this._particles.map(p => this._renderParticle(p, false))}
        ${this._reverseParticles.map(p => this._renderParticle(p, true))}
      ` : ''}
    `
  }
}

// 条件注册，避免 HMR 重复定义
if (!customElements.get('iso-connector')) {
  customElements.define('iso-connector', IsoConnector)
}

declare global {
  interface HTMLElementTagNameMap {
    'iso-connector': IsoConnector
  }
}

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

/**
 * 等距连线 Web Component
 * 
 * 使用 3D 变换在等距空间中绘制连线，和实体一样由场景层统一做旋转变换
 */
export class IsoConnector extends LitElement {
  // 连接的实体 ID
  @property({ type: String }) from = ''
  @property({ type: String }) to = ''

  // 连接锚点：格式为 "face:position"，如 "top:mc"、"bottom:tl"
  @property({ type: String, attribute: 'from-anchor' })
  fromAnchor = 'top:mc'

  @property({ type: String, attribute: 'to-anchor' })
  toAnchor = 'top:mc'

  // 路由配置
  @property({ type: String }) route: string = 'auto'

  // 样式属性
  @property({ type: String }) color = '#00d4ff'
  @property({ type: Number }) width = 2
  @property({ type: String, attribute: 'line-style' }) lineStyle: 'solid' | 'dashed' | 'dotted' = 'solid'
  @property({ type: Number, attribute: 'corner-radius' }) cornerRadius = 8

  // 动效
  @property({ type: String, attribute: 'animation' }) animationType: 'none' | 'flow' | 'pulse' | 'glow' = 'none'
  @property({ type: Number, attribute: 'animate-speed' }) animateSpeed = 1
  @property({ type: String, attribute: 'animate-color' }) animateColor = ''

  // 垂直延伸距离（从连接点垂直于面向外延伸的距离）
  @property({ type: Number, attribute: 'perpendicular-length' }) perpendicularLength = 0

  // 选中状态（用于高亮，避免使用 filter 破坏 3D 变换）
  @property({ type: Boolean, reflect: true }) selected = false

  // ========== 粒子（发光小球）属性 ==========
  // 是否启用粒子
  @property({ type: Boolean, attribute: 'particles' }) particlesEnabled = false
  // 粒子颜色（默认使用连线颜色）
  @property({ type: String, attribute: 'particle-color' }) particleColor = ''
  // 粒子大小（直径，像素）
  @property({ type: Number, attribute: 'particle-size' }) particleSize = 8
  // 粒子发射频率（每秒发射数量）
  @property({ type: Number, attribute: 'particle-rate' }) particleRate = 2
  // 粒子移动速度（每秒移动的路径百分比，0.5 表示 2 秒走完全程）
  @property({ type: Number, attribute: 'particle-speed' }) particleSpeed = 0.5
  // 粒子特效
  @property({ type: String, attribute: 'particle-effect' }) particleEffect: ParticleEffect = 'glow'
  // 粒子方向：forward（从起点到终点）、backward（从终点到起点）、bidirectional（双向）
  @property({ type: String, attribute: 'particle-direction' }) particleDirection: 'forward' | 'backward' | 'bidirectional' = 'forward'
  // 拖尾长度（仅 trail 特效有效）
  @property({ type: Number, attribute: 'particle-trail-length' }) particleTrailLength = 3

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

  // 解析锚点字符串，返回 face 和 position
  private _parseAnchor(anchor: string): { face: FaceType; position: PositionType } {
    const [face, position] = anchor.split(':')
    return {
      face: (face || 'top') as FaceType,
      position: (position || 'mc') as PositionType
    }
  }

  // 获取解析后的 from 锚点
  get fromFace(): FaceType {
    return this._parseAnchor(this.fromAnchor).face
  }

  get fromPosition(): PositionType {
    return this._parseAnchor(this.fromAnchor).position
  }

  // 获取解析后的 to 锚点
  get toFace(): FaceType {
    return this._parseAnchor(this.toAnchor).face
  }

  get toPosition(): PositionType {
    return this._parseAnchor(this.toAnchor).position
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

    if (this.from) {
      this._fromEntity = this._scene.querySelector(`iso-cube[entity-id="${this.from}"]`) as IsoEntity
    }

    if (this.to) {
      this._toEntity = this._scene.querySelector(`iso-cube[entity-id="${this.to}"]`) as IsoEntity
    }
  }

  updated(changedProperties: Map<string, unknown>) {

    if (changedProperties.has('from') || changedProperties.has('to')) {
      this._findEntities()
    }

    // 任何路径相关属性变化都需要重新计算
    const pathProps = ['from', 'to', 'fromAnchor', 'toAnchor', 'route', 'cornerRadius', 'perpendicularLength']
    if (pathProps.some(prop => changedProperties.has(prop))) {
      this._updatePath()
    }

    // 粒子启用/禁用变化
    if (changedProperties.has('particlesEnabled')) {
      if (this.particlesEnabled) {
        this._startParticleAnimation()
      } else {
        this._stopParticleAnimation()
        this._particles = []
        this._reverseParticles = []
      }
    }

    // 粒子方向变化时，清除现有粒子重新开始
    if (changedProperties.has('particleDirection') && this.particlesEnabled) {
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
    if (!this.particlesEnabled) return

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
    if (!this.particlesEnabled || this._totalPathLength === 0) return

    // 计算真实的 deltaTime
    if (this._lastFrameTime === 0) {
      this._lastFrameTime = timestamp
    }
    const deltaTime = (timestamp - this._lastFrameTime) / 1000 // 转换为秒
    this._lastFrameTime = timestamp

    const emitInterval = 1000 / this.particleRate // 发射间隔（毫秒）

    // 正向粒子发射
    if (this.particleDirection === 'forward' || this.particleDirection === 'bidirectional') {
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
    if (this.particleDirection === 'backward' || this.particleDirection === 'bidirectional') {
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
        progress: p.progress + this.particleSpeed * deltaTime
      }))
      .filter(p => p.progress <= 1)

    // 更新反向粒子位置
    this._reverseParticles = this._reverseParticles
      .map(p => ({
        ...p,
        progress: p.progress - this.particleSpeed * deltaTime
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
    const pos = this._getPositionAtProgress(particle.progress)
    const color = this.particleColor || this.color
    const size = this.particleSize
    const halfSize = size / 2

    // 根据特效类型决定颜色
    let particleColorFinal = color
    if (this.particleEffect === 'rainbow') {
      particleColorFinal = this._getRainbowColor(particle.progress)
    }

    // 拖尾特效需要特殊处理
    if (this.particleEffect === 'trail') {
      return this._renderTrailParticle(particle, isReverse)
    }

    const effectClass = this.particleEffect !== 'none'
      ? `effect-${this.particleEffect}`
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
    const color = this.particleColor || this.color
    const size = this.particleSize
    const trailCount = this.particleTrailLength
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
      if (this.particleEffect === 'rainbow') {
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
    if (this.animationType === 'flow') {
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
    switch (this.animationType) {
      case 'flow': return 'animate-flow'
      case 'pulse': return 'animate-pulse'
      case 'glow': return 'animate-glow glow'
      default: return ''
    }
  }

  render() {
    const animClass = this._getAnimationClass()
    const glowColor = this.animateColor || this.color
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
              --animate-speed: ${this.animateSpeed};
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
      ${this.particlesEnabled ? html`
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



/**
 * 特效定义
 */
export interface EffectDefinition {
  /** 特效名称 */
  name: string
  /** CSS 动画关键帧 */
  keyframes: Keyframe[]
  /** 动画选项 */
  options: KeyframeAnimationOptions
}

/**
 * 特效管理器
 * 管理和注册特效
 */
export class EffectManager {
  /** 已注册的特效 */
  private effects: Map<string, EffectDefinition> = new Map()
  /** 样式表元素 */
  private styleElement: HTMLStyleElement | null = null
  /** 是否已初始化 */
  private initialized = false

  constructor() {
    this.registerPresetEffects()
  }

  /**
   * 初始化样式表
   */
  private initStyleSheet(): void {
    if (this.initialized) return

    this.styleElement = document.createElement('style')
    this.styleElement.id = 'isometric-effects-styles'
    document.head.appendChild(this.styleElement)

    // 添加预置特效的 CSS
    this.styleElement.textContent = this.generateCSS()
    this.initialized = true
  }

  /**
   * 注册预置特效
   */
  private registerPresetEffects(): void {
    // 上下抖动
    this.register('bounce', {
      name: 'bounce',
      keyframes: [
        { transform: 'translateY(0)' },
        { transform: 'translateY(calc(-10px * var(--effect-intensity, 1)))' },
        { transform: 'translateY(0)' },
      ],
      options: {
        duration: 500,
        iterations: Infinity,
        easing: 'ease-in-out',
      },
    })

    // 闪烁
    this.register('blink', {
      name: 'blink',
      keyframes: [
        { opacity: '1' },
        { opacity: '0.3' },
        { opacity: '1' },
      ],
      options: {
        duration: 800,
        iterations: Infinity,
        easing: 'ease-in-out',
      },
    })

    // 发光
    this.register('glow', {
      name: 'glow',
      keyframes: [
        { filter: 'drop-shadow(0 0 5px var(--effect-color, #00ffff))' },
        { filter: 'drop-shadow(0 0 20px var(--effect-color, #00ffff))' },
        { filter: 'drop-shadow(0 0 5px var(--effect-color, #00ffff))' },
      ],
      options: {
        duration: 1500,
        iterations: Infinity,
        easing: 'ease-in-out',
      },
    })

    // 水平抖动
    this.register('shake', {
      name: 'shake',
      keyframes: [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-5px)' },
        { transform: 'translateX(5px)' },
        { transform: 'translateX(-5px)' },
        { transform: 'translateX(5px)' },
        { transform: 'translateX(0)' },
      ],
      options: {
        duration: 500,
        iterations: Infinity,
        easing: 'ease-in-out',
      },
    })

    // 脉冲
    this.register('pulse', {
      name: 'pulse',
      keyframes: [
        { transform: 'scale(1)' },
        { transform: 'scale(1.05)' },
        { transform: 'scale(1)' },
      ],
      options: {
        duration: 1000,
        iterations: Infinity,
        easing: 'ease-in-out',
      },
    })
  }

  /**
   * 生成 CSS 样式
   */
  private generateCSS(): string {
    let css = `
      /* Isometric Engine Effects */
      :root {
        --effect-duration: 1000ms;
        --effect-intensity: 1;
        --effect-color: #00ffff;
      }

      @keyframes isometric-bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(calc(-10px * var(--effect-intensity, 1))); }
      }

      @keyframes isometric-blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }

      @keyframes isometric-glow {
        0%, 100% { filter: drop-shadow(0 0 5px var(--effect-color, #00ffff)); }
        50% { filter: drop-shadow(0 0 20px var(--effect-color, #00ffff)); }
      }

      @keyframes isometric-shake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-5px); }
        40% { transform: translateX(5px); }
        60% { transform: translateX(-5px); }
        80% { transform: translateX(5px); }
      }

      @keyframes isometric-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }

      .isometric-effect-bounce {
        animation: isometric-bounce var(--effect-duration, 500ms) ease-in-out infinite;
      }

      .isometric-effect-blink {
        animation: isometric-blink var(--effect-duration, 800ms) ease-in-out infinite;
      }

      .isometric-effect-glow {
        animation: isometric-glow var(--effect-duration, 1500ms) ease-in-out infinite;
      }

      .isometric-effect-shake {
        animation: isometric-shake var(--effect-duration, 500ms) ease-in-out infinite;
      }

      .isometric-effect-pulse {
        animation: isometric-pulse var(--effect-duration, 1000ms) ease-in-out infinite;
      }
    `

    return css
  }

  /**
   * 注册自定义特效
   */
  register(name: string, definition: EffectDefinition): this {
    this.effects.set(name, definition)
    return this
  }

  /**
   * 获取特效定义
   */
  get(name: string): EffectDefinition | undefined {
    return this.effects.get(name)
  }

  /**
   * 检查特效是否存在
   */
  has(name: string): boolean {
    return this.effects.has(name)
  }

  /**
   * 获取所有特效名称
   */
  getNames(): string[] {
    return Array.from(this.effects.keys())
  }

  /**
   * 确保样式已注入
   */
  ensureStyles(): void {
    this.initStyleSheet()
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    if (this.styleElement && this.styleElement.parentNode) {
      this.styleElement.parentNode.removeChild(this.styleElement)
    }
    this.effects.clear()
    this.initialized = false
  }
}

// 导出单例
export const effectManager = new EffectManager()

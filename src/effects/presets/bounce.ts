import type { EffectDefinition } from '../EffectManager'

/**
 * 上下抖动特效
 */
export const bounceEffect: EffectDefinition = {
  name: 'bounce',
  keyframes: [
    { transform: 'translateY(0)', offset: 0 },
    { transform: 'translateY(calc(-10px * var(--effect-intensity, 1)))', offset: 0.5 },
    { transform: 'translateY(0)', offset: 1 },
  ],
  options: {
    duration: 500,
    iterations: Infinity,
    easing: 'ease-in-out',
  },
}

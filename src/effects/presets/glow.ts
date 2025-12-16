import type { EffectDefinition } from '../EffectManager'

/**
 * 发光特效
 */
export const glowEffect: EffectDefinition = {
  name: 'glow',
  keyframes: [
    { filter: 'drop-shadow(0 0 5px var(--effect-color, #00ffff))', offset: 0 },
    { filter: 'drop-shadow(0 0 20px var(--effect-color, #00ffff))', offset: 0.5 },
    { filter: 'drop-shadow(0 0 5px var(--effect-color, #00ffff))', offset: 1 },
  ],
  options: {
    duration: 1500,
    iterations: Infinity,
    easing: 'ease-in-out',
  },
}

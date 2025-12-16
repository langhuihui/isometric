import type { EffectDefinition } from '../EffectManager'

/**
 * 闪烁特效
 */
export const blinkEffect: EffectDefinition = {
  name: 'blink',
  keyframes: [
    { opacity: '1', offset: 0 },
    { opacity: '0.3', offset: 0.5 },
    { opacity: '1', offset: 1 },
  ],
  options: {
    duration: 800,
    iterations: Infinity,
    easing: 'ease-in-out',
  },
}

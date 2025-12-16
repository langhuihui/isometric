/**
 * RGB 颜色结构
 */
export interface RGB {
  r: number
  g: number
  b: number
}

/**
 * 解析十六进制颜色字符串为 RGB
 */
export function parseHexColor(color: string): RGB {
  if (!color.startsWith('#')) {
    return { r: 255, g: 255, b: 255 }
  }

  const hex = color.slice(1)
  if (hex.length === 3) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16)
    }
  } else if (hex.length === 6) {
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16)
    }
  }

  return { r: 255, g: 255, b: 255 }
}

/**
 * RGB 转十六进制颜色字符串
 */
export function rgbToHex(rgb: RGB): string {
  const r = Math.max(0, Math.min(255, Math.round(rgb.r)))
  const g = Math.max(0, Math.min(255, Math.round(rgb.g)))
  const b = Math.max(0, Math.min(255, Math.round(rgb.b)))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * 调整颜色亮度
 * @param color 十六进制颜色
 * @param amount 调整量，正值变亮，负值变暗
 */
export function adjustBrightness(color: string, amount: number): string {
  if (!color.startsWith('#')) return color

  const rgb = parseHexColor(color)
  return rgbToHex({
    r: rgb.r + amount,
    g: rgb.g + amount,
    b: rgb.b + amount
  })
}

/**
 * 使颜色变亮
 */
export function brighten(rgb: RGB, amount: number): RGB {
  return {
    r: Math.min(255, Math.round(rgb.r + amount)),
    g: Math.min(255, Math.round(rgb.g + amount)),
    b: Math.min(255, Math.round(rgb.b + amount))
  }
}

/**
 * 使颜色变暗
 */
export function darken(rgb: RGB, amount: number): RGB {
  return {
    r: Math.max(0, Math.round(rgb.r - amount)),
    g: Math.max(0, Math.round(rgb.g - amount)),
    b: Math.max(0, Math.round(rgb.b - amount))
  }
}

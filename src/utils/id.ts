/**
 * ID 计数器存储
 */
const counters = new Map<string, number>()

/**
 * 生成唯一 ID
 * @param prefix ID 前缀
 */
export function generateId(prefix: string): string {
  const count = (counters.get(prefix) ?? 0) + 1
  counters.set(prefix, count)
  return `${prefix}-${count}`
}

/**
 * 重置指定前缀的计数器
 * @param prefix ID 前缀
 */
export function resetIdCounter(prefix: string): void {
  counters.delete(prefix)
}

/**
 * 重置所有计数器
 */
export function resetAllIdCounters(): void {
  counters.clear()
}

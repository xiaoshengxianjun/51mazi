// 生成唯一ID的工具函数
export function genId() {
  return Date.now() + '-' + Math.random().toString(36).slice(2, 10)
}

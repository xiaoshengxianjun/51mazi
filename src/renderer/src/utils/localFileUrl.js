/**
 * 将本地绝对路径转为 Chromium 可加载的 file: URL（Windows / macOS / Linux）。
 * 渲染进程构建不内联 node:url 时，用与 pathToFileURL 等价的常见路径规则。
 *
 * Windows 上禁止 `file://` + 未转义的反斜杠，否则书架封面 img 无法加载。
 */

/**
 * @param {string} absolutePath
 * @returns {string}
 */
export function pathToLocalFileUrl(absolutePath) {
  if (!absolutePath || typeof absolutePath !== 'string') return ''
  const forward = absolutePath.trim().replace(/\\/g, '/')
  if (!forward) return ''

  // Windows: D:/path/to/file
  const win = forward.match(/^([a-zA-Z]):\/?(.*)$/i)
  if (win) {
    const drive = `${win[1].toUpperCase()}:`
    const rest = (win[2] || '').replace(/^\/+/, '')
    const segs = rest
      ? rest
          .split('/')
          .filter(Boolean)
          .map((s) => encodeURIComponent(s))
      : []
    return segs.length ? `file:///${drive}/${segs.join('/')}` : `file:///${drive}/`
  }

  // Unix 绝对路径
  if (forward.startsWith('/')) {
    const segs = forward.split('/').filter(Boolean).map((s) => encodeURIComponent(s))
    return `file:///${segs.join('/')}`
  }

  return ''
}

/**
 * 将多段路径规范拼接后再转 file URL
 * @param  {...string} segments
 * @returns {string}
 */
export function joinedPathToFileUrl(...segments) {
  const chunks = []
  for (const s of segments) {
    if (s == null || String(s).trim() === '') continue
    chunks.push(String(s).replace(/\\/g, '/'))
  }
  const combined = chunks.join('/').replace(/\/+/g, '/')
  return pathToLocalFileUrl(combined)
}

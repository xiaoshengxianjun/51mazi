/**
 * 解析禁词文本。
 * 分隔符：逗号（中英文）、分号（中英文）、顿号、空格/空白、中横线（- – —）、下划线、换行。
 * 结果已 trim，去空，并按首次出现顺序去重。
 */
export function parseBannedWordsText(text) {
  const parts = text.split(/[,;，；、_\s\-–—−]+/)
  const seen = new Set()
  const result = []
  for (const part of parts) {
    const word = part.trim()
    if (!word || seen.has(word)) continue
    seen.add(word)
    result.push(word)
  }
  return result
}

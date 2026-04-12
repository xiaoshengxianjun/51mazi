/**
 * AI 封面抽屉：按书籍隔离的表单历史（electron-store）
 * 每本书使用独立列表，避免多本书共用一份记录。
 */

const STORAGE_PREFIX = 'aiCover.formHistoryByBook.'
const MAX_ITEMS = 20

/** 将书籍标识编码为安全的 store 键片段（UTF-8 书名/目录名） */
function encodeBookKeySegment(bookKey) {
  const s = String(bookKey || '').trim()
  if (!s) return '_empty'
  try {
    return btoa(unescape(encodeURIComponent(s)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
      .slice(0, 120)
  } catch {
    return '_invalid'
  }
}

function storageKey(bookKey) {
  return `${STORAGE_PREFIX}${encodeBookKeySegment(bookKey)}`
}

function fingerprint(entry) {
  return JSON.stringify({
    penName: entry.penName,
    coverSize: entry.coverSize,
    backgroundPrompt: entry.backgroundPrompt,
    titlePrompt: entry.titlePrompt,
    authorPrompt: entry.authorPrompt,
    negativePrompt: entry.negativePrompt,
    selectedPromptTags: entry.selectedPromptTags,
    imageProviderId: entry.imageProviderId
  })
}

/**
 * @param {string} bookKey 书籍隔离键（与落盘目录一致，如 originalName 或书名）
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function loadAiCoverFormHistory(bookKey) {
  const key = storageKey(bookKey)
  try {
    const raw = await window.electronStore.get(key)
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

/**
 * @param {string} bookKey
 * @returns {Promise<Record<string, unknown>|null>}
 */
export async function getLatestAiCoverFormSnapshot(bookKey) {
  const list = await loadAiCoverFormHistory(bookKey)
  return list.length > 0 ? list[0] : null
}

/**
 * @param {string} bookKey
 * @param {Record<string, unknown>} entry
 */
export async function pushAiCoverFormHistory(bookKey, entry) {
  const key = storageKey(bookKey)
  const list = await loadAiCoverFormHistory(bookKey)
  const createdAt = entry.createdAt || new Date().toISOString()
  const row = { ...entry, createdAt }
  const fp = fingerprint(row)
  const last = list[0]
  if (last && fingerprint(last) === fp) {
    list[0] = row
  } else {
    list.unshift(row)
  }
  while (list.length > MAX_ITEMS) {
    list.pop()
  }
  await window.electronStore.set(key, list)
}

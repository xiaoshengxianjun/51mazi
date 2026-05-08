const OUTLINE_DISPLAY_MODE_KEY_PREFIX = 'outlineDisplayMode_'
const OUTLINE_DISPLAY_MODE_LARGE = 'large'
const OUTLINE_DISPLAY_MODE_COMPACT = 'compact'

function normalizeBookName(bookName) {
  return String(bookName || '').trim()
}

function getOutlineDisplayModeStorageKey(bookName) {
  const normalizedBookName = normalizeBookName(bookName)
  return `${OUTLINE_DISPLAY_MODE_KEY_PREFIX}${normalizedBookName}`
}

function normalizeOutlineDisplayMode(mode) {
  return mode === OUTLINE_DISPLAY_MODE_COMPACT
    ? OUTLINE_DISPLAY_MODE_COMPACT
    : OUTLINE_DISPLAY_MODE_LARGE
}

export async function getOutlineDisplayMode(bookName) {
  const normalizedBookName = normalizeBookName(bookName)
  if (!normalizedBookName || !window.electronStore?.get) {
    return OUTLINE_DISPLAY_MODE_LARGE
  }
  try {
    const value = await window.electronStore.get(getOutlineDisplayModeStorageKey(normalizedBookName))
    return normalizeOutlineDisplayMode(value)
  } catch (error) {
    console.error('读取大纲显示模式失败:', error)
    return OUTLINE_DISPLAY_MODE_LARGE
  }
}

export async function setOutlineDisplayMode(bookName, mode) {
  const normalizedBookName = normalizeBookName(bookName)
  if (!normalizedBookName || !window.electronStore?.set) {
    return
  }
  try {
    await window.electronStore.set(
      getOutlineDisplayModeStorageKey(normalizedBookName),
      normalizeOutlineDisplayMode(mode)
    )
  } catch (error) {
    console.error('保存大纲显示模式失败:', error)
  }
}

export function isOutlineCompactMode(mode) {
  return normalizeOutlineDisplayMode(mode) === OUTLINE_DISPLAY_MODE_COMPACT
}

export { OUTLINE_DISPLAY_MODE_COMPACT, OUTLINE_DISPLAY_MODE_LARGE }

/**
 * 段落锚点滚动同步工具。
 * 用「首个可见段落 index + 相对偏移」对齐不同布局的滚动容器，避免 70vh 留白导致比例失真。
 */

/**
 * @typedef {{ index: number, offset: number }} ScrollAnchor
 */

/**
 * 获取滚动容器内首个可见段落锚点
 * @param {HTMLElement | null | undefined} scroller
 * @param {string} [paragraphSelector='p']
 * @returns {ScrollAnchor}
 */
export function getScrollAnchor(scroller, paragraphSelector = 'p') {
  if (!scroller) return { index: 0, offset: 0 }
  const paras = scroller.querySelectorAll(paragraphSelector)
  if (!paras.length) return { index: 0, offset: 0 }

  const scrollerTop = scroller.getBoundingClientRect().top
  const threshold = 8
  for (let i = 0; i < paras.length; i++) {
    const rect = paras[i].getBoundingClientRect()
    if (rect.bottom > scrollerTop + threshold) {
      return { index: i, offset: scrollerTop - rect.top }
    }
  }
  return { index: paras.length - 1, offset: 0 }
}

/**
 * 将滚动容器滚到指定段落锚点
 * @param {HTMLElement | null | undefined} scroller
 * @param {ScrollAnchor} anchor
 * @param {string} [paragraphSelector='p']
 */
export function scrollToAnchor(scroller, anchor, paragraphSelector = 'p') {
  if (!scroller || !anchor) return
  const paras = scroller.querySelectorAll(paragraphSelector)
  if (!paras.length) return

  const index = Math.max(0, Math.min(anchor.index, paras.length - 1))
  const target = paras[index]
  const scrollerTop = scroller.getBoundingClientRect().top
  const targetTop = target.getBoundingClientRect().top
  scroller.scrollTop += targetTop - scrollerTop + (anchor.offset || 0)
}

/**
 * 从 TipTap editor 解析章节编辑器滚动容器（.editor-content，而非 .tiptap）
 * @param {{ view?: { dom?: HTMLElement } } | null | undefined} editor
 * @returns {HTMLElement | null}
 */
export function getEditorScrollContainer(editor) {
  const dom = editor?.view?.dom
  if (!dom) return null
  return (
    dom.closest('.editor-content') ||
    dom.closest('[data-editor-scroll]') ||
    /** @type {HTMLElement | null} */ (dom.parentElement)
  )
}

export const PHONE_PREVIEW_SYNC_SCROLL_KEY = 'phone-preview-sync-scroll'

export function loadPhonePreviewSyncScroll() {
  try {
    return localStorage.getItem(PHONE_PREVIEW_SYNC_SCROLL_KEY) === '1'
  } catch {
    return false
  }
}

export function savePhonePreviewSyncScroll(enabled) {
  try {
    localStorage.setItem(PHONE_PREVIEW_SYNC_SCROLL_KEY, enabled ? '1' : '0')
  } catch {
    // ignore quota / private mode
  }
}

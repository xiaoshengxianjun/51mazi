/**
 * 小说下载相关接口（封装主进程 novel:* IPC）
 */

/**
 * 获取可用书源列表
 * @returns {Promise<Array<{ id: string, name: string }>>}
 */
export async function getNovelSources() {
  return window.electron.novelGetSources()
}

/**
 * 按关键词搜索书籍
 * @param {string} keyword 书名或作者
 * @param {string} [sourceId] 书源 ID
 * @returns {Promise<{ success: boolean, list?: Array, message?: string }>}
 */
export async function searchNovel(keyword, sourceId) {
  return window.electron.novelSearch({ keyword, sourceId })
}

/**
 * 获取书籍目录（章节列表）
 * @param {string} bookUrl 书籍页 URL
 * @param {string} sourceId 书源 ID
 * @returns {Promise<{ success: boolean, chapters?: Array<{ title: string, url: string }>, message?: string }>}
 */
export async function getNovelChapterList(bookUrl, sourceId) {
  return window.electron.novelGetChapterList({ bookUrl, sourceId })
}

/**
 * 批量下载章节正文（主进程会发送 novel-download-progress 事件）
 * 传入前转为纯对象数组，避免 Vue Proxy 导致 IPC structured clone 报错
 * @param {Array<{ title: string, url: string }>} chapterList 章节列表
 * @param {string} sourceId 书源 ID
 * @returns {Promise<{ success: boolean, chapters?: Array<{ title: string, content: string }>, message?: string }>}
 */
export async function downloadNovelChapters(chapterList, sourceId) {
  const plainList = (chapterList || []).map((c) => ({ title: String(c.title), url: String(c.url) }))
  return window.electron.novelDownloadChapters({ chapterList: plainList, sourceId })
}

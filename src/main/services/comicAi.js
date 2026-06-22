/**
 * AI 漫画分镜落盘与单格出图辅助（主进程）
 */
import fs from 'fs'
import { join } from 'path'
import dayjs from 'dayjs'

export const COMIC_PANELS_DIR = 'comic_panels'

/** 文件名安全化 */
export function sanitizeFileSegment(name) {
  return String(name || '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim()
    .slice(0, 80) || 'chapter'
}

/**
 * 初始化漫画批次目录并写入 storyboard.json
 * @param {string} bookPath
 * @param {string} chapterTitle
 * @param {unknown} storyboard
 * @returns {string} batchDir 绝对路径
 */
export function initComicBatch(bookPath, chapterTitle, storyboard) {
  if (!bookPath || !fs.existsSync(bookPath)) {
    throw new Error('书籍目录无效')
  }
  const safeTitle = sanitizeFileSegment(chapterTitle)
  const stamp = dayjs().format('YYYYMMDD_HHmmss')
  const batchName = `${safeTitle}_${stamp}`
  const root = join(bookPath, COMIC_PANELS_DIR)
  const batchDir = join(root, batchName)
  fs.mkdirSync(batchDir, { recursive: true })
  fs.writeFileSync(join(batchDir, 'storyboard.json'), JSON.stringify(storyboard, null, 2), 'utf-8')
  return batchDir
}

/**
 * @param {string} batchDir
 * @param {number} panelIndex 1-based
 * @param {Buffer} buf
 * @returns {string} localPath
 */
export function writeComicPanelImage(batchDir, panelIndex, buf) {
  if (!batchDir || !fs.existsSync(batchDir)) {
    throw new Error('漫画批次目录无效')
  }
  const idx = Math.max(1, Math.floor(Number(panelIndex) || 1))
  const fileName = `panel_${String(idx).padStart(2, '0')}.png`
  const imagePath = join(batchDir, fileName)
  fs.writeFileSync(imagePath, buf)
  return imagePath
}

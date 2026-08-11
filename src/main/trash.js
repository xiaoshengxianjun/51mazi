import { join } from 'path'
import fs from 'fs'
import { randomUUID } from 'crypto'

const TRASH_DIR_NAME = '回收站'
const ITEMS_DIR = 'items'

function getTrashRoot(bookPath) {
  return join(bookPath, TRASH_DIR_NAME)
}

function ensureTrashDir(bookPath) {
  const root = getTrashRoot(bookPath)
  const itemsPath = join(root, ITEMS_DIR)
  if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true })
  if (!fs.existsSync(itemsPath)) fs.mkdirSync(itemsPath, { recursive: true })
  return root
}

function readTrashIndex(bookPath) {
  const indexPath = join(getTrashRoot(bookPath), 'trash.json')
  if (!fs.existsSync(indexPath)) return { items: [] }
  try {
    const parsed = JSON.parse(fs.readFileSync(indexPath, 'utf-8'))
    return { items: Array.isArray(parsed.items) ? parsed.items : [] }
  } catch {
    return { items: [] }
  }
}

function writeTrashIndex(bookPath, index) {
  ensureTrashDir(bookPath)
  const indexPath = join(getTrashRoot(bookPath), 'trash.json')
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8')
}

function addTrashItem(bookPath, itemMeta) {
  const index = readTrashIndex(bookPath)
  index.items.unshift(itemMeta)
  writeTrashIndex(bookPath, index)
}

function removeTrashItemFromIndex(bookPath, id) {
  const index = readTrashIndex(bookPath)
  index.items = index.items.filter((item) => item.id !== id)
  writeTrashIndex(bookPath, index)
}

/** 与主进程章节字数统计一致：排除空白字符 */
function countContentWords(content, isNote = false) {
  if (!content) return 0
  let text = content
  if (isNote && /<[a-z][\s\S]*>/i.test(content)) {
    text = content
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
  }
  return text.replace(/[\s\n\r\t]/g, '').length
}

function countFileWords(filePath, isNote = false) {
  if (!fs.existsSync(filePath)) return 0
  const content = fs.readFileSync(filePath, 'utf-8')
  return countContentWords(content, isNote)
}

function countDirectoryWords(dirPath, isNote = false) {
  if (!fs.existsSync(dirPath)) return 0
  let total = 0
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = join(dirPath, entry.name)
    if (entry.isDirectory()) {
      total += countDirectoryWords(fullPath, isNote)
    } else if (entry.isFile() && entry.name.endsWith('.txt')) {
      total += countFileWords(fullPath, isNote)
    }
  }
  return total
}

function countTrashItemWords(bookPath, meta) {
  const dataDir = join(getTrashRoot(bookPath), ITEMS_DIR, meta.id, 'data')
  switch (meta.type) {
    case 'chapter':
      return countFileWords(join(dataDir, `${meta.name}.txt`), false)
    case 'volume':
      return countDirectoryWords(join(dataDir, meta.name), false)
    case 'notebook':
      return countDirectoryWords(join(dataDir, meta.name), true)
    case 'note':
      return countFileWords(join(dataDir, `${meta.name}.txt`), true)
    default:
      return 0
  }
}

function copyRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

function movePathToTrash(bookPath, meta, srcPath, isDirectory) {
  if (!fs.existsSync(srcPath)) {
    return { success: false, message: '源文件不存在' }
  }

  ensureTrashDir(bookPath)
  const id = randomUUID()
  const itemDir = join(getTrashRoot(bookPath), ITEMS_DIR, id)
  const dataDir = join(itemDir, 'data')
  fs.mkdirSync(dataDir, { recursive: true })

  if (isDirectory) {
    const destFolder = join(dataDir, meta.name)
    copyRecursive(srcPath, destFolder)
    fs.rmSync(srcPath, { recursive: true, force: true })
  } else {
    const destFile = join(dataDir, `${meta.name}.txt`)
    fs.copyFileSync(srcPath, destFile)
    fs.rmSync(srcPath)
  }

  const fullMeta = {
    id,
    type: meta.type,
    name: meta.name,
    volume: meta.volume || null,
    notebook: meta.notebook || null,
    deletedAt: new Date().toISOString(),
    wordCount: 0
  }
  fullMeta.wordCount = countTrashItemWords(bookPath, fullMeta)
  fs.writeFileSync(join(itemDir, 'meta.json'), JSON.stringify(fullMeta, null, 2), 'utf-8')
  addTrashItem(bookPath, fullMeta)
  return { success: true, id }
}

export function loadTrashItems(bookPath) {
  if (!bookPath || !fs.existsSync(bookPath)) return []
  const index = readTrashIndex(bookPath)
  const validItems = []
  for (const item of index.items) {
    const itemDir = join(getTrashRoot(bookPath), ITEMS_DIR, item.id)
    if (fs.existsSync(join(itemDir, 'meta.json'))) {
      const wordCount =
        Number.isFinite(item.wordCount) && item.wordCount >= 0
          ? item.wordCount
          : countTrashItemWords(bookPath, item)
      validItems.push({ ...item, wordCount })
    }
  }
  if (validItems.length !== index.items.length) {
    writeTrashIndex(bookPath, { items: validItems })
  }
  return validItems
}

export function moveChapterToTrash(bookPath, volume, chapter) {
  const srcPath = join(bookPath, '正文', volume, `${chapter}.txt`)
  return movePathToTrash(
    bookPath,
    { type: 'chapter', name: chapter, volume },
    srcPath,
    false
  )
}

export function moveVolumeToTrash(bookPath, volume) {
  const srcPath = join(bookPath, '正文', volume)
  return movePathToTrash(bookPath, { type: 'volume', name: volume }, srcPath, true)
}

export function moveNotebookToTrash(bookPath, notebookName) {
  const srcPath = join(bookPath, '笔记', notebookName)
  return movePathToTrash(
    bookPath,
    { type: 'notebook', name: notebookName },
    srcPath,
    true
  )
}

export function moveNoteToTrash(bookPath, notebookName, noteName) {
  const srcPath = join(bookPath, '笔记', notebookName, `${noteName}.txt`)
  return movePathToTrash(
    bookPath,
    { type: 'note', name: noteName, notebook: notebookName },
    srcPath,
    false
  )
}

function getRestoreTarget(bookPath, meta, restoreName) {
  switch (meta.type) {
    case 'chapter':
      return join(bookPath, '正文', meta.volume, `${restoreName}.txt`)
    case 'volume':
      return join(bookPath, '正文', restoreName)
    case 'notebook':
      return join(bookPath, '笔记', restoreName)
    case 'note':
      return join(bookPath, '笔记', meta.notebook, `${restoreName}.txt`)
    default:
      return null
  }
}

function getTrashDataSource(bookPath, meta) {
  const dataDir = join(getTrashRoot(bookPath), ITEMS_DIR, meta.id, 'data')
  switch (meta.type) {
    case 'chapter':
    case 'note':
      return join(dataDir, `${meta.name}.txt`)
    case 'volume':
    case 'notebook':
      return join(dataDir, meta.name)
    default:
      return null
  }
}

function ensureParentDir(targetPath) {
  const parent = join(targetPath, '..')
  if (!fs.existsSync(parent)) {
    fs.mkdirSync(parent, { recursive: true })
  }
}

function restoreDataToTarget(meta, srcData, targetPath) {
  ensureParentDir(targetPath)
  if (meta.type === 'chapter' || meta.type === 'note') {
    fs.copyFileSync(srcData, targetPath)
    return
  }
  copyRecursive(srcData, targetPath)
}

export function restoreTrashItem(bookPath, id, options = {}) {
  const { conflictStrategy, newName } = options
  const itemDir = join(getTrashRoot(bookPath), ITEMS_DIR, id)
  const metaPath = join(itemDir, 'meta.json')

  if (!fs.existsSync(metaPath)) {
    return { success: false, message: '回收站项目不存在' }
  }

  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
  const restoreName = (newName || meta.name || '').trim()
  if (!restoreName) {
    return { success: false, message: '恢复名称无效' }
  }

  const targetPath = getRestoreTarget(bookPath, meta, restoreName)
  const srcData = getTrashDataSource(bookPath, meta)

  if (!targetPath || !srcData || !fs.existsSync(srcData)) {
    return { success: false, message: '回收站数据损坏' }
  }

  if (meta.type === 'chapter') {
    const volumePath = join(bookPath, '正文', meta.volume)
    if (!fs.existsSync(volumePath)) {
      return { success: false, message: '原卷不存在，请先恢复卷或创建卷' }
    }
  }

  if (meta.type === 'note') {
    const notebookPath = join(bookPath, '笔记', meta.notebook)
    if (!fs.existsSync(notebookPath)) {
      return { success: false, message: '原笔记本不存在，请先恢复笔记本或创建笔记本' }
    }
  }

  const exists = fs.existsSync(targetPath)
  if (exists && !conflictStrategy) {
    return {
      success: false,
      conflict: true,
      type: meta.type,
      name: meta.name,
      volume: meta.volume,
      notebook: meta.notebook
    }
  }

  if (exists && conflictStrategy === 'overwrite') {
    if (meta.type === 'chapter' || meta.type === 'note') {
      fs.rmSync(targetPath)
    } else {
      fs.rmSync(targetPath, { recursive: true, force: true })
    }
  }

  try {
    restoreDataToTarget(meta, srcData, targetPath)
    fs.rmSync(itemDir, { recursive: true, force: true })
    removeTrashItemFromIndex(bookPath, id)
    return {
      success: true,
      type: meta.type,
      restoredName: restoreName,
      volume: meta.volume,
      notebook: meta.notebook
    }
  } catch (error) {
    return { success: false, message: error.message || '恢复失败' }
  }
}

export function permanentlyDeleteTrashItem(bookPath, id) {
  const itemDir = join(getTrashRoot(bookPath), ITEMS_DIR, id)
  if (!fs.existsSync(itemDir)) {
    return { success: false, message: '回收站项目不存在' }
  }
  fs.rmSync(itemDir, { recursive: true, force: true })
  removeTrashItemFromIndex(bookPath, id)
  return { success: true }
}

export function clearTrash(bookPath) {
  const root = getTrashRoot(bookPath)
  if (!fs.existsSync(root)) {
    return { success: true }
  }
  const itemsPath = join(root, ITEMS_DIR)
  if (fs.existsSync(itemsPath)) {
    fs.rmSync(itemsPath, { recursive: true, force: true })
  }
  fs.mkdirSync(itemsPath, { recursive: true })
  writeTrashIndex(bookPath, { items: [] })
  return { success: true }
}

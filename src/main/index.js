import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import Store from 'electron-store'

// 创建 store 实例
const store = new Store({
  // 可以设置加密
  // encryptionKey: 'your-encryption-key',

  // 设置默认值
  defaults: {
    config: {
      theme: 'light',
      booksDir: ''
      // 其他默认配置...
    }
  }
})

ipcMain.handle('store:get', async (_, key) => {
  return store.get(key)
})

ipcMain.handle('store:set', async (_, key, value) => {
  store.set(key, value)
  return true
})

ipcMain.handle('store:delete', async (_, key) => {
  store.delete(key)
  return true
})

// 维护已打开书籍编辑窗口的映射
const bookEditorWindows = new Map()

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    title: '51码字',
    width: 1000,
    height: 800,
    minWidth: 1000,
    minHeight: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// 选择书籍目录
ipcMain.handle('select-books-dir', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  return result
})

// 创建书籍
ipcMain.handle('create-book', async (event, bookInfo) => {
  // 1. 处理文件夹名合法性
  const safeName = bookInfo.name.replace(/[\\/:*?"<>|]/g, '_')
  const booksDir = store.get('booksDir')
  const bookPath = join(booksDir, safeName)
  if (!fs.existsSync(bookPath)) {
    fs.mkdirSync(bookPath)
  }
  // 2. 写入 mazi.json
  const meta = {
    ...bookInfo,
    createdAt: new Date().toLocaleString(),
    updatedAt: new Date().toLocaleString()
  }
  fs.writeFileSync(join(bookPath, 'mazi.json'), JSON.stringify(meta, null, 2), 'utf-8')

  // 3. 创建正文和笔记文件夹
  const textPath = join(bookPath, '正文')
  fs.mkdirSync(textPath, { recursive: true })
  const notesPath = join(bookPath, '笔记')
  fs.mkdirSync(notesPath, { recursive: true })

  // 4. 默认创建一个正文卷
  fs.mkdirSync(join(textPath, '正文'), { recursive: true })
  // 5. 在笔记文件夹中创建大纲、设定、人物三个默认笔记本文件夹
  fs.mkdirSync(join(notesPath, '大纲'), { recursive: true })
  fs.mkdirSync(join(notesPath, '设定'), { recursive: true })
  fs.mkdirSync(join(notesPath, '人物'), { recursive: true })

  return true
})

// 读取书籍目录
ipcMain.handle('read-books-dir', async () => {
  const books = []
  const booksDir = store.get('booksDir')
  if (!fs.existsSync(booksDir)) return books
  const files = fs.readdirSync(booksDir, { withFileTypes: true })
  for (const file of files) {
    if (file.isDirectory()) {
      const metaPath = join(booksDir, file.name, 'mazi.json')
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
          books.push({ ...meta })
        } catch (e) {
          // ignore parse error
          console.error('read-books-dir', e)
        }
      }
    }
  }
  return books
})

// 删除书籍
ipcMain.handle('delete-book', async (event, { name }) => {
  const booksDir = store.get('booksDir')
  const bookPath = join(booksDir, name)
  if (fs.existsSync(bookPath)) {
    fs.rmSync(bookPath, { recursive: true })
    return true
  }
  return false
})

// 编辑书籍
ipcMain.handle('edit-book', async (event, bookInfo) => {
  const booksDir = store.get('booksDir')
  const bookPath = join(booksDir, bookInfo.name)
  if (fs.existsSync(bookPath)) {
    const metaPath = join(bookPath, 'mazi.json')
    // 读取现有元数据
    const existingMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
    // 合并新旧数据，保留原有数据
    const mergedMeta = { ...existingMeta, ...bookInfo }
    fs.writeFileSync(metaPath, JSON.stringify(mergedMeta, null, 2), 'utf-8')
    return true
  }
  return false
})

// 打开书籍编辑窗口
ipcMain.handle('open-book-editor-window', async (event, { id, name }) => {
  if (bookEditorWindows.has(id)) {
    // 已有窗口，聚焦
    const win = bookEditorWindows.get(id)
    if (win && !win.isDestroyed()) {
      win.focus()
      return true
    }
  }
  // 新建窗口
  const editorWindow = new BrowserWindow({
    title: `${name} - 51码字`,
    width: 1000,
    height: 800,
    minWidth: 1000,
    minHeight: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      additionalArguments: [`bookId=${id}`, `bookName=${encodeURIComponent(name)}`]
    }
  })
  bookEditorWindows.set(id, editorWindow)
  editorWindow.on('ready-to-show', () => {
    editorWindow.show()
  })
  editorWindow.on('closed', () => {
    bookEditorWindows.delete(id)
  })
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    // 直接跳转到编辑页
    editorWindow.loadURL(
      `${process.env['ELECTRON_RENDERER_URL']}#/editor?name=${encodeURIComponent(name)}`
    )
  } else {
    editorWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: `/editor?name=${encodeURIComponent(name)}`
    })
  }
  return true
})

// 创建卷
ipcMain.handle('create-volume', async (event, bookName) => {
  const booksDir = store.get('booksDir')
  const bookPath = join(booksDir, bookName)
  const volumePath = join(bookPath, '正文')
  if (!fs.existsSync(volumePath)) {
    fs.mkdirSync(volumePath, { recursive: true })
  }
  let volumeName = '新加卷'
  let index = 1
  while (fs.existsSync(join(volumePath, volumeName))) {
    volumeName = `新加卷${index}`
    index++
  }
  fs.mkdirSync(join(volumePath, volumeName))
  return { success: true }
})

// 创建章节
ipcMain.handle('create-chapter', async (event, { bookName, volumeId }) => {
  const booksDir = store.get('booksDir')
  const bookPath = join(booksDir, bookName)
  const volumePath = join(bookPath, '正文', volumeId)
  if (!fs.existsSync(volumePath)) {
    fs.mkdirSync(volumePath, { recursive: true })
  }

  // 获取当前卷下的所有章节文件
  const files = fs.readdirSync(volumePath, { withFileTypes: true })
  const chapters = files.filter((file) => file.isFile() && file.name.endsWith('.txt'))

  // 计算新的章节序号
  const nextChapterNumber = chapters.length + 1
  const chapterName = `第${nextChapterNumber}章`

  fs.writeFileSync(join(volumePath, `${chapterName}.txt`), '')
  return { success: true }
})

// 加载章节数据
ipcMain.handle('load-chapters', async (event, bookName) => {
  const booksDir = store.get('booksDir')
  const bookPath = join(booksDir, bookName)
  const volumePath = join(bookPath, '正文')
  if (!fs.existsSync(volumePath)) {
    return []
  }
  const volumes = fs.readdirSync(volumePath, { withFileTypes: true })
  const chapters = []
  for (const volume of volumes) {
    if (volume.isDirectory()) {
      const volumeName = volume.name
      const volumePath = join(bookPath, '正文', volumeName)
      const files = fs.readdirSync(volumePath, { withFileTypes: true })
      const volumeChapters = []
      for (const file of files) {
        if (file.isFile() && file.name.endsWith('.txt')) {
          volumeChapters.push({
            id: file.name,
            name: file.name.replace('.txt', ''),
            type: 'chapter',
            path: join(bookPath, '正文', volumeName, file.name) // 唯一
          })
        }
      }
      chapters.push({
        id: volumeName,
        name: volumeName,
        type: 'volume',
        path: join(bookPath, '正文', volumeName), // 唯一
        children: volumeChapters
      })
    }
  }
  return chapters
})

// 编辑节点
ipcMain.handle('edit-node', async (event, { bookName, type, volume, chapter, newName }) => {
  try {
    const booksDir = store.get('booksDir')
    if (type === 'volume') {
      // 卷重命名
      const volumePath = join(booksDir, bookName, '正文', volume)
      const newVolumePath = join(booksDir, bookName, '正文', newName)
      if (fs.existsSync(newVolumePath)) {
        return { success: false, message: '新卷名已存在' }
      }
      fs.renameSync(volumePath, newVolumePath)
      return { success: true }
    } else if (type === 'chapter') {
      // 章节重命名
      const chapterPath = join(booksDir, bookName, '正文', volume, `${chapter}.txt`)
      const newChapterPath = join(booksDir, bookName, '正文', volume, `${newName}.txt`)
      if (fs.existsSync(newChapterPath)) {
        return { success: false, message: '新章节名已存在' }
      }
      fs.renameSync(chapterPath, newChapterPath)
      return { success: true }
    }
    return { success: false, message: '类型错误' }
  } catch (error) {
    console.error('编辑节点失败:', error)
    return { success: false, message: error.message }
  }
})

// 删除节点
ipcMain.handle('delete-node', async (event, { bookName, type, volume, chapter }) => {
  const booksDir = store.get('booksDir')
  if (type === 'volume') {
    const volumePath = join(booksDir, bookName, '正文', volume)
    // 删除整个卷文件夹
    if (!fs.existsSync(volumePath)) return { success: false, message: '卷不存在' }
    fs.rmSync(volumePath, { recursive: true, force: true })
    return { success: true }
  } else if (type === 'chapter') {
    const chapterPath = join(booksDir, bookName, '正文', volume, `${chapter}.txt`)
    if (!fs.existsSync(chapterPath)) return { success: false, message: '章节不存在' }
    fs.rmSync(chapterPath)
    return { success: true }
  }
  return { success: false, message: '类型错误' }
})

ipcMain.handle('get-sort-order', (event, bookName) => {
  return store.get(`sortOrder:${bookName}`) || 'asc'
})

ipcMain.handle('set-sort-order', (event, { bookName, order }) => {
  store.set(`sortOrder:${bookName}`, order)
  return true
})

// 加载笔记数据
ipcMain.handle('load-notes', async (event, bookName) => {
  const booksDir = store.get('booksDir')
  const bookPath = join(booksDir, bookName)
  const notesPath = join(bookPath, '笔记')
  if (!fs.existsSync(notesPath)) {
    return []
  }
  // 递归读取笔记目录
  function readNotesDir(dir, isRoot = false) {
    const items = fs.readdirSync(dir, { withFileTypes: true })
    return items
      .filter((item) => {
        if (isRoot) return item.isDirectory() // 根层只返回文件夹（笔记本）
        if (item.isDirectory()) return true
        // 只返回 .txt 文件作为笔记
        return item.isFile() && item.name.endsWith('.txt')
      })
      .map((item) => {
        if (item.isDirectory()) {
          return {
            id: item.name,
            name: item.name,
            type: 'folder',
            path: join(dir, item.name), // 唯一
            children: readNotesDir(join(dir, item.name))
          }
        } else {
          return {
            id: item.name,
            name: item.name.replace(/\.txt$/, ''),
            type: 'note',
            path: join(dir, item.name) // 唯一
          }
        }
      })
  }
  return readNotesDir(notesPath, true)
})

// 创建笔记本
ipcMain.handle('create-notebook', async (event, { bookName }) => {
  const booksDir = store.get('booksDir')
  const notesPath = join(booksDir, bookName, '笔记')
  let baseName = '新建笔记本'
  let notebookName = baseName
  let index = 1
  while (fs.existsSync(join(notesPath, notebookName))) {
    notebookName = `${baseName}${index}`
    index++
  }
  fs.mkdirSync(join(notesPath, notebookName))
  return { success: true, notebookName }
})

// 删除笔记本
ipcMain.handle('delete-notebook', async (event, { bookName, notebookName }) => {
  const booksDir = store.get('booksDir')
  const notebookPath = join(booksDir, bookName, '笔记', notebookName)
  if (!fs.existsSync(notebookPath)) {
    return { success: false, message: '笔记本不存在' }
  }
  fs.rmSync(notebookPath, { recursive: true, force: true })
  return { success: true }
})

// 重命名笔记本
ipcMain.handle('rename-notebook', async (event, { bookName, oldName, newName }) => {
  const booksDir = store.get('booksDir')
  const notesPath = join(booksDir, bookName, '笔记')
  const oldPath = join(notesPath, oldName)
  const newPath = join(notesPath, newName)
  if (!fs.existsSync(oldPath)) {
    return { success: false, message: '原笔记本不存在' }
  }
  if (fs.existsSync(newPath)) {
    return { success: false, message: '新笔记本名已存在' }
  }
  fs.renameSync(oldPath, newPath)
  return { success: true }
})

// 创建笔记
ipcMain.handle('create-note', async (event, { bookName, notebookName, noteName }) => {
  const booksDir = store.get('booksDir')
  const notebookPath = join(booksDir, bookName, '笔记', notebookName)
  if (!fs.existsSync(notebookPath)) {
    return { success: false, message: '笔记本不存在' }
  }
  let baseName = noteName || '新建笔记'
  let fileName = `${baseName}.txt`
  let index = 1
  while (fs.existsSync(join(notebookPath, fileName))) {
    fileName = `${baseName}${index}.txt`
    index++
  }
  fs.writeFileSync(join(notebookPath, fileName), '')
  return { success: true }
})

// 删除笔记
ipcMain.handle('delete-note', async (event, { bookName, notebookName, noteName }) => {
  const booksDir = store.get('booksDir')
  const notePath = join(booksDir, bookName, '笔记', notebookName, `${noteName}.txt`)
  if (!fs.existsSync(notePath)) {
    return { success: false, message: '笔记不存在' }
  }
  fs.rmSync(notePath)
  return { success: true }
})

// 重命名笔记
ipcMain.handle('rename-note', async (event, { bookName, notebookName, oldName, newName }) => {
  const booksDir = store.get('booksDir')
  const notebookPath = join(booksDir, bookName, '笔记', notebookName)
  const oldPath = join(notebookPath, `${oldName}.txt`)
  const newPath = join(notebookPath, `${newName}.txt`)
  if (!fs.existsSync(oldPath)) {
    return { success: false, message: '原笔记不存在' }
  }
  if (fs.existsSync(newPath)) {
    return { success: false, message: '新笔记名已存在' }
  }
  fs.renameSync(oldPath, newPath)
  return { success: true }
})

// 读取笔记内容
ipcMain.handle('read-note', async (event, { bookName, notebookName, noteName }) => {
  const booksDir = store.get('booksDir')
  const notePath = join(booksDir, bookName, '笔记', notebookName, `${noteName}.txt`)
  if (!fs.existsSync(notePath)) {
    return { success: false, message: '笔记不存在' }
  }
  const content = fs.readFileSync(notePath, 'utf-8')
  return { success: true, content }
})

// 保存笔记内容并支持重命名
ipcMain.handle(
  'edit-note',
  async (event, { bookName, notebookName, noteName, newName, content }) => {
    const booksDir = store.get('booksDir')
    const notebookPath = join(booksDir, bookName, '笔记', notebookName)
    const oldPath = join(notebookPath, `${noteName}.txt`)
    const newPath = join(notebookPath, `${newName || noteName}.txt`)
    if (!fs.existsSync(oldPath)) {
      return { success: false, message: '笔记不存在' }
    }
    // 1. 先写内容到原文件
    fs.writeFileSync(oldPath, content, 'utf-8')
    // 2. 判断是否需要重命名
    if (newName && newName !== noteName) {
      if (fs.existsSync(newPath)) {
        return { success: false, message: '笔记名已存在', name: noteName }
      }
      fs.renameSync(oldPath, newPath)
      return { success: true, name: newName }
    }
    return { success: true, name: noteName }
  }
)

// 读取章节内容
ipcMain.handle('read-chapter', async (event, { bookName, volumeName, chapterName }) => {
  const booksDir = store.get('booksDir')
  const chapterPath = join(booksDir, bookName, '正文', volumeName, `${chapterName}.txt`)
  if (!fs.existsSync(chapterPath)) {
    return { success: false, message: '章节不存在' }
  }
  const content = fs.readFileSync(chapterPath, 'utf-8')
  // 章节标题可单独存储或直接用文件名
  return { success: true, content }
})

// 计算章节字数
function countChapterWords(content) {
  return content.length
}

// 计算书籍总字数
async function calculateBookWordCount(bookName) {
  const booksDir = store.get('booksDir')
  const bookPath = join(booksDir, bookName)
  const volumePath = join(bookPath, '正文')
  let totalWords = 0

  if (!fs.existsSync(volumePath)) return totalWords

  const volumes = fs.readdirSync(volumePath, { withFileTypes: true })
  for (const volume of volumes) {
    if (volume.isDirectory()) {
      const volumeName = volume.name
      const volumePath = join(bookPath, '正文', volumeName)
      const files = fs.readdirSync(volumePath, { withFileTypes: true })
      for (const file of files) {
        if (file.isFile() && file.name.endsWith('.txt')) {
          const content = fs.readFileSync(join(volumePath, file.name), 'utf-8')
          totalWords += countChapterWords(content)
        }
      }
    }
  }
  return totalWords
}

// 更新书籍元数据
async function updateBookMetadata(bookName) {
  const booksDir = store.get('booksDir')
  const bookPath = join(booksDir, bookName)
  const metaPath = join(bookPath, 'mazi.json')

  if (!fs.existsSync(metaPath)) return false

  try {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
    const totalWords = await calculateBookWordCount(bookName)

    meta.totalWords = totalWords
    meta.updatedAt = new Date().toLocaleString()

    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8')
    return true
  } catch (error) {
    console.error('更新书籍元数据失败:', error)
    return false
  }
}

// 修改保存章节内容的处理函数
ipcMain.handle(
  'save-chapter',
  async (event, { bookName, volumeName, chapterName, newName, content }) => {
    const booksDir = store.get('booksDir')
    const volumePath = join(booksDir, bookName, '正文', volumeName)
    const oldPath = join(volumePath, `${chapterName}.txt`)
    const newPath = join(volumePath, `${newName || chapterName}.txt`)
    if (!fs.existsSync(oldPath)) {
      return { success: false, message: '章节不存在' }
    }
    // 1. 先写内容到原文件
    fs.writeFileSync(oldPath, content, 'utf-8')
    // 2. 判断是否需要重命名
    if (newName && newName !== chapterName) {
      if (fs.existsSync(newPath)) {
        return { success: false, message: '章节名已存在', name: chapterName }
      }
      fs.renameSync(oldPath, newPath)
    }
    // 3. 更新书籍元数据
    await updateBookMetadata(bookName)
    return { success: true, name: newName || chapterName }
  }
)

// 添加获取书籍总字数的处理函数
ipcMain.handle('get-book-word-count', async (event, bookName) => {
  const totalWords = await calculateBookWordCount(bookName)
  return { success: true, totalWords }
})

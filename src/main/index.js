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
  const meta = { ...bookInfo, createdAt: Date.now(), updatedAt: Date.now() }
  fs.writeFileSync(join(bookPath, 'mazi.json'), JSON.stringify(meta, null, 2), 'utf-8')

  // 3. 创建正文和笔记文件夹
  fs.mkdirSync(join(bookPath, '正文'), { recursive: true })
  fs.mkdirSync(join(bookPath, '笔记'), { recursive: true })
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
    fs.writeFileSync(join(bookPath, 'mazi.json'), JSON.stringify(bookInfo, null, 2), 'utf-8')
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
  let chapterName = '第1章'
  let index = 1
  while (fs.existsSync(join(volumePath, `${chapterName}.txt`))) {
    chapterName = `第${index}章`
    index++
  }
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
            type: 'chapter'
          })
        }
      }
      chapters.push({
        id: volumeName,
        name: volumeName,
        type: 'volume',
        children: volumeChapters
      })
    }
  }
  return chapters
})

// 编辑节点
ipcMain.handle('edit-node', async (event, { bookName, nodeId, newName }) => {
  try {
    const booksDir = store.get('booksDir')
    const bookPath = join(booksDir, bookName)
    const nodePath = join(bookPath, nodeId)
    const newPath = join(bookPath, newName)

    // 检查新名称是否已存在
    if (fs.existsSync(newPath)) {
      return { success: false, message: '名称已存在' }
    }

    // 重命名文件或文件夹
    fs.renameSync(nodePath, newPath)
    return { success: true }
  } catch (error) {
    console.error('编辑节点失败:', error)
    return { success: false, message: error.message }
  }
})

// 删除节点
ipcMain.handle('delete-node', async (event, { bookName, nodeId }) => {
  try {
    const booksDir = store.get('booksDir')
    const bookPath = join(booksDir, bookName)
    const nodePath = join(bookPath, nodeId)

    // 检查节点是否存在
    if (!fs.existsSync(nodePath)) {
      return { success: false, message: '节点不存在' }
    }

    // 删除文件或文件夹
    fs.rmSync(nodePath, { recursive: true, force: true })
    return { success: true }
  } catch (error) {
    console.error('删除节点失败:', error)
    return { success: false, message: error.message }
  }
})

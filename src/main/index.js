import { app, shell, BrowserWindow, ipcMain, dialog, nativeImage } from 'electron'
import { join } from 'path'
import fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import Store from 'electron-store'
import dayjs from 'dayjs'
import pkg from 'electron-updater'
import deepseekService from './services/deepseek.js'
const { autoUpdater } = pkg

// macOS 图标获取函数
// 注意：nativeImage 只支持 PNG 和 JPEG 格式，不支持 .icns
// .icns 文件仅用于打包后的应用图标，由 electron-builder 自动处理
// 开发环境使用 PNG 文件来设置 Dock 图标
function getMacIcon() {
  if (process.platform !== 'darwin') {
    return null
  }

  // 只在开发环境设置 Dock 图标
  // 生产环境的图标由 electron-builder 自动处理，不需要手动设置
  if (!is.dev) {
    return null
  }

  // 开发环境：使用 PNG 文件（nativeImage 支持 PNG 和 JPEG）
  const projectRoot = process.cwd()
  // 优先使用 build/icon.png，如果没有则使用 resources/icon.png
  let iconPath = join(projectRoot, 'build/icon.png')
  if (!fs.existsSync(iconPath)) {
    iconPath = join(projectRoot, 'resources/icon.png')
  }

  // 检查文件是否存在
  if (!fs.existsSync(iconPath)) {
    console.warn('未找到图标文件，跳过设置 Dock 图标')
    return null
  }

  // 使用 nativeImage 加载图标（支持 PNG 和 JPEG）
  try {
    const image = nativeImage.createFromPath(iconPath)
    if (image.isEmpty()) {
      console.warn('图标文件为空或无法读取:', iconPath)
      return null
    }
    return image
  } catch (error) {
    console.warn('加载图标失败:', iconPath, error.message)
    return null
  }
}

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

// 维护主窗口引用（用于发送更新消息）
let mainWindow = null

// 配置自动更新
autoUpdater.autoDownload = false // 不自动下载，等待用户确认
autoUpdater.autoInstallOnAppQuit = true // 退出时自动安装更新

// 设置更新事件处理器
function setupUpdaterEvents() {
  // 开发环境不检查更新
  if (is.dev) {
    return
  }

  // 检查更新事件
  autoUpdater.on('checking-for-update', () => {
    console.log('正在检查更新...')
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-checking')
    }
  })

  autoUpdater.on('update-available', (info) => {
    console.log('发现新版本:', info.version)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes
      })
    }
  })

  autoUpdater.on('update-not-available', () => {
    console.log('当前已是最新版本')
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-not-available')
    }
  })

  autoUpdater.on('error', (error) => {
    console.error('更新检查出错:', error)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-error', {
        message: error.message || '检查更新时发生错误'
      })
    }
  })

  autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-download-progress', {
        percent: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total
      })
    }
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log('更新下载完成:', info.version)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-downloaded', {
        version: info.version
      })
    }
  })
}

function createWindow() {
  // 获取 macOS 图标
  const macIcon = getMacIcon()

  // Create the browser window.
  mainWindow = new BrowserWindow({
    title: '51码字',
    width: 1100,
    height: 800,
    minWidth: 1100,
    minHeight: 800,
    show: false,
    autoHideMenuBar: true,
    // 设置窗口图标：Linux 使用 PNG，macOS 使用 ICNS
    ...(process.platform === 'linux' ? { icon } : {}),
    ...(process.platform === 'darwin' && macIcon ? { icon: macIcon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      webSecurity: false,
      allowRunningInsecureContent: true
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

  // 在 macOS 上设置 Dock 图标（开发环境）
  // 注意：开发环境中系统不会自动应用 squircle，所以我们需要使用已经应用了 squircle 的图标
  // 图标文件应该已经通过 add-squircle.py 脚本处理过
  const macIcon = getMacIcon()
  if (process.platform === 'darwin' && macIcon) {
    try {
      app.dock.setIcon(macIcon)
    } catch (error) {
      console.warn('设置 Dock 图标失败:', error.message)
    }
  }

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  // 在窗口创建后设置更新事件监听器
  setupUpdaterEvents()

  // 应用启动后延迟检查更新（仅生产环境）
  if (!is.dev) {
    // 延迟5秒后检查更新，避免影响应用启动速度
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((error) => {
        console.error('自动检查更新失败:', error)
      })
    }, 5000)

    // 设置定时检查更新（每4小时检查一次）
    setInterval(
      () => {
        autoUpdater.checkForUpdates().catch((error) => {
          console.error('定时检查更新失败:', error)
        })
      },
      4 * 60 * 60 * 1000
    )
  }

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

// 选择图片文件
ipcMain.handle('select-image', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  })

  if (!result.canceled && result.filePaths.length > 0) {
    return { filePath: result.filePaths[0] }
  }

  return null
})

// 选择保存文件路径
ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog({
    title: options.title || '保存文件',
    defaultPath: options.defaultPath || '',
    filters: options.filters || [{ name: '文本文件', extensions: ['txt'] }],
    buttonLabel: options.buttonLabel || '保存'
  })

  if (!result.canceled && result.filePath) {
    return { filePath: result.filePath }
  }

  return null
})

// 写入导出文件
ipcMain.handle('write-export-file', async (event, { filePath, content }) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8')
    return { success: true }
  } catch (error) {
    console.error('写入导出文件失败:', error)
    return { success: false, message: error.message || '写入文件失败' }
  }
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

  // 2. 处理封面图片（如果有）
  let coverUrl = bookInfo.coverUrl || null
  if (bookInfo.coverImagePath && fs.existsSync(bookInfo.coverImagePath)) {
    try {
      // 获取文件扩展名
      const ext = bookInfo.coverImagePath.split('.').pop()?.toLowerCase() || 'jpg'
      const coverFileName = `cover.${ext}`
      const coverPath = join(bookPath, coverFileName)
      // 复制图片文件
      fs.copyFileSync(bookInfo.coverImagePath, coverPath)
      coverUrl = coverFileName
    } catch (error) {
      console.error('复制封面图片失败:', error)
    }
  }

  // 3. 写入 mazi.json（移除临时字段 coverImagePath）
  // eslint-disable-next-line no-unused-vars
  const { coverImagePath, ...bookData } = bookInfo
  const meta = {
    ...bookData,
    coverUrl,
    createdAt: dayjs().format('YYYY/MM/DD HH:mm:ss'),
    updatedAt: dayjs().format('YYYY/MM/DD HH:mm:ss')
  }
  fs.writeFileSync(join(bookPath, 'mazi.json'), JSON.stringify(meta, null, 2), 'utf-8')

  // 3. 创建正文和笔记文件夹
  const textPath = join(bookPath, '正文')
  fs.mkdirSync(textPath, { recursive: true })
  const notesPath = join(bookPath, '笔记')
  fs.mkdirSync(notesPath, { recursive: true })

  // 4. 默认创建一个正文卷
  const volumePath = join(textPath, '正文')
  fs.mkdirSync(volumePath, { recursive: true })

  // 5. 在默认卷中创建第1章文件
  const chapterPath = join(volumePath, '第1章.txt')
  fs.writeFileSync(chapterPath, '')

  // 6. 在笔记文件夹中创建大纲、设定、人物三个默认笔记本文件夹
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
          // 只返回必要的字段，确保name是文件夹名称而不是路径
          books.push(meta)
        } catch (e) {
          // ignore parse error
          console.error('read-books-dir', e)
        }
      }
    }
  }
  // 按updatedAt排序，最新的在前
  // updatedAt格式可能是 "2024/1/1 12:00:00" 或 ISO格式，需要统一处理
  books.sort((a, b) => {
    const dateA = a.updatedAt ? new Date(a.updatedAt) : new Date(0)
    const dateB = b.updatedAt ? new Date(b.updatedAt) : new Date(0)
    // 降序排序，最新的在前
    return dateB.getTime() - dateA.getTime()
  })
  return books
})

ipcMain.handle('get-book-word-count', async (event, bookName) => {
  if (!bookName) return 0
  try {
    const totalWords = await calculateBookWordCount(bookName)
    const booksDir = store.get('booksDir')
    if (booksDir) {
      const metaPath = join(booksDir, bookName, 'mazi.json')
      if (fs.existsSync(metaPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
          meta.totalWords = totalWords
          meta.updatedAt = dayjs().format('YYYY/MM/DD HH:mm:ss')
          fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8')
        } catch (error) {
          console.error('更新书籍元数据失败:', error)
        }
      }
    }
    return totalWords
  } catch (error) {
    console.error('获取书籍总字数失败:', error)
    throw error
  }
})

// 删除书籍
ipcMain.handle('delete-book', async (event, { name }) => {
  try {
    const booksDir = store.get('booksDir')
    if (!booksDir) {
      return false
    }

    const bookPath = join(booksDir, name)

    if (!fs.existsSync(bookPath)) {
      return false
    }

    // 删除整个书籍文件夹
    fs.rmSync(bookPath, { recursive: true, force: true })
    return true
  } catch (error) {
    console.error('删除书籍失败:', error)
    return false
  }
})

// 编辑书籍
ipcMain.handle('edit-book', async (event, bookInfo) => {
  try {
    const booksDir = store.get('booksDir')

    // 如果传入了原始名称，使用原始名称定位文件夹
    const originalName = bookInfo.originalName || bookInfo.name
    let bookPath = join(booksDir, originalName)

    if (!fs.existsSync(bookPath)) {
      return { success: false, message: '书籍不存在' }
    }

    const metaPath = join(bookPath, 'mazi.json')

    // 读取现有元数据
    const existingMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))

    // 处理封面图片（如果有新的封面图片）
    let coverUrl = bookInfo.coverUrl || existingMeta.coverUrl || null
    if (bookInfo.coverImagePath && fs.existsSync(bookInfo.coverImagePath)) {
      try {
        // 删除旧的封面图片（如果存在）
        if (existingMeta.coverUrl) {
          const oldCoverPath = join(bookPath, existingMeta.coverUrl)
          if (fs.existsSync(oldCoverPath)) {
            fs.unlinkSync(oldCoverPath)
          }
        }
        // 获取文件扩展名
        const ext = bookInfo.coverImagePath.split('.').pop()?.toLowerCase() || 'jpg'
        const coverFileName = `cover.${ext}`
        const coverPath = join(bookPath, coverFileName)
        // 复制图片文件
        fs.copyFileSync(bookInfo.coverImagePath, coverPath)
        coverUrl = coverFileName
      } catch (error) {
        console.error('复制封面图片失败:', error)
      }
    } else if (bookInfo.coverUrl === null || bookInfo.coverUrl === '') {
      // 如果明确设置为空，删除封面图片
      if (existingMeta.coverUrl) {
        const oldCoverPath = join(bookPath, existingMeta.coverUrl)
        if (fs.existsSync(oldCoverPath)) {
          fs.unlinkSync(oldCoverPath)
        }
      }
      coverUrl = null
    }

    // 如果书名发生变化，需要重命名文件夹
    if (bookInfo.name !== originalName) {
      const newBookPath = join(booksDir, bookInfo.name)

      // 检查新名称是否已存在
      if (fs.existsSync(newBookPath)) {
        return { success: false, message: '已存在同名书籍' }
      }

      // 重命名文件夹
      fs.renameSync(bookPath, newBookPath)
      bookPath = newBookPath

      // 更新元数据路径
      const newMetaPath = join(newBookPath, 'mazi.json')

      // 合并新旧数据，保留原有数据，移除临时字段
      // eslint-disable-next-line no-unused-vars
      const { coverImagePath, ...bookData } = bookInfo
      const mergedMeta = {
        ...existingMeta,
        ...bookData,
        coverUrl,
        updatedAt: dayjs().format('YYYY/MM/DD HH:mm:ss') // 更新修改时间
      }
      fs.writeFileSync(newMetaPath, JSON.stringify(mergedMeta, null, 2), 'utf-8')
    } else {
      // 书名未变化，直接更新元数据
      // eslint-disable-next-line no-unused-vars
      const { coverImagePath, ...bookData } = bookInfo
      const mergedMeta = {
        ...existingMeta,
        ...bookData,
        coverUrl,
        updatedAt: dayjs().format('YYYY/MM/DD HH:mm:ss') // 更新修改时间
      }
      fs.writeFileSync(metaPath, JSON.stringify(mergedMeta, null, 2), 'utf-8')
    }

    return { success: true }
  } catch (error) {
    console.error('编辑书籍失败:', error)
    return { success: false, message: error.message }
  }
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
  // 获取 macOS 图标
  const macIcon = getMacIcon()

  // 新建窗口
  const editorWindow = new BrowserWindow({
    title: `${name} - 51码字`,
    width: 1100,
    height: 800,
    minWidth: 1100,
    minHeight: 800,
    show: false,
    autoHideMenuBar: true,
    // 设置窗口图标：Linux 使用 PNG，macOS 使用 ICNS
    ...(process.platform === 'linux' ? { icon } : {}),
    ...(process.platform === 'darwin' && macIcon ? { icon: macIcon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
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
  // 页面加载完成后，确保窗口标题正确显示书籍名称
  editorWindow.webContents.on('did-finish-load', () => {
    editorWindow.setTitle(`${name} - 51码字`)
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

  // 智能计算新的章节序号
  let nextChapterNumber = 1

  if (chapters.length > 0) {
    const chapterNumbers = chapters
      .map((file) => {
        if (file.isFile() && file.name.endsWith('.txt')) {
          const parsed = parseChapterName(file.name.replace('.txt', ''))
          return parsed?.number || 0
        }
        return 0
      })
      .filter((num) => num > 0)

    if (chapterNumbers.length > 0) {
      nextChapterNumber = Math.max(...chapterNumbers) + 1
    } else {
      nextChapterNumber = chapters.length + 1
    }
  }

  // 获取章节设置
  const chapterSettings = store.get(`chapterSettings:${bookName}`) || {
    chapterFormat: 'number',
    suffixType: '章',
    targetWords: 2000
  }

  // 根据设置生成章节名称
  const chapterName = `${generateChapterName(nextChapterNumber, chapterSettings)} `
  const filePath = join(volumePath, `${chapterName}.txt`)

  fs.writeFileSync(filePath, '')

  // 强制同步文件系统，确保文件立即可见（Windows兼容）
  try {
    const fd = fs.openSync(filePath, 'r')
    fs.fsyncSync(fd)
    fs.closeSync(fd)
  } catch (error) {
    // 如果同步失败，记录错误但不影响主流程
    console.warn('文件同步失败:', error.message)
  }

  return { success: true, chapterName, filePath }
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
      const currentVolumePath = join(bookPath, '正文', volumeName)

      const files = fs.readdirSync(currentVolumePath, { withFileTypes: true })

      const volumeChapters = files
        .filter((file) => file.isFile() && file.name.endsWith('.txt'))
        .map((file) => {
          const name = file.name.replace('.txt', '')
          const parsed = parseChapterName(name)
          return {
            id: file.name,
            name,
            type: 'chapter',
            path: join(bookPath, '正文', volumeName, file.name),
            orderValue: parsed?.number || 0,
            hasOrderValue: Boolean(parsed?.number)
          }
        })
        .sort((a, b) => {
          if (a.hasOrderValue && b.hasOrderValue) {
            return a.orderValue - b.orderValue
          }
          if (a.hasOrderValue) return -1
          if (b.hasOrderValue) return 1
          return a.name.localeCompare(b.name)
        })

      for (const chapter of volumeChapters) {
        delete chapter.orderValue
        delete chapter.hasOrderValue
      }

      chapters.push({
        id: volumeName,
        name: volumeName,
        type: 'volume',
        path: join(bookPath, '正文', volumeName),
        children: volumeChapters
      })
    }
  }

  return chapters
})

// 重新格式化章节编号
ipcMain.handle('reformat-chapter-numbers', async (event, { bookName, volumeName, settings }) => {
  try {
    const booksDir = store.get('booksDir')
    const bookPath = join(booksDir, bookName)
    const volumePath = join(bookPath, '正文', volumeName)

    if (!fs.existsSync(volumePath)) {
      return { success: false, message: '卷目录不存在' }
    }

    // 获取当前卷下的所有章节文件
    const files = fs.readdirSync(volumePath, { withFileTypes: true })
    const chapters = files.filter((file) => file.isFile() && file.name.endsWith('.txt'))

    if (chapters.length === 0) {
      return { success: false, message: '没有找到章节文件' }
    }

    // 检查章节编号连续性
    const chapterInfos = chapters.map((file) => {
      const oldName = file.name.replace('.txt', '')
      const parsed = parseChapterName(oldName)
      return {
        oldName,
        oldPath: join(volumePath, file.name),
        file,
        parsed
      }
    })

    const numberingCheck = checkChapterNumbering(
      chapterInfos.map((info) => ({ name: info.oldName, parsed: info.parsed }))
    )

    if (numberingCheck.isSequential) {
      return { success: true, message: '章节编号已经连续，无需重新格式化' }
    }

    // 按章节编号排序
    chapterInfos.sort((a, b) => {
      const aNum = a.parsed?.number || 0
      const bNum = b.parsed?.number || 0
      if (aNum && bNum) return aNum - bNum
      return a.oldName.localeCompare(b.oldName)
    })

    // 重新格式化章节编号，保留主题名
    let totalRenamed = 0
    for (let i = 0; i < chapterInfos.length; i++) {
      const info = chapterInfos[i]
      const newNumber = i + 1

      // 提取原有的主题名/描述内容
      const description = info.parsed?.description || ''
      const newPrefix = generateChapterName(newNumber, settings)
      const newName = description ? `${newPrefix} ${description}` : newPrefix

      if (newName !== info.oldName) {
        const newPath = join(volumePath, `${newName}.txt`)

        try {
          fs.renameSync(info.oldPath, newPath)
          totalRenamed++
        } catch (error) {
          return { success: false, message: `重命名失败: ${error.message}` }
        }
      }
    }

    return {
      success: true,
      message: `成功重新格式化 ${totalRenamed} 个章节`,
      totalRenamed
    }
  } catch (error) {
    return { success: false, message: `操作失败: ${error.message}` }
  }
})

// 编辑节点
ipcMain.handle('edit-node', async (event, { bookName, type, volume, chapter, newName }) => {
  try {
    const booksDir = store.get('booksDir')
    if (type === 'volume') {
      // 卷重命名
      const volumePath = join(booksDir, bookName, '正文', volume)
      const newVolumePath = join(booksDir, bookName, '正文', newName)

      // 检查原路径是否存在
      if (!fs.existsSync(volumePath)) {
        return { success: false, message: '原卷不存在' }
      }

      // 检查新名称是否已存在
      if (fs.existsSync(newVolumePath)) {
        return { success: false, message: '新卷名已存在' }
      }

      // 检查名称是否相同
      if (volume === newName) {
        return { success: true, message: '名称未变化' }
      }

      // 在 Windows 上，如果文件夹被占用，renameSync 可能会失败
      // 使用异步重命名并添加重试机制
      try {
        // 尝试同步重命名
        fs.renameSync(volumePath, newVolumePath)
        return { success: true }
      } catch (renameError) {
        // 如果是 Windows 上的权限或锁定错误，提供更友好的错误信息
        if (process.platform === 'win32') {
          const errorMessage = renameError.message || String(renameError)
          if (
            errorMessage.includes('EACCES') ||
            errorMessage.includes('EPERM') ||
            errorMessage.includes('EBUSY')
          ) {
            return {
              success: false,
              message: '文件夹被占用，请关闭可能正在使用该文件夹的程序（如资源管理器）后重试'
            }
          }
        }
        throw renameError
      }
    } else if (type === 'chapter') {
      // 章节重命名
      const chapterPath = join(booksDir, bookName, '正文', volume, `${chapter}.txt`)
      const newChapterPath = join(booksDir, bookName, '正文', volume, `${newName}.txt`)

      // 检查原路径是否存在
      if (!fs.existsSync(chapterPath)) {
        return { success: false, message: '原章节不存在' }
      }

      // 检查新名称是否已存在
      if (fs.existsSync(newChapterPath)) {
        return { success: false, message: '新章节名已存在' }
      }

      // 检查名称是否相同
      if (chapter === newName) {
        return { success: true, message: '名称未变化' }
      }

      try {
        fs.renameSync(chapterPath, newChapterPath)
        return { success: true }
      } catch (renameError) {
        if (process.platform === 'win32') {
          const errorMessage = renameError.message || String(renameError)
          if (
            errorMessage.includes('EACCES') ||
            errorMessage.includes('EPERM') ||
            errorMessage.includes('EBUSY')
          ) {
            return {
              success: false,
              message: '文件被占用，请关闭可能正在使用该文件的程序后重试'
            }
          }
        }
        throw renameError
      }
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

// 获取章节设置
ipcMain.handle('get-chapter-settings', (event, bookName) => {
  const settings = store.get(`chapterSettings:${bookName}`) || {
    suffixType: '章',
    targetWords: 2000
  }

  return {
    suffixType: settings.suffixType || '章',
    targetWords: Number.isFinite(Number(settings.targetWords)) ? Number(settings.targetWords) : 2000
  }
})

// 设置章节目标字数
ipcMain.handle('set-chapter-target-words', (event, { bookName, targetWords }) => {
  if (!bookName) {
    return { success: false, message: '书籍名称不能为空' }
  }
  const numeric = Number(targetWords)
  const sanitized = Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : 2000
  const existing = store.get(`chapterSettings:${bookName}`) || {
    suffixType: '章',
    targetWords: 2000
  }
  const updated = {
    ...existing,
    targetWords: sanitized
  }
  try {
    store.set(`chapterSettings:${bookName}`, updated)
    return { success: true, settings: updated }
  } catch (error) {
    console.error('更新章节目标字数失败:', error)
    return { success: false, message: error.message || '更新失败' }
  }
})

// 更新章节格式
ipcMain.handle('update-chapter-format', async (event, { bookName, settings: rawSettings }) => {
  try {
    const booksDir = store.get('booksDir')
    const bookPath = join(booksDir, bookName)
    const volumePath = join(bookPath, '正文')

    if (!fs.existsSync(volumePath)) {
      return { success: false, message: '正文目录不存在' }
    }

    // 保存设置（补齐默认值）
    const cleanSettings = {
      chapterFormat: rawSettings?.chapterFormat === 'hanzi' ? 'hanzi' : 'number',
      suffixType: rawSettings?.suffixType || '章',
      targetWords: Number.isFinite(Number(rawSettings?.targetWords))
        ? Number(rawSettings.targetWords)
        : 2000
    }
    store.set(`chapterSettings:${bookName}`, cleanSettings)
    const appliedSettings = cleanSettings

    // 获取所有卷和章节
    const volumes = fs.readdirSync(volumePath, { withFileTypes: true })
    let totalRenamed = 0

    for (const volume of volumes) {
      if (volume.isDirectory()) {
        const volumeName = volume.name
        const currentVolumePath = join(bookPath, '正文', volumeName)
        const files = fs.readdirSync(currentVolumePath, { withFileTypes: true })

        for (const file of files) {
          if (file.isFile() && file.name.endsWith('.txt')) {
            const oldName = file.name.replace('.txt', '')
            const parsed = parseChapterName(oldName)

            if (parsed) {
              const { number: chapterNumber, description } = parsed
              const newPrefix = generateChapterName(chapterNumber, appliedSettings)
              const suffixText = description ? ` ${description}` : ''
              const newName = `${newPrefix}${suffixText}`

              if (newName !== oldName) {
                const oldPath = join(currentVolumePath, file.name)
                const newPath = join(currentVolumePath, `${newName}.txt`)

                fs.renameSync(oldPath, newPath)
                totalRenamed++
              }
            }
          }
        }
      }
    }

    return {
      success: true,
      message: `成功重命名 ${totalRenamed} 个章节文件`,
      totalRenamed
    }
  } catch (error) {
    const errorMessage = error.message || '未知错误'
    return { success: false, message: errorMessage }
  }
})

const chineseDigitMap = {
  零: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9
}

const chineseDigitsArray = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']

const chineseUnitsMap = {
  十: 10,
  百: 100,
  千: 1000,
  万: 10000
}

function convertNumberToChinese(num) {
  const numeric = Number(num)
  if (!Number.isFinite(numeric) || numeric <= 0) return String(num)
  if (numeric >= 10000) {
    const high = Math.floor(numeric / 10000)
    const rest = numeric % 10000
    let result = `${convertNumberToChinese(high)}万`
    if (rest > 0) {
      let restChinese = convertNumberToChinese(rest)
      if (rest < 100 && restChinese.startsWith('十')) {
        restChinese = `一${restChinese}`
      }
      result += rest < 1000 ? `零${restChinese}` : restChinese
    }
    return result
  }
  const str = String(Math.floor(numeric))
  const units = ['', '十', '百', '千']
  let result = ''
  let zeroFlag = false

  for (let i = 0; i < str.length; i++) {
    const digit = Number(str[i])
    const position = str.length - i - 1

    if (digit === 0) {
      zeroFlag = result.length > 0
      continue
    }

    if (zeroFlag) {
      result += '零'
      zeroFlag = false
    }

    result += chineseDigitsArray[digit] + (units[position] || '')
  }

  result = result.replace(/^一十/, '十')
  return result || '零'
}

function parseChineseNumber(str) {
  if (!str) return NaN
  let total = 0
  let section = 0
  let number = 0

  for (const char of str) {
    if (char === '零') {
      if (number !== 0) number = 0
      continue
    }

    if (chineseDigitMap[char] !== undefined) {
      number = chineseDigitMap[char]
    } else if (chineseUnitsMap[char]) {
      const unitValue = chineseUnitsMap[char]
      if (unitValue === 10000) {
        section = (section + number) * unitValue
        total += section
        section = 0
      } else {
        const multiplier = number === 0 && char === '十' ? 1 : number
        section += multiplier * unitValue
      }
      number = 0
    } else {
      return NaN
    }
  }

  return total + section + number
}

function parseChapterName(name) {
  const match = name.match(/^第(.+?)([章回集节部卷])\s*(.*)$/)
  if (!match) return null
  const [, rawNumber, suffix, description] = match
  let number
  if (/^\d+$/.test(rawNumber)) {
    number = parseInt(rawNumber, 10)
  } else {
    number = parseChineseNumber(rawNumber)
  }

  if (!Number.isFinite(number) || number <= 0) return null

  return {
    number,
    suffix,
    description: description || ''
  }
}

function generateChapterName(number, settings) {
  const format = settings?.chapterFormat === 'hanzi' ? 'hanzi' : 'number'
  const suffix = settings?.suffixType || settings?.suffix || '章'
  const numberPart = format === 'hanzi' ? convertNumberToChinese(number) : String(number)
  return `第${numberPart}${suffix}`
}

// 检查章节编号是否连续
function checkChapterNumbering(chapters) {
  if (!chapters || chapters.length === 0) {
    return { isSequential: true, missingNumbers: [], maxNumber: 0, totalChapters: 0 }
  }

  const chapterNumbers = chapters
    .map((chapter) => {
      if (chapter.parsed?.number) return chapter.parsed.number
      const parsed = parseChapterName(chapter.name || '')
      return parsed?.number || 0
    })
    .filter((num) => num > 0)
    .sort((a, b) => a - b)

  if (chapterNumbers.length === 0) {
    return { isSequential: true, missingNumbers: [], maxNumber: 0, totalChapters: chapters.length }
  }

  const maxNumber = Math.max(...chapterNumbers)
  const totalChapters = chapters.length
  const missingNumbers = []

  // 检查缺失的编号
  for (let i = 1; i <= maxNumber; i++) {
    if (!chapterNumbers.includes(i)) {
      missingNumbers.push(i)
    }
  }

  const isSequential = missingNumbers.length === 0 && maxNumber === totalChapters

  return {
    isSequential,
    missingNumbers,
    maxNumber,
    totalChapters,
    chapterNumbers
  }
}

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
    }
    // 3. 更新书籍元数据（更新updatedAt字段）
    await updateBookMetadata(bookName)
    return { success: true, name: newName || noteName }
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

// 计算章节字数（排除空格、换行符、制表符等格式字符）
function countChapterWords(content) {
  if (!content) return 0
  // 移除空格、换行符、制表符等格式字符，只计算实际内容
  return content.replace(/[\s\n\r\t]/g, '').length
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

// 统计文件路径
const STATS_FILE = 'word_stats.json'

// 获取统计文件路径
function getStatsFilePath() {
  const booksDir = store.get('booksDir')
  return join(booksDir, STATS_FILE)
}

// 读取统计数据
function readStats() {
  const statsPath = getStatsFilePath()
  if (!fs.existsSync(statsPath)) {
    return { dailyStats: {}, chapterStats: {}, bookDailyStats: {} }
  }
  try {
    return JSON.parse(fs.readFileSync(statsPath, 'utf-8'))
  } catch (error) {
    console.error('读取统计文件失败:', error)
    return { dailyStats: {}, chapterStats: {}, bookDailyStats: {} }
  }
}

// 保存统计数据
function saveStats(stats) {
  const statsPath = getStatsFilePath()
  try {
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2), 'utf-8')
    return true
  } catch (error) {
    console.error('保存统计文件失败:', error)
    return false
  }
}

// 更新章节字数统计
function updateChapterStats(bookName, volumeName, chapterName, oldContent, newContent) {
  const stats = readStats()
  const today = new Date().toISOString().split('T')[0]
  const chapterKey = `${bookName}/${volumeName}/${chapterName}`

  // 使用统一的字数统计函数，排除空格、换行符、制表符
  const oldLength = countChapterWords(oldContent)
  const newLength = countChapterWords(newContent)
  const wordChange = newLength - oldLength

  // 章节上次统计信息
  const prev = stats.chapterStats[chapterKey]
  const lastUpdate = prev ? prev.lastUpdate : today

  // 1. 先把旧字数从旧日期扣除
  if (prev && stats.dailyStats[lastUpdate]) {
    stats.dailyStats[lastUpdate] -= prev.totalWords
    if (stats.dailyStats[lastUpdate] < 0) stats.dailyStats[lastUpdate] = 0
  }

  // 2. 再把新字数加到今天
  if (!stats.dailyStats[today]) stats.dailyStats[today] = 0
  stats.dailyStats[today] += newLength

  // 3. 更新章节统计
  stats.chapterStats[chapterKey] = {
    totalWords: newLength,
    lastUpdate: today,
    wordChange: wordChange, // 记录本次字数变化
    lastContentLength: oldLength // 记录上次内容长度
  }

  // 4. 更新书籍每日净增字数统计
  if (!stats.bookDailyStats) stats.bookDailyStats = {}
  if (!stats.bookDailyStats[bookName]) stats.bookDailyStats[bookName] = {}
  if (!stats.bookDailyStats[bookName][today]) {
    stats.bookDailyStats[bookName][today] = {
      netWords: 0,
      addWords: 0,
      deleteWords: 0,
      totalWords: 0
    }
  }

  // 计算净增字数
  if (wordChange > 0) {
    stats.bookDailyStats[bookName][today].addWords += wordChange
  } else if (wordChange < 0) {
    stats.bookDailyStats[bookName][today].deleteWords += Math.abs(wordChange)
  }

  stats.bookDailyStats[bookName][today].netWords =
    stats.bookDailyStats[bookName][today].addWords -
    stats.bookDailyStats[bookName][today].deleteWords

  stats.bookDailyStats[bookName][today].totalWords = newLength

  saveStats(stats)
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

    // 读取旧内容用于统计
    const oldContent = fs.readFileSync(oldPath, 'utf-8')

    // 1. 先写内容到原文件
    fs.writeFileSync(oldPath, content, 'utf-8')

    // 2. 判断是否需要重命名
    if (newName && newName !== chapterName) {
      if (fs.existsSync(newPath)) {
        return { success: false, message: '章节名已存在', name: chapterName }
      }
      fs.renameSync(oldPath, newPath)
    }

    // 3. 更新统计
    updateChapterStats(bookName, volumeName, chapterName, oldContent, content)

    // 4. 更新书籍元数据
    await updateBookMetadata(bookName)

    return { success: true, name: newName || chapterName }
  }
)

// 修改获取每日码字数统计的处理函数
ipcMain.handle('get-daily-word-count', async () => {
  try {
    const stats = readStats()
    return { success: true, data: stats.dailyStats }
  } catch (error) {
    console.error('获取每日码字统计失败:', error)
    return { success: false, message: '获取统计失败' }
  }
})

// 新增：获取书籍每日净增字数统计
ipcMain.handle('get-book-daily-stats', async (event, bookName) => {
  try {
    const stats = readStats()
    if (!stats.bookDailyStats || !stats.bookDailyStats[bookName]) {
      return { success: true, data: {} }
    }
    return { success: true, data: stats.bookDailyStats[bookName] }
  } catch (error) {
    console.error('获取书籍每日统计失败:', error)
    return { success: false, message: '获取统计失败' }
  }
})

// 新增：获取所有书籍的每日净增字数统计
ipcMain.handle('get-all-books-daily-stats', async () => {
  try {
    // 先判断 booksDir 是否存在且有数据
    const booksDir = store.get('booksDir')
    if (!booksDir || !fs.existsSync(booksDir)) {
      return { success: true, data: {} }
    }

    const stats = readStats()
    if (!stats.bookDailyStats) {
      return { success: true, data: {} }
    }
    return { success: true, data: stats.bookDailyStats }
  } catch (error) {
    console.error('获取所有书籍每日统计失败:', error)
    return { success: false, message: '获取统计失败' }
  }
})

// 添加获取章节统计的处理函数
ipcMain.handle('get-chapter-stats', async (event, { bookName, volumeName, chapterName }) => {
  try {
    const stats = readStats()
    const chapterKey = `${bookName}/${volumeName}/${chapterName}`
    return { success: true, data: stats.chapterStats[chapterKey] || null }
  } catch (error) {
    console.error('获取章节统计失败:', error)
    return { success: false, message: '获取统计失败' }
  }
})

// 时间线数据读写
ipcMain.handle('read-timeline', async (event, { bookName }) => {
  const booksDir = store.get('booksDir')
  const bookPath = join(booksDir, bookName)
  const timelinePath = join(bookPath, 'timelines.json')
  if (!fs.existsSync(timelinePath)) return []
  try {
    return JSON.parse(fs.readFileSync(timelinePath, 'utf-8'))
  } catch {
    return []
  }
})

// 保存时间线数据
ipcMain.handle('write-timeline', async (event, { bookName, data }) => {
  const booksDir = store.get('booksDir')
  const bookPath = join(booksDir, bookName)
  const timelinePath = join(bookPath, 'timelines.json')

  try {
    // 确保目录存在
    if (!fs.existsSync(bookPath)) {
      fs.mkdirSync(bookPath, { recursive: true })
    }

    fs.writeFileSync(timelinePath, JSON.stringify(data, null, 2), 'utf-8')
    return { success: true }
  } catch (error) {
    console.error('保存时间线失败:', error)
    return { success: false, message: error.message }
  }
})

// 人物谱数据读写
ipcMain.handle('read-characters', async (event, { bookName }) => {
  const booksDir = store.get('booksDir')
  const bookPath = join(booksDir, bookName)
  const charactersPath = join(bookPath, 'characters.json')
  if (!fs.existsSync(charactersPath)) return []
  try {
    return JSON.parse(fs.readFileSync(charactersPath, 'utf-8'))
  } catch {
    return []
  }
})

// 保存人物谱数据
ipcMain.handle('write-characters', async (event, { bookName, data }) => {
  const booksDir = store.get('booksDir')
  const bookPath = join(booksDir, bookName)
  const charactersPath = join(bookPath, 'characters.json')

  try {
    // 确保目录存在
    if (!fs.existsSync(bookPath)) {
      fs.mkdirSync(bookPath, { recursive: true })
    }

    fs.writeFileSync(charactersPath, JSON.stringify(data, null, 2), 'utf-8')
    return { success: true }
  } catch (error) {
    console.error('保存人物谱失败:', error)
    return { success: false, message: error.message }
  }
})

// 词条字典数据读写
ipcMain.handle('read-dictionary', async (event, { bookName }) => {
  const booksDir = store.get('booksDir')
  const bookPath = join(booksDir, bookName)
  const dictionaryPath = join(bookPath, 'dictionary.json')
  if (!fs.existsSync(dictionaryPath)) return []
  try {
    return JSON.parse(fs.readFileSync(dictionaryPath, 'utf-8'))
  } catch {
    return []
  }
})

// 保存词条字典数据
ipcMain.handle('write-dictionary', async (event, { bookName, data }) => {
  const booksDir = store.get('booksDir')
  const bookPath = join(booksDir, bookName)
  const dictionaryPath = join(bookPath, 'dictionary.json')

  try {
    // 确保目录存在
    if (!fs.existsSync(bookPath)) {
      fs.mkdirSync(bookPath, { recursive: true })
    }

    fs.writeFileSync(dictionaryPath, JSON.stringify(data, null, 2), 'utf-8')
    return { success: true }
  } catch (error) {
    console.error('保存词条字典失败:', error)
    return { success: false, message: error.message }
  }
})

// 事序图数据读写
ipcMain.handle('read-sequence-charts', async (event, { bookName }) => {
  const booksDir = store.get('booksDir')
  const bookPath = join(booksDir, bookName)
  const filePath = join(bookPath, 'sequence-charts.json')
  if (!fs.existsSync(filePath)) return []
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return []
  }
})

ipcMain.handle('write-sequence-charts', async (event, { bookName, data }) => {
  const booksDir = store.get('booksDir')
  const bookPath = join(booksDir, bookName)
  const filePath = join(bookPath, 'sequence-charts.json')

  try {
    if (!fs.existsSync(bookPath)) {
      fs.mkdirSync(bookPath, { recursive: true })
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    return { success: true }
  } catch (error) {
    console.error('保存事序图失败:', error)
    return { success: false, message: error.message }
  }
})

// 读取地图列表
ipcMain.handle('read-maps', async (event, bookName) => {
  try {
    const booksDir = await store.get('booksDir')
    if (!booksDir) {
      throw new Error('未设置书籍目录')
    }
    const bookPath = join(booksDir, bookName)
    const mapsDir = join(bookPath, 'maps')
    if (!fs.existsSync(mapsDir)) {
      fs.mkdirSync(mapsDir, { recursive: true })
      return []
    }
    const files = fs.readdirSync(mapsDir)
    const maps = files
      .filter((file) => file.endsWith('.png'))
      .map((file) => {
        const name = file.split('.').slice(0, -1).join('.')
        const filePath = join(mapsDir, file)
        const jsonPath = join(mapsDir, `${name}.json`)

        let thumbnail = ''
        try {
          const data = fs.readFileSync(filePath)
          thumbnail = `data:image/png;base64,${data.toString('base64')}`
        } catch {
          thumbnail = ''
        }

        // 读取地图元数据（如果存在）
        let mapData = {
          id: name,
          name: name,
          description: ''
        }
        if (fs.existsSync(jsonPath)) {
          try {
            const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
            mapData = {
              id: jsonData.id || name,
              name: jsonData.name || name,
              description: jsonData.description || ''
            }
          } catch (error) {
            console.error(`读取地图元数据失败: ${name}`, error)
          }
        }

        return {
          ...mapData,
          thumbnail
        }
      })
    return maps
  } catch (error) {
    console.error('读取地图列表失败:', error)
    throw error
  }
})

// 新增：读取地图图片为base64
ipcMain.handle('read-map-image', async (event, { bookName, mapName }) => {
  try {
    const booksDir = await store.get('booksDir')
    if (!booksDir) {
      throw new Error('未设置书籍目录')
    }
    const filePath = join(booksDir, bookName, 'maps', `${mapName}.png`)
    if (!fs.existsSync(filePath)) return ''
    const data = fs.readFileSync(filePath)
    return `data:image/png;base64,${data.toString('base64')}`
  } catch {
    return ''
  }
})

// 创建地图（有同名校验）
ipcMain.handle('create-map', async (event, { bookName, mapName, description, imageData }) => {
  try {
    const booksDir = await store.get('booksDir')
    if (!booksDir) {
      throw new Error('未设置书籍目录')
    }
    const bookPath = join(booksDir, bookName)
    const mapsDir = join(bookPath, 'maps')
    if (!fs.existsSync(mapsDir)) {
      fs.mkdirSync(mapsDir, { recursive: true })
    }
    // 校验同名文件
    const filePath = join(mapsDir, `${mapName}.png`)
    const jsonPath = join(mapsDir, `${mapName}.json`)
    if (fs.existsSync(filePath) || fs.existsSync(jsonPath)) {
      throw new Error('已存在同名地图文件')
    }
    // 保存图片
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    fs.writeFileSync(filePath, buffer)

    // 保存地图元数据
    const mapData = {
      id: mapName,
      name: mapName,
      description: description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    fs.writeFileSync(jsonPath, JSON.stringify(mapData, null, 2), 'utf-8')

    return {
      success: true,
      path: filePath
    }
  } catch (error) {
    console.error('创建地图失败:', error)
    throw error
  }
})

// 更新地图（无同名校验）
ipcMain.handle('update-map', async (event, { bookName, mapName, imageData, mapData }) => {
  try {
    const booksDir = await store.get('booksDir')
    if (!booksDir) {
      throw new Error('未设置书籍目录')
    }
    const bookPath = join(booksDir, bookName)
    const mapsDir = join(bookPath, 'maps')
    if (!fs.existsSync(mapsDir)) {
      fs.mkdirSync(mapsDir, { recursive: true })
    }
    const filePath = join(mapsDir, `${mapName}.png`)
    const dataFilePath = join(mapsDir, `${mapName}.data.json`)

    // 保存图片（覆盖）
    if (imageData) {
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')
      const buffer = Buffer.from(base64Data, 'base64')
      fs.writeFileSync(filePath, buffer)
    }

    // 保存地图数据（画板内容）
    if (mapData) {
      fs.writeFileSync(dataFilePath, JSON.stringify(mapData, null, 2), 'utf-8')
    }

    return {
      success: true,
      path: filePath
    }
  } catch (error) {
    console.error('更新地图失败:', error)
    throw error
  }
})

// 保存地图数据（画板内容）
ipcMain.handle('save-map-data', async (event, { bookName, mapName, mapData }) => {
  try {
    const booksDir = await store.get('booksDir')
    if (!booksDir) {
      throw new Error('未设置书籍目录')
    }
    const bookPath = join(booksDir, bookName)
    const mapsDir = join(bookPath, 'maps')
    if (!fs.existsSync(mapsDir)) {
      fs.mkdirSync(mapsDir, { recursive: true })
    }
    const dataFilePath = join(mapsDir, `${mapName}.data.json`)
    fs.writeFileSync(dataFilePath, JSON.stringify(mapData, null, 2), 'utf-8')
    return {
      success: true,
      path: dataFilePath
    }
  } catch (error) {
    console.error('保存地图数据失败:', error)
    throw error
  }
})

// 加载地图数据（画板内容）
ipcMain.handle('load-map-data', async (event, { bookName, mapName }) => {
  try {
    const booksDir = await store.get('booksDir')
    if (!booksDir) {
      throw new Error('未设置书籍目录')
    }
    const dataFilePath = join(booksDir, bookName, 'maps', `${mapName}.data.json`)
    if (!fs.existsSync(dataFilePath)) {
      return null // 如果没有数据文件，返回null
    }
    const data = fs.readFileSync(dataFilePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('加载地图数据失败:', error)
    return null
  }
})

// 删除地图
ipcMain.handle('delete-map', async (event, { bookName, mapName }) => {
  try {
    const booksDir = await store.get('booksDir')
    if (!booksDir) {
      throw new Error('未设置书籍目录')
    }
    const mapsDir = join(booksDir, bookName, 'maps')
    const filePath = join(mapsDir, `${mapName}.png`)
    const jsonPath = join(mapsDir, `${mapName}.json`)
    const dataFilePath = join(mapsDir, `${mapName}.data.json`)

    // 删除图片文件
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
    // 删除元数据文件
    if (fs.existsSync(jsonPath)) {
      fs.unlinkSync(jsonPath)
    }
    // 删除数据文件
    if (fs.existsSync(dataFilePath)) {
      fs.unlinkSync(dataFilePath)
    }

    return { success: true }
  } catch (error) {
    console.error('删除地图失败:', error)
    throw error
  }
})

// --------- 关系图相关 ---------

// 读取关系图列表
ipcMain.handle('read-relationships', async (event, bookName) => {
  try {
    const booksDir = await store.get('booksDir')
    if (!booksDir) {
      throw new Error('未设置书籍目录')
    }
    const bookPath = join(booksDir, bookName)
    const relationshipsDir = join(bookPath, 'relationships')
    if (!fs.existsSync(relationshipsDir)) {
      fs.mkdirSync(relationshipsDir, { recursive: true })
      return []
    }
    const files = fs.readdirSync(relationshipsDir)
    const relationships = files
      .filter((file) => file.endsWith('.json'))
      .map((file) => {
        const name = file.replace('.json', '')
        const jsonPath = join(relationshipsDir, `${name}.json`)
        const pngPath = join(relationshipsDir, `${name}.png`)

        let relationshipData = {}
        let thumbnail = ''

        try {
          // 读取JSON数据
          relationshipData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
        } catch (error) {
          console.error(`读取关系图数据失败: ${name}`, error)
          relationshipData = {
            id: name,
            name: name,
            description: '',
            nodes: [],
            lines: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }

        // 检查PNG缩略图是否存在
        if (fs.existsSync(pngPath)) {
          thumbnail = `${name}.png`
        }

        return {
          id: relationshipData.id || name,
          name: relationshipData.name || name,
          description: relationshipData.description || '',
          thumbnail: thumbnail,
          nodes: relationshipData.nodes || [],
          lines: relationshipData.lines || [],
          createdAt: relationshipData.createdAt || new Date().toISOString(),
          updatedAt: relationshipData.updatedAt || new Date().toISOString()
        }
      })
    return relationships
  } catch (error) {
    console.error('读取关系图列表失败:', error)
    throw error
  }
})

// 读取关系图数据
ipcMain.handle('read-relationship-data', async (event, { bookName, relationshipName }) => {
  try {
    const booksDir = await store.get('booksDir')
    if (!booksDir) {
      throw new Error('未设置书籍目录')
    }
    const bookPath = join(booksDir, bookName)
    const relationshipsDir = join(bookPath, 'relationships')
    const jsonPath = join(relationshipsDir, `${relationshipName}.json`)

    if (!fs.existsSync(jsonPath)) {
      return null
    }

    const relationshipData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
    return relationshipData
  } catch (error) {
    console.error('读取关系图数据失败:', error)
    throw error
  }
})

// 创建关系图
ipcMain.handle(
  'create-relationship',
  async (event, { bookName, relationshipName, relationshipData }) => {
    try {
      const booksDir = await store.get('booksDir')
      if (!booksDir) {
        throw new Error('未设置书籍目录')
      }
      const bookPath = join(booksDir, bookName)
      const relationshipsDir = join(bookPath, 'relationships')

      if (!fs.existsSync(relationshipsDir)) {
        fs.mkdirSync(relationshipsDir, { recursive: true })
      }

      // 检查同名文件
      const jsonPath = join(relationshipsDir, `${relationshipName}.json`)

      if (fs.existsSync(jsonPath)) {
        throw new Error('已存在同名关系图')
      }

      // 只保存JSON数据，不创建PNG文件
      fs.writeFileSync(jsonPath, JSON.stringify(relationshipData, null, 2), 'utf-8')

      return { success: true }
    } catch (error) {
      console.error('创建关系图失败:', error)
      throw error
    }
  }
)

// 保存关系图数据
ipcMain.handle(
  'save-relationship-data',
  async (event, { bookName, relationshipName, relationshipData }) => {
    try {
      const booksDir = await store.get('booksDir')
      if (!booksDir) {
        throw new Error('未设置书籍目录')
      }
      const bookPath = join(booksDir, bookName)
      const relationshipsDir = join(bookPath, 'relationships')

      if (!fs.existsSync(relationshipsDir)) {
        fs.mkdirSync(relationshipsDir, { recursive: true })
      }

      const jsonPath = join(relationshipsDir, `${relationshipName}.json`)

      // 保存JSON数据
      fs.writeFileSync(jsonPath, JSON.stringify(relationshipData, null, 2), 'utf-8')

      return { success: true }
    } catch (error) {
      console.error('保存关系图数据失败:', error)
      throw error
    }
  }
)

// 更新关系图缩略图
ipcMain.handle(
  'update-relationship-thumbnail',
  async (event, { bookName, relationshipName, thumbnailData }) => {
    try {
      const booksDir = await store.get('booksDir')
      if (!booksDir) {
        throw new Error('未设置书籍目录')
      }
      const bookPath = join(booksDir, bookName)
      const relationshipsDir = join(bookPath, 'relationships')
      const pngPath = join(relationshipsDir, `${relationshipName}.png`)

      if (!fs.existsSync(relationshipsDir)) {
        fs.mkdirSync(relationshipsDir, { recursive: true })
      }

      // 保存PNG缩略图
      if (thumbnailData) {
        const base64Data = thumbnailData.replace(/^data:image\/\w+;base64,/, '')
        const buffer = Buffer.from(base64Data, 'base64')
        fs.writeFileSync(pngPath, buffer)
      }

      return { success: true }
    } catch (error) {
      console.error('更新关系图缩略图失败:', error)
      throw error
    }
  }
)

// 删除关系图
ipcMain.handle('delete-relationship', async (event, { bookName, relationshipName }) => {
  try {
    const booksDir = await store.get('booksDir')
    if (!booksDir) {
      throw new Error('未设置书籍目录')
    }
    const bookPath = join(booksDir, bookName)
    const relationshipsDir = join(bookPath, 'relationships')
    const jsonPath = join(relationshipsDir, `${relationshipName}.json`)
    const pngPath = join(relationshipsDir, `${relationshipName}.png`)

    // 删除JSON文件
    if (fs.existsSync(jsonPath)) {
      fs.unlinkSync(jsonPath)
    }

    // 删除PNG文件
    if (fs.existsSync(pngPath)) {
      fs.unlinkSync(pngPath)
    }

    return { success: true }
  } catch (error) {
    console.error('删除关系图失败:', error)
    throw error
  }
})

// 读取关系图图片
ipcMain.handle('read-relationship-image', async (event, { bookName, imageName }) => {
  try {
    const booksDir = await store.get('booksDir')
    if (!booksDir) {
      throw new Error('未设置书籍目录')
    }
    const bookPath = join(booksDir, bookName)
    const relationshipsDir = join(bookPath, 'relationships')
    const imagePath = join(relationshipsDir, imageName)

    if (!fs.existsSync(imagePath)) {
      throw new Error('图片文件不存在')
    }

    const data = fs.readFileSync(imagePath)
    return `data:image/png;base64,${data.toString('base64')}`
  } catch (error) {
    console.error('读取关系图图片失败:', error)
    throw error
  }
})

// --------- 组织架构相关 ---------

// 读取组织架构列表
ipcMain.handle('read-organizations', async (event, { bookName }) => {
  try {
    const booksDir = await store.get('booksDir')
    if (!booksDir) {
      throw new Error('未设置书籍目录')
    }
    const bookPath = join(booksDir, bookName)
    const organizationsDir = join(bookPath, 'organizations')
    if (!fs.existsSync(organizationsDir)) {
      fs.mkdirSync(organizationsDir, { recursive: true })
      return { success: true, data: [] }
    }
    const files = fs.readdirSync(organizationsDir)
    const organizations = files
      .filter((file) => file.endsWith('.json'))
      .map((file) => {
        const name = file.replace('.json', '')
        const jsonPath = join(organizationsDir, `${name}.json`)
        const pngPath = join(organizationsDir, `${name}.png`)

        let organizationData = {}
        let thumbnail = ''

        try {
          // 读取JSON数据
          organizationData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
        } catch (error) {
          console.error(`读取组织架构数据失败: ${name}`, error)
          organizationData = {
            id: name,
            name: name,
            description: '',
            nodes: [],
            lines: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }

        // 检查PNG缩略图是否存在
        if (fs.existsSync(pngPath)) {
          thumbnail = `${name}.png`
        }

        return {
          id: organizationData.id || name,
          name: organizationData.name || name,
          description: organizationData.description || '',
          thumbnail: thumbnail,
          nodes: organizationData.nodes || [],
          lines: organizationData.lines || [],
          createdAt: organizationData.createdAt || new Date().toISOString(),
          updatedAt: organizationData.updatedAt || new Date().toISOString()
        }
      })
    return { success: true, data: organizations }
  } catch (error) {
    console.error('读取组织架构列表失败:', error)
    return { success: false, error: error.message }
  }
})

// 读取组织架构数据
ipcMain.handle('read-organization', async (event, { bookName, organizationName }) => {
  try {
    const booksDir = await store.get('booksDir')
    if (!booksDir) {
      throw new Error('未设置书籍目录')
    }
    const bookPath = join(booksDir, bookName)
    const organizationsDir = join(bookPath, 'organizations')
    const jsonPath = join(organizationsDir, `${organizationName}.json`)

    if (!fs.existsSync(jsonPath)) {
      return { success: false, error: '组织架构不存在' }
    }

    const organizationData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
    return { success: true, data: organizationData }
  } catch (error) {
    console.error('读取组织架构数据失败:', error)
    return { success: false, error: error.message }
  }
})

// 创建组织架构
ipcMain.handle(
  'create-organization',
  async (event, { bookName, organizationName, organizationData }) => {
    try {
      const booksDir = await store.get('booksDir')
      if (!booksDir) {
        throw new Error('未设置书籍目录')
      }
      const bookPath = join(booksDir, bookName)
      const organizationsDir = join(bookPath, 'organizations')

      if (!fs.existsSync(organizationsDir)) {
        fs.mkdirSync(organizationsDir, { recursive: true })
      }

      // 检查同名文件
      const jsonPath = join(organizationsDir, `${organizationName}.json`)

      if (fs.existsSync(jsonPath)) {
        throw new Error('已存在同名组织架构')
      }

      // 保存JSON数据
      fs.writeFileSync(jsonPath, JSON.stringify(organizationData, null, 2), 'utf-8')

      return { success: true }
    } catch (error) {
      console.error('创建组织架构失败:', error)
      throw error
    }
  }
)

// 保存组织架构数据
ipcMain.handle(
  'write-organization',
  async (event, { bookName, organizationName, organizationData }) => {
    try {
      const booksDir = await store.get('booksDir')
      if (!booksDir) {
        throw new Error('未设置书籍目录')
      }
      const bookPath = join(booksDir, bookName)
      const organizationsDir = join(bookPath, 'organizations')

      if (!fs.existsSync(organizationsDir)) {
        fs.mkdirSync(organizationsDir, { recursive: true })
      }

      const jsonPath = join(organizationsDir, `${organizationName}.json`)

      // 保存JSON数据
      fs.writeFileSync(jsonPath, JSON.stringify(organizationData, null, 2), 'utf-8')

      return { success: true }
    } catch (error) {
      console.error('保存组织架构数据失败:', error)
      throw error
    }
  }
)

// 更新组织架构缩略图
ipcMain.handle(
  'update-organization-thumbnail',
  async (event, { bookName, organizationId, thumbnailData }) => {
    try {
      const booksDir = await store.get('booksDir')
      if (!booksDir) {
        throw new Error('未设置书籍目录')
      }
      const bookPath = join(booksDir, bookName)
      const organizationsDir = join(bookPath, 'organizations')
      const pngPath = join(organizationsDir, `${organizationId}.png`)

      if (!fs.existsSync(organizationsDir)) {
        fs.mkdirSync(organizationsDir, { recursive: true })
      }

      // 保存PNG缩略图
      if (thumbnailData) {
        const base64Data = thumbnailData.replace(/^data:image\/\w+;base64,/, '')
        const buffer = Buffer.from(base64Data, 'base64')
        fs.writeFileSync(pngPath, buffer)
      }

      return { success: true }
    } catch (error) {
      console.error('更新组织架构缩略图失败:', error)
      throw error
    }
  }
)

// 读取组织架构图片
ipcMain.handle('read-organization-image', async (event, { bookName, imageName }) => {
  try {
    const booksDir = await store.get('booksDir')
    if (!booksDir) {
      throw new Error('未设置书籍目录')
    }
    const bookPath = join(booksDir, bookName)
    const organizationsDir = join(bookPath, 'organizations')
    const imagePath = join(organizationsDir, imageName)

    if (!fs.existsSync(imagePath)) {
      throw new Error('图片文件不存在')
    }

    const data = fs.readFileSync(imagePath)
    return `data:image/png;base64,${data.toString('base64')}`
  } catch (error) {
    console.error('读取组织架构图片失败:', error)
    throw error
  }
})

// 删除组织架构
ipcMain.handle('delete-organization', async (event, { bookName, organizationName }) => {
  try {
    const booksDir = await store.get('booksDir')
    if (!booksDir) {
      throw new Error('未设置书籍目录')
    }
    const bookPath = join(booksDir, bookName)
    const organizationsDir = join(bookPath, 'organizations')
    const jsonPath = join(organizationsDir, `${organizationName}.json`)
    const pngPath = join(organizationsDir, `${organizationName}.png`)

    // 删除JSON文件
    if (fs.existsSync(jsonPath)) {
      fs.unlinkSync(jsonPath)
    }

    // 删除PNG文件
    if (fs.existsSync(pngPath)) {
      fs.unlinkSync(pngPath)
    }

    return { success: true }
  } catch (error) {
    console.error('删除组织架构失败:', error)
    throw error
  }
})

// --------- 禁词管理相关 ---------

// 获取禁词列表
ipcMain.handle('get-banned-words', async (event, bookName) => {
  try {
    const booksDir = store.get('booksDir')
    if (!booksDir || !bookName) {
      return { success: false, message: '参数错误' }
    }
    const bannedWordsPath = join(booksDir, bookName, 'banned-words.json')
    if (!fs.existsSync(bannedWordsPath)) {
      return { success: true, data: [] }
    }
    const data = JSON.parse(fs.readFileSync(bannedWordsPath, 'utf-8'))
    return { success: true, data: data.words || [] }
  } catch (error) {
    console.error('获取禁词列表失败:', error)
    return { success: false, message: error.message }
  }
})

// 添加禁词
ipcMain.handle('add-banned-word', async (event, bookName, word) => {
  try {
    const booksDir = store.get('booksDir')
    if (!booksDir || !bookName || !word) {
      return { success: false, message: '参数错误' }
    }
    const bannedWordsPath = join(booksDir, bookName, 'banned-words.json')
    let data = { words: [] }
    if (fs.existsSync(bannedWordsPath)) {
      data = JSON.parse(fs.readFileSync(bannedWordsPath, 'utf-8'))
    }
    if (!data.words) {
      data.words = []
    }
    // 检查是否已存在
    if (data.words.includes(word)) {
      return { success: false, message: '该禁词已存在' }
    }
    // 新增禁词插入到数组开头，使最新的显示在前面
    data.words.unshift(word)
    fs.writeFileSync(bannedWordsPath, JSON.stringify(data, null, 2), 'utf-8')
    return { success: true }
  } catch (error) {
    console.error('添加禁词失败:', error)
    return { success: false, message: error.message }
  }
})

// 删除禁词
ipcMain.handle('remove-banned-word', async (event, bookName, word) => {
  try {
    const booksDir = store.get('booksDir')
    if (!booksDir || !bookName || !word) {
      return { success: false, message: '参数错误' }
    }
    const bannedWordsPath = join(booksDir, bookName, 'banned-words.json')
    if (!fs.existsSync(bannedWordsPath)) {
      return { success: false, message: '禁词文件不存在' }
    }
    const data = JSON.parse(fs.readFileSync(bannedWordsPath, 'utf-8'))
    const index = data.words.indexOf(word)
    if (index === -1) {
      return { success: false, message: '禁词不存在' }
    }
    data.words.splice(index, 1)
    fs.writeFileSync(bannedWordsPath, JSON.stringify(data, null, 2), 'utf-8')
    return { success: true }
  } catch (error) {
    console.error('删除禁词失败:', error)
    return { success: false, message: error.message }
  }
})

// --------- 自动更新相关 ---------

// 手动检查更新
ipcMain.handle('check-for-update', async () => {
  if (is.dev) {
    return { success: false, message: '开发环境不支持更新检查' }
  }
  try {
    await autoUpdater.checkForUpdates()
    return { success: true }
  } catch (error) {
    console.error('检查更新失败:', error)
    return { success: false, message: error.message || '检查更新失败' }
  }
})

// 下载更新
ipcMain.handle('download-update', async () => {
  if (is.dev) {
    return { success: false, message: '开发环境不支持更新下载' }
  }
  try {
    await autoUpdater.downloadUpdate()
    return { success: true }
  } catch (error) {
    console.error('下载更新失败:', error)
    return { success: false, message: error.message || '下载更新失败' }
  }
})

// 安装更新并重启应用
ipcMain.handle('quit-and-install', async () => {
  if (is.dev) {
    return { success: false, message: '开发环境不支持更新安装' }
  }
  try {
    autoUpdater.quitAndInstall(false, true)
    return { success: true }
  } catch (error) {
    console.error('安装更新失败:', error)
    return { success: false, message: error.message || '安装更新失败' }
  }
})

// 获取当前版本
ipcMain.handle('get-app-version', async () => {
  return { version: app.getVersion() }
})

// --------- DeepSeek AI 相关 ---------

// 初始化 DeepSeek 服务（从 store 读取 API Key）
deepseekService.initApiKey((key) => store.get(key))

// 设置 DeepSeek API Key
ipcMain.handle('deepseek:set-api-key', async (_, apiKey) => {
  try {
    deepseekService.setApiKey(apiKey)
    // 保存到 store
    store.set('deepseek.apiKey', apiKey)
    return { success: true }
  } catch (error) {
    console.error('设置 DeepSeek API Key 失败:', error)
    return { success: false, message: error.message }
  }
})

// 获取 DeepSeek API Key
ipcMain.handle('deepseek:get-api-key', async () => {
  try {
    const apiKey = await deepseekService.getApiKey()
    // 如果服务中没有，从 store 读取
    if (!apiKey) {
      const storedKey = store.get('deepseek.apiKey', null)
      if (storedKey) {
        deepseekService.setApiKey(storedKey)
        return { success: true, apiKey: storedKey }
      }
    }
    return { success: true, apiKey: apiKey || null }
  } catch (error) {
    console.error('获取 DeepSeek API Key 失败:', error)
    return { success: false, message: error.message }
  }
})

// AI 随机起名
ipcMain.handle('deepseek:generate-names', async (_, options) => {
  try {
    // 确保 API Key 已初始化
    await deepseekService.initApiKey((key) => store.get(key))
    const names = await deepseekService.generateNames(options)
    return { success: true, names }
  } catch (error) {
    console.error('AI 起名失败:', error)
    return { success: false, message: error.message, names: [] }
  }
})

// 验证 API Key
ipcMain.handle('deepseek:validate-api-key', async () => {
  try {
    // 确保 API Key 已初始化
    await deepseekService.initApiKey((key) => store.get(key))
    const result = await deepseekService.validateApiKey()
    return { success: true, isValid: result.isValid, message: result.message }
  } catch (error) {
    console.error('验证 API Key 失败:', error)
    return {
      success: false,
      isValid: false,
      message: error.message || '验证过程中发生未知错误'
    }
  }
})

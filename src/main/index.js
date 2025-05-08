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

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1050,
    height: 800,
    minWidth: 1050,
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
  const bookPath = join(bookInfo.dir, safeName)
  if (!fs.existsSync(bookPath)) {
    fs.mkdirSync(bookPath)
  }
  // 2. 写入 mazi.json
  const meta = { ...bookInfo, createdAt: Date.now(), updatedAt: Date.now() }
  fs.writeFileSync(join(bookPath, 'mazi.json'), JSON.stringify(meta, null, 2), 'utf-8')
  return true
})

// 读取书籍目录
ipcMain.handle('read-books-dir', async (event, dir) => {
  const books = []
  if (!fs.existsSync(dir)) return books
  const files = fs.readdirSync(dir, { withFileTypes: true })
  for (const file of files) {
    if (file.isDirectory()) {
      const metaPath = join(dir, file.name, 'mazi.json')
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
ipcMain.handle('delete-book', async (event, { dir, name }) => {
  const bookPath = join(dir, name)
  if (fs.existsSync(bookPath)) {
    fs.rmSync(bookPath, { recursive: true })
    return true
  }
  return false
})

// 编辑书籍
ipcMain.handle('edit-book', async (event, bookInfo) => {
  const bookPath = join(bookInfo.dir, bookInfo.name)
  if (fs.existsSync(bookPath)) {
    fs.writeFileSync(join(bookPath, 'mazi.json'), JSON.stringify(bookInfo, null, 2), 'utf-8')
    return true
  }
  return false
})

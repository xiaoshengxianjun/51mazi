import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', {
      ...electronAPI,
      // 选择书籍目录
      selectBooksDir: () => ipcRenderer.invoke('select-books-dir'),
      // 创建书籍
      createBook: (bookInfo) => ipcRenderer.invoke('create-book', bookInfo),
      // 读取书籍目录
      readBooksDir: (dir) => ipcRenderer.invoke('read-books-dir', dir),
      // 删除书籍
      deleteBook: (dir, name) => ipcRenderer.invoke('delete-book', { dir, name }),
      // 编辑书籍
      editBook: (bookInfo) => ipcRenderer.invoke('edit-book', bookInfo)
    })
    contextBridge.exposeInMainWorld('api', api)
    // 存储
    contextBridge.exposeInMainWorld('electronStore', {
      get: (key) => ipcRenderer.invoke('store:get', key),
      set: (key, value) => ipcRenderer.invoke('store:set', key, value),
      delete: (key) => ipcRenderer.invoke('store:delete', key)
    })
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
  window.electronStore = {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
    delete: (key) => ipcRenderer.invoke('store:delete', key)
  }
}

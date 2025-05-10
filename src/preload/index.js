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
      readBooksDir: () => ipcRenderer.invoke('read-books-dir'),
      // 删除书籍
      deleteBook: (name) => ipcRenderer.invoke('delete-book', { name }),
      // 编辑书籍
      editBook: (bookInfo) => ipcRenderer.invoke('edit-book', bookInfo),
      // 编辑器新窗口打开
      openBookEditorWindow: (id, name) =>
        ipcRenderer.invoke('open-book-editor-window', { id, name }),
      // 创建卷
      createVolume: (bookName) => ipcRenderer.invoke('create-volume', bookName),
      // 创建章节
      createChapter: (bookName, volumeId) =>
        ipcRenderer.invoke('create-chapter', { bookName, volumeId }),
      // 加载章节数据
      loadChapters: (bookName) => ipcRenderer.invoke('load-chapters', bookName),
      // 编辑节点
      editNode: (bookName, nodeId, newName) =>
        ipcRenderer.invoke('edit-node', { bookName, nodeId, newName }),
      // 删除节点
      deleteNode: (bookName, nodeId) => ipcRenderer.invoke('delete-node', { bookName, nodeId })
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

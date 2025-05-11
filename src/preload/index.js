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
      editNode: (bookName, payload) => ipcRenderer.invoke('edit-node', { bookName, ...payload }),
      // 删除节点
      deleteNode: (bookName, payload) =>
        ipcRenderer.invoke('delete-node', { bookName, ...payload }),
      // 获取书籍排序
      getSortOrder: (bookName) => ipcRenderer.invoke('get-sort-order', bookName),
      // 设置书籍排序
      setSortOrder: (bookName, order) => ipcRenderer.invoke('set-sort-order', { bookName, order }),
      // 加载笔记数据
      loadNotes: (bookName) => ipcRenderer.invoke('load-notes', bookName),
      // 笔记本和笔记的增删改查
      createNotebook: (bookName) => ipcRenderer.invoke('create-notebook', { bookName }),
      deleteNotebook: (bookName, notebookName) =>
        ipcRenderer.invoke('delete-notebook', { bookName, notebookName }),
      renameNotebook: (bookName, oldName, newName) =>
        ipcRenderer.invoke('rename-notebook', { bookName, oldName, newName }),
      createNote: (bookName, notebookName, noteName) =>
        ipcRenderer.invoke('create-note', { bookName, notebookName, noteName }),
      deleteNote: (bookName, notebookName, noteName) =>
        ipcRenderer.invoke('delete-note', { bookName, notebookName, noteName }),
      renameNote: (bookName, notebookName, oldName, newName) =>
        ipcRenderer.invoke('rename-note', { bookName, notebookName, oldName, newName }),
      readNote: (bookName, notebookName, noteName) =>
        ipcRenderer.invoke('read-note', { bookName, notebookName, noteName }),
      editNote: (bookName, notebookName, noteName, content) =>
        ipcRenderer.invoke('edit-note', { bookName, notebookName, noteName, content })
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

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
      // --------- 书籍相关 ---------
      // 选择书籍目录
      selectBooksDir: () => ipcRenderer.invoke('select-books-dir'),
      // 选择图片文件
      selectImage: () => ipcRenderer.invoke('select-image'),
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

      // --------- 节点相关 ---------
      // 编辑节点
      editNode: (bookName, payload) => ipcRenderer.invoke('edit-node', { bookName, ...payload }),
      // 删除节点
      deleteNode: (bookName, payload) =>
        ipcRenderer.invoke('delete-node', { bookName, ...payload }),
      // 获取书籍排序
      getSortOrder: (bookName) => ipcRenderer.invoke('get-sort-order', bookName),
      // 设置书籍排序
      setSortOrder: (bookName, order) => ipcRenderer.invoke('set-sort-order', { bookName, order }),

      // 获取章节设置
      getChapterSettings: (bookName) => ipcRenderer.invoke('get-chapter-settings', bookName),

      // 更新章节格式
      updateChapterFormat: (bookName, settings) =>
        ipcRenderer.invoke('update-chapter-format', { bookName, settings }),

      // 重新格式化章节编号
      reformatChapterNumbers: (bookName, volumeName, settings) =>
        ipcRenderer.invoke('reformat-chapter-numbers', { bookName, volumeName, settings }),

      // --------- 笔记本相关 ---------
      // 笔记本和笔记的增删改查
      createNotebook: (bookName) => ipcRenderer.invoke('create-notebook', { bookName }),
      // 删除笔记本
      deleteNotebook: (bookName, notebookName) =>
        ipcRenderer.invoke('delete-notebook', { bookName, notebookName }),
      // 重命名笔记本
      renameNotebook: (bookName, oldName, newName) =>
        ipcRenderer.invoke('rename-notebook', { bookName, oldName, newName }),

      // --------- 笔记相关 ---------
      // 加载笔记数据
      loadNotes: (bookName) => ipcRenderer.invoke('load-notes', bookName),
      // 创建笔记
      createNote: (bookName, notebookName, noteName) =>
        ipcRenderer.invoke('create-note', { bookName, notebookName, noteName }),
      // 删除笔记
      deleteNote: (bookName, notebookName, noteName) =>
        ipcRenderer.invoke('delete-note', { bookName, notebookName, noteName }),
      // 重命名笔记
      renameNote: (bookName, notebookName, oldName, newName) =>
        ipcRenderer.invoke('rename-note', { bookName, notebookName, oldName, newName }),
      // 读取笔记内容
      readNote: (bookName, notebookName, noteName) =>
        ipcRenderer.invoke('read-note', { bookName, notebookName, noteName }),
      // 编辑笔记内容
      editNote: (noteInfo) => ipcRenderer.invoke('edit-note', noteInfo),

      // --------- 章节相关 ---------
      // 读取章节内容
      readChapter: (bookName, volumeName, chapterName) =>
        ipcRenderer.invoke('read-chapter', { bookName, volumeName, chapterName }),
      // 保存章节内容
      saveChapter: (chapterInfo) => ipcRenderer.invoke('save-chapter', chapterInfo),

      // --------- 统计相关 ---------
      // 获取书籍字数统计
      getBookWordCount: (bookName) => ipcRenderer.invoke('get-book-word-count', bookName),
      // 获取每日码字统计
      getDailyWordCount: () => ipcRenderer.invoke('get-daily-word-count'),
      // 获取章节统计信息
      getChapterStats: (bookName, volumeName, chapterName) =>
        ipcRenderer.invoke('get-chapter-stats', { bookName, volumeName, chapterName }),
      // 新增：获取书籍每日净增字数统计
      getBookDailyStats: (bookName) => ipcRenderer.invoke('get-book-daily-stats', bookName),
      // 新增：获取所有书籍的每日净增字数统计
      getAllBooksDailyStats: () => ipcRenderer.invoke('get-all-books-daily-stats'),

      // --------- 时间线相关 ---------
      // 读取时间线数据
      readTimeline: (bookName) => ipcRenderer.invoke('read-timeline', { bookName }),
      // 保存时间线数据
      writeTimeline: (bookName, data) => ipcRenderer.invoke('write-timeline', { bookName, data }),

      // --------- 地图相关 ---------
      // 读取地图列表
      readMaps: (bookName) => ipcRenderer.invoke('read-maps', bookName),
      // 保存地图
      createMap: (data) => ipcRenderer.invoke('create-map', data),
      // 更新地图
      updateMap: (data) => ipcRenderer.invoke('update-map', data),
      // 读取地图图片为base64
      readMapImage: ({ bookName, mapName }) =>
        ipcRenderer.invoke('read-map-image', { bookName, mapName }),
      // 删除地图
      deleteMap: ({ bookName, mapName }) => ipcRenderer.invoke('delete-map', { bookName, mapName }),

      // --------- 人物谱相关 ---------
      // 读取人物谱数据
      readCharacters: (bookName) => ipcRenderer.invoke('read-characters', { bookName }),
      // 保存人物谱数据
      writeCharacters: (bookName, data) =>
        ipcRenderer.invoke('write-characters', { bookName, data }),

      // --------- 词条字典相关 ---------
      // 读取词条字典数据
      readDictionary: (bookName) => ipcRenderer.invoke('read-dictionary', { bookName }),
      // 保存词条字典数据
      writeDictionary: (bookName, data) =>
        ipcRenderer.invoke('write-dictionary', { bookName, data }),

      // --------- 事序图相关 ---------
      // 读取事序图数据
      readSequenceCharts: (bookName) => ipcRenderer.invoke('read-sequence-charts', { bookName }),
      // 保存事序图数据
      writeSequenceCharts: (bookName, data) =>
        ipcRenderer.invoke('write-sequence-charts', { bookName, data }),

      // --------- 关系图相关 ---------
      // 读取关系图列表
      readRelationships: (bookName) => ipcRenderer.invoke('read-relationships', bookName),
      // 读取关系图数据
      readRelationshipData: (bookName, relationshipName) =>
        ipcRenderer.invoke('read-relationship-data', { bookName, relationshipName }),
      // 创建关系图
      createRelationship: (data) => ipcRenderer.invoke('create-relationship', data),
      // 保存关系图数据
      saveRelationshipData: (bookName, relationshipName, relationshipData) =>
        ipcRenderer.invoke('save-relationship-data', {
          bookName,
          relationshipName,
          relationshipData
        }),
      // 更新关系图缩略图
      updateRelationshipThumbnail: (data) =>
        ipcRenderer.invoke('update-relationship-thumbnail', data),
      // 删除关系图
      deleteRelationship: ({ bookName, relationshipName }) =>
        ipcRenderer.invoke('delete-relationship', { bookName, relationshipName }),
      // 读取关系图图片
      readRelationshipImage: ({ bookName, imageName }) =>
        ipcRenderer.invoke('read-relationship-image', { bookName, imageName })
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

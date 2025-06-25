import { contextBridge, ipcRenderer } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('electronAPI', {
  // 基础API
  platform: process.platform,
  
  // 书籍相关
  selectBooksDir: () => ipcRenderer.invoke('select-books-dir'),
  createBook: (bookInfo) => ipcRenderer.invoke('create-book', bookInfo),
  readBooksDir: () => ipcRenderer.invoke('read-books-dir'),
  deleteBook: (bookInfo) => ipcRenderer.invoke('delete-book', bookInfo),
  editBook: (bookInfo) => ipcRenderer.invoke('edit-book', bookInfo),
  
  // 章节相关
  readChapters: (bookName) => ipcRenderer.invoke('read-chapters', { bookName }),
  createChapter: (bookName, volumeName, chapterName) => 
    ipcRenderer.invoke('create-chapter', { bookName, volumeName, chapterName }),
  deleteChapter: (bookName, volumeName, chapterName) => 
    ipcRenderer.invoke('delete-chapter', { bookName, volumeName, chapterName }),
  readChapterContent: (bookName, volumeName, chapterName) => 
    ipcRenderer.invoke('read-chapter-content', { bookName, volumeName, chapterName }),
  writeChapterContent: (bookName, volumeName, chapterName, content) => 
    ipcRenderer.invoke('write-chapter-content', { bookName, volumeName, chapterName, content }),
  renameChapter: (bookName, volumeName, chapterName, newName) => 
    ipcRenderer.invoke('rename-chapter', { bookName, volumeName, chapterName, newName }),
  
  // 卷相关
  createVolume: (bookName, volumeName) => 
    ipcRenderer.invoke('create-volume', { bookName, volumeName }),
  deleteVolume: (bookName, volumeName) => 
    ipcRenderer.invoke('delete-volume', { bookName, volumeName }),
  renameVolume: (bookName, volumeName, newName) => 
    ipcRenderer.invoke('rename-volume', { bookName, volumeName, newName }),
  
  // 笔记相关
  readNotes: (bookName) => ipcRenderer.invoke('read-notes', { bookName }),
  createNote: (bookName, notePath, noteName) => 
    ipcRenderer.invoke('create-note', { bookName, notePath, noteName }),
  deleteNote: (bookName, notePath) => 
    ipcRenderer.invoke('delete-note', { bookName, notePath }),
  readNoteContent: (bookName, notePath) => 
    ipcRenderer.invoke('read-note-content', { bookName, notePath }),
  writeNoteContent: (bookName, notePath, content) => 
    ipcRenderer.invoke('write-note-content', { bookName, notePath, content }),
  renameNote: (bookName, notePath, newName) => 
    ipcRenderer.invoke('rename-note', { bookName, notePath, newName }),
  
  // 统计相关
  getDailyWordCount: () => ipcRenderer.invoke('get-daily-word-count'),
  getChapterStats: (bookName, volumeName, chapterName) => 
    ipcRenderer.invoke('get-chapter-stats', { bookName, volumeName, chapterName }),
  
  // 时间线相关
  readTimeline: (bookName) => ipcRenderer.invoke('read-timeline', { bookName }),
  writeTimeline: (bookName, data) => ipcRenderer.invoke('write-timeline', { bookName, data }),
  
  // 人物谱相关
  readCharacters: (bookName) => ipcRenderer.invoke('read-characters', { bookName }),
  writeCharacters: (bookName, data) => ipcRenderer.invoke('write-characters', { bookName, data }),
  
  // 地图相关
  readMaps: (bookName) => ipcRenderer.invoke('read-maps', bookName),
  readMapImage: (bookName, mapName) => ipcRenderer.invoke('read-map-image', { bookName, mapName }),
  createMap: (bookName, mapName, imageData) => ipcRenderer.invoke('create-map', { bookName, mapName, imageData }),
  updateMap: (bookName, mapName, imageData) => ipcRenderer.invoke('update-map', { bookName, mapName, imageData }),
  deleteMap: (bookName, mapName) => ipcRenderer.invoke('delete-map', { bookName, mapName }),
  
  // 配置相关
  store: {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
    delete: (key) => ipcRenderer.invoke('store:delete', key)
  }
})

// 为了兼容性，保留原有的 electron 对象
contextBridge.exposeInMainWorld('electron', {
  readTimeline: (bookName) => ipcRenderer.invoke('read-timeline', { bookName }),
  writeTimeline: (bookName, data) => ipcRenderer.invoke('write-timeline', { bookName, data }),
  readCharacters: (bookName) => ipcRenderer.invoke('read-characters', { bookName }),
  writeCharacters: (bookName, data) => ipcRenderer.invoke('write-characters', { bookName, data }),
  readMaps: (bookName) => ipcRenderer.invoke('read-maps', bookName),
  readMapImage: (bookName, mapName) => ipcRenderer.invoke('read-map-image', { bookName, mapName }),
  createMap: (bookName, mapName, imageData) => ipcRenderer.invoke('create-map', { bookName, mapName, imageData }),
  updateMap: (bookName, mapName, imageData) => ipcRenderer.invoke('update-map', { bookName, mapName, imageData }),
  deleteMap: (bookName, mapName) => ipcRenderer.invoke('delete-map', { bookName, mapName })
}) 
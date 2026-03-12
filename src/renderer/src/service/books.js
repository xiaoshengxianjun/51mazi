// 书籍相关操作服务

import { useMainStore } from '../stores'

/**
 * 获取全局书籍目录 bookDir
 * @returns {Promise<string>}
 */
export async function getBookDir() {
  return await window.electronStore.get('booksDir')
}

/**
 * 创建书籍
 * @param {Object} bookInfo
 * @returns {Promise<any>}
 */
export function createBook(bookInfo) {
  return window.electron.createBook(bookInfo)
}

/**
 * 更新书籍（调用主进程 editBook）
 * @param {Object} param0 {dir, id, ...bookInfo}
 * @returns {Promise<any>}
 */
export function updateBook(bookInfo) {
  return window.electron.editBook(bookInfo)
}

/**
 * 读取书籍目录下所有书籍，并自动存入 pinia
 * @returns {Promise<Array>}
 */
export async function readBooksDir() {
  const mainStore = useMainStore()
  const books = await window.electron.readBooksDir()
  mainStore.setBooks(books)
  return books
}

/**
 * 删除书籍（假设主进程有 delete-book 处理）
 * @param {string} name 书籍名称
 * @returns {Promise<any>}
 */
export async function deleteBook(name) {
  return window.electron.deleteBook(name)
}

import { defineStore } from 'pinia'

export const useMainStore = defineStore('main', {
  state: () => ({
    books: []
  }),
  actions: {
    setBooks(books) {
      this.books = books
    }
  },
  getters: {
    // 在这里定义你的 getters
  }
})

import Store from 'electron-store'

// 创建 store 实例
const store = new Store({
  // 可以设置加密
  // encryptionKey: 'your-encryption-key',

  // 设置默认值
  defaults: {
    config: {
      theme: 'light'
      // 其他默认配置...
    }
  }
})

export default store

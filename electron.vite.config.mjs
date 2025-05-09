import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    // 添加主进程热重载配置
    watch: {
      // 监听主进程文件变化
      include: ['src/main/*'],
      // 忽略 node_modules
      ignored: ['**/node_modules/**', '**/dist/**']
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [
      vue(),
      AutoImport({
        // 自动导入 Element Plus 相关函数
        resolvers: [ElementPlusResolver()]
      }),
      Components({
        resolvers: [
          // 自动导入 Element Plus 组件
          ElementPlusResolver({
            // 开启图标组件的自动导入
            importStyle: 'css',
            enableVueDiscover: true
          })
        ]
      })
    ]
  }
})

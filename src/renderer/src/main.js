import './assets/styles/variables.scss'
import './assets/styles/icons.scss'
import './assets/main.css'
// 引入 iconfont SVG 图标（必须在应用初始化前加载）
import './assets/icons/iconfont.js'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import router from './router'
import App from './App.vue'
import { useThemeStore } from './stores/theme'
import IconFont from './components/IconFont.vue'
import SvgIcon from './components/SvgIcon.vue'

const app = createApp(App)
const pinia = createPinia()

app.use(ElementPlus)
app.use(pinia)
app.use(router)

// 全局注册图标组件
app.component('IconFont', IconFont)
app.component('SvgIcon', SvgIcon)

// 初始化主题
const themeStore = useThemeStore()
themeStore.initTheme()

app.mount('#app')

import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const currentTheme = ref('light')

  // 初始化主题
  const initTheme = async () => {
    const theme = await window.electronStore.get('config.theme')
    if (theme) {
      currentTheme.value = theme
      applyTheme(theme)
    }
  }

  // 应用主题
  const applyTheme = (theme) => {
    const root = document.documentElement
    switch (theme) {
      case 'dark':
        root.style.setProperty('--bg-primary', '#1A1A1A')
        root.style.setProperty('--text-primary', '#CBD5E1')
        root.style.setProperty('--accent-color', '#64748B')
        root.style.setProperty('--border-color', '#2D4059')
        root.style.setProperty('--success-green', '#10B981')
        // 兼容旧的主题变量
        root.style.setProperty('--color-background', '#1A1A1A')
        root.style.setProperty('--color-background-soft', '#242424')
        root.style.setProperty('--color-background-mute', '#2c2c2c')
        root.style.setProperty('--color-text', '#CBD5E1')
        break
      case 'yellow':
        root.style.setProperty('--bg-primary', '#FAF0E6')
        root.style.setProperty('--text-primary', '#3A2F21')
        root.style.setProperty('--accent-color', '#5D4037')
        root.style.setProperty('--border-color', '#BCAAA4')
        root.style.setProperty('--success-green', '#689F38')
        // 兼容旧的主题变量
        root.style.setProperty('--color-background', '#FAF0E6')
        root.style.setProperty('--color-background-soft', '#F5E6D3')
        root.style.setProperty('--color-background-mute', '#F0DCC0')
        root.style.setProperty('--color-text', '#3A2F21')
        break
      default: // light
        root.style.setProperty('--bg-primary', '#F8F9FA')
        root.style.setProperty('--text-primary', '#2D2D2D')
        root.style.setProperty('--accent-color', '#4A90E2')
        root.style.setProperty('--border-color', '#E1E4E8')
        root.style.setProperty('--success-green', '#22C55E')
        // 兼容旧的主题变量
        root.style.setProperty('--color-background', '#F8F9FA')
        root.style.setProperty('--color-background-soft', '#FFFFFF')
        root.style.setProperty('--color-background-mute', '#F1F3F5')
        root.style.setProperty('--color-text', '#2D2D2D')
    }
  }

  // 切换主题
  const setTheme = async (theme) => {
    currentTheme.value = theme
    applyTheme(theme)
    await window.electronStore.set('config.theme', theme)
  }

  // 监听主题变化
  watch(currentTheme, (newTheme) => {
    applyTheme(newTheme)
  })

  return {
    currentTheme,
    initTheme,
    setTheme
  }
}) 
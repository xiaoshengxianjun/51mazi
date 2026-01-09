import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

// 主题配置对象 - 统一管理所有主题的颜色配置
const themeConfigs = {
  light: {
    name: '亮色',
    bgPrimary: '#F8F9FA',
    bgSoft: '#FFFFFF',
    bgMute: '#F1F3F5',
    textBase: '#121212',
    textGray: '#666666',
    textGrayLight: '#999999',
    textGrayLighter: '#CCCCCC',
    textGrayLightest: '#F5F5F5',
    accentColor: '#4A90E2',
    primaryColor: '#4A90E2', // 主色调 - 蓝色
    borderColor: '#E1E4E8',
    borderColorSoft: '#E9ECEF',
    successGreen: '#22C55E',
    warningColor: '#F59E0B', // 警告色 - 橙色
    dangerColor: '#EF4444', // 危险色 - 红色
    infoColor: '#3B82F6' // 信息色 - 蓝色
  },
  dark: {
    name: '暗色',
    bgPrimary: '#1A1A1A',
    bgSoft: '#242424',
    bgMute: '#2c2c2c',
    textBase: '#E5E5E5',
    textGray: '#666666',
    textGrayLight: '#999999',
    textGrayLighter: '#CCCCCC',
    textGrayLightest: '#F5F5F5',
    accentColor: '#64748B',
    primaryColor: '#60A5FA', // 主色调 - 亮蓝色
    borderColor: '#2D4059',
    borderColorSoft: '#374151',
    successGreen: '#10B981',
    warningColor: '#FBBF24', // 警告色 - 亮橙色
    dangerColor: '#F87171', // 危险色 - 亮红色
    infoColor: '#60A5FA' // 信息色 - 亮蓝色
  },
  yellow: {
    name: '护眼黄',
    bgPrimary: '#FAF0E6',
    bgSoft: '#F5E6D3',
    bgMute: '#F0DCC0',
    textBase: '#3A2F21',
    textGray: '#666666',
    textGrayLight: '#999999',
    textGrayLighter: '#CCCCCC',
    textGrayLightest: '#F5F5F5',
    accentColor: '#5D4037',
    primaryColor: '#8B6914', // 主色调 - 深黄色
    borderColor: '#BCAAA4',
    borderColorSoft: '#D1C4B8',
    successGreen: '#689F38',
    warningColor: '#D97706', // 警告色 - 深橙色
    dangerColor: '#DC2626', // 危险色 - 深红色
    infoColor: '#2563EB' // 信息色 - 蓝色
  },
  blue: {
    name: '蓝色',
    bgPrimary: '#EFF6FF',
    bgSoft: '#DBEAFE',
    bgMute: '#BFDBFE',
    textBase: '#1E3A8A',
    textGray: '#3B82F6',
    textGrayLight: '#60A5FA',
    textGrayLighter: '#93C5FD',
    textGrayLightest: '#DBEAFE',
    accentColor: '#1E40AF',
    primaryColor: '#2563EB', // 主色调 - 蓝色
    borderColor: '#93C5FD',
    borderColorSoft: '#BFDBFE',
    successGreen: '#10B981',
    warningColor: '#F59E0B',
    dangerColor: '#EF4444',
    infoColor: '#3B82F6'
  },
  green: {
    name: '绿色',
    bgPrimary: '#F0FDF4',
    bgSoft: '#DCFCE7',
    bgMute: '#BBF7D0',
    textBase: '#14532D',
    textGray: '#16A34A',
    textGrayLight: '#22C55E',
    textGrayLighter: '#4ADE80',
    textGrayLightest: '#DCFCE7',
    accentColor: '#15803D',
    primaryColor: '#16A34A', // 主色调 - 绿色
    borderColor: '#86EFAC',
    borderColorSoft: '#BBF7D0',
    successGreen: '#10B981',
    warningColor: '#F59E0B',
    dangerColor: '#EF4444',
    infoColor: '#3B82F6'
  },
  purple: {
    name: '紫色',
    bgPrimary: '#FAF5FF',
    bgSoft: '#F3E8FF',
    bgMute: '#E9D5FF',
    textBase: '#581C87',
    textGray: '#7C3AED',
    textGrayLight: '#8B5CF6',
    textGrayLighter: '#A78BFA',
    textGrayLightest: '#E9D5FF',
    accentColor: '#6D28D9',
    primaryColor: '#7C3AED', // 主色调 - 紫色
    borderColor: '#C4B5FD',
    borderColorSoft: '#DDD6FE',
    successGreen: '#10B981',
    warningColor: '#F59E0B',
    dangerColor: '#EF4444',
    infoColor: '#3B82F6'
  }
}

// 将颜色值转换为rgba格式的辅助函数
const hexToRgba = (hex, alpha = 1) => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// 应用主题到DOM
const applyTheme = (theme) => {
  const root = document.documentElement
  const config = themeConfigs[theme] || themeConfigs.light

  // 背景色
  root.style.setProperty('--bg-primary', config.bgPrimary)
  root.style.setProperty('--bg-primary-a5', hexToRgba(config.bgPrimary, 0.5))
  root.style.setProperty('--bg-primary-a7', hexToRgba(config.bgPrimary, 0.7))
  root.style.setProperty('--bg-soft', config.bgSoft)
  root.style.setProperty('--bg-soft-a5', hexToRgba(config.bgSoft, 0.5))
  root.style.setProperty('--bg-soft-a7', hexToRgba(config.bgSoft, 0.7))
  root.style.setProperty('--bg-mute', config.bgMute)
  root.style.setProperty('--bg-mute-a5', hexToRgba(config.bgMute, 0.5))
  root.style.setProperty('--bg-mute-a7', hexToRgba(config.bgMute, 0.7))

  // 文字颜色
  root.style.setProperty('--text-base', config.textBase)
  root.style.setProperty('--text-gray', config.textGray)
  root.style.setProperty('--text-gray-light', config.textGrayLight)
  root.style.setProperty('--text-gray-lighter', config.textGrayLighter)
  root.style.setProperty('--text-gray-lightest', config.textGrayLightest)

  // 功能颜色
  root.style.setProperty('--accent-color', config.accentColor)
  root.style.setProperty('--primary-color', config.primaryColor)
  root.style.setProperty('--border-color', config.borderColor)
  root.style.setProperty('--border-color-soft', config.borderColorSoft)
  root.style.setProperty('--success-green', config.successGreen)
  root.style.setProperty('--warning-color', config.warningColor)
  root.style.setProperty('--danger-color', config.dangerColor)
  root.style.setProperty('--info-color', config.infoColor)
}

export const useThemeStore = defineStore('theme', () => {
  const currentTheme = ref('light')

  // 获取所有可用主题
  const getAvailableThemes = () => {
    return Object.keys(themeConfigs).map((key) => ({
      key,
      name: themeConfigs[key].name
    }))
  }

  // 获取主题名称
  const getThemeName = (theme) => {
    return themeConfigs[theme]?.name || '亮色'
  }

  // 初始化主题
  const initTheme = async () => {
    const theme = await window.electronStore.get('config.theme')
    if (theme && themeConfigs[theme]) {
      currentTheme.value = theme
      applyTheme(theme)
    } else {
      // 如果主题不存在，使用默认主题
      applyTheme('light')
    }
  }

  // 切换主题
  const setTheme = async (theme) => {
    if (!themeConfigs[theme]) {
      console.warn(`主题 "${theme}" 不存在，使用默认主题`)
      theme = 'light'
    }
    currentTheme.value = theme
    applyTheme(theme)
    await window.electronStore.set('config.theme', theme)
  }

  // 监听主题变化
  watch(currentTheme, (newTheme) => {
    applyTheme(newTheme)
  })

  // 获取主题配置
  const getThemeConfig = (theme) => {
    return themeConfigs[theme] || themeConfigs.light
  }

  return {
    currentTheme,
    initTheme,
    setTheme,
    getAvailableThemes,
    getThemeName,
    getThemeConfig,
    themeConfigs
  }
})

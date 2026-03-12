import eslintConfig from '@electron-toolkit/eslint-config'
import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier'
import eslintPluginVue from 'eslint-plugin-vue'

export default [
  { ignores: ['**/node_modules', '**/dist', '**/out'] },
  eslintConfig,
  ...eslintPluginVue.configs['flat/recommended'],
  {
    files: ['**/*.{js,jsx,vue}'],
    rules: {
      'vue/require-default-prop': 'off',
      'vue/multi-word-component-names': 'off'
    }
  },
  eslintConfigPrettier
]

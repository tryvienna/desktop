import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import ComponentPreview from './components/ComponentPreview.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ComponentPreview', ComponentPreview)
  },
} satisfies Theme

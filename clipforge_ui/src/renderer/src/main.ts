import './assets/main.scss'

import { createApp } from 'vue'
import { useTheme, syncTitleBarOverlay } from './composables/useTheme'
import App from './App.vue'
import router from './router/router'

const { theme } = useTheme()
document.documentElement.setAttribute('data-theme', theme.value)

const app = createApp(App).use(router)
app.mount('#app')

syncTitleBarOverlay()

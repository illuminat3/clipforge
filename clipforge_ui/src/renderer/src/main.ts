import './assets/main.scss'

import { createApp } from 'vue'
import { useTheme } from './composables/useTheme'
import App from './App.vue'
import router from './router/router'

const { theme } = useTheme()
document.documentElement.setAttribute('data-theme', theme.value)

createApp(App).use(router).mount('#app')

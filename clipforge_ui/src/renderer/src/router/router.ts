import ClipsView from '@renderer/views/ClipsView.vue'
import SettingsView from '@renderer/views/SettingsView.vue'
import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/clips'
    },
    {
      path: '/clips',
      name: 'clips',
      component: ClipsView
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView
    }
  ]
})

export default router

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { useUserStore } from './stores/user'
import { useAppStore } from './stores/app'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

const userStore = useUserStore()
const appStore = useAppStore()

if (userStore.token && !userStore.userInfo) {
  userStore.getUserInfo().catch(() => {
    userStore.logout()
  })
}

app.config.errorHandler = (err, instance, info) => {
  console.error('Vue Error:', err, info)
}

app.mount('#app')

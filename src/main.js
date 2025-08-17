import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import GoogleSignInPlugin from 'vue3-google-signin'
import { setUnauthorizedHandler } from './axios'
import { useAuthStore } from '@/stores/auth'

console.log('Google Client ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID)

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(GoogleSignInPlugin, {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID, // 確保在 .env 檔案中設定了 VITE_GOOGLE_CLIENT_ID
})

// 設置 401 錯誤處理
setUnauthorizedHandler(() => {
  const authStore = useAuthStore()
  authStore.forceLogout('登入憑證已過期，請重新登入')
})

app.mount('#app')
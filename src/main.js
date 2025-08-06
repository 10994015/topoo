// import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import GoogleSignInPlugin from 'vue3-google-signin'
console.log('Google Client ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID)

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(GoogleSignInPlugin, {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID, // 確保在 .env 檔案中設定了 VITE_GOOGLE_CLIENT_ID
})
app.mount('#app')

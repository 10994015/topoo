// api/axios.js - API 配置模組
import axios from 'axios'

// 創建 axios 實例
const axiosClient = axios.create({
  baseURL: '/api',  // 使用代理路徑
  // baseURL: import.meta.env.VITE_API_BASE_URL + 'api',  // 正式區路徑
  withCredentials: true,  // 允許發送 cookies
  timeout: 10000,  // 請求超時時間 (10秒)
  headers: {
    'Content-Type': 'application/json'
  }
})

// 追蹤是否正在處理 401 錯誤，避免重複處理
let isHandling401 = false

// 請求攔截器
axiosClient.interceptors.request.use(
  config => {
    // 在發送請求之前做些什麼
    console.log('🚀 發送請求:', config.method?.toUpperCase(), config.url)
    return config
  },
  error => {
    console.error('❌ 請求錯誤:', error)
    return Promise.reject(error)
  }
)

// 響應攔截器
axiosClient.interceptors.response.use(
  response => {
    // 對回應資料做點什麼
    console.log('✅ 收到回應:', response.status, response.config.url)
    
    // 成功請求時重置 401 處理狀態
    isHandling401 = false
    
    return response
  },
  error => {
    console.error('❌ 回應錯誤:', error.response?.status, error.config?.url)
    
    // 統一錯誤處理
    if (error.response?.status === 401) {
      console.warn('🔒 認證失敗，登入憑證已過期')
      
      // 避免重複處理 401 錯誤
      if (isHandling401) {
        console.log('已在處理 401 錯誤，跳過')
        return Promise.reject(error)
      }
      
      isHandling401 = true
      
      // 檢查當前是否已經在登入頁
      const currentPath = window.location.pathname
      if (currentPath === '/login' || currentPath === '/register' || currentPath === '/forgot-password') {
        console.log('當前已在登入相關頁面，跳過 401 處理')
        isHandling401 = false
        return Promise.reject(error)
      }
      
      // 動態導入 auth store 並調用強制登出方法
      import('@/stores/auth').then(({ useAuthStore }) => {
        const authStore = useAuthStore()
        authStore.forceLogout('登入憑證已過期，請重新登入')
      }).catch(err => {
        console.error('導入 auth store 失敗:', err)
        // 備用方案：直接跳轉
        alert('登入憑證已過期，請重新登入')
        window.location.href = '/login'
      })
      
    } else if (error.response?.status === 403) {
      console.warn('🚫 權限不足')
    } else if (error.response?.status === 500) {
      console.error('🔧 伺服器內部錯誤')
    } else if (error.code === 'ECONNABORTED') {
      console.error('⏰ 請求超時')
    } else if (!error.response) {
      console.error('🌐 網路連線錯誤')
    }
    
    return Promise.reject(error)
  }
)

export default axiosClient

// 也可以導出一些常用的方法
export const get = (url, config) => axiosClient.get(url, config)
export const post = (url, data, config) => axiosClient.post(url, data, config)
export const put = (url, data, config) => axiosClient.put(url, data, config)
export const del = (url, config) => axiosClient.delete(url, config)
export const patch = (url, data, config) => axiosClient.patch(url, data, config)
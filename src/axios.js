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

// 請求攔截器
axiosClient.interceptors.request.use(
  config => {
    // 在發送請求之前做些什麼
    console.log('🚀 發送請求:', config.method?.toUpperCase(), config.url)
    
    // 可以在這裡添加 loading 狀態
    // store.dispatch('setLoading', true)
    
    // 可以在這裡添加 token（如果使用 Authorization header）
    // const token = localStorage.getItem('token')
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`
    // }
    
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
    
    // 可以在這裡關閉 loading 狀態
    // store.dispatch('setLoading', false)
    
    return response
  },
  error => {
    console.error('❌ 回應錯誤:', error.response?.status, error.config?.url)
    
    // 統一錯誤處理
    if (error.response?.status === 401) {
      console.warn('🔒 認證失敗，需要重新登入')
      // 這裡可以清除認證狀態或跳轉到登入頁
      // 但為了避免循環依賴，我們在 store 中處理
    } else if (error.response?.status === 403) {
      console.warn('🚫 權限不足')
    } else if (error.response?.status === 500) {
      console.error('🔧 伺服器內部錯誤')
    } else if (error.code === 'ECONNABORTED') {
      console.error('⏰ 請求超時')
    } else if (!error.response) {
      console.error('🌐 網路連線錯誤')
    }
    
    // 可以在這裡關閉 loading 狀態
    // store.dispatch('setLoading', false)
    
    return Promise.reject(error)
  }
)

// 導出 API 實例
export default axiosClient

// 也可以導出一些常用的方法
export const get = (url, config) => api.get(url, config)
export const post = (url, data, config) => api.post(url, data, config)
export const put = (url, data, config) => api.put(url, data, config)
export const del = (url, config) => api.delete(url, config)
export const patch = (url, data, config) => api.patch(url, data, config)

// 用於設置認證失敗的回調函數
let authFailureCallback = null

export const setAuthFailureCallback = (callback) => {
  authFailureCallback = callback
}

// 觸發認證失敗回調
export const triggerAuthFailure = () => {
  if (authFailureCallback && typeof authFailureCallback === 'function') {
    authFailureCallback()
  }
}
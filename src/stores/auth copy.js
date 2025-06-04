// stores/auth.js - 認證相關的 store
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  // State (響應式數據)
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || null)
  const loading = ref(false)
  const error = ref(null)

  // Getters (計算屬性)
  const isAuthenticated = computed(() => !!token.value)
  const userName = computed(() => user.value?.name || '未登入')

  // Actions (方法)
  const login = async (credentials) => {
    loading.value = true
    error.value = null
    
    try {
      // 模擬 API 呼叫
      const response = await mockLogin(credentials)
      
      user.value = response.user
      token.value = response.token
      
      // 儲存到 localStorage
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.user))
      
      return { success: true }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    user.value = null
    token.value = null
    error.value = null
    
    // 清除 localStorage
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const initializeAuth = () => {
    const savedUser = localStorage.getItem('user')
    if (savedUser && token.value) {
      user.value = JSON.parse(savedUser)
    }
  }

  const clearError = () => {
    error.value = null
  }

  // 模擬登入 API
  const mockLogin = async (credentials) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (credentials.account === 'admin' && credentials.password === '123456') {
          resolve({
            user: {
              id: 1,
              name: '管理員',
              email: 'admin@topoo.com',
              role: 'admin'
            },
            token: 'mock-jwt-token-12345'
          })
        } else {
          reject(new Error('帳號或密碼錯誤'))
        }
      }, 1000) // 模擬網路延遲
    })
  }

  return {
    // State
    user,
    token,
    loading,
    error,
    // Getters
    isAuthenticated,
    userName,
    // Actions
    login,
    logout,
    initializeAuth,
    clearError
  }
})
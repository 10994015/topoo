// stores/auth.js - 認證相關的 store
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axiosClient from '../axios' // 引入 axios 實例

export const useAuthStore = defineStore('auth', () => {
    const user = ref(null);
    const isLoading = ref(false)
    const isInitialized = ref(false) // 標記是否已初始化檢查
    // 計算屬性
    const isAuthenticated = computed(() => !!user.value)


    const login = async (credentials)=>{
        console.log("sha256後:",hashSHA256(credentials.password));
        credentials.password = await hashSHA256(credentials.password); // 將密碼轉換為 SHA-256 雜湊值
        try {
            const response = await axiosClient.post(`/login`, credentials)
            console.log(response.data);
            if (response.status === 200) {
                try {
                    await fetchUser()
                    console.log('用戶資料獲取成功:', user.value)
                } catch (fetchError) {
                    console.warn('獲取用戶資料失敗:', fetchError)
                    // 即使獲取用戶資料失敗，也可以設置一個基本的用戶物件
                    user.value = { username: credentials.username }
                }

                return { success: true }
            } else {
                console.error('登入錯誤:', error)
                return { 
                    success: false, 
                    error: error.response?.data?.message || error.message 
                }
            }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    // 檢查登入狀態
    const checkAuth = async () => {
        console.log(isInitialized.value);
        
        if (isInitialized.value) return isAuthenticated.value
        
        isLoading.value = true
        
        try {
            // 嘗試獲取用戶資料來驗證登入狀態
            await fetchUser()
            return true
        } catch (error) {
            console.log('未登入或 token 已過期')
            user.value = null
            return false
        } finally {
            isLoading.value = false
            isInitialized.value = true
        }
    }

    // 註冊
    const register = async (credentials) => {
        try {
            const response = await axiosClient.post('/register', credentials)
            if (response.status === 202) {
                return { success: true }
            } else {
                return { success: false, error: response.data.message }
            }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }
    
    // 獲取用戶資料
    const fetchUser = async () => {
        try {
            const response = await axiosClient.get('/user')
            console.log(response);
            
            user.value = response.data.data
            return user.value
        } catch (error) {
            user.value = null
            throw error
        }
    }
    
    // 登出
    const logout = async () => {
        try {
            await axiosClient.post('/logout')
        } catch (error) {
            console.error('登出請求失敗:', error)
        } finally {
            // 無論後端是否成功，都清除前端狀態
            user.value = null
            isInitialized.value = false
        }
    }

    async function hashSHA256(message) {
        const encoder = new TextEncoder();
        const data = encoder.encode(message); // 編碼成 Uint8Array
        const hashBuffer = await crypto.subtle.digest('SHA-256', data); // 計算 SHA-256 雜湊
        const hashArray = Array.from(new Uint8Array(hashBuffer)); // 轉成 byte 陣列
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // 轉成十六進位字串
        return hashHex;
    }

    async function updateUser(user){
        console.log(user);
        
        try {
            const response = await axiosClient.patch('/user', {
                nickName: user.nickname,
                status: user.status,
            })
            if (response.status === 200) {
                user.value = response.data.data
                return { success: true }
            } else {
                return { success: false, error: response.data.message }
            }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    async function updatePassword(password) {
        try {
            const hashedPassword = await hashSHA256(password)
            const response = await axiosClient.patch('/user/password', {
                password: hashedPassword,
            })
            if (response.status === 200) {
                return { success: true }
            } else {
                return { success: false, error: response.data.message }
            }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    return {
        user: computed(() => user.value),
        isAuthenticated,
        isLoading: computed(() => isLoading.value),
        isInitialized: computed(() => isInitialized.value),
        // 方法
        login,
        register,
        logout,
        checkAuth,
        fetchUser,
        updateUser,

    }
})
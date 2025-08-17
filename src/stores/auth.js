// stores/auth.js - 認證相關的 store
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axiosClient from '../axios' // 引入 axios 實例
import { formatDate, formatDateTime } from '@/utils/dateUtils'

export const useAuthStore = defineStore('auth', () => {
    const user = ref(null);
    const isLoading = ref(false)
    const isInitialized = ref(false) // 標記是否已初始化檢查
    const permissions = ref([]); // 用戶權限列表
    
    // 計算屬性
    const isAuthenticated = computed(() => !!user.value)

    // 權限檢查方法
    const hasPermission = (permissionName, mode = 'Readonly') => {
        if (!permissions.value || permissions.value.length === 0) return false
        
        const permission = permissions.value.find(p => p.permission_name === permissionName)
        if (!permission) return false
        
        // 如果需要的是讀取權限，那 Readonly 和 Full 都可以
        if (mode === 'Readonly') {
            return permission.mode === 'Readonly' || permission.mode === 'Full'
        }
        
        // 如果需要的是完整權限，只有 Full 可以
        if (mode === 'Full') {
            return permission.mode === 'Full'
        }
        
        return false
    }

    // 檢查是否有頁面訪問權限
    const canAccessPage = (permissionName) => {
        return hasPermission(permissionName, 'Readonly') || hasPermission(permissionName, 'Full')
    }

    // 檢查是否有操作權限（新增、編輯、刪除）
    const canModify = (permissionName) => {
        return hasPermission(permissionName, 'Full')
    }

    // 新增：強制登出方法（用於 token 過期）
    const forceLogout = (message = '登入憑證已過期，請重新登入') => {
        // 清除用戶狀態
        user.value = null
        permissions.value = []
        isInitialized.value = false
        
        // 顯示提示訊息（如果需要）
        // alert(message)
        
        // 直接使用 window.location 跳轉，避免動態導入
        if (window.location.pathname !== '/login') {
            window.location.href = '/login'
        }
    }


    const login = async (credentials) => {
        console.log("sha256後:", hashSHA256(credentials.password));
        credentials.password = await hashSHA256(credentials.password);
        console.log(credentials);
        
        try {
            const response = await axiosClient.post(`/login`, credentials)
            console.log(response);

            //首次登入改密碼
            if(response.status === 202){
                return {
                    success: true, 
                    data: response.data.data, // 包含用戶資料
                    statusCode: response.status,
                };
            }
            
            if (response.status === 200) {
                try {
                    await fetchUser()
                    // 登入成功後獲取權限
                    await getPermissions ()
                    console.log('用戶資料獲取成功:', user.value)
                } catch (fetchError) {
                    console.warn('獲取用戶資料失敗:', fetchError)
                    user.value = { username: credentials.username }
                }
                return { success: true, statusCode: response.status }
            }
        } catch (error) {
            console.log('錯誤詳情:', error.response);
            // 檢查是否有 response（後端有回應）
            if (error.response) {
                const statusCode = error.response.status;
                const responseData = error.response.data;
                
                console.log('HTTP 狀態碼:', statusCode);
                console.log('回應資料:', responseData);
                
                // 根據後端回應的格式取得資料
                const backendStatusCode = responseData?.statusCode; // 後端回應中的 statusCode
                const message = responseData?.message; // 後端回應中的 message
                const timestamp = responseData?.timestamp; // 時間戳記
                
                // 處理特定的狀態碼
                
                switch (statusCode) { // 或者使用 backendStatusCode
                    case 407:
                        return { 
                            success: false, 
                            error: message || '帳號未審核',
                            statusCode: statusCode,
                            backendStatusCode: backendStatusCode,
                            timestamp: timestamp
                        };
                    case 401:
                        return { 
                            success: false, 
                            error: message || '帳號或密碼錯誤',
                            statusCode: statusCode,
                            backendStatusCode: backendStatusCode
                        };
                    case 403:
                        if(responseData.data.status=='Lock'){
                            return { 
                                success: false, 
                                error: message + '！直到'+ formatDateTime(responseData.data.lockedUntil) +'解除鎖定'  || '帳號或密碼錯誤',
                                statusCode: statusCode,
                                backendStatusCode: backendStatusCode
                            };
                        }
                        return { 
                            success: false, 
                            error: message || '帳號或密碼錯誤',
                            statusCode: statusCode,
                            backendStatusCode: backendStatusCode
                        };
                    default:
                        return { 
                            success: false, 
                            error: message || `伺服器錯誤 (${statusCode})`,
                            statusCode: statusCode,
                            backendStatusCode: backendStatusCode
                        };
                }
            } else if (error.request) {
                // 請求已發送但沒有收到回應
                return { 
                    statusCode: 500,
                    success: false, 
                    error: '網路連線錯誤，請檢查網路狀態'
                };
            } else {
                // 其他錯誤
                return { 
                    statusCode: 500,
                    success: false, 
                    error: error.message || '未知錯誤'
                };
            }
        }
    }
    const googleLogin = async (credential) => {
        try {
            console.log(credential);
            
            // 根據後端API規格發送請求
            const response = await axiosClient.post('/login/google', {
                token: credential
            })
            
            console.log('Google登入API回應:', response);

            // 處理首次登入（狀態碼202）
            if(response.status === 202){
                return {
                    success: true, 
                    data: response.data.data, // 包含用戶資料
                    statusCode: response.status,
                };
            }
            
            // 處理正常登入（狀態碼200）
            if (response.status === 200) {
            try {
                await fetchUser()
                // 登入成功後獲取權限
                await getPermissions()
                console.log('Google登入用戶資料獲取成功:', user.value)
            } catch (fetchError) {
                console.warn('獲取用戶資料失敗:', fetchError)
                user.value = { username: 'Google用戶' } // 設定預設值
            }
            return { success: true, statusCode: response.status }
            }
        } catch (error) {
            console.log('Google登入錯誤詳情:', error.response);
            
            // 檢查是否有 response（後端有回應）
            if (error.response) {
            const statusCode = error.response.status;
            const responseData = error.response.data;
            
            console.log('HTTP 狀態碼:', statusCode);
            console.log('回應資料:', responseData);
            
            const backendStatusCode = responseData?.statusCode;
            const message = responseData?.message;
            const timestamp = responseData?.timestamp;
            
            // 處理特定的狀態碼（與一般登入相同的錯誤處理）
            switch (statusCode) {
                case 407:
                return { 
                    success: false, 
                    error: message || '帳號未審核',
                    statusCode: statusCode,
                    backendStatusCode: backendStatusCode,
                    timestamp: timestamp
                };
                case 401:
                return { 
                    success: false, 
                    error: message || 'Google登入驗證失敗',
                    statusCode: statusCode,
                    backendStatusCode: backendStatusCode
                };
                default:
                return { 
                    success: false, 
                    error: message || `伺服器錯誤 (${statusCode})`,
                    statusCode: statusCode,
                    backendStatusCode: backendStatusCode
                };
            }
            } else if (error.request) {
            // 請求已發送但沒有收到回應
            return { 
                statusCode: 500,
                success: false, 
                error: '網路連線錯誤，請檢查網路狀態'
            };
            } else {
            // 其他錯誤
            return { 
                statusCode: 500,
                success: false, 
                error: error.message || '未知錯誤'
            };
            }
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
            // 登入成功後獲取權限
            await getPermissions()
            return true
        } catch (error) {
            console.log('認證檢查失敗:', error)
            
            // 重要：將錯誤拋出，讓路由守衛可以捕獲
            user.value = null
            permissions.value = []
            
            // 如果是 401 錯誤，拋出錯誤讓路由守衛處理
            if (error.response && error.response.status === 401) {
                throw error // 拋出錯誤，包含 401 狀態碼
            }
            
            return false
        } finally {
            isLoading.value = false
            isInitialized.value = true
        }
    }

    // 註冊
    const register = async (credentials) => {
        try {
            const hashedConfirmPassword = await hashSHA256(credentials.confirmPassword);
            credentials.password = hashedConfirmPassword;
            credentials.confirmPassword = hashedConfirmPassword;
            const response = await axiosClient.post('/register', credentials);
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
            permissions.value = []
            isInitialized.value = false
        }
    }

    const changePassword = async ({certificationId, password, confirmPassword}) => {
        try {
            console.log(certificationId, password, confirmPassword);
            
            const hashedNewPassword = await hashSHA256(password);
            const hashedConfirmPassword = await hashSHA256(confirmPassword);
            const response = await axiosClient.patch('/change-password', {
                certificationId: certificationId,
                password: hashedNewPassword,
                confirmPassword: hashedConfirmPassword
            });
            console.log(response);
            
            if (response.status === 200) {
                return { success: true }
            } else {
                return { success: false, error: response.data.message }
            }
        } catch (error) {
            console.log(error.response);
            
            return { success: false, error: error.response.data.message }
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

    async function updatePassword(passwordForm) {
        try {
            const password = passwordForm.newPassword
            const confirmPassword = passwordForm.confirmPassword
            const currentPassword = passwordForm.currentPassword

            // 檢查新密碼和確認密碼是否一致
            if (password !== confirmPassword) {
                return { success: false, error: '新密碼和確認密碼不一致' }
            }

            const hashedConfirmPassword = await hashSHA256(confirmPassword)
            const hashedPassword = await hashSHA256(password)
            const hashedCurrentPassword = await hashSHA256(currentPassword)

            const response = await axiosClient.patch('/user/change-password', {
                originalPassword: hashedCurrentPassword,
                password: hashedPassword,
                confirmPassword: hashedConfirmPassword
            })
            console.log(response);

            return { success: response.status===200 , response: response }
            if (response.status === 200) {
                return { success: true, response: response }
            } else {
                return { success: false, error: response.data.message }
            }
        } catch (error) {
            return { success: false, error: error }
        }
    }

    async function sendResetPasswordEmail(email) {
        try {
            const response = await axiosClient.post('/change-password', { email })
            if (response.status === 202) {
                return { success: true }
            } else {
                return { success: false, error: response.data.message }
            }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    async function getPermissions (){
        console.log('抓權限!!');
        
        try {
            const response = await axiosClient.get(`/user/permission`)
            console.log('權限數據:', response.data);
            permissions.value = response.data.data || []
            return permissions.value
        } catch (error) {
            console.error('獲取權限群組失敗:', error)
            permissions.value = []
            throw error
        }
    }
    async function emailVerification(token){
        try {
            console.log(token);
            
            const response = await axiosClient.post('/register/verify', { certificationId: token })
            console.log(response);
            
            if (response.status === 200) {
                return { success: true, message: 'Email 驗證成功' }
            } else {
                return { success: false, error: response.data.message }
            }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    return {
        user: computed(() => user.value),
        permissions: computed(() => permissions.value),
        isAuthenticated,
        isLoading: computed(() => isLoading.value),
        isInitialized: computed(() => isInitialized.value),
        // 權限相關方法
        hasPermission,
        canAccessPage,
        canModify,
        getPermissions ,
        // 新增強制登出方法
        forceLogout,
        // 方法
        login,
        register,
        logout,
        checkAuth,
        fetchUser,
        updateUser,
        updatePassword,
        sendResetPasswordEmail,
        changePassword,changePassword,
        googleLogin,
        emailVerification,
    }
})
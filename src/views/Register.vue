<template>
  <div class="register-container">
    <div class="register-card">
      <h1 class="register-title">註冊帳號</h1>
      
      <form @submit.prevent="handleSubmit" class="register-form">
        <!-- 帳號輸入 -->
        <div class="input-group">
          <div class="input-wrapper">
            <User class="input-icon" :size="20" />
            <input
              type="text"
              v-model="formData.credential"
              placeholder="請輸入帳號"
              class="form-input"
              required
            />
          </div>
          <div v-if="errors.credential" class="error-message">{{ errors.credential }}</div>
        </div>

        <!-- 密碼輸入 -->
        <div class="input-group">
          <div class="input-wrapper">
            <Lock class="input-icon" :size="20" />
            <input
              :type="showPassword ? 'text' : 'password'"
              v-model="formData.password"
              placeholder="請輸入密碼"
              class="form-input"
              required
            />
            <button
              type="button"
              class="toggle-password"
              @click="showPassword = !showPassword"
            >
              <EyeOff v-if="showPassword" :size="20" />
              <Eye v-else :size="20" />
            </button>
          </div>
          <div v-if="errors.password" class="error-message">{{ errors.password }}</div>
        </div>

        <!-- 確認密碼 -->
        <div class="input-group">
          <div class="input-wrapper">
            <Lock class="input-icon" :size="20" />
            <input
              :type="showConfirmPassword ? 'text' : 'password'"
              v-model="formData.confirmPassword"
              placeholder="請輸入確認密碼"
              class="form-input"
              required
            />
            <button
              type="button"
              class="toggle-password"
              @click="showConfirmPassword = !showConfirmPassword"
            >
              <EyeOff v-if="showConfirmPassword" :size="20" />
              <Eye v-else :size="20" />
            </button>
          </div>
          <div v-if="errors.confirmPassword" class="error-message">{{ errors.confirmPassword }}</div>
        </div>

        <!-- 使用者姓名 -->
        <div class="input-group">
          <div class="input-wrapper">
            <input
              type="text"
              v-model="formData.name"
              placeholder="請輸入使用者姓名"
              class="form-input"
              required
            />
          </div>
          <div v-if="errors.name" class="error-message">{{ errors.name }}</div>
        </div>

        <!-- E-mail -->
        <div class="input-group">
          <div class="input-wrapper">
            <input
              type="email"
              v-model="formData.email"
              placeholder="請輸入E-mail信箱"
              class="form-input"
              required
            />
          </div>
          <div v-if="errors.email" class="error-message">{{ errors.email }}</div>
        </div>

        <!-- 註冊按鈕 -->
        <button 
          type="submit" 
          class="register-button"
          :disabled="isLoading"
        >
          {{ isLoading ? '註冊中...' : '註冊' }}
        </button>

        <!-- 登入連結 -->
        <div class="login-link">
          <span>已經註冊過帳號？</span>
          <a href="#" class="link" @click.prevent="goToLogin">返回登入頁</a>
        </div>

        <!-- 分隔線 -->
        <div class="divider">
          <span>or</span>
        </div>

        <!-- Google 登入按鈕 -->
        <button 
          type="button" 
          class="google-button"
          @click="handleGoogleLogin"
        >
          <div class="google-icon">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </div>
          使用Google 帳號登入
        </button>
      </form>
    </div>
  </div>
</template>

<script>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock, Eye, EyeOff } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'RegisterPage',
  components: {
    User,
    Lock, 
    Eye,
    EyeOff
  },
  setup() {
    const router = useRouter()
    
    const formData = reactive({
      credential: '',
      password: '',
      confirmPassword: '',
      name: '',
      email: ''
    })

    const errors = reactive({
      credential: '',
      password: '',
      confirmPassword: '',
      name: '',
      email: ''
    })

    const showPassword = ref(false)
    const showConfirmPassword = ref(false)
    const isLoading = ref(false)

    const validateForm = () => {
      // 清除之前的錯誤
      Object.keys(errors).forEach(key => {
        errors[key] = ''
      })

      let isValid = true

      // 驗證帳號
      if (!formData.credential.trim()) {
        errors.credential = '請輸入帳號'
        isValid = false
      } else if (formData.credential.length < 3) {
        errors.credential = '帳號至少需要3個字元'
        isValid = false
      }

      // 驗證密碼
      if (!formData.password) {
        errors.password = '請輸入密碼'
        isValid = false
      } else if (formData.password.length < 6) {
        errors.password = '密碼至少需要6個字元'
        isValid = false
      }

      // 驗證確認密碼
      if (!formData.confirmPassword) {
        errors.confirmPassword = '請輸入確認密碼'
        isValid = false
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = '密碼不一致'
        isValid = false
      }

      // 驗證姓名
      if (!formData.name.trim()) {
        errors.name = '請輸入使用者姓名'
        isValid = false
      }

      // 驗證 Email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!formData.email) {
        errors.email = '請輸入E-mail信箱'
        isValid = false
      } else if (!emailRegex.test(formData.email)) {
        errors.email = '請輸入有效的E-mail格式'
        isValid = false
      }

      return isValid
    }

    const handleSubmit = async () => {
      if (!validateForm()) {
        return
      }

      isLoading.value = true

      try {
        console.log('註冊資料:', formData)

        const result = await useAuthStore().register(formData)

        console.log('註冊結果:', result)
        
        // 這裡添加註冊 API 調用
        // const response = await registerAPI(formData)
        
        // 模擬 API 調用
        if(result.success) {
          console.log('註冊成功:', result.data)
        //   goToLogin()
        localStorage.setItem('registeredEmail', formData.email)
        router.push('/email-verification')

        } else {
          throw new Error(result.message || '註冊失敗')

        }
        
        // 註冊成功後導向登入頁
        
      } catch (error) {
        console.error('註冊失敗:', error)
        alert('註冊失敗，請重試')
      } finally {
        isLoading.value = false
      }
    }

    const handleGoogleLogin = () => {
      console.log('Google 登入')
      // 實作 Google 登入邏輯
    }

    const goToLogin = () => {
      // 使用 router 導航到登入頁
      router.push('/login')
      console.log('導向登入頁')
    }

    return {
      formData,
      errors,
      showPassword,
      showConfirmPassword,
      isLoading,
      handleSubmit,
      handleGoogleLogin,
      goToLogin
    }
  }
}
</script>

<style lang="scss" scoped>
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.register-card {
  background: white;
  border-radius: 16px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 
              0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.register-title {
  font-size: 32px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 40px;
  color: #8b5cf6;
  margin-top: 0;
}

.register-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.input-group {
  position: relative;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 16px;
  color: #9ca3af;
  z-index: 2;
}

.form-input {
  width: 100%;
  padding: 16px 20px;
  padding-left: 50px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 16px;
  transition: all 0.3s ease;
  background: white;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #8b5cf6;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
}

.toggle-password {
  position: absolute;
  right: 16px;
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  z-index: 2;

  &:hover {
    color: #6b7280;
  }
}

.register-button {
  background: #8b5cf6;
  color: white;
  border: none;
  padding: 16px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 10px;

  &:hover:not(:disabled) {
    background: #7c3aed;
    transform: translateY(-1px);
  }

  &:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    transform: none;
  }
}

.login-link {
  text-align: center;
  margin-top: 20px;
  color: #6b7280;
  font-size: 14px;

  .link {
    color: #8b5cf6;
    text-decoration: none;
    font-weight: 600;
    margin-left: 8px;

    &:hover {
      text-decoration: underline;
    }
  }
}

.divider {
  display: flex;
  align-items: center;
  margin: 30px 0;
  color: #9ca3af;
  font-size: 14px;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #e5e7eb;
  }

  span {
    padding: 0 16px;
  }
}

.google-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  background: white;
  color: #374151;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    border-color: #d1d5db;
    background: #f9fafb;
    transform: translateY(-1px);
  }

  .google-icon {
    display: flex;
    align-items: center;
  }
}

.error-message {
  color: #ef4444;
  font-size: 14px;
  margin-top: 5px;
}

@media (max-width: 480px) {
  .register-container {
    padding: 10px;
  }

  .register-card {
    padding: 30px 20px;
  }

  .register-title {
    font-size: 28px;
    margin-bottom: 30px;
  }
}
</style>
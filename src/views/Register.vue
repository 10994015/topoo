<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { GoogleSignInButton } from "vue3-google-signin"
import { mdiEye, mdiEyeOff, mdiAccount, mdiLock, mdiLoading } from '@mdi/js'

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
const isGoogleLoading = ref(false)

// 取得 Google 登入按鈕的 ref
const googleSignInButton = ref(null)

// 密碼複雜度驗證
const passwordValidation = computed(() => {
  const password = formData.password
  return {
    length: password.length >= 8 && password.length <= 20,
    hasNumber: /\d/.test(password),
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password)
  }
})

// 檢查密碼是否符合所有要求
const isPasswordValid = computed(() => {
  const validation = passwordValidation.value
  return validation.length && 
         validation.hasNumber && 
         validation.hasUpper && 
         validation.hasLower && 
         validation.hasSpecial
})

// 觸發隱藏的 Google 登入按鈕
const triggerGoogleLogin = () => {
  if (isGoogleLoading.value || isLoading.value) return
  
  if (googleSignInButton.value) {
    // 查找實際的 Google 按鈕元素並點擊它
    const googleBtn = googleSignInButton.value.$el.querySelector('div[role="button"]')
    if (googleBtn) {
      googleBtn.click()
    }
  }
}

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
  } else if (!isPasswordValid.value) {
    const validation = passwordValidation.value
    let errorMessages = []
    
    if (!validation.length) {
      errorMessages.push('長度需介於8至20字元之間')
    }
    if (!validation.hasNumber) {
      errorMessages.push('必須包含至少一個數字')
    }
    if (!validation.hasUpper) {
      errorMessages.push('必須包含至少一個大寫字母')
    }
    if (!validation.hasLower) {
      errorMessages.push('必須包含至少一個小寫字母')
    }
    if (!validation.hasSpecial) {
      errorMessages.push('必須包含至少一個特殊符號')
    }
    
    errors.password = '密碼複雜度不符合要求：' + errorMessages.join('、')
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
    
    if(result.success) {
      console.log('註冊成功:', result.data)
      localStorage.setItem('registeredEmail', formData.email)
      router.push('/email-verification')
    } else {
      throw new Error(result.message || '註冊失敗')
    }
  } catch (error) {
    console.error('註冊失敗:', error)
    alert('註冊失敗，請重試')
  } finally {
    isLoading.value = false
  }
}

const handleGoogleSuccess = async (response) => {
  console.log("Google登入成功，收到credential:", response)
  
  isGoogleLoading.value = true
  
  try {
    const result = await useAuthStore().googleLogin(response.credential)
    
    if (result.success) {
      if(result.statusCode === 202 && result.data.firstLogin) {
        alert('首次登入需重設密碼！')
        router.push(`/init-password/${result.data.changePwToken}`);
        return;
      }
      console.log('Google登入成功');
      router.push('/')
    } else {
      console.error('Google登入失敗', result.error);
      alert(result.error || 'Google登入失敗')
    }
  } catch (error) {
    console.error('Google登入處理失敗:', error)
    alert('Google登入失敗，請稍後再試')
  } finally {
    isGoogleLoading.value = false
  }
}

const handleGoogleError = (error) => {
  console.error("Google登入錯誤:", error)
  alert('Google登入失敗，請稍後再試')
  isGoogleLoading.value = false
}

const goToLogin = () => {
  router.push('/login')
  console.log('導向登入頁')
}
</script>

<template>
  <div class="register-container">
    <div class="register-card">
      <h1 class="register-title">
        註冊帳號
      </h1>
      
      <form @submit.prevent="handleSubmit" class="register-form">
        <div class="form-layout">
          <!-- 左側：輸入框區域 -->
          <div class="form-inputs">
            <!-- 帳號輸入 -->
            <div class="input-group">
              <div class="input-wrapper">
                <svg width="20" height="20" viewBox="0 0 24 24" class="input-icon">
                  <path :d="mdiAccount" fill="currentColor"></path>
                </svg>
                <input
                  type="text"
                  v-model="formData.credential"
                  placeholder="請輸入帳號"
                  class="form-input"
                  :disabled="isLoading"
                  required
                />
              </div>
              <div v-if="errors.credential" class="error-message">{{ errors.credential }}</div>
            </div>

            <!-- 密碼輸入 -->
            <div class="input-group">
              <div class="input-wrapper">
                <svg width="20" height="20" viewBox="0 0 24 24" class="input-icon">
                  <path :d="mdiLock" fill="currentColor"></path>
                </svg>
                <input
                  :type="showPassword ? 'text' : 'password'"
                  v-model="formData.password"
                  placeholder="請輸入密碼"
                  class="form-input"
                  :disabled="isLoading"
                  required
                />
                <button
                  type="button"
                  class="toggle-password"
                  @click="showPassword = !showPassword"
                  :disabled="isLoading"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path :d="showPassword ? mdiEyeOff : mdiEye" fill="currentColor"></path>
                  </svg>
                </button>
              </div>
              <div v-if="errors.password" class="error-message">{{ errors.password }}</div>
              <!-- 密碼強度提示 -->
              <div class="password-requirements" v-if="formData.password">
                <div class="requirement-item" :class="{ 'valid': passwordValidation.length }">
                  <span class="requirement-dot"></span>
                  長度 8-20 字元
                </div>
                <div class="requirement-item" :class="{ 'valid': passwordValidation.hasNumber }">
                  <span class="requirement-dot"></span>
                  包含數字
                </div>
                <div class="requirement-item" :class="{ 'valid': passwordValidation.hasUpper }">
                  <span class="requirement-dot"></span>
                  包含大寫字母
                </div>
                <div class="requirement-item" :class="{ 'valid': passwordValidation.hasLower }">
                  <span class="requirement-dot"></span>
                  包含小寫字母
                </div>
                <div class="requirement-item" :class="{ 'valid': passwordValidation.hasSpecial }">
                  <span class="requirement-dot"></span>
                  包含特殊符號 (!@#$%^&*等)
                </div>
              </div>
            </div>

            <!-- 確認密碼 -->
            <div class="input-group">
              <div class="input-wrapper">
                <svg width="20" height="20" viewBox="0 0 24 24" class="input-icon">
                  <path :d="mdiLock" fill="currentColor"></path>
                </svg>
                <input
                  :type="showConfirmPassword ? 'text' : 'password'"
                  v-model="formData.confirmPassword"
                  placeholder="請輸入確認密碼"
                  class="form-input"
                  :disabled="isLoading"
                  required
                />
                <button
                  type="button"
                  class="toggle-password"
                  @click="showConfirmPassword = !showConfirmPassword"
                  :disabled="isLoading"
                >
                   <svg width="20" height="20" viewBox="0 0 24 24">
                    <path :d="showConfirmPassword ? mdiEyeOff : mdiEye" fill="currentColor"></path>
                  </svg>
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
                  :disabled="isLoading"
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
                  :disabled="isLoading"
                  required
                />
              </div>
              <div v-if="errors.email" class="error-message">{{ errors.email }}</div>
            </div>
          </div>

          <!-- 右側：按鈕區域 -->
          <div class="form-actions">
            <!-- 註冊按鈕 -->
            <button 
              type="submit" 
              class="register-button"
              :disabled="isLoading || isGoogleLoading"
            >
              <svg 
                v-if="isLoading" 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                class="loading-icon"
              >
                <path :d="mdiLoading" fill="currentColor"></path>
              </svg>
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

            <!-- 自定義的 Google 登入按鈕 -->
            <button 
              type="button"
              @click="triggerGoogleLogin"
              :disabled="isLoading || isGoogleLoading"
              class="custom-google-btn"
            >
              <svg 
                v-if="isGoogleLoading" 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                class="loading-icon"
              >
                <path :d="mdiLoading" fill="currentColor"></path>
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" class="google-icon">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {{ isGoogleLoading ? '登入中...' : '使用 Google 帳號登入' }}
            </button>

            <!-- 隱藏的原始 Google 登入按鈕 -->
            <div class="hidden-google-wrapper">
              <GoogleSignInButton 
                ref="googleSignInButton"
                @success="handleGoogleSuccess"
                @error="handleGoogleError"
                text="使用Google 帳號登入"
                theme="filled_blue"
                size="large"
                :disabled="isLoading || isGoogleLoading"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

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
  padding: 60px 80px;
  width: 100%;
  max-width: 800px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 
              0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.register-title {
  font-size: 32px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 40px;
  color: #5B42C9;
  margin-top: 0;
  img{
    max-width: 250px;
    width: 100%;
  }
}

.register-form {
  width: 100%;
}

.form-layout {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 40px;
  align-items: start;
}

.form-inputs {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 300px;
}

.form-actions {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 280px;
  position: sticky;
  top: 20px;
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

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: #f5f5f5;
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

  &:hover:not(:disabled) {
    color: #6b7280;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.password-requirements {
  margin-top: 8px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.requirement-item {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #64748b;
  margin-bottom: 4px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  &.valid {
    color: #16a34a;
    
    .requirement-dot {
      background: #16a34a;
    }
  }
}

.requirement-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #cbd5e1;
  margin-right: 8px;
  transition: background-color 0.3s ease;
}

.register-button {
  background: #8b5cf6;
  color: white;
  border: none;
  padding: 16px 24px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

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
  color: #6b7280;
  font-size: 14px;
  line-height: 1.4;

  .link {
    color: #8b5cf6;
    text-decoration: none;
    font-weight: 600;
    display: block;
    margin-top: 4px;

    &:hover {
      text-decoration: underline;
    }
  }
}

.divider {
  display: flex;
  align-items: center;
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

/* 自定義 Google 登入按鈕樣式 */
.custom-google-btn {
  width: 100%;
  background: #ffffff;
  border: 2px solid #dadce0;
  border-radius: 12px;
  padding: 16px 24px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  transition: all 0.3s ease;
  color: #3c4043;
  
  &:hover:not(:disabled) {
    background: #f8f9fa;
    border-color: #c6c6c6;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: #f5f5f5;
    transform: none;
  }
  
  .google-icon {
    flex-shrink: 0;
  }
}

/* 隱藏原始的 Google 登入按鈕 */
.hidden-google-wrapper {
  position: absolute;
  left: -9999px;
  opacity: 0;
  pointer-events: none;
  visibility: hidden;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

.loading-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.error-message {
  color: #ef4444;
  font-size: 14px;
  margin-top: 5px;
  line-height: 1.4;
}

// 響應式設計
@media (max-width: 768px) {
  .register-container {
    padding: 10px;
  }

  .register-card {
    padding: 30px 20px;
    max-width: 400px;
  }

  .form-layout {
    grid-template-columns: 1fr;
    gap: 30px;
  }

  .form-actions {
    width: 100%;
    position: static;
  }

  .form-inputs {
    min-width: auto;
  }

  .register-title {
    font-size: 28px;
    margin-bottom: 30px;
  }
}

@media (max-width: 480px) {
  .register-card {
    padding: 20px 15px;
  }

  .register-title {
    font-size: 24px;
    margin-bottom: 25px;
  }

  .form-layout {
    gap: 20px;
  }
}
</style>
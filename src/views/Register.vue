<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { GoogleSignInButton } from "vue3-google-signin"
import { mdiEye, mdiEyeOff, mdiAccount, mdiLock } from '@mdi/js'

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

// 密碼複雜度驗證
const passwordValidation = computed(() => {
  const password = formData.password
  return {
    length: password.length >= 8 && password.length <= 20,
    hasNumber: /\d/.test(password),
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
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

const handleGoogleSuccess = async (response) => {
  console.log("Google登入成功，收到credential:", response)
  
  try {
    // 使用後端提供的API格式
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
  }
}

const handleGoogleError = (error) => {
  console.error("Google登入錯誤:", error)
  alert('Google登入失敗，請稍後再試')
}

const goToLogin = () => {
  // 使用 router 導航到登入頁
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
                  required
                />
                <button
                  type="button"
                  class="toggle-password"
                  @click="showPassword = !showPassword"
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
                  required
                />
                <button
                  type="button"
                  class="toggle-password"
                  @click="showConfirmPassword = !showConfirmPassword"
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
          </div>

          <!-- 右側：按鈕區域 -->
          <div class="form-actions">
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
            <GoogleSignInButton 
              style="display:block"
              @success="handleGoogleSuccess"
              @error="handleGoogleError"
              text="使用Google 帳號登入"
              theme="filled_blue"
              size="large"
              class="google-btn"
            >
              <template #default>
                <span class="google-icon">G</span>
                使用Google 帳號登入
              </template>
            </GoogleSignInButton>
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
  max-width: 800px; // 增加最大寬度以適應左右分欄
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

// 新增：左右分欄佈局
.form-layout {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 40px;
  align-items: start;
}

// 左側輸入框區域
.form-inputs {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 300px;
}

// 右側按鈕區域
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

// 密碼強度提示樣式
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

.google-btn {
  width: 100%;
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
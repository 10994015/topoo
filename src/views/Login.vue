<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter, useRoute } from 'vue-router'
import { GoogleSignInButton } from "vue3-google-signin"
import { 
  mdiEye, 
  mdiEyeOff, 
  mdiAccount, 
  mdiLock, 
  mdiLoading,
  mdiHandWave,
  mdiPhone
} from '@mdi/js'

const router = useRouter()
const route = useRoute() // ✨ 用來取得 query 參數

const account = ref('')
const password = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const isGoogleLoading = ref(false)
const errorMsg = ref('')

// 取得 Google 登入按鈕的 ref
const googleSignInButton = ref(null)

const togglePassword = () => {
  showPassword.value = !showPassword.value
}

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

const handleLogin = async () => {
  if (isLoading.value) return
  
  isLoading.value = true
  errorMsg.value = ''
  
  try {
    const result = await useAuthStore().login({
      credential: account.value,
      password: password.value
    })
    
    if(result.success) {
      if(result.statusCode === 202) {
        const message = result.data.firstLogin ? '首次登入需重設密碼！' : '密碼已過期，請重新設定密碼！';
        alert(message)
        router.push(`/init-password/${result.data.changePwToken}`);
        return;
      }
      //console.log('登入成功');
      
      // ✨ 從 sessionStorage 取得重定向路徑
      const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/'
      sessionStorage.removeItem('redirectAfterLogin') // 清除
      //console.log('登入成功，重定向到:', redirectPath)
      router.push(redirectPath)
      
    } else {
      //console.error('登入失敗', result.error);
      errorMsg.value = result.error || '登入失敗，請檢查帳號或密碼'
    }
  } catch (error) {
    //console.error('登入處理失敗:', error)
    errorMsg.value = '登入失敗，請稍後再試'
    alert('登入失敗，請稍後再試')
  } finally {
    isLoading.value = false
  }
}

const handleRegister = () => {
  router.push('/register')
}

const handleGoogleSuccess = async (response) => {
  //console.log("Google登入成功，收到credential:", response)
  
  isGoogleLoading.value = true
  errorMsg.value = ''
  
  try {
    const result = await useAuthStore().googleLogin(response.credential)
    
    if (result.success) {
      if(result.statusCode === 202 && result.data.firstLogin) {
        alert('首次登入需重設密碼！')
        router.push(`/init-password/${result.data.changePwToken}`);
        return;
      }
      //console.log('Google登入成功');
      
      // ✨ 從 sessionStorage 取得重定向路徑
      const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/'
      sessionStorage.removeItem('redirectAfterLogin') // 清除
      //console.log('Google登入成功，重定向到:', redirectPath)
      router.push(redirectPath)
      
    } else {
      //console.error('Google登入失敗', result.error);
      alert(result.error || 'Google登入失敗')
    }
  } catch (error) {
    //console.error('Google登入處理失敗:', error)
    alert('Google登入失敗，請稍後再試')
  } finally {
    isGoogleLoading.value = false
  }
}


const handleGoogleError = (error) => {
  //console.error("Google登入錯誤:", error)
  alert('Google登入失敗，請稍後再試')
  isGoogleLoading.value = false
}
</script>

<template>
  <main class="login-container">
    <!-- 左側登入表單 -->
    <div class="left-panel">
      <div class="logo">
        <div class="logo-text">
          <span class="logo-main">
            <img src="/images/topoo_logo.png" width="300" alt="TOPOO Logo">
          </span>
        </div>
      </div>
      
      <div class="login-form">
        <h1 class="form-title">登入</h1>
        
        <div class="form-group">
          <div class="input-wrapper">
            <i class="user-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" class="input-icon">
                <path :d="mdiAccount" fill="currentColor"></path>
              </svg>
            </i>
            <input 
              v-model="account"
              type="text" 
              placeholder="請輸入帳號"
              class="form-input"
              :disabled="isLoading"
            >
          </div>
        </div>
        
        <div class="form-group">
          <div class="input-wrapper">
            <i class="lock-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" class="input-icon">
                <path :d="mdiLock" fill="currentColor"></path>
              </svg>
            </i>
            <input 
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="請輸入密碼"
              class="form-input"
              :disabled="isLoading"
              @keyup.enter="handleLogin"
            >
            <button 
              type="button" 
              @click="togglePassword"
              class="password-toggle"
              :disabled="isLoading"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path :d="showPassword ? mdiEyeOff : mdiEye" fill="currentColor"></path>
              </svg>
            </button>
          </div>
        </div>
        <div v-if="errorMsg" class="error-message">
          <span class="error-text">{{ errorMsg }}</span>
        </div>
        <router-link 
          to="/forgot-password" 
          class="forgot-password"
        >
          忘記密碼?
        </router-link>
        
        <button 
          @click="handleLogin"
          :disabled="isLoading"
          class="login-btn"
          :class="{ 'loading': isLoading }"
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
          {{ isLoading ? '登入中...' : '登入' }}
        </button>
        
        <div class="divider">
          <span>or</span>
        </div>
        
        <button 
          @click="handleRegister"
          :disabled="isLoading || isGoogleLoading"
          class="register-btn"
        >
          註冊
        </button>
        
        <!-- 自定義的 Google 登入按鈕 -->
        <button 
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
    
    <!-- 右側歡迎區域 -->
    <div class="right-panel">
      <!-- 背景裝飾點 -->
      <div class="bg-dots">
        <div class="dot dot-1"></div>
        <div class="dot dot-2"></div>
        <div class="dot dot-3"></div>
      </div>
      
      <div class="brand-section">
        <h1 class="brand-name">TOPOO</h1>
        <p class="brand-subtitle">TECHNOLOGY</p>
      </div>
      
      <div class="welcome-card">
        <div class="welcome-header">
          <div class="hand-icon">
            <svg width="32" height="32" viewBox="0 0 24 24">
              <path :d="mdiHandWave" fill="currentColor"></path>
            </svg>
          </div>
          <div class="welcome-text">
            <h2>歡迎使用</h2>
            <h3>線上報修系統</h3>
          </div>
        </div>
        
        <p class="welcome-description">
          本系統提供快速、安全的報修服務
        </p>
        
        <div class="contact-info">
          <div class="contact-header">
            <div class="phone-icon">
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path :d="mdiPhone" fill="currentColor"></path>
              </svg>
            </div>
            <span>聯絡資訊</span>
          </div>
          <p class="phone-number">02 2728 5528</p>
          <p class="address">台北市信義區忠孝東路五段508號2樓</p>
        </div>
        
        <div class="version-info">
          系統版本 ver 1.0.7
        </div>
      </div>
    </div>
  </main>
</template>

<style lang="scss" scoped>
.login-container {
  display: flex;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  width: 100%;
}

.left-panel {
  flex: 1;
  background: white;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.logo {
  margin-bottom: 3rem;
  
  .logo-text {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
    font-weight: bold;
    letter-spacing: 2px;
    .logo-main {
      font-size: 1.8rem;
      font-weight: 800;
      color: #6c5ce7;
      letter-spacing: 0.1em;
      img{
        max-width: 300px;
        width: 100%;
      }
    }
    
    .logo-sub {
      font-size: 0.7rem;
      font-weight: 400;
      color: #8b5cf6;
      letter-spacing: 0.2em;
      margin-top: -0.2rem;
      background: linear-gradient(45deg, #6c5ce7, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  }
}

.login-form {
  width: 100%;
  max-width: 360px;
}

.form-title {
  font-size: 2rem;
  font-weight: 600;
  color: #6c5ce7;
  margin-bottom: 2rem;
  text-align: center;
}

.form-group {
  margin-bottom: 1.5rem;
}

.error-message{
  margin-top: 0.5rem;
  color: #ef4444;
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 20px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  transition: border-color 0.3s ease;
  
  &:focus-within {
    border-color: #6c5ce7;
  }
  
  .user-icon,
  .lock-icon {
    margin-right: 0.75rem;
    font-size: 1.1rem;
    color: #9ca3af;
  }
  
  .form-input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 1rem;
    color: #374151;
    background: transparent;
    
    &::placeholder {
      color: #9ca3af;
    }
    
    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
  
  .password-toggle {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.1rem;
    color: #9ca3af;
    padding: 0;
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

.forgot-password {
  background: none;
  border: none;
  color: #ef4444;
  font-size: 0.9rem;
  cursor: pointer;
  margin-bottom: 1.5rem;
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
}

.login-btn {
  width: 100%;
  background: linear-gradient(135deg, #6c5ce7, #8b5cf6);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.875rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 1.5rem;
  transition: all 0.3s ease;
  margin-top: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }
  
  &.loading {
    pointer-events: none;
  }
}

.divider {
  text-align: center;
  margin: 1.5rem 0;
  color: #9ca3af;
  font-size: 0.9rem;
}

.register-btn {
  width: 100%;
  background: linear-gradient(135deg, #a855f7, #d946ef);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.875rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 1.5rem;
  transition: all 0.3s ease;
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 10px 20px rgba(168, 85, 247, 0.3);
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }
}

/* 自定義 Google 登入按鈕樣式 */
.custom-google-btn {
  width: 100%;
  background: #ffffff;
  border: 2px solid #dadce0;
  border-radius: 8px;
  padding: 0.875rem;
  font-size: 1rem;
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
  
  .loading-icon {
    animation: spin 1s linear infinite;
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

.right-panel {
  flex: 1;
  background-image: url('/images/login-bg.svg');
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: white;
}

.bg-dots {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  
  .dot {
    position: absolute;
    width: 4px;
    height: 4px;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    
    &.dot-1 {
      top: 20%;
      left: 15%;
      animation: float 6s ease-in-out infinite;
    }
    
    &.dot-2 {
      top: 60%;
      left: 20%;
      animation: float 8s ease-in-out infinite reverse;
    }
    
    &.dot-3 {
      bottom: 30%;
      right: 25%;
      animation: float 7s ease-in-out infinite;
    }
  }
}

.brand-section {
  text-align: center;
  margin-bottom: 3rem;
  
  .brand-name {
    font-size: 4rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    margin: 0;
    background: linear-gradient(45deg, #ffffff, #e0e7ff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .brand-subtitle {
    font-size: 1.2rem;
    font-weight: 300;
    letter-spacing: 0.3em;
    margin: 0.5rem 0 0 0;
    opacity: 0.8;
  }
}

.welcome-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 2.5rem;
  max-width: 400px;
  width: 100%;
  text-align: center;
}

.welcome-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  
  .hand-icon {
    color: #fbbf24;
    display: flex;
    align-items: center;
    justify-content: center;
    
    svg {
      filter: drop-shadow(0 2px 4px rgba(251, 191, 36, 0.3));
    }
  }
  
  .welcome-text {
    text-align: left;
    
    h2 {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0;
    }
    
    h3 {
      font-size: 1.2rem;
      font-weight: 500;
      margin: 0.25rem 0 0 0;
      opacity: 0.9;
    }
  }
}

.welcome-description {
  font-size: 1rem;
  opacity: 0.8;
  margin-bottom: 2rem;
  line-height: 1.5;
}

.contact-info {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  text-align: left;
  
  .contact-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    font-weight: 600;
    
    .phone-icon {
      color: #10b981;
      display: flex;
      align-items: center;
      justify-content: center;
      
      svg {
        filter: drop-shadow(0 1px 2px rgba(16, 185, 129, 0.3));
      }
    }
  }
  
  .phone-number {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0.5rem 0;
  }
  
  .address {
    font-size: 0.9rem;
    opacity: 0.8;
    line-height: 1.4;
    margin: 0;
  }
}

.version-info {
  font-size: 0.9rem;
  opacity: 0.6;
  text-align: right;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-20px);
  }
}

// 響應式設計
@media (max-width: 768px) {
  .login-container {
    flex-direction: column-reverse;
  }
  
  .left-panel {
    max-width: none;
    order: 2;
  }
  
  .right-panel {
    order: 1;
    min-height: 40vh;
  }
  
  .brand-section .brand-name {
    font-size: 2.5rem;
  }
  
  .welcome-card {
    padding: 1.5rem;
  }
}
</style>
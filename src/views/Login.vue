<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { GoogleSignInButton } from "vue3-google-signin"
import { mdiEye, mdiEyeOff, mdiAccount, mdiLock, mdiLoading } from '@mdi/js'

const router = useRouter()

const account = ref('')
const password = ref('')
const showPassword = ref(false)
const isLoading = ref(false)  // 新增 loading 狀態
const isGoogleLoading = ref(false)  // Google 登入 loading 狀態

const errorMsg = ref('')

const togglePassword = () => {
  showPassword.value = !showPassword.value
}

const handleLogin = async () => {
  if (isLoading.value) return // 防止重複點擊
  
  isLoading.value = true  // 開始 loading
  errorMsg.value = ''  // 清空錯誤訊息
  
  try {
    console.log(useAuthStore);
    const result = await useAuthStore().login({
      credential: account.value,
      password: password.value
    })

    console.log(result);
    
    if(result.success) {
      if(result.statusCode === 202) {
        const message = result.data.firstLogin ? '首次登入需重設密碼！' : '密碼已過期，請重新設定密碼！';
        alert(message)
        router.push(`/init-password/${result.data.changePwToken}`);
        return;
      }
      console.log('登入成功');
      router.push('/')
    } else {
      console.error('登入失敗', result.error);
      errorMsg.value = result.error || '登入失敗，請檢查帳號或密碼'
    }
  } catch (error) {
    console.error('登入處理失敗:', error)
    errorMsg.value = '登入失敗，請稍後再試'
    alert('登入失敗，請稍後再試')
  } finally {
    isLoading.value = false  // 結束 loading
  }
}

const handleRegister = () => {
  router.push('/register')
}

const handleGoogleSuccess = async (response) => {
  console.log("Google登入成功，收到credential:", response)
  
  isGoogleLoading.value = true  // 開始 Google loading
  errorMsg.value = ''  // 清空錯誤訊息
  
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
  } finally {
    isGoogleLoading.value = false  // 結束 Google loading
  }
}

const handleGoogleError = (error) => {
  console.error("Google登入錯誤:", error)
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
        
        <div class="google-login-wrapper">
          <GoogleSignInButton 
            @success="handleGoogleSuccess"
            @error="handleGoogleError"
            text="使用Google 帳號登入"
            theme="filled_blue"
            size="large"
            style="display:block;width:100%"
            :disabled="isLoading || isGoogleLoading"
          >
            <template #default>
              <div class="google-btn-content">
                <svg 
                  v-if="isGoogleLoading" 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  class="loading-icon"
                >
                  <path :d="mdiLoading" fill="currentColor"></path>
                </svg>
                <span v-else class="google-icon">G</span>
                {{ isGoogleLoading ? '登入中...' : '使用Google 帳號登入' }}
              </div>
            </template>
          </GoogleSignInButton>
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
          <i class="hand-icon">👋</i>
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
            <i class="phone-icon">📞</i>
            <span>聯絡資訊</span>
          </div>
          <p class="phone-number">02 2728 5528</p>
          <p class="address">台北市信義區忠孝東路五段508號2樓</p>
        </div>
        
        <div class="version-info">
          系統版本 ver 1.05
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

.google-login-wrapper {
  position: relative;
}

.google-btn-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
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

.google-btn {
  width: 100%;
  background: #1a73e8;
  border: 2px solid #e5e7eb;
  border-radius: 50px;
  padding: 0.875rem;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: #d1d5db;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  .google-icon {
    width: 20px;
    height: 20px;
    background: #4285f4;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 0.8rem;
  }
}

.right-panel {
  flex: 1;
  // background: linear-gradient(135deg, #3730a3, #1e1b4b);
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
    font-size: 2rem;
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
      font-size: 1.1rem;
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
// 如果你希望按鈕與你的品牌色系一致
.google-btn-brand {
  width: 100%;
  background: linear-gradient(135deg, #4285f4, #34a853);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.875rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  margin-bottom: 1.5rem;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 20px rgba(66, 133, 244, 0.3);
  }
  
  .google-icon {
    width: 20px;
    height: 20px;
    background: white;
    color: transparent;
    background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHZpZXdCb3g9IjAgMCAxOCAxOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE3LjY0IDkuMjA0NTVDMTcuNjQgOC41NjYzNiAxNy41ODM2IDcuOTUyNzMgMTcuNDggNy4zNjM2NEg5VjEwLjg0NTVIMTMuODQzNkMxMy42MzUgMTEuOTcgMTMuMDAwOSAxMi45MjMgMTIuMDQ3NyAxMy41NjE0VjE1Ljg5NzNIMTQuOTU2NEMxNi42NTgxIDE0LjM0MjcgMTcuNjQgMTEuOTM2NCAxNy42NCA5LjIwNDU1WiIgZmlsbD0iIzQyODVGNCIvPgo8cGF0aCBkPSJNOS4wMDA0NSAxOC4wMDA0QzExLjQzMTggMTguMDAwNCAxMy40Njg2IDE3LjE5NCAxNC45NTY4IDE1Ljg5NzdMMTIuMDQ4MSAxMy41NjE4QzExLjI0MzIgMTQuMTAxNCA5Ljk2MzE4IDE0LjQzNjQgOS4wMDA0NSAxNC40MzY0QzYuNjU0MDkgMTQuNDM2NCA0LjY3MTgxIDEyLjg2NzcgMy45NjQwOSAxMC43MTA5SDEuMDkwNDVWMTMuMTA0NUM0LjEwMDQ1IDE3LjU5OTUgNi43MzE4MSAxOC4wMDA0IDkuMDAwNDUgMTguMDAwNFoiIGZpbGw9IiMzNEE4NTMiLz4KPHBhdGggZD0iTTMuOTY0MDkgMTAuNzEwOUM0LjM2NDA5IDkuNjA2ODIgNC4zNjQwOSA4LjM5MzE4IDMuOTY0MDkgNy4yODkwOVY0Ljg5NTQ1SDEuMDkwNDVDLTAuMzY4MTggNy44MDkwOSAtMC4zNjgxOCAxMC4xOTA5IDEuMDkwNDUgMTMuMTA0NUwzLjk2NDA5IDEwLjcxMDlaIiBmaWxsPSIjRkJCQzA0Ii8+CjxwYXRoIGQ9Ik05LjAwMDQ1IDMuNTYzNjRDMTAuMzc1IDMuNTYzNjQgMTEuNjE1IDQuMDUxMTQgMTIuNzUgNS4xMzQwOUwxNS4wMDUgMi44NzkwOUMxMy40NDU1IDEuNDEyMjcgMTEuMzgyNyAwLjU2MzE4NiA5LjAwMDQ1IDAuNTYzMTg2QzYuNzMxODEgMC41NjMxODYgNC4xMDA0NSAwLjk2NDA5MSAxLjA5MDQ1IDQuODk1NDVMNS4wMDQ5MSA3LjI4OTA5QzQuNjcxODEgNS4xMzIyNyA2LjY1NDA5IDMuNTYzNjQgOS4wMDA0NSAzLjU2MzY0WiIgZmlsbD0iI0VBNDMzNSIvPgo8L3N2Zz4=');
    background-size: 18px 18px;
    background-repeat: no-repeat;
    background-position: center;
    border-radius: 2px;
  }
}
</style>
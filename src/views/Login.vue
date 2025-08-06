<!-- 在你的 login 頁面中，先暫時讓 Google 按鈕顯示出來測試 -->

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { GoogleSignInButton } from "vue3-google-signin"

const router = useRouter()
const hiddenGoogleBtn = ref(null)

const account = ref('')
const password = ref('')
const showPassword = ref(false)

const handleGoogleSuccess = async (response) => {
  console.log("Google登入成功，收到credential:", response)
  
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
  }
}

const handleGoogleError = (error) => {
  console.error("Google登入錯誤:", error)
  alert('Google登入失敗，請稍後再試')
}

// 觸發隱藏的 Google 按鈕
const triggerGoogleLogin = async () => {
  console.log('觸發自定義 Google 登入按鈕')
  await nextTick()
  
  // 嘗試多種方式找到並點擊隱藏的 Google 按鈕
  const hiddenDiv = document.querySelector('.hidden-google-signin')
  if (hiddenDiv) {
    // 先嘗試找到按鈕元素
    const button = hiddenDiv.querySelector('button') || 
                  hiddenDiv.querySelector('div[role="button"]') ||
                  hiddenDiv.querySelector('[data-testid]') ||
                  hiddenDiv.querySelector('div[tabindex="0"]')
    
    if (button) {
      console.log('找到隱藏按鈕，準備點擊')
      // 暫時讓按鈕可以被點擊
      hiddenDiv.style.pointerEvents = 'auto'
      button.style.pointerEvents = 'auto'
      
      // 點擊按鈕
      button.click()
      
      // 點擊後再隱藏
      setTimeout(() => {
        hiddenDiv.style.pointerEvents = 'none'
        button.style.pointerEvents = 'none'
      }, 100)
    } else {
      console.log('在隱藏區域找不到可點擊的按鈕')
      console.log('隱藏區域內容:', hiddenDiv.innerHTML)
      alert('Google 登入初始化中，請稍後再試')
    }
  } else {
    console.error('找不到隱藏的 Google 登入區域')
    alert('Google 登入服務尚未準備就緒')
  }
}

// 其他方法保持不變...
const togglePassword = () => {
  showPassword.value = !showPassword.value
}

const handleLogin = async () => {
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
    console.log('登入成功');
    router.push('/')
  } else {
    console.error('登入失敗', result.error);
    alert(result.error || '登入失敗，請檢查帳號或密碼')
  }
}

const handleRegister = () => {
  router.push('/register')
}

onMounted(() => {
  console.log('頁面載入完成，檢查 Google API:', !!window.google)
})
</script>

<template>
  <main class="login-container">
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
        
        <!-- 移除除錯區域，改用自定義按鈕 -->
        
        <div class="form-group">
          <div class="input-wrapper">
            <i class="user-icon">👤</i>
            <input 
              v-model="account"
              type="text" 
              placeholder="請輸入帳號"
              class="form-input"
            >
          </div>
        </div>
        
        <div class="form-group">
          <div class="input-wrapper">
            <i class="lock-icon">🔒</i>
            <input 
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="請輸入密碼"
              class="form-input"
              @keyup.enter="handleLogin"
            >
            <button 
              type="button" 
              @click="togglePassword"
              class="password-toggle"
            >
              👁️
            </button>
          </div>
        </div>
        
        <router-link to="/forgot-password" class="forgot-password">
          忘記密碼?
        </router-link>
        
        <button @click="handleLogin" class="login-btn">
          登入
        </button>
        
        <div class="divider">
          <span>or</span>
        </div>
        
        <button @click="handleRegister" class="register-btn">
          註冊
        </button>

        <!-- 自定義的 Google 按鈕 -->
        <button @click="triggerGoogleLogin" class="google-btn-custom">
          <div class="google-icon">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.20455C17.64 8.56636 17.5836 7.95273 17.48 7.36364H9V10.8455H13.8436C13.635 11.97 13.0009 12.923 12.0477 13.5614V15.8973H14.9564C16.6581 14.3427 17.64 11.9364 17.64 9.20455Z" fill="#4285F4"/>
              <path d="M9.00045 18.0004C11.4318 18.0004 13.4686 17.194 14.9568 15.8977L12.0481 13.5618C11.2432 14.1014 9.96318 14.4364 9.00045 14.4364C6.65409 14.4364 4.67181 12.8677 3.96409 10.7109H1.09045V13.1045C4.10045 17.5995 6.73181 18.0004 9.00045 18.0004Z" fill="#34A853"/>
              <path d="M3.96409 10.7109C4.36409 9.60682 4.36409 8.39318 3.96409 7.28909V4.89545H1.09045C-0.368182 7.80909 -0.368182 10.1909 1.09045 13.1045L3.96409 10.7109Z" fill="#FBBC04"/>
              <path d="M9.00045 3.56364C10.375 3.56364 11.615 4.05114 12.75 5.13409L15.005 2.87909C13.4455 1.41227 11.3827 0.563186 9.00045 0.563186C6.73181 0.563186 4.10045 0.964091 1.09045 4.89545L5.00491 7.28909C4.67181 5.13227 6.65409 3.56364 9.00045 3.56364Z" fill="#EA4335"/>
            </svg>
          </div>
          使用 Google 帳號登入
        </button>

        <!-- 隱藏的原本 Google 按鈕 -->
        <div class="hidden-google-signin">
          <GoogleSignInButton 
            @success="handleGoogleSuccess"
            @error="handleGoogleError"
            text="使用 Google 帳號登入"
            theme="filled_blue"
            size="large"
            ref="hiddenGoogleBtn"
          />
        </div>
      </div>
    </div>
    
    <!-- 右側保持不變 -->
    <div class="right-panel">
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
// 自定義 Google 按鈕樣式 - 簡潔白色按鈕
.google-btn-custom {
  width: 100%;
  background: white;
  color: #374151;
  border: 2px solid #cccccc;
  border-radius: 8px;
  padding: 0.875rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  
  &:hover {
    background: #f9fafb;
    border-color: #d1d5db;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  .google-icon {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    
    svg {
      width: 18px;
      height: 18px;
    }
  }
}

// 隱藏原本的 Google 按鈕
.hidden-google-signin {
  position: fixed !important;
  top: -500px !important;
  left: -500px !important;
  width: 1px !important;
  height: 1px !important;
  opacity: 0 !important;
  overflow: hidden !important;
  z-index: -9999 !important;
  pointer-events: none !important;
  
  // 但保留內部結構以便點擊觸發
  * {
    opacity: 0 !important;
    pointer-events: none !important;
  }
}

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
  }
  
  .password-toggle {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.1rem;
    color: #9ca3af;
    padding: 0;
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
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3);
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
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 20px rgba(168, 85, 247, 0.3);
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
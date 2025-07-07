<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// 狀態管理
const userEmail = ref('')
const userName = ref('')
const showConfetti = ref(false)
const isRedirecting = ref(false)
const redirectCountdown = ref(5)

// 初始化用戶資訊
onMounted(() => {
  // 從路由參數獲取用戶資訊
  userEmail.value = route.query.email || '您的信箱地址'
  userName.value = route.query.name || '用戶'
  
  // 顯示慶祝動畫
  showConfetti.value = true
  setTimeout(() => {
    showConfetti.value = false
  }, 3000)

  // 開始倒數計時自動跳轉
  startRedirectCountdown()
})

// 開始倒數計時
const startRedirectCountdown = () => {
  const countdown = setInterval(() => {
    redirectCountdown.value--
    if (redirectCountdown.value <= 0) {
      clearInterval(countdown)
      goToLogin()
    }
  }, 1000)
}

// 前往登入頁面
const goToLogin = () => {
  isRedirecting.value = true
  setTimeout(() => {
    router.push('/login')
  }, 500)
}

// 立即登入
const loginNow = () => {
  goToLogin()
}
</script>

<template>
  <div class="verification-success-page">
    <!-- 背景裝飾 -->
    <div class="background-decoration">
      <div class="floating-circle circle-1"></div>
      <div class="floating-circle circle-2"></div>
      <div class="floating-circle circle-3"></div>
      <div class="floating-circle circle-4"></div>
    </div>

    <!-- 慶祝紙花效果 -->
    <div v-if="showConfetti" class="confetti-container">
      <div class="confetti" v-for="i in 20" :key="i" :style="{ 
        left: Math.random() * 100 + '%',
        animationDelay: Math.random() * 3 + 's',
        backgroundColor: ['#7c3aed', '#a855f7', '#10b981', '#f59e0b', '#ef4444'][Math.floor(Math.random() * 5)]
      }"></div>
    </div>

    <div class="success-container">
      <div class="success-card">
        <!-- 成功圖示動畫 -->
        <div class="success-icon-wrapper">
          <div class="success-icon">
            <div class="icon-background">
              <svg viewBox="0 0 24 24" class="check-icon">
                <path fill="currentColor" d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
              </svg>
            </div>
            <div class="success-ring"></div>
          </div>
        </div>

        <!-- 主要內容 -->
        <div class="success-content">
          <h1 class="main-title">
            🎉 認證成功！
          </h1>
          
          <div class="welcome-message">
            <p class="greeting">歡迎加入，{{ userName }}！</p>
            <p class="description">您的 Email 地址已成功驗證</p>
            <div class="email-badge">
              <span class="verified-icon">✓</span>
              <span class="email-text">{{ userEmail }}</span>
            </div>
          </div>

          <!-- 完成步驟指示 -->
          <div class="completion-steps">
            <div class="step completed">
              <div class="step-icon">✓</div>
              <span>帳號註冊</span>
            </div>
            <div class="step completed">
              <div class="step-icon">✓</div>
              <span>Email 驗證</span>
            </div>
            <div class="step active">
              <div class="step-icon">🚀</div>
              <span>開始使用</span>
            </div>
          </div>

          <!-- 操作按鈕 -->
          <div class="action-section">
            <button 
              @click="loginNow"
              class="login-btn"
              :class="{ loading: isRedirecting }"
              :disabled="isRedirecting"
            >
              <span v-if="isRedirecting">跳轉中...</span>
              <span v-else>立即開始使用</span>
            </button>
            
            <div class="auto-redirect-info">
              <span class="countdown-text">
                {{ redirectCountdown }} 秒後自動跳轉到登入頁面
              </span>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: ((5 - redirectCountdown) / 5) * 100 + '%' }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 聯絡資訊 -->
        <div class="contact-footer">
          <div class="contact-info">
            <div class="contact-item">
              <span class="contact-icon">📞</span>
              <span class="contact-text">02 2728 5528</span>
            </div>
            <div class="contact-item">
              <span class="contact-icon">📍</span>
              <span class="contact-text">台北市信義區忠孝東路五段508號2樓</span>
            </div>
          </div>
          <div class="system-version">
            TOPOO 線上報修系統 ver 1.05
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.verification-success-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #7c3aed 0%, #a855f7 25%, #3b82f6 50%, #10b981 75%, #f59e0b 100%);
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

// 背景裝飾
.background-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;

  .floating-circle {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);

    &.circle-1 {
      width: 60px;
      height: 60px;
      top: 10%;
      left: 10%;
      animation: float 8s ease-in-out infinite;
    }

    &.circle-2 {
      width: 80px;
      height: 80px;
      top: 20%;
      right: 15%;
      animation: float 10s ease-in-out infinite reverse;
    }

    &.circle-3 {
      width: 40px;
      height: 40px;
      bottom: 20%;
      left: 20%;
      animation: float 6s ease-in-out infinite;
    }

    &.circle-4 {
      width: 100px;
      height: 100px;
      bottom: 10%;
      right: 10%;
      animation: float 12s ease-in-out infinite reverse;
    }
  }
}

@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-30px) rotate(180deg); }
}

// 慶祝紙花效果
.confetti-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;

  .confetti {
    position: absolute;
    width: 8px;
    height: 8px;
    animation: confetti-fall 3s ease-out forwards;
  }
}

@keyframes confetti-fall {
  0% {
    transform: translateY(-100vh) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
}

// 主容器
.success-container {
  max-width: 600px;
  width: 100%;
  z-index: 10;
}

.success-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 32px;
  padding: 48px 40px;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.15);
  text-align: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #7c3aed, #a855f7, #10b981, #f59e0b);
    background-size: 200% 100%;
    animation: shimmer 3s ease-in-out infinite;
  }
}

@keyframes shimmer {
  0%, 100% { background-position: -200% 0; }
  50% { background-position: 200% 0; }
}

// 成功圖示
.success-icon-wrapper {
  margin-bottom: 32px;

  .success-icon {
    position: relative;
    width: 120px;
    height: 120px;
    margin: 0 auto;

    .icon-background {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: iconPulse 2s ease-in-out infinite;
      box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);

      .check-icon {
        width: 60px;
        height: 60px;
        color: white;
        animation: iconZoom 0.6s ease-out;
      }
    }

    .success-ring {
      position: absolute;
      top: -10px;
      left: -10px;
      right: -10px;
      bottom: -10px;
      border: 3px solid transparent;
      border-radius: 50%;
      background: linear-gradient(45deg, #7c3aed, #a855f7, #10b981, #f59e0b) border-box;
      mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
      mask-composite: exclude;
      animation: ringRotate 4s linear infinite;
    }
  }
}

@keyframes iconPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@keyframes iconZoom {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

@keyframes ringRotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// 成功內容
.success-content {
  .main-title {
    font-size: 36px;
    font-weight: 800;
    background: linear-gradient(135deg, #7c3aed, #a855f7);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0 0 24px 0;
    animation: titleSlideIn 0.8s ease-out;
  }

  .welcome-message {
    margin-bottom: 32px;

    .greeting {
      font-size: 20px;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 8px 0;
    }

    .description {
      font-size: 16px;
      color: #6b7280;
      margin: 0 0 16px 0;
    }

    .email-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #ecfdf5, #d1fae5);
      border: 1px solid #10b981;
      border-radius: 20px;
      padding: 8px 16px;
      
      .verified-icon {
        color: #10b981;
        font-weight: bold;
      }

      .email-text {
        color: #065f46;
        font-weight: 500;
        font-size: 14px;
      }
    }
  }
}

@keyframes titleSlideIn {
  0% {
    opacity: 0;
    transform: translateY(-20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

// 完成步驟
.completion-steps {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 40px;
  padding: 24px;
  background: rgba(124, 58, 237, 0.05);
  border-radius: 20px;

  .step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    flex: 1;
    max-width: 120px;

    .step-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 16px;
      transition: all 0.3s ease;
    }

    span {
      font-size: 12px;
      font-weight: 500;
      text-align: center;
    }

    &.completed {
      .step-icon {
        background: #10b981;
        color: white;
      }
      span {
        color: #065f46;
      }
    }

    &.active {
      .step-icon {
        background: linear-gradient(135deg, #7c3aed, #a855f7);
        color: white;
        animation: stepPulse 2s ease-in-out infinite;
      }
      span {
        color: #7c3aed;
        font-weight: 600;
      }
    }
  }
}

@keyframes stepPulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.5); }
  50% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(124, 58, 237, 0); }
}

// 功能預覽
.feature-preview {
  margin-bottom: 40px;
  text-align: left;

  h3 {
    font-size: 18px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 20px;
    text-align: center;
  }

  .feature-list {
    display: grid;
    gap: 16px;

    .feature-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.8);
      border: 1px solid rgba(124, 58, 237, 0.1);
      border-radius: 16px;
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(124, 58, 237, 0.1);
        border-color: rgba(124, 58, 237, 0.3);
      }

      .feature-icon {
        font-size: 24px;
        width: 48px;
        height: 48px;
        background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .feature-text {
        flex: 1;

        h4 {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin: 0 0 4px 0;
        }

        p {
          font-size: 12px;
          color: #6b7280;
          margin: 0;
        }
      }
    }
  }
}

// 操作區域
.action-section {
  margin-bottom: 32px;

  .login-btn {
    width: 100%;
    background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
    color: white;
    border: none;
    padding: 18px 32px;
    border-radius: 20px;
    font-size: 18px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    margin-bottom: 20px;
    position: relative;
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      transition: left 0.5s;
    }

    &:hover:not(:disabled) {
      transform: translateY(-3px);
      box-shadow: 0 15px 35px rgba(124, 58, 237, 0.4);

      &::before {
        left: 100%;
      }
    }

    &.loading {
      background: #9ca3af;
      cursor: not-allowed;
      transform: none;
    }

    &:disabled {
      opacity: 0.7;
    }
  }

  .auto-redirect-info {
    text-align: center;

    .countdown-text {
      font-size: 14px;
      color: #6b7280;
      display: block;
      margin-bottom: 12px;
    }

    .progress-bar {
      width: 100%;
      height: 4px;
      background: #e5e7eb;
      border-radius: 2px;
      overflow: hidden;

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #7c3aed, #a855f7);
        transition: width 1s linear;
        border-radius: 2px;
      }
    }
  }
}

// 聯絡資訊
.contact-footer {
  border-top: 1px solid rgba(124, 58, 237, 0.1);
  padding-top: 24px;

  .contact-info {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;

    .contact-item {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 14px;
      color: #6b7280;

      .contact-icon {
        font-size: 16px;
      }
    }
  }

  .system-version {
    font-size: 12px;
    color: #9ca3af;
    text-align: center;
  }
}

// 響應式設計
@media (max-width: 768px) {
  .verification-success-page {
    padding: 16px;
  }

  .success-card {
    padding: 32px 24px;
  }

  .success-content .main-title {
    font-size: 28px;
  }

  .completion-steps {
    gap: 16px;
    padding: 20px 16px;

    .step {
      .step-icon {
        width: 36px;
        height: 36px;
        font-size: 14px;
      }

      span {
        font-size: 11px;
      }
    }
  }

  .feature-preview .feature-list .feature-item {
    padding: 12px;

    .feature-icon {
      width: 40px;
      height: 40px;
      font-size: 20px;
    }
  }

  .action-section .login-btn {
    padding: 16px 24px;
    font-size: 16px;
  }

  .contact-info {
    .contact-item {
      font-size: 13px;
      
      .contact-text {
        text-align: center;
        line-height: 1.4;
      }
    }
  }
}

@media (max-width: 480px) {
  .success-card {
    padding: 24px 20px;
  }

  .success-icon-wrapper .success-icon {
    width: 100px;
    height: 100px;

    .icon-background .check-icon {
      width: 50px;
      height: 50px;
    }
  }

  .completion-steps {
    flex-direction: column;
    gap: 12px;

    .step {
      flex-direction: row;
      max-width: none;
      justify-content: center;
    }
  }
}
</style>
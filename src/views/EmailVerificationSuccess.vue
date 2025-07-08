<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
// 使用 router 和路由
const router = useRouter()
const route = useRoute()

const authStore = useAuthStore()

// 狀態管理
const userEmail = ref('')
const userName = ref('')
const showConfetti = ref(false)
const verificationSuccess = ref(null) // null: 驗證中, true: 成功, false: 失敗
const verificationError = ref('')

// 初始化用戶資訊
onMounted(async () => {
  const token = (route.params.token);
  
  console.log('token:', token);
  
  const response = await authStore.emailVerification(token)

  console.log(response);

  if(!response.success){
    console.log('驗證失敗:', response.error);
    verificationSuccess.value = false
    verificationError.value = '憑證無效或已過期，請重新註冊'
  } else {
    verificationSuccess.value = true
    
    // 從路由參數獲取用戶資訊
    userEmail.value = route.query.email || '您的信箱地址'
    userName.value = route.query.name || '用戶'
    
    // 顯示慶祝動畫
    showConfetti.value = true
    setTimeout(() => {
      showConfetti.value = false
    }, 3000)
  }
})

// 前往登入頁面
const goToLogin = () => {
  router.push('/login')
}

// 重新發送驗證信
const resendVerification = () => {
  // 這裡可以添加重新發送驗證信的邏輯
  console.log('重新發送驗證信')
}

// 返回註冊頁面
const goToRegister = () => {
  router.push('/register')
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

    <!-- 慶祝紙花效果 (只在成功時顯示) -->
    <div v-if="showConfetti && verificationSuccess" class="confetti-container">
      <div class="confetti" v-for="i in 20" :key="i" :style="{ 
        left: Math.random() * 100 + '%',
        animationDelay: Math.random() * 3 + 's',
        backgroundColor: ['#7c3aed', '#a855f7', '#10b981', '#f59e0b', '#ef4444'][Math.floor(Math.random() * 5)]
      }"></div>
    </div>

    <div class="success-container">
      <div class="success-card" :class="{ 'error-card': verificationSuccess === false }">
        <!-- 載入中 -->
        <div v-if="verificationSuccess === null" class="loading-state">
          <div class="loading-spinner"></div>
          <h2 class="loading-title">驗證中...</h2>
          <p class="loading-text">正在驗證您的信箱地址，請稍候</p>
        </div>

        <!-- 驗證成功 -->
        <div v-else-if="verificationSuccess === true">
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
              <div class="step pending">
                <div class="step-icon">⏳</div>
                <span>等待審核</span>
              </div>
              <div class="step disabled">
                <div class="step-icon">🚀</div>
                <span>開始使用</span>
              </div>
            </div>

            <!-- 等待審核通知 -->
            <div class="pending-review-section">
              <div class="pending-badge">
                <span class="pending-icon">⏳</span>
                <span class="pending-text">等待管理員審核中</span>
              </div>
              <div class="pending-description">
                <p>您的帳號已成功驗證，但還需要管理員審核才能開始使用系統。</p>
              </div>
            </div>

            <!-- 操作按鈕 -->
            <div class="action-section">
              <button 
                @click="goToLogin"
                class="login-btn"
              >
                返回登入頁面
              </button>
            </div>
          </div>
        </div>

        <!-- 驗證失敗 -->
        <div v-else class="error-content">
          <!-- 失敗圖示 -->
          <div class="error-icon-wrapper">
            <div class="error-icon">
              <div class="icon-background error-bg">
                <svg viewBox="0 0 24 24" class="error-icon-svg">
                  <path fill="currentColor" d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M15.5,8L17,9.5L13.5,13L17,16.5L15.5,18L12,14.5L8.5,18L7,16.5L10.5,13L7,9.5L8.5,8L12,11.5L15.5,8Z"/>
                </svg>
              </div>
              <div class="error-ring"></div>
            </div>
          </div>

          <!-- 失敗內容 -->
          <div class="error-message">
            <h1 class="error-title">
              ❌ 驗證失敗
            </h1>
            
            <div class="error-details">
              <div class="error-badge">
                <span class="error-icon-small">⚠️</span>
                <span class="error-text">{{ verificationError }}</span>
              </div>
            </div>

            <!-- 失敗步驟指示 -->
            <div class="completion-steps error-steps">
              <div class="step completed">
                <div class="step-icon">✓</div>
                <span>帳號註冊</span>
              </div>
              <div class="step error">
                <div class="step-icon">✗</div>
                <span>Email 驗證</span>
              </div>
              <div class="step disabled">
                <div class="step-icon">⏸</div>
                <span>等待審核</span>
              </div>
              <div class="step disabled">
                <div class="step-icon">⏸</div>
                <span>開始使用</span>
              </div>
            </div>

            <!-- 失敗時的操作按鈕 -->
            <div class="action-section error-actions">
              <button 
                v-if="false"
                @click="resendVerification"
                class="retry-btn"
              >
                重新發送驗證信
              </button>
              
              <button 
                @click="goToRegister"
                class="register-btn"
              >
                返回註冊頁面
              </button>
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

  &.error-card {
    &::before {
      background: linear-gradient(90deg, #ef4444, #f97316, #eab308);
    }
  }
}

@keyframes shimmer {
  0%, 100% { background-position: -200% 0; }
  50% { background-position: 200% 0; }
}

// 載入狀態
.loading-state {
  padding: 40px 0;

  .loading-spinner {
    width: 60px;
    height: 60px;
    border: 4px solid #e5e7eb;
    border-top: 4px solid #7c3aed;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 24px;
  }

  .loading-title {
    font-size: 24px;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 12px 0;
  }

  .loading-text {
    font-size: 16px;
    color: #6b7280;
    margin: 0;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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

// 錯誤圖示
.error-icon-wrapper {
  margin-bottom: 32px;

  .error-icon {
    position: relative;
    width: 120px;
    height: 120px;
    margin: 0 auto;

    .icon-background {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: iconPulse 2s ease-in-out infinite;

      &.error-bg {
        background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
        box-shadow: 0 10px 30px rgba(239, 68, 68, 0.3);
      }

      .error-icon-svg {
        width: 60px;
        height: 60px;
        color: white;
        animation: iconZoom 0.6s ease-out;
      }
    }

    .error-ring {
      position: absolute;
      top: -10px;
      left: -10px;
      right: -10px;
      bottom: -10px;
      border: 3px solid transparent;
      border-radius: 50%;
      background: linear-gradient(45deg, #ef4444, #f97316, #eab308) border-box;
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

// 錯誤內容
.error-content {
  .error-message {
    .error-title {
      font-size: 36px;
      font-weight: 800;
      background: linear-gradient(135deg, #ef4444, #f97316);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin: 0 0 24px 0;
      animation: titleSlideIn 0.8s ease-out;
    }

    .error-description {
      font-size: 16px;
      color: #6b7280;
      margin: 0 0 16px 0;
    }

    .error-details {
      margin-bottom: 32px;

      .error-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: linear-gradient(135deg, #fef2f2, #fee2e2);
        border: 1px solid #ef4444;
        border-radius: 20px;
        padding: 8px 16px;
        
        .error-icon-small {
          font-size: 16px;
        }

        .error-text {
          color: #991b1b;
          font-weight: 500;
          font-size: 14px;
        }
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

// 等待審核區域
.pending-review-section {
  margin-bottom: 32px;

  .pending-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #fef3c7, #fde68a);
    border: 1px solid #f59e0b;
    border-radius: 20px;
    padding: 8px 16px;
    margin-bottom: 16px;
    
    .pending-icon {
      font-size: 16px;
      animation: pendingPulse 2s ease-in-out infinite;
    }

    .pending-text {
      color: #92400e;
      font-weight: 500;
      font-size: 14px;
    }
  }

  .pending-description {
    text-align: center;
    
    p {
      font-size: 14px;
      color: #6b7280;
      margin: 0 0 8px 0;
      
      &:last-child {
        margin-bottom: 0;
      }
    }
  }
}

@keyframes pendingPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

// 完成步驟
.completion-steps {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 40px;
  padding: 24px;
  background: rgba(124, 58, 237, 0.05);
  border-radius: 20px;

  &.error-steps {
    background: rgba(239, 68, 68, 0.05);
  }

  .step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    flex: 1;
    max-width: 100px;

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

    &.pending {
      .step-icon {
        background: linear-gradient(135deg, #f59e0b, #f97316);
        color: white;
        animation: stepPulse 2s ease-in-out infinite;
      }
      span {
        color: #92400e;
        font-weight: 600;
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

    &.error {
      .step-icon {
        background: #ef4444;
        color: white;
      }
      span {
        color: #991b1b;
      }
    }

    &.disabled {
      .step-icon {
        background: #e5e7eb;
        color: #9ca3af;
      }
      span {
        color: #9ca3af;
      }
    }
  }
}

@keyframes stepPulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.5); }
  50% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(245, 158, 11, 0); }
}

// 操作區域
.action-section {
  margin-bottom: 32px;

  .login-btn {
    width: 100%;
    background: linear-gradient(135deg, #6b7280 0%, #9ca3af 100%);
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

    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 15px 35px rgba(107, 114, 128, 0.4);

      &::before {
        left: 100%;
      }
    }
  }

  &.error-actions {
    display: flex;
    flex-direction: column;
    gap: 16px;

    .retry-btn {
      width: 100%;
      background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
      color: white;
      border: none;
      padding: 18px 32px;
      border-radius: 20px;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-3px);
        box-shadow: 0 15px 35px rgba(245, 158, 11, 0.4);
      }
    }

    .register-btn {
      width: 100%;
      background: transparent;
      color: #6b7280;
      border: 2px solid #d1d5db;
      padding: 16px 32px;
      border-radius: 20px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover {
        border-color: #7c3aed;
        color: #7c3aed;
        transform: translateY(-2px);
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

  .success-content .main-title,
  .error-content .error-title {
    font-size: 28px;
  }

  .completion-steps {
    gap: 12px;
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

  .action-section .login-btn,
  .action-section .retry-btn {
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

  .success-icon-wrapper .success-icon,
  .error-icon-wrapper .error-icon {
    width: 100px;
    height: 100px;

    .icon-background .check-icon,
    .icon-background .error-icon-svg {
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

  .action-section.error-actions {
    .retry-btn,
    .register-btn {
      padding: 14px 20px;
      font-size: 14px;
    }
  }
}
</style>
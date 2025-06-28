
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// 狀態管理
const userEmail = ref('')
const isResending = ref(false)
const cooldownTime = ref(0)
const showSuccessToast = ref(false)
let cooldownTimer = null

// 初始化用戶信箱（從路由參數或 localStorage 獲取）
onMounted(() => {
  userEmail.value = route.query.email || localStorage.getItem('registeredEmail') || '您剛剛註冊的email地址'
})

// 清理定時器
onUnmounted(() => {
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
  }
})

// 重新發送驗證信
const resendVerification = async () => {
  if (isResending.value || cooldownTime.value > 0) return

  isResending.value = true

  try {
    // 這裡應該調用重新發送驗證信的 API
    console.log('重新發送驗證信至:', userEmail.value)
    
    // 模擬 API 呼叫
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 顯示成功提示
    showSuccessToast.value = true
    setTimeout(() => {
      showSuccessToast.value = false
    }, 3000)

    // 開始冷卻時間（60秒）
    startCooldown()
    
  } catch (error) {
    console.error('重新發送失敗:', error)
    alert('發送失敗，請稍後重試')
  } finally {
    isResending.value = false
  }
}

// 開始冷卻計時
const startCooldown = () => {
  cooldownTime.value = 60
  cooldownTimer = setInterval(() => {
    cooldownTime.value--
    if (cooldownTime.value <= 0) {
      clearInterval(cooldownTimer)
    }
  }, 1000)
}

// 前往登入頁面
const goToLogin = () => {
  router.push('/login')
}

// 更換 Email 地址
const changeEmail = () => {
  if (confirm('返回註冊頁面重新輸入 Email 地址？')) {
    router.push('/register')
  }
}
</script>

<template>
  <div class="verification-page">
    <div class="verification-container">
      <div class="verification-card">
        <!-- 成功圖示 -->
        <div class="success-icon">
          <div class="icon-circle">
            <svg viewBox="0 0 24 24" class="check-icon">
              <path fill="currentColor" d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
            </svg>
          </div>
        </div>

        <!-- 主標題 -->
        <h1 class="main-title">註冊成功！</h1>
        
        <!-- 副標題 -->
        <h2 class="sub-title">驗證信已寄出</h2>

        <!-- 說明文字 -->
        <div class="description">
          <p class="primary-text">我們已將驗證連結發送至您的信箱</p>
          <p class="email-display">{{ userEmail }}</p>
          <p class="secondary-text">請點擊信件中的驗證連結來完成帳號啟用</p>
        </div>

        <!-- 注意事項 -->
        <div class="notice-box">
          <div class="notice-icon">ℹ️</div>
          <div class="notice-content">
            <p>未收到驗證信？</p>
            <ul>
              <li>請檢查垃圾郵件或促銷郵件資料夾</li>
              <li>驗證連結將在 15 分鐘後過期</li>
              <li>如仍未收到，可返回註冊頁面更換Email地址</li>
            </ul>
          </div>
        </div>

        <!-- 操作按鈕 -->
        <div class="action-buttons">
          <button 
            v-if="false"
            @click="resendVerification" 
            class="resend-btn"
            :disabled="isResending || cooldownTime > 0"
          >
            <span v-if="isResending">發送中...</span>
            <span v-else-if="cooldownTime > 0">重新發送 ({{ cooldownTime }}s)</span>
            <span v-else>重新發送驗證信</span>
          </button>

          <button @click="goToLogin" class="login-btn">
            前往登入頁面
          </button>
        </div>

        <!-- 分隔線 -->
        <div class="divider">
          <span>or</span>
        </div>

        <!-- 額外選項 -->
        <div class="extra-options">
          <button @click="changeEmail" class="change-email-btn">
            更換 Email 地址
          </button>
        </div>
      </div>
    </div>

    <!-- 成功提示 Toast -->
    <div v-if="showSuccessToast" class="toast success-toast">
      <div class="toast-content">
        <span class="toast-icon">✅</span>
        <span class="toast-message">驗證信已重新發送！</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.verification-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;

  .verification-container {
    max-width: 480px;
    width: 100%;
  }

  .verification-card {
    background: white;
    border-radius: 24px;
    padding: 40px 32px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
    text-align: center;
  }
}

// 成功圖示
.success-icon {
  margin-bottom: 24px;

  .icon-circle {
    width: 80px;
    height: 80px;
    background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto;
    animation: successPulse 2s ease-in-out infinite;

    .check-icon {
      width: 40px;
      height: 40px;
      color: white;
    }
  }
}

@keyframes successPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

// 標題樣式
.main-title {
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.sub-title {
  font-size: 20px;
  font-weight: 600;
  color: #4b5563;
  margin: 0 0 32px 0;
}

// 說明文字
.description {
  margin-bottom: 32px;

  .primary-text {
    font-size: 16px;
    color: #374151;
    margin: 0 0 12px 0;
    line-height: 1.6;
  }

  .email-display {
    font-size: 16px;
    font-weight: 600;
    color: #7c3aed;
    background: #f3f4f6;
    padding: 12px 16px;
    border-radius: 12px;
    margin: 0 0 12px 0;
    word-break: break-all;
  }

  .secondary-text {
    font-size: 14px;
    color: #6b7280;
    margin: 0;
    line-height: 1.5;
  }
}

// 注意事項框
.notice-box {
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 32px;
  display: flex;
  gap: 12px;
  text-align: left;

  .notice-icon {
    font-size: 20px;
    flex-shrink: 0;
  }

  .notice-content {
    flex: 1;

    p {
      font-size: 14px;
      font-weight: 600;
      color: #92400e;
      margin: 0 0 12px 0;
    }

    ul {
      margin: 0;
      padding-left: 16px;
      
      li {
        font-size: 13px;
        color: #78350f;
        line-height: 1.5;
        margin-bottom: 4px;

        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }
}

// 操作按鈕
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;

  .resend-btn {
    background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
    color: white;
    border: none;
    padding: 16px 24px;
    border-radius: 16px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(245, 158, 11, 0.3);
    }

    &:disabled {
      background: #d1d5db;
      cursor: not-allowed;
      transform: none;
    }
  }

  .login-btn {
    background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
    color: white;
    border: none;
    padding: 16px 24px;
    border-radius: 16px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(124, 58, 237, 0.3);
    }
  }
}

// 分隔線
.divider {
  position: relative;
  margin: 24px 0;
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: #e5e7eb;
  }

  span {
    background: white;
    color: #9ca3af;
    padding: 0 16px;
    font-size: 14px;
    position: relative;
  }
}

// 額外選項
.extra-options {
  .change-email-btn {
    background: none;
    border: 2px solid #e5e7eb;
    color: #6b7280;
    padding: 12px 24px;
    border-radius: 16px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      border-color: #7c3aed;
      color: #7c3aed;
      background: #f8fafc;
    }
  }
}

// 成功提示 Toast
.toast {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 1000;
  animation: slideInRight 0.3s ease-out;

  &.success-toast {
    background: #10b981;
    color: white;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
  }

  .toast-content {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;

    .toast-icon {
      font-size: 18px;
    }

    .toast-message {
      font-size: 14px;
      font-weight: 500;
    }
  }
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

// 響應式設計
@media (max-width: 640px) {
  .verification-page {
    padding: 16px;

    .verification-card {
      padding: 32px 24px;
    }
  }

  .main-title {
    font-size: 28px;
  }

  .sub-title {
    font-size: 18px;
  }

  .action-buttons {
    .resend-btn,
    .login-btn {
      padding: 14px 20px;
      font-size: 15px;
    }
  }

  .toast {
    top: 16px;
    right: 16px;
    left: 16px;
  }
}
</style>
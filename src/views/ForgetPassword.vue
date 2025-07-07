
<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// 表單狀態
const email = ref('')
const emailError = ref('')
const isSubmitting = ref(false)
const showSuccessModal = ref(false)

// 驗證 Email 格式
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// 處理表單提交
const handleSubmit = async () => {
  // 清除之前的錯誤
  emailError.value = ''
  
  // 驗證 Email
  if (!email.value.trim()) {
    emailError.value = '請輸入Email信箱'
    return
  }
  
  if (!validateEmail(email.value)) {
    emailError.value = '請輸入有效的Email格式'
    return
  }

  isSubmitting.value = true

  try {
    // 這裡應該調用忘記密碼 API
    console.log('發送重置密碼郵件至:', email.value)
    
    // 模擬 API 呼叫
    await new Promise(resolve => setTimeout(resolve, 2000))

    const result = await authStore.sendResetPasswordEmail(email.value)

    console.log(result);

    if(!result.success){
      emailError.value = '查無此Email信箱，請檢查後再試'
      return
    }
    
    
    // 顯示成功提示
    showSuccessModal.value = true
    
  } catch (error) {
    console.error('發送失敗:', error)
    emailError.value = '發送失敗，請稍後重試'
  } finally {
    isSubmitting.value = false
  }
}

// 關閉成功提示彈窗
const closeModal = () => {
  showSuccessModal.value = false
  // 返回登入頁
  // router.push('/login')
}
</script>
<template>
  <div class="forgot-password-page">
    <div class="container">
      <!-- 左側表單區域 -->
      <div class="form-section">
        <!-- LOGO -->
        <div class="logo-section">
          <div class="logo">
            <span class="logo-text">TOPOO</span>
            <span class="logo-subtitle">線上報修系統</span>
          </div>
        </div>

        <!-- 忘記密碼表單 -->
        <div class="forgot-form">
          <h2 class="form-title">忘記密碼</h2>
          
          <form @submit.prevent="handleSubmit" class="form">
            <div class="form-group">
              <input
                type="email"
                v-model="email"
                placeholder="請輸入Email信箱"
                class="form-input"
                :class="{ error: emailError }"
                required
              />
              <span v-if="emailError" class="error-message">{{ emailError }}</span>
            </div>

            <div class="back-to-login">
              <router-link to="/login" class="back-link">返回登入頁</router-link>
            </div>

            <button 
              type="submit" 
              class="submit-btn"
              :disabled="isSubmitting"
            >
              {{ isSubmitting ? '發送中...' : '送出' }}
            </button>
          </form>

          <div class="description">
            <p>若要重新設置密碼請填寫Email信箱</p>
            <p>系統將即時寄送重置密碼通知信至</p>
            <p>您的Email信箱中</p>
          </div>
        </div>
      </div>

      <!-- 右側圖片區域 -->
      <div class="image-section">
        <div class="image-container">
          <img 
            src="/images/forgot-password-illustration.svg" 
            alt="忘記密碼插圖"
            class="main-image"
          />
        </div>
      </div>
    </div>

    <!-- 成功提示彈窗 -->
    <div v-if="showSuccessModal" class="modal-overlay" @click="closeModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>郵件發送成功</h3>
          <button @click="closeModal" class="close-btn">✕</button>
        </div>
        <div class="modal-body">
          <p>重置密碼的連結已發送至您的信箱</p>
          <p>請檢查您的電子郵件並按照指示重設密碼</p>
        </div>
        <div class="modal-footer">
          <button @click="closeModal" class="ok-btn">確定</button>
        </div>
      </div>
    </div>
  </div>
</template>
<style lang="scss" scoped>
.forgot-password-page {
  min-height: 100vh;
  background: #F9F9FF;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;

  .container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    max-width: 1200px;
    width: 100%;
    background: white;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    min-height: 600px;
  }
}

// 左側表單區域
.form-section {
  padding: 60px 50px;
  display: flex;
  flex-direction: column;
  justify-content: center;

  .logo-section {
    margin-bottom: 40px;

    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      .logo-text {
        font-size: 28px;
        font-weight: 800;
        color: #6c5ce7;
        letter-spacing: 2px;
        font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
      }

      .logo-subtitle {
        font-size: 14px;
        color: #666;
        background: #f0f0f0;
        padding: 4px 12px;
        border-radius: 20px;
      }
    }
  }

  .forgot-form {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;

    .form-title {
      font-size: 32px;
      font-weight: 600;
      color: #333;
      margin-bottom: 40px;
      text-align: left;
    }

    .form {
      .form-group {
        margin-bottom: 20px;

        .form-input {
          width: 100%;
          padding: 16px 20px;
          border: 2px solid #e1e8ed;
          border-radius: 12px;
          font-size: 16px;
          transition: all 0.3s ease;
          background: #fafafa;

          &:focus {
            outline: none;
            border-color: #6c5ce7;
            background: white;
            box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
          }

          &.error {
            border-color: #e74c3c;
            background: #fdf2f2;
          }

          &::placeholder {
            color: #999;
          }
        }

        .error-message {
          color: #e74c3c;
          font-size: 14px;
          margin-top: 8px;
          display: block;
        }
      }

      .back-to-login {
        margin-bottom: 30px;
        text-align: right;

        .back-link {
          color: #00d4aa;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: color 0.3s;

          &:hover {
            color: #00b894;
            text-decoration: underline;
          }
        }
      }

      .submit-btn {
        width: 100%;
        padding: 16px;
        background: #6c5ce7;
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;

        &:hover:not(:disabled) {
          background: #5b4bcf;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(108, 92, 231, 0.3);
        }

        &:disabled {
          background: #bbb;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
      }
    }

    .description {
      margin-top: 30px;
      
      p {
        font-size: 14px;
        color: #666;
        line-height: 1.6;
        margin: 4px 0;
      }
    }
  }
}

// 右側圖片區域
.image-section {
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;

  .image-container {
    max-width: 400px;
    width: 100%;

    .main-image {
      width: 100%;
      height: auto;
      object-fit: contain;
      filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.2));
    }
  }
}

// 成功提示彈窗
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;

  .modal {
    background: white;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    max-width: 400px;
    width: 90%;
    overflow: hidden;

    .modal-header {
      padding: 24px 24px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;

      h3 {
        margin: 0;
        font-size: 20px;
        color: #333;
        font-weight: 600;
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 20px;
        color: #666;
        cursor: pointer;
        padding: 4px;
        
        &:hover {
          color: #333;
        }
      }
    }

    .modal-body {
      padding: 20px 24px;

      p {
        margin: 8px 0;
        color: #666;
        line-height: 1.6;
      }
    }

    .modal-footer {
      padding: 0 24px 24px;
      display: flex;
      justify-content: flex-end;

      .ok-btn {
        padding: 10px 24px;
        background: #6c5ce7;
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.3s;

        &:hover {
          background: #5b4bcf;
        }
      }
    }
  }
}

// 響應式設計
@media (max-width: 768px) {
  .forgot-password-page {
    padding: 10px;

    .container {
      grid-template-columns: 1fr;
      min-height: auto;
    }
  }

  .form-section {
    padding: 40px 30px;

    .forgot-form .form-title {
      font-size: 28px;
      margin-bottom: 30px;
    }
  }

  .image-section {
    display: none;
  }

  .modal {
    margin: 20px;
  }
}

@media (max-width: 480px) {
  .form-section {
    padding: 30px 20px;

    .logo-section .logo {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;

      .logo-text {
        font-size: 24px;
      }
    }

    .forgot-form .form-title {
      font-size: 24px;
    }
  }
}
</style>
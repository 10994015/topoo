<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { mdiEye, mdiEyeOff } from '@mdi/js'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// 表單狀態
const password = ref('')
const confirmPassword = ref('')
const passwordError = ref('')
const confirmPasswordError = ref('')
const isSubmitting = ref(false)
const showSuccessModal = ref(false)
const token = ref('')
const isValidToken = ref(true)

// 密碼顯示狀態
const showPassword = ref(false)
const showConfirmPassword = ref(false)

// 密碼驗證規則
const validatePassword = (password) => {
  // 密碼應包含數字、英文大寫、英文小寫、特殊符號，密碼字串長度8~20碼
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])[A-Za-z\d\W_]{8,20}$/
  return passwordRegex.test(password)
}

// 切換密碼顯示狀態
const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

const toggleConfirmPasswordVisibility = () => {
  showConfirmPassword.value = !showConfirmPassword.value
}

// 檢查 token
onMounted(() => {
  token.value = route.params.token
  if (!token.value) {
    isValidToken.value = false
  }
})

// 處理表單提交
const handleSubmit = async () => {
  // 清除之前的錯誤
  passwordError.value = ''
  confirmPasswordError.value = ''
  
  // 驗證新密碼
  if (!password.value.trim()) {
    passwordError.value = '請輸入新密碼'
    return
  }
  
  if (!validatePassword(password.value)) {
    passwordError.value = '密碼應包含數字、英文大寫、英文小寫、特殊符號，密碼字串長度8~20碼'
    return
  }

  // 驗證確認密碼
  if (!confirmPassword.value.trim()) {
    confirmPasswordError.value = '請再次輸入密碼'
    return
  }

  if (password.value !== confirmPassword.value) {
    confirmPasswordError.value = '確認密碼不一致'
    return
  }

  isSubmitting.value = true

  try {
    // 調用重設密碼 API
    const result = await authStore.changePassword({
      certificationId: token.value,
      password: password.value,
      confirmPassword: confirmPassword.value
    })

    //console.log(result)
    if(result.success){
        showSuccessModal.value = true
    }else{
        alert('重設失敗，'+ result.error);
    }
    
  } catch (error) {
    //console.error('重設密碼失敗:', error)
    if (error.message && error.message.includes('token')) {
      passwordError.value = '重設連結已失效，請重新申請'
      isValidToken.value = false
    } else {
      passwordError.value = '重設失敗，請稍後重試'
    }
  } finally {
    isSubmitting.value = false
  }
}

// 關閉成功提示彈窗
const closeModal = () => {
  showSuccessModal.value = false
  // 返回登入頁
  router.push('/login')
}

// 返回登入頁
const goToLogin = () => {
  router.push('/login')
}
</script>

<template>
  <div class="reset-password-page">
    <div class="container">
      <!-- 左側表單區域 -->
      <div class="form-section">
        <!-- LOGO -->
        <div class="logo-section">
          <div class="logo">
            <span class="logo-text">
              <img src="/images/topoo_logo.png" width="300" alt="">
            </span>
          </div>
        </div>

        <!-- 無效 token 提示 -->
        <div v-if="!isValidToken" class="invalid-token">
          <div class="error-content">
            <h2 class="error-title">連結已失效</h2>
            <p class="error-message">此重設密碼連結已失效或不存在</p>
            <p class="error-message">請重新申請忘記密碼</p>
            <button @click="goToLogin" class="back-btn">返回登入頁</button>
          </div>
        </div>

        <!-- 重設密碼表單 -->
        <div v-else class="reset-form">
          <h2 class="form-title">重設密碼</h2>
          
          <form @submit.prevent="handleSubmit" class="form">
            <div class="form-group">
              <div class="password-input-container">
                <input
                  :type="showPassword ? 'text' : 'password'"
                  v-model="password"
                  placeholder="請輸入新密碼"
                  class="form-input"
                  :class="{ error: passwordError }"
                  required
                />
                <button
                  type="button"
                  class="eye-button"
                  @click="togglePasswordVisibility"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path :d="showPassword ? mdiEyeOff : mdiEye" fill="currentColor"></path>
                  </svg>
                </button>
              </div>
              <span v-if="passwordError" class="error-message">{{ passwordError }}</span>
            </div>

            <div class="form-group">
              <div class="password-input-container">
                <input
                  :type="showConfirmPassword ? 'text' : 'password'"
                  v-model="confirmPassword"
                  placeholder="請再次輸入密碼"
                  class="form-input"
                  :class="{ error: confirmPasswordError }"
                  required
                />
                <button
                  type="button"
                  class="eye-button"
                  @click="toggleConfirmPasswordVisibility"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path :d="showConfirmPassword ? mdiEyeOff : mdiEye" fill="currentColor"></path>
                  </svg>
                </button>
              </div>
              <span v-if="confirmPasswordError" class="error-message">{{ confirmPasswordError }}</span>
            </div>

            <div class="back-to-login">
              <router-link to="/login" class="back-link">返回登入頁</router-link>
            </div>

            <button 
              type="submit" 
              class="submit-btn"
              :disabled="isSubmitting"
            >
              {{ isSubmitting ? '設定中...' : '送出' }}
            </button>
          </form>

          <div class="description">
            <p>密碼應包含數字、英文大寫、英文小寫、特殊符號</p>
            <p>密碼字串長度8~20碼</p>
          </div>
        </div>
      </div>

      <!-- 右側圖片區域 -->
      <div class="image-section">
        <div class="image-container">
          <img 
            src="/images/forget_password.png" 
            alt="重設密碼插圖"
            class="main-image"
          />
        </div>
      </div>
    </div>

    <!-- 成功提示彈窗 -->
    <div v-if="showSuccessModal" class="modal-overlay" @click="closeModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>密碼重設成功</h3>
          <button @click="closeModal" class="close-btn">✕</button>
        </div>
        <div class="modal-body">
          <p>您的密碼已成功重設</p>
          <p>請使用新密碼登入系統</p>
        </div>
        <div class="modal-footer">
          <button @click="closeModal" class="ok-btn">前往登入</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.reset-password-page {
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
        img{
          max-width: 300px;
          width: 100%;
        }

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

  // 無效 token 樣式
  .invalid-token {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;

    .error-content {
      .error-title {
        font-size: 32px;
        font-weight: 600;
        color: #e74c3c;
        margin-bottom: 20px;
      }

      .error-message {
        font-size: 16px;
        color: #666;
        line-height: 1.6;
        margin: 8px 0;
      }

      .back-btn {
        margin-top: 30px;
        padding: 16px 32px;
        background: #6c5ce7;
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;

        &:hover {
          background: #5b4bcf;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(108, 92, 231, 0.3);
        }
      }
    }
  }

  .reset-form {
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

        .password-input-container {
          position: relative;
          display: flex;
          align-items: center;

          .form-input {
            width: 100%;
            padding: 16px 50px 16px 20px;
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

          .eye-button {
            position: absolute;
            right: 15px;
            background: none;
            border: none;
            color: #666;
            cursor: pointer;
            padding: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.3s ease;

            &:hover {
              color: #6c5ce7;
            }

            &:focus {
              outline: none;
            }

            svg {
              width: 20px;
              height: 20px;
            }
          }
        }

        .error-message {
          color: #e74c3c;
          font-size: 14px;
          margin-top: 8px;
          display: block;
          line-height: 1.4;
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
  .reset-password-page {
    padding: 10px;

    .container {
      grid-template-columns: 1fr;
      min-height: auto;
    }
  }

  .form-section {
    padding: 40px 30px;

    .reset-form .form-title {
      font-size: 28px;
      margin-bottom: 30px;
    }

    .invalid-token .error-content .error-title {
      font-size: 28px;
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

    .reset-form .form-title {
      font-size: 24px;
    }

    .invalid-token .error-content .error-title {
      font-size: 24px;
    }
  }
}
</style>
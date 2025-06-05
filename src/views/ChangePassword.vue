<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// 使用 router 和認證 store
const router = useRouter()
const authStore = useAuthStore()

// 響應式資料
const isLoading = ref(false)
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

// 密碼表單
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 表單驗證錯誤
const errors = reactive({})

// 密碼強度指示
const passwordStrength = ref(0)

// 用戶資料
const userInfo = reactive({
  name: '',
  account: '',
  email: ''
})

// 計算屬性
const isFormValid = computed(() => {
  return passwordForm.currentPassword &&
         passwordForm.newPassword &&
         passwordForm.confirmPassword &&
         passwordForm.newPassword === passwordForm.confirmPassword 
})

const passwordStrengthText = computed(() => {
  const strength = passwordStrength.value
  if (strength === 0) return ''
  if (strength <= 2) return '弱'
  if (strength <= 3) return '中'
  return '強'
})

const passwordStrengthClass = computed(() => {
  const strength = passwordStrength.value
  if (strength <= 2) return 'weak'
  if (strength <= 3) return 'medium'
  return 'strong'
})

// 方法
const loadUserInfo = async () => {
  try {
    // 從 authStore 獲取用戶資料
    const user = authStore.user || await authStore.fetchUser()
    
    Object.assign(userInfo, {
      name: user.name || '黃曉明',
      account: user.credential ||'User001',
      email: user.email || 'user@example.com'
    })
  } catch (error) {
    console.error('載入用戶資料失敗:', error)
    // 設定預設值
    Object.assign(userInfo, {
      name: '黃曉明',
      account: 'User001', 
      email: 'user@example.com'
    })
  }
}

const checkPasswordStrength = (password) => {
  let strength = 0
  
  if (password.length >= 6) strength++
  if (password.length >= 8) strength++
  if (/[A-Z]/.test(password)) strength++
  if (/[a-z]/.test(password)) strength++
  if (/[0-9]/.test(password)) strength++
  if (/[^A-Za-z0-9]/.test(password)) strength++
  
  passwordStrength.value = Math.min(strength, 4)
}

const validateForm = () => {
  Object.assign(errors, {})
  
  // 驗證目前密碼
  if (!passwordForm.currentPassword) {
    errors.currentPassword = '請輸入目前密碼'
  }else{
    errors.currentPassword = ''
  }
  
  // 驗證新密碼
  if (!passwordForm.newPassword) {
    errors.newPassword = '請輸入新密碼'
  } else if (passwordForm.newPassword.length < 6) {
    // errors.newPassword = '密碼至少需要6個字元'
  } else if (passwordForm.newPassword === passwordForm.currentPassword) {
    errors.newPassword = '新密碼不能與目前密碼相同'
  }else{
    errors.newPassword = ''
  }
  
  // 驗證確認密碼
  if (!passwordForm.confirmPassword) {
    errors.confirmPassword = '請確認新密碼'
  } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    errors.confirmPassword = '密碼不一致'
  }else{
    errors.confirmPassword = ''
  }
  
  return Object.keys(errors).length === 0
}

const handleNewPasswordChange = () => {
  checkPasswordStrength(passwordForm.newPassword)
  // 如果確認密碼已填寫，重新驗證
  validateForm();
}

const changePassword = async () => {
  // if (!validateForm()) return
  
  isLoading.value = true
  
  try {
    // 這裡調用 API 修改密碼
    console.log('修改密碼請求:', {
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
      confirmPassword: passwordForm.confirmPassword
    })
    
    // 模擬 API 調用
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 清空表單
    Object.assign(passwordForm, {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
    
    passwordStrength.value = 0
    
    alert('密碼修改成功！')
    
    // 可以選擇是否自動登出
    // await authStore.logout()
    // router.push('/login')
    
  } catch (error) {
    console.error('密碼修改失敗:', error)
    if (error.response?.status === 400) {
      errors.currentPassword = '目前密碼不正確'
    } else {
      alert('密碼修改失敗，請重試')
    }
  } finally {
    isLoading.value = false
  }
}

const resetForm = () => {
  Object.assign(passwordForm, {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  Object.assign(errors, {})
  passwordStrength.value = 0
}

const goBack = () => {
  router.back()
}

// 生命週期
onMounted(() => {
  loadUserInfo();
})
</script>

<template>
  <div class="change-password-page">
    <!-- 操作按鈕區域 -->
    <div class="action-buttons">
      <button 
        @click="changePassword" 
        class="save-btn"
        :disabled="!isFormValid || isLoading"
      >
        {{ isLoading ? '修改中...' : '確認修改' }}
      </button>
      <button @click="resetForm" class="reset-btn" :disabled="isLoading">
        重置
      </button>
      <button @click="goBack" class="back-btn" :disabled="isLoading">
        返回
      </button>
    </div>

    <div class="content-container">
      <!-- 用戶資訊卡片 -->
      <div class="user-card">
        <div class="user-avatar">
          <span class="avatar-initials">{{ userInfo.name.charAt(0) }}</span>
        </div>
        <div class="user-details">
          <h3 class="user-name">{{ userInfo.name }}</h3>
          <p class="user-account">{{ userInfo.account }}</p>
          <p class="user-email">{{ userInfo.email }}</p>
        </div>
      </div>

      <!-- 密碼修改表格 -->
      <div class="password-table">
        <div class="table-header">
          <h3 class="table-title">密碼設定</h3>
          <div class="security-notice">
            <span class="notice-icon">🔒</span>
            為了您的帳戶安全，請定期更換密碼
          </div>
        </div>
        
        <table class="data-table">
          <tbody>
            <tr class="table-row">
              <td class="label-cell">目前密碼 *</td>
              <td class="value-cell">
                <div class="password-input-wrapper">
                  <input 
                    :type="showCurrentPassword ? 'text' : 'password'"
                    v-model="passwordForm.currentPassword"
                    @blur="validateForm"
                    @input="validateForm"
                    class="form-input"
                    :class="{ error: errors.currentPassword }"
                    placeholder="請輸入目前密碼"
                    autocomplete="current-password"
                  />
                  <button 
                    type="button" 
                    @click="showCurrentPassword = !showCurrentPassword"
                    class="password-toggle"
                  >
                    {{ showCurrentPassword ? '🙈' : '👁️' }}
                  </button>
                </div>
                <div v-if="errors.currentPassword" class="error-message">
                  {{ errors.currentPassword }}
                </div>
              </td>
            </tr>
            
            <tr class="table-row">
              <td class="label-cell">新密碼 *</td>
              <td class="value-cell">
                <div class="password-input-wrapper">
                  <input 
                    :type="showNewPassword ? 'text' : 'password'"
                    v-model="passwordForm.newPassword"
                    @input="handleNewPasswordChange"
                    @blur="validateForm"
                    class="form-input"
                    :class="{ error: errors.newPassword }"
                    placeholder="請輸入新密碼（至少6個字元）"
                    autocomplete="new-password"
                  />
                  <button 
                    type="button" 
                    @click="showNewPassword = !showNewPassword"
                    class="password-toggle"
                  >
                    {{ showNewPassword ? '🙈' : '👁️' }}
                  </button>
                </div>
                
                <!-- 密碼強度指示器 -->
                <div v-if="passwordForm.newPassword" class="password-strength">
                  <div class="strength-bar">
                    <div 
                      class="strength-fill" 
                      :class="passwordStrengthClass"
                      :style="{ width: (passwordStrength / 4) * 100 + '%' }"
                    ></div>
                  </div>
                  <span class="strength-text" :class="passwordStrengthClass">
                    密碼強度：{{ passwordStrengthText }}
                  </span>
                </div>
                
                <div v-if="errors.newPassword" class="error-message">
                  {{ errors.newPassword }}
                </div>
                
                <!-- 密碼建議 -->
                <div class="password-tips">
                  <p class="tips-title">密碼建議：</p>
                  <ul class="tips-list">
                    <li :class="{ completed: passwordForm.newPassword.length >= 6 }">至少6個字元</li>
                    <li :class="{ completed: /[A-Z]/.test(passwordForm.newPassword) }">包含大寫字母</li>
                    <li :class="{ completed: /[0-9]/.test(passwordForm.newPassword) }">包含數字</li>
                    <li :class="{ completed: /[^A-Za-z0-9]/.test(passwordForm.newPassword) }">包含特殊字元</li>
                  </ul>
                </div>
              </td>
            </tr>
            
            <tr class="table-row">
              <td class="label-cell">確認新密碼 *</td>
              <td class="value-cell">
                <div class="password-input-wrapper">
                  <input 
                    :type="showConfirmPassword ? 'text' : 'password'"
                    v-model="passwordForm.confirmPassword"
                    @blur="validateForm"
                    @input="validateForm"
                    class="form-input"
                    :class="{ 
                      error: errors.confirmPassword,
                      success: passwordForm.confirmPassword && passwordForm.newPassword === passwordForm.confirmPassword
                    }"
                    placeholder="請再次輸入新密碼"
                    autocomplete="new-password"
                  />
                  <button 
                    type="button" 
                    @click="showConfirmPassword = !showConfirmPassword"
                    class="password-toggle"
                  >
                    {{ showConfirmPassword ? '🙈' : '👁️' }}
                  </button>
                </div>
                <div v-if="passwordForm.confirmPassword && !errors.confirmPassword" class="success-message">
                  ✓ 密碼一致
                </div>
                <div v-if="errors.confirmPassword" class="error-message">
                  {{ errors.confirmPassword }}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.change-password-page {
  background-color: #f5f5f5;
  min-height: 100vh;
  padding: 0;
}

// 頁面標題區域
.page-header {
  background: white;
  padding: 20px 30px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  .header-left {
    .page-title {
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 8px 0;
      color: #333;
    }

    .breadcrumb {
      font-size: 14px;
      color: #666;

      .separator {
        margin: 0 8px;
        color: #999;
      }
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 15px;

    .user-info {
      display: flex;
      align-items: center;
      cursor: pointer;
      color: #6c5ce7;
      font-weight: 500;

      .username {
        margin-right: 8px;
      }

      .dropdown-arrow {
        font-size: 12px;
      }
    }

    .icon-btn {
      width: 32px;
      height: 32px;
      border: 1px solid #ddd;
      background: white;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s;

      &:hover {
        border-color: #6c5ce7;
        color: #6c5ce7;
      }
    }
  }
}

// 操作按鈕區域
.action-buttons {
  background: white;
  padding: 20px 30px;
  display: flex;
  gap: 15px;
  border-bottom: 1px solid #e0e0e0;

  .save-btn {
    background: #6c5ce7;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;

    &:hover:not(:disabled) {
      background: #5b4bcf;
    }

    &:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }
  }

  .reset-btn,
  .back-btn {
    background: white;
    color: #666;
    border: 1px solid #ddd;
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s;

    &:hover:not(:disabled) {
      border-color: #6c5ce7;
      color: #6c5ce7;
    }

    &:disabled {
      color: #999;
      cursor: not-allowed;
    }
  }
}

// 內容區域
.content-container {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 20px;
  padding: 20px 30px;
  max-width: 1200px;
}

// 用戶資訊卡片
.user-card {
  background: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  height: fit-content;

  .user-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: #6c5ce7;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    box-shadow: 0 4px 12px rgba(108, 92, 231, 0.3);

    .avatar-initials {
      font-size: 32px;
      font-weight: bold;
    }
  }

  .user-details {
    text-align: center;

    .user-name {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 8px 0;
      color: #333;
    }

    .user-account {
      font-size: 14px;
      color: #6c5ce7;
      margin: 0 0 4px 0;
      font-weight: 500;
    }

    .user-email {
      font-size: 12px;
      color: #666;
      margin: 0;
    }
  }
}

// 密碼修改表格
.password-table {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;

  .table-header {
    padding: 25px 30px;
    border-bottom: 1px solid #f0f0f0;
    background: #fafbfc;

    .table-title {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 10px 0;
      color: #333;
    }

    .security-notice {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #666;

      .notice-icon {
        font-size: 16px;
      }
    }
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;

    .table-row {
      border-bottom: 1px solid #f0f0f0;

      &:last-child {
        border-bottom: none;
      }

      .label-cell {
        background: #fafbfc;
        width: 200px;
        padding: 25px;
        font-weight: 500;
        color: #333;
        border-right: 1px solid #f0f0f0;
        vertical-align: top;
      }

      .value-cell {
        padding: 25px;
        vertical-align: top;

        .password-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;

          .form-input {
            width: 100%;
            max-width: 400px;
            padding: 12px 45px 12px 15px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
            transition: all 0.3s;

            &:focus {
              outline: none;
              border-color: #6c5ce7;
              box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
            }

            &.error {
              border-color: #dc3545;
              box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
            }

            &.success {
              border-color: #28a745;
              box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.1);
            }
          }

          .password-toggle {
            position: absolute;
            right: 12px;
            background: none;
            border: none;
            cursor: pointer;
            font-size: 16px;
            color: #666;
            z-index: 2;

            &:hover {
              color: #6c5ce7;
            }
          }
        }

        // 密碼強度指示器
        .password-strength {
          margin-top: 10px;
          display: flex;
          align-items: center;
          gap: 10px;

          .strength-bar {
            width: 200px;
            height: 4px;
            background: #e9ecef;
            border-radius: 2px;
            overflow: hidden;

            .strength-fill {
              height: 100%;
              transition: all 0.3s ease;
              border-radius: 2px;

              &.weak {
                background: #dc3545;
              }

              &.medium {
                background: #ffc107;
              }

              &.strong {
                background: #28a745;
              }
            }
          }

          .strength-text {
            font-size: 12px;
            font-weight: 500;

            &.weak {
              color: #dc3545;
            }

            &.medium {
              color: #ffc107;
            }

            &.strong {
              color: #28a745;
            }
          }
        }

        // 密碼建議
        .password-tips {
          margin-top: 15px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 6px;
          border-left: 4px solid #6c5ce7;

          .tips-title {
            font-size: 12px;
            font-weight: 600;
            color: #333;
            margin: 0 0 8px 0;
          }

          .tips-list {
            margin: 0;
            padding-left: 15px;
            list-style: none;

            li {
              font-size: 12px;
              color: #666;
              margin-bottom: 4px;
              position: relative;

              &::before {
                content: '○';
                position: absolute;
                left: -15px;
                color: #ddd;
              }

              &.completed {
                color: #28a745;
                font-weight: 500;

                &::before {
                  content: '✓';
                  color: #28a745;
                }
              }

              &:last-child {
                margin-bottom: 0;
              }
            }
          }
        }

        .error-message {
          color: #dc3545;
          font-size: 12px;
          margin-top: 5px;
          display: flex;
          align-items: center;
          gap: 5px;

          &::before {
            content: '⚠️';
            font-size: 14px;
          }
        }

        .success-message {
          color: #28a745;
          font-size: 12px;
          margin-top: 5px;
          font-weight: 500;
        }
      }
    }
  }
}

// 響應式設計
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;

    .header-right {
      align-self: flex-end;
    }
  }

  .action-buttons {
    flex-wrap: wrap;
  }

  .content-container {
    grid-template-columns: 1fr;
    padding: 15px 20px;
    gap: 15px;
  }

  .password-table {
    .data-table {
      .table-row {
        .label-cell {
          width: 120px;
          padding: 20px 15px;
          font-size: 14px;
        }

        .value-cell {
          padding: 20px 15px;

          .password-input-wrapper .form-input {
            max-width: none;
          }

          .password-strength .strength-bar {
            width: 150px;
          }
        }
      }
    }
  }
}

// 極小螢幕
@media (max-width: 480px) {
  .content-container {
    padding: 15px;
  }

  .password-table {
    .data-table {
      .table-row {
        display: block;
        border-bottom: 2px solid #f0f0f0;

        .label-cell,
        .value-cell {
          display: block;
          width: 100%;
          border-right: none;
          border-bottom: 1px solid #f0f0f0;
        }

        .label-cell {
          background: #f8f9fa;
          padding: 12px 20px 8px;
          font-size: 12px;
          font-weight: 600;
        }

        .value-cell {
          padding: 8px 20px 20px;
        }
      }
    }
  }
}
</style>
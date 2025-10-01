<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { mdiEye, mdiEyeOff } from '@mdi/js'

// 使用 router 和認證 store
const router = useRouter()
const authStore = useAuthStore()

// 響應式資料
const isLoading = ref(false)
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

// RWD 狀態管理
const isMobile = ref(false)
const isTablet = ref(false)

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

// RWD 檢測
const checkScreenSize = () => {
  const width = window.innerWidth
  isMobile.value = width < 768
  isTablet.value = width >= 768 && width < 1024
}

// 密碼驗證規則
const validatePassword = (password) => {
  const validations = {
    length: password.length >= 8 && password.length <= 20,
    hasNumber: /[0-9]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasSpecialChar: /[^A-Za-z0-9]/.test(password)
  }
  
  return {
    ...validations,
    isValid: Object.values(validations).every(Boolean)
  }
}

// 計算屬性
const isFormValid = computed(() => {
  return passwordForm.currentPassword &&
         passwordForm.newPassword &&
         passwordForm.confirmPassword &&
         passwordForm.newPassword === passwordForm.confirmPassword &&
         validatePassword(passwordForm.newPassword).isValid
})

const passwordValidation = computed(() => {
  if (!passwordForm.newPassword) return null
  return validatePassword(passwordForm.newPassword)
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
  
  if (password.length >= 8) strength++
  if (password.length >= 12) strength++
  if (/[A-Z]/.test(password)) strength++
  if (/[a-z]/.test(password)) strength++
  if (/[0-9]/.test(password)) strength++
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++
  
  passwordStrength.value = Math.min(strength, 4)
}

const validateForm = () => {
  Object.assign(errors, {})
  
  // 驗證目前密碼
  if (!passwordForm.currentPassword) {
    errors.currentPassword = '請輸入目前密碼'
  } else {
    errors.currentPassword = ''
  }
  
  // 驗證新密碼
  if (!passwordForm.newPassword) {
    errors.newPassword = '請輸入新密碼'
  } else {
    const validation = validatePassword(passwordForm.newPassword)
    
    if (!validation.length) {
      errors.newPassword = '密碼長度須介於8至20字元之間'
    } else if (!validation.hasNumber) {
      errors.newPassword = '密碼必須包含至少一個數字'
    } else if (!validation.hasUppercase) {
      errors.newPassword = '密碼必須包含至少一個英文大寫字母'
    } else if (!validation.hasLowercase) {
      errors.newPassword = '密碼必須包含至少一個英文小寫字母'
    } else if (!validation.hasSpecialChar) {
      errors.newPassword = '密碼必須包含至少一個特殊符號'
    } else if (passwordForm.newPassword === passwordForm.currentPassword) {
      errors.newPassword = '新密碼不能與目前密碼相同'
    } else {
      errors.newPassword = ''
    }
  }
  
  // 驗證確認密碼
  if (!passwordForm.confirmPassword) {
    errors.confirmPassword = '請確認新密碼'
  } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    errors.confirmPassword = '密碼不一致'
  } else {
    errors.confirmPassword = ''
  }
  
  return Object.keys(errors).filter(key => errors[key]).length === 0
}

const handleNewPasswordChange = () => {
  checkPasswordStrength(passwordForm.newPassword)
  // 如果確認密碼已填寫，重新驗證
  validateForm();
}

const changePassword = async () => {
  if (!validateForm()) return
  
  isLoading.value = true
  
  try {
    console.log('修改密碼請求:', {
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
      confirmPassword: passwordForm.confirmPassword
    })
    
    // 模擬 API 調用
    const result = await authStore.updatePassword({
      ...passwordForm
    })
    console.log(result);
    
    // 清空表單
    Object.assign(passwordForm, {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    })
    
    passwordStrength.value = 0
    
    if(result.response.status === 200) {
      alert('密碼修改成功！')
      console.log('密碼修改成功');
    } else {
      console.log(result);
      
      const errorMessage = result.error.message || '密碼修改失敗'
      throw new Error(errorMessage)
    }
    
    // 可以選擇是否自動登出
    // await authStore.logout()
    // router.push('/login')
    
  } catch (error) {
    console.error('密碼修改失敗:', error)
    if (error.response?.status === 400) {
      errors.currentPassword = '目前密碼不正確'
    } else {
      alert('原始密碼不正確！請重新操作')
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
  // 初始化 RWD 檢測
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
  
  loadUserInfo();
})
</script>

<template>
  <div class="change-password-page" :class="{ 'mobile-layout': isMobile, 'tablet-layout': isTablet }">
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
            密碼設定須符合以下複雜度要求
          </div>
        </div>
        
        <!-- 手機版卡片樣式 -->
        <div v-if="isMobile" class="mobile-form">
          <!-- 目前密碼 -->
          <div class="form-card">
            <label class="form-label">目前密碼 *</label>
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
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path :d="showCurrentPassword ? mdiEyeOff : mdiEye" fill="currentColor"></path>
                </svg>
              </button>
            </div>
            <div v-if="errors.currentPassword" class="error-message">
              {{ errors.currentPassword }}
            </div>
          </div>

          <!-- 新密碼 -->
          <div class="form-card">
            <label class="form-label">新密碼 *</label>
            <div class="password-input-wrapper">
              <input 
                :type="showNewPassword ? 'text' : 'password'"
                v-model="passwordForm.newPassword"
                @input="handleNewPasswordChange"
                @blur="validateForm"
                class="form-input"
                :class="{ error: errors.newPassword }"
                placeholder="請輸入新密碼（8-20字元）"
                autocomplete="new-password"
              />
              <button 
                type="button" 
                @click="showNewPassword = !showNewPassword"
                class="password-toggle"
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path :d="showNewPassword ? mdiEyeOff : mdiEye" fill="currentColor"></path>
                </svg>
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
              <p class="tips-title">密碼複雜度要求：</p>
              <ul class="tips-list">
                <li :class="{ completed: passwordValidation?.length }">
                  長度介於8至20字元之間
                </li>
                <li :class="{ completed: passwordValidation?.hasNumber }">
                  包含至少一個數字
                </li>
                <li :class="{ completed: passwordValidation?.hasUppercase }">
                  包含至少一個英文大寫字母
                </li>
                <li :class="{ completed: passwordValidation?.hasLowercase }">
                  包含至少一個英文小寫字母
                </li>
                <li :class="{ completed: passwordValidation?.hasSpecialChar }">
                  包含至少一個特殊符號（如：!@#$%^&*等）
                </li>
              </ul>
            </div>
          </div>

          <!-- 確認新密碼 -->
          <div class="form-card">
            <label class="form-label">確認新密碼 *</label>
            <div class="password-input-wrapper">
              <input 
                :type="showConfirmPassword ? 'text' : 'password'"
                v-model="passwordForm.confirmPassword"
                @blur="validateForm"
                @input="validateForm"
                class="form-input"
                :class="{ 
                  error: errors.confirmPassword,
                  success: passwordForm.confirmPassword && passwordForm.newPassword === passwordForm.confirmPassword && !errors.confirmPassword
                }"
                placeholder="請再次輸入新密碼"
                autocomplete="new-password"
              />
              <button 
                type="button" 
                @click="showConfirmPassword = !showConfirmPassword"
                class="password-toggle"
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path :d="showConfirmPassword ? mdiEyeOff : mdiEye" fill="currentColor"></path>
                </svg>
              </button>
            </div>
            <div v-if="passwordForm.confirmPassword && !errors.confirmPassword && passwordForm.newPassword === passwordForm.confirmPassword" class="success-message">
              ✓ 密碼一致
            </div>
            <div v-if="errors.confirmPassword" class="error-message">
              {{ errors.confirmPassword }}
            </div>
          </div>
        </div>

        <!-- 平板/桌面版表格樣式 -->
        <table v-else class="data-table">
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
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path :d="showCurrentPassword ? mdiEyeOff : mdiEye" fill="currentColor"></path>
                    </svg>
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
                    placeholder="請輸入新密碼（8-20字元）"
                    autocomplete="new-password"
                  />
                  <button 
                    type="button" 
                    @click="showNewPassword = !showNewPassword"
                    class="password-toggle"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path :d="showNewPassword ? mdiEyeOff : mdiEye" fill="currentColor"></path>
                    </svg>
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
                  <p class="tips-title">密碼複雜度要求：</p>
                  <ul class="tips-list">
                    <li :class="{ completed: passwordValidation?.length }">
                      長度介於8至20字元之間
                    </li>
                    <li :class="{ completed: passwordValidation?.hasNumber }">
                      包含至少一個數字
                    </li>
                    <li :class="{ completed: passwordValidation?.hasUppercase }">
                      包含至少一個英文大寫字母
                    </li>
                    <li :class="{ completed: passwordValidation?.hasLowercase }">
                      包含至少一個英文小寫字母
                    </li>
                    <li :class="{ completed: passwordValidation?.hasSpecialChar }">
                      包含至少一個特殊符號（如：!@#$%^&*等）
                    </li>
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
                      success: passwordForm.confirmPassword && passwordForm.newPassword === passwordForm.confirmPassword && !errors.confirmPassword
                    }"
                    placeholder="請再次輸入新密碼"
                    autocomplete="new-password"
                  />
                  <button 
                    type="button" 
                    @click="showConfirmPassword = !showConfirmPassword"
                    class="password-toggle"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path :d="showConfirmPassword ? mdiEyeOff : mdiEye" fill="currentColor"></path>
                    </svg>
                  </button>
                </div>
                <div v-if="passwordForm.confirmPassword && !errors.confirmPassword && passwordForm.newPassword === passwordForm.confirmPassword" class="success-message">
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

  &.mobile-layout {
    .content-container {
      grid-template-columns: 1fr;
      gap: 15px;
      padding: 15px;
    }

    .user-card {
      order: 1;
    }

    .password-table {
      order: 2;
    }
  }

  &.tablet-layout {
    .content-container {
      grid-template-columns: 280px 1fr;
      gap: 16px;
      padding: 16px 20px;
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
  flex-wrap: wrap;

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
    white-space: nowrap;

    &:hover:not(:disabled) {
      background: #5b4bcf;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

    &:disabled {
      background: #9ca3af;
      cursor: not-allowed;
      transform: none;
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
    white-space: nowrap;

    &:hover:not(:disabled) {
      border-color: #6c5ce7;
      color: #6c5ce7;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

    &:disabled {
      color: #999;
      cursor: not-allowed;
      transform: none;
    }
  }
}

// 內容區域
.content-container {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 20px;
  padding: 20px 30px;
  max-width: 1400px;
  margin: 0 auto;
}

// 用戶資訊卡片
.user-card {
  background: white;
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  height: fit-content;
  transition: all 0.3s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .user-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6c5ce7 0%, #5b4bcf 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    box-shadow: 0 4px 12px rgba(108, 92, 231, 0.3);
    position: relative;
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%);
      border-radius: 50%;
    }

    .avatar-initials {
      font-size: 32px;
      font-weight: bold;
      position: relative;
      z-index: 1;
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
      word-break: break-all;
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
    background: linear-gradient(135deg, #fafbfc 0%, #f8f9fa 100%);

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
        animation: pulse 2s infinite;
      }
    }
  }

  // 手機版卡片樣式
  .mobile-form {
    padding: 20px;

    .form-card {
      background: #fafbfc;
      border: 1px solid #f0f0f0;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      transition: all 0.3s;

      &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      &:last-child {
        margin-bottom: 0;
      }

      .form-label {
        display: block;
        font-weight: 600;
        color: #333;
        margin-bottom: 12px;
        font-size: 14px;
      }
    }
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;

    .table-row {
      border-bottom: 1px solid #f0f0f0;
      transition: background-color 0.3s;

      &:hover {
        background: rgba(108, 92, 231, 0.02);
      }

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
        position: relative;

        &::after {
          content: '';
          position: absolute;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 2px;
          height: 60%;
          background: linear-gradient(to bottom, transparent, #6c5ce7, transparent);
          opacity: 0.3;
        }
      }

      .value-cell {
        padding: 25px;
        vertical-align: top;
      }
    }
  }
}

// 密碼輸入框樣式
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
    background: white;

    &:focus {
      outline: none;
      border-color: #6c5ce7;
      box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
      transform: translateY(-1px);
    }

    &.error {
      border-color: #dc3545;
      box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
    }

    &.success {
      border-color: #28a745;
      box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.1);
    }

    &::placeholder {
      color: #999;
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
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;

    &:hover {
      color: #6c5ce7;
      background: rgba(108, 92, 231, 0.1);
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
    position: relative;

    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(90deg, rgba(255,255,255,0.3) 0%, transparent 100%);
      border-radius: 2px;
    }

    .strength-fill {
      height: 100%;
      transition: all 0.3s ease;
      border-radius: 2px;
      position: relative;

      &.weak {
        background: linear-gradient(90deg, #dc3545 0%, #e74c3c 100%);
      }

      &.medium {
        background: linear-gradient(90deg, #ffc107 0%, #f39c12 100%);
      }

      &.strong {
        background: linear-gradient(90deg, #28a745 0%, #27ae60 100%);
      }
    }
  }

  .strength-text {
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;

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
  background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f4 100%);
  border-radius: 6px;
  border-left: 4px solid #6c5ce7;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(45deg, rgba(108, 92, 231, 0.02) 0%, transparent 100%);
    pointer-events: none;
  }

  .tips-title {
    font-size: 12px;
    font-weight: 600;
    color: #333;
    margin: 0 0 8px 0;
    position: relative;
    z-index: 1;
  }

  .tips-list {
    margin: 0;
    padding-left: 15px;
    list-style: none;
    position: relative;
    z-index: 1;

    li {
      font-size: 12px;
      color: #666;
      margin-bottom: 4px;
      position: relative;
      transition: all 0.3s;
      padding-left: 5px;

      &::before {
        content: '○';
        position: absolute;
        left: -15px;
        color: #ddd;
        transition: all 0.3s;
      }

      &.completed {
        color: #28a745;
        font-weight: 500;
        transform: translateX(2px);

        &::before {
          content: '✓';
          color: #28a745;
          animation: checkmark 0.3s ease;
        }
      }

      &:last-child {
        margin-bottom: 0;
      }
    }
  }
}

// 訊息樣式
.error-message {
  color: #dc3545;
  font-size: 12px;
  margin-top: 5px;
  display: flex;
  align-items: center;
  gap: 5px;
  animation: shake 0.3s ease;

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
  animation: fadeIn 0.3s ease;
}

// 動畫
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

@keyframes checkmark {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

@keyframes fadeIn {
  0% { opacity: 0; transform: translateY(-10px); }
  100% { opacity: 1; transform: translateY(0); }
}

// 響應式設計

// 平板樣式 (768px - 1024px)
@media (max-width: 1024px) and (min-width: 768px) {
  .change-password-page {
    &.tablet-layout {
      .action-buttons {
        padding: 16px 20px;
      }

      .user-card {
        padding: 20px;

        .user-avatar {
          width: 70px;
          height: 70px;
          margin-bottom: 16px;

          .avatar-initials {
            font-size: 28px;
          }
        }

        .user-details {
          .user-name {
            font-size: 16px;
          }
        }
      }

      .password-table {
        .table-header {
          padding: 20px 25px;

          .table-title {
            font-size: 16px;
          }

          .security-notice {
            font-size: 13px;
          }
        }

        .data-table {
          .table-row {
            .label-cell {
              width: 160px;
              padding: 20px;
              font-size: 13px;
            }

            .value-cell {
              padding: 20px;
            }
          }
        }
      }
    }
  }

  .password-strength .strength-bar {
    width: 160px;
  }
}

// 手機樣式 (< 768px)
@media (max-width: 767px) {
  .change-password-page {
    &.mobile-layout {
      .action-buttons {
        padding: 15px;
        gap: 10px;

        .save-btn,
        .reset-btn,
        .back-btn {
          flex: 1;
          padding: 12px 16px;
          font-size: 13px;
          min-width: 0;
        }
      }

      .content-container {
        padding: 15px;
        gap: 15px;
      }

      .user-card {
        padding: 20px;
        border-radius: 8px;

        .user-avatar {
          width: 70px;
          height: 70px;
          margin-bottom: 16px;

          .avatar-initials {
            font-size: 28px;
          }
        }

        .user-details {
          .user-name {
            font-size: 16px;
            margin-bottom: 6px;
          }

          .user-account {
            font-size: 13px;
            margin-bottom: 3px;
          }

          .user-email {
            font-size: 11px;
          }
        }
      }

      .password-table {
        .table-header {
          padding: 20px;

          .table-title {
            font-size: 16px;
            margin-bottom: 8px;
          }

          .security-notice {
            font-size: 13px;
          }
        }

        .mobile-form {
          padding: 15px;

          .form-card {
            padding: 16px;
            margin-bottom: 16px;
            border-radius: 8px;

            .form-label {
              font-size: 13px;
              margin-bottom: 10px;
            }

            .password-input-wrapper .form-input {
              max-width: none;
              padding: 12px 40px 12px 12px;
              font-size: 16px; // 避免iOS縮放
            }
          }
        }
      }

      .password-strength {
        .strength-bar {
          width: 150px;
        }

        .strength-text {
          font-size: 11px;
        }
      }

      .password-tips {
        padding: 12px;
        margin-top: 12px;

        .tips-title {
          font-size: 11px;
          margin-bottom: 6px;
        }

        .tips-list li {
          font-size: 11px;
          margin-bottom: 3px;
        }
      }
    }
  }
}

// 超小屏幕樣式 (< 480px)
@media (max-width: 479px) {
  .change-password-page {
    &.mobile-layout {
      .action-buttons {
        padding: 12px;
        flex-direction: column;

        .save-btn,
        .reset-btn,
        .back-btn {
          width: 100%;
          padding: 14px 20px;
          font-size: 14px;
        }
      }

      .content-container {
        padding: 12px;
        gap: 12px;
      }

      .user-card {
        padding: 16px;

        .user-avatar {
          width: 60px;
          height: 60px;
          margin-bottom: 12px;

          .avatar-initials {
            font-size: 24px;
          }
        }
      }

      .password-table {
        .table-header {
          padding: 16px;

          .table-title {
            font-size: 15px;
          }

          .security-notice {
            font-size: 12px;
          }
        }

        .mobile-form {
          padding: 12px;

          .form-card {
            padding: 14px;
            margin-bottom: 12px;

            .password-input-wrapper .form-input {
              padding: 14px 40px 14px 12px;
            }
          }
        }
      }

      .password-strength {
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;

        .strength-bar {
          width: 100%;
          height: 6px;
        }
      }

      .password-tips {
        padding: 10px;

        .tips-list {
          padding-left: 12px;

          li {
            font-size: 10px;
          }
        }
      }
    }
  }
}

// 橫屏平板樣式
@media (orientation: landscape) and (max-width: 1024px) and (min-width: 768px) {
  .change-password-page.tablet-layout {
    .content-container {
      grid-template-columns: 260px 1fr;
    }
  }
}

// 高分辨率屏幕優化
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .form-input, .user-card, .password-table {
    border-width: 0.5px;
  }
}

// 列印樣式
@media print {
  .change-password-page {
    background: white;
    padding: 0;

    .action-buttons {
      display: none;
    }

    .content-container {
      grid-template-columns: 1fr;
      gap: 20px;
      padding: 20px;
    }

    .password-table {
      box-shadow: none;
      border: 1px solid #ddd;

      .password-tips {
        background: white;
        border: 1px solid #ddd;
      }
    }

    .password-toggle {
      display: none;
    }
  }
}

// 無障礙樣式
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

</style>
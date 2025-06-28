<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountStore } from '@/stores/account'

const router = useRouter()
const accountStore = useAccountStore()

// 表單狀態
const isSaving = ref(false)

// 表單資料
const formData = reactive({
  credential: '',
  name: '',
  email: ''
})

// 表單驗證錯誤
const errors = ref({})

// 表單驗證
const validateForm = () => {
  errors.value = {}
  
  // 帳號驗證
  if (!formData.credential.trim()) {
    errors.value.credential = '帳號為必填欄位'
  }
  
  // 姓名驗證
  if (!formData.name.trim()) {
    errors.value.name = '姓名為必填欄位'
  }
  
  // Email驗證
  if (!formData.email.trim()) {
    errors.value.email = 'Email為必填欄位'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.value.email = 'Email格式不正確'
  }
  
  return Object.keys(errors.value).length === 0
}

// 儲存表單
const handleSave = async () => {
  if (!validateForm()) {
    return
  }
  
  isSaving.value = true
  try {
    // 這裡調用 API 儲存資料
    console.log('儲存表單資料:', formData)
    
    // 模擬 API 調用
    const result = await accountStore.createAccount(formData)
    console.log('儲存結果:', result);
    
    if(result.statusCode === 200){
        alert('儲存成功！')
        // 可以選擇跳轉到其他頁面或重置表單
        router.push('/settings/account-management') // 假設儲存成功後跳轉到帳號列表頁面
    }else{
        throw new Error(result.data.message)
    }
    
  } catch (error) {
    console.error('儲存失敗:', error)
    alert(error)
  } finally {
    isSaving.value = false
  }
}

// 取消操作
const handleCancel = () => {
  if (confirm('確定要取消嗎？未儲存的變更將會遺失。')) {
    // 重置表單或跳轉頁面
    formData.credential = ''
    formData.name = ''
    formData.email = ''
    errors.value = {}
    router.push('/settings/account-management') // 假設儲存成功後跳轉到帳號列表頁面
  }
}
</script>

<template>
  <div class="form-page">
    <div class="form-container">
      <!-- 操作按鈕 -->
      <div class="action-buttons">
        <button 
          class="btn btn-primary" 
          @click="handleSave"
          :disabled="isSaving"
        >
          <span v-if="isSaving" class="btn-loading">⟳</span>
          儲存帳號
        </button>
        <button 
          class="btn btn-secondary" 
          @click="handleCancel"
          :disabled="isSaving"
        >
          取消
        </button>
      </div>

      <!-- 表單內容 -->
      <div class="form-content">
        <form @submit.prevent="handleSave">
          <!-- 帳號 -->
          <div class="form-row">
            <div class="form-label">
              <label for="account">帳號</label>
            </div>
            <div class="form-input-wrapper">
              <input
                id="account"
                type="text"
                v-model="formData.credential"
                class="form-input"
                :class="{ error: errors.credential }"
                placeholder="請輸入帳號"
              />
              <span v-if="errors.credential" class="error-message">{{ errors.credential }}</span>
            </div>
          </div>

          <!-- 姓名 -->
          <div class="form-row">
            <div class="form-label">
              <label for="name">姓名</label>
            </div>
            <div class="form-input-wrapper">
              <input
                id="name"
                type="text"
                v-model="formData.name"
                class="form-input"
                :class="{ error: errors.name }"
                placeholder="請輸入姓名"
              />
              <span v-if="errors.name" class="error-message">{{ errors.name }}</span>
            </div>
          </div>

          <!-- Email -->
          <div class="form-row">
            <div class="form-label">
              <label for="email">Email 信箱</label>
            </div>
            <div class="form-input-wrapper">
              <input
                id="email"
                type="email"
                v-model="formData.email"
                class="form-input"
                :class="{ error: errors.email }"
                placeholder="請輸入Email"
              />
              <span v-if="errors.email" class="error-message">{{ errors.email }}</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.form-page {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.form-container {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

// 操作按鈕
.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 30px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;

  .btn {
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    display: flex;
    align-items: center;
    gap: 8px;

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    &.btn-primary {
      background: #6c5ce7;
      color: white;

      &:hover:not(:disabled) {
        background: #5b4bcf;
        transform: translateY(-1px);
      }
    }

    &.btn-secondary {
      background: #6c757d;
      color: white;

      &:hover:not(:disabled) {
        background: #5a6268;
        transform: translateY(-1px);
      }
    }

    .btn-loading {
      animation: spin 1s linear infinite;
    }
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// 表單內容
.form-content {
  padding: 30px;
}

.form-row {
  display: flex;
  margin-bottom: 25px;
  align-items: flex-start;

  &:last-child {
    margin-bottom: 0;
  }

  .form-label {
    width: 120px;
    min-width: 120px;
    padding: 12px 20px 12px 0;
    color: #333;
    font-weight: 500;
    font-size: 14px;
    display: flex;
    align-items: center;

    label {
      cursor: pointer;
    }
  }

  .form-input-wrapper {
    flex: 1;
    max-width: 300px;

    .form-input {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      transition: all 0.2s;

      &:focus {
        outline: none;
        border-color: #6c5ce7;
        box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
      }

      &.error {
        border-color: #e74c3c;
        box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
      }

      &::placeholder {
        color: #999;
      }
    }

    .error-message {
      display: block;
      color: #e74c3c;
      font-size: 12px;
      margin-top: 5px;
    }
  }
}

// 響應式設計
@media (max-width: 768px) {
  .form-page {
    padding: 15px;
  }

  .form-container {
    margin: 0;
  }

  .action-buttons {
    flex-direction: column;
    gap: 10px;
    padding: 15px 20px;

    .btn {
      width: 100%;
      justify-content: center;
    }
  }

  .form-content {
    padding: 20px;
  }

  .form-row {
    flex-direction: column;
    margin-bottom: 20px;

    .form-label {
      width: 100%;
      min-width: auto;
      padding: 0 0 8px 0;
      margin-bottom: 5px;
    }

    .form-input-wrapper {
      max-width: none;
    }
  }
}

// 平板響應式
@media (max-width: 1024px) and (min-width: 769px) {
  .form-container {
    margin: 0 20px;
  }
  
  .form-row .form-input-wrapper {
    max-width: 400px;
  }
}
</style>
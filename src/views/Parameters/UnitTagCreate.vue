<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUnitTagStore } from '@/stores/unit.tag'

const router = useRouter()
const tagStore = useUnitTagStore()

// 表單資料 - 只需要 name
const formData = reactive({
  name: ''
})

// 表單錯誤
const formErrors = ref({})

// 狀態
const isSaving = ref(false)

// 驗證表單
const validateForm = () => {
  const errors = {}
  
  if (!formData.name || !formData.name.trim()) {
    errors.name = '請輸入單位標籤名稱'
  } else if (formData.name.trim().length > 50) {
    errors.name = '單位標籤名稱不能超過50個字元'
  }
  
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

// 提交表單
const handleSubmit = async () => {
  // 驗證表單
  if (!validateForm()) {
    return
  }
  
  try {
    isSaving.value = true
    
    // 準備提交資料 - 只傳送 name
    const submitData = {
      name: formData.name.trim()
    }
    
    console.log('提交資料:', submitData)
    
    // 呼叫 API 新增
    const result = await tagStore.createTag(submitData)
    
    if (result.success) {
      alert('新增成功！')
      router.push('/settings/parameter/unit-tag-management')
    } else {
      alert(`新增失敗: ${result.message}`)
    }
  } catch (error) {
    console.error('新增單位標籤異常:', error)
    alert('新增時發生錯誤，請稍後再試')
  } finally {
    isSaving.value = false
  }
}

// 取消操作
const handleCancel = () => {
  if (formData.name.trim() && confirm('確定要取消嗎？未儲存的資料將會遺失。')) {
    router.push('/settings/parameter/unit-tag-management')
  } else if (!formData.name.trim()) {
    router.push('/settings/parameter/unit-tag-management')
  }
}

// 清除特定欄位錯誤
const clearFieldError = (field) => {
  if (formErrors.value[field]) {
    delete formErrors.value[field]
  }
}
</script>

<template>
  <div class="tag-create-page">
    <div class="page-header">
      <h1 class="page-title">新增單位標籤</h1>
      <p class="page-subtitle">填寫以下資訊以新增單位標籤</p>
    </div>

    <div class="form-container">
      <form @submit.prevent="handleSubmit" class="tag-form">
        <!-- 單位標籤名稱 -->
        <div class="form-group">
          <label class="form-label required">
            單位標籤名稱
          </label>
          <input
            v-model="formData.name"
            type="text"
            class="form-input"
            :class="{ 'error': formErrors.name }"
            placeholder="請輸入單位標籤名稱"
            maxlength="50"
            @input="clearFieldError('name')"
          />
          <div class="char-count">
            {{ formData.name.length }} / 50
          </div>
          <div v-if="formErrors.name" class="error-message">
            {{ formErrors.name }}
          </div>
        </div>

        <!-- 按鈕區域 -->
        <div class="form-actions">
          <button 
            type="button" 
            class="btn btn-secondary"
            @click="handleCancel"
            :disabled="isSaving"
          >
            取消
          </button>
          <button 
            type="submit" 
            class="btn btn-primary"
            :disabled="isSaving"
          >
            {{ isSaving ? '儲存中...' : '儲存' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.tag-create-page {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 30px;
  
  .page-title {
    font-size: 24px;
    font-weight: 600;
    color: #333;
    margin: 0 0 8px 0;
  }
  
  .page-subtitle {
    font-size: 14px;
    color: #666;
    margin: 0;
  }
}

.form-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 30px;
  max-width: 800px;
}

.tag-form {
  .form-group {
    margin-bottom: 25px;
    
    .form-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #333;
      margin-bottom: 8px;
      
      &.required::after {
        content: ' *';
        color: #e74c3c;
      }
    }
    
    .form-input {
      width: 100%;
      padding: 12px 15px;
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
        border-color: #e74c3c;
        
        &:focus {
          box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
        }
      }
      
      &::placeholder {
        color: #999;
      }
    }
    
    .char-count {
      font-size: 12px;
      color: #999;
      text-align: right;
      margin-top: 4px;
    }
    
    .error-message {
      font-size: 13px;
      color: #e74c3c;
      margin-top: 6px;
      display: flex;
      align-items: center;
      gap: 4px;
      
      &::before {
        content: '⚠';
        font-size: 14px;
      }
    }
  }
  
  .form-actions {
    display: flex;
    gap: 15px;
    justify-content: flex-end;
    margin-top: 35px;
    padding-top: 25px;
    border-top: 1px solid #f0f0f0;
  }
}

// 按鈕樣式
.btn {
  padding: 12px 30px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  border: none;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }
  
  &:not(:disabled):hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }
  
  &.btn-primary {
    background: #6c5ce7;
    color: white;
    
    &:hover:not(:disabled) {
      background: #5b4bcf;
    }
  }
  
  &.btn-secondary {
    background: white;
    color: #666;
    border: 1px solid #ddd;
    
    &:hover:not(:disabled) {
      background: #f8f9fa;
      border-color: #adb5bd;
    }
  }
}

// 響應式設計
@media (max-width: 768px) {
  .tag-create-page {
    padding: 15px;
  }
  
  .form-container {
    padding: 20px;
  }
  
  .form-actions {
    flex-direction: column;
    
    .btn {
      width: 100%;
    }
  }
}
</style>
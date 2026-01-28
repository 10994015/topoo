<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUnitTagStore } from '@/stores/unit.tag'

const router = useRouter()
const route = useRoute()
const tagStore = useUnitTagStore()

// 從路由參數取得 ID
const tagId = route.params.id

// 表單資料 - 只需要 name
const formData = reactive({
  name: ''
})

// 原始資料（用於比對是否有變更）
const originalData = ref({
  name: ''
})

// 表單錯誤
const formErrors = ref({})

// 狀態
const isSaving = ref(false)
const isLoading = ref(false)

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

// 載入單位標籤詳細資料
const loadTagDetail = async () => {
  try {
    isLoading.value = true
    
    const result = await tagStore.fetchTagDetail(tagId)
    
    if (result.success && result.data) {
      const data = result.data
      
      // 填充表單資料
      formData.name = data.name || ''
      
      // 保存原始資料
      originalData.value = {
        name: data.name || ''
      }
      
      console.log('載入的單位標籤資料:', data)
    } else {
      alert('找不到指定的單位標籤')
      router.push('/settings/parameter/unit-tag-management')
    }
  } catch (error) {
    console.error('載入單位標籤詳細資料失敗:', error)
    alert('載入資料時發生錯誤')
    router.push('/settings/parameter/unit-tag-management')
  } finally {
    isLoading.value = false
  }
}

// 檢查是否有變更
const hasChanges = () => {
  return formData.name.trim() !== originalData.value.name
}

// 提交表單
const handleSubmit = async () => {
  // 驗證表單
  if (!validateForm()) {
    return
  }
  
  // 檢查是否有變更
  if (!hasChanges()) {
    alert('沒有任何變更')
    return
  }
  
  try {
    isSaving.value = true
    
    // 準備提交資料 - 只傳送 name
    const submitData = {
      name: formData.name.trim()
    }
    
    console.log('提交資料:', submitData)
    
    // 呼叫 API 更新
    const result = await tagStore.updateTag(tagId, submitData)
    
    if (result.success) {
      alert('更新成功！')
      router.push('/settings/parameter/unit-tag-management')
    } else {
      alert(`更新失敗: ${result.message}`)
    }
  } catch (error) {
    console.error('更新單位標籤異常:', error)
    alert('更新時發生錯誤，請稍後再試')
  } finally {
    isSaving.value = false
  }
}

// 取消操作
const handleCancel = () => {
  if (hasChanges()) {
    if (confirm('確定要取消嗎？未儲存的變更將會遺失。')) {
      router.push('/settings/parameter/unit-tag-management')
    }
  } else {
    router.push('/settings/parameter/unit-tag-management')
  }
}

// 清除特定欄位錯誤
const clearFieldError = (field) => {
  if (formErrors.value[field]) {
    delete formErrors.value[field]
  }
}

// 組件掛載
onMounted(async () => {
  if (!tagId) {
    alert('缺少單位標籤 ID')
    router.push('/settings/parameter/unit-tag-management')
    return
  }
  
  await loadTagDetail()
})
</script>

<template>
  <div class="tag-edit-page">
    <div class="page-header">
      <h1 class="page-title">編輯單位標籤</h1>
      <p class="page-subtitle">修改單位標籤資訊</p>
    </div>

    <!-- Loading 狀態 -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner">⟳</div>
      <div class="loading-text">載入中...</div>
    </div>

    <!-- 表單 -->
    <div v-else class="form-container">
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

        <!-- 變更提示 -->
        <div v-if="hasChanges()" class="change-notice">
          <span class="notice-icon">ⓘ</span>
          您已修改資料，請記得儲存變更
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
            :disabled="isSaving || !hasChanges()"
          >
            {{ isSaving ? '儲存中...' : '儲存變更' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.tag-edit-page {
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

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  
  .loading-spinner {
    display: inline-block;
    animation: spin 1s linear infinite;
    font-size: 48px;
    color: #6c5ce7;
    margin-bottom: 20px;
  }
  
  .loading-text {
    font-size: 16px;
    color: #666;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
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
  
  .change-notice {
    padding: 12px 16px;
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 6px;
    color: #856404;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
    
    .notice-icon {
      font-size: 18px;
      font-weight: bold;
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
  .tag-edit-page {
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
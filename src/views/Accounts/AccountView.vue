<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAccountStore } from '@/stores/account'
import { useAuthStore } from '@/stores/auth'
import { PERMISSIONS, checkPermission } from '@/utils/permissions'
import { formatDate, formatDateTime } from '@/utils/dateUtils'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const accountStore = useAccountStore()

const hasFullPermission = computed(() => authStore.canModify(PERMISSIONS.ACCOUNT_MANAGEMENT));

// 載入狀態
const isLoading = ref(false)
const isDeleting = ref(false)
const isSaving = ref(false)
const isEditing = ref(false)

// 帳號資料
const accountData = ref(null)
const editFormData = ref({})

// 表單驗證錯誤
const errors = reactive({})

// 面包屑
const breadcrumbs = computed(() => {
  const accountName = accountData.value?.name || route.params.id
  return [
    { text: '首頁', to: '/' },
    { text: '帳號管理', to: '/settings/account-management' },
    { text: `查看帳號 - ${accountName}`, to: null }
  ]
})

// 帳號狀態對應的中文
const getStatusLabel = (status) => {
  const statusMap = {
    'Open': '啟用',
    'UnderReview': '審核中',
    'ReviewFailed': '審核未通過',
    'Invalid': '停用',
    'Lock': '封鎖',
    'Inconvenient': '不便',
    'Leave': '請假'
  }
  return statusMap[status] || status
}

// 帳號狀態樣式
const getStatusClass = (status) => {
  const statusMap = {
    'Open': 'status-active',
    'UnderReview': 'status-pending',
    'ReviewFailed': 'status-inactive',
    'Invalid': 'status-inactive',
    'Lock': 'status-inactive',
    'Inconvenient': 'status-inactive',
    'Leave': 'status-inactive'
  }
  return statusMap[status] || ''
}

// 清空錯誤訊息
const clearErrors = () => {
  Object.keys(errors).forEach(key => delete errors[key])
}

// 表單驗證
const validateForm = () => {
  clearErrors()
  
  // 驗證姓名
  if (!editFormData.value.name || editFormData.value.name.trim() === '') {
    errors.name = '姓名為必填欄位'
  }

  
  // 驗證暱稱
  if(!editFormData.value.nick_name || editFormData.value.nick_name.trim() === '') {
    errors.nick_name = '暱稱為必填欄位'
  }else if (editFormData.value.nick_name && editFormData.value.nick_name.trim().length > 20) {
    errors.nick_name = '暱稱不能超過20個字元'
  }
  
  return Object.keys(errors).length === 0
}

// 載入帳號資料
const loadAccountData = async () => {
  isLoading.value = true
  try {
    // 這裡調用 API 獲取帳號詳情
    const response = await accountStore.getAccountById(route.params.id)
    accountData.value = response
   
  } catch (error) {
    console.error('載入帳號資料失敗:', error)
    alert('載入帳號資料失敗')
  } finally {
    isLoading.value = false
  }
}

// 編輯帳號
const handleEdit = () => {
  if(!hasFullPermission.value) {
    alert('您沒有權限編輯帳號')
    return;
  }
  isEditing.value = true
  // 複製當前資料到編輯表單
  editFormData.value = { ...accountData.value }
  // 清空錯誤訊息
  clearErrors()
}

// 取消編輯
const handleCancelEdit = () => {
  if (confirm('確定要取消編輯嗎？未儲存的變更將會遺失。')) {
    isEditing.value = false
    editFormData.value = {}
    clearErrors()
  }
}

// 儲存編輯
const handleSaveEdit = async () => {
  if(!hasFullPermission.value) {
    alert('您沒有權限編輯帳號')
    return;
  }
  
  // 表單驗證
  if (!validateForm()) {
    return
  }
  
  isSaving.value = true
  try {
    // 調用更新 API
    await accountStore.updateAccount(route.params.id, editFormData.value)
    console.log('更新帳號資料:', editFormData.value)
    
    // 更新本地資料
    accountData.value = { ...editFormData.value }
    isEditing.value = false
    clearErrors()
    alert('帳號更新成功！')
  } catch (error) {
    console.error('更新帳號失敗:', error)
    alert('更新失敗，請稍後再試')
  } finally {
    isSaving.value = false
  }
}

// 刪除帳號
const handleDelete = async () => {
  if(!hasFullPermission.value) {
    alert('您沒有權限刪除帳號')
    return;
  }
  if (!confirm(`確定要刪除帳號 "${accountData.value.credential}" 嗎？此操作無法復原。`)) {
    return
  }
  
  isDeleting.value = true
  try {
    // 調用刪除 API
    const response = await accountStore.deleteAccount(route.params.id)
    console.log(response);
    
    console.log('刪除帳號:', route.params.id)
    if(response.status !== 200) {
      alert(response.data.message || '刪除帳號失敗')
    }else{
      alert('帳號刪除成功！');
      router.push('/settings/account-management')
    }
  } catch (error) {
    console.error('刪除帳號失敗:', error)
    alert('刪除帳號失敗，請稍後再試')
  } finally {
    isDeleting.value = false
  }
}

// 返回列表
const handleBack = () => {
  router.push('/settings/account-management')
}

onMounted(() => {
  loadAccountData()
})
</script>

<template>
  <div class="account-view-page">
    <!-- 載入中 -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner">⟳</div>
      <div class="loading-text">載入中...</div>
    </div>

    <!-- 帳號詳情內容 -->
    <div v-else-if="accountData" class="account-detail">
      <!-- 操作按鈕 -->
      <div class="action-buttons">
        <template v-if="!isEditing">
          <button 
            v-if="hasFullPermission"
            class="btn btn-primary" 
            @click="handleEdit"
            :disabled="isDeleting"
          >
            編輯帳號
          </button>
          <button 
            v-if="hasFullPermission"
            class="btn btn-danger" 
            @click="handleDelete"
            :disabled="isDeleting"
          >
            <span v-if="isDeleting" class="btn-loading">⟳</span>
            刪除帳號
          </button>
          <button 
            class="btn btn-secondary" 
            @click="handleBack"
            :disabled="isDeleting"
          >
            返回
          </button>
        </template>
        
        <template v-else>
          <button 
            v-if="hasFullPermission"
            class="btn btn-primary" 
            @click="handleSaveEdit"
            :disabled="isSaving"
          >
            <span v-if="isSaving" class="btn-loading">⟳</span>
            儲存帳號
          </button>
          <button 
            class="btn btn-secondary" 
            @click="handleCancelEdit"
            :disabled="isSaving"
          >
            取消
          </button>
        </template>
      </div>

      <!-- 詳情表格 -->
      <div class="detail-card">
        <div class="detail-table">
          <div class="detail-row">
            <div class="detail-label">帳號</div>
            <div class="detail-value">
              <span class="readonly-field">{{ accountData.credential }}</span>
            </div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">姓名</div>
            <div class="detail-value">
              <div v-if="!isEditing">{{ accountData.name }}</div>
              <div v-else class="input-container">
                <input 
                  type="text" 
                  v-model="editFormData.name"
                  class="edit-input"
                  :class="{ error: errors.name }"
                  placeholder="請輸入姓名"
                />
                <div v-if="errors.name" class="error-message">
                  {{ errors.name }}
                </div>
              </div>
            </div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">暱稱</div>
            <div class="detail-value">
              <div v-if="!isEditing">{{ accountData.nick_name || '-' }}</div>
              <div v-else class="input-container">
                <input 
                  type="text" 
                  v-model="editFormData.nick_name"
                  class="edit-input"
                  :class="{ error: errors.nick_name }"
                  placeholder="請輸入暱稱"
                  maxlength="20"
                />
                <div v-if="errors.nick_name" class="error-message">
                  {{ errors.nick_name }}
                </div>
              </div>
            </div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">帳號狀態</div>
            <div class="detail-value">
              <span v-if="!isEditing" class="status-badge" :class="getStatusClass(accountData.status)">
                {{ getStatusLabel(accountData.status) }}
              </span>
              <select v-else v-model="editFormData.status" class="edit-select">
                <option value="Open">啟用</option>
                <option value="UnderReview">審核中</option>
                <option value="ReviewFailed">審核未通過</option>
                <option value="Invalid">停用</option>
                <option value="Lock">封鎖</option>
                <option value="Inconvenient">不便</option>
                <option value="Leave">請假</option>
              </select>
            </div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">Email 信箱</div>
            <div class="detail-value">
              <span >
                {{ accountData.email }}
              </span>
            </div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">單位</div>
            <div class="detail-value">
              <span>{{ accountData.repair_unit || '-' }}</span>
            </div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">登入來源</div>
            <div class="detail-value">
              <span class="readonly-field">{{ accountData.provider || '系統登入' }}</span>
            </div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">帳號建立日期</div>
            <div class="detail-value">
              <span class="readonly-field">{{ formatDateTime(accountData.created_at) }}</span>
            </div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">帳號停用日期</div>
            <div class="detail-value">
              <span class="readonly-field">{{ formatDateTime(accountData.disabled_at) || '-' }}</span>
            </div>
          </div>

          
        </div>
      </div>
    </div>

    <!-- 資料載入失敗 -->
    <div v-else class="error-container">
      <div class="error-icon">⚠️</div>
      <div class="error-message">無法載入帳號資料</div>
      <button class="btn btn-primary" @click="loadAccountData">
        重新載入
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.account-view-page {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

// 載入中
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #666;

  .loading-spinner {
    font-size: 32px;
    color: #6c5ce7;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  .loading-text {
    font-size: 16px;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// 錯誤狀態
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #666;

  .error-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }

  .error-message {
    font-size: 18px;
    margin-bottom: 20px;
  }
}

// 操作按鈕
.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-bottom: 20px;

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

    &.btn-danger {
      background: #e74c3c;
      color: white;

      &:hover:not(:disabled) {
        background: #c0392b;
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

// 詳情卡片
.detail-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.detail-table {
  .detail-row {
    display: flex;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }

    &.full-width {
      flex-direction: column;

      .detail-label {
        border-right: none;
        border-bottom: 1px solid #f0f0f0;
        background: #f8f9fa;
        width: 100%;
      }

      .detail-value {
        padding: 15px 20px;
      }
    }

    .detail-label {
      width: 200px;
      min-width: 200px;
      padding: 15px 20px;
      background: #f8f9fa;
      color: #333;
      font-weight: 500;
      font-size: 14px;
      border-right: 1px solid #f0f0f0;
      display: flex;
      align-items: center;
    }

    .detail-value {
      flex: 1;
      padding: 15px 20px;
      color: #666;
      font-size: 14px;
      display: flex;
      align-items: center;

      .input-container {
        width: 100%;
      }

      .remark-text {
        white-space: pre-wrap;
        line-height: 1.5;
      }

      .email-link {
        color: #6c5ce7;
        text-decoration: none;
        transition: color 0.2s;

        &:hover {
          color: #5b4bcf;
          text-decoration: underline;
        }
      }

      .readonly-field {
        color: #999;
        font-style: italic;
      }

      .error-message {
        color: #dc3545;
        font-size: 12px;
        margin-top: 5px;
      }
    }
  }
}

// 編輯表單樣式
.edit-input,
.edit-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #6c5ce7;
    box-shadow: 0 0 0 2px rgba(108, 92, 231, 0.1);
  }

  &.error {
    border-color: #dc3545;
    box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.1);
  }
}

.edit-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #6c5ce7;
    box-shadow: 0 0 0 2px rgba(108, 92, 231, 0.1);
  }

  &.error {
    border-color: #dc3545;
    box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.1);
  }
}

// 狀態標籤
.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;

  &.status-active {
    background: #d4edda;
    color: #155724;
  }

  &.status-inactive {
    background: #f8d7da;
    color: #721c24;
  }

  &.status-pending {
    background: #fff3cd;
    color: #856404;
  }
}

// 響應式設計
@media (max-width: 768px) {
  .account-view-page {
    padding: 15px;
  }

  .action-buttons {
    flex-direction: column;
    gap: 10px;

    .btn {
      width: 100%;
      justify-content: center;
    }
  }

  .detail-table .detail-row {
    flex-direction: column;

    .detail-label {
      width: 100%;
      min-width: auto;
      border-right: none;
      border-bottom: 1px solid #f0f0f0;
    }

    .detail-value {
      padding-top: 10px;
    }

    &.full-width .detail-label {
      border-bottom: 1px solid #f0f0f0;
    }
  }

  .breadcrumb {
    font-size: 12px;
    flex-wrap: wrap;
  }
}
</style>
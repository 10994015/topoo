<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useRepairStatusStore } from '@/stores/repair.status'
import { formatDate, formatDateTime } from '@/utils/dateUtils'

const router = useRouter()
const route = useRoute()
const statusStore = useRepairStatusStore()

// 表單資料
const formData = reactive({
  name: ''
})

// 狀態管理
const isLoading = ref(false)
const isSaving = ref(false)
const isLoadingDetail = ref(false)
const errors = ref({})

// 右側列表相關狀態
const currentPage = ref(1)
const pageSize = ref(10)
const sortConfig = ref({
  field: 'sequence',
  order: 'asc'
})

// 狀態列表資料
const statusData = ref([])
const totalItems = ref(0)
const totalPages = ref(0)

// 計算屬性 - 判斷是否為編輯模式
const isEditMode = computed(() => {
  return route.params.statusId && route.params.statusId !== 'create'
})

// 計算屬性 - 當前編輯的狀態ID
const statusId = computed(() => route.params.statusId)

// 計算屬性 - 頁面標題
const pageTitle = computed(() => {
  return isEditMode.value ? '編輯維修狀態' : '新增維修狀態'
})

// 計算屬性 - 按鈕文字
const submitButtonText = computed(() => {
  return isEditMode.value ? '儲存' : '儲存'
})

// 計算項目範圍
const startItem = computed(() => {
  return totalItems.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1
})

const endItem = computed(() => {
  const end = currentPage.value * pageSize.value
  return end > totalItems.value ? totalItems.value : end
})

// 顯示的頁碼
const visiblePages = computed(() => {
  const pages = []
  const total = totalPages.value
  const current = currentPage.value
  
  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    } else if (current >= total - 3) {
      pages.push(1)
      pages.push('...')
      for (let i = total - 4; i <= total; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)
      pages.push('...')
      for (let i = current - 1; i <= current + 1; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    }
  }
  
  return pages
})

// 表單驗證
const validateForm = () => {
  errors.value = {}
  let isValid = true

  // 驗證狀態名稱
  if (!formData.name || !formData.name.trim()) {
    errors.value.name = '請輸入維修狀態名稱'
    isValid = false
  } else if (formData.name.trim().length < 2) {
    errors.value.name = '維修狀態名稱至少需要2個字符'
    isValid = false
  } else if (formData.name.trim().length > 50) {
    errors.value.name = '維修狀態名稱不能超過50個字符'
    isValid = false
  }

  return isValid
}

// 載入狀態列表
const loadStatusList = async () => {
  try {
    const params = {
      pageSize: pageSize.value,
      page: currentPage.value,
      sortBy: sortConfig.value.field,
      sortOrder: sortConfig.value.order
    }
    
    await statusStore.fetchStatuses(
      { name: '' }, // 空搜尋條件
      sortConfig.value.field,
      sortConfig.value.order.toLowerCase(),
      pageSize.value,
      currentPage.value
    )
    
    statusData.value = statusStore.statuses?.data?.data || []
    totalItems.value = statusStore.statuses?.data?.total || 0
    totalPages.value = statusStore.statuses?.data?.totalPages || 0
  } catch (error) {
    console.error('載入狀態列表失敗:', error)
    statusData.value = []
    totalItems.value = 0
    totalPages.value = 0
  }
}

// 載入狀態詳細資料 (編輯模式)
const loadStatusDetail = async () => {
  if (!isEditMode.value) return

  try {
    isLoadingDetail.value = true
    
    const result = await statusStore.fetchStatusDetail(route.params.statusId)
    console.log('載入狀態詳細資料:', result);
    
    if (result.success) {
      // 填入表單資料
      formData.name = result.data.name || ''
      // 最後更新時間
      formData.updatedAt = result.data.updated_at
    } else {
      console.error('載入狀態詳細資料失敗:', result.message)
      alert(`載入失敗: ${result.message}`)
    }
  } catch (error) {
    console.error('載入狀態詳細資料異常:', error)
    alert('載入資料時發生錯誤，請稍後再試')
  } finally {
    isLoadingDetail.value = false
  }
}

// 分頁大小變更
const handlePageSizeChange = async () => {
  currentPage.value = 1
  await loadStatusList()
}

// 排序功能
const handleSort = async (field) => {
  if (sortConfig.value.field === field) {
    if (sortConfig.value.order === 'ASC') {
      sortConfig.value.order = 'DESC'
    } else if (sortConfig.value.order === 'DESC') {
      sortConfig.value.field = ''
      sortConfig.value.order = ''
    } else {
      sortConfig.value.order = 'ASC'
    }
  } else {
    sortConfig.value.field = field
    sortConfig.value.order = 'ASC'
  }
  
  await loadStatusList()
}

// 取得排序圖示
const getSortIcon = (field) => {
  if (sortConfig.value.field !== field) {
    return '⇅'
  }
  return sortConfig.value.order === 'ASC' ? '↑' : '↓'
}

// 取得排序類別
const getSortClass = (field) => {
  if (sortConfig.value.field === field) {
    return `sorted-${sortConfig.value.order.toLowerCase()}`
  }
  return ''
}

// 分頁跳轉
const goToPage = async (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    await loadStatusList()
  }
}

// 提交表單
const handleSubmit = async () => {
  // 表單驗證
  if (!validateForm()) {
    return
  }

  try {
    isSaving.value = true
    
    const submitData = {
      name: formData.name.trim()
    }

    let result
    
    if (isEditMode.value) {
      // 編輯模式
      result = await statusStore.updateStatus(route.params.statusId, submitData)
    } else {
      // 新增模式
      result = await statusStore.createStatus(submitData)
    }

    if (result.success) {
      const action = isEditMode.value ? '更新' : '新增'
      alert(`${action}成功！`)
      
      // 重新載入列表
      await loadStatusList()
      
      // 新增成功後清除輸入框，編輯模式則保持原樣
      if (!isEditMode.value) {
        handleReset()
      }
     
    } else {
      console.error('操作失敗:', result.message)
      alert(`操作失敗: ${result.message}`)
      
      // 如果是驗證錯誤，嘗試解析錯誤訊息
      if (result.error && typeof result.error === 'object') {
        if (result.error.name) {
          errors.value.name = Array.isArray(result.error.name) 
            ? result.error.name[0] 
            : result.error.name
        }
      }
    }
  } catch (error) {
    console.error('提交表單異常:', error)
    alert('操作時發生錯誤，請稍後再試')
  } finally {
    isSaving.value = false
  }
}

// 取消操作
const handleCancel = () => {
  router.push('/settings/parameter/repair-status-management')
}

// 重置表單
const handleReset = () => {
  formData.name = ''
  errors.value = {}
}

// 置頂功能 (編輯模式限定)
const handleMoveToTop = async () => {
  if (!isEditMode.value) return
  
  try {
    isSaving.value = true
    
    const result = await statusStore.handleMoveToTop(route.params.statusId)
    
    if (result.success) {
      alert('狀態已置頂！')
      
      // 重新載入列表
      await loadStatusList()
      
    } else {
      console.error('置頂失敗:', result.message)
      alert(`置頂失敗: ${result.message}`)
    }
  } catch (error) {
    console.error('置頂異常:', error)
    alert('置頂時發生錯誤，請稍後再試')
  } finally {
    isSaving.value = false
  }
}

// 刪除指定狀態
const deleteStatus = async (item) => {
  const confirmMessage = `確定要刪除維修狀態「${item.name}」嗎？\n\n此操作無法復原。`
  
  if (!confirm(confirmMessage)) {
    return
  }
  
  try {
    const result = await statusStore.deleteStatus(item.id)
    
    if (result.success) {
      alert('刪除成功！')
      await loadStatusList()
      
      // 如果刪除的是當前編輯的狀態，跳轉到新增模式
      if (isEditMode.value && item.id === statusId.value) {
        router.push('/settings/parameter/repair-status/create')
      }
    } else {
      console.error('刪除失敗:', result.message)
      alert(`刪除失敗: ${result.message}`)
    }
  } catch (error) {
    console.error('刪除異常:', error)
    alert('刪除時發生錯誤，請稍後再試')
  }
}

// 跳轉到編輯頁面
const editStatus = (item) => {
  if (item.id === statusId.value) {
    return // 已經在編輯這個狀態
  }
  router.push(`/settings/parameter/repair-status/edit/${item.id}`)
}

// 監聽路由變化
watch(() => route.params.statusId, (newId) => {
  if (newId && newId !== 'create') {
    loadStatusDetail()
  } else {
    // 重置表單
    formData.name = ''
    errors.value = {}
  }
}, { immediate: true })

// 組件掛載
onMounted(async () => {
  await loadStatusList()
  
  // 如果是編輯模式，載入詳細資料
  if (isEditMode.value) {
    await loadStatusDetail()
  }
})
</script>

<template>
  <div class="status-form-page">
    <div class="page-container">
      <!-- 左側表單區域 -->
      <div class="left-section">
        <!-- 新增模式的表單 -->
        <div v-if="!isEditMode" class="form-card">
          <h3 class="form-title">新增維修狀態</h3>
          
          <form @submit.prevent="handleSubmit" class="status-form">
            <div class="form-group">
              <label for="statusName" class="form-label">維修狀態</label>
              <input
                id="statusName"
                type="text"
                v-model="formData.name"
                :class="['form-input', { 'error': errors.name }]"
                placeholder="待維修"
                :disabled="isSaving"
                maxlength="50"
              />
              <span v-if="errors.name" class="error-message">{{ errors.name }}</span>
            </div>

            <div class="form-actions">
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="isSaving || !formData.name.trim()"
              >
                {{ isSaving ? '儲存中...' : '儲存' }}
              </button>
              <button
                type="button"
                class="btn btn-secondary"
                @click="handleCancel"
                :disabled="isSaving"
              >
                返回
              </button>
            </div>
          </form>
        </div>

        <!-- 編輯模式的狀態資料顯示 -->
        <div v-else class="info-card">
          <h3 class="info-title">維修狀態</h3>
          
          <div v-if="isLoadingDetail" class="loading-state">
            <div class="loading-spinner">⟳</div>
            <div>載入中...</div>
          </div>
          
          <div v-else class="info-content">
            <div class="form-group">
              <label for="editStatusName" class="form-label">維修狀態</label>
              <input
                id="editStatusName"
                type="text"
                v-model="formData.name"
                :class="['form-input', { 'error': errors.name }]"
                placeholder="待維修"
                :disabled="isSaving"
                maxlength="50"
              />
              <span v-if="errors.name" class="error-message">{{ errors.name }}</span>
            </div>

            <div class="info-row">
              <span class="info-label">最後更新時間</span>
              <span class="info-value">{{ formatDateTime(formData.updatedAt || '') }}</span>
            </div>

            <div class="form-actions">
              <button
                type="button"
                class="btn btn-primary"
                @click="handleSubmit"
                :disabled="isSaving || !formData.name.trim()"
              >
                {{ isSaving ? '儲存中...' : '儲存' }}
              </button>
              
              <button
                type="button"
                class="btn btn-secondary"
                @click="handleCancel"
                :disabled="isSaving"
              >
                返回
              </button>
              
              <button
                type="button"
                class="btn btn-outline"
                @click="handleMoveToTop"
                :disabled="isSaving"
              >
                置頂
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右側狀態列表 -->
      <div class="right-section">
        <div class="list-card">
          <div class="list-header">
            <select v-model="pageSize" @change="handlePageSizeChange" class="page-size-select">
              <option value="10">10筆/頁</option>
              <option value="20">20筆/頁</option>
              <option value="50">50筆/頁</option>
            </select>
          </div>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="id-column">項次</th>
                  <th 
                    class="name-column sortable-header" 
                    :class="getSortClass('name')"
                    @click="handleSort('name')"
                  >
                    故障原因
                    <span class="sort-icon">{{ getSortIcon('name') }}</span>
                  </th>
                  <th 
                    class="time-column sortable-header" 
                    :class="getSortClass('updated_at')"
                    @click="handleSort('updated_at')"
                  >
                    更新時間
                    <span class="sort-icon">{{ getSortIcon('updated_at') }}</span>
                  </th>
                  <th class="action-column">刪除</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="(item, index) in statusData" 
                  :key="item.id" 
                  class="table-row"
                  :class="{ 'active': isEditMode && item.id === statusId }"
                  @click="editStatus(item)"
                >
                  <td class="id-cell">{{ (currentPage - 1) * pageSize + index + 1 }}</td>
                  <td class="name-cell">{{ item.name }}</td>
                  <td class="time-cell">{{ formatDateTime(item.updated_at) || formatDateTime(item.created_at) }}</td>
                  <td class="action-cell">
                    <button 
                      class="delete-btn"
                      @click.stop="deleteStatus(item)"
                      title="刪除"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
                
                <tr v-if="statusData.length === 0">
                  <td colspan="4" class="no-data">暫無資料</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 分頁控制 -->
          <div class="pagination-area">
            <div class="pagination-info">
              顯示第 {{ startItem }} 到 {{ endItem }} 筆結果 共 {{ totalItems }} 項
            </div>

            <div class="pagination-controls">
              <button 
                class="page-btn prev-btn" 
                :disabled="currentPage === 1"
                @click="goToPage(currentPage - 1)"
              >
                ‹
              </button>
              
              <template v-for="page in visiblePages" :key="page">
                <button 
                  v-if="page !== '...'"
                  :class="['page-btn', { active: page === currentPage }]"
                  @click="goToPage(page)"
                >
                  {{ page }}
                </button>
                <span v-else class="ellipsis">...</span>
              </template>
              
              <button 
                class="page-btn next-btn" 
                :disabled="currentPage === totalPages"
                @click="goToPage(currentPage + 1)"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.status-form-page {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.page-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

// Loading 動畫
.loading-spinner {
  display: inline-block;
  animation: spin 1s linear infinite;
  font-size: 24px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
  color: #666;
}

// 左側區域
.left-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-card, .info-card {
  background: white;
  border-radius: 8px;
  padding: 25px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.form-title, .info-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #6c5ce7;
}

// 表單樣式
.status-form, .info-content {
  .form-group {
    margin-bottom: 20px;

    .form-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: #333;
      font-size: 14px;
    }

    .form-input {
      width: 100%;
      padding: 12px 15px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.3s;

      &:focus {
        outline: none;
        border-color: #6c5ce7;
        box-shadow: 0 0 0 2px rgba(108, 92, 231, 0.1);
      }

      &.error {
        border-color: #dc3545;
      }

      &::placeholder {
        color: #999;
      }

      &:disabled {
        background-color: #f8f9fa;
        color: #999;
        cursor: not-allowed;
      }
    }

    .error-message {
      display: block;
      margin-top: 5px;
      font-size: 12px;
      color: #dc3545;
    }
  }
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 20px;

  .info-label {
    font-weight: 500;
    color: #666;
    flex-shrink: 0;
    width: 120px;
  }

  .info-value {
    color: #333;
    word-break: break-all;
  }
}

.form-actions {
  display: flex;
  gap: 15px;
  margin-top: 30px;
  flex-wrap: wrap;
}

// 右側列表區域
.right-section {
  .list-card {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }
}

.list-header {
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;

  .page-size-select {
    padding: 8px 15px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    background: white;
  }
}

// 表格樣式
.table-container {
  overflow-x: auto;

  .data-table {
    width: 100%;
    border-collapse: collapse;

    thead {
      background: #6c5ce7;
      color: white;

      th {
        padding: 15px 20px;
        text-align: left;
        font-weight: 500;
        font-size: 14px;

        &.id-column {
          width: 80px;
          text-align: center;
        }

        &.action-column {
          width: 120px;
          text-align: center;
        }

        &.sortable-header {
          cursor: pointer;
          user-select: none;
          transition: background-color 0.3s;

          &:hover {
            background: rgba(255, 255, 255, 0.1);
          }

          .sort-icon {
            margin-left: 8px;
            opacity: 1;
            font-size: 14px;
          }
        }
      }
    }

    tbody {
      .table-row {
        border-bottom: 1px solid #f0f0f0;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          background: #f8f9fa;
        }

        &.active {
          background: #e3f2fd;
          border-left: 4px solid #6c5ce7;
        }

        td {
          padding: 15px 20px;
          font-size: 14px;
          color: #333;

          &.id-cell {
            text-align: center;
            font-weight: 500;
            color: #666;
          }

          &.action-cell {
            text-align: center;
          }
        }
      }

      .no-data {
        text-align: center;
        padding: 40px;
        color: #999;
        font-style: italic;
      }
    }
  }
}

.edit-btn, .delete-btn {
  background: #f8f9fa;
  border: none;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  color: #666;
  transition: all 0.2s;
  margin: 0 2px;

  &:hover {
    transform: scale(1.1);
  }
}

.edit-btn:hover {
  background: #fff3cd;
  color: #856404;
}

.delete-btn:hover {
  background: #ffebee;
  color: #d32f2f;
}

// 分頁樣式
.pagination-area {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-top: 1px solid #f0f0f0;

  .pagination-info {
    font-size: 14px;
    color: #666;
  }

  .pagination-controls {
    display: flex;
    gap: 5px;

    .page-btn {
      padding: 8px 12px;
      border: 1px solid #ddd;
      background: white;
      color: #333;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;

      &:hover:not(:disabled) {
        background: #f8f9fa;
        border-color: #6c5ce7;
      }

      &.active {
        background: #6c5ce7;
        color: white;
        border-color: #6c5ce7;
      }

      &:disabled {
        background: #f8f9fa;
        color: #ccc;
        cursor: not-allowed;
      }
    }

    .ellipsis {
      padding: 8px 4px;
      color: #666;
    }
  }
}

// 按鈕樣式
.btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  border: none;
  text-decoration: none;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }

  &:not(:disabled):hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  &.btn-primary {
    background: #6c5ce7;
    color: white;

    &:hover:not(:disabled) {
      background: #5b4bcf;
    }
  }

  &.btn-secondary {
    background: #f8f9fa;
    color: #666;
    border: 1px solid #ddd;

    &:hover:not(:disabled) {
      background: #e9ecef;
      border-color: #adb5bd;
    }
  }

  &.btn-outline {
    background: transparent;
    color: #6c5ce7;
    border: 1px solid #6c5ce7;

    &:hover:not(:disabled) {
      background: #6c5ce7;
      color: white;
    }
  }
}

// 響應式設計
@media (max-width: 1200px) {
  .page-container {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .right-section {
    order: -1;
  }
}

@media (max-width: 768px) {
  .status-form-page {
    padding: 15px;
  }

  .form-card, .info-card {
    padding: 20px;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }

  .data-table {
    th, td {
      padding: 10px 15px;
      font-size: 13px;
    }
  }

  .pagination-area {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }

  .info-row {
    flex-direction: column;
    gap: 5px;

    .info-label {
      width: auto;
      font-weight: 600;
    }
  }

  .action-cell {
    .edit-btn, .delete-btn {
      padding: 4px 8px;
      font-size: 14px;
    }
  }
}
</style>
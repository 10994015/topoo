<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useCategoryStore } from '@/stores/repair.category'
import { formatDateTime } from '@/utils/dateUtils'
import { PERMISSIONS } from '@/utils/permissions'
import { useAuthStore } from '@/stores/auth'
const router = useRouter()
const route = useRoute()
const categoryStore = useCategoryStore()
const authStore = useAuthStore()

const hasWriteManageRepairCategoryPermission = computed(() => authStore.canModify(PERMISSIONS.REPAIR_CATEGORY_MANAGEMENT))

// 表單資料
const formData = reactive({
  name: ''
})

// 狀態管理
const isLoading = ref(false)
const isSaving = ref(false)
const isLoadingDetail = ref(false)
const errors = ref({})

// RWD 狀態管理
const isMobile = ref(false)
const isTablet = ref(false)
const showMobileList = ref(false)

// 右側列表相關狀態
const currentPage = ref(1)
const pageSize = ref(10)
const sortConfig = ref({
  field: 'sequence',
  order: 'asc'
})

// 類別列表資料
const categoryData = ref([])
const totalItems = ref(0)
const totalPages = ref(0)

// 計算屬性 - 判斷是否為編輯模式
const isEditMode = computed(() => {
  return route.params.id && route.params.id !== 'create'
})

// 計算屬性 - 當前編輯的類別ID
const categoryId = computed(() => route.params.id)

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
  
  // 手機版顯示更少頁碼
  const maxVisible = isMobile.value ? 3 : 7
  
  if (total <= maxVisible) {
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    if (isMobile.value) {
      // 手機版簡化分頁
      if (current > 1) pages.push(1)
      if (current > 2) pages.push('...')
      pages.push(current)
      if (current < total - 1) pages.push('...')
      if (current < total) pages.push(total)
    } else {
      // 原有邏輯
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
  }
  
  return pages
})

// RWD 檢測
const checkScreenSize = () => {
  const width = window.innerWidth
  isMobile.value = width < 768
  isTablet.value = width >= 768 && width < 1024
  
  // 手機版預設顯示表單，平板以上預設顯示並排
  if (isMobile.value) {
    showMobileList.value = false
  }
}

// 切換手機版視圖
const toggleMobileView = () => {
  showMobileList.value = !showMobileList.value
}

// 表單驗證
const validateForm = () => {
  errors.value = {}
  let isValid = true

  // 驗證類別名稱
  if (!formData.name || !formData.name.trim()) {
    errors.value.name = '請輸入故障類別名稱'
    isValid = false
  } else if (formData.name.trim().length < 2) {
    errors.value.name = '故障類別名稱至少需要2個字符'
    isValid = false
  } else if (formData.name.trim().length > 50) {
    errors.value.name = '故障類別名稱不能超過50個字符'
    isValid = false
  }

  return isValid
}

// 載入類別列表
const loadCategoryList = async () => {
  try {
    const params = {
      pageSize: pageSize.value,
      page: currentPage.value,
      sortBy: sortConfig.value.field,
      sortOrder: sortConfig.value.order
    }
    
    const response = await categoryStore.fetchCategories(
      { name: '' }, // 空搜尋條件
      sortConfig.value.field,
      sortConfig.value.order.toLowerCase(),
      pageSize.value,
      currentPage.value
    )
    
    categoryData.value = categoryStore.categories?.data.data || []
    totalItems.value = categoryStore.categories?.data.total || 0
    totalPages.value = categoryStore.categories?.data.totalPages || 0
  } catch (error) {
    console.error('載入類別列表失敗:', error)
  }
}

// 載入類別詳細資料 (編輯模式)
const loadCategoryDetail = async () => {
  if (!isEditMode.value) return

  try {
    isLoadingDetail.value = true
    
    const result = await categoryStore.fetchCategoryDetail(route.params.id)
    console.log(result);
    
    if (result.success) {
      // 填入表單資料
      formData.name = result.data.name || ''
      // 最後更新時間
      formData.updatedAt = result.data.updated_at
    } else {
      console.error('載入類別詳細資料失敗:', result.message)
      alert(`載入失敗: ${result.message}`)
    }
  } catch (error) {
    console.error('載入類別詳細資料異常:', error)
    alert('載入資料時發生錯誤，請稍後再試')
  } finally {
    isLoadingDetail.value = false
  }
}

// 分頁大小變更
const handlePageSizeChange = async () => {
  currentPage.value = 1
  await loadCategoryList()
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
  
  await loadCategoryList()
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
    await loadCategoryList()
  }
}

// 提交表單
const handleSubmit = async () => {
  if(!hasWriteManageRepairCategoryPermission) return
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
      result = await categoryStore.updateCategory(route.params.id, submitData)
    } else {
      // 新增模式
      result = await categoryStore.createCategory(submitData)
    }

    if (result.success) {
      const action = isEditMode.value ? '更新' : '新增'
      alert(`${action}成功！`)
      
      // 重新載入列表
      await loadCategoryList()
      
      if(!isEditMode.value){
        // 清除輸入框
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
  router.push('/settings/parameter/repair-category-management')
}

// 重置表單
const handleReset = () => {
  formData.name = ''
  errors.value = {}
}

// 刪除類別 (編輯模式限定)
const handleDelete = async () => {
  if (!isEditMode.value) return
  
  const confirmMessage = `確定要刪除「${formData.name}」嗎？\n\n注意：刪除類別會同時刪除其所有相關的故障原因，此操作無法復原。`
  
  if (!confirm(confirmMessage)) {
    return
  }
  
  try {
    isLoading.value = true
    
    const result = await categoryStore.deleteCategory(route.params.id)
    
    if (result.success) {
      alert('刪除成功！')
      
      // 清除快取並返回列表頁
      categoryStore.clearAllCache()
      router.push('/settings/parameter/repair-category-management')
    } else {
      console.error('刪除失敗:', result.message)
      alert(`刪除失敗: ${result.message}`)
    }
  } catch (error) {
    console.error('刪除異常:', error)
    alert('刪除時發生錯誤，請稍後再試')
  } finally {
    isLoading.value = false
  }
}

// 刪除指定類別
const deleteCategory = async (item) => {
  if (!hasWriteManageRepairCategoryPermission) return
  const confirmMessage = `確定要刪除類別「${item.name}」嗎？\n\n注意：刪除類別會同時刪除其所有相關的故障原因，此操作無法復原。`
  
  if (!confirm(confirmMessage)) {
    return
  }
  
  try {
    const result = await categoryStore.deleteCategory(item.id)
    
    if (result.success) {
      alert('刪除成功！')
      await loadCategoryList()
      
      // 如果刪除的是當前編輯的類別，跳轉到新增模式
      if (isEditMode.value && item.id === categoryId.value) {
        router.push('/settings/parameter/repair-category-management')
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
const editCategory = (item) => {
  if (item.id === categoryId.value) {
    return // 已經在編輯這個類別
  }
  
  // 手機版點擊後切換到表單視圖
  if (isMobile.value) {
    showMobileList.value = false
  }
  
  router.push(`/settings/parameter/repair-category/edit/${item.id}`)
}

const handleMoveToTop = async() => {
    if(!hasWriteManageRepairCategoryPermission) return
    if (!isEditMode.value) return
    
    try {
        isSaving.value = true
        
        const result = await categoryStore.moveCategoryToTop(route.params.id)
        
        if (result.success) {
        alert('類別已置頂！')
        
        // 重新載入列表
        await loadCategoryList()
        
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

// 監聽路由變化
watch(() => route.params.id, (newId) => {
  if (newId && newId !== 'create') {
    loadCategoryDetail()
  } else {
    // 重置表單
    formData.name = ''
    errors.value = {}
  }
}, { immediate: true })

// 組件掛載
onMounted(async () => {
  // 初始化 RWD 檢測
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
  
  await loadCategoryList()
  
  // 如果是編輯模式，載入詳細資料
  if (isEditMode.value) {
    await loadCategoryDetail()
  }
})
</script>

<template>
  <div class="category-form-page">
    <!-- 手機版頂部導航 -->
    <div v-if="isMobile" class="mobile-nav">
      <button 
        class="mobile-nav-btn"
        :class="{ active: !showMobileList }"
        @click="showMobileList = false"
      >
        {{ isEditMode ? '編輯類別' : '新增類別' }}
      </button>
      <button 
        class="mobile-nav-btn"
        :class="{ active: showMobileList }"
        @click="showMobileList = true"
      >
        類別列表 ({{ totalItems }})
      </button>
    </div>

    <div class="page-container" :class="{ 'mobile-layout': isMobile, 'tablet-layout': isTablet }">
      <!-- 左側表單區域 -->
      <div class="left-section" :class="{ 'mobile-hidden': isMobile && showMobileList }">
        <!-- 新增模式的表單 -->
        <div v-if="!isEditMode" class="form-card">
          <h3 class="form-title">新增故障類別</h3>
          
          <form @submit.prevent="handleSubmit" class="category-form">
            <div class="form-group">
              <label for="categoryName" class="form-label">故障類別</label>
              <input
                id="categoryName"
                type="text"
                v-model="formData.name"
                :class="['form-input', { 'error': errors.name }]"
                placeholder="請輸入故障類別"
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
                v-if="hasWriteManageRepairCategoryPermission"
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

        <!-- 編輯模式的類別資料顯示 -->
        <div v-else class="info-card">
          <h3 class="info-title">故障類別</h3>
          
          <div v-if="isLoadingDetail" class="loading-state">
            <div class="loading-spinner">⟳</div>
            <div>載入中...</div>
          </div>
          
          <div v-else class="info-content">
            <div class="form-group">
              <label for="editCategoryName" class="form-label">故障類別</label>
              <input
                id="editCategoryName"
                type="text"
                v-model="formData.name"
                :class="['form-input', { 'error': errors.name }]"
                placeholder="請輸入故障類別"
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
                v-if="hasWriteManageRepairCategoryPermission"
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
                v-if="hasWriteManageRepairCategoryPermission"
              >
                置頂
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右側類別列表 -->
      <div class="right-section" :class="{ 'mobile-hidden': isMobile && !showMobileList }">
        <div class="list-card">
          <div class="list-header">
            <select v-model="pageSize" @change="handlePageSizeChange" class="page-size-select">
              <option value="10">10筆/頁</option>
              <option value="20">20筆/頁</option>
              <option value="50">50筆/頁</option>
            </select>
          </div>

          <!-- 手機版卡片式列表 -->
          <div v-if="isMobile" class="mobile-card-list">
            <div 
              v-for="(item, index) in categoryData" 
              :key="item.id" 
              class="mobile-card"
              :class="{ 'active': isEditMode && item.id === categoryId }"
              @click="editCategory(item)"
            >
              <div class="mobile-card-header">
                <span class="mobile-card-number">{{ (currentPage - 1) * pageSize + index + 1 }}</span>
                <div class="mobile-card-actions" v-if="hasWriteManageRepairCategoryPermission">
                  <button 
                    class="mobile-delete-btn"
                    @click.stop="deleteCategory(item)"
                    title="刪除"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <div class="mobile-card-content">
                <h4 class="mobile-card-title">{{ item.name }}</h4>
                <p class="mobile-card-time">
                  {{ formatDateTime(item.updated_at) || formatDateTime(item.created_at) }}
                </p>
              </div>
            </div>
            
            <div v-if="categoryData.length === 0" class="mobile-no-data">
              暫無資料
            </div>
          </div>

          <!-- 平板/桌面版表格 -->
          <div v-else class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="id-column">項次</th>
                  <th 
                    class="name-column sortable-header" 
                    :class="getSortClass('name')"
                    @click="handleSort('name')"
                  >
                    故障類別
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
                  <th class="action-column" v-if="hasWriteManageRepairCategoryPermission">刪除</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="(item, index) in categoryData" 
                  :key="item.id" 
                  class="table-row"
                  :class="{ 'active': isEditMode && item.id === categoryId }"
                  @click="editCategory(item)"
                >
                  <td class="id-cell">{{ (currentPage - 1) * pageSize + index + 1 }}</td>
                  <td class="name-cell">{{ item.name }}</td>
                  <td class="time-cell">{{ formatDateTime(item.updated_at) || formatDateTime(item.created_at) }}</td>
                  <td class="action-cell" v-if="hasWriteManageRepairCategoryPermission">
                    <button 
                      class="delete-btn"
                      @click.stop="deleteCategory(item)"
                      title="刪除"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
                
                <tr v-if="categoryData.length === 0">
                  <td :colspan="hasWriteManageRepairCategoryPermission ? 4 : 3" class="no-data">暫無資料</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 分頁控制 -->
          <div class="pagination-area">
            <div class="pagination-info">
              {{ isMobile ? `${startItem}-${endItem}/${totalItems}` : `顯示第 ${startItem} 到 ${endItem} 筆結果 共 ${totalItems} 項` }}
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
.category-form-page {
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
  
  &.mobile-layout {
    grid-template-columns: 1fr;
    gap: 0;
  }
  
  &.tablet-layout {
    grid-template-columns: 1fr 1.2fr;
    gap: 16px;
  }
}

// 手機版導航
.mobile-nav {
  display: flex;
  background: white;
  border-radius: 8px;
  margin-bottom: 15px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;

  .mobile-nav-btn {
    flex: 1;
    padding: 15px;
    border: none;
    background: #f8f9fa;
    color: #666;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;
    border-right: 1px solid #eee;

    &:last-child {
      border-right: none;
    }

    &.active {
      background: #6c5ce7;
      color: white;
    }

    &:hover:not(.active) {
      background: #e9ecef;
    }
  }
}

.mobile-hidden {
  display: none !important;
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
.category-form, .info-content {
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

// 手機版卡片列表
.mobile-card-list {
  padding: 15px;

  .mobile-card {
    background: white;
    border: 1px solid #f0f0f0;
    border-radius: 8px;
    margin-bottom: 12px;
    padding: 15px;
    cursor: pointer;
    transition: all 0.3s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
    }

    &.active {
      border-color: #6c5ce7;
      background: linear-gradient(135deg, #f8f7ff 0%, #fff 100%);
      box-shadow: 0 4px 12px rgba(108, 92, 231, 0.2);
    }

    .mobile-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;

      .mobile-card-number {
        background: #6c5ce7;
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
      }

      .mobile-card-actions {
        .mobile-delete-btn {
          background: #ffebee;
          border: none;
          padding: 6px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          color: #d32f2f;
          transition: all 0.2s;

          &:hover {
            background: #ffcdd2;
            transform: scale(1.1);
          }
        }
      }
    }

    .mobile-card-content {
      .mobile-card-title {
        font-size: 16px;
        font-weight: 600;
        color: #333;
        margin: 0 0 8px 0;
        line-height: 1.4;
      }

      .mobile-card-time {
        font-size: 13px;
        color: #666;
        margin: 0;
      }
    }
  }

  .mobile-no-data {
    text-align: center;
    padding: 40px 20px;
    color: #999;
    font-style: italic;
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
        white-space: nowrap;

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
  flex-wrap: wrap;
  gap: 10px;

  .pagination-info {
    font-size: 14px;
    color: #666;
    white-space: nowrap;
  }

  .pagination-controls {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;

    .page-btn {
      padding: 8px 12px;
      border: 1px solid #ddd;
      background: white;
      color: #333;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
      min-width: 36px;
      text-align: center;

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
  white-space: nowrap;

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

// 平板樣式 (768px - 1024px)
@media (max-width: 1024px) and (min-width: 768px) {
  .category-form-page {
    padding: 16px;
  }

  .form-card, .info-card {
    padding: 20px;
  }

  .data-table {
    th, td {
      padding: 12px 15px;
      font-size: 13px;
    }
  }

  .pagination-area {
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
}

// 手機樣式 (< 768px)
@media (max-width: 767px) {
  .category-form-page {
    padding: 10px;
  }

  .page-container.mobile-layout {
    margin: 0;
  }

  .form-card, .info-card {
    padding: 16px;
    margin: 0;
    border-radius: 8px;
  }

  .form-title, .info-title {
    font-size: 16px;
    margin-bottom: 16px;
  }

  .form-actions {
    flex-direction: column;
    gap: 10px;
    margin-top: 24px;

    .btn {
      width: 100%;
      justify-content: center;
      padding: 12px 20px;
    }
  }

  .info-row {
    flex-direction: column;
    gap: 4px;
    padding: 10px 0;

    .info-label {
      width: auto;
      font-weight: 600;
      font-size: 13px;
    }

    .info-value {
      font-size: 14px;
    }
  }

  .list-header {
    padding: 15px;

    .page-size-select {
      width: 100%;
      padding: 10px 15px;
    }
  }

  .pagination-area {
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 15px;

    .pagination-info {
      font-size: 13px;
      order: 2;
    }

    .pagination-controls {
      order: 1;
      justify-content: center;

      .page-btn {
        padding: 10px;
        min-width: 40px;
        font-size: 13px;
      }
    }
  }
}

// 超小屏幕樣式 (< 480px)
@media (max-width: 479px) {
  .category-form-page {
    padding: 8px;
  }

  .mobile-nav {
    margin-bottom: 10px;
    
    .mobile-nav-btn {
      padding: 12px 8px;
      font-size: 13px;
    }
  }

  .mobile-card {
    padding: 12px !important;
    margin-bottom: 10px !important;

    .mobile-card-header {
      margin-bottom: 8px;

      .mobile-card-number {
        font-size: 11px;
        padding: 3px 6px;
      }
    }

    .mobile-card-content {
      .mobile-card-title {
        font-size: 15px;
        margin-bottom: 6px;
      }

      .mobile-card-time {
        font-size: 12px;
      }
    }
  }

  .pagination-controls {
    .page-btn {
      padding: 8px;
      min-width: 36px;
      font-size: 12px;
    }
  }

  .form-input {
    padding: 10px 12px !important;
    font-size: 16px !important; // 避免iOS縮放
  }
}

// 橫屏平板樣式
@media (orientation: landscape) and (max-width: 1024px) and (min-width: 768px) {
  .page-container.tablet-layout {
    grid-template-columns: 1fr 1.5fr;
  }
}

// 高分辨率屏幕優化
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .btn, .mobile-card, .form-input {
    border-width: 0.5px;
  }
}


// 列印樣式
@media print {
  .category-form-page {
    background: white;
    padding: 0;
  }

  .mobile-nav, .form-actions, .pagination-area {
    display: none;
  }

  .page-container {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .mobile-card-actions, .action-cell {
    display: none;
  }
}
</style>
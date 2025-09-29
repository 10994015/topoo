<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useFaqStore } from '@/stores/faq'
import { formatDateTime } from '@/utils/dateUtils'
import { PERMISSIONS } from '@/utils/permissions'
import { useAuthStore } from '@/stores/auth'
import { mdiDelete, mdiDragVertical } from '@mdi/js'

const router = useRouter()
const route = useRoute()
const faqStore = useFaqStore()
const authStore = useAuthStore()

const hasWritePermission = computed(() => authStore.canModify(PERMISSIONS.FAQ_MANAGEMENT))
const categoryId = computed(() => route.params.categoryId)

// 表單資料
const formData = reactive({
  parentId: route.params.categoryId || '', // 從路由參數帶入 categoryId
  question: '',
  answer: '',
  status: 'Open'
})
// 狀態選項
const statusOptions = [
  { value: 'Open', label: '啟用' },
  { value: 'Invalid', label: '停用' }
]
// 狀態管理
const isLoading = ref(false)
const isSaving = ref(false)
const isLoadingDetail = ref(false)
const isLoadingCategories = ref(false)
const errors = ref({})

// RWD 狀態管理
const isMobile = ref(false)
const isTablet = ref(false)
const showMobileList = ref(false)

// 問題分類列表
const categoryOptions = ref([])

// 右側列表相關狀態
const currentPage = ref(1)
const pageSize = ref(10)
const sortConfig = ref({
  field: 'sequence',
  order: 'asc'
})

// FAQ列表資料 (只顯示第二層問題)
const faqData = ref([])
const totalItems = ref(0)
const totalPages = ref(0)
const currentCategoryName = ref('') // 當前分類名稱

// 拖拽相關狀態
const draggedItem = ref(null)
const draggedIndex = ref(-1)
const isDragging = ref(false)
const dragOverIndex = ref(-1)
const isUpdatingSequence = ref(false) // 跟蹤順序更新狀態

// 計算屬性 - 判斷是否為編輯模式
const isEditMode = computed(() => {
  return route.params.id && route.params.id !== 'create'
})

// 計算屬性 - 當前編輯的FAQ ID
const faqId = computed(() => route.params.id)
const faqCategoryId = computed(() => route.params.categoryId)

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

// 拖拽事件處理
const handleDragStart = (e, item, index) => {
  if (isMobile.value) return // 手機版不支援拖拽
  
  draggedItem.value = item
  draggedIndex.value = index
  isDragging.value = true
  
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/html', e.target.outerHTML)
  
  // 添加拖拽樣式
  e.target.style.opacity = '0.5'
}

const handleDragEnd = (e) => {
  if (isMobile.value) return
  
  // 重置樣式
  e.target.style.opacity = '1'
  
  // 重置拖拽狀態
  draggedItem.value = null
  draggedIndex.value = -1
  isDragging.value = false
  dragOverIndex.value = -1
}

const handleDragOver = (e, index) => {
  if (isMobile.value || !isDragging.value) return
  
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  
  dragOverIndex.value = index
}

const handleDragLeave = () => {
  if (isMobile.value) return
  dragOverIndex.value = -1
}

const handleDrop = async (e, targetIndex) => {
  if (isMobile.value || !isDragging.value) return
  
  e.preventDefault()
  
  const sourceIndex = draggedIndex.value
  
  if (sourceIndex === targetIndex) {
    dragOverIndex.value = -1
    return
  }
  
  try {
    // 開始更新狀態
    isUpdatingSequence.value = true
    
    // 計算新的順序
    const newSequence = targetIndex + 1 // 因為順序從 1 開始
    
    // 調用 API 更新順序 - 這裡使用 sub_fqa 的 ID
    const result = await faqStore.updateFaqSequence(
      draggedItem.value.id, 
      newSequence
    )
    
    if (result.success) {
      // 重新載入列表以反映新順序
      await forceReloadFaqList()
      
      // 顯示成功訊息 - 可以改成 toast 通知
      console.log('常見問題順序更新成功')
      
      // 可選：顯示成功提示
      // 如果你有 toast 組件，可以這樣使用：
      // showToast('常見問題順序更新成功', 'success')
    } else {
      console.error('更新順序失敗:', result.message)
      alert(`更新順序失敗: ${result.message}`)
    }
  } catch (error) {
    console.error('更新順序異常:', error)
    alert('更新順序時發生錯誤，請稍後再試')
  } finally {
    // 重置所有狀態
    dragOverIndex.value = -1
    isUpdatingSequence.value = false
  }
}

// 取得狀態顯示文字
const getStatusText = (status) => {
  return status === 'Open' ? '啟用' : '停用'
}

const getStatusClass = (status) => {
  return status === 'Open' ? 'status-enabled' : 'status-disabled'
}

// 根據parentId取得分類名稱
const getCategoryName = (parentId) => {
  // 優先使用當前儲存的分類名稱
  console.log(currentCategoryName.value);
  console.log(formData.parentId);
  console.log(parentId);
  
  if (currentCategoryName.value) {
    return currentCategoryName.value
  }
  
  // fallback 到 categoryOptions 查找
  const category = categoryOptions.value.find(cat => cat.id === parentId)
  return category ? category.question : '未分類'
}

// 表單驗證
const validateForm = () => {
  errors.value = {}
  let isValid = true

  // 驗證分類選擇
  if (!formData.parentId) {
    errors.value.parentId = '請選擇問題分類'
    isValid = false
  }

  // 驗證問題
  if (!formData.question || !formData.question.trim()) {
    errors.value.question = '請輸入問題'
    isValid = false
  } 

  // 驗證答案
  if (!formData.answer || !formData.answer.trim()) {
    errors.value.answer = '請輸入答案'
    isValid = false
  } 

  return isValid
}

// 載入問題分類選項（第一層問題）
const loadCategoryOptions = async () => {
  try {
    isLoadingCategories.value = true
    
    // 使用現有的fetchBackendFaqList方法，但只取第一層問題
    await faqStore.fetchBackendFaqList(
      { question: '', status: '', startAt: '', endAt: '' }, // 只取啟用的分類
      'question',
      'asc',
      100, // 取較多筆數確保包含所有分類
      1
    )
    
    // 過濾出第一層問題（parentId為null的）作為分類選項
    categoryOptions.value = faqStore.backendFaqList.filter(item => !item.parent_id) || []
    console.log('載入的分類選項:', categoryOptions.value)
    
  } catch (error) {
    console.error('載入問題分類失敗:', error)
    categoryOptions.value = []
  } finally {
    isLoadingCategories.value = false
  }
}

// 載入常見問題列表（該分類下的所有子問題）
const loadFaqList = async (forceRefresh = false) => {
  try {
    // 如果沒有分類ID，就不載入
    if (!formData.parentId) {
      faqData.value = []
      totalItems.value = 0
      totalPages.value = 0
      currentCategoryName.value = ''
      return
    }
    
    // 如果強制刷新，先清除快取
    if (forceRefresh) {
      faqStore.clearFaqDetailCache(formData.parentId)
    }
    
    // 使用分類ID獲取該分類的詳細資料，包含sub_fqas
    const result = await faqStore.fetchFaqDetail(formData.parentId, true)
    
    if (result.success && result.data) {
      // 儲存當前分類名稱
      currentCategoryName.value = result.data.question || ''
      
      // 獲取該分類下的所有子問題
      const allSubFaqs = result.data.sub_fqas || []
      
      // 根據排序配置進行排序
      let sortedData = [...allSubFaqs]
      if (sortConfig.value.field) {
        sortedData.sort((a, b) => {
          let aValue = a[sortConfig.value.field] || ''
          let bValue = b[sortConfig.value.field] || ''
          
          // 如果是日期欄位，轉換為 Date 進行比較
          if (sortConfig.value.field.includes('_at')) {
            aValue = new Date(aValue)
            bValue = new Date(bValue)
          }
          
          if (sortConfig.value.order === 'asc') {
            return aValue > bValue ? 1 : -1
          } else {
            return aValue < bValue ? 1 : -1
          }
        })
      }
      
      // 計算總數和分頁
      totalItems.value = sortedData.length
      totalPages.value = Math.ceil(totalItems.value / pageSize.value)
      
      // 取得當前頁面的資料
      const startIndex = (currentPage.value - 1) * pageSize.value
      const endIndex = startIndex + pageSize.value
      faqData.value = sortedData.slice(startIndex, endIndex)
      
      console.log('成功載入FAQ列表:', {
        total: totalItems.value,
        currentPage: currentPage.value,
        dataLength: faqData.value.length
      })
      
    } else {
      faqData.value = []
      totalItems.value = 0
      totalPages.value = 0
      currentCategoryName.value = ''
      console.log('未能獲取FAQ列表資料')
    }
    
  } catch (error) {
    console.error('載入FAQ列表失敗:', error)
    faqData.value = []
    totalItems.value = 0
    totalPages.value = 0
    currentCategoryName.value = ''
  }
}

// 強制重新載入FAQ列表（清除快取）
const forceReloadFaqList = async () => {
  console.log('強制重新載入FAQ列表...')
  
  // 清除相關快取
  if (formData.parentId) {
    faqStore.clearFaqDetailCache(formData.parentId)
  }
  
  // 重新載入列表
  await loadFaqList(true)
}

// 載入FAQ詳細資料 (編輯模式)
const loadFaqDetail = async () => {
  if (!isEditMode.value) return

  try {
    isLoadingDetail.value = true
    
    const result = await faqStore.fetchFaqDetail(route.params.id, true)
    console.log(result)
    
    if (result.success) {
      // 填入表單資料，但優先使用路由中的 categoryId
      formData.parentId = route.params.categoryId || result.data.parent_id || ''
      formData.question = result.data.question || ''
      formData.answer = result.data.answer || ''
      formData.status = result.data.status || 'Open'
      formData.updatedAt = result.data.updated_at
    } else {
      console.error('載入FAQ詳細資料失敗:', result.message)
      alert(`載入失敗: ${result.message}`)
    }
  } catch (error) {
    console.error('載入FAQ詳細資料異常:', error)
    alert('載入資料時發生錯誤，請稍後再試')
  } finally {
    isLoadingDetail.value = false
  }
}

// 分頁大小變更
const handlePageSizeChange = async () => {
  currentPage.value = 1
  await loadFaqList()
}

// 排序功能
const handleSort = async (field) => {
  if (sortConfig.value.field === field) {
    if (sortConfig.value.order === 'asc') {
      sortConfig.value.order = 'desc'
    } else if (sortConfig.value.order === 'desc') {
      sortConfig.value.field = ''
      sortConfig.value.order = ''
    } else {
      sortConfig.value.order = 'asc'
    }
  } else {
    sortConfig.value.field = field
    sortConfig.value.order = 'asc'
  }
  
  await loadFaqList()
}

// 取得排序圖示
const getSortIcon = (field) => {
  if (sortConfig.value.field !== field) {
    return '⇅'
  }
  return sortConfig.value.order === 'asc' ? '↑' : '↓'
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
    await loadFaqList()
  }
}

// 提交表單
const handleSubmit = async () => {
  if (!hasWritePermission.value) return
  
  if (!validateForm()) {
    return
  }

  try {
    isSaving.value = true
    
    const submitData = {
      parentId: formData.parentId,
      question: formData.question.trim(),
      answer: formData.answer.trim(),
      status: formData.status // 加入狀態欄位
    }

    let result
    
    if (isEditMode.value) {
      result = await faqStore.updateFaq(route.params.id, submitData)
    } else {
      result = await faqStore.createFaq(submitData)
    }

    if (result.success) {
      const action = isEditMode.value ? '更新' : '新增'
      alert(`${action}成功！`)
      
      await forceReloadFaqList()
      
      if (!isEditMode.value) {
        handleReset()
      }
    } else {
      console.error('操作失敗:', result.message)
      alert(`操作失敗: ${result.message}`)
      
      if (result.error && typeof result.error === 'object') {
        if (result.error.question) {
          errors.value.question = Array.isArray(result.error.question) 
            ? result.error.question[0] 
            : result.error.question
        }
        if (result.error.answer) {
          errors.value.answer = Array.isArray(result.error.answer) 
            ? result.error.answer[0] 
            : result.error.answer
        }
        if (result.error.parentId) {
          errors.value.parentId = Array.isArray(result.error.parentId) 
            ? result.error.parentId[0] 
            : result.error.parentId
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
  router.push('/settings/faq-management')
}

// 重置表單
const handleReset = () => {
  // 保留 parentId，只重置其他欄位
  formData.question = ''
  formData.answer = ''
  formData.status = 'Open'
  errors.value = {}
}

// 刪除FAQ (編輯模式限定)
const handleDelete = async () => {
  if (!isEditMode.value) return
  
  const confirmMessage = `確定要刪除「${formData.question}」嗎？\n\n此操作無法復原。`
  
  if (!confirm(confirmMessage)) {
    return
  }
  
  try {
    isLoading.value = true
    
    const result = await faqStore.deleteFaq(route.params.id)
    
    if (result.success) {
      alert('刪除成功！')
      
      // 清除快取並返回列表頁
      faqStore.clearAllCache()
      router.push('/settings/faq-management')
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

// 刪除指定FAQ
const deleteFaq = async (item) => {
  if (!hasWritePermission.value) return
  const confirmMessage = `確定要刪除「${item.question}」嗎？\n\n此操作無法復原。`
  
  if (!confirm(confirmMessage)) {
    return
  }
  
  try {
    const result = await faqStore.deleteFaq(item.id)
    
    if (result.success) {
      alert('刪除成功！')
      
      // 強制重新載入列表
      await forceReloadFaqList()
      
      // 如果刪除的是當前編輯的FAQ，跳轉到新增模式
      if (isEditMode.value && item.id === faqId.value) {
        router.push(`/settings/faq/${faqCategoryId.value}/create`)
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
const editFaq = (item) => {
  if (item.id === faqId.value) {
    return // 已經在編輯這個FAQ
  }
  
  // 手機版點擊後切換到表單視圖
  if (isMobile.value) {
    showMobileList.value = false
  }
  
  router.push(`/settings/faq/edit/${faqCategoryId.value}/${item.id}`)
}

// 監聽路由變化
watch(() => route.params, (newParams) => {
  // 重置 parentId 為當前路由的 categoryId
  formData.parentId = newParams.categoryId || ''
  
  if (newParams.id && newParams.id !== 'create') {
    // 編輯模式：載入詳細資料
    loadFaqDetail()
  } else {
    // 新增模式：重置表單但保留 parentId
    formData.question = ''
    formData.answer = ''
    formData.status = 'Open'
    errors.value = {}
  }
}, { immediate: true })

// 組件掛載
onMounted(async () => {
  // 初始化 RWD 檢測
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
  
  // 確保 formData.parentId 有正確的值
  if (route.params.categoryId) {
    formData.parentId = route.params.categoryId
  }
  
  // 先載入分類選項
  await loadCategoryOptions()
  
  // 然後載入FAQ列表
  await loadFaqList()
  
  // 如果是編輯模式，載入詳細資料
  if (isEditMode.value) {
    await loadFaqDetail()
  }
})
</script>

<template>
  <div class="faq-form-page">
    <!-- 手機版頂部導航 -->
    <div v-if="isMobile" class="mobile-nav">
      <button 
        class="mobile-nav-btn"
        :class="{ active: !showMobileList }"
        @click="showMobileList = false"
      >
        {{ isEditMode ? '編輯常見問題' : '新增常見問題' }}
      </button>
      <button 
        class="mobile-nav-btn"
        :class="{ active: showMobileList }"
        @click="showMobileList = true"
      >
        常見問題列表 ({{ totalItems }})
      </button>
    </div>

    <div class="page-container" :class="{ 'mobile-layout': isMobile, 'tablet-layout': isTablet }">
      <!-- 左側表單區域 -->
      <div class="left-section" :class="{ 'mobile-hidden': isMobile && showMobileList }">
        <!-- 新增模式的表單 -->
        <div v-if="!isEditMode" class="form-card">
          <h3 class="form-title">新增常見問題</h3>
          
          <form @submit.prevent="handleSubmit" class="faq-form">
            <div class="form-group">
              <label for="faqCategory" class="form-label">問題分類</label>
              <select
                id="faqCategory"
                v-model="formData.parentId"
                :class="['form-select', { 'error': errors.parentId }]"
                disabled
              >
                <option value="">請選擇問題分類</option>
                <option 
                  v-for="category in categoryOptions" 
                  :key="category.id" 
                  :value="category.id"
                >
                  {{ category.question }}
                </option>
              </select>
              <span v-if="errors.parentId" class="error-message">{{ errors.parentId }}</span>
              <span v-if="isLoadingCategories" class="loading-hint">載入分類中...</span>
            </div>

            <div class="form-group">
              <label for="faqQuestion" class="form-label">問題內容</label>
              <input
                id="faqQuestion"
                type="text"
                v-model="formData.question"
                :class="['form-input', { 'error': errors.question }]"
                placeholder="請輸入問題內容"
                :disabled="isSaving"
                maxlength="200"
              />
              <span v-if="errors.question" class="error-message">{{ errors.question }}</span>
            </div>

            <div class="form-group">
              <label for="faqAnswer" class="form-label">答案內容</label>
              <textarea
                id="faqAnswer"
                v-model="formData.answer"
                :class="['form-textarea', { 'error': errors.answer }]"
                placeholder="請輸入答案內容"
                :disabled="isSaving"
                maxlength="1000"
                rows="6"
              ></textarea>
              <span v-if="errors.answer" class="error-message">{{ errors.answer }}</span>
            </div>

            <!-- 新增：狀態選擇欄位 -->
            <div class="form-group">
              <label for="faqStatus" class="form-label">狀態</label>
              <select
                id="faqStatus"
                v-model="formData.status"
                class="form-select"
                :disabled="isSaving"
              >
                <option 
                  v-for="option in statusOptions" 
                  :key="option.value" 
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </div>

            <div class="form-actions">
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="isSaving || !formData.parentId || !formData.question.trim() || !formData.answer.trim()"
                v-if="hasWritePermission"
              >
                {{ isSaving ? '儲存中...' : '儲存' }}
              </button>
              <button
                type="button"
                class="btn btn-secondary"
                @click="handleCancel"
                :disabled="isSaving"
              >
                取消
              </button>
            </div>
          </form>
        </div>

        <!-- 編輯模式的FAQ資料顯示 -->
        <div v-else class="info-card">
          <h3 class="info-title">常見問題</h3>
          
          <div v-if="isLoadingDetail" class="loading-state">
            <div class="loading-spinner">⟳</div>
            <div>載入中...</div>
          </div>
          
          <div v-else class="info-content">
            <div class="form-group">
              <label for="editFaqCategory" class="form-label">問題分類</label>
              <select
                id="editFaqCategory"
                v-model="formData.parentId"
                :class="['form-select', { 'error': errors.parentId }]"
                disabled
              >
                <option value="">請選擇問題分類</option>
                <option 
                  v-for="category in categoryOptions" 
                  :key="category.id" 
                  :value="category.id"
                >
                  {{ category.question }}
                </option>
              </select>
              <span v-if="errors.parentId" class="error-message">{{ errors.parentId }}</span>
            </div>

            <div class="form-group">
              <label for="editFaqQuestion" class="form-label">問題內容</label>
              <input
                id="editFaqQuestion"
                type="text"
                v-model="formData.question"
                :class="['form-input', { 'error': errors.question }]"
                placeholder="請輸入問題內容"
                :disabled="isSaving"
                maxlength="200"
              />
              <span v-if="errors.question" class="error-message">{{ errors.question }}</span>
            </div>

            <div class="form-group">
              <label for="editFaqAnswer" class="form-label">答案內容</label>
              <textarea
                id="editFaqAnswer"
                v-model="formData.answer"
                :class="['form-textarea', { 'error': errors.answer }]"
                placeholder="請輸入答案內容"
                :disabled="isSaving"
                maxlength="1000"
                rows="6"
              ></textarea>
              <span v-if="errors.answer" class="error-message">{{ errors.answer }}</span>
            </div>

            <!-- 新增：編輯模式的狀態選擇欄位 -->
            <div class="form-group">
              <label for="editFaqStatus" class="form-label">狀態</label>
              <select
                id="editFaqStatus"
                v-model="formData.status"
                class="form-select"
                :disabled="isSaving"
              >
                <option 
                  v-for="option in statusOptions" 
                  :key="option.value" 
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
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
                :disabled="isSaving || !formData.parentId || !formData.question.trim() || !formData.answer.trim()"
                v-if="hasWritePermission"
              >
                {{ isSaving ? '儲存中...' : '儲存' }}
              </button>
              
              <button
                type="button"
                class="btn btn-secondary"
                @click="handleCancel"
                :disabled="isSaving"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右側FAQ列表 -->
      <div class="right-section" :class="{ 'mobile-hidden': isMobile && !showMobileList }">
        <div class="list-card">
          <!-- Loading 遮罩 -->
          <div v-if="isUpdatingSequence" class="loading-overlay">
            <div class="loading-content">
              <div class="loading-spinner">⟳</div>
              <div class="loading-text">更新順序中...</div>
            </div>
          </div>

          <div class="list-header">
            <select v-model="pageSize" @change="handlePageSizeChange" class="page-size-select" :disabled="isUpdatingSequence">
              <option value="10">10筆/頁</option>
              <option value="20">20筆/頁</option>
              <option value="50">50筆/頁</option>
            </select>
            
            <div v-if="!isMobile" class="drag-hint">
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path :d="mdiDragVertical" fill="currentColor"></path>
              </svg>
              {{ isUpdatingSequence ? '更新中...' : '拖曳調整順序' }}
            </div>
          </div>

          <!-- 手機版卡片式列表 -->
          <div v-if="isMobile" class="mobile-card-list">
            <div 
              v-for="(item, index) in faqData" 
              :key="item.id" 
              class="mobile-card"
              :class="{ 
                'active': isEditMode && item.id === faqId,
                'disabled': isUpdatingSequence
              }"
              @click="isUpdatingSequence ? null : editFaq(item)"
            >
              <div class="mobile-card-header">
                <span class="mobile-card-number">{{ (currentPage - 1) * pageSize + index + 1 }}</span>
                <div class="mobile-card-status">
                  <span :class="['status-badge', getStatusClass(item.status)]">
                    {{ getStatusText(item.status) }}
                  </span>
                </div>
                <div class="mobile-card-actions" v-if="hasWritePermission">
                  <button 
                    class="mobile-delete-btn"
                    :disabled="isUpdatingSequence"
                    @click.stop="isUpdatingSequence ? null : deleteFaq(item)"
                    title="刪除"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24">
                      <path :d="mdiDelete" fill="currentColor"></path>
                    </svg>
                  </button>
                </div>
              </div>
              <div class="mobile-card-content">
                <div class="mobile-card-category">{{ getCategoryName(item.parent_id) }}</div>
                <h4 class="mobile-card-title">{{ item.question }}</h4>
                <p class="mobile-card-answer">{{ item.answer?.substring(0, 100) }}{{ item.answer?.length > 100 ? '...' : '' }}</p>
                <p class="mobile-card-time">
                  {{ formatDateTime(item.updated_at) || formatDateTime(item.created_at) }}
                </p>
              </div>
            </div>
            
            <div v-if="faqData.length === 0" class="mobile-no-data">
              暫無資料
            </div>
          </div>

          <!-- 平板/桌面版表格 -->
          <div v-else class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="drag-column" v-if="!isMobile">
                    {{ isUpdatingSequence ? '更新中' : '拖曳' }}
                  </th>
                  <th class="id-column">項次</th>
                  <th 
                    class="question-column sortable-header" 
                    :class="getSortClass('question')"
                    @click="handleSort('question')"
                  >
                    常見問題
                    <span class="sort-icon">{{ getSortIcon('question') }}</span>
                  </th>
                   <th 
                    class="status-column sortable-header"
                    :class="getSortClass('status')"
                    @click="handleSort('status')"
                  >
                    狀態
                    <span class="sort-icon">{{ getSortIcon('status') }}</span>
                  </th>
                  <th 
                    class="time-column sortable-header" 
                    :class="getSortClass('updated_at')"
                    @click="handleSort('updated_at')"
                  >
                    更新時間
                    <span class="sort-icon">{{ getSortIcon('updated_at') }}</span>
                  </th>
                  <th class="action-column" v-if="hasWritePermission">刪除</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="(item, index) in faqData" 
                  :key="item.id" 
                  class="table-row"
                  :class="{ 
                    'active': isEditMode && item.id === faqId,
                    'dragging': isDragging && draggedIndex === index,
                    'drag-over': dragOverIndex === index,
                    'disabled': isUpdatingSequence
                  }"
                  :draggable="!isUpdatingSequence"
                  @dragstart="isUpdatingSequence ? null : handleDragStart($event, item, index)"
                  @dragend="handleDragEnd($event)"
                  @dragover="isUpdatingSequence ? null : handleDragOver($event, index)"
                  @dragleave="handleDragLeave"
                  @drop="isUpdatingSequence ? null : handleDrop($event, index)"
                  @click="isUpdatingSequence ? null : editFaq(item)"
                >
                  <td class="drag-cell" v-if="!isMobile">
                    <div class="drag-handle" 
                        :class="{ 'disabled': isUpdatingSequence }"
                        @mousedown.stop="">
                      <svg width="16" height="16" viewBox="0 0 24 24">
                        <path :d="mdiDragVertical" fill="currentColor"></path>
                      </svg>
                    </div>
                  </td>
                  <td class="id-cell">{{ (currentPage - 1) * pageSize + index + 1 }}</td>
                  <td class="question-cell">
                    <div class="question-content">
                      <div class="question-title">{{ item.question.substring(0, 50) }}{{ item.question.length > 50 ? '...' : '' }}</div>
                    </div>
                  </td>
                  <td class="status-cell">
                    <span :class="['status-badge', getStatusClass(item.status)]">
                      {{ getStatusText(item.status) }}
                    </span>
                  </td>
                  <td class="time-cell">{{ formatDateTime(item.updated_at) || formatDateTime(item.created_at) }}</td>
                  <td class="action-cell" v-if="hasWritePermission">
                    <button 
                      class="delete-btn"
                      :disabled="isUpdatingSequence"
                      @click.stop="isUpdatingSequence ? null : deleteFaq(item)"
                      title="刪除"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24">
                        <path :d="mdiDelete" fill="currentColor"></path>
                      </svg>
                    </button>
                  </td>
                </tr>
                
                <tr v-if="faqData.length === 0">
                  <td :colspan="hasWritePermission ? 5 : 4" class="no-data">暫無資料</td>
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
                :disabled="currentPage === 1 || isUpdatingSequence"
                @click="goToPage(currentPage - 1)"
              >
                ‹
              </button>
              
              <template v-for="page in visiblePages" :key="page">
                <button 
                  v-if="page !== '...'"
                  :class="['page-btn', { active: page === currentPage }]"
                  :disabled="isUpdatingSequence"
                  @click="goToPage(page)"
                >
                  {{ page }}
                </button>
                <span v-else class="ellipsis">...</span>
              </template>
              
              <button 
                class="page-btn next-btn" 
                :disabled="currentPage === totalPages || isUpdatingSequence"
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
.faq-form-page {
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

.loading-hint {
  display: block;
  margin-top: 5px;
  font-size: 12px;
  color: #17a2b8;
}

// Loading 遮罩
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  border-radius: 8px;

  .loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

    .loading-spinner {
      font-size: 32px;
      color: #6c5ce7;
      animation: spin 1s linear infinite;
    }

    .loading-text {
      font-size: 14px;
      color: #666;
      font-weight: 500;
    }
  }
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
.faq-form, .info-content {
  .form-group {
    margin-bottom: 20px;
    
    select {
      &:disabled {
        color: #000 !important;
      }
    }

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

    .form-textarea {
      width: 100%;
      padding: 12px 15px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      font-family: inherit;
      resize: vertical;
      min-height: 120px;
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

    .form-select {
      width: 100%;
      padding: 12px 15px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      background: white;
      transition: border-color 0.3s;

      &:focus {
        outline: none;
        border-color: #6c5ce7;
        box-shadow: 0 0 0 2px rgba(108, 92, 231, 0.1);
      }

      &.error {
        border-color: #dc3545;
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
    position: relative;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }
}

.list-header {
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .page-size-select {
    padding: 8px 15px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    background: white;
  }

  .drag-hint {
    display: flex;
    align-items: center;
    gap: 5px;
    color: #666;
    font-size: 13px;
    
    svg {
      opacity: 0.7;
    }
  }
}

// 狀態標籤
.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  
  &.status-enabled {
    background: #d4edda;
    color: #155724;
  }
  
  &.status-disabled {
    background: #f8d7da;
    color: #721c24;
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

    &:hover:not(.disabled) {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
    }

    &.active {
      border-color: #6c5ce7;
      background: linear-gradient(135deg, #f8f7ff 0%, #fff 100%);
      box-shadow: 0 4px 12px rgba(108, 92, 231, 0.2);
    }

    &.disabled {
      opacity: 0.6;
      cursor: not-allowed;
      pointer-events: none;

      &:hover {
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        transform: none;
      }
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

      .mobile-card-status {
        flex: 1;
        text-align: center;
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

          &:hover:not(:disabled) {
            background: #ffcdd2;
            transform: scale(1.1);
          }

          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
          }
        }
      }
    }

    .mobile-card-content {
      .mobile-card-category {
        background: #e3f2fd;
        color: #1976d2;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 500;
        display: inline-block;
        margin-bottom: 8px;
      }

      .mobile-card-title {
        font-size: 16px;
        font-weight: 600;
        color: #333;
        margin: 0 0 8px 0;
        line-height: 1.4;
      }

      .mobile-card-answer {
        font-size: 13px;
        color: #666;
        margin: 0 0 8px 0;
        line-height: 1.5;
      }

      .mobile-card-time {
        font-size: 13px;
        color: #999;
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

        &.drag-column {
          width: 60px;
          text-align: center;
          padding: 15px 10px;
        }

        &.id-column {
          width: 60px;
          text-align: center;
        }

        &.question-column {
          width: 35%;
        }

        &.time-column {
          width: 140px;
        }

        &.action-column {
          width: 80px;
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

        &:hover:not(.dragging):not(.disabled) {
          background: #f8f9fa;
        }

        &.active {
          background: #e3f2fd;
          border-left: 4px solid #6c5ce7;
        }

        &.dragging {
          opacity: 0.5;
          background: #fff3cd;
          cursor: grabbing;
        }

        &.drag-over {
          background: #d4edda;
          border-top: 3px solid #6c5ce7;
        }

        &.disabled {
          opacity: 0.6;
          cursor: not-allowed;
          pointer-events: none;

          &:hover {
            background: inherit;
          }
        }

        td {
          padding: 15px 20px;
          font-size: 14px;
          color: #333;

          &.drag-cell {
            text-align: center;
            padding: 15px 10px;

            .drag-handle {
              display: flex;
              justify-content: center;
              align-items: center;
              cursor: grab;
              color: #999;
              transition: color 0.2s;

              &:hover:not(.disabled) {
                color: #6c5ce7;
              }

              &:active:not(.disabled) {
                cursor: grabbing;
              }

              &.disabled {
                opacity: 0.5;
                cursor: not-allowed;
                color: #ccc;

                &:hover {
                  color: #ccc;
                }
              }
            }
          }

          &.id-cell {
            text-align: center;
            font-weight: 500;
            color: #666;
          }

          &.question-cell {
            .question-content {
              .question-title {
                font-weight: 500;
                color: #333;
                line-height: 1.4;
              }
            }
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

.delete-btn {
  background: #f8f9fa;
  border: none;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  color: #666;
  transition: all 0.2s;
  margin: 0 2px;

  &:hover:not(:disabled) {
    transform: scale(1.1);
    background: #ffebee;
    color: #d32f2f;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    
    &:hover {
      background: #f8f9fa;
      color: #666;
      transform: none;
    }
  }
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

        &:hover {
          background: #f8f9fa;
          border-color: #ddd;
          transform: none;
        }
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
}


// 平板樣式 (768px - 1024px)
@media (max-width: 1024px) and (min-width: 768px) {
  .faq-form-page {
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
  .faq-form-page {
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

    .drag-hint {
      display: none;
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

  .form-textarea {
    min-height: 100px !important;
  }

  .loading-overlay {
    .loading-content {
      padding: 16px;
      
      .loading-spinner {
        font-size: 28px;
      }
      
      .loading-text {
        font-size: 13px;
      }
    }
  }
}

// 超小屏幕樣式 (< 480px)
@media (max-width: 479px) {
  .faq-form-page {
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
      .mobile-card-category {
        font-size: 10px;
        padding: 1px 6px;
      }

      .mobile-card-title {
        font-size: 15px;
        margin-bottom: 6px;
      }

      .mobile-card-answer {
        font-size: 12px;
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

  .form-input, .form-textarea, .form-select {
    padding: 10px 12px !important;
    font-size: 16px !important; // 避免iOS縮放
  }

  .form-textarea {
    min-height: 80px !important;
  }
}
</style>
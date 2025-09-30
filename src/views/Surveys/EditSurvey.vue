<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSurveyStore } from '@/stores/survey'
import { formatDateTime } from '@/utils/dateUtils'
import { mdiDelete, mdiDragVertical } from '@mdi/js'
import { useAuthStore } from '@/stores/auth'
import { PERMISSIONS } from '@/utils/permissions'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const surveyStore = useSurveyStore()

const hasFullPermission = computed(() => authStore.canModify(PERMISSIONS.SURVEY_MANAGEMENT));

// 表單資料
const formData = reactive({
  content: '',
  type: 'SingleChoice',
  status: 'Open',
  required: true,
  surveyOptions: []
})

// 問卷題目類型選項
const questionTypes = ref([
  { value: 'SingleChoice', label: '單選題' },
  { value: 'MultipleChoice', label: '複選題' },
  { value: 'ShortAnswer', label: '簡答題' }
])

// 題目狀態選項
const statusOptions = ref([
  { value: 'Open', label: '啟用' },
  { value: 'Invalid', label: '停用' }
])

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

// 問卷題目列表資料
const questionData = ref([])
const totalItems = ref(0)
const totalPages = ref(0)

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

// 計算屬性 - 當前編輯的題目ID
const questionId = computed(() => route.params.id)

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
    
    // 調用 API 更新順序
    const result = await surveyStore.updateSurveyQuestionSequence(
      draggedItem.value.id, 
      newSequence
    )
    
    if (result.success) {
      // 重新載入列表以反映新順序
      await loadQuestionList()
      
      // 顯示成功訊息 - 可以改成 toast 通知
      console.log('題目順序更新成功')
      
      // 可選：顯示成功提示
      // 如果你有 toast 組件，可以這樣使用：
      // showToast('題目順序更新成功', 'success')
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

// 表單驗證
const validateForm = () => {
  errors.value = {}
  let isValid = true

  // 驗證題目內容
  if (!formData.content || !formData.content.trim()) {
    errors.value.content = '請輸入問卷題目'
    isValid = false
  } else if (formData.content.trim().length < 2) {
    errors.value.content = '問卷題目至少需要2個字符'
    isValid = false
  } else if (formData.content.trim().length > 200) {
    errors.value.content = '問卷題目不能超過200個字符'
    isValid = false
  }

  // 驗證選擇題選項
  if (formData.type === 'MultipleChoice') {
    if (!formData.surveyOptions || formData.surveyOptions.length === 0) {
      errors.value.surveyOptions = '選擇題至少需要一個選項'
      isValid = false
    } else {
      const validOptions = formData.surveyOptions.filter(option => option.trim() !== '')
      if (validOptions.length < 2) {
        errors.value.surveyOptions = '選擇題至少需要兩個有效選項'
        isValid = false
      }
    }
  }

  return isValid
}

// 載入題目列表
const loadQuestionList = async () => {
  try {
    const params = {
      pageSize: pageSize.value,
      page: currentPage.value,
      sortBy: sortConfig.value.field,
      sortOrder: sortConfig.value.order
    }
    
    const response = await surveyStore.fetchSurveyQuestions(params)
    
    questionData.value = response.data || []
    totalItems.value = response.total || 0
    totalPages.value = response.totalPages || 0
  } catch (error) {
    console.error('載入題目列表失敗:', error)
  }
}

// 載入題目詳細資料 (編輯模式)
const loadQuestionDetail = async () => {
  if (!isEditMode.value) return

  try {
    isLoadingDetail.value = true
    
    const result = await surveyStore.fetchSurveyQuestionDetail(route.params.id)
    console.log(result);
    
    if (result.success) {
      // 填入表單資料
      formData.content = result.data.content || ''
      formData.type = result.data.type || 'SingleChoice'
      formData.status = result.data.status || 'Open'
      formData.required = result.data.required == 1
      formData.surveyOptions = result.data.options || []
      formData.updatedAt = result.data.updated_at
    } else {
      console.error('載入題目詳細資料失敗:', result.message)
      alert(`載入失敗: ${result.message}`)
    }
  } catch (error) {
    console.error('載入題目詳細資料異常:', error)
    alert('載入資料時發生錯誤，請稍後再試')
  } finally {
    isLoadingDetail.value = false
  }
}

// 分頁大小變更
const handlePageSizeChange = async () => {
  currentPage.value = 1
  await loadQuestionList()
}
``
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
  
  await loadQuestionList()
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
    await loadQuestionList()
  }
}

// 新增選項
const addOption = () => {
  formData.surveyOptions.push('')
}

// 移除選項
const removeOption = (index) => {
  formData.surveyOptions.splice(index, 1)
}

// 提交表單
const handleSubmit = async () => {
    console.log('提交表單', formData);
    
  // 表單驗證
  if (!validateForm()) {
    return
  }

  try {
    isSaving.value = true
    
    const submitData = {
      content: formData.content.trim(),
      type: formData.type,
      status: formData.status,
      required: formData.required,
      surveyOptions: formData.surveyOptions.filter(option => option.trim() !== '')
    }

    let result
    
    if (isEditMode.value) {
      // 編輯模式
      result = await surveyStore.updateSurveyQuestion(route.params.id, submitData)
    } else {
      // 新增模式
      result = await surveyStore.createSurveyQuestion(submitData)
    }

    if (result.success) {
      const action = isEditMode.value ? '更新' : '新增'
      alert(`${action}成功！`)
      
      // 重新載入列表
      await loadQuestionList()
      
      if (!isEditMode.value) {
        // 清除輸入框
        handleReset()
      }
    } else {
      console.error('操作失敗:', result.message)
      alert(`操作失敗: ${result.message}`)
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
  router.push('/settings/survey-question-management')
}

// 重置表單
const handleReset = () => {
  formData.content = ''
  formData.type = 'SingleChoice'
  formData.status = 'Open'
  formData.required = true
  formData.surveyOptions = []
  errors.value = {}
}

// 刪除指定題目
const deleteQuestion = async (item) => {
  const confirmMessage = `確定要刪除題目「${item.content}」嗎？此操作無法復原。`
  
  if (!confirm(confirmMessage)) {
    return
  }
  
  try {
    const result = await surveyStore.deleteSurveyQuestion(item.id)
    
    if (result.success) {
      alert('刪除成功！')
      await loadQuestionList()
      
      // 如果刪除的是當前編輯的題目，跳轉到新增模式
      if (isEditMode.value && item.id === questionId.value) {
        router.push('/settings/survey-question/create')
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
const editQuestion = (item) => {
  if (item.id === questionId.value) {
    return // 已經在編輯這個題目
  }
  
  // 手機版點擊後切換到表單視圖
  if (isMobile.value) {
    showMobileList.value = false
  }
  
  router.push(`/settings/survey-question/edit/${item.id}`)
}

const getStatusClass = (status) => {
  const statusMap = {
    'Open': 'status-active',
    'Invalid': 'status-inactive'
  }
  return statusMap[status] || ''
}

const getStatusText = (status) => {
  const statusMap = {
    'Open': '啟用',
    'Invalid': '停用'
  }
  return statusMap[status] || status
}

// 監聽路由變化
watch(() => route.params.id, (newId) => {
  if (newId && newId !== 'create') {
    loadQuestionDetail()
  } else {
    // 重置表單
    handleReset()
  }
}, { immediate: true })

// 監聽題目類型變化
watch(() => formData.type, (newType) => {
  if (newType === 'ShortAnswer') {
    formData.surveyOptions = []
  } else if (formData.surveyOptions.length === 0) {
    formData.surveyOptions = ['', '']
  }
})

// 組件掛載
onMounted(async () => {
  // 初始化 RWD 檢測
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
  
  await loadQuestionList()
  
  if (!isEditMode.value) {
    formData.surveyOptions = ['', '']
  }

})
</script>

<template>
  <div class="question-form-page">
    <!-- 手機版頂部導航 -->
    <div v-if="isMobile" class="mobile-nav">
      <button 
        class="mobile-nav-btn"
        :class="{ active: !showMobileList }"
        @click="showMobileList = false"
      >
        {{ isEditMode ? '編輯問卷題目' : '新增問卷題目' }}
      </button>
      <button 
        class="mobile-nav-btn"
        :class="{ active: showMobileList }"
        @click="showMobileList = true"
      >
        題目列表 ({{ totalItems }})
      </button>
    </div>

    <div class="page-container" :class="{ 'mobile-layout': isMobile, 'tablet-layout': isTablet }">
      <!-- 左側表單區域 -->
      <div class="left-section" :class="{ 'mobile-hidden': isMobile && showMobileList }">
        <!-- 新增模式的表單 -->
        <div v-if="!isEditMode" class="form-card">
          <h3 class="form-title">新增問卷題目</h3>
          
          <form @submit.prevent="handleSubmit" class="question-form">
            <div class="form-group">
              <label for="questionContent" class="form-label">問卷題目</label>
              <input
                id="questionContent"
                type="text"
                v-model="formData.content"
                :class="['form-input', { 'error': errors.content }]"
                placeholder="請輸入問卷題目"
                :disabled="isSaving"
                maxlength="200"
              />
              <span v-if="errors.content" class="error-message">{{ errors.content }}</span>
            </div>

            <div class="form-group">
              <label for="questionType" class="form-label">題目類型</label>
              <select
                id="questionType"
                v-model="formData.type"
                class="form-select"
                :disabled="isSaving"
              >
                <option v-for="type in questionTypes" :key="type.value" :value="type.value">
                  {{ type.label }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="questionStatus" class="form-label">題目狀態</label>
              <select
                id="questionStatus"
                v-model="formData.status"
                class="form-select"
                :disabled="isSaving"
              >
                <option v-for="status in statusOptions" :key="status.value" :value="status.value">
                  {{ status.label }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="formData.required"
                  class="form-checkbox"
                  :disabled="isSaving"
                />
                <span class="checkbox-text">必填</span>
              </label>
            </div>

            <!-- 選項設定 (僅選擇題顯示) -->
            <div v-if="formData.type === 'MultipleChoice'" class="form-group">
              <label class="form-label">選項設定</label>
              <div class="options-container">
                <div 
                  v-for="(option, index) in formData.surveyOptions" 
                  :key="index" 
                  class="option-item"
                >
                  <input
                    type="text"
                    v-model="formData.surveyOptions[index]"
                    :placeholder="`選項 ${index + 1}`"
                    class="option-input"
                    :disabled="isSaving"
                  />
                  <button
                    type="button"
                    @click="removeOption(index)"
                    class="remove-option-btn"
                    :disabled="isSaving || formData.surveyOptions.length <= 2"
                    v-if="hasFullPermission"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24">
                      <path :d="mdiDelete" fill="currentColor"></path>
                    </svg>
                  </button>
                </div>
                <button
                  type="button"
                  @click="addOption"
                  class="add-option-btn"
                  :disabled="isSaving"
                  v-if="formData.surveyOptions.length < 5"
                >
                  新增選項
                </button>
              </div>
              <span v-if="errors.surveyOptions" class="error-message">{{ errors.surveyOptions }}</span>
            </div>

            <div class="form-actions">
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="isSaving || !formData.content.trim()"
              >
                {{ isSaving ? '儲存中...' : '儲存' }}
              </button>
              <button
                type="button"
                class="btn btn-secondary"
                @click="handleCancel"
                :disabled="isSaving"
              >
                {{ hasFullPermission ? '取消' : '返回' }}
              </button>
            </div>
          </form>
        </div>

        <!-- 編輯模式的題目資料顯示 -->
        <div v-else class="info-card">
          <h3 class="info-title">問卷題目</h3>
          
          <div v-if="isLoadingDetail" class="loading-state">
            <div class="loading-spinner">⟳</div>
            <div>載入中...</div>
          </div>
          
          <div v-else class="info-content">
            <div class="form-group">
              <label for="editQuestionContent" class="form-label">問卷題目</label>
              <input
                id="editQuestionContent"
                type="text"
                v-model="formData.content"
                :class="['form-input', { 'error': errors.content }]"
                placeholder="請輸入問卷題目"
                :disabled="isSaving || !hasFullPermission"
                maxlength="200"
              />
              <span v-if="errors.content" class="error-message">{{ errors.content }}</span>
            </div>

            <div class="form-group">
              <label for="editQuestionType" class="form-label">題目類型</label>
              <select
                id="editQuestionType"
                v-model="formData.type"
                class="form-select"
                :disabled="isSaving || !hasFullPermission"
              >
                <option v-for="type in questionTypes" :key="type.value" :value="type.value">
                  {{ type.label }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="editQuestionStatus" class="form-label">題目狀態</label>
              <select
                id="editQuestionStatus"
                v-model="formData.status"
                class="form-select"
                :disabled="isSaving || !hasFullPermission"
              >
                <option v-for="status in statusOptions" :key="status.value" :value="status.value">
                  {{ status.label }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="formData.required"
                  class="form-checkbox"
                  :disabled="isSaving || !hasFullPermission"
                />
                <span class="checkbox-text">必填</span>
              </label>
            </div>

            <!-- 選項設定 (僅選擇題顯示) -->
            <div v-if="formData.type === 'MultipleChoice'" class="form-group">
              <label class="form-label">選項設定</label>
              <div class="options-container">
                <div 
                  v-for="(option, index) in formData.surveyOptions" 
                  :key="index" 
                  class="option-item"
                >
                  <input
                    type="text"
                    v-model="formData.surveyOptions[index]"
                    :placeholder="`選項 ${index + 1}`"
                    class="option-input"
                    :disabled="isSaving || !hasFullPermission"
                  />
                  <button
                    type="button"
                    @click="removeOption(index)"
                    class="remove-option-btn"
                    :disabled="isSaving || formData.surveyOptions.length <= 2"
                    v-if="hasFullPermission"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24">
                      <path :d="mdiDelete" fill="currentColor"></path>
                    </svg>
                  </button>
                </div>
                <button
                  type="button"
                  @click="addOption"
                  class="add-option-btn"
                  :disabled="isSaving || !hasFullPermission"
                  v-if="formData.surveyOptions.length < 5 && hasFullPermission"
                >
                  新增選項
                </button>
              </div>
              <span v-if="errors.surveyOptions" class="error-message">{{ errors.surveyOptions }}</span>
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
                :disabled="isSaving || !formData.content.trim()"
                v-if="hasFullPermission"
              >
                {{ isSaving ? '儲存中...' : '儲存' }}
              </button>
              
              <button
                type="button"
                class="btn btn-secondary"
                @click="handleCancel"
                :disabled="isSaving"
              >
                {{ hasFullPermission ? '取消' : '返回' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右側題目列表 -->
      <div class="right-section" :class="{ 'mobile-hidden': isMobile && !showMobileList }">
        <div class="list-card">
          <!-- Loading 遮罩 - 新增 -->
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
                  v-for="(item, index) in questionData" 
                  :key="item.id" 
                  class="mobile-card"
                  :class="{ 
                    'active': isEditMode && item.id === questionId,
                    'disabled': isUpdatingSequence
                  }"
                  @click="isUpdatingSequence ? null : editQuestion(item)"
                >
                  <div class="mobile-card-header">
                    <div class="mobile-card-number">
                      #{{ (currentPage - 1) * pageSize + index + 1 }}
                    </div>
                    <div class="mobile-card-actions" v-if="hasFullPermission">
                      <button 
                        class="mobile-delete-btn"
                        :disabled="isUpdatingSequence"
                        @click.stop="isUpdatingSequence ? null : deleteQuestion(item)"
                        title="刪除"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24">
                          <path :d="mdiDelete" fill="currentColor"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div class="mobile-card-content">
                    <h4 class="mobile-card-title">{{ item.content }}</h4>
                    
                    <div class="mobile-card-meta">
                      <span class="mobile-card-type">
                        {{ questionTypes.find(t => t.value === item.type)?.label }}
                      </span>
                      <span class="mobile-card-status" :class="getStatusClass(item.status)">
                        {{ getStatusText(item.status) }}
                      </span>
                    </div>
                    
                    <p class="mobile-card-time">
                      {{ formatDateTime(item.updated_at) || formatDateTime(item.created_at) }}
                    </p>
                  </div>
                </div>
                
                <div v-if="questionData.length === 0" class="mobile-no-data">
                  目前沒有任何問卷題目
                </div>
              </div>

          <!-- 平板/桌面版表格 -->
          <div v-else class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="drag-column" v-if="!isMobile && hasFullPermission">
                    {{ isUpdatingSequence ? '更新中' : '拖曳' }}
                  </th>
                  <th class="id-column">項次</th>
                  <th class="content-column">問卷題目</th>
                  <th class="type-column">題目類型</th>
                  <th class="status-column">題目狀態</th>
                  <th class="time-column">更新時間</th>
                  <th class="action-column" v-if="hasFullPermission">刪除</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="(item, index) in questionData" 
                  :key="item.id" 
                  class="table-row"
                  :class="{ 
                    'active': isEditMode && item.id === questionId,
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
                  @click="isUpdatingSequence ? null : editQuestion(item)"
                >
                  <td class="drag-cell" v-if="!isMobile && hasFullPermission">
                    <div class="drag-handle" 
                        :class="{ 'disabled': isUpdatingSequence }"
                        @mousedown.stop="">
                      <svg width="16" height="16" viewBox="0 0 24 24">
                        <path :d="mdiDragVertical" fill="currentColor"></path>
                      </svg>
                    </div>
                  </td>
                  <td class="id-cell">{{ (currentPage - 1) * pageSize + index + 1 }}</td>
                  <td class="content-cell">{{ item.content }}</td>
                  <td class="type-cell">{{ questionTypes.find(t => t.value === item.type)?.label }}</td>
                  <td class="status-cell">
                    <span class="status-badge" :class="getStatusClass(item.status)">
                      {{ getStatusText(item.status) }}
                    </span>
                  </td>
                  <td class="time-cell">{{ formatDateTime(item.updated_at) || formatDateTime(item.created_at) }}</td>
                  <td class="action-cell" v-if="hasFullPermission">
                    <button 
                      class="delete-btn"
                      :disabled="isUpdatingSequence"
                      @click.stop="isUpdatingSequence ? null : deleteQuestion(item)"
                      title="刪除"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24">
                        <path :d="mdiDelete" fill="currentColor"></path>
                      </svg>
                    </button>
                  </td>
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
.question-form-page {
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
.question-form, .info-content {
  .form-group {
    margin-bottom: 20px;

    .form-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: #333;
      font-size: 14px;
    }

    .form-input, .form-select {
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

    .form-select {
      background: white;
      cursor: pointer;
    }

    .error-message {
      display: block;
      margin-top: 5px;
      font-size: 12px;
      color: #dc3545;
    }
  }
}

// 勾選框樣式
.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;

  .form-checkbox {
    margin-right: 8px;
    width: 16px;
    height: 16px;
    accent-color: #6c5ce7;
  }

  .checkbox-text {
    font-size: 14px;
    color: #333;
  }
}

// 選項設定
.options-container {
  .option-item {
    display: flex;
    gap: 10px;
    margin-bottom: 10px;
    align-items: center;

    .option-input {
      flex: 1;
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.3s;

      &:focus {
        outline: none;
        border-color: #6c5ce7;
        box-shadow: 0 0 0 2px rgba(108, 92, 231, 0.1);
      }

      &:disabled {
        background-color: #f8f9fa;
        color: #999;
        cursor: not-allowed;
      }
    }

    .remove-option-btn {
      background: #ffebee;
      border: none;
      padding: 8px;
      border-radius: 6px;
      cursor: pointer;
      color: #d32f2f;
      transition: all 0.2s;
      flex-shrink: 0;

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

  .add-option-btn {
    background: #f8f7ff;
    color: #6c5ce7;
    border: 1px dashed #6c5ce7;
    padding: 10px 15px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.3s;
    width: 100%;

    &:hover:not(:disabled) {
      background: #6c5ce7;
      color: white;
      border-style: solid;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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

      .mobile-card-meta {
        display: flex;
        gap: 10px;
        margin-bottom: 8px;

        .mobile-card-type {
          background: #e3f2fd;
          color: #1976d2;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .mobile-card-status {
          padding: 2px 8px;
          border-radius: 12px;
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
        }
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

        &.drag-column {
          width: 60px;
          text-align: center;
          padding: 15px 10px;
        }

        &.id-column {
          width: 80px;
          text-align: center;
        }

        &.content-column {
          min-width: 200px;
        }

        &.type-column {
          width: 120px;
        }

        &.status-column {
          width: 120px;
        }

        &.time-column {
          width: 160px;
        }

        &.action-column {
          width: 80px;
          text-align: center;
        }
      }
    }

    tbody {
      .table-row {
        border-bottom: 1px solid #f0f0f0;
        transition: all 0.2s;
        cursor: pointer;

        &:hover:not(.dragging) {
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

              &:hover {
                color: #6c5ce7;
              }

              &:active {
                cursor: grabbing;
              }
            }
          }

          &.id-cell {
            text-align: center;
            font-weight: 500;
            color: #666;
          }

          &.content-cell {
            max-width: 300px;
            word-wrap: break-word;
            line-height: 1.4;
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

  &:hover {
    transform: scale(1.1);
    background: #ffebee;
    color: #d32f2f;
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

/* ===== 響應式設計 ===== */

// 平板樣式 (768px - 1024px)
@media (max-width: 1024px) and (min-width: 768px) {
  .question-form-page {
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
  .question-form-page {
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
    flex-direction: column;
    gap: 10px;

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

  .options-container {
    .option-item {
      flex-direction: column;
      align-items: stretch;
      gap: 8px;

      .remove-option-btn {
        align-self: flex-end;
        width: fit-content;
      }
    }
  }
}

// 超小屏幕樣式 (< 480px)
@media (max-width: 479px) {
  .question-form-page {
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

      .mobile-card-meta {
        margin-bottom: 6px;

        .mobile-card-type,
        .mobile-card-status {
          font-size: 11px;
          padding: 1px 6px;
        }
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

  .form-input, .form-select, .option-input {
    padding: 10px 12px !important;
    font-size: 16px !important; // 避免iOS縮放
  }
}

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

// 確保 list-card 有相對定位
.list-card {
  position: relative;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

// 禁用狀態樣式
.table-row.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;

  &:hover {
    background: inherit;
  }
}

.mobile-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;

  &:hover {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transform: none;
  }
}

.drag-handle.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  color: #ccc;

  &:hover {
    color: #ccc;
  }
}

// 更新中狀態的拖拽提示
.drag-hint {
  transition: color 0.3s;
  
  &.updating {
    color: #6c5ce7;
    font-weight: 500;
  }
}

// 按鈕禁用狀態
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  
  &:hover {
    transform: none;
    box-shadow: none;
  }
}

.delete-btn:disabled {
  background: #f8f9fa;
  color: #ccc;
  
  &:hover {
    background: #f8f9fa;
    color: #ccc;
    transform: none;
  }
}

// 分頁按鈕禁用狀態
.page-btn:disabled {
  background: #f8f9fa;
  color: #ccc;
  cursor: not-allowed;
  
  &:hover {
    background: #f8f9fa;
    border-color: #ddd;
    transform: none;
  }
}

// 響應式調整
@media (max-width: 767px) {
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
</style>
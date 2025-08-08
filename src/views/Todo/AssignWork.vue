<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTodoStore } from '@/stores/todo'
import { formatDate, formatDateTime } from '@/utils/dateUtils'
import FilePreviewModal from '@/components/FilePreviewModal.vue'

const route = useRoute()
const router = useRouter()
const todoStore = useTodoStore()

// 報修詳細資料
const todoDetail = ref(null)
const isLoading = ref(true)
const isSaving = ref(false)
const isEdit = ref(false) // 是否為編輯模式
// 從路由參數獲取報修ID
const todoId = computed(() => route.params.id)

// 用戶相關
const users = ref([]) // 用戶列表
const isUserModalOpen = ref(false) // 用戶選擇模態框開關
const userSearchKeyword = ref('') // 用戶搜尋關鍵字
const isLoadingUsers = ref(false) // 用戶載入狀態

// 用戶分頁相關
const userCurrentPage = ref(1)
const userPageSize = ref(10)
const userTotalItems = ref(0)
const userTotalPages = ref(0)

// 表單數據
const formData = reactive({
  repairId: '',
  assignUserId: '',
  importanceLevel: '',
  emergencyLevel: '',
  estimatedCompletionTime: '', //預設為依當前時間往後增加五日
  fileIds: []
})
const selectedUserInfo = ref(null) // 存儲當前選中用戶的完整資訊

// 檔案上傳相關
const selectedFiles = ref([]) // 新選擇的檔案
const uploadedFiles = ref([]) // 新上傳的檔案
const existingFiles = ref([]) // 原本已有的檔案
const isDragging = ref(false)
const fileInput = ref(null)

// 選項數據
const importanceLevels = [
  { value: '1', label: '普級' },
  { value: '2', label: '保固級' },
  { value: '3', label: '急件' }
]

const emergencyLevels = [
  { value: '1', label: '普級' },
  { value: '2', label: '中級' },
  { value: '3', label: '高級' }
]

// 計算屬性：篩選用戶（移除本地篩選，改用服務端搜尋）
const filteredUsers = computed(() => {
  return users.value || []
})

// 計算屬性：用戶分頁相關
const userStartItem = computed(() => {
  return userTotalItems.value === 0 ? 0 : (userCurrentPage.value - 1) * userPageSize.value + 1
})

const userEndItem = computed(() => {
  const end = userCurrentPage.value * userPageSize.value
  return end > userTotalItems.value ? userTotalItems.value : end
})

const userVisiblePages = computed(() => {
  const pages = []
  const total = userTotalPages.value
  const current = userCurrentPage.value
  
  if (total <= 5) {
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    if (current <= 3) {
      for (let i = 1; i <= 4; i++) {
        pages.push(i)
      }
    } else if (current >= total - 2) {
      for (let i = total - 3; i <= total; i++) {
        pages.push(i)
      }
    } else {
      for (let i = current - 1; i <= current + 1; i++) {
        pages.push(i)
      }
    }
  }
  
  return pages
})

const userShowEllipsis = computed(() => {
  return userTotalPages.value > 5 && userCurrentPage.value < userTotalPages.value - 2
})

// 計算屬性：當前選中的用戶
const selectedUser = computed(() => {
  if (!formData.assignUserId) return null
  
  // 優先從 selectedUserInfo 獲取
  if (selectedUserInfo.value && selectedUserInfo.value.id === formData.assignUserId) {
    return selectedUserInfo.value
  }
  
  // 其次從當前用戶列表中查找
  const userFromList = users.value.find(user => user.id === formData.assignUserId)
  if (userFromList) {
    selectedUserInfo.value = userFromList // 同步更新 selectedUserInfo
    return userFromList
  }
  
  // 如果都找不到，返回 selectedUserInfo（保持顯示）
  return selectedUserInfo.value
})

// 計算屬性：檢查是否有檔案正在上傳 (新增)
const hasUploadingFiles = computed(() => {
  return selectedFiles.value.some(file => file.uploading)
})

// 計算屬性：是否可以提交表單 (新增)
const canSubmit = computed(() => {
  return !isSaving.value && !hasUploadingFiles.value
})

// 獲取報修詳細資料
const fetchTodoDetail = async () => {
  try {
    isLoading.value = true
    const response = await todoStore.fetchTodo(todoId.value)
    console.log(todoStore.todoDetail);
    
    todoDetail.value = todoStore.todoDetail
    isEdit.value = !!todoDetail.value.repair_id
    // 初始化表單數據
    if (todoDetail.value) {
      formData.repairId = todoDetail.value.repair_id
      formData.assignUserId = todoDetail.value.assign_user_id || ''
      formData.importanceLevel = todoDetail.value.importance_level || ''
      formData.emergencyLevel = todoDetail.value.emergency_level || ''
      formData.estimatedCompletionTime = todoDetail.value.estimated_completion_time 
        ? new Date(todoDetail.value.estimated_completion_time).toISOString().slice(0, 16)
        : ''
      
      // 設置已存在的檔案（原本就有的檔案）
      if (todoDetail.value.files && todoDetail.value.files.length > 0) {
        existingFiles.value = todoDetail.value.files.map(file => ({
          id: file.file_id,
          name: file.original_name,
          size: file.size,
          isExisting: true // 標記為原有檔案
        }))
        // 原有檔案 ID 也加入表單
        // formData.fileIds = todoDetail.value.files.map(file => file.file_id)
      }
      // 如果有指派用戶，需要獲取用戶信息並保存到 selectedUserInfo
      if (todoDetail.value.assign_user_id) {
        // 可以從 todoDetail 中獲取用戶信息，或者調用 API 獲取
        // 假設 todoDetail 包含用戶信息
        if (todoDetail.value.assign_user) {
          selectedUserInfo.value = todoDetail.value.assign_user
        }
      }

    }
  } catch (error) {
    console.error('獲取報修詳細資料失敗:', error)
    alert('載入失敗，請稍後重試')
  } finally {
    isLoading.value = false
  }
}

// 獲取用戶列表（帶分頁和搜尋）
const fetchUsers = async (page = 1, keyword = '') => {
  try {
    isLoadingUsers.value = true
    
    // 準備 API 參數
    const params = {
      page: page,
      pageSize: userPageSize.value
    }
    
    // 如果有搜尋關鍵字，加入參數
    if (keyword.trim()) {
      params.keyword = keyword.trim()
    }
    
    // 調用 API - 需要修改 store 中的方法來接受參數
    const response = await todoStore.fetchAssignableUsers(params)
    
    console.log('用戶 API 回應:', response)
    
    if (response && response.data) {
      users.value = response.data.data || []
      userTotalPages.value = response.data.totalPages || 0
      userTotalItems.value = response.data.total || 0
      userCurrentPage.value = page
    } else {
      users.value = []
      userTotalPages.value = 0
      userTotalItems.value = 0
    }
  } catch (error) {
    console.error('獲取用戶列表失敗:', error)
    users.value = []
    userTotalPages.value = 0
    userTotalItems.value = 0
  } finally {
    isLoadingUsers.value = false
  }
}

// 用戶分頁跳轉
const goToUserPage = async (page) => {
  if (page >= 1 && page <= userTotalPages.value && !isLoadingUsers.value) {
    await fetchUsers(page, userSearchKeyword.value)
  }
}

// 用戶搜尋（防抖處理）
let searchTimeout = null
const handleUserSearch = () => {
  console.log(formData.assignUserId);
  
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    userCurrentPage.value = 1
    await fetchUsers(1, userSearchKeyword.value)
  }, 500) // 500ms 防抖
  console.log(formData.assignUserId);
  
}

// 開啟用戶選擇模態框
const openUserModal = async () => {
  isUserModalOpen.value = true
  userSearchKeyword.value = ''
  userCurrentPage.value = 1
  await fetchUsers(1, '') // 載入第一頁數據
}

// 關閉用戶選擇模態框
const closeUserModal = () => {
  isUserModalOpen.value = false
  userSearchKeyword.value = ''
  userCurrentPage.value = 1
  // 清除搜尋防抖
  if (searchTimeout) {
    clearTimeout(searchTimeout)
    searchTimeout = null
  }
}

// 選擇用戶
const selectUser = (user) => {
  formData.assignUserId = user.id
  selectedUserInfo.value = user // 保存完整用戶信息
  closeUserModal()
}

// 清除已選用戶
const clearSelectedUser = () => {
  formData.assignUserId = ''
  selectedUserInfo.value = null // 同時清除保存的用戶信息
}

// 檔案選擇處理
const handleFileSelect = (event) => {
  const files = Array.from(event.target.files)
  addFiles(files)
}

// 拖放處理
const handleDrop = (event) => {
  event.preventDefault()
  isDragging.value = false
  const files = Array.from(event.dataTransfer.files)
  addFiles(files)
}

const handleDragOver = (event) => {
  event.preventDefault()
  isDragging.value = true
}

const handleDragLeave = () => {
  isDragging.value = false
}

// 添加檔案
const addFiles = async (files) => {
  for (const file of files) {
    // 檢查檔案大小 (限制 100MB)
    if (file.size > 100 * 1024 * 1024) {
      alert(`檔案 "${file.name}" 超過 100MB 限制`)
      continue
    }

    // 檢查是否已存在（包含原有檔案、新上傳檔案和選擇中的檔案）
    const exists = [...selectedFiles.value, ...uploadedFiles.value, ...existingFiles.value].some(
      existingFile => existingFile.name === file.name && existingFile.size === file.size
    )

    if (exists) {
      alert(`檔案 "${file.name}" 已存在`)
      continue
    }

    const fileObj = {
      id: Date.now() + Math.random(),
      file: file,
      name: file.name,
      size: file.size,
      uploading: false,
      uploaded: false
    }

    selectedFiles.value.push(fileObj)
    
    // 立即上傳檔案
    await uploadFile(fileObj)
  }
}

// 上傳檔案到待辦案件專用 API - 修改版本
const uploadFile = async (fileObj) => {
  try {
    fileObj.uploading = true
    
    const fileFormData = new FormData()
    fileFormData.append('file', fileObj.file) 

    if(isEdit.value){
        fileFormData.append('todoId', todoDetail.value.todo_id)
    }

    console.log('開始上傳檔案:', fileObj.name)
    const result = await todoStore.saveTodoFiles(fileFormData)
    console.log('上傳結果:', result)
    
    if (result.success && result.data) {
      const uploadedFile = result.data[0]

      console.log(uploadedFile);
      
      fileObj.uploaded = true
      fileObj.fileId = uploadedFile.id
      
      // 添加到新上傳完成列表
      uploadedFiles.value.push({
        id: uploadedFile.id,
        name: uploadedFile.originalName || fileObj.name,
        size: uploadedFile.size || fileObj.size,
        uploaded: true,
        isNew: true // 標記為新上傳的檔案
      })
      // 更新表單中的檔案ID列表
      formData.fileIds.push(uploadedFile.id)
      
      // 從選擇列表中移除
      const index = selectedFiles.value.findIndex(f => f.id === fileObj.id)
      if (index > -1) {
        selectedFiles.value.splice(index, 1)
      }
      
      console.log('檔案上傳成功:', uploadedFile)
    }
  } catch (error) {
    console.error('檔案上傳失敗:', error)
    
    // 上傳失敗，從選擇列表中移除該檔案
    const index = selectedFiles.value.findIndex(f => f.id === fileObj.id)
    if (index > -1) {
      selectedFiles.value.splice(index, 1)
    }
    
    // 顯示錯誤訊息
    alert(`檔案 "${fileObj.name}" 上傳失敗：${error.message || '未知錯誤'}`)
  }
}

// 移除檔案（只能移除新上傳的檔案）
const removeFile = async (fileObj, isUploaded = false) => {
  try {
    if (isUploaded && fileObj.id && fileObj.isNew) {
      // 只有新上傳的檔案才能刪除
      console.log(fileObj.id);
      
      await todoStore.removeTodoFile(fileObj.id)
      
      // 從新上傳列表中移除
      const index = uploadedFiles.value.findIndex(f => f.id === fileObj.id)
      if (index > -1) {
        uploadedFiles.value.splice(index, 1)
      }
      
      // 從表單檔案ID列表中移除
      const fileIdIndex = formData.fileIds.findIndex(id => id === fileObj.id)
      if (fileIdIndex > -1) {
        formData.fileIds.splice(fileIdIndex, 1)
      }
    } else if (!isUploaded) {
      // 移除未上傳的檔案
      const index = selectedFiles.value.findIndex(f => f.id === fileObj.id)
      if (index > -1) {
        selectedFiles.value.splice(index, 1)
      }
    }
  } catch (error) {
    console.error('檔案刪除失敗:', error)
    alert('檔案刪除失敗')
  }
}


// 格式化檔案大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 獲取檔案圖示
const getFileIcon = (fileName) => {
  if(!fileName) return '📎'
  const extension = fileName.split('.').pop()?.toLowerCase()
  const iconMap = {
    'doc': '📄',
    'docx': '📄', 
    'pdf': '📕',
    'ppt': '📊',
    'pptx': '📊',
    'png': '🖼️',
    'jpg': '🖼️',
    'jpeg': '🖼️',
    'mp4': '🎬'
  }
  return iconMap[extension] || '📎'
}

// 點擊檔案輸入
const triggerFileInput = () => {
  fileInput.value?.click()
}

// 表單驗證
const validateForm = () => {
  if (!formData.importanceLevel) {
    alert('請選擇重要程度')
    return false
  }
  if (!formData.emergencyLevel) {
    alert('請選擇緊急程度')
    return false
  }
  if (!formData.estimatedCompletionTime) {
    alert('請選擇預計完成時間')
    return false
  }
  return true
}

// 儲存表單
const saveForm = async () => {
  console.log(todoDetail.value);
  
  if (!validateForm()) return
  console.log(formData);

  try {
    isSaving.value = true
    
    const submitData = {
      repairId: formData.repairId,
      assignUserId: formData.assignUserId,
      importanceLevel: formData.importanceLevel,
      emergencyLevel: formData.emergencyLevel,
      estimatedCompletionTime: new Date(formData.estimatedCompletionTime).toISOString(),
      fileIds: formData.fileIds
    }
    
    console.log('提交數據:', submitData)
    let response = null;
    // 呼叫API進行案件指派
    if(isEdit.value){
        submitData.todoId = todoId.value // 使用 repair_id 作為 todoId
        response = await todoStore.editTodo(submitData)

    }else{
        response = await todoStore.assignWork(submitData)
    }
    
    if (response.success) {
      alert('儲存成功！')
      router.go(-1) // 返回上一頁
    } else {
      throw new Error(response.message || '儲存失敗')
    }
    
  } catch (error) {
    console.error('儲存失敗:', error)
    alert(`儲存失敗：${error.message || '請稍後重試'}`)
  } finally {
    isSaving.value = false
  }
}

// 取消操作
const cancel = () => {
  router.go(-1)
}

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

// 下載檔案
const downloadFile = async (file) => {
    try {
      if(!file.file_id){
          file.file_id = file.id // 確保有 file_id
        }
        const response = await todoStore.downloadFile(file.file_id);

        if(response?.status === 400){
            alert('下載失敗，請稍後重試。')
            return
        }
        
    } catch (error) {
        alert('下載過程中發生錯誤:', error);
    }
}
// 檔案預覽相關變數
const showFilePreview = ref(false)
const selectedFile = ref(null)

// 打開檔案預覽
const openFilePreview = (file) => {
  console.log('原始檔案對象:', file)
  
  // 統一檔案對象格式
  const normalizedFile = {
    file_id: file.file_id || file.id, // 統一使用 file_id
    file_name: file.file_name || file.name, // 統一使用 file_name
    size: file.size,
    ...file // 保留其他屬性
  }
  
  console.log('標準化後的檔案對象:', normalizedFile)
  
  // 檢查是否有有效的檔案 ID
  if (!normalizedFile.file_id) {
    console.error('檔案缺少有效的 file_id:', normalizedFile)
    alert('檔案資訊不完整，無法預覽')
    return
  }
  
  selectedFile.value = normalizedFile
  showFilePreview.value = true
}
// 關閉檔案預覽
const closeFilePreview = () => {
  showFilePreview.value = false
  selectedFile.value = null
}

// 獲取檔案內容的方法（傳給子組件）
const fetchFileContent = async (fileId) => {
  console.log(fileId);
  
  try {
    const response = await todoStore.viewFile(fileId)
    return response
  } catch (error) {
    console.error('獲取檔案內容失敗:', error)
    throw error
  }
}
// 移除原有檔案
const removeExistingFile = async (file) => {
  try {
    // 確認刪除操作
    const confirmDelete = confirm(`確定要刪除檔案「${file.name}」嗎？`);
    if (!confirmDelete) {
      return;
    }

    console.log('刪除原有檔案:', file);
    
    // 使用 pinia store 的 removeTodoFile 方法
    await todoStore.removeTodoFile(file.id);
    
    // 從原有檔案列表中移除
    const index = existingFiles.value.findIndex(f => f.id === file.id);
    if (index > -1) {
      existingFiles.value.splice(index, 1);
    }
    
    console.log('原有檔案刪除成功');
    // 可選：顯示成功訊息
    alert('檔案刪除成功');
    
  } catch (error) {
    console.error('原有檔案刪除失敗:', error);
    alert(`檔案刪除失敗：${error.message || '未知錯誤'}`);
  }
}
// 檔案預覽事件處理
const onFileDownloaded = (file) => {
  console.log(file);
  
  console.log('檔案已下載:', file.file_name)
}

const onPreviewLoadSuccess = (blob) => {
  console.log('預覽載入成功')
}

const onPreviewLoadError = (error) => {
  console.error('預覽載入失敗:', error)
  alert('預覽失敗，請稍後重試')
}
onMounted(async () => {
    await fetchTodoDetail()
    await fetchUsers();
    if (!formData.estimatedCompletionTime) {
        console.log(123);
        
        const now = new Date();
        now.setDate(now.getDate() + 5);
        
        // 修正時區問題，使用本地時間
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        
        formData.estimatedCompletionTime = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
})
</script>

<template>
  <div class="assign-work-page">
    <div class="assign-container">
      <!-- Loading 狀態 -->
      <div v-if="isLoading" class="loading-container">
        <div class="loading-spinner">⟳</div>
        <div class="loading-text">載入中...</div>
      </div>

      <!-- 主要內容 -->
      <div v-else-if="todoDetail" class="assign-content">
        <!-- 標題區域 -->
        <div class="assign-header">
          <div class="header-left">
            <h2 class="page-title">待辦案件資訊</h2>
            <span class="case-number">{{ todoDetail.id }}</span>
          </div>
        </div>

        <!-- 表單內容 -->
        <div class="form-content">
          <!-- 指派資訊表單 -->
          <div class="assign-form-section">
            <h3 class="section-title">案件指派資訊</h3>
            
            <div class="form-grid">
              <!-- 重要程度 -->
              <div class="form-group">
                <label class="form-label required">重要程度</label>
                <select v-model="formData.importanceLevel" class="form-select">
                  <option value="">選擇案件重要程度</option>
                  <option 
                    v-for="level in importanceLevels" 
                    :key="level.value" 
                    :value="level.value"
                  >
                    {{ level.label }}
                  </option>
                </select>
              </div>

              <!-- 緊急程度 -->
              <div class="form-group">
                <label class="form-label required">緊急程度</label>
                <select v-model="formData.emergencyLevel" class="form-select">
                  <option value="">選擇案件緊急程度</option>
                  <option 
                    v-for="level in emergencyLevels" 
                    :key="level.value" 
                    :value="level.value"
                  >
                    {{ level.label }}
                  </option>
                </select>
              </div>

              <!-- 預計完成時間 -->
              <div class="form-group full-width">
                <label class="form-label required">預計完成時間</label>
                <input 
                  type="datetime-local" 
                  v-model="formData.estimatedCompletionTime"
                  class="form-input"
                >
              </div>

              <!-- 承辦人員 -->
              <div class="form-group full-width">
                <label class="form-label">承辦人員</label>
                <div class="assignee-container">
                  <!-- 顯示當前選中的用戶 -->
                  <div v-if="selectedUser" class="assignee-info selected">
                    <div class="assignee-details">
                      <span class="assignee-name">
                        {{ selectedUser.credential }} {{ selectedUser.name }} 
                        (承辦數 {{ selectedUser.assignCount }})
                      </span>
                      <span class="assignee-email">{{ selectedUser.nick_name }}</span>
                    </div>
                    <div class="assignee-actions">
                      <button type="button" class="change-assignee-btn" @click="openUserModal">
                        更換帳號
                      </button>
                      <button type="button" class="clear-assignee-btn" @click="clearSelectedUser">
                        清除
                      </button>
                    </div>
                  </div>
                  <!-- 未選擇時顯示 -->
                  <div v-else class="assignee-info empty">
                    <span class="empty-text">尚未選擇承辦人員</span>
                    <button type="button" class="select-assignee-btn" @click="openUserModal">
                      選擇帳號
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 檔案上傳區域 -->
          <div class="file-upload-section">
            <h3 class="section-title">相關檔案</h3>
            
            <!-- 檔案上傳區 -->
            <div 
              class="upload-area" 
              :class="{ 'dragging': isDragging }"
              @drop="handleDrop"
              @dragover="handleDragOver"
              @dragleave="handleDragLeave"
              @click="triggerFileInput"
            >
              <div class="upload-icon">📤</div>
              <div class="upload-text">
                將檔案拖拉至此或點選上傳檔案<br>
                上傳檔案會立即儲存至伺服器，檔案大小限制100MB
              </div>
              <button type="button" class="upload-btn">點選上傳檔案</button>
              <input 
                ref="fileInput"
                type="file" 
                multiple 
                @change="handleFileSelect"
                style="display: none"
              >
            </div>

            <!-- 檔案列表 -->
            <div v-if="selectedFiles.length > 0 || uploadedFiles.length > 0 || existingFiles.length > 0" class="file-list">
              <!-- 原有檔案 -->
              <div v-if="existingFiles.length > 0" class="file-section">
                <h4 class="file-section-title">原有檔案</h4>
                <div 
                  v-for="file in existingFiles" 
                  :key="file.id"
                  class="file-item existing"
                >
                  <div class="file-info">
                    <span class="file-icon">{{ getFileIcon(file.name) }}</span>
                    <div class="file-details">
                      <span class="file-name">{{ file.name }}</span>
                      <span class="file-size">{{ formatFileSize(file.size) }}</span>
                    </div>
                  </div>
                  <div class="file-actions">
                    <button 
                      type="button"
                      @click.stop="downloadFile(file)"
                      class="action-btn download-btn"
                      title="下載"
                    >
                      ⬇
                    </button>
                    <button 
                      type="button"
                      @click="openFilePreview(file)"
                      class="action-btn preview-btn"
                      title="預覽"
                    >
                      👁
                    </button>
                    <!-- 新增刪除按鈕 -->
                    <button 
                      type="button"
                      @click.stop="removeExistingFile(file)"
                      class="action-btn delete-btn"
                      title="刪除檔案"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>

              <!-- 新上傳的檔案 -->
              <div v-if="uploadedFiles.length > 0" class="file-section">
                <h4 class="file-section-title">派工檔案</h4>
                <div 
                  v-for="file in uploadedFiles" 
                  :key="file.id"
                  class="file-item uploaded"
                >
                  <div class="file-info">
                    <span class="file-icon">{{ getFileIcon(file.name) }}</span>
                    <div class="file-details">
                      <span class="file-name">{{ file.name }}</span>
                      <span class="file-size">{{ formatFileSize(file.size) }}</span>
                    </div>
                  </div>
                  <div class="file-status">
                    <span class="uploaded-text">已上傳</span>
                  </div>
                  <div class="file-actions">
                    <!-- 新增下載和預覽按鈕 -->
                    <button 
                      type="button"
                      @click.stop="downloadFile(file)"
                      class="action-btn download-btn"
                      title="下載"
                    >
                      ⬇
                    </button>
                    <button 
                      type="button"
                      @click="openFilePreview(file)"
                      class="action-btn preview-btn"
                      title="預覽"
                    >
                      👁
                    </button>
                    <!-- 刪除按鈕 -->
                    <button 
                      type="button"
                      @click.stop="removeFile(file, true)"
                      class="action-btn delete-btn"
                      title="刪除檔案"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>

              <!-- 上傳中的檔案 -->
              <div v-if="selectedFiles.length > 0" class="file-section">
                <h4 class="file-section-title">上傳中</h4>
                <div 
                  v-for="file in selectedFiles" 
                  :key="file.id"
                  class="file-item uploading"
                >
                  <div class="file-info">
                    <span class="file-icon">{{ getFileIcon(file.name) }}</span>
                    <div class="file-details">
                      <span class="file-name">{{ file.name }}</span>
                      <span class="file-size">{{ formatFileSize(file.size) }}</span>
                    </div>
                  </div>
                  <div class="file-status">
                    <span v-if="file.uploading" class="uploading-text">上傳中...</span>
                    <span v-else-if="file.uploaded" class="uploaded-text">已上傳</span>
                    <span v-else class="failed-text">上傳失敗</span>
                  </div>
                  <button 
                    type="button"
                    @click.stop="removeFile(file)"
                    class="remove-btn"
                    :disabled="file.uploading"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 操作按鈕 -->
          <div class="action-buttons">
            <button 
              type="button"
              @click="saveForm" 
              class="save-btn"
              :disabled="!canSubmit"
            >
              <span v-if="isSaving">儲存中...</span>
              <span v-else-if="hasUploadingFiles">檔案上傳中...</span>
              <span v-else>儲存</span>
            </button>
            
            <button 
              type="button"
              @click="cancel" 
              class="cancel-btn"
              :disabled="isSaving"
            >
              取消
            </button>
          </div>
        </div>
      </div>

      <!-- 錯誤狀態 -->
      <div v-else class="error-container">
        <div class="error-message">找不到案件資料</div>
        <button @click="cancel" class="back-btn">返回</button>
      </div>
    </div>

    <!-- 用戶選擇模態框 -->
    <div v-if="isUserModalOpen" class="modal-overlay" @click="closeUserModal">
      <div class="user-modal" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">選擇承辦人員</h3>
          <button type="button" class="modal-close-btn" @click="closeUserModal">✕</button>
        </div>
        
        <div class="modal-body">
          <!-- 搜尋框 -->
          <div class="search-box">
            <input 
              type="text" 
              v-model="userSearchKeyword" 
              placeholder="搜尋姓名、帳號、暱稱....."
              class="search-input"
              @input="handleUserSearch"
              :disabled="isLoadingUsers"
            >
          </div>
          
          <!-- 載入狀態 -->
          <div v-if="isLoadingUsers" class="loading-container">
            <div class="loading-spinner">⟳</div>
            <div class="loading-text">載入中...</div>
          </div>
          
          <!-- 用戶列表 -->
          <div v-else class="user-list">
            <div 
              v-for="user in filteredUsers" 
              :key="user.id"
              class="user-item"
              :class="{ 'selected': formData.assignUserId === user.id }"
              @click="selectUser(user)"
            >
              <div class="user-info">
                <div class="user-main">
                  <span class="user-name">{{ user.name }}</span>
                  <span class="user-id">({{ user.credential }})</span>
                  <span class="work-count">承辦數: {{ user.assignCount }}</span>
                </div>
                <div class="user-details">
                  <!-- <span class="user-email">{{ user.email }}</span> -->
                  <span class="user-nick">{{ user.nick_name }}</span>
                  <span class="user-status" :class="`status-${user.status?.toLowerCase()}`">
                    {{ getStatusLabel(user.status) }}
                  </span>
                </div>
              </div>
              <div v-if="formData.assignUserId === user.id" class="selected-icon">
                ✓
              </div>
            </div>
            
            <!-- 無結果提示 -->
            <div v-if="filteredUsers.length === 0" class="no-results">
              <div class="no-results-icon">🔍</div>
              <div class="no-results-text">找不到符合條件的用戶</div>
            </div>
          </div>

          <!-- 分頁控制 -->
          <div v-if="!isLoadingUsers && userTotalPages > 1" class="user-pagination">
            <div class="pagination-info">
              <span>顯示第 {{ userStartItem }} 到 {{ userEndItem }} 筆結果 共 {{ userTotalItems }} 項</span>
            </div>
            
            <div class="pagination-controls">
              <button 
                class="page-btn" 
                :disabled="userCurrentPage === 1 || isLoadingUsers"
                @click="goToUserPage(userCurrentPage - 1)"
              >
                ‹
              </button>
              
              <button 
                v-for="page in userVisiblePages" 
                :key="page"
                :class="['page-btn', { active: page === userCurrentPage }]"
                :disabled="isLoadingUsers"
                @click="goToUserPage(page)"
              >
                {{ page }}
              </button>
              
              <span v-if="userShowEllipsis" class="ellipsis">...</span>
              
              <button 
                v-if="userTotalPages > 5"
                :class="['page-btn', { active: userTotalPages === userCurrentPage }]"
                :disabled="isLoadingUsers"
                @click="goToUserPage(userTotalPages)"
              >
                {{ userTotalPages }}
              </button>
              
              <button 
                class="page-btn" 
                :disabled="userCurrentPage === userTotalPages || isLoadingUsers"
                @click="goToUserPage(userCurrentPage + 1)"
              >
                ›
              </button>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="modal-cancel-btn" @click="closeUserModal">
            取消
          </button>
        </div>
      </div>
    </div>
    <FilePreviewModal
        :visible="showFilePreview"
        :file="selectedFile"
        :fetch-file-content="fetchFileContent"
        :download-file="downloadFile"
        @close="closeFilePreview"
        @download="onFileDownloaded"
        @load-success="onPreviewLoadSuccess"
        @load-error="onPreviewLoadError"
      />
  </div>
</template>

<style lang="scss" scoped>
.assign-work-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20px;
}

.assign-container {
  max-width: 1000px;
  margin: 0 auto;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

// Loading 樣式
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: #666;

  .loading-spinner {
    font-size: 32px;
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

// 標題區域
.assign-header {
  background: #6c5ce7;
  color: white;
  padding: 25px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .header-left {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .page-title {
    font-size: 20px;
    font-weight: 600;
    margin: 0;
  }

  .case-number {
    font-size: 16px;
    font-weight: 500;
    font-family: 'Courier New', monospace;
    background: rgba(255, 255, 255, 0.2);
    padding: 8px 16px;
    border-radius: 20px;
  }
}

// 表單內容
.form-content {
  padding: 30px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
  padding-bottom: 8px;
  border-bottom: 2px solid #6c5ce7;
}

// 基本資訊區域
.basic-info-section {
  margin-bottom: 40px;

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px;
  }

  .info-item {
    .info-label {
      font-size: 14px;
      font-weight: 500;
      color: #555;
      margin-bottom: 8px;
      display: block;
    }

    .info-value {
      font-size: 14px;
      color: #333;
      padding: 12px 15px;
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      min-height: 20px;
    }
  }
}

// 表單區域
.assign-form-section {
  margin-bottom: 40px;

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;

    .full-width {
      grid-column: 1 / -1;
    }
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .form-label {
      font-size: 14px;
      font-weight: 500;
      color: #555;

      &.required::after {
        content: ' *';
        color: #e74c3c;
      }
    }

    .form-select,
    .form-input {
      padding: 12px 15px;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.3s;

      &:focus {
        outline: none;
        border-color: #6c5ce7;
      }
    }

    .form-select {
      background: white;
      cursor: pointer;
    }
  }

  // 承辦人員選擇區域
  .assignee-container {
    .assignee-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      transition: all 0.3s;

      &.selected {
        background: #f0fff4;
        border-color: #28a745;
      }

      &.empty {
        background: #f8f9fa;
        border-color: #e9ecef;
      }

      .assignee-details {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;

        .assignee-name {
          font-size: 14px;
          color: #333;
          font-weight: 500;
        }

        .assignee-email {
          font-size: 12px;
          color: #666;
        }
      }

      .assignee-actions {
        display: flex;
        gap: 8px;
      }

      .empty-text {
        font-size: 14px;
        color: #999;
        font-style: italic;
      }

      .select-assignee-btn,
      .change-assignee-btn {
        background: #6c5ce7;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 14px;
        cursor: pointer;
        transition: background 0.3s;

        &:hover {
          background: #5b4bcf;
        }
      }

      .clear-assignee-btn {
        background: #dc3545;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 14px;
        cursor: pointer;
        transition: background 0.3s;

        &:hover {
          background: #c82333;
        }
      }
    }
  }
}

// 檔案上傳區域
.file-upload-section {
  margin-bottom: 40px;

  .upload-area {
    border: 2px dashed #e9ecef;
    border-radius: 8px;
    padding: 40px 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s;
    background: #fafbfc;

    &:hover,
    &.dragging {
      border-color: #6c5ce7;
      background: #f8f9ff;
    }

    .upload-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.6;
    }

    .upload-text {
      font-size: 14px;
      color: #666;
      margin-bottom: 20px;
      line-height: 1.5;
    }

    .upload-btn {
      background: #6c5ce7;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.3s;

      &:hover {
        background: #5b4bcf;
      }
    }
  }

  .file-list {
    margin-top: 20px;
  }

  .file-section {
    margin-bottom: 25px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .file-section-title {
    font-size: 14px;
    font-weight: 600;
    color: #333;
    margin-bottom: 15px;
    padding: 8px 12px;
    background: #f8f9fa;
    border-left: 4px solid #6c5ce7;
    border-radius: 4px;
  }

  .file-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    transition: all 0.3s;
    margin-bottom: 8px;
    .file-actions {
    display: flex;
    gap: 8px;
    margin-right: 8px;
  }

  .action-btn {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    justify-content: center;

    &.download-btn {
      background: #007bff;
      color: white;

      &:hover {
        background: #0056b3;
        transform: scale(1.05);
      }
    }

    &.preview-btn {
      background: #28a745;
      color: white;

      &:hover {
        background: #1e7e34;
        transform: scale(1.05);
      }
    }

    // 新增刪除按鈕樣式
    &.delete-btn {
      background: #dc3545;
      color: white;

      &:hover {
        background: #c82333;
        transform: scale(1.05);
      }

      &:active {
        transform: scale(0.95);
      }
    }
  }

  // 修改新上傳檔案的佈局，因為現在有更多按鈕
  &.uploaded {
    .file-status {
      margin-right: 10px; // 減少間距，為按鈕騰出空間
    }
  }

  // 確保原有檔案區域有足夠空間顯示所有按鈕
  &.existing {
    .file-actions {
      min-width: 120px; // 確保有足夠空間容納三個按鈕
    }
  }
    &:last-child {
      margin-bottom: 0;
    }

    &.uploading {
      border-color: #ffc107;
      background: #fff9e6;
    }

    &.uploaded {
      border-color: #28a745;
      background: #f0fff4;
    }

    &.existing {
      border-color: #17a2b8;
      background: #e8f4f8;
    }

    .file-info {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;

      .file-icon {
        font-size: 24px;
      }

      .file-details {
        display: flex;
        flex-direction: column;
        gap: 4px;

        .file-name {
          font-size: 14px;
          color: #333;
          font-weight: 500;
        }

        .file-size {
          font-size: 12px;
          color: #666;
        }
      }
    }

    .file-status {
      margin-right: 15px;

      .uploading-text {
        font-size: 12px;
        color: #856404;
      }

      .uploaded-text {
        font-size: 12px;
        color: #155724;
      }

      .failed-text {
        font-size: 12px;
        color: #e74c3c;
      }
    }

    .file-actions {
      display: flex;
      gap: 8px;
      margin-right: 8px;
    }

    .action-btn {
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;

      &.download-btn {
        background: #007bff;
        color: white;

        &:hover {
          background: #0056b3;
          transform: scale(1.05);
        }
      }

      &.preview-btn {
        background: #28a745;
        color: white;

        &:hover {
          background: #1e7e34;
          transform: scale(1.05);
        }
      }
    }

    .remove-btn {
      background: #e74c3c;
      color: white;
      border: none;
      border-radius: 50%;
      width: 24px;
      height: 24px;
      cursor: pointer;
      font-size: 12px;
      transition: background 0.3s;

      &:hover:not(:disabled) {
        background: #c0392b;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
}

// 操作按鈕
.action-buttons {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;

  .save-btn {
    background: #6c5ce7;
    color: white;
    border: none;
    padding: 12px 30px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;

    &:hover:not(:disabled) {
      background: #5b4bcf;
      transform: translateY(-1px);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .cancel-btn {
    background: white;
    color: #666;
    border: 1px solid #ddd;
    padding: 12px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;

    &:hover:not(:disabled) {
      background: #f8f9fa;
      border-color: #6c5ce7;
      color: #6c5ce7;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}

// 錯誤狀態
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: #666;

  .error-message {
    font-size: 18px;
    margin-bottom: 20px;
  }

  .back-btn {
    background: #6c5ce7;
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      background: #5b4bcf;
    }
  }
}

// 用戶選擇模態框樣式
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.user-modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 25px;
    border-bottom: 1px solid #f0f0f0;
    background: #6c5ce7;
    color: white;

    .modal-title {
      font-size: 18px;
      font-weight: 600;
      margin: 0;
    }

    .modal-close-btn {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background 0.3s;

      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }
    }
  }

  .modal-body {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .search-box {
    padding: 20px 25px 15px;
    border-bottom: 1px solid #f0f0f0;

    .search-input {
      width: 100%;
      padding: 12px 15px;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      font-size: 14px;
      transition: border-color 0.3s;

      &:focus {
        outline: none;
        border-color: #6c5ce7;
      }

      &:disabled {
        background-color: #f8f9fa;
        color: #999;
        cursor: not-allowed;
      }

      &::placeholder {
        color: #999;
      }
    }
  }

  .user-list {
    flex: 1;
    overflow-y: auto;
    padding: 0 25px 15px;
    min-height: 200px;
  }

  .user-pagination {
    padding: 15px 25px;
    border-top: 1px solid #f0f0f0;
    background: #f8f9fa;

    .pagination-info {
      font-size: 12px;
      color: #666;
      margin-bottom: 10px;
      text-align: center;
    }

    .pagination-controls {
      display: flex;
      justify-content: center;
      gap: 5px;

      .page-btn {
        padding: 6px 10px;
        border: 1px solid #ddd;
        background: white;
        color: #333;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
        min-width: 32px;

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
        padding: 6px 4px;
        color: #666;
        font-size: 12px;
      }
    }
  }

  .user-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    border: 1px solid #f0f0f0;
    border-radius: 8px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      border-color: #6c5ce7;
      background: #f8f9ff;
    }

    &.selected {
      border-color: #6c5ce7;
      background: #f0fff4;
      box-shadow: 0 2px 8px rgba(108, 92, 231, 0.1);
    }

    .user-info {
      flex: 1;

      .user-main {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;

        .user-name {
          font-size: 14px;
          font-weight: 600;
          color: #333;
        }

        .user-id {
          font-size: 12px;
          color: #666;
          background: #f8f9fa;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .work-count {
          font-size: 12px;
          color: #28a745;
          background: #f0fff4;
          padding: 2px 6px;
          border-radius: 4px;
        }
      }

      .user-details {
        display: flex;
        align-items: center;
        gap: 12px;

        .user-email {
          font-size: 12px;
          color: #666;
        }

        .user-nick {
          font-size: 12px;
          color: #999;
        }

        .user-status {
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 12px;
          font-weight: 500;

          &.status-open {
            background: #d4edda;
            color: #155724;
          }

          &.status-leave {
            background: #f8d7da;
            color: #721c24;
          }
          &.status-inconvenient{
            background: #fff3cd;
            color: #856404;
          }
        }
      }
    }

    .selected-icon {
      color: #6c5ce7;
      font-size: 18px;
      font-weight: bold;
      margin-left: 10px;
    }
  }

  .no-results {
    text-align: center;
    padding: 40px 20px;
    color: #999;

    .no-results-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .no-results-text {
      font-size: 14px;
    }
  }

  .modal-footer {
    padding: 15px 25px;
    border-top: 1px solid #f0f0f0;
    display: flex;
    justify-content: flex-end;

    .modal-cancel-btn {
      background: #f8f9fa;
      color: #666;
      border: 1px solid #e9ecef;
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.3s;

      &:hover {
        background: #e9ecef;
        border-color: #6c5ce7;
        color: #6c5ce7;
      }
    }
  }
}

// 響應式設計
@media (max-width: 768px) {
  .assign-work-page {
    padding: 10px;
  }

  .assign-header {
    padding: 20px;
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .form-content {
    padding: 20px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column-reverse;

    .save-btn,
    .cancel-btn {
      width: 100%;
    }
  }

  .assignee-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;

    .assignee-actions {
      width: 100%;
      justify-content: flex-start;
    }
  }

  .upload-area {
    padding: 30px 15px;

    .upload-icon {
      font-size: 36px;
    }
  }

  .user-modal {
    margin: 10px;
    max-height: 90vh;

    .modal-header,
    .search-box,
    .modal-footer {
      padding-left: 20px;
      padding-right: 20px;
    }

    .user-list {
      padding-left: 20px;
      padding-right: 20px;
    }

    .user-item {
      .user-main {
        flex-wrap: wrap;
      }

      .user-details {
        flex-wrap: wrap;
      }
    }
  }
}

@media (max-width: 480px) {
  .case-number {
    font-size: 14px;
    padding: 6px 12px;
  }

  .page-title {
    font-size: 18px;
  }

  .upload-text {
    font-size: 12px;
  }

  .file-item {
    padding: 12px;

    .file-info .file-icon {
      font-size: 20px;
    }
  }

  .user-modal {
    .modal-title {
      font-size: 16px;
    }

    .user-item {
      padding: 12px;

      .user-main {
        gap: 6px;
      }

      .user-details {
        gap: 8px;
      }
    }
  }
}
@media (max-width: 768px) {
  .file-item {
    .action-btn {
      width: 28px;
      height: 28px;
      font-size: 12px;
    }

    .file-actions {
      gap: 6px;
    }
  }
}

@media (max-width: 480px) {
  .file-item {
    .action-btn {
      width: 24px;
      height: 24px;
      font-size: 10px;
    }

    .file-actions {
      gap: 4px;
      min-width: 80px;
    }

    &.existing .file-actions {
      min-width: 90px;
    }
  }
}
</style>
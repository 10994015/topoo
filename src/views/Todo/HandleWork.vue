<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBackendRepairStore } from '@/stores/backend.repair'
import FilePreviewModal from '@/components/FilePreviewModal.vue'
import { formatDateTime } from '@/utils/dateUtils'
import { useSurveyStore } from '@/stores/survey'

const route = useRoute()
const router = useRouter()

const backendRepairStore = useBackendRepairStore()
const surveyStore = useSurveyStore()
// 基本狀態
const isLoading = ref(true)
const isSaving = ref(false)
const caseDetail = ref(null)

// 檔案相關狀態
const selectedFiles = ref([])
const uploadedFiles = ref([])
const existingFiles = ref([])
const isDragging = ref(false)
const fileInput = ref(null)

// 表單數據
const formData = reactive({
  repairId: '',
  repairStatusId: '',
  content: '',
  fileIds: []
})

// 狀態選項
const statusOptions = ref([])

// 從路由參數獲取案件ID
const caseId = computed(() => route.params.id)

// 檢查是否有檔案
const hasFiles = computed(() => {
  return selectedFiles.value.length > 0 || 
         uploadedFiles.value.length > 0 || 
         existingFiles.value.length > 0
})

// 檢查是否有檔案正在上傳
const hasUploadingFiles = computed(() => {
  return selectedFiles.value.some(file => file.uploading)
})

// 表單驗證
const isFormValid = computed(() => {
  return formData.repairStatusId && formData.content.trim().length > 0
})

// 計算屬性：是否可以提交表單
const canSubmit = computed(() => {
  return !isSaving.value && !hasUploadingFiles.value && isFormValid.value
})

// 獲取案件詳細資料
const fetchCaseDetail = async () => {
  try {
    isLoading.value = true
    await backendRepairStore.fetchRepairDetail(caseId.value)
    
    caseDetail.value = backendRepairStore.repairDetail
    formData.repairId = caseDetail.value.id

    console.log(caseDetail.value);
    
    // 設置已存在的檔案
    if (caseDetail.value.files && caseDetail.value.files.length > 0) {
      existingFiles.value = caseDetail.value.files.map(file => ({
        file_id: file.file_id,
        name: file.file_name,
        size: file.size,
        isExisting: true
      }))
    }

    console.log(existingFiles.value);
    
  } catch (error) {
    console.error('獲取案件詳細資料失敗:', error)
    alert('載入失敗，請稍後重試')
  } finally {
    isLoading.value = false
  }
}

// 檔案處理函數
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getFileIcon = (fileName) => {
  if (!fileName) return '📎'
  const extension = fileName.split('.').pop()?.toLowerCase()
  const iconMap = {
    'doc': '📄', 'docx': '📄', 'pdf': '📕',
    'ppt': '📊', 'pptx': '📊', 'png': '🖼️',
    'jpg': '🖼️', 'jpeg': '🖼️', 'mp4': '🎬'
  }
  return iconMap[extension] || '📎'
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event) => {
  const files = Array.from(event.target.files)
  addFiles(files)
}

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

const addFiles = async (files) => {
  for (const file of files) {
    // 檢查檔案大小 (限制 100MB)
    if (file.size > 100 * 1024 * 1024) {
      alert(`檔案 "${file.name}" 超過 100MB 限制`)
      continue
    }
    
    // 檢查是否已存在
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
    await uploadFile(fileObj)
  }
}

// 上傳檔案到伺服器
const uploadFile = async (fileObj) => {
  try {
    fileObj.uploading = true
    
    const fileFormData = new FormData()
    fileFormData.append('file', fileObj.file)

    const result = await backendRepairStore.saveTodoFiles(fileFormData)
 
    if (result.data && result.data.length > 0) {
      const uploadedFile = result.data[0]
      
      fileObj.uploaded = true
      fileObj.fileId = uploadedFile.id
      
      // 添加到新上傳完成列表
      uploadedFiles.value.push({
        id: uploadedFile.id,
        name: uploadedFile.originalName || fileObj.name,
        size: uploadedFile.size || fileObj.size,
        uploaded: true,
        isNew: true
      })
      
      // 更新表單中的檔案ID列表
      formData.fileIds.push(uploadedFile.id)
      
      // 從選擇列表中移除
      const index = selectedFiles.value.findIndex(f => f.id === fileObj.id)
      if (index > -1) {
        selectedFiles.value.splice(index, 1)
      }
    }
  } catch (error) {
    console.error('檔案上傳失敗:', error)
    alert(`檔案 "${fileObj.name}" 上傳失敗`)
    fileObj.uploading = false
  }
}

const removeFile = async (fileObj) => {
  try {
    if (fileObj.id && fileObj.isNew) {
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
    }
  } catch (error) {
    console.error('檔案刪除失敗:', error)
    alert('檔案刪除失敗')
  }
}

const removeSelectedFile = (fileObj) => {
  const index = selectedFiles.value.findIndex(f => f.id === fileObj.id)
  if (index > -1) {
    selectedFiles.value.splice(index, 1)
  }
}

// 樣式相關函數
const getStatusClass = (status) => {
  const statusMap = {
    '尚未指派': 'status-pending',
    '承辦中': 'status-processing',
    '已完成': 'status-completed',
    '尚未承辦': 'status-default',
    '歸檔': 'status-completed',
  }
  return statusMap[status] || 'status-default'
}

const getPriorityClass = (level) => {
  const levelMap = {
    1: 'priority-normal',
    2: 'priority-medium', 
    3: 'priority-urgent'
  }
  return levelMap[level] || ''
}

const getPriorityLabel = (level) => {
  const levelMap = {
    1: '普級',
    2: '中級',
    3: '高級'
  }
  return levelMap[level] || '-'
}

// 狀態變更處理
const onStatusChange = () => {
  console.log('狀態變更:', formData.repairStatusId)
}

// 儲存處理記錄
const saveRecord = async () => {
  if (!isFormValid.value) {
    alert('請填寫完整的處理資訊')
    return
  }
  
  try {
    isSaving.value = true
    console.log(formData);
    
    const submitData = {
      repairId: formData.repairId,
      repairStatusId: formData.repairStatusId,
      content: formData.content,
      fileIds: formData.fileIds
    }
    console.log('提交處理記錄:', submitData)
    surveyStore.fetchSurveys();
    const result = await backendRepairStore.createRepairWork(submitData)
    
    if(result.success) {
      console.log('處理記錄儲存成功:', result.data)
      alert('處理記錄儲存成功！')
      router.go(-1) // 返回上一頁
    } else {
      throw new Error(result.message || '儲存失敗')
    }
    
  } catch (error) {
    console.error('儲存失敗:', error)
    alert(`儲存失敗：${error.message || '請稍後重試'}`)
  } finally {
    isSaving.value = false
  }
}

const cancel = () => {
  router.go(-1)
}

// 下載檔案
const downloadFile = async (file) => {
  console.log(file);
  
  try {
    if(!file.file_id){
      file.file_id = file.id // 確保有 file_id
    }
    const response = await backendRepairStore.downloadFile(file.file_id);

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
  try {
    const response = await backendRepairStore.viewFile(fileId)
    return response
  } catch (error) {
    console.error('獲取檔案內容失敗:', error)
    throw error
  }
}

// 檔案預覽事件處理
const onFileDownloaded = (file) => {
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
  await fetchCaseDetail()
  await backendRepairStore.fetchStatuses(caseId.value);
  statusOptions.value = backendRepairStore.statuses.data
  console.log(statusOptions.value);
})
</script>

<template>
  <div class="handle-case-page">
    <div class="handle-container">
      <!-- Loading 狀態 -->
      <div v-if="isLoading" class="loading-container">
        <div class="loading-spinner">⟳</div>
        <div class="loading-text">載入中...</div>
      </div>

      <!-- 主要內容 -->
      <div v-else-if="caseDetail" class="handle-content">
        <!-- 標題區域 -->
        <div class="handle-header">
          <div class="header-content">
            <div class="header-left">
              <h2 class="page-title">案件處理</h2>
              <span class="case-number">{{ caseDetail.case_no }}</span>
            </div>
            <div class="header-actions">
              <div class="header-status">
                <span class="status-badge" :class="getStatusClass(caseDetail.repair_status)">
                  {{ caseDetail.repair_status }}
                </span>
              </div>
              <button @click="cancel" class="back-btn-header">
                <span class="back-icon">←</span>
                <span class="back-text">返回</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 詳細內容 -->
        <div class="detail-content">
          <!-- 案件基本資訊 -->
          <div class="case-info-section">
            <h3 class="section-title">
              <span class="title-icon">📋</span>
              案件基本資訊
            </h3>
            
            <!-- 桌面版：雙欄佈局 -->
            <div class="info-grid desktop-layout">
              <!-- 左欄 -->
              <div class="info-column">
                <div class="info-group">
                  <label class="info-label">案件標題</label>
                  <div class="info-value">{{ caseDetail.title }}</div>
                </div>

                <div class="info-group">
                  <label class="info-label">故障類別</label>
                  <div class="info-value">{{ caseDetail.repair_category }}</div>
                </div>

                <div class="info-group">
                  <label class="info-label">故障原因</label>
                  <div class="info-value">{{ caseDetail.repair_reason }}</div>
                </div>

                <div class="info-group" v-if="caseDetail.repair_category === '硬體' || caseDetail.repair_category === '軟體'">
                  <label class="info-label">{{ caseDetail.repair_category === '軟體' ? '功能項目' : '設備項目' }}</label>
                  <div class="info-value">{{ caseDetail.repair_item || '無' }}</div>
                </div>
              </div>

              <!-- 右欄 -->
              <div class="info-column">
                <div class="info-group">
                  <label class="info-label">報修人員</label>
                  <div class="info-value">{{ caseDetail.repair_name || '無資料' }}</div>
                </div>

                <div class="info-group">
                  <label class="info-label">報修時間</label>
                  <div class="info-value">{{ formatDateTime(caseDetail.repair_time) }}</div>
                </div>

                <div class="info-group">
                  <label class="info-label">填單時間</label>
                  <div class="info-value">{{ formatDateTime(caseDetail.created_at) }}</div>
                </div>

                <div class="info-group" v-if="caseDetail.repair_category === '硬體' || caseDetail.repair_category === '軟體'">
                  <label class="info-label">設備位置</label>
                  <div class="info-value">{{ caseDetail.device_location || '無' }}</div>
                </div>
              </div>
            </div>

            <!-- 手機版：單欄佈局 -->
            <div class="info-grid mobile-layout">
              <div class="info-column">
                <div class="info-group">
                  <label class="info-label">案件標題</label>
                  <div class="info-value">{{ caseDetail.title }}</div>
                </div>

                <div class="info-group">
                  <label class="info-label">報修人員</label>
                  <div class="info-value">{{ caseDetail.repair_name || '無資料' }}</div>
                </div>

                <div class="info-group">
                  <label class="info-label">故障類別</label>
                  <div class="info-value">{{ caseDetail.repair_category }}</div>
                </div>

                <div class="info-group">
                  <label class="info-label">故障原因</label>
                  <div class="info-value">{{ caseDetail.repair_reason }}</div>
                </div>

                <div class="info-group" v-if="caseDetail.repair_category === '硬體' || caseDetail.repair_category === '軟體'">
                  <label class="info-label">{{ caseDetail.repair_category === '軟體' ? '功能項目' : '設備項目' }}</label>
                  <div class="info-value">{{ caseDetail.repair_item || '無' }}</div>
                </div>

                <div class="info-group" v-if="caseDetail.repair_category === '硬體' || caseDetail.repair_category === '軟體'">
                  <label class="info-label">設備位置</label>
                  <div class="info-value">{{ caseDetail.device_location || '無' }}</div>
                </div>

                <div class="info-group">
                  <label class="info-label">報修時間</label>
                  <div class="info-value">{{ caseDetail.repair_time }}</div>
                </div>

                <div class="info-group">
                  <label class="info-label">填單時間</label>
                  <div class="info-value">{{ caseDetail.created_at }}</div>
                </div>
              </div>
            </div>
            
            <!-- 問題描述 -->
            <div class="description-section">
              <label class="info-label">問題描述</label>
              <div class="description-content">
                {{ caseDetail.depiction }}
              </div>
            </div>
          </div>

          

          <!-- 處理資訊表單 -->
          <div class="handle-form-section">
            <h3 class="section-title">
              <span class="title-icon">✏️</span>
              處理資訊
            </h3>
            
            <!-- 處理狀態選擇 -->
            <div class="form-group">
              <label class="form-label required">處理狀態</label>
              <select v-model="formData.repairStatusId" class="form-select" @change="onStatusChange">
                <option value="">選擇案件處理狀態</option>
                <option 
                  v-for="status in statusOptions" 
                  :key="status.id" 
                  :value="status.id"
                >
                  {{ status.name }}
                </option>
              </select>
            </div>

            <!-- 處理描述 -->
            <div class="form-group">
              <label class="form-label required">處理描述</label>
              <textarea 
                v-model="formData.content"
                class="form-textarea"
                rows="6"
                placeholder="請描述處理過程、解決方案或目前進度..."
                :maxlength="500"
              ></textarea>
              <div class="char-count">
                {{ formData.content.length }}/500
              </div>
            </div>
          </div>

          <!-- 檔案上傳區域 -->
          <div class="file-upload-section">
            <h3 class="section-title">
              <span class="title-icon">📎</span>
              相關檔案
            </h3>
            
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
                <span class="upload-main-text">將檔案拖拉至此或點選上傳檔案</span>
                <span class="upload-sub-text">上傳檔案會立即儲存至伺服器，檔案大小限制100MB</span>
              </div>
              <button type="button" class="upload-btn">
                <span class="btn-icon">📁</span>
                <span class="btn-text">點選上傳檔案</span>
              </button>
              <input 
                ref="fileInput"
                type="file" 
                multiple 
                @change="handleFileSelect"
                style="display: none"
              >
            </div>

            <!-- 檔案列表 -->
            <div v-if="hasFiles" class="file-list">
              <!-- 原有檔案 -->
              <div v-if="existingFiles.length > 0" class="file-section">
                <h4 class="file-section-title">
                  <span class="section-icon">📄</span>
                  原有檔案
                </h4>
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
                      @click="openFilePreview(file)"
                      class="action-btn preview-btn"
                      title="預覽"
                    >
                      <span class="btn-icon">👁</span>
                    </button>
                    <button 
                      type="button"
                      @click="downloadFile(file)"
                      class="action-btn download-btn"
                      title="下載"
                    >
                      <span class="btn-icon">⬇</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- 新上傳的檔案 -->
              <div v-if="uploadedFiles.length > 0" class="file-section">
                <h4 class="file-section-title">
                  <span class="section-icon">📤</span>
                  新上傳檔案
                </h4>
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
                    <span class="uploaded-badge">已上傳</span>
                  </div>
                  <button 
                    type="button"
                    @click.stop="removeFile(file)"
                    class="remove-btn"
                    title="移除檔案"
                  >
                    <span class="remove-icon">✕</span>
                  </button>
                </div>
              </div>

              <!-- 上傳中的檔案 -->
              <div v-if="selectedFiles.length > 0" class="file-section">
                <h4 class="file-section-title">
                  <span class="section-icon">⏳</span>
                  上傳中
                </h4>
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
                    <span v-if="file.uploading" class="uploading-badge">上傳中...</span>
                    <span v-else-if="file.uploaded" class="uploaded-badge">已上傳</span>
                  </div>
                  <button 
                    type="button"
                    @click.stop="removeSelectedFile(file)"
                    class="remove-btn"
                    :disabled="file.uploading"
                    title="取消上傳"
                  >
                    <span class="remove-icon">✕</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 承辦資訊區塊 -->
          <div class="handler-section">
            <h3 class="section-title">
              <span class="title-icon">👤</span>
              承辦資訊
            </h3>
            
            <div class="handler-content">
              <!-- 優先級資訊 - 響應式佈局 -->
              <div class="priority-grid">
                <!-- 重要程度 -->
                <div class="priority-item">
                  <div class="priority-icon">📌</div>
                  <div class="priority-info">
                    <span class="priority-label">重要程度</span>
                    <span :class="[caseDetail.importance_level ? 'priority-badge' : '', getPriorityClass(caseDetail.importance_level)]">
                      {{ getPriorityLabel(caseDetail.importance_level) }}
                    </span>
                  </div>
                </div>

                <!-- 緊急程度 -->
                <div class="priority-item">
                  <div class="priority-icon">⚠️</div>
                  <div class="priority-info">
                    <span class="priority-label">緊急程度</span>
                    <span :class="[caseDetail.emergency_level ? 'priority-badge' : '', getPriorityClass(caseDetail.emergency_level)]">
                      {{ getPriorityLabel(caseDetail.emergency_level) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- 承辦資訊 -->
              <div class="completion-time">
                <div class="completion-icon">📅</div>
                <div class="completion-info">
                  <span class="completion-label">預計完成時間</span>
                  <span class="completion-value">{{ formatDateTime(caseDetail.estimated_completion_time) || '-' }}</span>
                </div>
              </div>

              <div class="completion-time">
                <div class="completion-icon">👤</div>
                <div class="completion-info">
                  <span class="completion-label">承辦人員</span>
                  <span class="completion-value">{{ caseDetail.repair_status == '尚未承辦' ? '-' : (caseDetail.assign_user_name || '-') }}</span>
                </div>
              </div>
            </div>
          </div>
          <!-- 操作按鈕 -->
          <div class="action-buttons">
            <button 
              type="button"
              @click="saveRecord" 
              class="save-btn"
              :disabled="!canSubmit"
            >
              <span class="btn-icon">💾</span>
              <span class="btn-text">
                <span v-if="isSaving">儲存中...</span>
                <span v-else-if="hasUploadingFiles">檔案上傳中...</span>
                <span v-else>儲存處理記錄</span>
              </span>
            </button>
            
            <button 
              type="button"
              @click="cancel" 
              class="cancel-btn desktop-only"
              :disabled="isSaving"
            >
              <span class="btn-icon">❌</span>
              <span class="btn-text">取消</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 錯誤狀態 -->
      <div v-else class="error-container">
        <div class="error-icon">❌</div>
        <div class="error-message">找不到案件資料</div>
        <button @click="cancel" class="back-btn">
          <span class="btn-icon">←</span>
          <span class="btn-text">返回</span>
        </button>
      </div>
    </div>
    
    <!-- 檔案預覽組件 -->
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
/* ===== 案件處理頁面完整響應式CSS ===== */
.handle-case-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20px;
}

.handle-container {
  max-width: 1000px;
  margin: 0 auto;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* ===== Loading 樣式 ===== */
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

/* ===== 標題區域 ===== */
.handle-header {
  background: #6c5ce7;
  color: white;
  padding: 25px 30px;

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 15px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 20px;
    flex: 1;
    min-width: 0;
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
    white-space: nowrap;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .header-status {
    .status-badge {
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
      background: rgba(255, 255, 255, 0.2);
    }
  }

  .back-btn-header {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: none;
    padding: 10px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    gap: 6px;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-1px);
    }

    .back-icon {
      font-size: 16px;
    }
  }
}

/* ===== 詳細內容 ===== */
.detail-content {
  padding: 30px;
}

/* ===== 響應式佈局控制 ===== */
.desktop-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
}

.mobile-layout {
  display: none;
}

.desktop-only {
  display: inline-flex;
}

/* ===== 區塊標題 ===== */
.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
  padding-bottom: 8px;
  border-bottom: 2px solid #6c5ce7;
  display: flex;
  align-items: center;
  gap: 8px;

  .title-icon {
    font-size: 18px;
  }
}

/* ===== 案件資訊區域 ===== */
.case-info-section {
  margin-bottom: 40px;

  .info-column {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .info-group {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .info-label {
      font-size: 14px;
      font-weight: 500;
      color: #555;
    }

    .info-value {
      font-size: 14px;
      color: #333;
      padding: 12px 15px;
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      min-height: 20px;
      word-break: break-word;
    }
  }

  .description-section {
    margin-top: 30px;

    .info-label {
      font-size: 14px;
      font-weight: 500;
      color: #555;
      margin-bottom: 8px;
      display: block;
    }

    .description-content {
      padding: 15px;
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      font-size: 14px;
      color: #333;
      line-height: 1.6;
      min-height: 80px;
      word-break: break-word;
    }
  }
}

/* ===== 承辦資訊區塊 ===== */
.handler-section {
  margin-bottom: 40px;
  background: #fafbfc;
  padding: 30px;
  border-radius: 8px;

  .handler-content {
    background: white;
    padding: 20px;
    border-radius: 8px;
    border: 1px solid #e9ecef;
  }

  /* 優先級網格佈局 */
  .priority-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-bottom: 20px;
  }

  .priority-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 6px;
    border: 1px solid #e9ecef;

    .priority-icon {
      font-size: 20px;
      width: 24px;
      text-align: center;
      flex-shrink: 0;
    }

    .priority-info {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
    }

    .priority-label {
      font-size: 13px;
      color: #666;
      font-weight: 500;
    }
  }

  /* 承辦資訊 */
  .completion-time {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 15px;
    margin-bottom: 15px;
    background: #f8f9fa;
    border-radius: 6px;
    border: 1px solid #e9ecef;

    &:last-child {
      margin-bottom: 0;
    }

    .completion-icon {
      font-size: 20px;
      flex-shrink: 0;
    }

    .completion-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }

    .completion-label {
      font-size: 13px;
      color: #666;
      font-weight: 500;
    }

    .completion-value {
      font-size: 14px;
      color: #333;
      font-weight: 500;
      font-family: 'Courier New', monospace;
    }
  }
}

/* ===== 優先級標籤樣式 ===== */
.priority-badge {
  padding: 6px 14px;
  border-radius: 14px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
    transition: left 0.5s ease;
  }

  &:hover::before {
    left: 100%;
  }
}

.priority-normal {
  background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
  color: #155724;
  border: 1px solid #c3e6cb;
  box-shadow: 0 2px 4px rgba(21, 87, 36, 0.1);

  &:hover {
    background: linear-gradient(135deg, #c3e6cb 0%, #b8dcc8 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(21, 87, 36, 0.15);
  }
}

.priority-medium {
  background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
  color: #856404;
  border: 1px solid #ffeaa7;
  box-shadow: 0 2px 4px rgba(133, 100, 4, 0.1);

  &:hover {
    background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(133, 100, 4, 0.15);
  }
}

.priority-urgent {
  background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
  color: #721c24;
  border: 1px solid #f5c6cb;
  box-shadow: 0 2px 4px rgba(114, 28, 36, 0.1);
  animation: pulse 2s infinite;

  &:hover {
    background: linear-gradient(135deg, #f5c6cb 0%, #f1b0b7 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(114, 28, 36, 0.15);
  }
}

@keyframes pulse {
  0% { box-shadow: 0 2px 4px rgba(114, 28, 36, 0.1); }
  50% { box-shadow: 0 4px 12px rgba(114, 28, 36, 0.2); }
  100% { box-shadow: 0 2px 4px rgba(114, 28, 36, 0.1); }
}

/* ===== 狀態標籤 ===== */
.status-badge {
  &.status-pending {
    background: #fff3cd;
    color: #856404;
  }

  &.status-processing {
    background: #d1ecf1;
    color: #0c5460;
  }

  &.status-completed {
    background: #d4edda;
    color: #155724;
  }

  &.status-default {
    background: #e2e3e5;
    color: #383d41;
  }
}

/* ===== 處理表單區域 ===== */
.handle-form-section {
  margin-bottom: 40px;

  .form-group {
    margin-bottom: 20px;

    .form-label {
      font-size: 14px;
      font-weight: 500;
      color: #555;
      margin-bottom: 8px;
      display: block;

      &.required::after {
        content: ' *';
        color: #e74c3c;
      }
    }

    .form-select,
    .form-textarea {
      width: 100%;
      padding: 12px 15px;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.3s;

      &:focus {
        outline: none;
        border-color: #6c5ce7;
        box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
      }
    }

    .form-select {
      background: white;
      cursor: pointer;
      appearance: none;
      background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
      background-position: right 8px center;
      background-repeat: no-repeat;
      background-size: 16px;
      padding-right: 40px;
    }

    .form-textarea {
      resize: vertical;
      min-height: 120px;
      font-family: inherit;
      line-height: 1.5;
    }

    .char-count {
      text-align: right;
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }
  }
}

/* ===== 檔案上傳區域 ===== */
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
      background: #f0f4ff;
    }

    .upload-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.6;
    }

    .upload-text {
      margin-bottom: 20px;
      line-height: 1.5;

      .upload-main-text {
        display: block;
        font-size: 16px;
        color: #333;
        font-weight: 500;
        margin-bottom: 8px;
      }

      .upload-sub-text {
        display: block;
        font-size: 14px;
        color: #666;
      }
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
      transition: all 0.3s;
      display: inline-flex;
      align-items: center;
      gap: 8px;

      &:hover {
        background: #5b4bcf;
        transform: translateY(-1px);
      }

      .btn-icon {
        font-size: 16px;
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
    display: flex;
    align-items: center;
    gap: 8px;

    .section-icon {
      font-size: 16px;
    }
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

    &:last-child {
      margin-bottom: 0;
    }

    &:hover {
      background: #e9ecef;
      border-color: #6c5ce7;
      transform: translateY(-1px);
    }

    &.uploading {
      border-color: #ffc107;
      background: #fff9e6;
    }

    &.uploaded {
      border-color: #6c5ce7;
      background: #f0f4ff;
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
      min-width: 0;

      .file-icon {
        font-size: 24px;
        flex-shrink: 0;
      }

      .file-details {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;

        .file-name {
          font-size: 14px;
          color: #333;
          font-weight: 500;
          word-break: break-word;
        }

        .file-size {
          font-size: 12px;
          color: #666;
        }
      }
    }

    .file-status {
      margin-right: 15px;
      flex-shrink: 0;

      .uploading-badge {
        font-size: 12px;
        color: #856404;
        background: #fff3cd;
        padding: 4px 8px;
        border-radius: 12px;
        font-weight: 500;
      }

      .uploaded-badge {
        font-size: 12px;
        color: #155724;
        background: #d4edda;
        padding: 4px 8px;
        border-radius: 12px;
        font-weight: 500;
      }
    }

    .file-actions {
      display: flex;
      gap: 8px;
      margin-right: 8px;
      flex-shrink: 0;
    }

    .action-btn {
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;

      .btn-icon {
        font-size: 14px;
      }

      &:hover {
        transform: scale(1.05);
      }

      &.download-btn {
        background: #6c5ce7;
        color: white;

        &:hover {
          background: #5b4bcf;
        }
      }

      &.preview-btn {
        background: #00b894;
        color: white;

        &:hover {
          background: #00a085;
        }
      }
    }

    .remove-btn {
      background: #e74c3c;
      color: white;
      border: none;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      .remove-icon {
        font-size: 12px;
      }

      &:hover:not(:disabled) {
        background: #c0392b;
        transform: scale(1.05);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
}

/* ===== 操作按鈕 ===== */
.action-buttons {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;

  .save-btn,
  .cancel-btn {
    border: none;
    padding: 12px 24px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    gap: 8px;

    .btn-icon {
      font-size: 16px;
    }

    &:hover:not(:disabled) {
      transform: translateY(-1px);
    }
  }

  .save-btn {
    background: #6c5ce7;
    color: white;

    &:hover:not(:disabled) {
      background: #5b4bcf;
      box-shadow: 0 4px 12px rgba(108, 92, 231, 0.3);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      background: #6c757d;
      transform: none;
    }
  }

  .cancel-btn {
    background: white;
    color: #666;
    border: 1px solid #ddd;

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

/* ===== 錯誤狀態 ===== */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: #666;
  text-align: center;

  .error-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }

  .error-message {
    font-size: 18px;
    margin-bottom: 20px;
  }

  .back-btn {
    background: #6c5ce7;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    gap: 8px;

    &:hover {
      background: #5b4bcf;
      transform: translateY(-1px);
    }
  }
}

/* ===== 響應式設計 ===== */

/* 大螢幕 (1400px+) */
@media (min-width: 1400px) {
  .handle-case-page {
    padding: 24px;
  }

  .handle-header {
    padding: 30px;
  }

  .detail-content {
    padding: 35px;
  }

  .handler-section {
    padding: 35px;
  }

  .upload-area {
    padding: 50px 30px;
  }
}

/* 平板橫向 (992px - 1399px) */
@media (max-width: 1399px) and (min-width: 992px) {
  .desktop-layout {
    gap: 30px;
  }

  .info-group {
    gap: 6px;

    .info-label {
      font-size: 13px;
    }

    .info-value {
      font-size: 13px;
      padding: 10px 12px;
    }
  }

  .handler-section {
    .priority-grid {
      gap: 12px;
    }

    .priority-item {
      padding: 12px;
    }
  }
}

/* 平板直向 (768px - 991px) */
@media (max-width: 991px) and (min-width: 768px) {
  .handle-case-page {
    padding: 16px;
  }

  .handle-header {
    padding: 20px;

    .header-content {
      flex-direction: column;
      align-items: stretch;
    }

    .header-left {
      justify-content: center;
    }

    .header-actions {
      justify-content: center;
      flex-direction: row-reverse;
    }
  }

  .detail-content {
    padding: 25px;
  }

  .desktop-layout {
    gap: 25px;
  }

  .handler-section {
    padding: 25px;

    .priority-grid {
      gap: 10px;
    }

    .priority-item {
      padding: 12px;
    }
  }

  .action-buttons {
    flex-direction: column;

    .save-btn,
    .cancel-btn {
      width: 100%;
      justify-content: center;
    }
  }

  .upload-area {
    padding: 35px 20px;

    .upload-icon {
      font-size: 40px;
    }
  }
}

/* 大手機 (576px - 767px) */
@media (max-width: 767px) {
  .handle-case-page {
    padding: 12px;
  }

  /* 切換佈局顯示 */
  .desktop-layout {
    display: none;
  }

  .mobile-layout {
    display: block;
  }

  .desktop-only {
    display: none;
  }

  .handle-header {
    padding: 16px;

    .page-title {
      font-size: 18px;
    }

    .case-number {
      font-size: 14px;
      padding: 6px 12px;
    }

    .back-btn-header {
      padding: 8px 12px;
      font-size: 13px;

      .back-text {
        display: none;
      }
    }

    .header-status .status-badge {
      padding: 6px 12px;
      font-size: 12px;
    }
  }

  .detail-content {
    padding: 20px;
  }

  .info-group {
    gap: 6px;

    .info-label {
      font-size: 13px;
    }

    .info-value {
      font-size: 13px;
      padding: 10px 12px;
    }
  }

  .description-section {
    margin-top: 20px;

    .description-content {
      padding: 12px;
      font-size: 13px;
    }
  }

  .handler-section {
    padding: 20px;
    margin-bottom: 30px;

    .section-title {
      font-size: 15px;
    }

    .handler-content {
      padding: 16px;
    }

    .priority-grid {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .priority-item {
      padding: 12px;

      .priority-info {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
      }

      .priority-label {
        font-size: 12px;
      }
    }

    .completion-time {
      padding: 12px;

      .completion-info {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
      }

      .completion-label,
      .completion-value {
        font-size: 12px;
      }
    }
  }

  .form-group {
    .form-label {
      font-size: 13px;
    }

    .form-select,
    .form-textarea {
      font-size: 13px;
      padding: 10px 12px;
    }

    .form-textarea {
      min-height: 100px;
    }
  }

  .upload-area {
    padding: 30px 15px;

    .upload-icon {
      font-size: 36px;
    }

    .upload-text {
      .upload-main-text {
        font-size: 14px;
      }

      .upload-sub-text {
        font-size: 12px;
      }
    }

    .upload-btn {
      padding: 10px 20px;
      font-size: 13px;
    }
  }

  .file-item {
    padding: 12px;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;

    .file-info {
      .file-icon {
        font-size: 20px;
      }

      .file-details {
        .file-name {
          font-size: 13px;
        }

        .file-size {
          font-size: 11px;
        }
      }
    }

    .file-actions {
      justify-content: center;
      margin-right: 0;
      gap: 10px;

      .action-btn {
        flex: 1;
        height: 36px;
      }
    }

    .remove-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 24px;
      height: 24px;
    }
  }

  .action-buttons {
    flex-direction: column;
    gap: 10px;

    .save-btn {
      width: 100%;
      justify-content: center;
      padding: 14px;
    }
  }
}

/* 小手機 (480px 以下) */
@media (max-width: 479px) {
  .handle-case-page {
    padding: 8px;
  }

  .handle-header {
    padding: 12px;

    .header-content {
      gap: 10px;
    }

    .header-left {
      gap: 12px;
      flex-direction: column;
      align-items: center;
    }

    .page-title {
      font-size: 16px;
    }

    .case-number {
      font-size: 12px;
      padding: 4px 8px;
    }

    .back-btn-header {
      padding: 6px 10px;
      font-size: 12px;

      .back-icon {
        font-size: 14px;
      }
    }
  }

  .detail-content {
    padding: 16px;
  }

  .info-group {
    gap: 4px;

    .info-label {
      font-size: 12px;
    }

    .info-value {
      font-size: 12px;
      padding: 8px 10px;
    }
  }

  .description-section {
    .description-content {
      padding: 10px;
      font-size: 12px;
      min-height: 60px;
    }
  }

  .handler-section {
    padding: 16px;

    .section-title {
      font-size: 14px;

      .title-icon {
        font-size: 16px;
      }
    }

    .handler-content {
      padding: 12px;
    }

    .priority-item {
      padding: 10px;

      .priority-icon {
        font-size: 18px;
      }

      .priority-label {
        font-size: 11px;
      }
    }

    .priority-badge {
      font-size: 10px;
      padding: 3px 8px;
    }

    .completion-time {
      padding: 10px;

      .completion-icon {
        font-size: 18px;
      }

      .completion-label,
      .completion-value {
        font-size: 11px;
      }
    }
  }

  .form-group {
    .form-label {
      font-size: 12px;
    }

    .form-select,
    .form-textarea {
      font-size: 12px;
      padding: 8px 10px;
    }

    .char-count {
      font-size: 11px;
    }
  }

  .upload-area {
    padding: 25px 12px;

    .upload-icon {
      font-size: 32px;
    }

    .upload-text {
      .upload-main-text {
        font-size: 13px;
      }

      .upload-sub-text {
        font-size: 11px;
      }
    }

    .upload-btn {
      padding: 8px 16px;
      font-size: 12px;

      .btn-icon {
        font-size: 14px;
      }
    }
  }

  .file-section-title {
    font-size: 12px;
    padding: 6px 10px;

    .section-icon {
      font-size: 14px;
    }
  }

  .file-item {
    padding: 10px;

    .file-info {
      .file-icon {
        font-size: 18px;
      }

      .file-details {
        .file-name {
          font-size: 12px;
        }

        .file-size {
          font-size: 10px;
        }
      }
    }

    .file-status {
      .uploading-badge,
      .uploaded-badge {
        font-size: 10px;
        padding: 2px 6px;
      }
    }

    .action-btn {
      width: 28px;
      height: 28px;

      .btn-icon {
        font-size: 12px;
      }
    }

    .remove-btn {
      width: 20px;
      height: 20px;

      .remove-icon {
        font-size: 10px;
      }
    }
  }

  .action-buttons {
    .save-btn {
      padding: 12px;
      font-size: 13px;

      .btn-icon {
        font-size: 14px;
      }
    }
  }

  .error-container {
    padding: 60px 16px;

    .error-icon {
      font-size: 36px;
    }

    .error-message {
      font-size: 16px;
    }

    .back-btn {
      padding: 10px 20px;
      font-size: 13px;
    }
  }
}

/* 超小螢幕 (360px 以下) */
@media (max-width: 359px) {
  .handle-case-page {
    padding: 4px;
  }

  .handle-header {
    padding: 8px;

    .header-left {
      gap: 8px;
    }

    .page-title {
      font-size: 14px;
    }

    .case-number {
      font-size: 10px;
      padding: 2px 6px;
    }
  }

  .detail-content {
    padding: 12px;
  }

  .info-group {
    .info-label {
      font-size: 11px;
    }

    .info-value {
      font-size: 11px;
      padding: 6px 8px;
    }
  }

  .handler-section {
    padding: 12px;

    .section-title {
      font-size: 13px;
    }

    .priority-item {
      padding: 8px;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;

      .priority-info {
        width: 100%;
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }
    }

    .completion-time {
      padding: 8px;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;

      .completion-info {
        width: 100%;
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }
    }
  }

  .upload-area {
    padding: 20px 8px;

    .upload-text {
      .upload-main-text {
        font-size: 12px;
      }

      .upload-sub-text {
        font-size: 10px;
      }
    }

    .upload-btn {
      padding: 6px 12px;
      font-size: 11px;
    }
  }

  .action-buttons {
    .save-btn {
      padding: 10px;
      font-size: 12px;
    }
  }
}

/* 觸控裝置優化 */
@media (hover: none) {
  .file-item:hover,
  .action-btn:hover,
  .upload-btn:hover,
  .save-btn:hover:not(:disabled),
  .cancel-btn:hover:not(:disabled) {
    transform: none;
  }
}

/* 高 DPI 螢幕優化 */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .file-icon,
  .priority-icon,
  .upload-icon {
    image-rendering: -webkit-optimize-contrast;
  }
}

/* 列印樣式 */
@media print {
  .handle-case-page {
    background: white;
    padding: 0;
  }

  .handle-header {
    background: #f8f9fa !important;
    color: #333 !important;
    border-bottom: 2px solid #dee2e6;
  }

  .back-btn-header,
  .action-buttons,
  .file-actions,
  .upload-area {
    display: none !important;
  }

  .file-item .remove-btn {
    display: none !important;
  }
}

/* 橫向螢幕優化 */
@media (orientation: landscape) and (max-height: 500px) {
  .upload-area {
    padding: 20px 15px;

    .upload-icon {
      font-size: 32px;
      margin-bottom: 8px;
    }

    .upload-text {
      margin-bottom: 12px;
    }
  }
}
</style>
<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBackendRepairStore } from '@/stores/backend.repair'
import FilePreviewModal from '@/components/FilePreviewModal.vue'

const route = useRoute()
const router = useRouter()

const backendRepairStore = useBackendRepairStore()
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

// 表單驗證
const isFormValid = computed(() => {
  return formData.repairStatusId && formData.content.trim().length > 0
})

// 獲取案件詳細資料
const fetchCaseDetail = async () => {
  try {
    isLoading.value = true
    // 模擬 API 調用 - 實際使用時替換為真實 API
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

// 上傳檔案到伺服器 (使用圖三的API)
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
      // 模擬刪除 API 調用
      // await fetch(`/api/backend/repair/record/file/${fileObj.id}`, {
      //   method: 'DELETE'
      // })
      
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
    3: '緊急'
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
    
    const submitData = {
      repairId: formData.repairId,
      repairStatusId: formData.repairStatusId,
      content: formData.content,
      fileIds: formData.fileIds
    }
    
    console.log('提交處理記錄:', submitData)

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
          <div class="header-left">
            <h2 class="page-title">案件處理</h2>
            <span class="case-number">{{ caseDetail.id }}</span>
          </div>
          <div class="header-status">
            <span class="status-badge" :class="getStatusClass(caseDetail.repair_status)">
              {{ caseDetail.repair_status }}
            </span>
          </div>
        </div>

        <!-- 案件基本資訊 -->
        <div class="case-info-section">
          <h3 class="section-title">案件基本資訊</h3>
          <div class="info-grid">
            <div class="info-item">
              <label class="info-label">案件標題</label>
              <div class="info-value">{{ caseDetail.title }}</div>
            </div>
            <div class="info-item">
              <label class="info-label">報修人員</label>
              <div class="info-value">{{ caseDetail.repair_name }}</div>
            </div>
            <div class="info-item">
              <label class="info-label">故障類別</label>
              <div class="info-value">{{ caseDetail.repair_category }}</div>
            </div>
            <div class="info-item">
              <label class="info-label">故障原因</label>
              <div class="info-value">{{ caseDetail.repair_reason }}</div>
            </div>
            <div class="info-item">
              <label class="info-label">重要程度</label>
              <div class="info-value">
                <span class="priority-badge" :class="getPriorityClass(caseDetail.importance_level)">
                  {{ getPriorityLabel(caseDetail.importance_level) }}
                </span>
              </div>
            </div>
            <div class="info-item">
              <label class="info-label">緊急程度</label>
              <div class="info-value">
                <span class="priority-badge" :class="getPriorityClass(caseDetail.emergency_level)">
                  {{ getPriorityLabel(caseDetail.emergency_level) }}
                </span>
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
          <h3 class="section-title">處理資訊</h3>
          
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
            <label class="form-label required">問題描述</label>
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
          <div v-if="hasFiles" class="file-list">
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
                    @click="downloadFile(file)"
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
                </div>
              </div>
            </div>

            <!-- 新上傳的檔案 -->
            <div v-if="uploadedFiles.length > 0" class="file-section">
              <h4 class="file-section-title">新上傳檔案</h4>
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
                <button 
                  type="button"
                  @click.stop="removeFile(file)"
                  class="remove-btn"
                >
                  ✕
                </button>
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
                </div>
                <button 
                  type="button"
                  @click.stop="removeSelectedFile(file)"
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
            @click="saveRecord" 
            class="save-btn"
            :disabled="isSaving || !isFormValid"
          >
            <span v-if="isSaving">儲存中...</span>
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

      <!-- 錯誤狀態 -->
      <div v-else class="error-container">
        <div class="error-message">找不到案件資料</div>
        <button @click="cancel" class="back-btn">返回</button>
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
.handle-header {
  background: #28a745;
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

  .header-status {
    .status-badge {
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
      background: rgba(255, 255, 255, 0.2);
    }
  }
}

// 內容區域
.handle-content {
  padding: 30px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
  padding-bottom: 8px;
  border-bottom: 2px solid #28a745;
}

// 案件資訊區域
.case-info-section {
  margin-bottom: 40px;

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 20px;
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

  .description-section {
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
    }
  }
}

// 優先級標籤
.priority-badge {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  
  &.priority-normal {
    background: #d4edda;
    color: #155724;
  }
  
  &.priority-medium {
    background: #fff3cd;
    color: #856404;
  }
  
  &.priority-urgent {
    background: #f8d7da;
    color: #721c24;
  }
}

// 狀態標籤
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

// 處理表單區域
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
        border-color: #28a745;
      }
    }

    .form-select {
      background: white;
      cursor: pointer;
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
      border-color: #28a745;
      background: #f0fff4;
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
      background: #28a745;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.3s;

      &:hover {
        background: #218838;
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
    border-left: 4px solid #28a745;
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
    background: #28a745;
    color: white;
    border: none;
    padding: 12px 30px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;

    &:hover:not(:disabled) {
      background: #218838;
      transform: translateY(-1px);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      background: #6c757d;
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
      border-color: #28a745;
      color: #28a745;
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
    background: #28a745;
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      background: #218838;
    }
  }
}

// 響應式設計
@media (max-width: 768px) {
  .handle-case-page {
    padding: 10px;
  }

  .handle-header {
    padding: 20px;
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .handle-content {
    padding: 20px;
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

  .upload-area {
    padding: 30px 15px;

    .upload-icon {
      font-size: 36px;
    }
  }

  .file-item {
    padding: 12px;

    .file-info .file-icon {
      font-size: 20px;
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
    .file-info .file-icon {
      font-size: 18px;
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

  .section-title {
    font-size: 14px;
  }

  .form-label {
    font-size: 13px;
  }

  .form-select,
  .form-textarea {
    font-size: 13px;
    padding: 10px 12px;
  }
}
</style>
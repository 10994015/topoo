<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useRepairStore } from '@/stores/repair'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const repairStore = useRepairStore()
const authStore = useAuthStore()

// 文件限制配置
const FILE_LIMITS = {
  maxSize: 100 * 1024 * 1024, // 100MB
  maxFiles: 5,
  allowedTypes: {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-powerpoint': ['.ppt'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    'application/pdf': ['.pdf'],
    'video/mp4': ['.mp4']
  }
}

// 表單資料
const repairForm = reactive({
  repairNumber: '',
  title: '',
  deviceLocation: '',
  repairCategoryId: '',
  repairReasonId: '',
  repairTime: '',
  repairItem: '',
  depiction: ''
})

// 檔案上傳
const fileInput = ref(null)
const uploadedFiles = ref([])
const isUploading = ref(false)
const deletingFileId = ref(null) // 記錄正在刪除的檔案 ID

// 表單驗證錯誤
const errors = reactive({
  title: '',
  repairCategoryId: '',
  repairReasonId: '',
  repairTime: ''
})

// 提交狀態
const isSubmitting = ref(false)

// 枚舉資料
const categories = ref([])
const reasons = ref([])

// 是否為軟硬體
const isHardwareOrSoftware = ref({
  value: false,
  type: '',
})
// 當前用戶資訊
const currentUser = computed(() => authStore.user)

// 初始化報修時間為當前時間
const initializeDateTime = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  
  repairForm.repairTime = `${year}-${month}-${day}T${hours}:${minutes}`
}

// 檢查文件類型是否允許
const isFileTypeAllowed = (file) => {
  const fileType = file.type.toLowerCase()
  const fileName = file.name.toLowerCase()
  const fileExtension = '.' + fileName.split('.').pop()
  
  // 檢查 MIME 類型
  if (FILE_LIMITS.allowedTypes[fileType]) {
    return FILE_LIMITS.allowedTypes[fileType].includes(fileExtension)
  }
  
  // 如果 MIME 類型檢查失敗，檢查副檔名
  for (const [mimeType, extensions] of Object.entries(FILE_LIMITS.allowedTypes)) {
    if (extensions.includes(fileExtension)) {
      return true
    }
  }
  
  return false
}

// 觸發檔案選擇
const triggerFileInput = () => {
  fileInput.value?.click()
}

// 處理檔案上傳
const handleFileUpload = async (event) => {
  const files = Array.from(event.target.files)
  
  // 檢查文件數量限制
  if (uploadedFiles.value.length + files.length > FILE_LIMITS.maxFiles) {
    alert(`最多只能上傳 ${FILE_LIMITS.maxFiles} 個檔案！目前已有 ${uploadedFiles.value.length} 個檔案。`)
    event.target.value = ''
    return
  }
  
  // 檢查每個文件
  const invalidFiles = []
  const oversizedFiles = []
  const validFiles = []
  
  files.forEach(file => {
    if (!isFileTypeAllowed(file)) {
      invalidFiles.push(file.name)
    } else if (file.size > FILE_LIMITS.maxSize) {
      oversizedFiles.push(file.name)
    } else {
      validFiles.push(file)
    }
  })
  
  // 顯示錯誤訊息
  if (invalidFiles.length > 0) {
    alert(`以下檔案格式不支援：\n${invalidFiles.join('\n')}\n\n支援格式：\n圖片：JPG、PNG\n文件：DOC、DOCX、PPT、PPTX、PDF\n影片：MP4`)
  }
  
  if (oversizedFiles.length > 0) {
    alert(`以下檔案超過 100MB 限制：\n${oversizedFiles.join('\n')}`)
  }
  
  if (validFiles.length === 0) {
    event.target.value = ''
    return
  }
  
  isUploading.value = true
  
  try {
    for (const file of validFiles) {
      try {
        // 立即上傳檔案到後端
        const formData = new FormData()
        formData.append('file', file)
        
        console.log('開始上傳檔案:', file.name)
        
        // 呼叫 store 的上傳方法
        const result = await repairStore.saveRepairFiles(formData)
        
        console.log('上傳結果:', result)
        
        // 將檔案資訊加入列表（包含後端回傳的檔案 ID）
        const fileInfo = {
          id: result.data?.id || result.data, // 後端回傳的檔案 ID
          name: file.name,
          size: file.size,
          type: file.type,
          originalFile: file,
          uploadedAt: new Date().toISOString()
        }
        
        uploadedFiles.value.push(fileInfo)
        console.log('檔案上傳成功:', fileInfo)
        
      } catch (error) {
        console.error('檔案上傳失敗:', error)
        alert(`檔案 ${file.name} 上傳失敗：${error.message || '未知錯誤'}`)
      }
    }
  } finally {
    isUploading.value = false
    event.target.value = '' // 清空 input
  }
}

// 移除檔案
const removeFile = async (index) => {
  const fileToRemove = uploadedFiles.value[index]
  
  const fileId = fileToRemove.id[0].id // 直接取得 ID
  console.log(fileId);
  
  // 開始刪除 loading
  deletingFileId.value = fileId
  
  try {
    if (fileId) {
      console.log('正在刪除後端檔案:', fileId)
      await repairStore.removeRepairFile(fileId)
      console.log('刪除後端檔案成功:', fileId)
    }
    
    // 從列表中移除檔案
    uploadedFiles.value.splice(index, 1)
    
  } catch (error) {
    console.error('刪除後端檔案失敗:', error)
    if (!confirm('無法刪除後端檔案，是否仍要從列表中移除？')) {
      return
    }
    // 如果用戶確認，仍然從列表中移除
    uploadedFiles.value.splice(index, 1)
  } finally {
    // 清理 loading 狀態
    deletingFileId.value = null
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

// 取得檔案圖示樣式
const getFileIconClass = (fileName) => {
  const extension = fileName.split('.').pop()?.toLowerCase()
  const iconMap = {
    'pdf': 'file-pdf',
    'doc': 'file-word',
    'docx': 'file-word',
    'ppt': 'file-powerpoint',
    'pptx': 'file-powerpoint',
    'jpg': 'file-image',
    'jpeg': 'file-image',
    'png': 'file-image',
    'mp4': 'file-video'
  }
  return iconMap[extension] || 'file-default'
}

// 檢查檔案是否正在刪除中
const isDeleting = (file) => {
  const fileId = file.id?.[0]?.id || file.id
  console.log(fileId);
  
  return deletingFileId.value === fileId
}

// 表單驗證
const validateForm = () => {
  // 清空之前的錯誤
  Object.keys(errors).forEach(key => {
    errors[key] = ''
  })

  let isValid = true

  if (!repairForm.title.trim()) {
    errors.title = '請輸入案件標題'
    isValid = false
  }

  if (!repairForm.repairCategoryId) {
    errors.repairCategoryId = '請選擇故障類別'
    isValid = false
  }

  if (!repairForm.repairReasonId) {
    errors.repairReasonId = '請選擇故障原因'
    isValid = false
  }

  if (!repairForm.repairTime) {
    errors.repairTime = '請選擇報修時間'
    isValid = false
  }

  return isValid
}

// 提交表單
const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  isSubmitting.value = true
  
  try {
    console.log('原始表單資料:', repairForm)
    
    // 準備檔案 ID 陣列
    const fileIds = uploadedFiles.value
      .map(file => {
        if (file.id && Array.isArray(file.id) && file.id[0]?.id) {
          return file.id[0].id
        }
        // 或者直接是 id
        return file.id
      })
      .filter(id => id) // 過濾掉空值
    
    console.log('處理後的 fileIds:', fileIds)
    
    // 準備要提交的資料物件
    const submitData = {
      title: repairForm.title,
      repairCategoryId: repairForm.repairCategoryId,
      repairReasonId: repairForm.repairReasonId,
      repairItem: repairForm.repairItem,
      deviceLocation: repairForm.deviceLocation,
      repairTime: repairForm.repairTime,
      depiction: repairForm.depiction,
      fileIds: fileIds
    }
    
    console.log('準備提交的資料:', submitData)
    
    const result = await repairStore.createRepair(submitData)

    console.log("result:", result)
    alert('報修申請提交成功！')
    router.push('/repair-system') // 跳轉到報修列表頁面
    
  } catch (error) {
    console.error('提交失敗:', error)
    alert('提交失敗，請稍後重試')
  } finally {
    isSubmitting.value = false
  }
}

// 取消操作
const handleCancel = () => {
  if (confirm('確定要取消嗎？未保存的資料將會遺失。')) {
    router.go(-1)
  }
}
const isReasonLoading = ref(false);
watch(() => repairForm.repairCategoryId, (newId) => {
  isReasonLoading.value = true;
  const category = categories.value.find(cat => cat.id === newId)
  const type = category?.name
  const targetTypes = ['軟體', '硬體']

  isHardwareOrSoftware.value = {
    value: targetTypes.includes(type),
    type: targetTypes.includes(type) ? type : ''
  }

  repairStore.fetchReasons(newId || '-').then(() => {
    reasons.value = repairStore.reasons?.data || []
  }).finally(() => {
    isReasonLoading.value = false
    repairForm.repairReasonId = ''
  })
  
})
// 載入枚舉資料
onMounted(async () => {
  initializeDateTime()
  isReasonLoading.value = true
  try {
    await repairStore.fetchCategories()
    await repairStore.fetchReasons(repairForm.repairCategoryId || '-')
    
    categories.value = repairStore.categories?.data || []
    console.log(categories.value);
    
    reasons.value = repairStore.reasons?.data || []
  } catch (error) {
    console.error('載入枚舉資料失敗:', error)
  } finally {
    isReasonLoading.value = false
  }
})
</script>

<template>
  <div class="new-repair-page">
    <div class="repair-form-container">
      <!-- 表單標題 -->
      <div class="form-header">
        <h2 class="form-title">新增報修</h2>
      </div>

      <!-- 報修表單 -->
      <form @submit.prevent="handleSubmit" class="repair-form">
        <div class="form-container">
          <div class="form-row">
            <!-- 案件標題 -->
              <div class="form-group required">
                <label class="form-label">案件標題</label>
                <input
                  type="text"
                  v-model="repairForm.title"
                  placeholder="請輸入案件標題"
                  class="form-input"
                  :class="{ error: errors.title }"
                />
                <span v-if="errors.title" class="error-message">{{ errors.title }}</span>
              </div>
              <!-- 故障類別 -->
              <div class="form-group required">
                <label class="form-label">故障類別</label>
                <select 
                  v-model="repairForm.repairCategoryId"
                  class="form-select"
                  :class="{ error: errors.repairCategoryId }"
                >
                  <option value="">選擇故障類別</option>
                  <option 
                    v-for="category in categories" 
                    :key="category.id" 
                    :value="category.id"
                  >
                    {{ category.name }}
                  </option>
                </select>
                <span v-if="errors.repairCategoryId" class="error-message">{{ errors.repairCategoryId }}</span>
              </div>
              <!-- 故障原因 -->
              <div class="form-group required">
              <label class="form-label">故障原因</label>
              <select 
                v-model="repairForm.repairReasonId"
                class="form-select"
                :class="{ error: errors.repairReasonId }"
                :disabled="isReasonLoading"
              >
                <option value="">選擇故障原因</option>
                <option 
                  v-for="reason in reasons" 
                  :key="reason.id" 
                  :value="reason.id"
                >
                  {{ reason.name }}
                </option>
              </select>
              <span v-if="errors.repairReasonId" class="error-message">{{ errors.repairReasonId }}</span>
              </div>
          </div>
          <div class="form-row">
            <!-- 設備位置 -->
            <div class="form-group" v-if="isHardwareOrSoftware.value">
              <label class="form-label">設備位置</label>
              <input
                type="text"
                v-model="repairForm.deviceLocation"
                placeholder="請輸入故障設備位置"
                class="form-input"
              />
            </div>

            <!-- 報修時間 -->
            <div class="form-group required">
              <label class="form-label">報修時間</label>
              <input
                type="datetime-local"
                v-model="repairForm.repairTime"
                class="form-input"
                :class="{ error: errors.repairTime }"
              />
              <span v-if="errors.repairTime" class="error-message">{{ errors.repairTime }}</span>
            </div>
            <!-- 報修人員 -->
            <div class="form-group">
              <label class="form-label">報修人員</label>
              <div class="reporter-info">
                <span class="reporter-name">{{ currentUser?.name || '系統用戶' }}</span>
                <span class="reporter-detail">{{ currentUser?.repair_unit || 'OO科技公司-資訊部-專案管理課-第一OO' }}</span>
              </div>
            </div>

          </div>
        </div>

        <!-- 設備項目 -->
        <div class="form-group" v-if="isHardwareOrSoftware.value">
          <label class="form-label">{{ isHardwareOrSoftware.type==='軟體' ? '功能項目' : '設備項目' }}</label>
          <input
            type="text"
            v-model="repairForm.repairItem"
            placeholder="請輸入設備或項目名稱"
            class="form-input"
          />
        </div>

        <!-- 問題描述 -->
        <div class="form-group">
          <label class="form-label">
            問題描述
            <span class="char-count">{{ repairForm.depiction.length }}/500</span>
          </label>
          <textarea
            v-model="repairForm.depiction"
            placeholder="11/05/08 發現系統登入人員名稱無法顯示，目前所有人員皆無法正常登入，麻煩盡快協助確認。"
            class="form-textarea"
            rows="5"
            maxlength="500"
          ></textarea>
        </div>

        <!-- 檔案上傳區域 -->
        <div class="form-group">
          <label class="form-label">檔案上傳 ({{ uploadedFiles.length }}/{{ FILE_LIMITS.maxFiles }})</label>
          <div class="upload-area" @click="triggerFileInput" :class="{ uploading: isUploading, disabled: uploadedFiles.length >= FILE_LIMITS.maxFiles }">
            <div class="upload-content">
              <div class="upload-icon">
                <span v-if="isUploading">⏳</span>
                <span v-else-if="uploadedFiles.length >= FILE_LIMITS.maxFiles">🚫</span>
                <span v-else>📁</span>
              </div>
              <div class="upload-text">
                <p class="upload-main">
                  <span v-if="isUploading">正在上傳檔案...</span>
                  <span v-else-if="uploadedFiles.length >= FILE_LIMITS.maxFiles">已達到檔案數量上限</span>
                  <span v-else>將檔案拖曳至此處或點擊選擇上傳的檔案</span>
                </p>
                <p class="upload-sub">上傳檔案須小於100MB，最多5個檔案，支援 JPG/PNG/DOC/DOCX/PPT/PPTX/PDF/MP4 格式</p>
              </div>
            </div>
            <input
              ref="fileInput"
              type="file"
              multiple
              @change="handleFileUpload"
              class="file-input"
              accept=".jpg,.jpeg,.png,.doc,.docx,.ppt,.pptx,.pdf,.mp4"
              :disabled="isUploading || uploadedFiles.length >= FILE_LIMITS.maxFiles"
            />
          </div>

          <!-- 已上傳檔案列表 -->
          <div v-if="uploadedFiles.length > 0" class="uploaded-files">
            <div
              v-for="(file, index) in uploadedFiles"
              :key="index"
              class="file-item"
            >
              <div class="file-info">
                <span class="file-icon" :class="getFileIconClass(file.name)">📄</span>
                <div class="file-details">
                  <span class="file-name">{{ file.name }}</span>
                  <span class="file-size">{{ formatFileSize(file.size) }}</span>
                  <span v-if="file.id" class="file-status uploaded">✅ 已上傳</span>
                  <span v-else class="file-status pending">⏳ 上傳中</span>
                </div>
              </div>
              <button
                type="button"
                @click="removeFile(index)"
                class="remove-file-btn"
                :disabled="isDeleting(file)"
              >
                <span v-if="isDeleting(file)" class="loading-spinner">🔄</span>
                <span v-else>✕</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 操作按鈕 -->
        <div class="form-actions">
          <button type="button" @click="handleCancel" class="cancel-btn">
            取消
          </button>
          <button type="submit" :disabled="isSubmitting" class="submit-btn">
            {{ isSubmitting ? '儲存中...' : '儲存' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.new-repair-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20px;

  .repair-form-container {
    max-width: 800px;
    margin: 0 auto;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }
}

.form-header {
  background: #6c5ce7;
  color: white;
  padding: 25px 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .form-title {
    font-size: 20px;
    font-weight: 600;
    margin: 0;
  }

  .repair-number {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;

    .label {
      font-size: 12px;
      opacity: 0.9;
    }

    .number {
      font-size: 14px;
      font-weight: 500;
      font-family: 'Courier New', monospace;
    }
  }
}

.repair-form {
  padding: 30px;
  .form-container{
    display: grid;
    grid-template-columns: 50% 50%;
    justify-content: center;
    gap: 20px;
    width: 100%;
  }
  .form-row {
    width: 100%;
    flex: 1;
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: .3fr .3fr .3fr;
    gap: 25px;
    margin-bottom: 25px;
    

    &:last-child {
      margin-bottom: 0;
    }
  }

  .form-group {
    display: flex;
    flex-direction: column;

    &.required .form-label::after {
      content: ' *';
      color: #e74c3c;
    }

    &:not(.form-row > &) {
      margin-bottom: 25px;
    }
  }

  .form-label {
    font-size: 14px;
    font-weight: 500;
    color: #333;
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .char-count {
      font-size: 12px;
      color: #666;
      font-weight: normal;
    }
  }

  .form-input,
  .form-select {
    padding: 12px 15px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    transition: all 0.3s;
    background: white;

    &:focus {
      outline: none;
      border-color: #6c5ce7;
      box-shadow: 0 0 0 2px rgba(108, 92, 231, 0.1);
    }

    &.error {
      border-color: #e74c3c;
      box-shadow: 0 0 0 2px rgba(231, 76, 60, 0.1);
    }

    &::placeholder {
      color: #999;
    }
  }

  .form-textarea {
    @extend .form-input;
    resize: vertical;
    min-height: 120px;
    font-family: inherit;
  }

  .error-message {
    color: #e74c3c;
    font-size: 12px;
    margin-top: 4px;
  }

  .reporter-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 15px;
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 6px;

    .reporter-name {
      font-weight: 500;
      color: #333;
    }

    .reporter-detail {
      font-size: 12px;
      color: #666;
    }
  }
}

.upload-area {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: #fafafa;

  &:hover:not(.uploading):not(.disabled) {
    border-color: #6c5ce7;
    background: #f8f7ff;
  }

  &.uploading {
    border-color: #f39c12;
    background: #fef9e7;
    cursor: not-allowed;
  }

  &.disabled {
    border-color: #ccc;
    background: #f5f5f5;
    cursor: not-allowed;
    opacity: 0.6;
  }

  .upload-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
  }

  .upload-icon {
    font-size: 48px;
    opacity: 0.5;
  }

  .upload-text {
    .upload-main {
      font-size: 16px;
      color: #333;
      margin: 0 0 8px 0;
    }

    .upload-sub {
      font-size: 12px;
      color: #666;
      margin: 0;
    }
  }

  .file-input {
    display: none;
  }
}

.uploaded-files {
  margin-top: 15px;

  .file-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 15px;
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 6px;
    margin-bottom: 8px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .file-info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;

    .file-icon {
      font-size: 20px;
    }

    .file-details {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .file-name {
        font-size: 14px;
        color: #333;
        font-weight: 500;
      }

      .file-size {
        font-size: 12px;
        color: #666;
      }

      .file-status {
        font-size: 11px;
        font-weight: 500;

        &.uploaded {
          color: #27ae60;
        }

        &.pending {
          color: #f39c12;
        }
      }
    }
  }

  .remove-file-btn {
    background: none;
    border: none;
    color: #e74c3c;
    cursor: pointer;
    font-size: 14px;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.2s;
    min-width: 24px;
    min-height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover:not(:disabled) {
      background: #ffeaea;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .loading-spinner {
      animation: spin 1s linear infinite;
      font-size: 12px;
    }
  }
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;

  .cancel-btn {
    padding: 12px 30px;
    border: 1px solid #ddd;
    background: white;
    color: #666;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      background: #f8f9fa;
      border-color: #6c5ce7;
      color: #6c5ce7;
    }
  }

  .submit-btn {
    padding: 12px 30px;
    background: #6c5ce7;
    color: white;
    border: none;
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
      background: #bbb;
      cursor: not-allowed;
      transform: none;
    }
  }
}

// 響應式設計
@media (max-width: 768px) {
  .new-repair-page {
    padding: 10px;
  }

  .form-header {
    padding: 20px;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;

    .repair-number {
      align-items: flex-start;
    }
  }

  .repair-form {
    padding: 20px;

    .form-container {
      grid-template-columns: 1fr;
    }

    .form-row {
      grid-template-rows: auto auto auto;
      gap: 20px;
    }
  }

  .form-actions {
    flex-direction: column-reverse;

    .cancel-btn,
    .submit-btn {
      width: 100%;
    }
  }
}

// 檔案圖示樣式
.file-icon {
  &.file-pdf { color: #e74c3c; }
  &.file-word { color: #2980b9; }
  &.file-powerpoint { color: #d35400; }
  &.file-image { color: #27ae60; }
  &.file-video { color: #8e44ad; }
  &.file-text { color: #34495e; }
  &.file-default { color: #95a5a6; }
}

// 旋轉動畫
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
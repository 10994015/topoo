<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBackendRepairStore } from '@/stores/backend.repair'
import { formatDateTime } from '@/utils/dateUtils'
import FilePreviewModal from '@/components/FilePreviewModal.vue'
import { PERMISSIONS } from '@/utils/permissions'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const backendRepairStore = useBackendRepairStore()
const hasWriteRepairTodoPermission = computed(() => authStore.canModify(PERMISSIONS.REPAIR_TODO_MANAGEMENT))

// 報修詳細資料
const repairDetail = ref(null)
const isLoading = ref(true)
const showProgressModal = ref(false)

// 從路由參數獲取報修ID
const repairId = computed(() => route.params.id)

const todoId = ref(null)

// 獲取報修詳細資料
// 修正後的 fetchRepairDetail 函數
const fetchRepairDetail = async () => {
  try {
    isLoading.value = true
    // 呼叫 API 獲取資料
    const response = await backendRepairStore.fetchRepairDetail(repairId.value)
    console.log(response);
    
    // 從 store 中取得更新後的資料，而不是直接使用 response
    repairDetail.value = backendRepairStore.repairDetail
    
    // 如果有 todo_id，也要更新
    if(repairDetail.value && repairDetail.value.todo_id){
      todoId.value = repairDetail.value.todo_id
    }
    
    console.log(repairDetail.value);
    
  } catch (error) {
    console.error('獲取報修詳細資料失敗:', error)
    alert('載入失敗，請稍後重試')
  } finally {
    isLoading.value = false
  }
}

// 獲取報修進度記錄
const fetchProgressRecords = async () => {
  try {
    await backendRepairStore.fetchRepairProgress(repairId.value)
    mockProgressData.value = backendRepairStore.repairProgress || []
    console.log(mockProgressData.value);
    
  } catch (error) {
    console.error('獲取進度記錄失敗:', error)
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

// 獲取狀態樣式類別
const getStatusClass = (status) => {
  const statusMap = {
    '尚未指派': 'status-pending',
    '承辦中': 'status-processing', 
    '已完成': 'status-completed'
  }
  return statusMap[status] || 'status-default'
}

// 返回上一頁
const goBack = () => {
  router.go(-1)
}

// 顯示詳細進度
const showDetailProgress = async () => {
  await fetchProgressRecords()
  showProgressModal.value = true
}

// 關閉進度彈窗
const closeProgressModal = () => {
  showProgressModal.value = false
}

const mockProgressData = ref([])

// 案件派工處理
const handAssign = async () => {
  if (!hasWriteRepairTodoPermission.value) {
    alert('您沒有權限指派案件')
    return
  }
  // 實作承辦案件邏輯
  if(repairDetail.value.repair_status === '尚未承辦'){
    const response = await backendRepairStore.handleWork(repairId.value)
    console.log(response);
    
    if (response.success) {
      alert(response.message)
      // 重新整理頁面
      await fetchRepairDetail()
    }
    else {
      alert(response.message)
    }
    return;
  }
  router.push({
    name: 'app.settings.handle-work',
    params: { id: repairId.value }
  })
}

const restartTodo = async () => {
  if (!hasWriteRepairTodoPermission.value) {
    alert('您沒有權限重啟案件')
    return
  }
  // 實作刪除案件邏輯
  console.log('重啟案件')
  const response = await backendRepairStore.restartTodo(repairId.value)

  if (response.success) {
    alert('重啟成功！')
    router.go(-1)
  }
  else {
    alert('重啟失敗，請稍後重試')
  }
  
  
}
const levels = {
    1: '普級',
    2: '中級',
    3: '緊急',
}
const levelsMap = {
  1: 'priority-normal',
  2: 'priority-medium',
  3: 'priority-urgent'
}


// 下載檔案
const downloadFile = async (file) => {
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
  const response = await backendRepairStore.fetchRepairDetail(repairId.value)
  console.log(response);
  
  repairDetail.value = backendRepairStore.repairDetail
  if(repairDetail.value.todo_id){
    todoId.value = repairDetail.value.todo_id
  }
  console.log(repairDetail.value);
  
  isLoading.value = false
})
</script>

<template>
  <div class="repair-progress-page">
    <div class="progress-container">
      <!-- Loading 狀態 -->
      <div v-if="isLoading" class="loading-container">
        <div class="loading-spinner">⟳</div>
        <div class="loading-text">載入中...</div>
      </div>

      <!-- 主要內容 -->
      <div v-else-if="repairDetail" class="repair-detail">
        <!-- 標題區域 -->
        <div class="detail-header">
          <div class="header-left">
            <h2 class="page-title">報修資訊</h2>
            <span class="repair-number">{{ repairDetail.id }}</span>
          </div>
        </div>

        <!-- 詳細資訊 -->
        <div class="detail-content">
          <div class="info-grid">
            <!-- 左欄 -->
            <div class="info-column">
              <div class="info-group">
                <label class="info-label">案件標題</label>
                <div class="info-value">{{ repairDetail.title }}</div>
              </div>

              <div class="info-group">
                <label class="info-label">故障類別</label>
                <div class="info-value">{{ repairDetail.repair_category }}</div>
              </div>

              <div class="info-group">
                <label class="info-label">故障原因</label>
                <div class="info-value">{{ repairDetail.repair_reason }}</div>
              </div>

              <div class="info-group" v-if="repairDetail.repair_category ==='硬體' || repairDetail.repair_category ==='軟體'">
                <label class="info-label">功能項目</label>
                <div class="info-value">{{ repairDetail.repair_item || '無' }}</div>
              </div>


              <div class="info-group">
                <label class="info-label">處理狀態</label>
                <div class="info-value">
                  <span class="status-badge" :class="getStatusClass(repairDetail.repair_status)">
                    {{ repairDetail.repair_status }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 右欄 -->
            <div class="info-column">
              <div class="info-group">
                <label class="info-label">報修人員</label>
                <div class="info-value">{{ repairDetail.repair_name }}</div>
              </div>

              <div class="info-group">
                <label class="info-label">報修時間</label>
                <div class="info-value">{{ formatDateTime(repairDetail.repair_time) }}</div>
              </div>

              <div class="info-group">
                <label class="info-label">填單時間</label>
                <div class="info-value">{{ formatDateTime(repairDetail.created_at) }}</div>
              </div>

              
              <div class="info-group" v-if="repairDetail.repair_category ==='硬體' || repairDetail.repair_category ==='軟體'">
                <label class="info-label">設備位置</label>
                <div class="info-value">{{ repairDetail.device_location || '無' }}</div>
              </div>

              <div class="info-group">
                <label class="info-label">承辦人員</label>
                <div class="info-value">{{ repairDetail.repair_status=='尚未承辦' ? '-' : (repairDetail.assign_user_name || '-') }}</div>
              </div>
            </div>
          </div>

          <!-- 問題描述 -->
          <div class="description-section">
            <label class="info-label">問題描述</label>
            <div class="description-content">
              {{ repairDetail.depiction }}
            </div>
          </div>

          <!-- 操作按鈕 -->
          <div class="action-buttons">
            <button @click="showDetailProgress" class="progress-btn">
              檢視詳細進度
            </button>
            <button @click="goBack" class="back-btn">
              返回
            </button>
          </div>
        </div>

        <!-- 附件列表 -->
        <div v-if="repairDetail.files && repairDetail.files.length > 0" class="attachments-section">
          <h3 class="section-title">附件</h3>
          <div class="file-list">
            <div 
              v-for="(file, index) in repairDetail.files" 
              :key="file.id" 
              class="file-item"
            >
              <div class="file-info">
                <span class="file-icon">{{ getFileIcon(file.file_name) }}</span>
                <div class="file-details">
                  <span class="file-name">{{ index + 1 }}. {{ file.file_name }}</span>
                  <span class="file-size">{{ formatFileSize(file.size) }}</span>
                </div>
              </div>
              <button class="download-btn" @click="downloadFile(file)" >
                <span class="download-icon">⬇</span>
              </button>
              <button class="view-btn" @click="openFilePreview(file)">
                <span class="view-icon">👁</span>
              </button>
            </div>
          </div>
        </div>
        <div class="handler-section">
            <h3 class="section-title">承辦資訊</h3>
            
            <div class="handler-content">
                <!-- 重要程度 -->
                <div class="priority-item">
                <div class="priority-icon">📌</div>
                <div class="priority-info">
                    <span class="priority-label">重要程度</span>
                    <span :class="[repairDetail.importance_level ? 'priority-badge' : '', levelsMap[repairDetail.importance_level] || '']">{{ levels[repairDetail.importance_level] || '-' }}</span>
                </div>
                </div>

                <!-- 緊急程度 -->
                <div class="priority-item">
                <div class="priority-icon">⚠️</div>
                <div class="priority-info">
                    <span class="priority-label">緊急程度</span>
                    <span :class="[repairDetail.importance_level ? 'priority-badge' : '', levelsMap[repairDetail.importance_level] || '']">{{ levels[repairDetail.emergency_level] || '-' }}</span>
                </div>
                </div>

                <!-- 預計完成時間 -->
                <div class="completion-time">
                <span class="completion-label">預計完成時間</span>
                <span class="completion-value">{{ formatDateTime(repairDetail.estimated_completion_time) || '-' }}</span>
                </div>

                <!-- 操作按鈕 -->
                <div class="handler-actions">
                <button @click="handAssign" class="accept-btn" v-if="hasWriteRepairTodoPermission">
                    {{ repairDetail.repair_status === '尚未承辦' ? '承辦案件' : '處理案件' }}
                </button v-if="hasWriteRepairTodoPermission">
                <button @click="restartTodo" class="reassign-btn" v-if="repairDetail.repair_status==='已完成' || repairDetail.repair_status==='歸檔'">
                    重啟案件
                </button>
                </div>
            </div>
        </div>
      </div>

      <!-- 錯誤狀態 -->
      <div v-else class="error-container">
        <div class="error-message">找不到報修資料</div>
        <button @click="goBack" class="back-btn">返回</button>
      </div>
    </div>

      <!-- 詳細進度彈跳視窗 -->
      <div v-if="showProgressModal" class="modal-overlay" @click="closeProgressModal">
          <div class="modal-content" @click.stop>
              <div class="modal-header">
              <h3 class="modal-title">案件處理進度</h3>
              <button @click="closeProgressModal" class="close-btn">✕</button>
              </div>
              
              <div class="modal-body">
              <!-- 有資料時顯示時間軸 -->
              <div v-if="mockProgressData && mockProgressData.length > 0" class="progress-timeline">
                  <div 
                  v-for="(record, index) in mockProgressData" 
                  :key="index"
                  class="timeline-item"
                  :class="{ 
                      'completed': record.repair_status === '已完成',
                      'processing': record.repair_status === '承辦中',
                      'assigned': record.repair_status === '指派中'
                  }"
                  >
                  <div class="timeline-icon">
                      <span v-if="record.repair_status === '已完成'">✓</span>
                      <span v-else-if="record.repair_status === '承辦中'">⚡</span>
                      <span v-else>⏳</span>
                  </div>
                  
                  <div class="timeline-content">
                      <div class="timeline-header">
                      <span class="timeline-time">{{ formatDateTime(record.created_at) }}</span>
                      <span class="timeline-status">{{ record.repair_status }}</span>
                      </div>
                      
                      <div class="timeline-user">{{ record.repair_record_name }} 回覆</div>
                      
                      <div v-if="record.content" class="timeline-comment">
                      {{ record.content }}
                      </div>

                      <!-- 附件區域 -->
                      <div v-if="record.files && record.files.length > 0" class="timeline-files">
                        <div class="files-header">
                            <span class="files-icon">📎</span>
                            <span class="files-title">附件 ({{ record.files.length }})</span>
                        </div>
                        <div class="files-list">
                            <div 
                            v-for="(file, fileIndex) in record.files" 
                            :key="file.file_id || fileIndex" 
                            class="file-item-inline"
                            >
                            <div class="file-info-inline">
                                <span class="file-icon-small">{{ getFileIcon(file.file_name) }}</span>
                                <div class="file-details-inline">
                                <span class="file-name-inline">{{ file.original_name || file.file_name }}</span>
                                <span class="file-size-inline">{{ formatFileSize(file.size) }}</span>
                                </div>
                            </div>
                            <div class="file-actions-inline">
                                <button 
                                @click="openFilePreview(file)" 
                                class="preview-btn-small"
                                :title="'預覽 ' + (file.original_name || file.file_name)"
                                >
                                <span class="preview-icon">👁</span>
                                </button>
                                <button 
                                @click="downloadFile(file)" 
                                class="download-btn-small"
                                :title="'下載 ' + (file.original_name || file.file_name)"
                                >
                                <span class="download-icon">⬇</span>
                                </button>
                            </div>
                            </div>
                        </div>
                      </div>
                  </div>
                  </div>
              </div>
              
              <!-- 沒有資料時顯示提示 -->
              <div v-else class="empty-state">
                  <div class="empty-icon">📋</div>
                  <div class="empty-title">尚無進度資料</div>
                  <div class="empty-description">目前還沒有任何處理進度記錄</div>
              </div>
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
.repair-progress-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20px;
}

.progress-container {
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
.detail-header {
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

  .repair-number {
    font-size: 16px;
    font-weight: 500;
    font-family: 'Courier New', monospace;
    background: rgba(255, 255, 255, 0.2);
    padding: 8px 16px;
    border-radius: 20px;
  }
}

// 詳細內容
.detail-content {
  padding: 30px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  margin-bottom: 30px;
}

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
  }
}

// 狀態標籤
.status-badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;

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

// 問題描述區域
.description-section {
  margin-bottom: 30px;

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

// 操作按鈕
.action-buttons {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;

  .progress-btn {
    background: #6c5ce7;
    color: white;
    border: none;
    padding: 12px 30px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      background: #5b4bcf;
      transform: translateY(-1px);
    }
  }

  .back-btn {
    background: white;
    color: #666;
    border: 1px solid #ddd;
    padding: 12px 20px;
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
}

// 附件區域
.attachments-section {
  border-top: 1px solid #f0f0f0;
  padding: 30px;

  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin-bottom: 20px;
  }

  .file-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 15px;
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

    &:hover {
      background: #e9ecef;
      border-color: #6c5ce7;
    }
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

  /* 下載按鈕 - 藍紫色 */
.download-btn {
  background: #6c5ce7;
  color: white;
  border: none;
  border-radius: 6px;
  width: 40px;
  height: 40px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 16px;

  &:hover {
    background: #5b4bcf;
    transform: scale(1.05);
  }

  .download-icon {
    display: block;
  }
}

/* 查看按鈕 - 綠色 */
.view-btn {
  background: #00b894;
  margin-left: 10px;
  color: white;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 16px;

  &:hover {
    background: #00a085;
    transform: scale(1.05);
  }

  .view-icon {
    display: block;
  }
}
}

// 彈跳視窗樣式
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
  animation: fadeIn 0.3s ease-out;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  overflow: hidden;
  animation: slideUp 0.3s ease-out;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 1px solid #f0f0f0;

  .modal-title {
    font-size: 18px;
    font-weight: 600;
    color: #333;
    margin: 0;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 20px;
    color: #666;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.3s;

    &:hover {
      background: #f8f9fa;
      color: #333;
    }
  }
}

.modal-body {
  padding: 25px;
  max-height: 60vh;
  overflow-y: auto;
}

// 進度時間軸
.progress-timeline {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.empty-description {
  font-size: 14px;
  color: #999;
  line-height: 1.5;
}
.timeline-item {
  display: flex;
  gap: 15px;
  position: relative;

  &:not(:last-child)::after {
    content: '';
    position: absolute;
    left: 20px;
    top: 40px;
    bottom: -20px;
    width: 2px;
    background: #e9ecef;
  }

  &.completed {
    .timeline-icon {
      background: #28a745;
      color: white;
    }

    &::after {
      background: #28a745;
    }
  }

  &.processing {
    .timeline-icon {
      background: #ffc107;
      color: white;
    }

    &::after {
      background: #ffc107;
    }
  }

  &.assigned {
    .timeline-icon {
      background: #17a2b8;
      color: white;
    }
  }
}

.timeline-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #6c757d;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  flex-shrink: 0;
  z-index: 1;
  position: relative;
}

.timeline-content {
  flex: 1;
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  border-left: 3px solid #6c5ce7;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;

  .timeline-time {
    font-size: 14px;
    color: #666;
    font-weight: 500;
  }

  .timeline-status {
    font-size: 12px;
    background: #6c5ce7;
    color: white;
    padding: 4px 8px;
    border-radius: 12px;
  }
}

.timeline-user {
  font-size: 14px;
  color: #333;
  margin-bottom: 8px;
}

.timeline-comment {
  font-size: 14px;
  color: #555;
  line-height: 1.5;
  background: white;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e9ecef;
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
}

// 動畫
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// 響應式設計
@media (max-width: 768px) {
  .repair-progress-page {
    padding: 10px;
  }

  .detail-header {
    padding: 20px;
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .detail-content {
    padding: 20px;
  }

  .info-grid {
    grid-template-columns: 1fr;
    gap: 25px;
  }

  .action-buttons {
    flex-direction: column-reverse;

    .progress-btn,
    .back-btn {
      width: 100%;
    }
  }

  .attachments-section {
    .file-list {
      grid-template-columns: 1fr;
    }
  }

  .modal-content {
    width: 95%;
    margin: 20px;
  }

  .timeline-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
// 承辦資訊區塊樣式
.handler-section {
  border-top: 1px solid #f0f0f0;
  padding: 30px;
  background: #fafbfc;

  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin-bottom: 20px;
  }

  .handler-content {
    background: white;
    padding: 20px;
    border-radius: 8px;
    border: 1px solid #e9ecef;
  }

  .priority-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid #f8f9fa;

    &:last-of-type {
      border-bottom: none;
    }

    .priority-icon {
      font-size: 20px;
      width: 24px;
      text-align: center;
    }

    .priority-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex: 1;
    }

    .priority-label {
      font-size: 14px;
      color: #666;
      font-weight: 500;
    }

    /* 優先級標籤基本樣式 */
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
    }

    .priority-badge::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        transition: left 0.5s ease;
    }

    .priority-badge:hover::before {
        left: 100%;
    }

    /* 普級樣式 - 綠色系 */
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

    &::before {
        content: '✓';
        margin-right: 4px;
    }
    }

    /* 中級樣式 - 黃色系 */
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

    &::before {
        content: '⚠️';
        margin-right: 4px;
    }
    }

    /* 緊急樣式 - 紅色系 */
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

    &::before {
        content: '🚨';
        margin-right: 4px;
    }
    }

    /* 緊急等級的脈衝動畫 */
    @keyframes pulse {
    0% { box-shadow: 0 2px 4px rgba(114, 28, 36, 0.1); }
    50% { box-shadow: 0 4px 12px rgba(114, 28, 36, 0.2); }
    100% { box-shadow: 0 2px 4px rgba(114, 28, 36, 0.1); }
    }
  }

  .completion-time {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 0;
    margin: 15px 0;
    border-top: 1px solid #f8f9fa;

    .completion-label {
      font-size: 14px;
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

  .handler-actions {
    display: flex;
    gap: 12px;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #f8f9fa;

    .accept-btn {
      flex: 1;
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
        transform: translateY(-1px);
      }

      &:active {
        transform: translateY(0);
      }
    }

    .reassign-btn {
      flex: 1;
      background: #e74c3c;
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s;

      &:hover {
        background: #c0392b;
        transform: translateY(-1px);
      }

      &:active {
        transform: translateY(0);
      }
    }
  }
}

// 響應式設計
@media (max-width: 768px) {
  .handler-section {
    padding: 20px;

    .handler-content {
      padding: 15px;
    }

    .handler-actions {
      flex-direction: column;

      .accept-btn,
      .reassign-btn {
        width: 100%;
        margin: 0;
      }
    }

    .priority-info {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }

    .completion-time {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }

    .priority-item {
      padding: 15px 0;
    }
  }
}

@media (max-width: 480px) {
  .handler-section {
    padding: 15px;

    .section-title {
      font-size: 14px;
    }

    .priority-icon {
      font-size: 18px;
    }

    .priority-label,
    .completion-label,
    .completion-value {
      font-size: 13px;
    }

    .priority-badge {
      font-size: 11px;
      padding: 3px 8px;
    }
  }
}
// 新增的附件樣式
.timeline-files {
  margin-top: 15px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;

  .files-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e9ecef;

    .files-icon {
      font-size: 16px;
    }

    .files-title {
      font-size: 13px;
      font-weight: 600;
      color: #495057;
    }
  }

  .files-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .file-item-inline {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    transition: all 0.2s ease;

    &:hover {
      background: #f8f9fa;
      border-color: #6c5ce7;
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(108, 92, 231, 0.1);
    }
  }

  .file-info-inline {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0; // 防止文字溢出

    .file-icon-small {
      font-size: 18px;
      flex-shrink: 0;
    }

    .file-details-inline {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;

      .file-name-inline {
        font-size: 12px;
        color: #333;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .file-size-inline {
        font-size: 10px;
        color: #6c757d;
      }
    }
  }

  .file-actions-inline {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  .preview-btn-small,
  .download-btn-small {
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      transform: scale(1.05);
    }

    &:active {
      transform: scale(0.95);
    }
  }

  .preview-btn-small {
    background: #28a745;
    color: white;

    &:hover {
      background: #218838;
    }
  }

  .download-btn-small {
    background: #6c5ce7;
    color: white;

    &:hover {
      background: #5b4bcf;
    }
  }
}

// 響應式設計
@media (max-width: 768px) {
  .timeline-files {
    .file-item-inline {
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
    }

    .file-info-inline {
      justify-content: flex-start;
    }

    .file-actions-inline {
      justify-content: center;
    }

    .preview-btn-small,
    .download-btn-small {
      flex: 1;
      height: 32px;
      font-size: 14px;
    }
  }
}

@media (max-width: 480px) {
  .timeline-files {
    padding: 8px;

    .files-header {
      margin-bottom: 8px;
      
      .files-title {
        font-size: 12px;
      }
    }

    .file-item-inline {
      padding: 6px 8px;
    }

    .file-details-inline {
      .file-name-inline {
        font-size: 11px;
      }

      .file-size-inline {
        font-size: 9px;
      }
    }
  }
}
</style>
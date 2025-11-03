<script setup>
import { ref, reactive, onMounted, computed, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRepairStore } from '@/stores/repair'
import { formatDate, formatDateTime } from '@/utils/dateUtils'
import FilePreviewModal from '@/components/FilePreviewModal.vue'

const route = useRoute()
const router = useRouter()
const repairStore = useRepairStore()

// 報修詳細資料
const repairDetail = ref(null)
const isLoading = ref(true)
const showProgressModal = ref(false)

// 從路由參數獲取報修ID
const repairId = computed(() => route.params.id)

// 獲取報修詳細資料
const fetchRepairDetail = async () => {
  try {
    isLoading.value = true
    // 這裡需要新增一個 API 方法來獲取單一報修詳細資料
    const response = await repairStore.fetchRepairDetail(repairId.value)
    repairDetail.value = response
  } catch (error) {
    //console.error('獲取報修詳細資料失敗:', error)
    alert('載入失敗，請稍後重試')
  } finally {
    isLoading.value = false
  }
}

// 獲取報修進度記錄
const fetchProgressRecords = async () => {
  try {
    await repairStore.fetchRepairProgress(repairId.value)
    mockProgressData.value = repairStore.repairProgress || []
    //console.log(mockProgressData.value);
    
  } catch (error) {
    //console.error('獲取進度記錄失敗:', error)
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

// 下載檔案
const downloadFile = async (file) => {
    try {
        const response = await repairStore.downloadFile(file.file_id);

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
  selectedFile.value = file
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
    const response = await repairStore.viewFile(fileId)
    return response
  } catch (error) {
    //console.error('獲取檔案內容失敗:', error)
    throw error
  }
}

// 檔案預覽事件處理
const onFileDownloaded = (file) => {
  //console.log('檔案已下載:', file.file_name)
}

const onPreviewLoadSuccess = (blob) => {
  //console.log('預覽載入成功')
}

const onPreviewLoadError = (error) => {
  //console.error('預覽載入失敗:', error)
  alert('預覽失敗，請稍後重試')
}
onMounted(async () => {
  // 實際開發時取消註解
  const response = await repairStore.fetchRepairDetail(repairId.value)
  //console.log(response);
  
  repairDetail.value = repairStore.repairDetail
  //console.log(repairDetail.value);
  
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
            <span class="repair-number">{{ repairDetail.case_no }}</span>
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

              <div class="info-group">
                <label class="info-label">{{ repairDetail.repair_category ==='軟體' ? '功能項目' : '設備項目'}}</label>
                <div class="info-value">{{ repairDetail.repair_item || '無' }}</div>
              </div>

              <div class="info-group">
                <label class="info-label">設備位置</label>
                <div class="info-value">{{ repairDetail.device_location || '無' }}</div>
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

              <div class="info-group">
                <label class="info-label">處理狀態</label>
                <div class="info-value">
                  <span class="status-badge" :class="getStatusClass(repairDetail.repair_status)">
                    {{ repairDetail.repair_status }}
                  </span>
                </div>
              </div>

              <div class="info-group">
                <label class="info-label">承辦人員</label>
                <div class="info-value">{{ repairDetail.assign_user_nick_name || '-' }}</div>
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
                  <span class="file-name">{{ file.original_name }}</span>
                  <span class="file-size">{{ formatFileSize(file.size) }}</span>
                </div>
              </div>
              <button class="download-btn" @click="downloadFile(file)">
                <span class="download-icon">⬇</span>
              </button>
              <button class="view-btn" @click="openFilePreview(file)">
                <span class="view-icon">👁</span>
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
  max-width: 1000px;
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

</style>
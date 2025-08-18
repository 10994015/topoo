<script setup>
import { ref, reactive, onMounted, computed, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRepairStore } from '@/stores/repair'
import { useTodoStore } from '@/stores/todo'
import { formatDateTime } from '@/utils/dateUtils'
import FilePreviewModal from '@/components/FilePreviewModal.vue'
import { PERMISSIONS } from '@/utils/permissions'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const repairStore = useRepairStore()
const todoStore = useTodoStore()
const authStore = useAuthStore()
const hasWriteTodoPermission = computed(() => authStore.canModify(PERMISSIONS.TODO_MANAGEMENT))

// 報修詳細資料
const todoDetail = ref(null)
const isLoading = ref(true)
const showProgressModal = ref(false)

// 從路由參數獲取報修ID
const repairId = computed(() => route.params.id)

const todoId = ref(null)

// 獲取報修詳細資料
const fetchtodoDetail = async () => {
  try {
    isLoading.value = true
    // 這裡需要新增一個 API 方法來獲取單一報修詳細資料
    const response = await repairStore.fetchtodoDetail(repairId.value)
    todoDetail.value = response
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
    await todoStore.fetchTodoProgress(repairId.value)
    mockProgressData.value = todoStore.todoProgress || []
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
const handAssign = () => {
  if (!hasWriteTodoPermission.value) {
    alert('您沒有權限指派案件')
    return
  }
  console.log(todoId.value);
  const id =  repairId.value
  // 實作承辦案件邏輯
  console.log('指派案件')
  router.push({
    name: 'app.settings.assign-work',
    params: { id: id }
  })
  // 可以呼叫 API 或顯示確認對話框
}

const deleteAssign = async () => {
  // 實作刪除案件邏輯
  console.log('刪除案件')
  // 可以呼叫 API 或顯示確認對話框
  const response = await todoStore.removeTodo(todoId.value)
  console.log(response);
  
  if (response.success) {
    alert('刪除成功！')
    router.go(-1)
  }
  else {
    alert('刪除失敗，請稍後重試')
  }
  
}
const levels = {
    1: '普級',
    2: '中級',
    3: '高級',
}

const importanceLevels = {
  1: '普級',
  2: '保固級',
  3: '急件'
}
const levelsMap = {
  1: 'priority-normal',
  2: 'priority-medium',
  3: 'priority-urgent'
}


// 下載檔案
const downloadFile = async (file) => {
    try {
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
    const response = await todoStore.viewFile(fileId)
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
  const response = await todoStore.fetchTodoDetail(repairId.value)
  console.log(response);
  
  todoDetail.value = todoStore.todoDetail
  if(todoDetail.value.todo_id){
    todoId.value = todoDetail.value.todo_id
  }
  console.log(todoDetail.value);
  
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
      <div v-else-if="todoDetail" class="repair-detail">
        <!-- 標題區域 -->
        <div class="detail-header">
          <div class="header-content">
            <div class="header-left">
              <h2 class="page-title">報修資訊</h2>
              <span class="repair-number">{{ todoDetail.id }}</span>
            </div>
            <div class="header-actions">
              <button @click="goBack" class="back-btn-header">
                <span class="back-icon">←</span>
                <span class="back-text">返回</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 詳細資訊 -->
        <div class="detail-content">
          <!-- 桌面版：雙欄佈局 -->
          <div class="info-grid desktop-layout">
            <!-- 左欄 -->
            <div class="info-column">
              <div class="info-group">
                <label class="info-label">案件標題</label>
                <div class="info-value">{{ todoDetail.title }}</div>
              </div>

              <div class="info-group">
                <label class="info-label">故障類別</label>
                <div class="info-value">{{ todoDetail.repair_category }}</div>
              </div>

              <div class="info-group">
                <label class="info-label">故障原因</label>
                <div class="info-value">{{ todoDetail.repair_reason }}</div>
              </div>

              <div class="info-group" v-if="todoDetail.repair_category === '硬體' || todoDetail.repair_category === '軟體'">
                <label class="info-label">{{ todoDetail.repair_category === '軟體' ? '功能項目' : '設備項目' }}</label>
                <div class="info-value">{{ todoDetail.repair_item || '無' }}</div>
              </div>

              <div class="info-group">
                <label class="info-label">處理狀態</label>
                <div class="info-value">
                  <span class="status-badge" :class="getStatusClass(todoDetail.repair_status)">
                    {{ todoDetail.repair_status }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 右欄 -->
            <div class="info-column">
              <div class="info-group">
                <label class="info-label">報修人員</label>
                <div class="info-value">{{ todoDetail.repair_name || '無資料' }}</div>
              </div>

              <div class="info-group">
                <label class="info-label">報修時間</label>
                <div class="info-value">{{ formatDateTime(todoDetail.repair_time) }}</div>
              </div>

              <div class="info-group">
                <label class="info-label">填單時間</label>
                <div class="info-value">{{ formatDateTime(todoDetail.created_at) }}</div>
              </div>

              <div class="info-group" v-if="todoDetail.repair_category === '硬體' || todoDetail.repair_category === '軟體'">
                <label class="info-label">設備位置</label>
                <div class="info-value">{{ todoDetail.device_location || '無' }}</div>
              </div>

              <div class="info-group">
                <label class="info-label">承辦人員</label>
                <div class="info-value">{{ todoDetail.assign_user_nick_name || '-' }}</div>
              </div>
            </div>
          </div>

          <!-- 手機版：單欄佈局 -->
          <div class="info-grid mobile-layout">
            <div class="info-column">
              <div class="info-group">
                <label class="info-label">案件標題</label>
                <div class="info-value">{{ todoDetail.title }}</div>
              </div>

              <div class="info-group">
                <label class="info-label">處理狀態</label>
                <div class="info-value">
                  <span class="status-badge" :class="getStatusClass(todoDetail.repair_status)">
                    {{ todoDetail.repair_status }}
                  </span>
                </div>
              </div>

              <div class="info-group">
                <label class="info-label">報修人員</label>
                <div class="info-value">{{ todoDetail.repair_name || '無資料' }}</div>
              </div>

              <div class="info-group">
                <label class="info-label">承辦人員</label>
                <div class="info-value">{{ todoDetail.assign_user_nick_name || '-' }}</div>
              </div>

              <div class="info-group">
                <label class="info-label">故障類別</label>
                <div class="info-value">{{ todoDetail.repair_category }}</div>
              </div>

              <div class="info-group">
                <label class="info-label">故障原因</label>
                <div class="info-value">{{ todoDetail.repair_reason }}</div>
              </div>

              <div class="info-group" v-if="todoDetail.repair_category === '硬體' || todoDetail.repair_category === '軟體'">
                <label class="info-label">{{ todoDetail.repair_category === '軟體' ? '功能項目' : '設備項目' }}</label>
                <div class="info-value">{{ todoDetail.repair_item || '無' }}</div>
              </div>

              <div class="info-group" v-if="todoDetail.repair_category === '硬體' || todoDetail.repair_category === '軟體'">
                <label class="info-label">設備位置</label>
                <div class="info-value">{{ todoDetail.device_location || '無' }}</div>
              </div>

              <div class="info-group">
                <label class="info-label">報修時間</label>
                <div class="info-value">{{ formatDateTime(todoDetail.repair_time) }}</div>
              </div>

              <div class="info-group">
                <label class="info-label">填單時間</label>
                <div class="info-value">{{ formatDateTime(todoDetail.created_at) }}</div>
              </div>
            </div>
          </div>

          <!-- 問題描述 -->
          <div class="description-section">
            <label class="info-label">問題描述</label>
            <div class="description-content">
              {{ todoDetail.depiction }}
            </div>
          </div>
          <!-- 操作按鈕區域 -->
          <div class="action-buttons">
            <button @click="showDetailProgress" class="progress-btn">
              <span class="btn-icon">📊</span>
              <span class="btn-text">檢視詳細進度</span>
            </button>
            <button @click="goBack" class="back-btn desktop-only">
              <span class="btn-icon">←</span>
              <span class="btn-text">返回</span>
            </button>
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
                    <span :class="[todoDetail.importance_level ? 'priority-badge' : '', levelsMap[todoDetail.importance_level] || '']">
                      {{ importanceLevels[todoDetail.importance_level] || '-' }}
                    </span>
                  </div>
                </div>

                <!-- 緊急程度 -->
                <div class="priority-item">
                  <div class="priority-icon">⚠️</div>
                  <div class="priority-info">
                    <span class="priority-label">緊急程度</span>
                    <span :class="[todoDetail.emergency_level ? 'priority-badge' : '', levelsMap[todoDetail.emergency_level] || '']">
                      {{ levels[todoDetail.emergency_level] || '-' }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- 預計完成時間 -->
              <div class="completion-time">
                <div class="completion-icon">📅</div>
                <div class="completion-info">
                  <span class="completion-label">預計完成時間</span>
                  <span class="completion-value">{{ formatDateTime(todoDetail.estimated_completion_time) || '-' }}</span>
                </div>
              </div>

              <!-- 操作按鈕 -->
              <div class="handler-actions">
                <button 
                  @click="handAssign" 
                  class="accept-btn" 
                  v-if="hasWriteTodoPermission"
                >
                  <span class="btn-text">{{ todoDetail.todo_id ? '編輯派工' : '案件派工' }}</span>
                </button>
                
                <button 
                  @click="deleteAssign" 
                  class="reassign-btn" 
                  v-if="todoId && !(todoDetail.repair_status === '歸檔' || todoDetail.repair_status === '已完成')"
                  :disabled="false"
                >
                  <span class="btn-text">刪除派工</span>
                </button>
              </div>
            </div>
          </div>

          
        </div>

        <!-- 附件列表 -->
        <div v-if="todoDetail.files && todoDetail.files.length > 0" class="attachments-section">
          <h3 class="section-title">
            <span class="title-icon">📎</span>
            附件
          </h3>
          <div class="file-list">
            <div 
              v-for="(file, index) in todoDetail.files" 
              :key="file.id" 
              class="file-item"
            >
              <div class="file-info">
                <span class="file-icon">{{ getFileIcon(file.file_name) }}</span>
                <div class="file-details">
                  <span class="file-name">{{ index + 1 }}. {{ file.original_name }}</span>
                  <span class="file-size">{{ formatFileSize(file.size) }}</span>
                </div>
              </div>
              <div class="file-actions">
                <button class="view-btn" @click="openFilePreview(file)" title="預覽檔案">
                  <span class="view-icon">👁</span>
                </button>
                <button class="download-btn" @click="downloadFile(file)" title="下載檔案">
                  <span class="download-icon">⬇</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 錯誤狀態 -->
      <div v-else class="error-container">
        <div class="error-icon">❌</div>
        <div class="error-message">找不到報修資料</div>
        <button @click="goBack" class="back-btn">
          <span class="btn-icon">←</span>
          <span class="btn-text">返回</span>
        </button>
      </div>
    </div>

    <!-- 詳細進度彈跳視窗 -->
    <div v-if="showProgressModal" class="modal-overlay" @click="closeProgressModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">
            <span class="modal-icon">📋</span>
            案件處理進度
          </h3>
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
                
                <div class="timeline-user">
                  <span class="user-icon">👤</span>
                  {{ record.repair_record_name }} 回覆
                </div>
                
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
/* ===== Todo詳情頁完整響應式CSS ===== */
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
.detail-header {
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

  .repair-number {
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
    gap: 10px;
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

/* ===== 狀態標籤 ===== */
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

/* ===== 問題描述區域 ===== */
.description-section {
  margin: 30px 0;

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

/* ===== 承辦資訊區塊 ===== */
.handler-section {
  border-top: 1px solid #f0f0f0;
  padding-top: 30px;
  margin: 30px 0;
  background: #fafbfc;
  padding: 30px;
  border-radius: 8px;

  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 8px;

    .title-icon {
      font-size: 18px;
    }
  }

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

  /* 預計完成時間 */
  .completion-time {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 15px;
    margin-bottom: 20px;
    background: #f8f9fa;
    border-radius: 6px;
    border: 1px solid #e9ecef;

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

  /* 操作按鈕 */
  .handler-actions {
    display: flex;
    gap: 12px;

    .accept-btn,
    .reassign-btn {
      flex: 1;
      border: none;
      padding: 14px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;

      .btn-icon {
        font-size: 16px;
      }

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      &:active {
        transform: translateY(0);
      }
    }

    .accept-btn {
      background: #6c5ce7;
      color: white;

      &:hover {
        background: #5b4bcf;
      }
    }

    .reassign-btn {
      background: #e74c3c;
      color: white;

      &:hover {
        background: #c0392b;
      }
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

/* ===== 操作按鈕區域 ===== */
.action-buttons {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
  margin-top: 30px;

  .progress-btn,
  .back-btn {
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

    &:hover {
      transform: translateY(-1px);
    }
  }

  .progress-btn {
    background: #6c5ce7;
    color: white;

    &:hover {
      background: #5b4bcf;
    }
  }

  .back-btn {
    background: white;
    color: #666;
    border: 1px solid #ddd;

    &:hover {
      background: #f8f9fa;
      border-color: #6c5ce7;
      color: #6c5ce7;
    }
  }
}

/* ===== 附件區域 ===== */
.attachments-section {
  border-top: 1px solid #f0f0f0;
  padding: 30px;
  margin-top: 30px;

  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 8px;

    .title-icon {
      font-size: 18px;
    }
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
      transform: translateY(-1px);
    }
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

  .file-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  .view-btn,
  .download-btn {
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.3s;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      transform: scale(1.05);
    }
  }

  .view-btn {
    background: #00b894;
    color: white;

    &:hover {
      background: #00a085;
    }
  }

  .download-btn {
    background: #6c5ce7;
    color: white;

    &:hover {
      background: #5b4bcf;
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

/* ===== 彈跳視窗樣式 ===== */
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
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 100%;
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
    display: flex;
    align-items: center;
    gap: 8px;

    .modal-icon {
      font-size: 20px;
    }
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

/* ===== 進度時間軸 ===== */
.progress-timeline {
  display: flex;
  flex-direction: column;
  gap: 20px;
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
  flex-wrap: wrap;
  gap: 8px;

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
  display: flex;
  align-items: center;
  gap: 6px;

  .user-icon {
    font-size: 14px;
  }
}

.timeline-comment {
  font-size: 14px;
  color: #555;
  line-height: 1.5;
  background: white;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e9ecef;
  margin-bottom: 10px;
}

/* ===== 時間軸附件樣式 ===== */
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
    min-width: 0;

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

/* ===== 空狀態 ===== */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #666;

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
}

/* ===== 動畫 ===== */
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

/* ===== 響應式設計 ===== */

/* 大螢幕 (1400px+) */
@media (min-width: 1400px) {
  .repair-progress-page {
    padding: 24px;
  }

  .detail-header {
    padding: 30px;
  }

  .detail-content {
    padding: 35px;
  }

  .handler-section {
    padding: 35px;
  }

  .attachments-section {
    padding: 35px;
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
  .repair-progress-page {
    padding: 16px;
  }

  .detail-header {
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

    .handler-actions {
      gap: 10px;

      .accept-btn,
      .reassign-btn {
        padding: 12px 16px;
        font-size: 13px;
      }
    }
  }

  .action-buttons {
    flex-direction: column;

    .progress-btn,
    .back-btn {
      width: 100%;
      justify-content: center;
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
}

/* 大手機 (576px - 767px) */
@media (max-width: 767px) {
  .repair-progress-page {
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

  .detail-header {
    padding: 16px;

    .page-title {
      font-size: 18px;
    }

    .repair-number {
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
    margin: 20px 0;

    .description-content {
      padding: 12px;
      font-size: 13px;
    }
  }

  .handler-section {
    padding: 20px;
    margin: 20px 0;

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

    .handler-actions {
      flex-direction: column;
      gap: 10px;

      .accept-btn,
      .reassign-btn {
        width: 100%;
        padding: 14px;
        font-size: 14px;
      }
    }
  }

  .action-buttons {
    flex-direction: column;
    gap: 10px;

    .progress-btn {
      width: 100%;
      justify-content: center;
      padding: 14px;
    }
  }

  .attachments-section {
    padding: 20px;

    .file-list {
      grid-template-columns: 1fr;
    }

    .file-item {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
      padding: 12px;
    }

    .file-actions {
      justify-content: center;
      gap: 10px;

      .view-btn,
      .download-btn {
        flex: 1;
        height: 44px;
      }
    }
  }

  .modal-content {
    width: 95%;
    margin: 10px;
  }

  .modal-header {
    padding: 16px 20px;

    .modal-title {
      font-size: 16px;
    }
  }

  .modal-body {
    padding: 20px;
  }

  .timeline-header {
    flex-direction: column;
    align-items: flex-start;
  }

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

      .preview-btn-small,
      .download-btn-small {
        flex: 1;
        height: 32px;
        font-size: 14px;
      }
    }
  }
}

/* 小手機 (480px 以下) */
@media (max-width: 479px) {
  .repair-progress-page {
    padding: 8px;
  }

  .detail-header {
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

    .repair-number {
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

  .status-badge {
    font-size: 11px;
    padding: 4px 8px;
  }

  .description-section {
    margin: 16px 0;

    .info-label {
      font-size: 12px;
    }

    .description-content {
      padding: 10px;
      font-size: 12px;
      min-height: 60px;
    }
  }

  .handler-section {
    padding: 16px;
    margin: 16px 0;

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

    .handler-actions {
      gap: 8px;

      .accept-btn,
      .reassign-btn {
        padding: 12px;
        font-size: 13px;

        .btn-icon {
          font-size: 14px;
        }
      }
    }
  }

  .action-buttons {
    gap: 8px;

    .progress-btn {
      padding: 12px;
      font-size: 13px;

      .btn-icon {
        font-size: 14px;
      }
    }
  }

  .attachments-section {
    padding: 16px;

    .section-title {
      font-size: 14px;
    }

    .file-item {
      padding: 10px;
    }

    .file-info {
      .file-icon {
        font-size: 20px;
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

    .file-actions {
      .view-btn,
      .download-btn {
        width: 36px;
        height: 36px;
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

  .modal-content {
    width: 98%;
    margin: 5px;
    max-height: 90vh;
  }

  .modal-header {
    padding: 12px 16px;

    .modal-title {
      font-size: 14px;

      .modal-icon {
        font-size: 16px;
      }
    }

    .close-btn {
      font-size: 18px;
    }
  }

  .modal-body {
    padding: 16px;
    max-height: 70vh;
  }

  .timeline-item {
    gap: 10px;

    &:not(:last-child)::after {
      left: 15px;
    }
  }

  .timeline-icon {
    width: 30px;
    height: 30px;
    font-size: 14px;
  }

  .timeline-content {
    padding: 12px;
  }

  .timeline-header {
    .timeline-time {
      font-size: 12px;
    }

    .timeline-status {
      font-size: 10px;
      padding: 2px 6px;
    }
  }

  .timeline-user {
    font-size: 12px;

    .user-icon {
      font-size: 12px;
    }
  }

  .timeline-comment {
    font-size: 12px;
    padding: 10px;
  }

  .timeline-files {
    padding: 8px;

    .files-header {
      .files-title {
        font-size: 11px;
      }
    }

    .file-details-inline {
      .file-name-inline {
        font-size: 10px;
      }

      .file-size-inline {
        font-size: 9px;
      }
    }
  }

  .empty-state {
    padding: 30px 16px;

    .empty-icon {
      font-size: 36px;
    }

    .empty-title {
      font-size: 16px;
    }

    .empty-description {
      font-size: 12px;
    }
  }
}

/* 超小螢幕 (360px 以下) */
@media (max-width: 359px) {
  .repair-progress-page {
    padding: 4px;
  }

  .detail-header {
    padding: 8px;

    .header-left {
      gap: 8px;
    }

    .page-title {
      font-size: 14px;
    }

    .repair-number {
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

    .handler-actions {
      .accept-btn,
      .reassign-btn {
        padding: 10px;
        font-size: 12px;
      }
    }
  }

  .action-buttons {
    .progress-btn {
      padding: 10px;
      font-size: 12px;
    }
  }

  .modal-content {
    max-height: 95vh;
  }

  .modal-header {
    padding: 10px 12px;

    .modal-title {
      font-size: 13px;
    }
  }

  .modal-body {
    padding: 12px;
  }

  .timeline-files {
    .file-item-inline {
      padding: 6px 8px;
    }

    .file-actions-inline {
      .preview-btn-small,
      .download-btn-small {
        width: 24px;
        height: 24px;
        font-size: 10px;
      }
    }
  }
}

/* 特殊優化 */
@media (max-width: 767px) {
  .priority-badge {
    font-size: 11px;
    padding: 4px 10px;
  }
}

@media (max-width: 480px) {
  .priority-badge {
    font-size: 10px;
    padding: 3px 8px;
  }
}

/* 觸控裝置優化 */
@media (hover: none) {
  .file-item:hover,
  .timeline-files .file-item-inline:hover {
    transform: none;
  }

  .handler-actions .accept-btn:hover,
  .handler-actions .reassign-btn:hover,
  .action-buttons .progress-btn:hover,
  .action-buttons .back-btn:hover {
    transform: none;
  }
}

/* 高 DPI 螢幕優化 */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .timeline-icon,
  .file-icon,
  .priority-icon {
    image-rendering: -webkit-optimize-contrast;
  }
}

/* 列印樣式 */
@media print {
  .repair-progress-page {
    background: white;
    padding: 0;
  }

  .detail-header {
    background: #f8f9fa !important;
    color: #333 !important;
    border-bottom: 2px solid #dee2e6;
  }

  .back-btn-header,
  .action-buttons,
  .handler-actions {
    display: none !important;
  }

  .modal-overlay {
    display: none !important;
  }

  .attachments-section .file-actions {
    display: none !important;
  }
}

/* 橫向螢幕優化 */
@media (orientation: landscape) and (max-height: 500px) {
  .modal-content {
    max-height: 95vh;
  }

  .modal-body {
    max-height: 70vh;
  }
}
</style>
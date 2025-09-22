<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLogStore } from '@/stores/log'
import { formatDateTime } from '@/utils/dateUtils'

const route = useRoute()
const router = useRouter()
const logStore = useLogStore()

// 載入狀態
const isLoading = ref(false)

// 日誌資料
const logData = ref(null)

// 面包屑
const breadcrumbs = computed(() => {
  const logId = logData.value?.id || route.params.id
  return [
    { text: '首頁', to: '/' },
    { text: '日誌管理', to: '/settings/log-management' },
    { text: `查看日誌 - ${logId.substring(0, 8)}...`, to: null }
  ]
})

// 日誌等級樣式
const getLevelClass = (level) => {
  return logStore.getLevelClass(level)
}

// 日誌等級文字
const getLevelText = (level) => {
  return logStore.getLevelText(level)
}

// 狀態碼樣式
const getStatusClass = (status) => {
  const statusCode = parseInt(status)
  if (statusCode >= 200 && statusCode < 300) {
    return 'status-success'
  } else if (statusCode >= 400 && statusCode < 500) {
    return 'status-warning'
  } else if (statusCode >= 500) {
    return 'status-error'
  }
  return 'status-default'
}

// 載入日誌資料
const loadLogData = async () => {
  isLoading.value = true
  try {
    const response = await logStore.fetchLogById(route.params.id)
    logData.value = response
    console.log('日誌詳情載入成功:', response)
  } catch (error) {
    console.error('載入日誌資料失敗:', error)
    alert('載入日誌資料失敗')
  } finally {
    isLoading.value = false
  }
}

// 返回列表
const handleBack = () => {
  router.push('/settings/log-management')
}

onMounted(() => {
  loadLogData()
})
</script>

<template>
  <div class="log-view-page">
    <!-- 載入中 -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner">⟳</div>
      <div class="loading-text">載入中...</div>
    </div>

    <!-- 日誌詳情內容 -->
    <div v-else-if="logData" class="log-detail">
      <!-- 操作按鈕 -->
      <div class="action-buttons">
        <button 
          class="btn btn-secondary" 
          @click="handleBack"
        >
          返回列表
        </button>
      </div>

      <!-- 詳情表格 -->
      <div class="detail-card">
        <div class="detail-table">
          <div class="detail-row">
            <div class="detail-label">日誌 ID</div>
            <div class="detail-value">
              <span class="readonly-field">{{ logData.id }}</span>
            </div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">IP 位址</div>
            <div class="detail-value">{{ logData.ip || '-' }}</div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">帳號</div>
            <div class="detail-value">{{ logData.credential || '-' }}</div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">回傳狀態碼</div>
            <div class="detail-value">
              <span :class="['status-badge', getStatusClass(logData.response_status_code)]">
                {{ logData.response_status_code }}
              </span>
            </div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">日誌等級</div>
            <div class="detail-value">
              <span :class="['level-badge', getLevelClass(logData.level)]">
                {{ getLevelText(logData.level) }}
              </span>
            </div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">紀錄模組</div>
            <div class="detail-value">{{ logData.category || '-' }}</div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">訊息代碼</div>
            <div class="detail-value">{{ logData.msg_code || '-' }}</div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">標籤</div>
            <div class="detail-value">{{ logData.label || '-' }}</div>
          </div>
          
          <div class="detail-row full-width">
            <div class="detail-label">日誌訊息</div>
            <div class="detail-value">
              <div class="message-text">{{ logData.msg || '-' }}</div>
            </div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">建立者 ID</div>
            <div class="detail-value">
              <span class="readonly-field">{{ logData.created_by || '-' }}</span>
            </div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">建立日期</div>
            <div class="detail-value">
              <span class="readonly-field">{{ formatDateTime(logData.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 資料載入失敗 -->
    <div v-else class="error-container">
      <div class="error-icon">⚠️</div>
      <div class="error-message">無法載入日誌資料</div>
      <button class="btn btn-primary" @click="loadLogData">
        重新載入
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.log-view-page {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

// 載入中
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #666;

  .loading-spinner {
    font-size: 32px;
    color: #6c5ce7;
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

// 錯誤狀態
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #666;

  .error-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }

  .error-message {
    font-size: 18px;
    margin-bottom: 20px;
  }
}

// 操作按鈕
.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-bottom: 20px;

  .btn {
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    display: flex;
    align-items: center;
    gap: 8px;

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    &.btn-primary {
      background: #6c5ce7;
      color: white;

      &:hover:not(:disabled) {
        background: #5b4bcf;
        transform: translateY(-1px);
      }
    }

    &.btn-secondary {
      background: #6c757d;
      color: white;

      &:hover:not(:disabled) {
        background: #5a6268;
        transform: translateY(-1px);
      }
    }
  }
}

// 詳情卡片
.detail-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.detail-table {
  .detail-row {
    display: flex;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }

    &.full-width {
      flex-direction: column;

      .detail-label {
        border-right: none;
        border-bottom: 1px solid #f0f0f0;
        background: #f8f9fa;
        width: 100%;
      }

      .detail-value {
        padding: 15px 20px;
      }
    }

    .detail-label {
      width: 200px;
      min-width: 200px;
      padding: 15px 20px;
      background: #f8f9fa;
      color: #333;
      font-weight: 500;
      font-size: 14px;
      border-right: 1px solid #f0f0f0;
      display: flex;
      align-items: center;
    }

    .detail-value {
      flex: 1;
      padding: 15px 20px;
      color: #666;
      font-size: 14px;
      display: flex;
      align-items: center;

      .message-text {
        white-space: pre-wrap;
        line-height: 1.5;
        word-break: break-word;
        width: 100%;
        color: #333;
      }

      .readonly-field {
        color: #999;
        font-style: italic;
        font-family: 'Courier New', monospace;
        font-size: 13px;
        word-break: break-all;
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
  text-align: center;
  display: inline-block;

  &.status-success {
    background: #d4edda;
    color: #155724;
  }

  &.status-warning {
    background: #fff3cd;
    color: #856404;
  }

  &.status-error {
    background: #f8d7da;
    color: #721c24;
  }

  &.status-default {
    background: #e2e3e5;
    color: #383d41;
  }
}

// 等級標籤
.level-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  display: inline-block;

  &.level-info {
    background: #d1ecf1;
    color: #0c5460;
  }

  &.level-warning {
    background: #fff3cd;
    color: #856404;
  }

  &.level-error {
    background: #f8d7da;
    color: #721c24;
  }
}

// 響應式設計
@media (max-width: 768px) {
  .log-view-page {
    padding: 15px;
  }

  .action-buttons {
    flex-direction: column;
    gap: 10px;

    .btn {
      width: 100%;
      justify-content: center;
    }
  }

  .detail-table .detail-row {
    flex-direction: column;

    .detail-label {
      width: 100%;
      min-width: auto;
      border-right: none;
      border-bottom: 1px solid #f0f0f0;
    }

    .detail-value {
      padding-top: 10px;
    }

    &.full-width .detail-label {
      border-bottom: 1px solid #f0f0f0;
    }
  }
}

// 小螢幕特殊處理
@media (max-width: 480px) {
  .log-view-page {
    padding: 12px;
  }

  .detail-table .detail-row .detail-value .readonly-field {
    font-size: 11px;
    word-break: break-all;
  }
}
</style>
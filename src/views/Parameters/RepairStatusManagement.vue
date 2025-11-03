<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRepairStatusStore } from '@/stores/repair.status'
import { formatDateTime } from '@/utils/dateUtils'
import { useRouter } from 'vue-router'
import { PERMISSIONS } from '@/utils/permissions'
import { useAuthStore } from '@/stores/auth'
import { mdiPencil, mdiDelete  } from '@mdi/js'

const statusStore = useRepairStatusStore()
const router = useRouter()
const authStore = useAuthStore()
const hasWriteStatusPermission = computed(() => authStore.canModify(PERMISSIONS.REPAIR_STATUS_MANAGEMENT))

// 搜尋表單
const searchForm = reactive({
  name: ''
})

// 狀態管理
const isLoading = ref(false)
const isSaving = ref(false)
const isLoadingDetail = ref(false)

// Modal 顯示狀態
const showCreateModal = ref(false)
const showEditModal = ref(false)

// 表單資料
const createForm = reactive({
  name: ''
})

const editForm = reactive({
  name: ''
})

// 表單錯誤
const createErrors = ref({})
const editErrors = ref({})

// 目前編輯的維修狀態
const currentEditStatus = ref(null)

// 分頁和排序
const currentPage = ref(1)
const pageSize = ref(10)
const sortConfig = ref({
  field: 'sequence',
  order: 'asc'
})

// 維修狀態列表資料
const statusData = ref([])
const totalItems = ref(0)
const totalPages = ref(0)

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
  
  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
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
  
  return pages
})

// 載入維修狀態列表
const loadStatusList = async () => {
  try {
    isLoading.value = true
    
    await statusStore.fetchStatuses(
      searchForm,
      sortConfig.value.field,
      sortConfig.value.order.toLowerCase(),
      pageSize.value,
      currentPage.value
    )
    
    statusData.value = statusStore.statuses?.data?.data || []
    totalItems.value = statusStore.statuses?.data?.total || 0
    totalPages.value = statusStore.statuses?.data?.totalPages || 0
    
  } catch (error) {
    //console.error('載入維修狀態列表失敗:', error)
    statusData.value = []
    totalItems.value = 0
    totalPages.value = 0
  } finally {
    isLoading.value = false
  }
}

// 搜尋處理
const handleSearch = async () => {
  currentPage.value = 1
  await loadStatusList()
}
// 重置搜尋
const handleReset = () => {
  searchForm.name = ''
  currentPage.value = 1
  loadStatusList()
}

const editStatus = (item) => {
  if (!hasWriteStatusPermission.value) return
  router.push(`/settings/parameter/repair-status/edit/${item.id}`)
}
// 分頁大小變更
const handlePageSizeChange = async () => {
  currentPage.value = 1
  await loadStatusList()
}

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
  
  await loadStatusList()
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
    await loadStatusList()
  }
}


// 刪除維修狀態
const deleteStatus = async (item) => {
  const confirmMessage = `確定要刪除維修狀態「${item.name}」嗎？\n\n此操作無法復原。`
  
  if (!confirm(confirmMessage)) {
    return
  }
  
  try {
    const result = await statusStore.deleteStatus(item.id)
    
    if (result.success) {
      alert('刪除成功！')
      await loadStatusList()
    } else {
      //console.error('刪除失敗:', result.message)
      alert(`刪除失敗: ${result.message}`)
    }
  } catch (error) {
    //console.error('刪除異常:', error)
    alert('刪除時發生錯誤，請稍後再試')
  }
}

const createRepairStatus = () => {
  if (!hasWriteStatusPermission.value) return
  router.push('/settings/parameter/repair-status/create')
}
// 組件掛載
onMounted(async () => {
  await loadStatusList()
})
</script>

<template>
  <div class="status-management-page">
    <div class="page-header">
      <div class="search-section">
        <div class="search-input-group">
          <input
            v-model="searchForm.name"
            type="text"
            placeholder="輸入維修狀態"
            class="search-input"
            @keyup.enter="handleSearch"
          />
          <button 
            class="search-btn"
            @click="handleSearch"
            :disabled="isLoading"
          >
            查詢
          </button>
          <button class="reset-btn" @click="handleReset" :disabled="isLoading">重置</button>
        </div>
      </div>
      
      
    </div>

    <div class="table-section">
      <div class="table-controls">
        <select 
          v-model="pageSize" 
          @change="handlePageSizeChange" 
          class="page-size-select"
        >
          <option value="10">10筆/頁</option>
          <option value="20">20筆/頁</option>
          <option value="50">50筆/頁</option>
        </select>
        <button 
          class="add-btn"
          @click="createRepairStatus"
          v-if="hasWriteStatusPermission"
        >
          新增維修狀態
        </button>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th class="id-column">項次</th>
              <th 
                class="name-column sortable-header" 
                :class="getSortClass('name')"
                @click="handleSort('name')"
              >
                維修狀態名稱
                <span class="sort-icon">{{ getSortIcon('name') }}</span>
              </th>
              <th 
                class="time-column sortable-header" 
                :class="getSortClass('updated_at')"
                @click="handleSort('updated_at')"
              >
                更新時間
                <span class="sort-icon">{{ getSortIcon('updated_at') }}</span>
              </th>
              <th class="action-column" v-if="hasWriteStatusPermission">編輯/刪除</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoading">
              <td colspan="4" class="loading-cell">
                <div class="loading-spinner">⟳</div>
                載入中...
              </td>
            </tr>
            
            <tr 
              v-else
              v-for="(item, index) in statusData" 
              :key="item.id" 
              class="table-row"
            >
              <td class="id-cell">{{ (currentPage - 1) * pageSize + index + 1 }}</td>
              <td class="name-cell">{{ item.name }}</td>
              <td class="time-cell">{{ formatDateTime(item.updated_at) || formatDateTime(item.created_at) }}</td>
              <td class="action-cell" v-if="hasWriteStatusPermission">
                <button 
                  class="edit-btn"
                  @click="editStatus(item)"
                  title="編輯"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path :d="mdiPencil" fill="currentColor"></path>
                  </svg>
                </button>
                <button 
                  class="delete-btn"
                  @click="deleteStatus(item)"
                  title="刪除"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path :d="mdiDelete" fill="currentColor"></path>
                  </svg>
                </button>
              </td>
            </tr>
            
            <tr v-if="!isLoading && statusData.length === 0">
              <td colspan="4" class="no-data">暫無資料</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分頁控制 -->
      <div class="pagination-area">
        <div class="pagination-info">
          顯示第 {{ startItem }} 到 {{ endItem }} 筆結果 共 {{ totalItems }} 項
        </div>

        <div class="pagination-controls">
          <button 
            class="page-btn prev-btn" 
            :disabled="currentPage === 1"
            @click="goToPage(currentPage - 1)"
          >
            ‹
          </button>
          
          <template v-for="page in visiblePages" :key="page">
            <button 
              v-if="page !== '...'"
              :class="['page-btn', { active: page === currentPage }]"
              @click="goToPage(page)"
            >
              {{ page }}
            </button>
            <span v-else class="ellipsis">...</span>
          </template>
          
          <button 
            class="page-btn next-btn" 
            :disabled="currentPage === totalPages"
            @click="goToPage(currentPage + 1)"
          >
            ›
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style lang="scss" scoped>
.status-management-page {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.search-section {
  flex: 1;
  max-width: 500px;

  .search-input-group {
    display: flex;
    gap: 10px;

    .search-input {
      flex: 1;
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

      &::placeholder {
        color: #999;
      }
    }

    .search-btn {
      padding: 12px 20px;
      background: #6c5ce7;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s;
      white-space: nowrap;

      &:hover:not(:disabled) {
        background: #5b4bcf;
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none !important;
      }
    }
    .reset-btn {
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
          background: #f8f9fa;
          color: #ccc;
          cursor: not-allowed;
        }
      }
  }
}

.add-btn {
  background: #6c5ce7;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;

  &:hover:not(.disabled) {
    background: #5b4bcf;
    transform: translateY(-1px);
  }

  &.disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
    pointer-events: none;
  }
}

.table-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 1px solid #f0f0f0;

  .page-size-select {
    padding: 8px 15px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    background: white;
    cursor: pointer;
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

        &.id-column {
          width: 80px;
          text-align: center;
        }

        &.action-column {
          width: 150px;
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
        transition: all 0.2s;

        &:hover {
          background: #f8f9fa;
        }

        td {
          padding: 15px 20px;
          font-size: 14px;
          color: #333;

          &.id-cell {
            text-align: center;
            font-weight: 500;
            color: #666;
          }

          &.action-cell {
            text-align: center;
          }
        }
      }

      .loading-cell {
        text-align: center;
        padding: 40px;
        color: #666;

        .loading-spinner {
          display: inline-block;
          animation: spin 1s linear infinite;
          font-size: 24px;
          margin-right: 10px;
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

.edit-btn, .delete-btn, .top-btn {
  background: #f8f9fa;
  border: none;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  color: #666;
  transition: all 0.2s;
  margin: 0 2px;

  &:hover {
    transform: scale(1.1);
  }
}
.delete-btn:hover{
  background: #ffebee;
      color: #d32f2f;

}
.edit-btn:hover {
  background: #fff3e0;
    box-shadow: none;
    color: #f57c00;
}

.delete-btn:hover {
  background: #ffebee;
  color: #d32f2f;
}

.top-btn:hover {
  background: #e8f5e8;
  color: #27ae60;
}

// Loading 動畫
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// 分頁樣式
.pagination-area {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-top: 1px solid #f0f0f0;

  .pagination-info {
    font-size: 14px;
    color: #666;
  }

  .pagination-controls {
    display: flex;
    gap: 5px;

    .page-btn {
      padding: 8px 12px;
      border: 1px solid #ddd;
      background: white;
      color: #333;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;

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

// 響應式設計
@media (max-width: 768px) {
  .status-management-page {
    padding: 15px;
  }

  .page-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }

  .search-section {
    max-width: none;
  }

  .data-table {
    th, td {
      padding: 10px 15px;
      font-size: 13px;
    }
  }

  .pagination-area {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }

  .action-cell {
    .edit-btn, .delete-btn, .top-btn {
      padding: 4px 8px;
      font-size: 14px;
    }
  }

  .modal-content {
    width: 95%;
    margin: 20px;
  }

  .modal-footer {
    flex-direction: column;

    .btn {
      width: 100%;
      justify-content: center;
    }
  }
}
</style>
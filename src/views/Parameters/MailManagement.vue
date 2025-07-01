<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMailStore } from '@/stores/mail'
import { useAuthStore } from '@/stores/auth'
import { PERMISSIONS, checkPermission } from '@/utils/permissions'
import { formatDate, formatDateTime } from '@/utils/dateUtils'

const authStore = useAuthStore()
const router = useRouter()
const mailStore = useMailStore()
const hasFullPermission = computed(() => authStore.canModify(PERMISSIONS.MAIL_MANAGEMENT));

// 搜尋表單
const searchForm = reactive({
  keyword: '',
  email: ''
})

// 排序設定
const sortConfig = ref({
  field: 'created_at',
  order: 'ASC'
})

// 分頁設定
const currentPage = ref(1)
const pageSize = ref(10)
const totalItems = ref(0)

// 載入狀態
const isLoading = ref(false)

// 頁面大小選項
const pageSizeOptions = ref([
  { value: 1, label: '1筆/頁' },
  { value: 10, label: '10筆/頁' },
  { value: 20, label: '20筆/頁' },
  { value: 50, label: '50筆/頁' },
  { value: 100, label: '100筆/頁' }
])

// 系統信箱資料
const mailboxData = ref([])

// 計算屬性
const totalPages = computed(() => {
  return Math.ceil(totalItems.value / pageSize.value)
})

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

// 載入資料
const loadData = async () => {
  try {
    isLoading.value = true
    const params = {
      mailId: searchForm.keyword,
      email: searchForm.email || searchForm.keyword,
      pageSize: pageSize.value,
      page: currentPage.value,
      sortBy: sortConfig.value.field,
      sortOrder: sortConfig.value.order
    }
    
    console.log('載入參數:', params)
    
    const response = await mailStore.fetchMails(params)
    
    if (response && response.data) {
      mailboxData.value = response.data.data || []
      totalItems.value = response.data.total || 0
    }
    
    isLoading.value = false
  } catch (error) {
    console.error('載入資料失敗:', error)
    isLoading.value = false
    // 可以在這裡顯示錯誤訊息
  }
}

// 搜尋
const handleSearch = async () => {
  currentPage.value = 1
  console.log('執行搜尋:', searchForm)
  await loadData()
}

// 重置搜尋
const handleReset = () => {
  searchForm.keyword = ''
  searchForm.email = ''
  currentPage.value = 1
  loadData()
}

// 分頁大小變更
const handlePageSizeChange = async () => {
  currentPage.value = 1
  console.log('分頁大小變更:', pageSize.value)
  await loadData()
}

// 跳轉頁面
const goToPage = async (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    await loadData()
  }
}

// 排序功能
const handleSort = (field) => {
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
  
  loadData()
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

// 新增信箱
const addMailbox = () => {
    if (!hasFullPermission.value) {
        alert('您沒有權限新增系統信箱')
        return
    }
  console.log('新增系統信箱')
  // 可以導航到新增頁面或開啟彈窗
  router.push('/settings/parameter/mail-management/create')
}

// 編輯信箱
const editMailbox = (item) => {
  console.log('編輯信箱:', item)
  // 可以導航到編輯頁面或開啟彈窗
  router.push(`/settings/parameter/mail-management/edit/${item.id}`)
}

// 刪除信箱
const deleteMailbox = async (item) => {
  if (confirm(`確定要刪除信箱 ${item.email} 嗎？`)) {
    try {
      await mailStore.deleteMail(item.id)
      console.log('刪除成功')
      // 重新載入資料
      await loadData()
    } catch (error) {
      console.error('刪除失敗:', error)
      // 可以在這裡顯示錯誤訊息
    }
  }
}

// 測試信箱連接
const testMailConnection = async (item) => {
  try {
    const result = await mailStore.testMailConnection(item.id)
    console.log('測試結果:', result)
    if(result.statusCode === 202){
      alert(result.message)
    }else{
      alert('測試失敗: ' + result.message)
    }
    // 可以在這裡顯示測試結果
  } catch (error) {
    console.error('測試失敗:', error)
    alert('測試信箱連接失敗')
  }
}

// 監聽分頁大小變更
watch(pageSize, async (newSize) => {
  console.log('分頁大小變更:', newSize)
  currentPage.value = 1
  await loadData()
})

// 元件掛載時載入資料
onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="mailbox-management">
    <!-- 頂部控制區域 -->
    <div class="top-controls">
      <!-- 左側搜尋區域 -->
      <div class="search-area">
        <div class="search-field">
          <input 
            type="text" 
            v-model="searchForm.keyword"
            placeholder="輸入信箱帳號"
            class="search-input"
            @keyup.enter="handleSearch"
          />
          <button class="search-btn" @click="handleSearch">
            🔍
          </button>
        </div>
        
        <button class="query-btn" @click="handleSearch">
          查詢
        </button>
        
        <button class="reset-btn" @click="handleReset">
          重置
        </button>
      </div>

      <!-- 右側按鈕 -->
      <div class="right-controls">
        <button class="add-btn" @click="addMailbox" v-if="hasFullPermission">
          新增系統信箱
        </button>
      </div>
    </div>

    <!-- 分頁大小選擇器 -->
    <div class="page-size-control">
      <select v-model="pageSize" @change="handlePageSizeChange" class="page-size-select">
        <option v-for="option in pageSizeOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </div>

    <!-- 資料表格區域 -->
    <section class="table-section">
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th class="id-column">項次</th>
              <th 
                class="email-column sortable-header" 
                :class="getSortClass('email')"
                @click="handleSort('email')"
              >
                信箱帳號
                <span class="sort-icon">{{ getSortIcon('email') }}</span>
              </th>
              <th 
                class="time-column sortable-header" 
                :class="getSortClass('updated_at')"
                @click="handleSort('updated_at')"
              >
                更新時間
                <span class="sort-icon">{{ getSortIcon('updated_at') }}</span>
              </th>
              <th class="action-column">操作</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading 狀態 -->
            <tr v-if="isLoading" class="loading-row">
              <td colspan="4" class="loading-cell">
                <div class="loading-container">
                  <div class="loading-spinner">⟳</div>
                  <div class="loading-text">資料載入中...</div>
                </div>
              </td>
            </tr>
            
            <!-- 正常資料顯示 -->
            <tr v-else v-for="(item, index) in mailboxData" :key="item.id" class="table-row">
              <td class="id-cell">{{ (currentPage - 1) * pageSize + index + 1 }}</td>
              <td class="email-cell">{{ item.email }}</td>
              <td class="time-cell">{{ formatDateTime(item.updated_at) || formatDateTime(item.created_at) }}</td>
              <td class="action-cell">
                <div class="action-buttons">
                  <button 
                    class="action-btn edit-btn" 
                    @click="editMailbox(item)"
                    title="編輯"
                  >
                    ✏️
                  </button>
                  <button 
                    class="action-btn test-btn" 
                    @click="testMailConnection(item)"
                    title="測試連接"
                  >
                    🔗
                  </button>
                </div>
              </td>
            </tr>
            
            <!-- 無資料狀態 -->
            <tr v-if="!isLoading && mailboxData.length === 0">
              <td colspan="4" class="no-data">暫無資料</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 底部分頁區域 -->
    <div class="pagination-area">
      <!-- 左側統計信息 -->
      <div class="pagination-info">
        <span v-if="isLoading">載入中...</span>
        <span v-else>顯示第 {{ startItem }} 到 {{ endItem }} 筆結果 共 {{ totalItems }} 項</span>
      </div>

      <!-- 右側分頁控制 -->
      <div class="pagination-controls">
        <button 
          class="page-btn prev-btn" 
          :disabled="currentPage === 1 || isLoading"
          @click="goToPage(currentPage - 1)"
        >
          ‹
        </button>
        
        <template v-for="page in visiblePages" :key="page">
          <button 
            v-if="page !== '...'"
            :class="['page-btn', { active: page === currentPage }]"
            :disabled="isLoading"
            @click="goToPage(page)"
          >
            {{ page }}
          </button>
          <span v-else class="ellipsis">...</span>
        </template>
        
        <button 
          class="page-btn next-btn" 
          :disabled="currentPage === totalPages || isLoading"
          @click="goToPage(currentPage + 1)"
        >
          ›
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.mailbox-management {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

// Loading 動畫
.loading-spinner {
  display: inline-block;
  animation: spin 1s linear infinite;
  font-size: 24px;
  color: #6c5ce7;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #666;
}

.loading-text {
  margin-top: 12px;
  font-size: 14px;
  color: #666;
}

.loading-row {
  .loading-cell {
    border: none;
    background: #f8f9fa;
  }
}

// 頂部控制區域
.top-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 20px;

  .search-area {
    display: flex;
    align-items: center;
    gap: 15px;

    .search-field {
      position: relative;
      width: 300px;

      .search-input {
        width: 100%;
        padding: 10px 40px 10px 15px;
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
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        cursor: pointer;
        font-size: 16px;
        color: #666;
        transition: color 0.3s;

        &:hover {
          color: #6c5ce7;
        }
      }
    }

    .query-btn, .reset-btn {
      padding: 10px 25px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s;
      white-space: nowrap;
      border: none;
    }

    .query-btn {
      background: #6c5ce7;
      color: white;

      &:hover {
        background: #5b4bcf;
        transform: translateY(-1px);
      }
    }

    .reset-btn {
      background: #f8f9fa;
      color: #666;
      border: 1px solid #ddd;

      &:hover {
        background: #e9ecef;
        border-color: #adb5bd;
      }
    }
  }

  .right-controls {
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
      white-space: nowrap;

      &:hover {
        background: #5b4bcf;
        transform: translateY(-1px);
      }
    }
  }
}

// 分頁大小控制
.page-size-control {
  margin-bottom: 20px;

  .page-size-select {
    padding: 8px 15px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    background: white;
    cursor: pointer;
    transition: border-color 0.3s;

    &:focus {
      outline: none;
      border-color: #6c5ce7;
    }
  }
}

// 表格區域
.table-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 20px;

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
          position: relative;

          &.id-column {
            width: 100px;
            text-align: center;
          }

          &.email-column {
            text-align: left;
          }

          &.time-column {
            width: 200px;
            text-align: left;
          }

          &.action-column {
            width: 150px;
            text-align: center;
          }

          &.sortable-header {
            cursor: pointer;
            user-select: none;
            transition: all 0.2s;

            &:hover {
              background: rgba(255, 255, 255, 0.1);
            }

            &.sorted-asc {
              background: rgba(255, 255, 255, 0.15);
            }

            &.sorted-desc {
              background: rgba(255, 255, 255, 0.15);
            }

            .sort-icon {
              margin-left: 8px;
              font-size: 12px;
              opacity: 0.7;
              transition: opacity 0.2s;
            }

            &:hover .sort-icon {
              opacity: 1;
            }

            &.sorted-asc .sort-icon,
            &.sorted-desc .sort-icon {
              opacity: 1;
              font-weight: bold;
            }
          }
        }
      }

      tbody {
        .table-row {
          border-bottom: 1px solid #f0f0f0;
          transition: background-color 0.2s;

          &:hover {
            background: #f8f9fa;
          }

          &:last-child {
            border-bottom: none;
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

            &.email-cell {
              text-align: left;
              color: #333;
            }

            &.time-cell {
              text-align: left;
              color: #666;
            }

            &.action-cell {
              text-align: center;
              padding: 10px 20px;
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
}

// 操作按鈕樣式
.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;

  .action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
    background: #f8f9fa;
    color: #666;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    &.edit-btn {
      &:hover {
        background: #fff3e0;
        color: #f57c00;
      }
    }

    &.test-btn {
      &:hover {
        background: #e3f2fd;
        color: #1976d2;
      }
    }

    &.delete-btn {
      &:hover {
        background: #ffebee;
        color: #d32f2f;
      }
    }
  }
}

// 底部分頁區域
.pagination-area {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 15px 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  .pagination-info {
    font-size: 14px;
    color: #666;
  }

  .pagination-controls {
    display: flex;
    gap: 5px;
    align-items: center;

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
        border-color: #eee;
      }

      &.prev-btn,
      &.next-btn {
        font-weight: bold;
      }
    }

    .ellipsis {
      padding: 8px 4px;
      color: #666;
    }
  }
}

// 響應式設計
@media (max-width: 768px) {
  .top-controls {
    flex-direction: column;
    gap: 15px;

    .search-area {
      width: 100%;
      flex-direction: column;
      gap: 10px;

      .search-field {
        width: 100%;
      }

      .query-btn, .reset-btn {
        width: 100%;
      }
    }

    .right-controls {
      width: 100%;

      .add-btn {
        width: 100%;
      }
    }
  }

  .pagination-area {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }

  .data-table {
    th, td {
      padding: 10px 15px;
      font-size: 13px;
    }

    .id-column,
    .time-column,
    .action-column {
      width: auto;
    }
  }

  .action-buttons {
    gap: 4px;
    
    .action-btn {
      width: 28px;
      height: 28px;
      font-size: 12px;
    }
  }
}

// 小螢幕優化
@media (max-width: 480px) {
  .mailbox-management {
    padding: 15px;
  }

  .data-table {
    th, td {
      padding: 8px 10px;
      font-size: 12px;
    }

    .email-cell {
      word-break: break-all;
    }
  }

  .pagination-controls {
    .page-btn {
      padding: 6px 10px;
      font-size: 12px;
      min-width: 32px;
    }
  }
}
</style>
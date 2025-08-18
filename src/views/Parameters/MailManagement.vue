<script setup>
import { ref, computed, reactive, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMailStore } from '@/stores/mail'
import { useAuthStore } from '@/stores/auth'
import { PERMISSIONS, checkPermission } from '@/utils/permissions'
import { formatDate, formatDateTime } from '@/utils/dateUtils'
import { mdiOpenInNew, mdiMagnify, mdiLinkVariant } from '@mdi/js'

const authStore = useAuthStore()
const router = useRouter()
const mailStore = useMailStore()
const hasFullPermission = computed(() => authStore.canModify(PERMISSIONS.MAIL_MANAGEMENT));

// 響應式視窗寬度監聽
const windowWidth = ref(window.innerWidth)

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
const isSearching = ref(false)

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

// 響應式計算屬性 - 判斷是否為手機模式
const isMobile = computed(() => windowWidth.value <= 767)
const isTablet = computed(() => windowWidth.value > 767 && windowWidth.value <= 991)
const isDesktop = computed(() => windowWidth.value > 991)

// 視窗尺寸變化處理器
const handleResize = () => {
  windowWidth.value = window.innerWidth
}

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

const showEllipsis = computed(() => {
  return totalPages.value > 5 && currentPage.value < totalPages.value - 2
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
  isSearching.value = true
  console.log('執行搜尋:', searchForm)
  await loadData()
  isSearching.value = false
}

// 重置搜尋
const handleReset = async () => {
  searchForm.keyword = ''
  searchForm.email = ''
  currentPage.value = 1
  await loadData()
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
  router.push('/settings/parameter/mail-management/create')
}

// 檢視信箱
const editMailbox = (item) => {
  console.log('檢視信箱:', item)
  router.push(`/settings/parameter/mail-management/edit/${item.id}`)
}

// 刪除信箱
const deleteMailbox = async (item) => {
  if (confirm(`確定要刪除信箱 ${item.email} 嗎？`)) {
    try {
      await mailStore.deleteMail(item.id)
      console.log('刪除成功')
      await loadData()
    } catch (error) {
      console.error('刪除失敗:', error)
    }
  }
}

// 測試信箱連接
const testMailConnection = async (item) => {
  if(!hasFullPermission.value) {
    alert('您沒有權限測試信箱連接')
    return
  }
  try {
    const result = await mailStore.testMailConnection(item.id)
    console.log('測試結果:', result)
    if(result.statusCode === 202){
      alert(result.message)
    }else{
      alert('測試失敗: ' + result.message)
    }
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
  // 添加視窗尺寸監聽器
  window.addEventListener('resize', handleResize)
  loadData()
})

// 清理函數
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="mailbox-management">
    <!-- 搜尋區域 -->
    <section class="search-section">
      <div class="search-row">
        <div class="search-field">
          <input 
            type="text" 
            v-model="searchForm.keyword"
            placeholder="輸入信箱帳號"
            class="search-input"
            @keyup.enter="handleSearch"
            :disabled="isLoading"
          />
          <button class="search-btn" @click="handleSearch" :disabled="isLoading || isSearching">
            <span v-if="isSearching" class="loading-spinner">⟳</span>
            <svg v-else width="16" height="16" viewBox="0 0 24 24">
              <path :d="mdiMagnify" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        
        <div class="action-buttons">
          <button class="query-btn" @click="handleSearch" :disabled="isLoading || isSearching">
            <span v-if="isSearching" class="loading-spinner">⟳</span>
            <span v-else>查詢</span>
          </button>
          <button class="reset-btn" @click="handleReset" :disabled="isLoading">重置</button>
        </div>
      </div>
    </section>

    <!-- 資料表格區域 -->
    <section class="table-section">
      <div class="table-controls">
        <div class="pagination-control">
          <select v-model="pageSize" class="page-size-select" :disabled="isLoading">
            <option v-for="option in pageSizeOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
        
        <button 
          v-if="hasFullPermission" 
          class="add-mailbox-btn" 
          @click="addMailbox" 
          :class="{ disabled: isLoading }" 
          :disabled="isLoading"
        >
          新增系統信箱
        </button>
      </div>

      <!-- 資料表格 - 桌面版 -->
      <div class="table-container" v-if="!isMobile">
        <table class="data-table">
          <thead>
            <tr>
              <th>項次</th>
              <th 
                class="sortable" 
                @click="!isLoading && handleSort('email')"
                :class="getSortClass('email')"
              >
                信箱帳號
                <span class="sort-icon" v-if="sortConfig.field === 'email'">
                  <span v-if="sortConfig.order === 'ASC'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th 
                class="sortable" 
                @click="!isLoading && handleSort('updated_at')"
                :class="getSortClass('updated_at')"
              >
                更新時間
                <span class="sort-icon" v-if="sortConfig.field === 'updated_at'">
                  <span v-if="sortConfig.order === 'ASC'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading 狀態 -->
            <tr v-if="isLoading" class="loading-row">
              <td colspan="4" class="loading-cell">
                <div class="loading-container">
                  <div class="loading-spinner large">⟳</div>
                  <div class="loading-text">資料載入中...</div>
                </div>
              </td>
            </tr>
            
            <!-- 搜尋中狀態 -->
            <tr v-else-if="isSearching" class="loading-row">
              <td colspan="4" class="loading-cell">
                <div class="loading-container">
                  <div class="loading-spinner large">⟳</div>
                  <div class="loading-text">搜尋中...</div>
                </div>
              </td>
            </tr>
            
            <!-- 正常資料顯示 -->
            <tr v-else v-for="(item, index) in mailboxData" :key="item.id" class="table-row">
              <td>{{ (currentPage - 1) * pageSize + index + 1 }}</td>
              <td>{{ item.email }}</td>
              <td>{{ formatDateTime(item.updated_at) || formatDateTime(item.created_at) }}</td>
              <td>
                <div class="action-buttons">
                  <button 
                    class="action-btn view-btn" 
                    @click="editMailbox(item)"
                    title="檢視"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24">
                      <path :d="mdiOpenInNew" fill="currentColor"></path>
                    </svg>
                  </button>
                  <button 
                    v-if="hasFullPermission"
                    class="action-btn test-btn" 
                    @click="testMailConnection(item)"
                    title="測試連接"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24">
                      <path :d="mdiLinkVariant" fill="currentColor"></path>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
            
            <!-- 無資料狀態 -->
            <tr v-if="!isLoading && !isSearching && mailboxData.length === 0">
              <td colspan="4" class="no-data">暫無資料</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 手機版卡片式佈局 -->
      <div class="mobile-cards" v-else>
        <!-- Loading 狀態 -->
        <div v-if="isLoading" class="loading-container">
          <div class="loading-spinner large">⟳</div>
          <div class="loading-text">資料載入中...</div>
        </div>
        
        <!-- 搜尋中狀態 -->
        <div v-else-if="isSearching" class="loading-container">
          <div class="loading-spinner large">⟳</div>
          <div class="loading-text">搜尋中...</div>
        </div>
        
        <!-- 正常資料顯示 -->
        <div v-else v-for="(item, index) in mailboxData" :key="item.id" class="mobile-card">
          <div class="card-header">
            <div class="card-title">{{ item.email }}</div>
            <div class="card-index">#{{ (currentPage - 1) * pageSize + index + 1 }}</div>
          </div>
          <div class="card-content">
            <div class="card-field">
              <span class="field-label">信箱帳號：</span>
              <span class="field-value">{{ item.email }}</span>
            </div>
            <div class="card-field">
              <span class="field-label">更新時間：</span>
              <span class="field-value">{{ formatDateTime(item.updated_at) || formatDateTime(item.created_at) }}</span>
            </div>
          </div>
          <div class="card-actions">
            <button 
              class="mobile-action-btn view-btn" 
              @click="editMailbox(item)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path :d="mdiOpenInNew" fill="currentColor"></path>
              </svg>
            </button>
            <button 
              v-if="hasFullPermission"
              class="mobile-action-btn test-btn" 
              @click="testMailConnection(item)"
            >
              🔗 測試連接
            </button>
          </div>
        </div>
        
        <!-- 無資料狀態 -->
        <div v-if="!isLoading && !isSearching && mailboxData.length === 0" class="no-data-mobile">
          <div class="no-data-icon">📧</div>
          <div class="no-data-text">暫無信箱資料</div>
        </div>
      </div>

      <!-- 分頁控制 -->
      <div class="pagination-section" :class="{ disabled: isLoading }">
        <div class="pagination-info">
          <span v-if="isLoading">載入中...</span>
          <span v-else>顯示第 {{ startItem }} 到 {{ endItem }} 筆結果 共 {{ totalItems }} 項</span>
        </div>
        
        <div class="pagination-controls">
          <button 
            class="page-btn" 
            :disabled="currentPage === 1 || isLoading"
            @click="goToPage(currentPage - 1)"
          >
            ‹
          </button>
          
          <button 
            v-for="page in visiblePages" 
            :key="page"
            :class="['page-btn', { active: page === currentPage }]"
            :disabled="isLoading"
            @click="goToPage(page)"
          >
            {{ page }}
          </button>
          
          <span v-if="showEllipsis" class="ellipsis">...</span>
          
          <button 
            v-if="totalPages > 5"
            :class="['page-btn', { active: totalPages === currentPage }]"
            :disabled="isLoading"
            @click="goToPage(totalPages)"
          >
            {{ totalPages }}
          </button>
          
          <button 
            class="page-btn" 
            :disabled="currentPage === totalPages || isLoading"
            @click="goToPage(currentPage + 1)"
          >
            ›
          </button>
        </div>
      </div>
    </section>
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
  
  &.large {
    font-size: 24px;
  }
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

// 搜尋區域
.search-section {
  background: white;
  padding: 25px 30px;
  margin-bottom: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  .search-row {
    display: flex;
    gap: 20px;
    align-items: end;

    .search-field {
      position: relative;
      flex: 1;

      .search-input {
        width: 100%;
        padding: 12px 45px 12px 15px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        transition: border-color 0.3s;
        
        &:focus {
          outline: none;
          border-color: #6c5ce7;
          box-shadow: 0 0 0 2px rgba(108, 92, 231, 0.1);
        }

        &:disabled {
          background-color: #f8f9fa;
          color: #999;
          cursor: not-allowed;
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
svg {
        transition: all 0.3s;
      }

      &:hover:not(:disabled) {
        color: #6c5ce7;
        svg {
          transform: scale(1.1);
        }

      }

      &:disabled {
        color: #ccc;
        cursor: not-allowed;
        svg {
          transform: none;
        }
      }
      }
    }

    .action-buttons {
      display: flex;
      gap: 10px;

      .query-btn {
        background: #6c5ce7;
        color: white;
        border: none;
        padding: 12px 30px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s;
        display: flex;
        align-items: center;
        gap: 8px;

        &:hover:not(:disabled) {
          background: #5b4bcf;
          transform: translateY(-1px);
        }

        &:disabled {
          background: #ccc;
          cursor: not-allowed;
          transform: none;
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
}

// 表格區域
.table-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;

  .table-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 25px;
    border-bottom: 1px solid #f0f0f0;

    .page-size-select {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;

      &:disabled {
        background-color: #f8f9fa;
        color: #999;
        cursor: not-allowed;
      }
    }

    .add-mailbox-btn {
      background: #6c5ce7;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s;
      text-decoration: none;

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
  }

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

          &.sortable {
            cursor: pointer;
            user-select: none;
            transition: background-color 0.3s;

            &:hover {
              background: rgba(255, 255, 255, 0.1);
            }

            .sort-icon {
              margin-left: 8px;
              opacity: 1;
              transition: all 0.3s;
              color: #fff;
              font-size: 14px;
              
              &.neutral {
                opacity: 0.5;
              }
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

          td {
            padding: 15px 20px;
            font-size: 14px;
            color: #333;
          }
        }

        .no-data {
          text-align: center;
          padding: 40px;
          color: #999;
          font-style: italic;
        }
        
        .action-buttons {
          display: flex;
          gap: 8px;
          justify-content: center;
          
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
            svg {
              transition: all 0.2s;
            }
            &:hover {
              transform: translateY(-1px);
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              svg {
                transform: scale(1.1);
              }

            }

            &.view-btn {
              &:hover {
                background: #fff3e0;
                color: #f57c00;
              }
            }

            &.test-btn {
              background: #e8f5e9;
              color: #2e7d32;

              &:hover {
                background: #e3f2fd;
                color: #1976d2;
              }
            }
          }
        }
      }
    }
  }
}

// 手機版卡片式佈局
.mobile-cards {
  padding: 20px;

  .mobile-card {
    background: white;
    border-radius: 8px;
    margin-bottom: 16px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.3s;

    &:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
    }

    &:last-child {
      margin-bottom: 0;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #f0f0f0;

      .card-title {
        font-size: 16px;
        font-weight: 600;
        color: #333;
        line-height: 1.4;
        flex: 1;
        margin-right: 12px;
        word-break: break-all;
      }

      .card-index {
        font-size: 12px;
        color: #6c5ce7;
        background: rgba(108, 92, 231, 0.1);
        padding: 4px 8px;
        border-radius: 12px;
        font-weight: 500;
        flex-shrink: 0;
      }
    }

    .card-content {
      margin-bottom: 12px;

      .card-field {
        display: flex;
        margin-bottom: 8px;
        align-items: flex-start;

        &:last-child {
          margin-bottom: 0;
        }

        .field-label {
          font-size: 13px;
          color: #666;
          min-width: 80px;
          flex-shrink: 0;
          font-weight: 500;
        }

        .field-value {
          font-size: 13px;
          color: #333;
          flex: 1;
          word-break: break-word;
        }
      }
    }

    .card-actions {
      display: flex;
      gap: 8px;
      padding-top: 12px;
      border-top: 1px solid #f0f0f0;

      .mobile-action-btn {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        background: white;
        color: #666;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;

        &.view-btn {
          &:hover {
            background: #fff3e0;
            color: #f57c00;
            border-color: #f57c00;
          }
        }

        &.test-btn {
          &:hover {
            background: #e3f2fd;
            color: #1976d2;
            border-color: #1976d2;
          }
        }
      }
    }
  }

  .no-data-mobile {
    text-align: center;
    padding: 60px 20px;
    color: #999;

    .no-data-icon {
      font-size: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .no-data-text {
      font-size: 16px;
      font-style: italic;
    }
  }
}

// 分頁區域
.pagination-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  border-top: 1px solid #f0f0f0;

  &.disabled {
    opacity: 0.6;
    pointer-events: none;
  }

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

/* ===== 響應式設計 ===== */

/* 大螢幕 (1400px+) */
@media (min-width: 1400px) {
  .mailbox-management {
    padding: 24px;
  }

  .search-section {
    padding: 30px;
  }

  .table-section .table-controls {
    padding: 24px 30px;
  }

  .pagination-section {
    padding: 24px 30px;
  }
}

/* 平板橫向 (992px - 1399px) */
@media (max-width: 1399px) and (min-width: 992px) {
  .search-section {
    .search-row {
      .search-field {
        min-width: 300px;
      }
    }
  }

  .table-section {
    .data-table {
      th, td {
        padding: 12px 16px;
        font-size: 13px;
      }
    }
  }
}

/* 平板直向 (768px - 991px) */
@media (max-width: 991px) and (min-width: 768px) {
  .mailbox-management {
    padding: 16px;
  }

  .search-section {
    padding: 20px;

    .search-row {
      gap: 15px;

      .search-field {
        min-width: 250px;
      }

      .action-buttons {
        gap: 8px;

        .query-btn, .reset-btn {
          padding: 10px 20px;
          font-size: 13px;
        }
      }
    }
  }

  .table-section {
    .table-controls {
      padding: 16px 20px;
      gap: 12px;
    }

    .data-table {
      th, td {
        padding: 10px 12px;
        font-size: 12px;
      }

      th.sortable .sort-icon {
        font-size: 12px;
      }

      .action-buttons .action-btn {
        width: 28px;
        height: 28px;
        font-size: 12px;
      }
    }
  }

  .pagination-section {
    padding: 16px 20px;
    flex-direction: column;
    gap: 12px;
    text-align: center;

    .pagination-controls {
      justify-content: center;
    }
  }
}

/* 大手機 (576px - 767px) */
@media (max-width: 767px) {
  .mailbox-management {
    padding: 12px;
  }

  .search-section {
    padding: 16px;

    .search-row {
      flex-direction: column;
      gap: 12px;
      align-items: stretch;

      .search-field {
        width: 100%;
      }

      .action-buttons {
        flex-direction: row;
        gap: 8px;

        .query-btn,
        .reset-btn {
          flex: 1;
          padding: 12px 16px;
        }
      }
    }
  }

  .table-section {
    .table-controls {
      padding: 12px 16px;
      flex-direction: column;
      gap: 12px;
      align-items: stretch;

      .page-size-select {
        align-self: flex-start;
      }

      .add-mailbox-btn {
        width: 100%;
        padding: 12px;
      }
    }
  }

  .mobile-cards {
    padding: 12px;

    .mobile-card {
      padding: 12px;
      margin-bottom: 12px;

      .card-header {
        .card-title {
          font-size: 15px;
        }

        .card-index {
          font-size: 11px;
        }
      }

      .card-content .card-field {
        .field-label {
          font-size: 12px;
          min-width: 70px;
        }

        .field-value {
          font-size: 12px;
        }
      }

      .card-actions .mobile-action-btn {
        font-size: 11px;
        padding: 6px 10px;
      }
    }
  }

  .pagination-section {
    padding: 12px 16px;
    flex-direction: column;
    gap: 12px;

    .pagination-info {
      font-size: 12px;
      text-align: center;
    }

    .pagination-controls {
      justify-content: center;
      flex-wrap: wrap;

      .page-btn {
        padding: 6px 10px;
        font-size: 12px;
        min-width: 36px;
      }
    }
  }
}

/* 小手機 (480px 以下) */
@media (max-width: 479px) {
  .mailbox-management {
    padding: 8px;
  }

  .search-section {
    padding: 12px;
    margin-bottom: 12px;

    .search-row {
      gap: 10px;

      .search-field .search-input {
        padding: 10px 40px 10px 12px;
        font-size: 13px;
      }

      .action-buttons {
        .query-btn,
        .reset-btn {
          padding: 10px 12px;
          font-size: 13px;
        }
      }
    }
  }

  .table-section {
    .table-controls {
      padding: 10px 12px;

      .page-size-select {
        padding: 6px 10px;
        font-size: 12px;
      }

      .add-mailbox-btn {
        padding: 10px;
        font-size: 13px;
      }
    }
  }

  .mobile-cards {
    padding: 8px;

    .mobile-card {
      padding: 10px;
      margin-bottom: 10px;

      .card-header {
        margin-bottom: 10px;
        padding-bottom: 10px;

        .card-title {
          font-size: 14px;
          margin-right: 8px;
        }

        .card-index {
          font-size: 10px;
          padding: 2px 6px;
        }
      }

      .card-content .card-field {
        margin-bottom: 6px;

        .field-label {
          font-size: 11px;
          min-width: 60px;
        }

        .field-value {
          font-size: 11px;
        }
      }

      .card-actions {
        margin-top: 10px;
        padding-top: 10px;

        .mobile-action-btn {
          font-size: 10px;
          padding: 5px 8px;
        }
      }
    }

    .no-data-mobile {
      padding: 40px 16px;

      .no-data-icon {
        font-size: 36px;
        margin-bottom: 12px;
      }

      .no-data-text {
        font-size: 14px;
      }
    }
  }

  .pagination-section {
    padding: 10px 12px;

    .pagination-info {
      font-size: 11px;
    }

    .pagination-controls {
      gap: 3px;

      .page-btn {
        padding: 5px 8px;
        font-size: 11px;
        min-width: 32px;
      }
    }
  }
}

/* 超小螢幕 (360px 以下) */
@media (max-width: 359px) {
  .search-section {
    .search-row {
      .action-buttons {
        flex-direction: column;
      }
    }
  }

  .mobile-cards .mobile-card {
    .card-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;

      .card-index {
        align-self: flex-end;
      }
    }

    .card-content .card-field {
      flex-direction: column;
      gap: 2px;

      .field-label {
        min-width: auto;
        font-weight: 600;
      }
    }

    .card-actions {
      flex-direction: column;
      gap: 6px;

      .mobile-action-btn {
        width: 100%;
      }
    }
  }

  .pagination-controls {
    .page-btn {
      padding: 4px 6px;
      font-size: 10px;
      min-width: 28px;
    }
  }
}
</style>
<script setup>
import { ref, computed, reactive, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useLogStore } from '@/stores/log'
import { formatDateTime } from '@/utils/dateUtils'
import { mdiOpenInNew, mdiMagnify } from '@mdi/js'

const router = useRouter()
const logStore = useLogStore()

// 響應式視窗寬度監聽
const windowWidth = ref(window.innerWidth)

// 搜尋表單
const searchForm = reactive({
  credential: '',
  ip: '',
  requestStatusCode: '',
  response_status_code: '',
  level: '',
  logMsgCode: '',
  startAt: '',
  endAt: '',
  log_category: '',
  log_action: ''
})

// 分頁設定
const currentPage = ref(1)
const pageSize = ref(10)
const sortColumn = ref('created_at')
const sortDirection = ref('desc')

// 載入狀態
const isLoading = ref(true)
const isSearching = ref(false)

// 資料
const logData = ref([])
const totalItems = ref(0)
const totalPages = ref(0)

// 響應式計算屬性 - 判斷是否為手機模式
const isMobile = computed(() => windowWidth.value <= 767)
const isTablet = computed(() => windowWidth.value > 767 && windowWidth.value <= 991)
const isDesktop = computed(() => windowWidth.value > 991)

// 計算屬性 - 獲取模組選項
const categoryOptions = computed(() => {
  return logStore.getCategories()
})

// 計算屬性 - 獲取操作選項（根據選擇的模組）
const actionOptions = computed(() => {
  return logStore.getActionsByCategory(searchForm.log_category)
})

// 視窗尺寸變化處理器
const handleResize = () => {
  windowWidth.value = window.innerWidth
}

const startItem = computed(() => {
  return totalItems.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1
})

const endItem = computed(() => {
  const end = currentPage.value * pageSize.value
  return end > totalItems.value ? totalItems.value : end
})

const viewLog = (id) => {
  console.log('查看日誌詳情:', id)
  router.push(`/settings/view-log/${id}`)
}

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

const viewDetail = (item) => {
    console.log('查看詳情:', item.id)
    router.push(`/settings/log/${item.id}`)
}
const showEllipsis = computed(() => {
  return totalPages.value > 5 && currentPage.value < totalPages.value - 2
})

// 監聽模組選擇變化，當模組改變時清空操作選擇
watch(() => searchForm.log_category, (newCategory, oldCategory) => {
  if (newCategory !== oldCategory) {
    searchForm.log_action = ''
    console.log('模組變更:', newCategory, '清空操作選擇')
  }
})

// 方法
const handleSearch = async () => {
  currentPage.value = 1
  console.log('執行搜尋:', searchForm)
  await getLogData(searchForm, sortColumn.value, sortDirection.value, pageSize.value, currentPage.value)
}

// watch pageSize
watch(pageSize, async (newSize) => {
  console.log('分頁大小變更:', newSize)
  currentPage.value = 1
  await getLogData(searchForm, sortColumn.value, sortDirection.value, newSize, currentPage.value)
})

const handleReset = async () => {
  searchForm.credential = ''
  searchForm.ip = ''
  searchForm.response_status_code = ''
  searchForm.level = ''
  searchForm.logMsgCode = ''
  searchForm.startAt = ''
  searchForm.endAt = ''
  searchForm.log_category = ''
  searchForm.log_action = ''
  currentPage.value = 1
  
  await getLogData(searchForm, sortColumn.value, sortDirection.value, pageSize.value, currentPage.value)
}

const sortBy = async (column) => {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = 'asc'
  }
  await getLogData(searchForm, sortColumn.value, sortDirection.value, pageSize.value, currentPage.value)
  console.log('排序:', column, sortDirection.value)
}

const goToPage = async (page) => {
  console.log('前往頁數:', page)
  await getLogData(searchForm, sortColumn.value, sortDirection.value, pageSize.value, page)
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const getLogData = async(searchForm, column = "created_at", sortDirection = "desc", limit = 10, page = 1) => {
  console.log('獲取日誌資料:', searchForm, column, sortDirection)
  isSearching.value = true
  
  try {
    await logStore.fetchLogs(searchForm, column, sortDirection, limit, page)
    console.log('日誌資料:', logStore.logs)
    
    if (logStore.logs && logStore.logs.data) {
      logData.value = logStore.logs.data
      totalPages.value = logStore.logs.data.totalPages || 0
      totalItems.value = logStore.logs.data.total || 0
    } else {
      logData.value = []
      totalPages.value = 0
      totalItems.value = 0
    }

    console.log('分頁資訊:', totalItems.value, totalPages.value)
  } catch (error) {
    console.error('獲取日誌資料失敗:', error)
    logData.value = []
    totalPages.value = 0
    totalItems.value = 0
  } finally {
    isSearching.value = false
  }
}

onMounted(async () => {
  // 添加視窗尺寸監聽器
  window.addEventListener('resize', handleResize)
  
  console.log('onMounted: LogManagement')
  try {
    // 先載入日誌操作類型選項
    await logStore.fetchLogActions()
    console.log('日誌操作類型載入完成')
    
    // 載入日誌資料
    await getLogData(searchForm, "created_at", "desc", pageSize.value, currentPage.value)
    
  } catch (error) {
    console.error('載入資料失敗:', error)
  } finally {
    isLoading.value = false
  }
})

// 清理函數
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="log-management">
    <!-- 搜尋區域 -->
    <section class="search-section">
      <div class="search-row">
        <div class="search-field">
          <input 
            type="text" 
            v-model="searchForm.credential"
            placeholder="請輸入帳號"
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
        
        <div class="search-field">
          <input 
            type="text" 
            v-model="searchForm.ip"
            placeholder="請輸入 IP"
            class="search-input"
            @keyup.enter="handleSearch"
            :disabled="isLoading"
          />
        </div>
      </div>
      
      <div class="search-row">
        <div class="select-field ">
            <input type="text" v-model="searchForm.response_status_code" placeholder="請輸入Status狀態碼" class="search-select" :disabled="isLoading">
        </div>
        
        <div class="select-field">
          <select v-model="searchForm.level" class="search-select" :disabled="isLoading">
            <option value="">日誌等級</option>
            <option v-for="level in logStore.logLevels" :key="level.id" :value="level.id">{{ level.name }}</option>
          </select>
        </div>

        <div class="select-field">
          <select v-model="searchForm.log_category" class="search-select" :disabled="isLoading || logStore.isLoadingActions">
            <option value="">紀錄模組</option>
            <option v-for="category in categoryOptions" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
        </div>
        <div class="select-field">
          <select 
            v-model="searchForm.log_action" 
            class="search-select" 
            :disabled="isLoading || logStore.isLoadingActions || !searchForm.log_category"
          >
            <option value="">紀錄操作</option>
            <option 
              v-for="action in actionOptions" 
              :key="action.logMsgCode" 
              :value="action.logMsgCode"
            >
              {{ action.logMsgCodeLabel }}
            </option>
          </select>
        </div>
        <div class="date-field">
          <label>自訂建立日期</label>
          <div class="date-inputs">
            <input 
              type="date" 
              v-model="searchForm.startAt"
              class="date-input"
              :disabled="isLoading"
            />
            <span class="date-separator">-</span>
            <input 
              type="date" 
              v-model="searchForm.endAt"
              class="date-input"
              :disabled="isLoading"
            />
          </div>
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
            <option value="10">10筆/頁</option>
            <option value="20">20筆/頁</option>
            <option value="50">50筆/頁</option>
          </select>
        </div>
      </div>

      <!-- 資料表格 - 桌面版 -->
      <div class="table-container" v-if="!isMobile">
        <table class="data-table">
          <thead>
            <tr>
              <th>項次</th>
              <th class="sortable" @click="!isLoading && sortBy('ip')">
                IP 
                <span class="sort-icon" v-if="sortColumn === 'ip'">
                  <span v-if="sortDirection === 'asc'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th class="sortable" @click="!isLoading && sortBy('credential')">
                帳號 
                <span class="sort-icon" v-if="sortColumn === 'credential'">
                  <span v-if="sortDirection === 'asc'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th class="sortable" @click="!isLoading && sortBy('response_status_code')">
                回傳 Status 
                <span class="sort-icon" v-if="sortColumn === 'response_status_code'">
                  <span v-if="sortDirection === 'asc'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th class="sortable" @click="!isLoading && sortBy('level')">
                日誌等級 
                <span class="sort-icon" v-if="sortColumn === 'level'">
                  <span v-if="sortDirection === 'asc'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th class="sortable" @click="!isLoading && sortBy('log_category')">
                紀錄模組 
                <span class="sort-icon" v-if="sortColumn === 'log_category'">
                  <span v-if="sortDirection === 'asc'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th class="sortable" @click="!isLoading && sortBy('msg')">
                Log 訊息 
                <span class="sort-icon" v-if="sortColumn === 'msg'">
                  <span v-if="sortDirection === 'asc'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th class="sortable" @click="!isLoading && sortBy('created_at')">
                建立日期 
                <span class="sort-icon" v-if="sortColumn === 'created_at'">
                  <span v-if="sortDirection === 'asc'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th>
                操作 
              </th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading 狀態 -->
            <tr v-if="isLoading" class="loading-row">
              <td colspan="8" class="loading-cell">
                <div class="loading-container">
                  <div class="loading-spinner large">⟳</div>
                  <div class="loading-text">資料載入中...</div>
                </div>
              </td>
            </tr>
            
            <!-- 搜尋中狀態 -->
            <tr v-else-if="isSearching" class="loading-row">
              <td colspan="8" class="loading-cell">
                <div class="loading-container">
                  <div class="loading-spinner large">⟳</div>
                  <div class="loading-text">搜尋中...</div>
                </div>
              </td>
            </tr>
            
            <!-- 正常資料顯示 -->
            <tr v-else v-for="(item, index) in logData.data" :key="item.id" class="table-row">
              <td>{{ index + 1 }}</td>
              <td>{{ item.ip || '192.168.1.1' }}</td>
              <td class="account-cell">{{ item.credential || 'admin' }}</td>
              <td>
                <span :class="['status-badge', getStatusClass(item.response_status_code || '200')]">
                  {{ item.response_status_code || '200' }}
                </span>
              </td>
              <td>
                <span :class="['level-badge', logStore.getLevelClass(item.level || '1')]">
                  {{ logStore.getLevelText(item.level || '1') }}
                </span>
              </td>
              <td class="module-cell">{{ item.log_category || '登入模組' }}</td>
              <td class="message-cell">
                <div class="message-content" :title="item.msg">
                  {{ item.msg || '某帳號登入失敗' }}
                </div>
              </td>
              <td>{{ formatDateTime(item.created_at) || '2025/08/11 00:22' }}</td>
              <td>
                <button 
                  class="action-btn view-btn" 
                  @click="viewDetail(item)"
                  title="查看詳情"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path :d="mdiOpenInNew" fill="currentColor"></path>
                  </svg>
                </button>
              </td>
            </tr>
            <!-- 無資料狀態 -->
            <tr v-if="!isLoading && !isSearching && (!logData.data || logData.data.length === 0)">
              <td colspan="8" class="no-data">暫無資料</td>
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
        <div v-else v-for="(item, index) in logData.data" :key="item.id" class="mobile-card" @click="viewLog(item.id)">
          <div class="card-header">
            <div class="card-title">{{ item.ip || '192.168.1.1' }}</div>
            <div class="card-index">#{{ index + 1 }}</div>
          </div>
          <div class="card-content">
            <div class="card-field">
              <span class="field-label">帳號：</span>
              <span class="field-value">{{ item.credential || 'admin' }}</span>
            </div>
            <div class="card-field">
              <span class="field-label">回傳狀態：</span>
              <span class="field-value">
                <span :class="['status-badge', getStatusClass(item.response_status_code || '200')]">
                  {{ item.response_status_code || '200' }}
                </span>
              </span>
            </div>
            <div class="card-field">
              <span class="field-label">日誌等級：</span>
              <span class="field-value">
                <span :class="['level-badge', logStore.getLevelClass(item.level || '1')]">
                  {{ logStore.getLevelText(item.level || '1') }}
                </span>
              </span>
            </div>
            <div class="card-field">
              <span class="field-label">紀錄模組：</span>
              <span class="field-value">{{ item.log_category || '登入模組' }}</span>
            </div>
            <div class="card-field">
              <span class="field-label">Log 訊息：</span>
              <span class="field-value message-text">{{ item.msg || '某帳號登入失敗' }}</span>
            </div>
            <div class="card-field">
              <span class="field-label">建立日期：</span>
              <span class="field-value">{{ formatDateTime(item.created_at) || '2025/08/11 00:22' }}</span>
            </div>
          </div>
          <div class="card-action">
            <span class="view-hint">點擊查看詳情 →</span>
          </div>
        </div>
        
        <!-- 無資料狀態 -->
        <div v-if="!isLoading && !isSearching && (!logData.data || logData.data.length === 0)" class="no-data-mobile">
          <div class="no-data-icon">📋</div>
          <div class="no-data-text">暫無資料</div>
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

<script>
export default {
  methods: {
    getStatusClass(status) {
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
  }
}
</script>

<style lang="scss" scoped>
.log-management {
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
    margin-bottom: 20px;

    &:last-child {
      margin-bottom: 0;
    }
  }

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

  .select-field {
    .search-select {
      padding: 12px 15px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      background: white;
      min-width: 150px;
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
  }

  .date-field {
    display: flex;
    align-items: center;
    gap: 10px;

    label {
      font-size: 14px;
      color: #333;
      white-space: nowrap;
      font-weight: 500;
    }

    .date-inputs {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .date-input {
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

      &:disabled {
        background-color: #f8f9fa;
        color: #999;
        cursor: not-allowed;
      }
    }

    .date-separator {
      color: #666;
      font-weight: bold;
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

            &.account-cell {
              max-width: 200px;
              word-break: break-word;
            }

            &.module-cell {
              max-width: 150px;
              word-break: break-word;
            }

            &.message-cell {
              max-width: 300px;
              
              .message-content {
                max-width: 100%;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                display: block;
                &:hover {
                  color: #6c5ce7;
                }
              }
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
    cursor: pointer;

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
          
          &.message-text {
            line-height: 1.4;
            max-height: 2.8em; /* 顯示最多2行 */
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            text-overflow: ellipsis;
            word-break: break-word;
          }
        }
      }
    }

    .card-action {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #f0f0f0;
      text-align: right;

      .view-hint {
        font-size: 12px;
        color: #6c5ce7;
        font-weight: 500;
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
        background: #e3f2fd;
        color: #1976d2;
    }
    }
    }
/* ===== 響應式設計 ===== */

/* 大螢幕 (1400px+) */
@media (min-width: 1400px) {
  .log-management {
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
      .select-field .search-select {
        min-width: 140px;
      }
    }
  }

  .table-section {
    .data-table {
      th, td {
        padding: 12px 16px;
        font-size: 13px;
      }

      .account-cell {
        max-width: 150px;
      }

      .message-cell {
        max-width: 250px;
      }
    }
  }
}

/* 平板直向 (768px - 991px) */
@media (max-width: 991px) and (min-width: 768px) {
  .log-management {
    padding: 16px;
  }

  .search-section {
    padding: 20px;

    .search-row {
      flex-wrap: wrap;
      gap: 15px;

      .search-field {
        min-width: 250px;
      }

      .select-field {
        min-width: 150px;
        
        .search-select {
          min-width: 120px;
        }
      }

      .date-field {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;

        .date-inputs {
          flex-wrap: wrap;
        }

        .date-input {
          min-width: 140px;
        }
      }

      .action-buttons {
        width: 100%;
        justify-content: flex-end;
      }
    }
  }

  .table-section {
    .table-controls {
      padding: 16px 20px;
      flex-wrap: wrap;
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

      .account-cell {
        max-width: 120px;
      }

      .module-cell {
        max-width: 100px;
      }

      .message-cell {
        max-width: 180px;
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
  .log-management {
    padding: 12px;
  }

  .search-section {
    padding: 16px;

    .search-row {
      flex-direction: column;
      gap: 12px;
      align-items: stretch;

      .search-field,
      .select-field {
        width: 100%;
      }

      .select-field .search-select {
        width: 100%;
        min-width: auto;
      }

      .date-field {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;

        label {
          text-align: left;
        }

        .date-inputs {
          justify-content: space-between;
        }

        .date-input {
          flex: 1;
          min-width: 0;
        }
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

          &.url-text,
          &.message-text {
            font-size: 10px;
          }
        }
      }

      .card-action .view-hint {
        font-size: 11px;
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
  .log-management {
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

      .select-field .search-select {
        padding: 10px 12px;
        font-size: 13px;
      }

      .date-field {
        .date-input {
          padding: 10px 12px;
          font-size: 13px;
        }
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

          &.url-text {
            font-size: 9px;
          }
        }
      }

      .card-action {
        margin-top: 10px;
        padding-top: 10px;

        .view-hint {
          font-size: 10px;
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

      .date-field .date-inputs {
        flex-direction: column;
        gap: 8px;

        .date-separator {
          display: none;
        }
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
  }

  .pagination-controls {
    .page-btn {
      padding: 4px 6px;
      font-size: 10px;
      min-width: 28px;
    }
  }
}

// 特殊樣式優化
@media (max-width: 767px) {
  .status-badge,
  .level-badge {
    padding: 3px 8px;
    font-size: 11px;
  }
}

// 極小螢幕的特殊處理
@media (max-width: 480px) {
  .mobile-cards .mobile-card .card-content .card-field {
    .status-badge,
    .level-badge {
      padding: 2px 6px;
      font-size: 10px;
    }
  }
}
</style>
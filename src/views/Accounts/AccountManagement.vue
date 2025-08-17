<script setup>
import { ref, computed, reactive, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountStore } from '@/stores/account'
import { useAuthStore } from '@/stores/auth'
import { PERMISSIONS, checkPermission } from '@/utils/permissions'
import { formatDate, formatDateTime } from '@/utils/dateUtils'

const authStore = useAuthStore()
const router = useRouter()
const accountStore = useAccountStore()

const hasFullPermission = computed(() => authStore.canModify(PERMISSIONS.ACCOUNT_MANAGEMENT));

// 響應式視窗寬度監聽
const windowWidth = ref(window.innerWidth)

// 搜尋表單
const searchForm = reactive({
  keyword: '',
  accountStatus: '',
  loginSource: '',
  startDate: '',
  endDate: ''
})

// 排序設定
const sortConfig = ref({
  field: 'created_at',
  order: 'ASC'
})

const enumStatus = {
  Open: '啟用',
  UnderReview: '待審核',
  ReviewFailed: '審核未通過',
  Invalid: '停用',
  Lock: '封鎖',
  Inconvenient: '不便',
  Leave: '請假'
}

// 帳號狀態選項
const accountStatuses = ref([
  { value: '', label: '全部狀態' },
  { value: 'Open', label: '啟用' },
  { value: 'UnderReview', label: '未審核' },
  { value: 'ReviewFailed', label: '審核未通過' },
  { value: 'Invalid', label: '停用' },
  { value: 'Lock', label: '封鎖' },
  { value: 'Inconvenient', label: '不便' },
  { value: 'Leave', label: '請假' }
])

// 登入來源選項
const loginSources = ref([
  { value: '', label: '全部來源' },
  { value: 'system', label: '系統登入' },
  { value: 'google', label: 'Google登入' }
])

// 分頁設定
const currentPage = ref(1)
const pageSize = ref(10)
const totalItems = ref(0)

// 載入狀態
const isLoading = ref(false)
const isSearching = ref(false)

// 批次匯入相關變數
const showImportModal = ref(false)
const importFile = ref(null)
const isImporting = ref(false)
const importProgress = ref(0)
const importResult = ref(null)
const isDragging = ref(false)

// 模擬帳號資料
const accountData = ref([
  {
    id: 1,
    account: 'user001',
    name: '張小明',
    email: 'user001@example.com',
    accountStatus: '啟用',
    establishDate: '2025/05/01',
    loginSource: '網頁'
  },
])

// 響應式計算屬性 - 判斷是否為手機模式
const isMobile = computed(() => windowWidth.value <= 767)
const isTablet = computed(() => windowWidth.value > 767 && windowWidth.value <= 991)
const isDesktop = computed(() => windowWidth.value > 991)

// 視窗尺寸變化處理器
const handleResize = () => {
  windowWidth.value = window.innerWidth
}

// 計算屬性
const totalPages = ref(0)

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

// 基本方法
const handleSearch = async () => {
  currentPage.value = 1
  isSearching.value = true
  console.log('執行搜尋:', searchForm)
  await loadData()
  isSearching.value = false
}

const handleReset = async () => {
  searchForm.keyword = ''
  searchForm.accountStatus = ''
  searchForm.loginSource = ''
  searchForm.startDate = '2025/05/01'
  searchForm.endDate = '2025/05/30'
  currentPage.value = 1
  await loadData()
}

const loadData = async () => {
  isLoading.value = true
  const params = {
    text: searchForm.keyword,
    status: searchForm.accountStatus,
    startAt: searchForm.startDate,
    endAt: searchForm.endDate,
    sortField: sortConfig.value.field,
    sortOrder: sortConfig.value.order,
    page: currentPage.value,
    pageSize: pageSize.value,
    provider: searchForm.loginSource
  };
  console.log(params);
  
  await accountStore.fetchAccounts(params);

  accountData.value = accountStore.accounts.data;
  console.log(accountStore.accounts.total);
  
  totalItems.value = accountStore.accounts.total
  totalPages.value = accountStore.accounts.totalPages
  isLoading.value = false
}

// 排序功能
const handleSort = (field) => {
  if (sortConfig.value.field === field) {
    if (sortConfig.value.order === 'asc') {
      sortConfig.value.order = 'desc'
    } else if (sortConfig.value.order === 'desc') {
      sortConfig.value.field = ''
      sortConfig.value.order = ''
    } else {
      sortConfig.value.order = 'asc'
    }
  } else {
    sortConfig.value.field = field
    sortConfig.value.order = 'asc'
  }
  
  loadData()
}

const getSortIcon = (field) => {
  if (sortConfig.value.field !== field) {
    return '⇅'
  }
  return sortConfig.value.order === 'asc' ? '↑' : '↓'
}

const getSortClass = (field) => {
  if (sortConfig.value.field === field) {
    return `sorted-${sortConfig.value.order}`
  }
  return ''
}

const goToPage = async (page) => {
  console.log(page);
  await loadData();
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const downloadTemplate = async () => {
  await accountStore.downloadImportTemplate()
}

const createNewAccount = () => {
  console.log('新增帳號')
  router.push('/settings/account/create')
}

const viewAccount = (account) => {
  console.log('查看帳號詳情:', account)
  router.push(`/settings/account-view/${account.id}`)
}

const getStatusClass = (status) => {
  const statusMap = {
    '啟用': 'status-active',
    '停用': 'status-inactive', 
    '待審核': 'status-pending',
    'Open': 'status-active',
    'UnderReview': 'status-pending',
    'ReviewFailed': 'status-inactive',
    'Invalid': 'status-inactive',
    'Lock': 'status-inactive',
    'Inconvenient': 'status-inactive',
    'Leave': 'status-inactive'
  }
  return statusMap[status] || ''
}

// 批次匯入相關方法
const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      alert('請選擇有效的 Excel 檔案 (.xlsx)')
      event.target.value = ''
      return
    }
    
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      alert('檔案大小不能超過 5MB')
      event.target.value = ''
      return
    }
    
    importFile.value = file
  }
}

const resetImportForm = () => {
  importFile.value = null
  importProgress.value = 0
  importResult.value = null  // 清除匯入結果
  isImporting.value = false
  
  const fileInput = document.getElementById('import-file-input')
  if (fileInput) {
    fileInput.value = ''
  }
}

const batchImport = async () => {
  showImportModal.value = true
  resetImportForm()
}

const confirmImport = async () => {
  if (!importFile.value) {
    alert('請選擇要匯入的 Excel 檔案')
    return
  }
  
  isImporting.value = true
  importProgress.value = 0
  
  try {
    const formData = new FormData()
    formData.append('file', importFile.value)
    
    const progressInterval = setInterval(() => {
      if (importProgress.value < 90) {
        importProgress.value += 10
      }
    }, 200)
    
    const result = await accountStore.importAccounts(formData)

    console.log(result);

    let message = '';
    let resultData = {};
    
    if(result.data.statusCode === 200){
      const { data: responseData } = result.data;
      const successCount = responseData.successItems.length;
      const errorItems = responseData.errorItems.filter(item => item != 'undefined');
      const errorCount = errorItems.length;
      const totalCount = successCount + errorCount;
      
      // 構建結構化的結果數據
      resultData = {
        total: totalCount,
        success: successCount,
        failed: errorCount,
        successItems: responseData.successItems,
        errorItems: errorItems,
        originalMessage: result.data.message
      };
      
      // 構建美觀的 message
      message = result.data.message;
    }
    
    clearInterval(progressInterval)
    importProgress.value = 100
    
    importResult.value = {
      success: true,
      message: message || '檔案匯入成功！',
      data: resultData
    }
    
    setTimeout(() => {
      loadData()
    }, 500)
    
  } catch (error) {
    console.error('批次匯入失敗:', error)
    let resultData = {};
    resultData = {
      message: error.response?.data?.message || '匯入失敗，請檢查檔案資料格式',
    }
    importResult.value = {
      success: false,
      message: error.response?.data?.message || '匯入失敗，請檢查檔案資料格式',
      errors: error.response?.data?.errors || [],
      data: resultData,
    }

    console.log(importResult.value);
    
    isImporting.value = false
  }
}

const closeImportModal = () => {
  showImportModal.value = false
  resetImportForm()
}

const dragOver = (event) => {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'copy'
  isDragging.value = true
}

const dragLeave = (event) => {
  event.preventDefault()
  isDragging.value = false
}

const drop = (event) => {
  event.preventDefault()
  isDragging.value = false
  const files = event.dataTransfer.files
  if (files.length > 0) {
    const file = files[0]
    const mockEvent = {
      target: {
        files: [file],
        value: ''
      }
    }
    handleFileSelect(mockEvent)
  }
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// watch pageSize
watch(pageSize, async (newSize) => {
  console.log('分頁大小變更:', newSize)
  pageSize.value = newSize
  currentPage.value = 1
  await loadData();
})

const triggerFileInput = () => {
  const fileInput = document.getElementById('import-file-input')
  if (fileInput) {
    fileInput.click()
  }
}

onMounted(() => {
  // 添加視窗尺寸監聽器
  window.addEventListener('resize', handleResize)
  loadData();
})

// 清理函數
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="account-management">
    <!-- 搜尋區域 -->
    <section class="search-section">
      <div class="search-row">
        <div class="search-field">
          <input 
            type="text" 
            v-model="searchForm.keyword"
            placeholder="輸入帳號、姓名及暱稱"
            class="search-input"
            @keyup.enter="handleSearch"
            :disabled="isLoading"
          />
          <button class="search-btn" @click="handleSearch" :disabled="isLoading || isSearching">
            <span v-if="isSearching" class="loading-spinner">⟳</span>
            <span v-else>🔍</span>
          </button>
        </div>
        
        <div class="select-field">
          <select v-model="searchForm.accountStatus" class="search-select" :disabled="isLoading">
            <option v-for="status in accountStatuses" :key="status.value" :value="status.value">
              {{ status.label }}
            </option>
          </select>
        </div>
        
        <div class="select-field">
          <select v-model="searchForm.loginSource" class="search-select" :disabled="isLoading">
            <option v-for="source in loginSources" :key="source.value" :value="source.value">
              {{ source.label }}
            </option>
          </select>
        </div>
      </div>
      
      <div class="search-row">
        <div class="date-field">
          <label>帳號建立日期</label>
          <div class="date-inputs">
            <input 
              type="date" 
              v-model="searchForm.startDate"
              class="date-input"
              :disabled="isLoading"
            />
            <span class="date-separator">-</span>
            <input 
              type="date" 
              v-model="searchForm.endDate"
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
            <option value="1">1筆/頁</option>
            <option value="10">10筆/頁</option>
            <option value="20">20筆/頁</option>
            <option value="50">50筆/頁</option>
          </select>
        </div>
        
        <div class="right-controls">
          <button class="control-btn template-btn" @click="downloadTemplate" v-if="hasFullPermission" :disabled="isLoading">
            下載帳號匯入範本
          </button>
          <button class="control-btn import-btn" @click="batchImport" v-if="hasFullPermission" :disabled="isLoading">
            批次匯入帳號
          </button>
          <button class="control-btn create-btn" @click="createNewAccount" v-if="hasFullPermission" :disabled="isLoading">
            新增帳號
          </button>
        </div>
      </div>

      <!-- 資料表格 - 桌面版 -->
      <div class="table-container" v-if="!isMobile">
        <table class="data-table">
          <thead>
            <tr>
              <th>項次</th>
              <th 
                class="sortable" 
                :class="getSortClass('credential')"
                @click="!isLoading && handleSort('credential')"
              >
                帳號
                <span class="sort-icon" v-if="sortConfig.field === 'credential'">
                  <span v-if="sortConfig.order === 'asc'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th 
                class="sortable" 
                :class="getSortClass('name')"
                @click="!isLoading && handleSort('name')"
              >
                姓名
                <span class="sort-icon" v-if="sortConfig.field === 'name'">
                  <span v-if="sortConfig.order === 'asc'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th>暱稱</th>
              <th 
                class="sortable" 
                :class="getSortClass('status')"
                @click="!isLoading && handleSort('status')"
              >
                帳號狀態
                <span class="sort-icon" v-if="sortConfig.field === 'status'">
                  <span v-if="sortConfig.order === 'asc'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th 
                class="sortable" 
                :class="getSortClass('created_at')"
                @click="!isLoading && handleSort('created_at')"
              >
                建立日期
                <span class="sort-icon" v-if="sortConfig.field === 'created_at'">
                  <span v-if="sortConfig.order === 'asc'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th 
                class="sortable" 
                :class="getSortClass('last_login_at')"
                @click="!isLoading && handleSort('last_login_at')"
              >
                登入來源
                <span class="sort-icon" v-if="sortConfig.field === 'last_login_at'">
                  <span v-if="sortConfig.order === 'asc'">↑</span>
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
            <tr v-else v-for="(item, index) in accountData" :key="item.id" class="table-row">
              <td>{{ index + 1 }}</td>
              <td>{{ item.credential }}</td>
              <td>{{ item.name }}</td>
              <td>{{ item.nick_name }}</td>
              <td>
                <span class="status-badge" :class="getStatusClass(item.status)">
                  {{ enumStatus[item.status] || item.status }}
                </span>
              </td>
              <td>{{ formatDateTime(item.created_at) }}</td>
              <td>{{ item.provider ?? '系統登入' }}</td>
              <td>
                <button 
                  class="action-btn view-btn" 
                  @click="viewAccount(item)"
                  title="查看詳情"
                >
                  👁️
                </button>
              </td>
            </tr>
            
            <!-- 無資料狀態 -->
            <tr v-if="!isLoading && !isSearching && accountData.length === 0">
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
        <div v-else v-for="(item, index) in accountData" :key="item.id" class="mobile-card" @click="viewAccount(item)">
          <div class="card-header">
            <div class="card-title">{{ item.credential }}</div>
            <div class="card-index">#{{ index + 1 }}</div>
          </div>
          <div class="card-content">
            <div class="card-field">
              <span class="field-label">姓名：</span>
              <span class="field-value">{{ item.name }}</span>
            </div>
            <div class="card-field">
              <span class="field-label">暱稱：</span>
              <span class="field-value">{{ item.nick_name || '無' }}</span>
            </div>
            <div class="card-field">
              <span class="field-label">帳號狀態：</span>
              <span class="field-value status" :class="getStatusClass(item.status)">
                {{ enumStatus[item.status] || item.status }}
              </span>
            </div>
            <div class="card-field">
              <span class="field-label">建立日期：</span>
              <span class="field-value">{{ formatDateTime(item.created_at) }}</span>
            </div>
            <div class="card-field">
              <span class="field-label">登入來源：</span>
              <span class="field-value">{{ item.provider ?? '系統登入' }}</span>
            </div>
          </div>
          <div class="card-action">
            <span class="view-hint">點擊查看詳情 →</span>
          </div>
        </div>
        
        <!-- 無資料狀態 -->
        <div v-if="!isLoading && !isSearching && accountData.length === 0" class="no-data-mobile">
          <div class="no-data-icon">👤</div>
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

    <!-- 批次匯入彈窗 -->
    <div v-if="showImportModal" class="modal-overlay" @click="closeImportModal">
      <div class="import-modal" @click.stop>
        <div class="modal-header">
          <h3>批次匯入帳號</h3>
          <button class="close-btn" @click="closeImportModal">×</button>
        </div>
        
        <div class="modal-body">
          <!-- 匯入說明 -->
          <div class="import-instructions">
            <h4>📋 匯入說明</h4>
            <ul>
              <li>請使用提供的範本格式進行資料準備</li>
              <li>支援檔案格式：.xlsx</li>
              <li>檔案大小限制：5MB</li>
              <li>請確保必填欄位已完整填寫</li>
            </ul>
          </div>
          
          <!-- 文件上傳區域 -->
          <div class="file-upload-section">
            <div 
              class="file-drop-zone"
              :class="{ 'has-file': importFile, 'dragging': isDragging }"
              @dragover="dragOver"
              @dragleave="dragLeave"
              @drop="drop"
              @click="triggerFileInput"
            >
              <input
                id="import-file-input"
                type="file"
                accept=".xlsx"
                style="display: none"
                @change="handleFileSelect"
              />
              
              <div v-if="!importFile" class="upload-placeholder">
                <div class="upload-icon">📁</div>
                <div class="upload-text">
                  <p><strong>點擊選擇檔案</strong> 或拖拽檔案到此處</p>
                  <p class="upload-hint">支援 .xlsx 格式</p>
                </div>
              </div>
              
              <div v-else class="file-info">
                <div class="file-icon">📄</div>
                <div class="file-details">
                  <div class="file-name">{{ importFile.name }}</div>
                  <div class="file-size">{{ formatFileSize(importFile.size) }}</div>
                </div>
                <button class="remove-file-btn" @click.stop="resetImportForm">
                  🗑️
                </button>
              </div>
            </div>
          </div>
          
          <!-- 匯入進度 -->
          <div v-if="isImporting" class="import-progress">
            <div class="progress-header">
              <span>匯入進度</span>
              <span>{{ importProgress }}%</span>
            </div>
            <div class="progress-bar">
              <div 
                class="progress-fill" 
                :style="{ width: importProgress + '%' }"
              ></div>
            </div>
            <div class="progress-text">
              <span v-if="importProgress < 100">正在匯入資料，請稍候...</span>
              <span v-else>匯入完成！</span>
            </div>
          </div>
          
          <!-- 匯入結果 -->
          <div v-if="importResult?.success" class="result-success">
            <!-- 成功標題區域 -->
            <div class="success-header">
              <div class="success-icon-wrapper">
                <div class="success-icon">✅</div>
              </div>
              <div class="success-content">
                <h4 class="success-title">匯入成功</h4>
                <p class="success-message">{{ importResult.message }}</p>
              </div>
            </div>

            <!-- 統計數據區域 -->
            <div v-if="importResult.data" class="result-stats-container">
              <!-- 統計卡片 -->
              <div class="stats-grid">
                <div v-if="importResult.data.total" class="stat-card total-card">
                  <div class="stat-icon">📊</div>
                  <div class="stat-info">
                    <div class="stat-number">{{ importResult.data.total }}</div>
                    <div class="stat-label">總計處理</div>
                  </div>
                </div>
                
                <div v-if="importResult.data.success" class="stat-card success-card">
                  <div class="stat-icon">✅</div>
                  <div class="stat-info">
                    <div class="stat-number">{{ importResult.data.success }}</div>
                    <div class="stat-label">成功匯入</div>
                  </div>
                </div>
                
                <div v-if="!importResult.success" class="stat-card failed-card">
                  <div class="stat-icon">❌</div>
                  <div class="stat-info">
                    <div class="stat-number">{{ importResult.message }}</div>
                    <div class="stat-label">匯入失敗</div>
                  </div>
                </div>
              </div>
              <!-- 失敗項次詳情 -->
              <div v-if="importResult.data.errorItems && importResult.data.errorItems.length" class="error-details">
                <div class="error-header">
                  <div class="error-icon">⚠️</div>
                  <div class="error-title">失敗項次詳情</div>
                  <div class="error-count">{{ importResult.data.errorItems.length }} 項</div>
                </div>
                <div class="error-content">
                  <div class="error-items">
                    <div 
                      v-for="(item, idx) in importResult.data.errorItems" 
                      :key="idx" 
                      class="error-item"
                    >
                      <div class="error-item-icon">📍</div>
                      <div class="error-item-text">項次 {{ item }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- 匯入失敗結果 - 新增這個區塊 -->
          <div v-if="importResult && importResult.success === false" class="result-error">
            <!-- 失敗標題區域 -->
            <div class="error-header-main">
              <div class="error-icon-wrapper">
                <div class="error-icon-main">❌</div>
              </div>
              <div class="error-content-main">
                <h4 class="error-title-main">匯入失敗</h4>
                <p class="error-message">{{ importResult.message }}</p>
              </div>
            </div>
            
            <!-- 錯誤詳情 -->
            <div v-if="importResult.errors && importResult.errors.length" class="error-details-section">
              <div class="error-list-header">
                <div class="error-list-icon">📋</div>
                <div class="error-list-title">錯誤詳情</div>
              </div>
              <div class="error-list-content">
                <div 
                  v-for="(error, index) in importResult.errors" 
                  :key="index" 
                  class="error-list-item"
                >
                  <div class="error-bullet">•</div>
                  <div class="error-text">{{ error }}</div>
                </div>
              </div>
            </div>
            
            <!-- 建議解決方案 -->
            <div class="error-suggestions">
              <div class="suggestion-header">
                <div class="suggestion-icon">💡</div>
                <div class="suggestion-title">建議解決方案</div>
              </div>
              <div class="suggestion-content">
                <ul>
                  <li>請檢查檔案格式是否正確（.xlsx）</li>
                  <li>確認必填欄位是否完整填寫</li>
                  <li>檢查資料格式是否符合範本要求</li>
                  <li>確認檔案大小未超過 5MB 限制</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <!-- 匯入成功狀態 -->
          <template v-if="importResult && importResult.success">
            <button class="btn btn-secondary" @click="closeImportModal">
              關閉
            </button>
            <button class="btn btn-primary" @click="resetImportForm">
              繼續匯入
            </button>
          </template>
          
          <!-- 匯入失敗狀態 -->
          <template v-else-if="importResult && !importResult.success">
            <button class="btn btn-secondary" @click="closeImportModal">
              關閉
            </button>
            <button class="btn btn-primary" @click="resetImportForm">
              重新匯入
            </button>
          </template>
          
          <!-- 匯入中或未開始匯入狀態 -->
          <template v-else>
            <button 
              class="btn btn-secondary" 
              @click="closeImportModal"
              :disabled="isImporting"
            >
              取消
            </button>
            <button 
              class="btn btn-primary" 
              @click="confirmImport"
              :disabled="!importFile || isImporting"
            >
              <span v-if="isImporting">匯入中...</span>
              <span v-else>開始匯入</span>
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.account-management {
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

      &:hover:not(:disabled) {
        color: #6c5ce7;
      }

      &:disabled {
        color: #ccc;
        cursor: not-allowed;
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

    .right-controls {
      display: flex;
      gap: 10px;

      .control-btn {
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s;
        border: none;

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        &.template-btn {
          background: #f8f9fa;
          color: #6c5ce7;
          border: 1px solid #6c5ce7;

          &:hover:not(:disabled) {
            background: #6c5ce7;
            color: white;
          }
        }

        &.import-btn {
          background: #6c5ce7;
          color: white;

          &:hover:not(:disabled) {
            background: #5b4bcf;
            transform: translateY(-1px);
          }
        }

        &.create-btn {
          background: #6c5ce7;
          color: white;

          &:hover:not(:disabled) {
            background: #5b4bcf;
            transform: translateY(-1px);
          }
        }
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

          &.view-btn {
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

          &.status {
            font-weight: 500;
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

  &.status-active {
    background: #d4edda;
    color: #155724;
  }

  &.status-inactive {
    background: #f8d7da;
    color: #721c24;
  }

  &.status-pending {
    background: #fff3cd;
    color: #856404;
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

// 彈窗樣式
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
  padding: 20px;
}

.import-modal {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  border-bottom: 1px solid #eee;
  
  h3 {
    margin: 0;
    color: #333;
    font-size: 18px;
    font-weight: 600;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #999;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s;
    
    &:hover {
      background: #f5f5f5;
      color: #666;
    }
  }
}

.modal-body {
  padding: 25px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px 25px;
  border-top: 1px solid #eee;
  background: #f8f9fa;
  border-radius: 0 0 12px 12px;
}

// 匯入說明
.import-instructions {
  margin-bottom: 25px;
  
  h4 {
    margin: 0 0 15px 0;
    color: #333;
    font-size: 16px;
    font-weight: 600;
  }
  
  ul {
    margin: 0 0 15px 0;
    padding-left: 20px;
    
    li {
      margin-bottom: 8px;
      color: #666;
      font-size: 14px;
      line-height: 1.5;
    }
  }
}

// 文件上傳區域
.file-upload-section {
  margin-bottom: 25px;
  
  .file-drop-zone {
    border: 2px dashed #ddd;
    border-radius: 8px;
    padding: 30px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s;
    background: #fafafa;
    
    &:hover, &.dragging {
      border-color: #6c5ce7;
      background: #f8f7ff;
    }
    
    &.has-file {
      border-color: #28a745;
      background: #f8fff9;
    }
    
    .upload-placeholder {
      .upload-icon {
        font-size: 48px;
        margin-bottom: 15px;
        opacity: 0.6;
      }
      
      .upload-text {
        p {
          margin: 5px 0;
          
          &:first-child {
            font-size: 16px;
            color: #333;
          }
          
          &.upload-hint {
            font-size: 14px;
            color: #999;
          }
        }
      }
    }
    
    .file-info {
      display: flex;
      align-items: center;
      gap: 15px;
      text-align: left;
      
      .file-icon {
        font-size: 32px;
        opacity: 0.8;
      }
      
      .file-details {
        flex: 1;
        
        .file-name {
          font-size: 16px;
          font-weight: 500;
          color: #333;
          margin-bottom: 5px;
        }
        
        .file-size {
          font-size: 14px;
          color: #666;
        }
      }
      
      .remove-file-btn {
        background: #fff;
        border: 1px solid #dc3545;
        color: #dc3545;
        padding: 8px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 16px;
        transition: all 0.2s;
        
        &:hover {
          background: #dc3545;
          color: white;
        }
      }
    }
  }
}

// 進度條
.import-progress {
  margin-bottom: 25px;
  
  .progress-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
    font-size: 14px;
    font-weight: 500;
    color: #333;
  }
  
  .progress-bar {
    width: 100%;
    height: 8px;
    background: #f0f0f0;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 10px;
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #6c5ce7, #a29bfe);
      transition: width 0.3s ease;
      border-radius: 4px;
    }
  }
  
  .progress-text {
    text-align: center;
    font-size: 14px;
    color: #666;
  }
}

// 成功結果顯示
.result-success {
  background: linear-gradient(135deg, #f8fff9 0%, #e8f8e8 100%);
  border: 1px solid #c3e6cb;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(40, 167, 69, 0.12);
  animation: slideInUp 0.5s ease-out;
}

// 成功標題區域
.success-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 24px 20px 24px;
  border-bottom: 1px solid rgba(195, 230, 203, 0.5);
  
  .success-icon-wrapper {
    .success-icon {
      font-size: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      background: linear-gradient(135deg, #28a745, #20c997);
      border-radius: 50%;
      box-shadow: 0 4px 16px rgba(40, 167, 69, 0.3);
      animation: bounceIn 0.6s ease-out 0.2s both;
    }
  }
  
  .success-content {
    flex: 1;
    
    .success-title {
      margin: 0 0 8px 0;
      color: #155724;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    
    .success-message {
      margin: 0;
      color: #28a745;
      font-size: 14px;
      font-weight: 500;
      line-height: 1.4;
    }
  }
}

// 統計數據容器
.result-stats-container {
  padding: 20px 24px 24px 24px;
}

// 統計卡片網格
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
  
  .stat-card {
    background: white;
    border-radius: 10px;
    padding: 18px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
    border-left: 4px solid transparent;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
    }
    
    .stat-icon {
      font-size: 24px;
      opacity: 0.9;
    }
    
    .stat-info {
      .stat-number {
        font-size: 22px;
        font-weight: 700;
        margin-bottom: 2px;
        line-height: 1;
      }
      
      .stat-label {
        font-size: 11px;
        color: #666;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    }
    
    &.total-card {
      border-left-color: #6c5ce7;
      .stat-number { color: #6c5ce7; }
    }
    
    &.success-card {
      border-left-color: #28a745;
      .stat-number { color: #28a745; }
    }
    
    &.failed-card {
      border-left-color: #dc3545;
      .stat-number { color: #dc3545; }
    }
  }
}

// 失敗項次詳情
.error-details {
  background: white;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #ffeaa7;
  
  .error-header {
    background: linear-gradient(135deg, #fff3cd, #ffeaa7);
    padding: 14px 18px;
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid #ffeaa7;
    
    .error-icon {
      font-size: 18px;
      animation: pulse 2s infinite;
    }
    
    .error-title {
      flex: 1;
      font-weight: 600;
      color: #856404;
      font-size: 14px;
    }
    
    .error-count {
      background: #dc3545;
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }
  }
  
  .error-content {
    padding: 16px 18px;
    max-height: 200px;
    overflow-y: auto;
    
    .error-items {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      
      .error-item {
        display: flex;
        align-items: center;
        gap: 6px;
        background: #f8f9fa;
        border: 1px solid #dc3545;
        border-radius: 20px;
        padding: 6px 12px;
        font-size: 12px;
        transition: all 0.2s ease;
        
        &:hover {
          background: #dc3545;
          color: white;
          transform: scale(1.05);
        }
        
        .error-item-icon {
          font-size: 10px;
          opacity: 0.8;
        }
        
        .error-item-text {
          font-weight: 500;
          white-space: nowrap;
        }
      }
    }
  }
}

// 錯誤結果顯示樣式
.result-error {
  background: linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%);
  border: 1px solid #fc8181;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(220, 53, 69, 0.12);
  animation: slideInUp 0.5s ease-out;
  margin-bottom: 20px;
}

// 錯誤標題區域
.error-header-main {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 24px 20px 24px;
  border-bottom: 1px solid rgba(252, 129, 129, 0.3);
  
  .error-icon-wrapper {
    .error-icon-main {
      font-size: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      background: linear-gradient(135deg, #dc3545, #c82333);
      border-radius: 50%;
      box-shadow: 0 4px 16px rgba(220, 53, 69, 0.3);
      animation: shakeIn 0.6s ease-out 0.2s both;
    }
  }
  
  .error-content-main {
    flex: 1;
    
    .error-title-main {
      margin: 0 0 8px 0;
      color: #721c24;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    
    .error-message {
      margin: 0;
      color: #dc3545;
      font-size: 14px;
      font-weight: 500;
      line-height: 1.4;
    }
  }
}

// 錯誤詳情區塊
.error-details-section {
  background: white;
  margin: 20px 24px;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #ffc9c9;
  
  .error-list-header {
    background: linear-gradient(135deg, #ffe0e0, #ffc9c9);
    padding: 14px 18px;
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid #ffc9c9;
    
    .error-list-icon {
      font-size: 18px;
      color: #721c24;
    }
    
    .error-list-title {
      flex: 1;
      font-weight: 600;
      color: #721c24;
      font-size: 14px;
    }
  }
  
  .error-list-content {
    padding: 16px 18px;
    max-height: 200px;
    overflow-y: auto;
    
    .error-list-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 8px;
      padding: 8px;
      background: #fff5f5;
      border-radius: 6px;
      border-left: 3px solid #dc3545;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      .error-bullet {
        color: #dc3545;
        font-weight: bold;
        font-size: 16px;
        line-height: 1.2;
        margin-top: 1px;
      }
      
      .error-text {
        flex: 1;
        color: #721c24;
        font-size: 13px;
        line-height: 1.4;
        word-break: break-word;
      }
    }
  }
}

// 建議解決方案區塊
.error-suggestions {
  background: white;
  margin: 0 24px 24px 24px;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #bee5eb;
  
  .suggestion-header {
    background: linear-gradient(135deg, #d1ecf1, #bee5eb);
    padding: 14px 18px;
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid #bee5eb;
    
    .suggestion-icon {
      font-size: 18px;
      color: #0c5460;
    }
    
    .suggestion-title {
      flex: 1;
      font-weight: 600;
      color: #0c5460;
      font-size: 14px;
    }
  }
  
  .suggestion-content {
    padding: 16px 18px;
    
    ul {
      margin: 0;
      padding-left: 20px;
      
      li {
        margin-bottom: 8px;
        color: #495057;
        font-size: 13px;
        line-height: 1.5;
        
        &:last-child {
          margin-bottom: 0;
        }
        
        &::marker {
          color: #17a2b8;
        }
      }
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
  
  &.btn-secondary {
    background: #6c757d;
    color: white;
    
    &:hover:not(:disabled) {
      background: #5a6268;
    }
  }
  
  &.btn-primary {
    background: #6c5ce7;
    color: white;
    
    &:hover:not(:disabled) {
      background: #5b4bcf;
    }
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

// 動畫效果
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes shakeIn {
  0% {
    opacity: 0;
    transform: scale(0.3) rotate(-10deg);
  }
  50% {
    opacity: 1;
    transform: scale(1.05) rotate(5deg);
  }
  70% {
    transform: scale(0.9) rotate(-2deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

/* ===== 響應式設計 ===== */

/* 大螢幕 (1400px+) */
@media (min-width: 1400px) {
  .account-management {
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
    }
  }
}

/* 平板直向 (768px - 991px) */
@media (max-width: 991px) and (min-width: 768px) {
  .account-management {
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

      .right-controls {
        flex-wrap: wrap;
      }
    }

    .data-table {
      th, td {
        padding: 10px 12px;
        font-size: 12px;
      }

      th.sortable .sort-icon {
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
  .account-management {
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

      .right-controls {
        flex-direction: column;
        gap: 8px;

        .control-btn {
          width: 100%;
          padding: 12px;
        }
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

  // 模態框響應式
  .modal-overlay {
    padding: 10px;
  }
  
  .import-modal {
    max-height: 95vh;
  }
  
  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 15px 20px;
  }
  
  .file-drop-zone {
    padding: 20px 15px;
    
    .upload-placeholder .upload-icon {
      font-size: 36px;
    }
  }
  
  .modal-footer {
    flex-direction: column;
    
    .btn {
      width: 100%;
    }
  }

  .success-header {
    padding: 20px 16px 16px 16px;
    
    .success-icon-wrapper .success-icon {
      width: 48px;
      height: 48px;
      font-size: 28px;
    }
    
    .success-content .success-title {
      font-size: 18px;
    }
  }
  
  .result-stats-container {
    padding: 16px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 12px;
    
    .stat-card {
      padding: 16px;
      
      .stat-info .stat-number {
        font-size: 20px;
      }
    }
  }
  
  .error-details .error-content .error-items {
    .error-item {
      font-size: 11px;
      padding: 4px 8px;
    }
  }

  .error-header-main {
    padding: 20px 16px 16px 16px;
    
    .error-icon-wrapper .error-icon-main {
      width: 48px;
      height: 48px;
      font-size: 28px;
    }
    
    .error-content-main .error-title-main {
      font-size: 18px;
    }
  }
  
  .error-details-section,
  .error-suggestions {
    margin-left: 16px;
    margin-right: 16px;
  }
}

/* 小手機 (480px 以下) */
@media (max-width: 479px) {
  .account-management {
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

      .right-controls .control-btn {
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

  .success-header {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }
  
  .error-details-section .error-list-content {
    max-height: 150px;
  }

  .error-header-main {
    flex-direction: column;
    text-align: center;
    gap: 12px;
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

  .table-section .table-controls .right-controls {
    .control-btn {
      font-size: 12px;
      padding: 8px;
    }
  }
}
</style>
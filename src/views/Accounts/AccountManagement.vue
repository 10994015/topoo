<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountStore } from '@/stores/account'

const router = useRouter()
const accountStore = useAccountStore()

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
  { value: '', label: '全部' },
  { value: 'Open', label: '開放' },
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
const pageSize = ref(1)
const totalItems = ref(0)

// 載入狀態
const isLoading = ref(false)

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

// 基本方法
const handleSearch = async () => {
  currentPage.value = 1
  console.log('執行搜尋:', searchForm)
  await loadData()
}

const handleReset = () => {
  searchForm.keyword = ''
  searchForm.accountStatus = ''
  searchForm.loginSource = ''
  searchForm.startDate = '2025/05/01'
  searchForm.endDate = '2025/05/30'
  currentPage.value = 1
  loadData()
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
    pageSize: pageSize.value
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
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
  await loadData();
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
      alert('請選擇有效的 Excel 檔案 (.xlsx 或 .xls)')
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
  importResult.value = null
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
    
    clearInterval(progressInterval)
    importProgress.value = 100
    
    importResult.value = {
      success: true,
      message: result.message || '匯入成功',
      data: result.data || {}
    }
    
    setTimeout(() => {
      loadData()
      setTimeout(() => {
        closeImportModal()
      }, 3000)
    }, 500)
    
  } catch (error) {
    console.error('批次匯入失敗:', error)
    
    importResult.value = {
      success: false,
      message: error.response?.data?.message || '匯入失敗，請檢查檔案格式',
      errors: error.response?.data?.errors || []
    }
    
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
  loadData();
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
            placeholder="輸入帳號、姓名及信箱"
            class="search-input"
            @keyup.enter="handleSearch"
          />
          <button class="search-btn" @click="handleSearch">
            🔍
          </button>
        </div>
        
        <div class="select-field">
          <select v-model="searchForm.accountStatus" class="search-select">
            <option v-for="status in accountStatuses" :key="status.value" :value="status.value">
              {{ status.label }}
            </option>
          </select>
        </div>
        
        <div class="select-field">
          <select v-model="searchForm.loginSource" class="search-select">
            <option v-for="source in loginSources" :key="source.value" :value="source.value">
              {{ source.label }}
            </option>
          </select>
        </div>
      </div>
      
      <div class="search-row">
        <div class="date-field">
          <label>帳號建立日期</label>
          <input 
            type="date" 
            v-model="searchForm.startDate"
            class="date-input"
          />
          <span class="date-separator">-</span>
          <input 
            type="date" 
            v-model="searchForm.endDate"
            class="date-input"
          />
        </div>
        
        <div class="action-buttons">
          <button class="query-btn" @click="handleSearch">
            查詢
          </button>
        </div>
      </div>
    </section>

    <!-- 功能按鈕區域 -->
    <section class="control-section">
      <div class="left-controls">
        <div class="pagination-control">
          <select v-model="pageSize" class="page-size-select">
            <option value="1">1筆/頁</option>
            <option value="10">10筆/頁</option>
            <option value="20">20筆/頁</option>
            <option value="50">50筆/頁</option>
          </select>
        </div>
      </div>
      
      <div class="right-controls">
        <button class="control-btn template-btn" @click="downloadTemplate">
          下載帳號匯入範本
        </button>
        <button class="control-btn import-btn" @click="batchImport">
          批次匯入帳號
        </button>
        <button class="control-btn create-btn" @click="createNewAccount">
          新增帳號
        </button>
      </div>
    </section>

    <!-- 資料表格區域 -->
    <section class="table-section">
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th 
                class="sortable-header" 
                :class="getSortClass('id')"
                @click="handleSort('id')"
              >
                ID
                <span class="sort-icon">{{ getSortIcon('id') }}</span>
              </th>
              <th 
                class="sortable-header" 
                :class="getSortClass('credential')"
                @click="handleSort('credential')"
              >
                帳號
                <span class="sort-icon">{{ getSortIcon('credential') }}</span>
              </th>
              <th 
                class="sortable-header" 
                :class="getSortClass('name')"
                @click="handleSort('name')"
              >
                姓名
                <span class="sort-icon">{{ getSortIcon('name') }}</span>
              </th>
              <th>暱稱</th>
              <th 
                class="sortable-header" 
                :class="getSortClass('status')"
                @click="handleSort('status')"
              >
                帳號狀態
                <span class="sort-icon">{{ getSortIcon('status') }}</span>
              </th>
              <th 
                class="sortable-header" 
                :class="getSortClass('created_at')"
                @click="handleSort('created_at')"
              >
                建立日期
                <span class="sort-icon">{{ getSortIcon('created_at') }}</span>
              </th>
              <th 
                class="sortable-header" 
                :class="getSortClass('last_login_at')"
                @click="handleSort('last_login_at')"
              >
                登入來源
                <span class="sort-icon">{{ getSortIcon('last_login_at') }}</span>
              </th>
              <th class="action-column">操作</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading 狀態 -->
            <tr v-if="isLoading" class="loading-row">
              <td colspan="8" class="loading-cell">
                <div class="loading-container">
                  <div class="loading-spinner">⟳</div>
                  <div class="loading-text">資料載入中...</div>
                </div>
              </td>
            </tr>
            
            <!-- 正常資料顯示 -->
            <tr v-else v-for="(item, index) in accountData" :key="item.id" class="table-row">
              <td>{{ item.id }}</td>
              <td>{{ item.credential }}</td>
              <td>{{ item.name }}</td>
              <td>{{ item.nick_name }}</td>
              <td>
                <span class="status-badge" :class="getStatusClass(item.status)">
                  {{ enumStatus[item.status] || item.status }}
                </span>
              </td>
              <td>{{ item.created_at }}</td>
              <td>{{ item.provider }}</td>
              <td class="action-cell">
                <div class="action-buttons">
                  <button 
                    class="action-btn view-btn" 
                    @click="viewAccount(item)"
                    title="查看詳情"
                  >
                    👁️
                  </button>
                </div>
              </td>
            </tr>
            
            <!-- 無資料狀態 -->
            <tr v-if="!isLoading && accountData.length === 0">
              <td colspan="8" class="no-data">暫無資料</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分頁控制 -->
      <div class="pagination-section">
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
              <li>支援檔案格式：.xlsx、.xls</li>
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
                accept=".xlsx,.xls"
                style="display: none"
                @change="handleFileSelect"
              />
              
              <div v-if="!importFile" class="upload-placeholder">
                <div class="upload-icon">📁</div>
                <div class="upload-text">
                  <p><strong>點擊選擇檔案</strong> 或拖拽檔案到此處</p>
                  <p class="upload-hint">支援 .xlsx、.xls 格式</p>
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
          <div v-if="importResult" class="import-result">
            <div v-if="importResult.success" class="result-success">
              <div class="result-icon">✅</div>
              <div class="result-content">
                <h4>匯入成功</h4>
                <p>{{ importResult.message }}</p>
                <div v-if="importResult.data" class="result-stats">
                  <span v-if="importResult.data.total">
                    總計處理：{{ importResult.data.total }} 筆
                  </span>
                  <span v-if="importResult.data.success">
                    成功：{{ importResult.data.success }} 筆
                  </span>
                  <span v-if="importResult.data.failed">
                    失敗：{{ importResult.data.failed }} 筆
                  </span>
                </div>
              </div>
            </div>
            
            <div v-else class="result-error">
              <div class="result-icon">❌</div>
              <div class="result-content">
                <h4>匯入失敗</h4>
                <p>{{ importResult.message }}</p>
                <div v-if="importResult.errors && importResult.errors.length > 0" class="error-details">
                  <h5>錯誤詳情：</h5>
                  <ul>
                    <li v-for="(error, index) in importResult.errors" :key="index">
                      {{ error }}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
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

      &:hover {
        background: #5b4bcf;
        transform: translateY(-1px);
      }
    }
  }
}

// 控制區域
.control-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  .left-controls {
    .page-size-select {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      background: white;
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

      &.template-btn {
        background: #f8f9fa;
        color: #6c5ce7;
        border: 1px solid #6c5ce7;

        &:hover {
          background: #6c5ce7;
          color: white;
        }
      }

      &.import-btn {
        background: #6c5ce7;
        color: white;

        &:hover {
          background: #5b4bcf;
          transform: translateY(-1px);
        }
      }

      &.create-btn {
        background: #6c5ce7;
        color: white;

        &:hover {
          background: #5b4bcf;
          transform: translateY(-1px);
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

          &.action-column {
            text-align: center;
            min-width: 160px;
          }

          &.sortable-header {
            cursor: pointer;
            user-select: none;
            transition: all 0.2s;
            position: relative;

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

          td {
            padding: 15px 20px;
            font-size: 14px;
            color: #333;

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

    &.view-btn {
      &:hover {
        background: #e3f2fd;
        color: #1976d2;
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
  
  .template-download {
    .template-download-btn {
      background: #f8f9fa;
      color: #6c5ce7;
      border: 1px solid #6c5ce7;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.3s;
      
      &:hover {
        background: #6c5ce7;
        color: white;
      }
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

// 結果顯示
.import-result {
  .result-success, .result-error {
    display: flex;
    gap: 15px;
    padding: 20px;
    border-radius: 8px;
    
    .result-icon {
      font-size: 24px;
      flex-shrink: 0;
    }
    
    .result-content {
      flex: 1;
      
      h4 {
        margin: 0 0 10px 0;
        font-size: 16px;
        font-weight: 600;
      }
      
      p {
        margin: 0 0 15px 0;
        color: #666;
        line-height: 1.5;
      }
    }
  }
  
  .result-success {
    background: #d4edda;
    border: 1px solid #c3e6cb;
    
    .result-content h4 {
      color: #155724;
    }
    
    .result-stats {
      display: flex;
      gap: 15px;
      flex-wrap: wrap;
      
      span {
        background: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        color: #155724;
      }
    }
  }
  
  .result-error {
    background: #f8d7da;
    border: 1px solid #f5c6cb;
    
    .result-content h4 {
      color: #721c24;
    }
    
    .error-details {
      margin-top: 15px;
      
      h5 {
        margin: 0 0 10px 0;
        font-size: 14px;
        color: #721c24;
      }
      
      ul {
        margin: 0;
        padding-left: 20px;
        
        li {
          margin-bottom: 5px;
          font-size: 13px;
          color: #721c24;
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

// 響應式設計
@media (max-width: 768px) {
  .search-row {
    flex-direction: column;
    gap: 15px;

    .search-field,
    .select-field {
      width: 100%;
    }
  }

  .control-section {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }

  .pagination-section {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }

  .right-controls {
    flex-wrap: wrap;
    
    .control-btn {
      flex: 1;
      min-width: 120px;
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

  .action-column {
    min-width: 120px !important;
  }

  .sortable-header {
    .sort-icon {
      display: none;
    }
  }

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
  
  .result-success,
  .result-error {
    flex-direction: column;
    text-align: center;
    
    .result-stats {
      justify-content: center;
    }
  }
  
  .modal-footer {
    flex-direction: column;
    
    .btn {
      width: 100%;
    }
  }
}
</style>
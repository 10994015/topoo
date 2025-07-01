<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { PERMISSIONS, checkPermission } from '@/utils/permissions'
import { usePermissionStore } from '@/stores/permission'

const authStore = useAuthStore()
const router = useRouter()
const permissionStore = usePermissionStore()

const hasFullPermission = computed(() => authStore.canModify(PERMISSIONS.PERMISSION_ROLE_MANAGEMENT));

// 搜尋表單
const searchForm = reactive({
  keyword: '',
})

// 排序設定
const sortConfig = ref({
  field: '',
  order: '' // 'asc' 或 'desc'
})

const enumStatus = {
  Open: '啟用',
  Invalid: '停用'
}

// 狀態選項
const statusOptions = ref([
  { value: '', label: '全部' },
  { value: 'Open', label: '啟用' },
  { value: 'Invalid', label: '停用' }
])

// 分頁設定
const currentPage = ref(1)
const pageSize = ref(10)
const totalItems = ref(0)

// 載入狀態
const isLoading = ref(false)

// 模擬權限群組資料
const permissionData = ref([])

// 計算屬性
const totalPages = ref(0)

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return permissionData.value.slice(start, end)
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

// 方法
const handleSearch = () => {
  currentPage.value = 1
  console.log('執行搜尋:', searchForm)
  loadData()
}

const handleReset = () => {
  searchForm.keyword = ''
  currentPage.value = 1
  loadData()
}

const loadData = async () => {
  isLoading.value = true

  try {
    await permissionStore.fetchPermissions({
      text: searchForm.keyword,
      sortField: sortConfig.value.field,
      sortOrder: sortConfig.value.order,
      page: currentPage.value,
      pageSize: pageSize.value
    })

    console.log(permissionStore.permissions);
    

    permissionData.value = permissionStore.permissions.data || []
    console.log(permissionData.value);
    
    totalItems.value = permissionStore.permissions.total
    totalPages.value = permissionStore.permissions.totalPages
    
  } catch (error) {
    console.error('載入資料失敗:', error)
  } finally {
    // 模擬 API 調用延遲
    setTimeout(() => {
      isLoading.value = false
    }, 500)
  }
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
  console.log(sortConfig.value);
  
  loadData()
}

// 取得排序圖示
const getSortIcon = (field) => {
  if (sortConfig.value.field !== field) {
    return '⇅'
  }
  return sortConfig.value.order === 'asc' ? '↑' : '↓'
}

// 取得排序類別
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
  await loadData()
}

const createNewPermission = () => {
  if (!hasFullPermission.value) {
    console.warn('沒有權限新增權限群組')
    return
  }
  console.log('新增權限群組')
  router.push('/settings/permission-group/create')
}

const viewPermission = (permission) => {
  console.log(permission);
  
  router.push(`/settings/permission-group/edit/${permission.role_id}`)
}

const getStatusClass = (status) => {
  const statusMap = {
    'Open': 'status-active',
    'Invalid': 'status-inactive'
  }
  return statusMap[status] || ''
}

const formatPermissions = (permissions) => {
  let result = '';
  for(let i=0;i<permissions.length;i++){
    result += permissions[i].permission_name
    if(i < permissions.length-1) result += '、'
  }
  
  if (!permissions || permissions.length === 0) return '無'
  return result
}
const handlePageSizeChange = async () => {
  currentPage.value = 1
  await loadData()
}
onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="permission-management">
    <!-- 搜尋區域 -->
    <section class="search-section">
      <div class="search-row">
        <div class="search-field">
          <input 
            type="text" 
            v-model="searchForm.keyword"
            placeholder="輸入權限群組名稱"
            class="search-input"
            @keyup.enter="handleSearch"
          />
          <button class="search-btn" @click="handleSearch">
            🔍
          </button>
        </div>
        
        <div class="action-buttons">
          <button class="query-btn" @click="handleSearch">
            查詢
          </button>
          <button class="reset-btn" @click="handleReset">
            重置
          </button>
        </div>
      </div>
    </section>

    <!-- 功能按鈕區域 -->
    <section class="control-section">
      <div class="left-controls">
        <div class="pagination-control">
          <select v-model="pageSize" @change="handlePageSizeChange" class="page-size-select">
            <option value="1">1筆/頁</option>
            <option value="10">10筆/頁</option>
            <option value="20">20筆/頁</option>
            <option value="50">50筆/頁</option>
          </select>
        </div>
      </div>
      
      <div class="right-controls">
        <button class="control-btn create-btn" v-if="hasFullPermission" @click="createNewPermission">
          新增權限群組
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
              >
                項次
              </th>
              <th 
                class="sortable-header" 
                :class="getSortClass('name')"
                @click="handleSort('name')"
              >
                權限群組
                <span class="sort-icon">{{ getSortIcon('name') }}</span>
              </th>
              <th 
                class="sortable-header" 
                :class="getSortClass('status')"
                @click="handleSort('status')"
              >
                狀態
                <span class="sort-icon">{{ getSortIcon('status') }}</span>
              </th>
              <th>人數</th>
              <th>權限功能</th>
              <th class="action-column">操作</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading 狀態 -->
            <tr v-if="isLoading" class="loading-row">
              <td colspan="6" class="loading-cell">
                <div class="loading-container">
                  <div class="loading-spinner">⟳</div>
                  <div class="loading-text">資料載入中...</div>
                </div>
              </td>
            </tr>
            
            <!-- 正常資料顯示 -->
            <tr v-else v-for="(item, index) in permissionData" :key="item.id" class="table-row">
              <td>{{ index + 1}}</td>
              <td class="permission-name">{{ item.role_name }}</td>
              <td>
                <span class="status-badge" :class="getStatusClass(item.role_status)">
                  {{ enumStatus[item.role_status] || item.role_status }}
                </span>
              </td>
              <td class="member-count">{{ item.users ? item.users.length : 0 }}</td>
              <td class="permissions-cell">
                <div class="permissions-list" :title="item.permissions?.join('、')">
                  {{ formatPermissions(item.permissions) }}
                </div>
              </td>
              <td class="action-cell">
                <div class="action-buttons">
                  <button 
                    class="action-btn view-btn" 
                    @click="viewPermission(item)"
                    title="查看詳情"
                  >
                    👁️
                  </button>
                </div>
              </td>
            </tr>
            
            <!-- 無資料狀態 -->
            <tr v-if="!isLoading && permissionData.length === 0">
              <td colspan="6" class="no-data">暫無資料</td>
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
  </div>
</template>

<style lang="scss" scoped>
.permission-management {
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

    .reset-btn {
      background: #f8f9fa;
      color: #6c5ce7;
      border: 1px solid #6c5ce7;
      padding: 12px 30px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s;

      &:hover {
        background: #6c5ce7;
        color: white;
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
            min-width: 200px;
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

            &.permission-name {
              font-weight: 500;
              color: #6c5ce7;
            }

            &.member-count {
              text-align: center;
              font-weight: 500;
            }

            &.permissions-cell {
              max-width: 300px;

              .permissions-list {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                color: #666;
                font-size: 13px;
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

    &.edit-btn {
      &:hover {
        background: #fff3e0;
        color: #f57c00;
      }
    }

    &.status-btn {
      &:hover {
        background: #f3e5f5;
        color: #7b1fa2;
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

  // 手機版操作按鈕調整
  .action-buttons {
    gap: 4px;
    
    .action-btn {
      width: 28px;
      height: 28px;
      font-size: 12px;
    }
  }

  .action-column {
    min-width: 180px !important;
  }

  // 手機版排序樣式調整
  .sortable-header {
    .sort-icon {
      display: none;
    }
  }

  // 手機版權限功能欄位調整
  .permissions-cell {
    max-width: 200px !important;
  }
}
</style>
<script setup>
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { PERMISSIONS, checkPermission } from '@/utils/permissions'
import { usePermissionStore } from '@/stores/permission'
import { mdiOpenInNew, mdiMagnify } from '@mdi/js'

const authStore = useAuthStore()
const router = useRouter()
const permissionStore = usePermissionStore()

const hasFullPermission = computed(() => authStore.canModify(PERMISSIONS.PERMISSION_ROLE_MANAGEMENT));

// 響應式視窗寬度監聽
const windowWidth = ref(window.innerWidth)

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
const isSearching = ref(false)

// 模擬權限群組資料
const permissionData = ref([])

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

// 方法
const handleSearch = async () => {
  currentPage.value = 1
  isSearching.value = true
  console.log('執行搜尋:', searchForm)
  await loadData()
  isSearching.value = false
}

const handleReset = async () => {
  searchForm.keyword = ''
  currentPage.value = 1
  await loadData()
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
const handleSort = async (field) => {
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
  
  await loadData()
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

const formatPermissionsMobile = (permissions) => {
  if (!permissions || permissions.length === 0) return '無權限設定'
  
  // 手機版只顯示前3個權限，超過就顯示...
  const displayPermissions = permissions.slice(0, 3)
  let result = displayPermissions.map(p => p.permission_name).join('、')
  
  if (permissions.length > 3) {
    result += `...等 ${permissions.length} 項`
  }
  
  return result
}

const handlePageSizeChange = async () => {
  currentPage.value = 1
  await loadData()
}

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
          <select v-model="pageSize" @change="handlePageSizeChange" class="page-size-select" :disabled="isLoading">
            <option value="1">1筆/頁</option>
            <option value="10">10筆/頁</option>
            <option value="20">20筆/頁</option>
            <option value="50">50筆/頁</option>
          </select>
        </div>
        
        <div class="right-controls">
          <button class="control-btn create-btn" v-if="hasFullPermission" @click="createNewPermission" :disabled="isLoading">
            新增權限群組
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
                :class="getSortClass('name')"
                @click="!isLoading && handleSort('name')"
              >
                權限群組
                <span class="sort-icon" v-if="sortConfig.field === 'name'">
                  <span v-if="sortConfig.order === 'asc'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th 
                class="sortable" 
                :class="getSortClass('status')"
                @click="!isLoading && handleSort('status')"
              >
                狀態
                <span class="sort-icon" v-if="sortConfig.field === 'status'">
                  <span v-if="sortConfig.order === 'asc'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th>人數</th>
              <th>權限功能</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading 狀態 -->
            <tr v-if="isLoading" class="loading-row">
              <td colspan="6" class="loading-cell">
                <div class="loading-container">
                  <div class="loading-spinner large">⟳</div>
                  <div class="loading-text">資料載入中...</div>
                </div>
              </td>
            </tr>
            
            <!-- 搜尋中狀態 -->
            <tr v-else-if="isSearching" class="loading-row">
              <td colspan="6" class="loading-cell">
                <div class="loading-container">
                  <div class="loading-spinner large">⟳</div>
                  <div class="loading-text">搜尋中...</div>
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
                <div class="permissions-list" :title="formatPermissions(item.permissions)">
                  {{ formatPermissions(item.permissions) }}
                </div>
              </td>
              <td>
                <button 
                  class="action-btn view-btn" 
                  @click="viewPermission(item)"
                  title="查看詳情"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path :d="mdiOpenInNew" fill="currentColor"></path>
                  </svg>
                </button>
              </td>
            </tr>
            
            <!-- 無資料狀態 -->
            <tr v-if="!isLoading && !isSearching && permissionData.length === 0">
              <td colspan="6" class="no-data">暫無資料</td>
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
        <div v-else v-for="(item, index) in permissionData" :key="item.id" class="mobile-card" @click="viewPermission(item)">
          <div class="card-header">
            <div class="card-title">{{ item.role_name }}</div>
            <div class="card-index">#{{ index + 1 }}</div>
          </div>
          <div class="card-content">
            <div class="card-field">
              <span class="field-label">狀態：</span>
              <span class="field-value">
                <span class="status-badge" :class="getStatusClass(item.role_status)">
                  {{ enumStatus[item.role_status] || item.role_status }}
                </span>
              </span>
            </div>
            <div class="card-field">
              <span class="field-label">人數：</span>
              <span class="field-value member-count">{{ item.users ? item.users.length : 0 }} 人</span>
            </div>
            <div class="card-field permissions-field">
              <span class="field-label">權限功能：</span>
              <div class="field-value permissions-mobile">
                <div class="permissions-preview">{{ formatPermissionsMobile(item.permissions) }}</div>
                <div v-if="item.permissions && item.permissions.length > 0" class="permissions-full" :title="formatPermissions(item.permissions)">
                  <small>點擊查看完整權限清單</small>
                </div>
              </div>
            </div>
          </div>
          <div class="card-action">
            <span class="view-hint">點擊查看詳情 →</span>
          </div>
        </div>
        
        <!-- 無資料狀態 -->
        <div v-if="!isLoading && !isSearching && permissionData.length === 0" class="no-data-mobile">
          <div class="no-data-icon">🔐</div>
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
                line-height: 1.4;
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
        color: #6c5ce7;
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

        &.permissions-field {
          flex-direction: column;
          gap: 4px;
        }

        .field-label {
          font-size: 13px;
          color: #666;
          min-width: 70px;
          flex-shrink: 0;
          font-weight: 500;
        }

        .field-value {
          font-size: 13px;
          color: #333;
          flex: 1;
          word-break: break-word;

          &.member-count {
            font-weight: 500;
            color: #6c5ce7;
          }
        }

        .permissions-mobile {
          .permissions-preview {
            font-size: 13px;
            color: #333;
            line-height: 1.4;
            margin-bottom: 4px;
          }

          .permissions-full {
            small {
              color: #999;
              font-size: 11px;
              font-style: italic;
            }
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
  .permission-management {
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
  .table-section {
    .data-table {
      th, td {
        padding: 12px 16px;
        font-size: 13px;
      }

      .permissions-cell {
        max-width: 250px;
      }
    }
  }
}

/* 平板直向 (768px - 991px) */
@media (max-width: 991px) and (min-width: 768px) {
  .permission-management {
    padding: 16px;
  }

  .search-section {
    padding: 20px;

    .search-row {
      flex-wrap: wrap;
      gap: 15px;

      .search-field {
        min-width: 250px;
        flex: 1;
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

      .permissions-cell {
        max-width: 200px;
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
  .permission-management {
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

      .right-controls {
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
          min-width: 60px;
        }

        .field-value {
          font-size: 12px;
        }

        .permissions-mobile {
          .permissions-preview {
            font-size: 12px;
          }

          .permissions-full small {
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
  .permission-management {
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
          min-width: 50px;
        }

        .field-value {
          font-size: 11px;
        }

        .permissions-mobile {
          .permissions-preview {
            font-size: 11px;
            line-height: 1.3;
          }

          .permissions-full small {
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
      &:not(.permissions-field) {
        flex-direction: column;
        gap: 2px;

        .field-label {
          min-width: auto;
          font-weight: 600;
        }
      }

      &.permissions-field {
        .field-label {
          font-weight: 600;
          margin-bottom: 4px;
        }
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

// 特殊樣式優化
@media (max-width: 767px) {
  .status-badge {
    padding: 3px 8px;
    font-size: 11px;
  }

  .permissions-mobile {
    .permissions-preview {
      word-break: break-word;
      line-height: 1.3;
    }
  }
}

// 極小螢幕的權限文字優化
@media (max-width: 480px) {
  .mobile-cards .mobile-card .card-content .card-field.permissions-field {
    .permissions-mobile .permissions-preview {
      font-size: 11px;
      line-height: 1.4;
      word-break: break-all;
    }
  }
}
</style>
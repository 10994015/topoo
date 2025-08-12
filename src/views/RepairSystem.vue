<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useRepairStore } from '@/stores/repair'
import { formatDate, formatDateTime } from '@/utils/dateUtils'
import { useAuthStore } from '@/stores/auth'
import { mdiEye, mdiEyeOff, mdiAccount, mdiLock } from '@mdi/js'
const router = useRouter()

const authStore = useAuthStore()
const repairStore = useRepairStore()
// 搜尋表單
const searchForm = reactive({
  title: '',
  repairCategoryId: '',
  repairReasonId: '',
  repairStatusId: '',
  startAt: '',
  endAt: ''
})

const categories = ref([]);
const reasons = ref([]);
const statuses = ref([]);

// 分頁設定
const currentPage = ref(1)
const pageSize = ref(10)
const sortColumn = ref('repair_time')
const sortDirection = ref('desc')

// 載入狀態
const isLoading = ref(true)
const isSearching = ref(false)

// 模擬資料
const repairData = ref([]);
const totalItems = ref(0)
const totalPages = ref(0)

// 監聽維修類別變化，重新獲取對應的維修原因
watch(() => searchForm.repairCategoryId, async (newCategoryId, oldCategoryId) => {
  // 如果類別ID發生變化
  if (newCategoryId !== oldCategoryId) {
    // 清空當前選擇的維修原因
    searchForm.repairReasonId = ''
    
    // 如果選擇了類別，則獲取對應的維修原因
    if (newCategoryId) {
      try {
        await repairStore.fetchReasons(newCategoryId)
        reasons.value = repairStore.reasons.data
      } catch (error) {
        console.error('獲取維修原因失敗:', error)
        await repairStore.fetchReasons()
        reasons.value = repairStore.reasons.data
      }
    } else {
      
      await repairStore.fetchReasons()
      reasons.value = repairStore.reasons.data
    }
  }
})

const startItem = computed(() => {
  return totalItems.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1
})

const endItem = computed(() => {
  const end = currentPage.value * pageSize.value
  return end > totalItems.value ? totalItems.value : end
})
const viewRepair = (id) => {
  console.log('查看帳號詳情:', id)
  router.push(`/view-repair/${id}`)
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

const showEllipsis = computed(() => {
  return totalPages.value > 5 && currentPage.value < totalPages.value - 2
})

// 方法
const handleSearch = async () => {
  currentPage.value = 1
  
  console.log('執行搜尋:', searchForm)
  
  // 模擬搜尋延遲
  await getRepairData(searchForm, sortColumn.value, sortDirection.value, pageSize.value, currentPage.value);
  
}

// watch pageSize
watch(pageSize, async (newSize) => {
  console.log('分頁大小變更:', newSize)
  currentPage.value = 1
  await getRepairData(searchForm, sortColumn.value, sortDirection.value, newSize, currentPage.value);
})

const handleReset = async () => {
  searchForm.title = ''
  searchForm.repairCategoryId = ''
  searchForm.repairReasonId = ''
  searchForm.repairStatusId = ''
  searchForm.startAt = ''
  searchForm.endAt = ''
  currentPage.value = 1
  
  // 重置時，重新獲取所有維修原因（不帶類別ID）
  try {
    await repairStore.fetchReasons()
    reasons.value = repairStore.reasons.data
  } catch (error) {
    console.error('重置時獲取維修原因失敗:', error)
    reasons.value = []
  }
}

const sortBy = async (column) => {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = 'asc'
  }
  await getRepairData(searchForm, sortColumn.value, sortDirection.value, pageSize.value, currentPage.value);
  console.log('排序:', column, sortDirection.value)
}

const goToPage = async (page) => {
  console.log(page);
  await getRepairData(searchForm, sortColumn.value, sortDirection.value, pageSize.value, page);
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}
const getStatusText = (status) => {
  const statusMap = {
    'pending': '待處理',
    'processing': '處理中',
    'completed': '已完成'
  }
  return statusMap[status] || status
}
const getRepairData = async(searchForm, column="repair_time", sortDirection="asc", limit=10, page=1) => {
  console.log(searchForm, column, sortDirection);
  isSearching.value = true
  await repairStore.fetchRepairs(searchForm, column, sortDirection, limit, page);
  console.log(repairStore.repairs);
  
  repairData.value = repairStore.repairs.data;
  totalPages.value = repairStore.repairs.data.totalPages;
  totalItems.value = repairStore.repairs.data.total;

  console.log(totalItems.value, totalPages.value);
  
  isSearching.value = false
}
const createNewRepair = () => {
  if(!authStore.user.repair_unit){
    alert('帳號未設定報修單位，請聯繫管理員完成配置後再進行報修。')
    return;
  }
  router.push('/create-repair')
}
onMounted(async ()=>{
  console.log('onMounted: RepairSystem');
  try {
    await repairStore.fetchCategories()
    await repairStore.fetchReasons() // 初始載入時獲取所有維修原因
    await repairStore.fetchStatuses()
    await getRepairData(searchForm, "repair_time", "desc", pageSize.value, currentPage.value);

    categories.value = repairStore.categories.data
    reasons.value = repairStore.reasons.data
    statuses.value = repairStore.statuses.data

    // repairData.value = repairStore.repairs.data
    
  } catch (error) {
    console.error('載入資料失敗:', error)
  } finally {
    isLoading.value = false
  }
 
})
</script>

<template>
  <div class="repair-system">
    <!-- 搜尋區域 -->
    <section class="search-section">
      <div class="search-row">
        <div class="search-field">
          <input 
            type="text" 
            v-model="searchForm.title"
            placeholder="輸入案件標題"
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
          <select v-model="searchForm.repairCategoryId" class="search-select" :disabled="isLoading">
            <option value="">全部報修類別</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
          </select>
        </div>
        
        <div class="select-field">
          <select v-model="searchForm.repairReasonId" class="search-select" :disabled="isLoading">
            <option value="">全部報修原因</option>
            <option v-for="reason in reasons" :key="reason.id" :value="reason.id">{{ reason.name }}</option>
          </select>
        </div>
        
        <div class="select-field">
          <select v-model="searchForm.repairStatusId" class="search-select" :disabled="isLoading">
            <option value="">全部報修狀態</option>
            <option v-for="status in statuses" :key="status.id" :value="status.id">{{ status.name }}</option>
          </select>
        </div>
      </div>
      
      <div class="search-row">
        <div class="date-field">
          <label>報修時間</label>
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
        
      
        <button class="new-repair-btn" @click="createNewRepair" :class="{ disabled: isLoading }" :disabled="isLoading">新增報修</button>
      </div>

      <!-- 資料表格 -->
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>
                項次 
              </th>
              <th class="sortable" @click="!isLoading && sortBy('title')">
                案件標題 
                <span class="sort-icon" v-if="sortColumn === 'title'">
                  <span v-if="sortDirection === 'asc'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th class="sortable" @click="!isLoading && sortBy('repair_category_id')">
                故障類別 
                <span class="sort-icon" v-if="sortColumn === 'repair_category_id'">
                  <span v-if="sortDirection === 'asc'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th class="sortable" @click="!isLoading && sortBy('repair_reason_id')">
                故障原因 
                <span class="sort-icon" v-if="sortColumn === 'repair_reason_id'">
                  <span v-if="sortDirection === 'asc'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th class="sortable" @click="!isLoading && sortBy('user_id')">
                報修人員 
                <span class="sort-icon" v-if="sortColumn === 'user_id'">
                  <span v-if="sortDirection === 'asc'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th class="sortable" @click="!isLoading && sortBy('repair_time')">
                報修時間 
                <span class="sort-icon" v-if="sortColumn === 'repair_time'">
                  <span v-if="sortDirection === 'asc'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th class="sortable" @click="!isLoading && sortBy('repair_status_id')">
                處理狀態 
                <span class="sort-icon" v-if="sortColumn === 'repair_status_id'">
                  <span v-if="sortDirection === 'asc'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th >
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
            <tr v-else v-for="(item, index) in repairData.data" :key="item.id" class="table-row">
              <td>{{ index + 1 }}</td>
              <td>{{ item.title }}</td>
              <td>{{ item.repair_category }}</td>
              <td>{{ item.repair_reason }}</td>
              <td>{{ item.repair_name || '無資料' }}</td>
              <td>{{ formatDateTime(item.repair_time) }}</td>
              <td>{{ item.repair_status }}</td>
              <td>
                <button 
                    class="action-btn view-btn" 
                    @click="viewRepair(item.id)"
                    title="查看詳情"
                  >
                    👁️
                  </button>
              </td>
            </tr>
            
            <!-- 無資料狀態 -->
            <tr v-if="!isLoading && !isSearching && repairData.data.length === 0">
              <td colspan="8" class="no-data">暫無資料</td>
            </tr>
          </tbody>
        </table>
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
.repair-system {
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

    .new-repair-btn {
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

// 狀態標籤
.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
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

  .table-controls {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
}

</style>
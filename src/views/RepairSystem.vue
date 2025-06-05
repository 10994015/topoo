<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRepairStore } from '@/stores/repair'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const repairStore = useRepairStore()
// 搜尋表單
const searchForm = reactive({
  keyword: '',
  category: '',
  reason: '',
  status: '',
  startDate: '2025-05-01',
  endDate: '2025-05-30'
})

const categories = ref([]);
const reasons = ref([]);
const statuses = ref([]);

// 分頁設定
const currentPage = ref(1)
const pageSize = ref(10)
const sortColumn = ref('')
const sortDirection = ref('asc')

// 模擬資料
const mockData = ref([
  {
    id: 1,
    title: '電腦無法開機',
    category: '硬體故障',
    reason: '電源問題',
    reporter: '張三',
    reportTime: '2025-05-01 09:30',
    status: 'pending'
  },
  {
    id: 2,
    title: '印表機列印模糊',
    category: '硬體故障',
    reason: '設備老化',
    reporter: '李四',
    reportTime: '2025-05-02 14:20',
    status: 'processing'
  },
  {
    id: 3,
    title: '網路連線不穩定',
    category: '網路問題',
    reason: '網路設定',
    reporter: '王五',
    reportTime: '2025-05-03 11:15',
    status: 'completed'
  },
  {
    id: 4,
    title: '軟體當機',
    category: '軟體問題',
    reason: '系統錯誤',
    reporter: '趙六',
    reportTime: '2025-05-04 16:45',
    status: 'pending'
  },
  {
    id: 5,
    title: '螢幕顯示異常',
    category: '硬體故障',
    reason: '硬體故障',
    reporter: '孫七',
    reportTime: '2025-05-05 08:20',
    status: 'processing'
  }
])

// 計算屬性
const filteredData = computed(() => {
  return mockData.value.filter(item => {
    const matchKeyword = !searchForm.keyword || 
      item.title.includes(searchForm.keyword)
    const matchCategory = !searchForm.category || 
      item.category === searchForm.category
    const matchreason = !searchForm.reason || 
      item.reason === searchForm.reason
    const matchStatus = !searchForm.status || 
      item.status === searchForm.status
    
    return matchKeyword && matchCategory && matchreason && matchStatus
  })
})

const totalItems = computed(() => filteredData.value.length)
const totalPages = computed(() => Math.ceil(totalItems.value / pageSize.value))

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredData.value.slice(start, end)
})

const startItem = computed(() => {
  return totalItems.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1
})

const endItem = computed(() => {
  const end = currentPage.value * pageSize.value
  return end > totalItems.value ? totalItems.value : end
})

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
const handleSearch = () => {
  currentPage.value = 1
  console.log('執行搜尋:', searchForm)
}

const sortBy = (column) => {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = 'asc'
  }
  console.log('排序:', column, sortDirection.value)
}

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const openNewRepair = () => {
  console.log('開啟新增報修表單')
}

const getStatusClass = (status) => {
  const statusMap = {
    'pending': 'status-pending',
    'processing': 'status-processing', 
    'completed': 'status-completed'
  }
  return statusMap[status] || ''
}

const getStatusText = (status) => {
  const statusMap = {
    'pending': '待處理',
    'processing': '處理中',
    'completed': '已完成'
  }
  return statusMap[status] || status
}

onMounted(async ()=>{
  if(!repairStore.categories) {
    await repairStore.fetchCategories()
    await repairStore.fetchReasons()
    await repairStore.fetchStatuses()

    categories.value = repairStore.categories.data
    reasons.value = repairStore.reasons.data
    statuses.value = repairStore.statuses.data
    
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
            v-model="searchForm.keyword"
            placeholder="輸入案件標題"
            class="search-input"
            @keyup.enter="handleSearch"
          />
          <button class="search-btn" @click="handleSearch">🔍</button>
        </div>
        
        <div class="select-field">
          <select v-model="searchForm.category" class="search-select">
            <option value="">全部</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
          </select>
        </div>
        
        <div class="select-field">
          <select v-model="searchForm.reason" class="search-select">
            <option value="">全部</option>
            <option v-for="reason in reasons" :key="reason.id" :value="reason.id">{{ reason.name }}</option>
          </select>
        </div>
        
        <div class="select-field">
          <select v-model="searchForm.status" class="search-select">
            <option value="">全部</option>
            <option v-for="status in statuses" :key="status.id" :value="status.id">{{ status.name }}</option>
          </select>
        </div>
      </div>
      
      <div class="search-row">
        <div class="date-field">
          <label>報修時間</label>
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
          <button class="query-btn" @click="handleSearch">查詢</button>
          <button class="reset-btn" @click="handleReset">重置</button>
        </div>
      </div>
    </section>

    <!-- 資料表格區域 -->
    <section class="table-section">
      <div class="table-controls">
        <div class="pagination-control">
          <select v-model="pageSize" class="page-size-select">
            <option value="10">10筆/頁</option>
            <option value="20">20筆/頁</option>
            <option value="50">50筆/頁</option>
          </select>
        </div>
        
        <button class="new-repair-btn" @click="openNewRepair">新增報修</button>
      </div>

      <!-- 資料表格 -->
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th class="sortable" @click="sortBy('id')">
                項次 
                <span class="sort-icon" :class="{ 
                  'sort-asc': sortColumn === 'id' && sortDirection === 'asc',
                  'sort-desc': sortColumn === 'id' && sortDirection === 'desc'
                }">⇅</span>
              </th>
              <th class="sortable" @click="sortBy('title')">
                案件標題 
                <span class="sort-icon" :class="{ 
                  'sort-asc': sortColumn === 'title' && sortDirection === 'asc',
                  'sort-desc': sortColumn === 'title' && sortDirection === 'desc'
                }">⇅</span>
              </th>
              <th class="sortable" @click="sortBy('category')">
                故障類別 
                <span class="sort-icon" :class="{ 
                  'sort-asc': sortColumn === 'category' && sortDirection === 'asc',
                  'sort-desc': sortColumn === 'category' && sortDirection === 'desc'
                }">⇅</span>
              </th>
              <th class="sortable" @click="sortBy('reason')">
                故障原因 
                <span class="sort-icon" :class="{ 
                  'sort-asc': sortColumn === 'reason' && sortDirection === 'asc',
                  'sort-desc': sortColumn === 'reason' && sortDirection === 'desc'
                }">⇅</span>
              </th>
              <th class="sortable" @click="sortBy('reporter')">
                報修人員 
                <span class="sort-icon" :class="{ 
                  'sort-asc': sortColumn === 'reporter' && sortDirection === 'asc',
                  'sort-desc': sortColumn === 'reporter' && sortDirection === 'desc'
                }">⇅</span>
              </th>
              <th class="sortable" @click="sortBy('reportTime')">
                報修時間 
                <span class="sort-icon" :class="{ 
                  'sort-asc': sortColumn === 'reportTime' && sortDirection === 'asc',
                  'sort-desc': sortColumn === 'reportTime' && sortDirection === 'desc'
                }">⇅</span>
              </th>
              <th class="sortable" @click="sortBy('status')">
                處理狀態 
                <span class="sort-icon" :class="{ 
                  'sort-asc': sortColumn === 'status' && sortDirection === 'asc',
                  'sort-desc': sortColumn === 'status' && sortDirection === 'desc'
                }">⇅</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in paginatedData" :key="item.id" class="table-row">
              <td>{{ item.id }}</td>
              <td>{{ item.title }}</td>
              <td>{{ item.category }}</td>
              <td>{{ item.reason }}</td>
              <td>{{ item.reporter }}</td>
              <td>{{ item.reportTime }}</td>
              <td>
                <span :class="['status-badge', getStatusClass(item.status)]">
                  {{ getStatusText(item.status) }}
                </span>
              </td>
            </tr>
            <tr v-if="paginatedData.length === 0">
              <td colspan="7" class="no-data">暫無資料</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分頁控制 -->
      <div class="pagination-section">
        <div class="pagination-info">
          顯示第 {{ startItem }} 到 {{ endItem }} 筆結果 共 {{ totalItems }} 項
        </div>
        
        <div class="pagination-controls">
          <button 
            class="page-btn" 
            :disabled="currentPage === 1"
            @click="goToPage(currentPage - 1)"
          >
            ‹
          </button>
          
          <button 
            v-for="page in visiblePages" 
            :key="page"
            :class="['page-btn', { active: page === currentPage }]"
            @click="goToPage(page)"
          >
            {{ page }}
          </button>
          
          <span v-if="showEllipsis" class="ellipsis">...</span>
          
          <button 
            v-if="totalPages > 5"
            :class="['page-btn', { active: totalPages === currentPage }]"
            @click="goToPage(totalPages)"
          >
            {{ totalPages }}
          </button>
          
          <button 
            class="page-btn" 
            :disabled="currentPage === totalPages"
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

      &:hover {
        background: #f8f9fa;
        border-color: #6c5ce7;
        color: #6c5ce7;
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

      &:hover {
        background: #5b4bcf;
        transform: translateY(-1px);
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
              opacity: 0.7;
              transition: all 0.3s;

              &.sort-asc {
                opacity: 1;
                color: #fff;
              }

              &.sort-desc {
                opacity: 1;
                color: #fff;
                transform: rotate(180deg);
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

  .pagination-section {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }
}
</style>
<script setup>
import router from '@/router'
import { ref, computed, reactive, onMounted, watch, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { PERMISSIONS } from '@/utils/permissions'

const authStore = useAuthStore()
const hasReadMailPermission = computed(() => authStore.canAccessPage(PERMISSIONS.MAIL_MANAGEMENT))
const hasReadRepairCategoryPermission = computed(() => authStore.canAccessPage(PERMISSIONS.REPAIR_CATEGORY_MANAGEMENT))
const hasReadRepairStatusPermission = computed(() => authStore.canAccessPage(PERMISSIONS.REPAIR_STATUS_MANAGEMENT))
const hasReadUnitTagPermission = computed(() => authStore.canAccessPage(PERMISSIONS.UNIT_TAG_MANAGEMENT))
// 搜尋表單
const searchForm = reactive({
  keyword: '',
  searchHistory: [] // 搜尋歷史
})

// 分頁設定
const currentPage = ref(1)
const pageSize = ref(10)
const totalItems = ref(0) // 動態計算總數

// 載入狀態
const isLoading = ref(false)
const searchInputRef = ref(null)

// 完整的參數資料（模擬從 API 獲取）
const allParameterData = ref([
  {
    id: 1,
    parameterName: '故障類別',
    url: '/settings/parameter/repair-category-management',
    read: hasReadRepairCategoryPermission.value,
  },
  {
    id: 2,
    parameterName: '維修狀態',
    url: '/settings/parameter/repair-status-management',
    read: hasReadRepairStatusPermission.value,
  },
  {
    id: 3,
    parameterName: '系統信箱',
    url: '/settings/parameter/mail-management',
    read: hasReadMailPermission.value,
  },
  {
    id: 4,
    parameterName: '單位標籤',
    url: '/settings/parameter/unit-tag-management',
    read: hasReadMailPermission.value,
  },
])

// 搜尋結果
const filteredData = ref([])
const isSearching = ref(false)
const searchNotFound = ref(false)

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

// 當前顯示的資料（分頁後）
const currentPageData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredData.value.slice(start, end)
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

// 搜尋建議
const searchSuggestions = computed(() => {
  if (!searchForm.keyword.trim()) return []
  
  const keyword = searchForm.keyword.toLowerCase()
  const suggestions = []
  
  // 從參數名稱中找建議
  allParameterData.value.forEach(item => {
    if (item.parameterName.toLowerCase().includes(keyword) && 
        !suggestions.includes(item.parameterName)) {
      suggestions.push(item.parameterName)
    }
  })
  return suggestions.slice(0, 5) // 最多顯示5個建議
})

// 監聽搜尋關鍵字變化，實現即時搜尋
watch(() => searchForm.keyword, (newKeyword) => {
  if (newKeyword.trim()) {
    performSearch()
  } else {
    resetSearch()
  }
}, { debounce: 300 }) // 防抖動，300ms後執行

// 搜尋方法
const performSearch = () => {
  isSearching.value = true
  searchNotFound.value = false
  currentPage.value = 1
  
  const keyword = searchForm.keyword.toLowerCase().trim()
  
  if (!keyword) {
    resetSearch()
    return
  }
  
  // 模擬搜尋延遲
  setTimeout(() => {
    filteredData.value = allParameterData.value.filter(item => {
      if (!item.read) return false
      
      const searchableText = [
        item.parameterName,
      ].join(' ').toLowerCase()
      
      return searchableText.includes(keyword)
    })
    
    totalItems.value = filteredData.value.length
    searchNotFound.value = filteredData.value.length === 0
    isSearching.value = false
    
    // 添加到搜尋歷史
    addToSearchHistory(searchForm.keyword)
  }, 500)
}

// 重置搜尋
const resetSearch = () => {
  filteredData.value = allParameterData.value.filter(item => item.read)
  totalItems.value = filteredData.value.length
  searchNotFound.value = false
  isSearching.value = false

  //console.log(filteredData.value);
  
}

// 手動搜尋
const handleSearch = () => {
  if (searchForm.keyword.trim()) {
    performSearch()
  } else {
    resetSearch()
  }
}

// 重置表單
const handleReset = () => {
  searchForm.keyword = ''
  currentPage.value = 1
  resetSearch()
  
  // 聚焦到搜尋框
  nextTick(() => {
    if (searchInputRef.value) {
      searchInputRef.value.focus()
    }
  })
}

// 添加到搜尋歷史
const addToSearchHistory = (keyword) => {
  if (!keyword.trim()) return
  
  const history = searchForm.searchHistory
  const index = history.indexOf(keyword)
  
  if (index > -1) {
    history.splice(index, 1)
  }
  
  history.unshift(keyword)
  
  // 只保留最近10個搜尋記錄
  if (history.length > 10) {
    history.pop()
  }
}

// 使用搜尋建議
const applySuggestion = (suggestion) => {
  searchForm.keyword = suggestion
  performSearch()
}

// 清除搜尋歷史
const clearSearchHistory = () => {
  searchForm.searchHistory = []
}

// 分頁跳轉
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}


// 頁面操作
const addParameter = () => {
  //console.log('新增參數')
}

const editParameter = (url) => {
  if (url) {
    router.push(url)
  } else {
    //console.log('編輯功能尚未開放')
  }
}

const deleteParameter = (item) => {
  //console.log('刪除參數:', item)
}

// 初始化
onMounted(() => {
  resetSearch()
  //console.log('參數管理頁面已載入')
})
</script>

<template>
  <div class="parameter-management">
    <!-- 頁面標題 -->
    <div class="page-header">
      <h1 class="page-title">參數管理</h1>
      <div class="page-subtitle">
        系統參數配置與管理
      </div>
    </div>

    <!-- 搜尋區域 -->
    <section class="search-section">
      <div class="search-row">
        <div class="search-field">
          <input 
            ref="searchInputRef"
            type="text" 
            v-model="searchForm.keyword"
            placeholder="請輸入參數名稱..."
            class="search-input"
          />
        </div>
        
        <div class="action-buttons">
          <button class="query-btn" @click="handleSearch" :disabled="isSearching">
            {{ isSearching ? '搜尋中...' : '查詢' }}
          </button>
          <button class="reset-btn" @click="handleReset">
            重置
          </button>
        </div>
      </div>
      
      
      <!-- 搜尋歷史 -->
      <div v-if="searchForm.searchHistory.length > 0 && false" class="search-history">
        <div class="history-header">
          <span class="history-label">最近搜尋：</span>
          <button class="clear-history" @click="clearSearchHistory">清除</button>
        </div>
        <div class="history-tags">
          <button 
            v-for="history in searchForm.searchHistory.slice(0, 5)" 
            :key="history"
            class="history-tag"
            @click="applySuggestion(history)"
          >
            {{ history }}
          </button>
        </div>
      </div>
    </section>

    <!-- 功能按鈕區域 -->
    <section class="control-section">
      <div class="left-controls">
        <div class="result-info">
          <span v-if="searchForm.keyword">
            「{{ searchForm.keyword }}」的搜尋結果：
          </span>
          顯示第 {{ startItem }} 到 {{ endItem }} 筆結果 共 {{ totalItems }} 項
        </div>
        <div v-if="searchNotFound" class="no-result-tip">
          沒有找到相關結果，請嘗試其他關鍵字
        </div>
      </div>
      
      <div class="right-controls">
        <button class="control-btn add-btn" v-if="false" @click="addParameter">
          新增參數
        </button>
      </div>
    </section>

    <!-- 資料表格區域 -->
    <section class="table-section">
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th class="id-column" style="width:20px;">項次</th>
              <th class="name-column">參數名稱</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading 狀態 -->
            <tr v-if="isSearching" class="loading-row">
              <td colspan="5" class="loading-cell">
                <div class="loading-container">
                  <div class="loading-spinner">⟳</div>
                  <div class="loading-text">搜尋中...</div>
                </div>
              </td>
            </tr>
            
            <!-- 正常資料顯示 -->
            <tr v-else v-for="(item, index) in currentPageData" :key="item.id" class="table-row cursor-pointer" @click="editParameter(item.url)">
              <td class="id-cell">{{ index + 1 }}</td>
              <td class="name-cell">
                <div class="name-content">
                  <span class="name-text">{{ item.parameterName }}</span>
                </div>
              </td>
            </tr>
            
            <!-- 無資料狀態 -->
            <tr v-if="!isSearching && searchNotFound">
              <td colspan="5" class="no-data">
                <div class="no-data-content">
                  <div class="no-data-icon">🔍</div>
                  <div class="no-data-text">沒有找到符合條件的參數</div>
                  <div class="no-data-suggestion">
                    請嘗試：
                    <button class="suggestion-btn" @click="handleReset">清除搜尋條件</button>
                    或使用其他關鍵字
                  </div>
                </div>
              </td>
            </tr>
            
            <!-- 完全無資料 -->
            <tr v-if="!isSearching && !searchNotFound && currentPageData.length === 0">
              <td colspan="5" class="no-data">暫無資料</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分頁控制 -->
      <div class="pagination-section" v-if="totalPages > 1">
        <div class="pagination-info">
          <span v-if="isSearching">搜尋中...</span>
          <span v-else>顯示第 {{ startItem }} 到 {{ endItem }} 筆結果 共 {{ totalItems }} 項</span>
        </div>
        
        <div class="pagination-controls">
          <button 
            class="page-btn" 
            :disabled="currentPage === 1 || isSearching"
            @click="goToPage(currentPage - 1)"
          >
            ‹
          </button>
          
          <template v-for="page in visiblePages" :key="page">
            <button 
              v-if="page !== '...'"
              :class="['page-btn', { active: page === currentPage }]"
              :disabled="isSearching"
              @click="goToPage(page)"
            >
              {{ page }}
            </button>
            <span v-else class="ellipsis">...</span>
          </template>
          
          <button 
            class="page-btn" 
            :disabled="currentPage === totalPages || isSearching"
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
.parameter-management {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

// 頁面標題
.page-header {
  margin-bottom: 20px;
  
  .page-title {
    font-size: 24px;
    font-weight: 600;
    color: #333;
    margin: 0 0 5px 0;
  }
  
  .page-subtitle {
    font-size: 14px;
    color: #666;
    margin: 0;
  }
}

// Loading 動畫
.loading-spinner {
  display: inline-block;
  animation: spin 1s linear infinite;
  font-size: 16px;
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
  }

  .search-field {
    position: relative;
    flex: 1;
    max-width: 500px;

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
    
    // 搜尋建議
    .search-suggestions {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 1px solid #ddd;
      border-top: none;
      border-radius: 0 0 6px 6px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      z-index: 100;
      
      .suggestion-item {
        padding: 10px 15px;
        cursor: pointer;
        transition: background-color 0.2s;
        
        &:hover {
          background: #f8f9fa;
        }
        
        &:last-child {
          border-radius: 0 0 6px 6px;
        }
      }
    }
  }

  .action-buttons {
    display: flex;
    gap: 10px;

    .query-btn, .reset-btn {
      padding: 12px 30px;
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
    }

    .query-btn {
      background: #6c5ce7;
      color: white;

      &:hover:not(:disabled) {
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
  
  // 快速搜尋標籤
  .quick-search-tags {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 15px;
    
    .tag-label {
      font-size: 14px;
      color: #666;
    }
    
    .quick-tag {
      padding: 6px 12px;
      background: #f0f0f0;
      border: none;
      border-radius: 16px;
      font-size: 12px;
      color: #666;
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
        background: #6c5ce7;
        color: white;
      }
    }
  }
  
  // 搜尋歷史
  .search-history {
    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      
      .history-label {
        font-size: 14px;
        color: #666;
      }
      
      .clear-history {
        background: none;
        border: none;
        color: #999;
        font-size: 12px;
        cursor: pointer;
        
        &:hover {
          color: #666;
        }
      }
    }
    
    .history-tags {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      
      .history-tag {
        padding: 4px 10px;
        background: #e9ecef;
        border: none;
        border-radius: 12px;
        font-size: 12px;
        color: #666;
        cursor: pointer;
        transition: all 0.2s;
        
        &:hover {
          background: #6c5ce7;
          color: white;
        }
      }
    }
  }
}

// 控制區域
.control-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;

  .left-controls {
    .result-info {
      font-size: 14px;
      color: #666;
      margin-bottom: 5px;
    }
    
    .no-result-tip {
      font-size: 12px;
      color: #f57c00;
    }
  }

  .right-controls {
    .add-btn {
      background: #28a745;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s;

      &:hover {
        background: #218838;
        transform: translateY(-1px);
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

          &.id-column {
            width: 80px;
            text-align: center;
          }

          &.name-column {
            width: 200px;
          }
          
          &.category-column {
            width: 120px;
          }
          
          &.description-column {
            min-width: 200px;
          }
          
          &.status-column {
            width: 100px;
            text-align: center;
          }
        }
      }

      tbody {
        .table-row {
          border-bottom: 1px solid #f0f0f0;
          transition: background-color 0.2s;
          
          &.cursor-pointer {
            cursor: pointer;
          }
          
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
              color: #6c5ce7;
            }

            &.name-cell {
              .name-content {
                display: flex;
                flex-direction: column;
                
                .name-text {
                  font-weight: 500;
                }
              }
            }
            
            &.category-cell {
              .category-tag {
                padding: 4px 8px;
                background: #e3f2fd;
                color: #1976d2;
                border-radius: 12px;
                font-size: 12px;
              }
            }
            
            &.description-cell {
              color: #666;
              font-size: 13px;
            }
            
            &.status-cell {
              text-align: center;
              
              .status-badge {
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 500;
                
                &.active {
                  background: #e8f5e8;
                  color: #2e7d32;
                }
                
                &.inactive {
                  background: #ffeaa7;
                  color: #e17055;
                }
              }
            }
          }
        }

        .no-data {
          text-align: center;
          padding: 40px;
          color: #999;
          
          .no-data-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            
            .no-data-icon {
              font-size: 48px;
              opacity: 0.5;
            }
            
            .no-data-text {
              font-size: 16px;
              margin-bottom: 10px;
            }
            
            .no-data-suggestion {
              font-size: 14px;
              color: #666;
              
              .suggestion-btn {
                background: none;
                border: none;
                color: #6c5ce7;
                cursor: pointer;
                text-decoration: underline;
                
                &:hover {
                  color: #5b4bcf;
                }
              }
            }
          }
        }
      }
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
  .parameter-management {
    padding: 15px;
  }

  .search-section {
    padding: 20px;
    
    .search-row {
      flex-direction: column;
      gap: 15px;

      .search-field {
        max-width: none;
      }
    }
    
    .quick-search-tags,
    .search-history {
      .quick-tag,
      .history-tag {
        font-size: 11px;
        padding: 4px 8px;
      }
    }
  }

  .control-section {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;

    .left-controls,
    .right-controls {
      text-align: center;
    }
  }

  .table-section {
    .data-table {
      font-size: 12px;
      
      th, td {
        padding: 10px 8px;
      }
      
      .category-cell .category-tag {
        display: none;
      }
      
      .description-cell {
        display: none;
      }
    }
  }

  .pagination-section {
    flex-direction: column;
    gap: 15px;
    text-align: center;
    
    .pagination-controls {
      justify-content: center;
    }
  }
}

// 搜尋高亮效果
.search-highlight {
  background: #fff3cd;
  padding: 1px 3px;
  border-radius: 2px;
}

// 動畫效果
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.table-row {
  animation: fadeIn 0.3s ease-out;
}

// 自定義滾動條
.table-container::-webkit-scrollbar {
  height: 8px;
}

.table-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.table-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.table-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
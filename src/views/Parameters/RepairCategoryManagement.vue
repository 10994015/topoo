<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCategoryStore } from '@/stores/repair.category'
import { formatDate, formatDateTime } from '@/utils/dateUtils'

const router = useRouter()
const categoryStore = useCategoryStore()

// 搜尋表單
const searchForm = reactive({
  name: ''
})

// 分頁設定 - 類別
const currentPage = ref(1)
const pageSize = ref(10)
const sortColumn = ref('updated_at')
const sortDirection = ref('desc')

// 載入狀態
const isLoading = ref(true)
const isSearching = ref(false)


// 展開狀態管理
const expandedCategories = ref(new Set())
const reasonPages = ref(new Map()) // 每個類別的原因分頁狀態

// 資料
const categoryData = ref([])
const totalItems = ref(0)
const totalPages = ref(0)

// 計算項目範圍
const startItem = computed(() => {
  return totalItems.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1
})

const endItem = computed(() => {
  const end = currentPage.value * pageSize.value
  return end > totalItems.value ? totalItems.value : end
})

// 分頁顯示邏輯
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

// 切換類別展開狀態
const toggleCategory = async (categoryId) => {
  if (expandedCategories.value.has(categoryId)) {
    expandedCategories.value.delete(categoryId)
    reasonPages.value.delete(categoryId)
  } else {
    expandedCategories.value.add(categoryId)
    // 初始化該類別的原因分頁
    reasonPages.value.set(categoryId, {
      currentPage: 1,
      pageSize: 5,
      sortColumn: 'updated_at',
      sortDirection: 'desc'
    })
    // 載入該類別的原因
    await loadCategoryReasons(categoryId)
  }
}

// 載入類別的原因
const loadCategoryReasons = async (categoryId) => {
  try {
    const reasonPage = reasonPages.value.get(categoryId)
    await categoryStore.fetchReasons(
      categoryId,
      reasonPage.sortColumn,
      reasonPage.sortDirection,
      reasonPage.pageSize,
      reasonPage.currentPage
    )
  } catch (error) {
    console.error('載入原因失敗:', error)
  }
}

// 原因分頁控制
const goToReasonPage = async (categoryId, page) => {
  const reasonPage = reasonPages.value.get(categoryId)
  if (page >= 1 && page <= categoryStore.getReasonTotalPages(categoryId)) {
    reasonPage.currentPage = page
    reasonPages.value.set(categoryId, reasonPage)
    await loadCategoryReasons(categoryId)
  }
}

// 原因排序
const sortReasons = async (categoryId, column) => {
  const reasonPage = reasonPages.value.get(categoryId)
  if (reasonPage.sortColumn === column) {
    reasonPage.sortDirection = reasonPage.sortDirection === 'asc' ? 'desc' : 'asc'
  } else {
    reasonPage.sortColumn = column
    reasonPage.sortDirection = 'asc'
  }
  reasonPage.currentPage = 1
  reasonPages.value.set(categoryId, reasonPage)
  await loadCategoryReasons(categoryId)
}

// 搜尋
const handleSearch = async () => {
  currentPage.value = 1
  await getCategoryData()
}

// 重置搜尋
const handleReset = () => {
  searchForm.name = ''
  currentPage.value = 1
  expandedCategories.value.clear()
  reasonPages.value.clear()
}

// 排序
const sortBy = async (column) => {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = 'asc'
  }
  await getCategoryData()
}

// 分頁控制
const goToPage = async (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    await getCategoryData()
  }
}

// 載入類別資料
const getCategoryData = async () => {
  try {
    isSearching.value = true
    await categoryStore.fetchCategories(
      searchForm,
      sortColumn.value,
      sortDirection.value,
      pageSize.value,
      currentPage.value
    )
    
    categoryData.value = categoryStore.categories.data.data || []
    totalPages.value = categoryStore.categories.data.totalPages || 0
    totalItems.value = categoryStore.categories.data.total || 0
  } catch (error) {
    console.error('載入類別資料失敗:', error)
  } finally {
    isSearching.value = false
  }
}

// 新增類別
const createNewCategory = () => {
  router.push('/settings/parameter/repair-category/create')
}

// 編輯類別
const editCategory = (id) => {
  router.push(`/settings/parameter/repair-category/edit/${id}`)
}
// 新增原因
const createNewReason = (id) => {
  router.push(`/settings/parameter/repair-reason/create/${id}`)
}
// 編輯原因
const editReason = (categoryId, reasonId) => {
  router.push(`/settings/parameter/repair-reason/edit/${categoryId}/${reasonId}`)
}

// 監聽分頁大小變化
watch(pageSize, async () => {
  currentPage.value = 1
  await getCategoryData()
})

// 組件掛載
onMounted(async () => {
  try {
    await getCategoryData()
  } catch (error) {
    console.error('初始化失敗:', error)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="category-management">
    <!-- 搜尋區域 -->
    <section class="search-section">
      <div class="search-row">
        <div class="search-field">
          <input 
            type="text" 
            v-model="searchForm.name"
            placeholder="輸入故障類別名稱"
            class="search-input"
            @keyup.enter="handleSearch"
            :disabled="isLoading"
          />
          <button class="search-btn" @click="handleSearch" :disabled="isLoading || isSearching">
            <span v-if="isSearching" class="loading-spinner">⟳</span>
            <span v-else>🔍</span>
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
            <option value="10">10筆/頁</option>
            <option value="20">20筆/頁</option>
            <option value="50">50筆/頁</option>
          </select>
        </div>
        
        <button class="new-category-btn" @click="createNewCategory" :class="{ disabled: isLoading }" :disabled="isLoading">
          新增故障類別
        </button>
      </div>

      <!-- 資料表格 -->
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th width="80">項次</th>
              <th class="sortable" @click="!isLoading && sortBy('name')">
                故障類別
                <span class="sort-icon" v-if="sortColumn === 'name'">
                  <span v-if="sortDirection === 'asc'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th class="sortable" @click="!isLoading && sortBy('updated_at')">
                更新時間
                <span class="sort-icon" v-if="sortColumn === 'updated_at'">
                  <span v-if="sortDirection === 'asc'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th width="120">展開/收合</th>
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
            <template v-else v-for="(item, index) in categoryData" :key="item.id">
              <!-- 類別行 -->
              <tr class="table-row category-row">
                <td>{{ (currentPage - 1) * pageSize + index + 1 }}</td>
                <td><router-link :to="`/settings/parameter/repair-category/edit/${item.id}`">{{ item.name }}</router-link></td>
                <td>{{ formatDateTime(item.updated_at) }}</td>
                <td>
                  <button 
                    class="action-btn expand-btn" 
                    @click="toggleCategory(item.id)"
                    :title="expandedCategories.has(item.id) ? '收合' : '展開'"
                  >
                    {{ expandedCategories.has(item.id) ? '收合' : '展開' }}
                  </button>
                </td>
              </tr>
              
              <!-- 展開的原因列表 -->
              <tr v-if="expandedCategories.has(item.id)" class="expanded-row">
                <td colspan="4" class="expanded-content">
                  <div class="reasons-container">
                    <div class="reasons-header">
                      <h4>{{ item.name }} - 故障原因</h4>
                      <button class="new-reason-btn" @click="createNewReason(item.id)" :disabled="isLoading">
                        新增故障原因
                      </button>
                    </div>
                    
                    <!-- 原因子表格 -->
                    <table class="reasons-table">
                      <thead>
                        <tr>
                          <th width="60">項次</th>
                          <th class="sortable" @click="sortReasons(item.id, 'name')">
                            故障原因
                            <span class="sort-icon" 
                              v-if="reasonPages.get(item.id)?.sortColumn === 'name'">
                              <span v-if="reasonPages.get(item.id)?.sortDirection === 'asc'">↑</span>
                              <span v-else>↓</span>
                            </span>
                            <span class="sort-icon neutral" v-else>⇅</span>
                          </th>
                          <th class="sortable" @click="sortReasons(item.id, 'updated_at')">
                            更新時間
                            <span class="sort-icon" 
                              v-if="reasonPages.get(item.id)?.sortColumn === 'updated_at'">
                              <span v-if="reasonPages.get(item.id)?.sortDirection === 'asc'">↑</span>
                              <span v-else>↓</span>
                            </span>
                            <span class="sort-icon neutral" v-else>⇅</span>
                          </th>
                          <th width="80">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(reason, reasonIndex) in categoryStore.getCategoryReasons(item.id)" 
                            :key="reason.id" 
                            class="reason-row">
                          <td>{{ reasonIndex + 1 }}</td>
                          <td>{{ reason.name }}</td>
                          <td>{{ formatDateTime(reason.updated_at) }}</td>
                          <td>
                            <button 
                              class="action-btn edit-btn" 
                              @click="editReason(item.id, reason.id)"
                              title="編輯"
                            >
                              編輯
                            </button>
                          </td>
                        </tr>
                        <!-- 原因無資料 -->
                        <tr v-if="!categoryStore.getCategoryReasons(item.id) || categoryStore.getCategoryReasons(item.id).length === 0">
                          <td colspan="4" class="no-reasons">暫無故障原因</td>
                        </tr>
                      </tbody>
                    </table>
                    
                    <!-- 原因分頁控制 -->
                    <div class="reasons-pagination" v-if="categoryStore.getReasonTotalPages(item.id) > 1">
                      <div class="pagination-info">
                        <span>
                          顯示第 {{ (reasonPages.get(item.id)?.currentPage - 1) * reasonPages.get(item.id)?.pageSize + 1 }} 
                          到 {{ Math.min(reasonPages.get(item.id)?.currentPage * reasonPages.get(item.id)?.pageSize, categoryStore.getReasonTotal(item.id)) }} 
                          筆結果 共 {{ categoryStore.getReasonTotal(item.id) }} 項
                        </span>
                      </div>
                      
                      <div class="pagination-controls">
                        <button 
                          class="page-btn" 
                          :disabled="reasonPages.get(item.id)?.currentPage === 1"
                          @click="goToReasonPage(item.id, reasonPages.get(item.id)?.currentPage - 1)"
                        >
                          ‹
                        </button>
                        
                        <button 
                          v-for="page in Math.min(5, categoryStore.getReasonTotalPages(item.id))" 
                          :key="page"
                          :class="['page-btn', { active: page === reasonPages.get(item.id)?.currentPage }]"
                          @click="goToReasonPage(item.id, page)"
                        >
                          {{ page }}
                        </button>
                        
                        <button 
                          class="page-btn" 
                          :disabled="reasonPages.get(item.id)?.currentPage === categoryStore.getReasonTotalPages(item.id)"
                          @click="goToReasonPage(item.id, reasonPages.get(item.id)?.currentPage + 1)"
                        >
                          ›
                        </button>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
            
            <!-- 無資料狀態 -->
            <tr v-if="!isLoading && !isSearching && categoryData.length === 0">
              <td colspan="4" class="no-data">暫無資料</td>
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
.category-management {
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

        &:hover:not(:disabled) {
          color: #6c5ce7;
        }

        &:disabled {
          color: #ccc;
          cursor: not-allowed;
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

    .new-category-btn {
      background: #6c5ce7;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s;

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

          &.category-row {
            background: #fff;
            font-weight: 500;
          }

          td {
            padding: 15px 20px;
            font-size: 14px;
            color: #333;
          }
        }

        .expanded-row {
          background: #f9f9f9;
          
          .expanded-content {
            padding: 0;
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

// 展開內容樣式
.reasons-container {
  padding: 20px;
  background: #f9f9f9;

  .reasons-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;

    h4 {
      margin: 0;
      color: #333;
      font-size: 16px;
    }

    .new-reason-btn {
      background: #28a745;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s;

      &:hover {
        background: #218838;
        transform: translateY(-1px);
      }
    }
  }

  .reasons-table {
    width: 100%;
    border-collapse: collapse;
    background: white;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

    thead {
      background: #fff !important;
      color: #6c5ce7  !important;
      

      th {
        padding: 12px 15px;
        text-align: left;
        font-weight: 500;
        font-size: 13px;
        border: 1px #6c5ce7 solid;

        &.sortable {
          cursor: pointer;
          user-select: none;

          &:hover {
            background: rgba(255, 255, 255, 0.1);
          }

          .sort-icon {
            margin-left: 6px;
            opacity: 1;
            font-size: 12px;
            
            &.neutral {
              opacity: 0.5;
            }
          }
        }
      }
    }

    tbody {
      .reason-row {
        border-bottom: 1px solid #eee;
        transition: background-color 0.2s;
        border: 1px #6c5ce7 solid;

        &:hover {
          background: #f8f9fa;
        }

        td {
          padding: 12px 15px;
          font-size: 13px;
          color: #333;
        }
      }

      .no-reasons {
        text-align: center;
        padding: 30px;
        color: #999;
        font-style: italic;
        font-size: 13px;
      }
    }
  }

  .reasons-pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid #ddd;

    .pagination-info {
      font-size: 12px;
      color: #666;
    }

    .pagination-controls {
      display: flex;
      gap: 3px;

      .page-btn {
        padding: 6px 10px;
        border: 1px solid #ddd;
        background: white;
        color: #333;
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;

        &:hover:not(:disabled) {
          background: #f8f9fa;
          border-color: #495057;
        }

        &.active {
          background: #495057;
          color: white;
          border-color: #495057;
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

// 動作按鈕
.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
  text-decoration: none;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  &.expand-btn {
    background: #17a2b8;
    color: white;

    &:hover {
      background: #138496;
    }
  }

  &.edit-btn {
    background: #ffc107;
    color: #212529;

    &:hover {
      background: #e0a800;
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

// 響應式設計
@media (max-width: 768px) {
  .search-row {
    flex-direction: column;
    gap: 15px;

    .search-field {
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

  .reasons-header {
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
  }

  .reasons-pagination {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }
}
</style>
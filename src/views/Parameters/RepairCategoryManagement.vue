<script setup>
import { ref, computed, reactive, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useCategoryStore } from '@/stores/repair.category'
import { formatDateTime } from '@/utils/dateUtils'
import { PERMISSIONS } from '@/utils/permissions'
import { useAuthStore } from '@/stores/auth'
import { mdiPencil } from '@mdi/js'

const router = useRouter()
const categoryStore = useCategoryStore()
const authStore = useAuthStore()

// 響應式視窗寬度監聽
const windowWidth = ref(window.innerWidth)

// 檢查各個報表的權限
const hasReadManageRepairReasonPermission = computed(() => authStore.canAccessPage(PERMISSIONS.REPAIR_REASON_MANAGEMENT))
const hasWriteManageRepairReasonPermission = computed(() => authStore.canModify(PERMISSIONS.REPAIR_REASON_MANAGEMENT))
const hasWriteManageRepairCategoryPermission = computed(() => authStore.canModify(PERMISSIONS.REPAIR_CATEGORY_MANAGEMENT))

// 響應式計算屬性 - 判斷螢幕尺寸
const isMobile = computed(() => windowWidth.value <= 767)
const isTablet = computed(() => windowWidth.value > 767 && windowWidth.value <= 991)
const isDesktop = computed(() => windowWidth.value > 991)

// 視窗尺寸變化處理器
const handleResize = () => {
  windowWidth.value = window.innerWidth
}

// 搜尋表單
const searchForm = reactive({
  name: ''
})

// 分頁設定 - 類別
const currentPage = ref(1)
const pageSize = ref(10)
const sortColumn = ref('sequence')
const sortDirection = ref('asc')

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
  if(!hasReadManageRepairReasonPermission.value) return
  if (expandedCategories.value.has(categoryId)) {
    expandedCategories.value.delete(categoryId)
    reasonPages.value.delete(categoryId)
  } else {
    expandedCategories.value.add(categoryId)
    // 初始化該類別的原因分頁
    reasonPages.value.set(categoryId, {
      currentPage: 1,
      pageSize: 5,
      sortColumn: 'sequence',
      sortDirection: 'asc'
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
    //console.error('載入原因失敗:', error)
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
    //console.error('載入類別資料失敗:', error)
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
  // 添加視窗尺寸監聽器
  window.addEventListener('resize', handleResize)
  
  try {
    await getCategoryData()
  } catch (error) {
    //console.error('初始化失敗:', error)
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
          <button class="search-icon-btn" @click="handleSearch" :disabled="isLoading || isSearching">
            <span v-if="isSearching" class="loading-spinner">⟳</span>
            <span v-else>🔍</span>
          </button>
        </div>
        
        <div class="action-buttons">
          <button class="search-btn" @click="handleSearch" :disabled="isLoading || isSearching">
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
        
        <button v-if="hasWriteManageRepairCategoryPermission" class="new-category-btn" @click="createNewCategory" :class="{ disabled: isLoading }" :disabled="isLoading">
          新增故障類別
        </button>
      </div>

      <!-- 桌面版和平板版表格 -->
      <div class="table-container" v-if="!isMobile">
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
              <th v-if="hasWriteManageRepairCategoryPermission">編輯</th>
              <th width="120" v-if="hasReadManageRepairReasonPermission">展開/收合</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading 狀態 -->
            <tr v-if="isLoading" class="loading-row">
              <td :colspan="hasReadManageRepairReasonPermission ? 4 : 3" class="loading-cell">
                <div class="loading-container">
                  <div class="loading-spinner large">⟳</div>
                  <div class="loading-text">資料載入中...</div>
                </div>
              </td>
            </tr>
            
            <!-- 搜尋中狀態 -->
            <tr v-else-if="isSearching" class="loading-row">
              <td :colspan="hasReadManageRepairReasonPermission ? 4 : 3" class="loading-cell">
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
                <td>
                    {{ item.name }}
                </td>
                <td>{{ formatDateTime(item.updated_at) }}</td>
                <td v-if="hasWriteManageRepairCategoryPermission">
                  <button 
                    class="edit-btn"
                    @click="editCategory(item)"
                    title="編輯"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24">
                      <path :d="mdiPencil" fill="currentColor"></path>
                    </svg>
                  </button>
                </td>
                <td v-if="hasReadManageRepairReasonPermission">
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
                <td :colspan="hasReadManageRepairReasonPermission ? 5 : 4" class="expanded-content">
                  <div class="reasons-container">
                    <div class="reasons-header">
                      <h4>{{ item.name }} - 故障原因</h4>
                      <button v-if="hasWriteManageRepairReasonPermission" class="new-reason-btn" @click="createNewReason(item.id)" :disabled="isLoading">
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
                          <th width="80" v-if="hasWriteManageRepairReasonPermission">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(reason, reasonIndex) in categoryStore.getCategoryReasons(item.id)" 
                            :key="reason.id" 
                            class="reason-row">
                          <td>{{ reasonIndex + 1 }}</td>
                          <td>{{ reason.name }}</td>
                          <td>{{ formatDateTime(reason.updated_at) }}</td>
                          <td v-if="hasWriteManageRepairReasonPermission">
                            <button 
                              class="action-btn edit-btn" 
                              @click="editReason(item.id, reason.id)"
                              title="編輯"
                            >
                               <svg width="16" height="16" viewBox="0 0 24 24">
                                <path :d="mdiPencil" fill="currentColor"></path>
                              </svg>
                            </button>
                          </td>
                        </tr>
                        <!-- 原因無資料 -->
                        <tr v-if="!categoryStore.getCategoryReasons(item.id) || categoryStore.getCategoryReasons(item.id).length === 0">
                          <td :colspan="hasWriteManageRepairReasonPermission ? 4 : 3" class="no-reasons">暫無故障原因</td>
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
              <td :colspan="hasReadManageRepairReasonPermission ? 4 : 3" class="no-data">暫無資料</td>
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
        <div v-else v-for="(item, index) in categoryData" :key="item.id" class="mobile-card">
          <div class="card-header">
            <div class="card-title">
              <router-link :to="`/settings/parameter/repair-category/edit/${item.id}`" class="category-link">
                {{ item.name }}
              </router-link>
            </div>
            <div class="card-index">#{{ (currentPage - 1) * pageSize + index + 1 }}</div>
          </div>
          
          <div class="card-content">
            <div class="card-field">
              <span class="field-label">更新時間：</span>
              <span class="field-value">{{ formatDateTime(item.updated_at) }}</span>
            </div>
          </div>
          
          <div class="card-actions">
            <button 
              v-if="hasReadManageRepairReasonPermission"
              class="action-btn expand-btn-mobile" 
              @click="toggleCategory(item.id)"
            >
              {{ expandedCategories.has(item.id) ? '收合故障原因' : '展開故障原因' }}
            </button>
          </div>
          
          <!-- 手機版展開的原因列表 -->
          <div v-if="expandedCategories.has(item.id)" class="mobile-reasons">
            <div class="mobile-reasons-header">
              <h5>故障原因列表</h5>
              <button v-if="hasWriteManageRepairCategoryPermission" class="new-reason-btn-mobile" @click="createNewReason(item.id)">
                新增原因
              </button>
            </div>
            
            <div class="mobile-reason-list">
              <div v-for="(reason, reasonIndex) in categoryStore.getCategoryReasons(item.id)" 
                   :key="reason.id" 
                   class="mobile-reason-item">
                <div class="reason-info">
                  <div class="reason-name">{{ reasonIndex + 1 }}. {{ reason.name }}</div>
                  <div class="reason-time">{{ formatDateTime(reason.updated_at) }}</div>
                </div>
                <div class="reason-actions" v-if="hasWriteManageRepairReasonPermission">
                  <button 
                    class="edit-btn-mobile" 
                    @click="editReason(item.id, reason.id)"
                    title="編輯"
                  >
                    編輯
                  </button>
                </div>
              </div>
              
              <!-- 無原因資料 -->
              <div v-if="!categoryStore.getCategoryReasons(item.id) || categoryStore.getCategoryReasons(item.id).length === 0" class="no-reasons-mobile">
                暫無故障原因
              </div>
            </div>
            
            <!-- 手機版原因分頁 -->
            <div class="mobile-reasons-pagination" v-if="categoryStore.getReasonTotalPages(item.id) > 1">
              <div class="pagination-info-mobile">
                共 {{ categoryStore.getReasonTotal(item.id) }} 項原因
              </div>
              <div class="pagination-controls-mobile">
                <button 
                  class="page-btn-mobile" 
                  :disabled="reasonPages.get(item.id)?.currentPage === 1"
                  @click="goToReasonPage(item.id, reasonPages.get(item.id)?.currentPage - 1)"
                >
                  上一頁
                </button>
                <span class="page-info-mobile">
                  {{ reasonPages.get(item.id)?.currentPage }} / {{ categoryStore.getReasonTotalPages(item.id) }}
                </span>
                <button 
                  class="page-btn-mobile" 
                  :disabled="reasonPages.get(item.id)?.currentPage === categoryStore.getReasonTotalPages(item.id)"
                  @click="goToReasonPage(item.id, reasonPages.get(item.id)?.currentPage + 1)"
                >
                  下一頁
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 無資料狀態 -->
        <div v-if="!isLoading && !isSearching && categoryData.length === 0" class="no-data-mobile">
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
    max-width: 500px;

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

      .search-icon-btn {
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

      .search-btn {
        padding: 12px 20px;
        background: #6c5ce7;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s;
        white-space: nowrap;

        &:hover:not(:disabled) {
          background: #5b4bcf;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
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
            
            .category-name {
              color: #444;
              text-decoration: none;

              &:hover {
                color: #000;
                text-decoration: underline;
              }
            }
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

        .category-link {
          color: #444;
          text-decoration: none;

          &:hover {
            color: #6c5ce7;
            text-decoration: underline;
          }
        }
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
        }
      }
    }

    .card-actions {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #f0f0f0;
      display: flex;
      justify-content: center;

      .expand-btn-mobile {
        background: #17a2b8;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s;

        &:hover {
          background: #138496;
          transform: translateY(-1px);
        }
      }
    }

    .mobile-reasons {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 2px solid #6c5ce7;
      background: #f8f9fa;
      margin: 16px -16px -16px -16px;
      padding: 16px;
      border-radius: 0 0 8px 8px;

      .mobile-reasons-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        h5 {
          margin: 0;
          color: #333;
          font-size: 14px;
          font-weight: 600;
        }

        .new-reason-btn-mobile {
          background: #28a745;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s;

          &:hover {
            background: #218838;
            transform: translateY(-1px);
          }
        }
      }

      .mobile-reason-list {
        .mobile-reason-item {
          background: white;
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

          &:last-child {
            margin-bottom: 0;
          }

          .reason-info {
            flex: 1;

            .reason-name {
              font-size: 13px;
              font-weight: 500;
              color: #333;
              margin-bottom: 4px;
            }

            .reason-time {
              font-size: 11px;
              color: #666;
            }
          }

          .reason-actions {
            .edit-btn-mobile {
              background: #6c5ce7;
              color: white;
              border: none;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 11px;
              cursor: pointer;
              transition: all 0.3s;

              &:hover {
                background: #5b4bcf;
                transform: translateY(-1px);
              }
            }
          }
        }

        .no-reasons-mobile {
          text-align: center;
          padding: 20px;
          color: #999;
          font-style: italic;
          font-size: 13px;
        }
      }

      .mobile-reasons-pagination {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #ddd;

        .pagination-info-mobile {
          text-align: center;
          font-size: 11px;
          color: #666;
          margin-bottom: 8px;
        }

        .pagination-controls-mobile {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;

          .page-btn-mobile {
            background: white;
            color: #6c5ce7;
            border: 1px solid #6c5ce7;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.3s;

            &:hover:not(:disabled) {
              background: #6c5ce7;
              color: white;
            }

            &:disabled {
              background: #f8f9fa;
              color: #ccc;
              border-color: #ccc;
              cursor: not-allowed;
            }
          }

          .page-info-mobile {
            font-size: 11px;
            color: #666;
            padding: 0 8px;
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
      color: #6c5ce7 !important;

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

  &.expand-btn {
    background: #17a2b8;
    color: white;

    &:hover {
      background: #138496;
    }
  }

  &.edit-btn {
    background: #fff3e0;
    color: #f57c00;

    &:hover {
      background: transparent;
      box-shadow: none;
    }
  }
}
.edit-btn, .delete-btn, .top-btn {
  background: #f8f9fa;
  border: none;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  color: #666;
  transition: all 0.2s;
  margin: 0 2px;

  &:hover {
    transform: scale(1.1);
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
  .category-management {
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
      max-width: 100%;
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

  .reasons-table {
    th, td {
      padding: 10px 12px !important;
      font-size: 12px !important;
    }
  }
}

/* 平板直向 (768px - 991px) */
@media (max-width: 991px) and (min-width: 768px) {
  .category-management {
    padding: 16px;
  }

  .search-section {
    padding: 20px;

    .search-row {
      max-width: 100%;
      flex-wrap: wrap;
      gap: 15px;

      .search-field {
        min-width: 250px;
        flex: 1;
      }

      .action-buttons {
        flex-shrink: 0;
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
    }
  }

  .reasons-container {
    padding: 15px;

    .reasons-header {
      flex-direction: column;
      gap: 10px;
      align-items: stretch;

      h4 {
        font-size: 14px;
      }
    }

    .reasons-table {
      th, td {
        padding: 8px 10px !important;
        font-size: 11px !important;
      }
    }

    .reasons-pagination {
      flex-direction: column;
      gap: 10px;
      text-align: center;
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
  .category-management {
    padding: 12px;
  }

  .search-section {
    padding: 16px;

    .search-row {
      flex-direction: column;
      gap: 12px;
      align-items: stretch;
      max-width: 100%;

      .search-field {
        width: 100%;
      }

      .action-buttons {
        flex-direction: row;
        gap: 8px;

        .search-btn,
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

      .new-category-btn {
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

      .mobile-reasons {
        .mobile-reasons-header {
          h5 {
            font-size: 13px;
          }

          .new-reason-btn-mobile {
            font-size: 10px;
            padding: 4px 8px;
          }
        }

        .mobile-reason-list .mobile-reason-item {
          padding: 10px;

          .reason-info {
            .reason-name {
              font-size: 12px;
            }

            .reason-time {
              font-size: 10px;
            }
          }

          .reason-actions .edit-btn-mobile {
            font-size: 10px;
            padding: 3px 6px;
          }
        }
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
  .category-management {
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
        .search-btn,
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

      .new-category-btn {
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

        .expand-btn-mobile {
          padding: 6px 12px;
          font-size: 12px;
        }
      }

      .mobile-reasons {
        .mobile-reasons-header {
          h5 {
            font-size: 12px;
          }

          .new-reason-btn-mobile {
            font-size: 9px;
            padding: 3px 6px;
          }
        }

        .mobile-reason-list .mobile-reason-item {
          padding: 8px;

          .reason-info {
            .reason-name {
              font-size: 11px;
            }

            .reason-time {
              font-size: 9px;
            }
          }

          .reason-actions .edit-btn-mobile {
            font-size: 9px;
            padding: 2px 4px;
          }
        }

        .mobile-reasons-pagination {
          .pagination-info-mobile {
            font-size: 10px;
          }

          .pagination-controls-mobile {
            .page-btn-mobile {
              font-size: 10px;
              padding: 3px 6px;
            }

            .page-info-mobile {
              font-size: 10px;
            }
          }
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

    .mobile-reasons {
      .mobile-reasons-header {
        h5 {
          font-size: 11px;
        }
      }

      .mobile-reason-list .mobile-reason-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;

        .reason-actions {
          align-self: flex-end;
        }
      }

      .mobile-reasons-pagination .pagination-controls-mobile {
        flex-direction: column;
        gap: 6px;

        .page-info-mobile {
          order: -1;
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
}
</style>
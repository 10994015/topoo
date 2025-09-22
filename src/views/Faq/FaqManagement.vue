<script setup>
import { ref, computed, reactive, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useFaqStore } from '@/stores/faq'
import { formatDateTime } from '@/utils/dateUtils'
import { PERMISSIONS } from '@/utils/permissions'
import { useAuthStore } from '@/stores/auth'
import { mdiPencil, mdiMagnify, mdiPlus, mdiMinus } from '@mdi/js'

const router = useRouter()
const authStore = useAuthStore()
const faqStore = useFaqStore()

// 響應式視窗寬度監聽
const windowWidth = ref(window.innerWidth)

// 權限檢查
const hasReadPermission = computed(() => authStore.canAccessPage(PERMISSIONS.FAQ_MANAGEMENT))
const hasWritePermission = computed(() => authStore.canModify(PERMISSIONS.FAQ_MANAGEMENT))

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
  question: '',
  status: '',
  startAt: '',
  endAt: ''
})

// 分頁設定
const currentPage = ref(1)
const pageSize = ref(10)
const sortColumn = ref('created_at')
const sortDirection = ref('desc')

// 載入狀態 - 使用Store的狀態
const isLoading = computed(() => faqStore.isLoading)
const isSearching = computed(() => faqStore.isSearching)

// 展開狀態管理
const expandedFaqs = ref(new Set())

// 資料 - 使用Store的狀態
const faqData = computed(() => faqStore.backendFaqList)
const totalItems = computed(() => faqStore.totalItems)
const totalPages = computed(() => faqStore.totalPages)

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

// 切換FAQ展開狀態
const toggleFaq = async (faqId) => {
  if (!hasReadPermission.value) return
  
  if (expandedFaqs.value.has(faqId)) {
    expandedFaqs.value.delete(faqId)
  } else {
    expandedFaqs.value.add(faqId)
    // 載入FAQ詳細資料以獲取sub_fqas
    await loadFaqDetail(faqId)
  }
}

// 載入FAQ詳細資料
const loadFaqDetail = async (faqId) => {
  try {
    const result = await faqStore.fetchFaqDetail(faqId, true) // 使用後台API
    if (result.success && result.data.sub_fqas) {
      // 更新Store中的sub_fqas
      faqStore.updateFaqSubFqas(faqId, result.data.sub_fqas)
    }
  } catch (error) {
    console.error('載入FAQ詳細資料失敗:', error)
  }
}

// 搜尋處理
const handleSearch = async () => {
  currentPage.value = 1
  await getFaqData()
}

// 重置搜尋
const handleReset = async () => {
  searchForm.question = ''
  searchForm.status = ''
  searchForm.startAt = ''
  searchForm.endAt = ''
  currentPage.value = 1
  expandedFaqs.value.clear()
  await getFaqData()
}

// 排序
const sortBy = async (column) => {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = 'asc'
  }
  await getFaqData()
}

// 分頁控制
const goToPage = async (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    await getFaqData()
  }
}

// 載入FAQ資料 - 使用Store方法
const getFaqData = async () => {
  try {
    await faqStore.fetchBackendFaqList(
      searchForm,
      sortColumn.value,
      sortDirection.value,
      pageSize.value,
      currentPage.value
    )
  } catch (error) {
    console.error('載入FAQ資料失敗:', error)
  }
}

// 新增FAQ分類
const createNewFaqCategory = () => {
  router.push('/settings/faq-category/create')
}

// 編輯FAQ
const editFaqCategory = (faq) => {
  router.push(`/settings/faq-category/edit/${faq.id}`)
}
// 新增FAQ
const createNewFaq = (faq) => {
    
  router.push(`/settings/faq/${faq.id}/create`)
}

// 編輯FAQ
const editFaq = (id, faq) => {
  router.push(`/settings/faq/edit/${id}/${faq.id}`)
}

// 收合狀態按鈕文字
const getStatusText = (status) => {
  return status === 'Open' ? '啟用' : '停用'
}

const getStatusClass = (status) => {
  return status === 'Open' ? 'status-enabled' : 'status-disabled'
}

// 監聽分頁大小變化
watch(pageSize, async () => {
  currentPage.value = 1
  await getFaqData()
})

// 組件掛載
onMounted(async () => {
  // 添加視窗尺寸監聽器
  window.addEventListener('resize', handleResize)
  
  try {
    await getFaqData()
  } catch (error) {
    console.error('初始化失敗:', error)
  }
})

// 清理函數
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  // 清理Store狀態（可選）
  // faqStore.resetBackendSearch()
})
</script>

<template>
  <div class="faq-management">
    <!-- 搜尋區域 -->
    <section class="search-section">
      <div class="search-row">
        <div class="search-field">
          <input 
            type="text" 
            v-model="searchForm.question"
            placeholder="請輸入問題"
            class="search-input"
            @keyup.enter="handleSearch"
            :disabled="isLoading"
          />
          <button class="search-icon-btn" @click="handleSearch" :disabled="isLoading || isSearching">
            <span v-if="isSearching" class="loading-spinner">⟳</span>
            <svg v-else width="16" height="16" viewBox="0 0 24 24">
              <path :d="mdiMagnify" fill="currentColor"></path>
            </svg>
          </button>
        </div>
        
        <div class="filter-field">
          <select v-model="searchForm.status" class="filter-select" :disabled="isLoading">
            <option value="">全部狀態</option>
            <option value="Open">啟用</option>
            <option value="Invalid">停用</option>
          </select>
        </div>
      </div>

      <div class="date-row">
        <div class="date-field">
          <label>建立日期</label>
          <div class="date-range">
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
        
        <button v-if="hasWritePermission" class="new-faq-btn" @click="createNewFaqCategory" :class="{ disabled: isLoading }" :disabled="isLoading">
          新增問題分類
        </button>
      </div>

      <!-- 桌面版和平板版表格 -->
      <div class="table-container" v-if="!isMobile">
        <table class="data-table">
          <thead>
            <tr>
              <th width="80">項次</th>
              <th class="sortable" @click="!isLoading && sortBy('question')">
                問題分類
                <span class="sort-icon" v-if="sortColumn === 'question'">
                  <span v-if="sortDirection === 'asc'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th class="sortable" @click="!isLoading && sortBy('created_at')">
                更新時間
                <span class="sort-icon" v-if="sortColumn === 'created_at'">
                  <span v-if="sortDirection === 'asc'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th width="100">狀態</th>
              <th v-if="hasWritePermission" width="80">編輯</th>
              <th width="120">展開/收合</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading 狀態 -->
            <tr v-if="isLoading" class="loading-row">
              <td :colspan="hasWritePermission ? 6 : 5" class="loading-cell">
                <div class="loading-container">
                  <div class="loading-spinner large">⟳</div>
                  <div class="loading-text">資料載入中...</div>
                </div>
              </td>
            </tr>
            
            <!-- 搜尋中狀態 -->
            <tr v-else-if="isSearching" class="loading-row">
              <td :colspan="hasWritePermission ? 6 : 5" class="loading-cell">
                <div class="loading-container">
                  <div class="loading-spinner large">⟳</div>
                  <div class="loading-text">搜尋中...</div>
                </div>
              </td>
            </tr>
            
            <!-- 正常資料顯示 -->
            <template v-else v-for="(item, index) in faqData" :key="item.id">
              <!-- FAQ主要行 -->
              <tr class="table-row faq-row">
                <td>{{ (currentPage - 1) * pageSize + index + 1 }}</td>
                <td>{{ item.question }}</td>
                <td>{{ formatDateTime(item.updated_at) }}</td>
                <td>
                  <span :class="['status-badge', getStatusClass(item.status)]">
                    {{ getStatusText(item.status) }}
                  </span>
                </td>
                <td v-if="hasWritePermission">
                  <button 
                    class="edit-btn"
                    @click="editFaqCategory(item)"
                    title="編輯"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24">
                      <path :d="mdiPencil" fill="currentColor"></path>
                    </svg>
                  </button>
                </td>
                <td>
                  <button 
                    class="action-btn expand-btn" 
                    @click="toggleFaq(item.id)"
                    :title="expandedFaqs.has(item.id) ? '收合' : '展開'"
                  >
                    {{ expandedFaqs.has(item.id) ? '收合' : '展開' }}
                  </button>
                </td>
              </tr>
              
              <!-- 展開的子問題列表 -->
              <tr v-if="expandedFaqs.has(item.id)" class="expanded-row">
                <td :colspan="hasWritePermission ? 6 : 5" class="expanded-content">
                  <div class="sub-faqs-container">
                    <div class="sub-faqs-header">
                      <h4>{{ item.question }} - 常見問題</h4>
                      <button v-if="hasWritePermission" class="new-subfaq-btn" @click="createNewFaq(item)" :disabled="isLoading">
                        新增常見問題
                      </button>
                    </div>
                    
                    <!-- 子問題表格 -->
                    <table class="sub-faqs-table">
                      <thead>
                        <tr>
                          <th width="60">項次</th>
                          <th>常見問題</th>
                          <th width="150">更新時間</th>
                          <th width="80">狀態</th>
                          <th width="80" v-if="hasWritePermission">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(subFaq, subIndex) in (item.sub_fqas || [])" 
                            :key="subFaq.id" 
                            class="subfaq-row">
                          <td>{{ subIndex + 1 }}</td>
                          <td>{{ subFaq.question }}</td>
                          <td>{{ formatDateTime(subFaq.updated_at) }}</td>
                          <td>
                            <span :class="['status-badge', getStatusClass(subFaq.status)]">
                              {{ getStatusText(subFaq.status) }}
                            </span>
                          </td>
                          <td v-if="hasWritePermission">
                            <button 
                              class="action-btn edit-btn" 
                              @click="editFaq(item.id, subFaq)"
                              title="編輯"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24">
                                <path :d="mdiPencil" fill="currentColor"></path>
                              </svg>
                            </button>
                          </td>
                        </tr>
                        <!-- 無子問題資料 -->
                        <tr v-if="!item.sub_fqas || item.sub_fqas.length === 0">
                          <td :colspan="hasWritePermission ? 5 : 4" class="no-subfaqs">暫無常見問題</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>
            </template>
            
            <!-- 無資料狀態 -->
            <tr v-if="!isLoading && !isSearching && faqData.length === 0">
              <td :colspan="hasWritePermission ? 6 : 5" class="no-data">暫無資料</td>
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
        <div v-else v-for="(item, index) in faqData" :key="item.id" class="mobile-card">
          <div class="card-header">
            <div class="card-title">{{ item.question }}</div>
            <div class="card-index">#{{ (currentPage - 1) * pageSize + index + 1 }}</div>
          </div>
          
          <div class="card-content">
            <div class="card-field">
              <span class="field-label">更新時間：</span>
              <span class="field-value">{{ formatDateTime(item.updated_at) }}</span>
            </div>
            <div class="card-field">
              <span class="field-label">狀態：</span>
              <span :class="['status-badge', getStatusClass(item.status)]">
                {{ getStatusText(item.status) }}
              </span>
            </div>
          </div>
          
          <div class="card-actions">
            <button v-if="hasWritePermission" class="edit-btn-mobile" @click="editFaq(item)">
              編輯
            </button>
            <button 
              class="expand-btn-mobile" 
              @click="toggleFaq(item.id)"
            >
              {{ expandedFaqs.has(item.id) ? '收合常見問題' : '展開常見問題' }}
            </button>
          </div>
          
          <!-- 手機版展開的子問題列表 -->
          <div v-if="expandedFaqs.has(item.id)" class="mobile-subfaqs">
            <div class="mobile-subfaqs-header">
              <h5>常見問題列表</h5>
              <button v-if="hasWritePermission" class="new-subfaq-btn-mobile" @click="createNewFaq">
                新增問題
              </button>
            </div>
            
            <div class="mobile-subfaq-list">
              <div v-for="(subFaq, subIndex) in (item.sub_fqas || [])" 
                   :key="subFaq.id" 
                   class="mobile-subfaq-item">
                <div class="subfaq-info">
                  <div class="subfaq-question">{{ subIndex + 1 }}. {{ subFaq.question }}</div>
                  <div class="subfaq-meta">
                    <span class="subfaq-time">{{ formatDateTime(subFaq.updated_at) }}</span>
                    <span :class="['status-badge', getStatusClass(subFaq.status)]">
                      {{ getStatusText(subFaq.status) }}
                    </span>
                  </div>
                </div>
                <div class="subfaq-actions" v-if="hasWritePermission">
                  <button 
                    class="edit-btn-mobile" 
                    @click="editFaq(subFaq)"
                    title="編輯"
                  >
                    編輯
                  </button>
                </div>
              </div>
              
              <!-- 無子問題資料 -->
              <div v-if="!item.sub_fqas || item.sub_fqas.length === 0" class="no-subfaqs-mobile">
                暫無常見問題
              </div>
            </div>
          </div>
        </div>
        
        <!-- 無資料狀態 -->
        <div v-if="!isLoading && !isSearching && faqData.length === 0" class="no-data-mobile">
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
.faq-management {
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

    .search-field {
      position: relative;
      flex: 1;
      max-width: 600px;

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

    .filter-field {
      .filter-select {
        padding: 12px 15px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        background: white;
        min-width: 120px;
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
  }

  .date-row {
    display: flex;
    gap: 20px;
    align-items: end;

    .date-field {
      flex: 1;

      label {
        display: block;
        margin-bottom: 8px;
        font-size: 14px;
        font-weight: 500;
        color: #333;
      }

      .date-range {
        display: flex;
        align-items: center;
        gap: 10px;

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
          font-weight: 500;
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

    .new-faq-btn {
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

          &.faq-row {
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

// 狀態標籤
.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  
  &.status-enabled {
    background: #d4edda;
    color: #155724;
  }
  
  &.status-disabled {
    background: #f8d7da;
    color: #721c24;
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
      gap: 8px;
      justify-content: center;

      .edit-btn-mobile,
      .expand-btn-mobile {
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s;
      }

      .edit-btn-mobile {
        background: #fff3e0;
        color: #f57c00;

        &:hover {
          background: #ffe0b2;
          transform: translateY(-1px);
        }
      }

      .expand-btn-mobile {
        background: #17a2b8;
        color: white;

        &:hover {
          background: #138496;
          transform: translateY(-1px);
        }
      }
    }

    .mobile-subfaqs {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 2px solid #6c5ce7;
      background: #f8f9fa;
      margin: 16px -16px -16px -16px;
      padding: 16px;
      border-radius: 0 0 8px 8px;

      .mobile-subfaqs-header {
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

        .new-subfaq-btn-mobile {
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

      .mobile-subfaq-list {
        .mobile-subfaq-item {
          background: white;
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 8px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

          &:last-child {
            margin-bottom: 0;
          }

          .subfaq-info {
            flex: 1;

            .subfaq-question {
              font-size: 13px;
              font-weight: 500;
              color: #333;
              margin-bottom: 6px;
            }

            .subfaq-meta {
              display: flex;
              gap: 8px;
              align-items: center;

              .subfaq-time {
                font-size: 11px;
                color: #666;
              }
            }
          }

          .subfaq-actions {
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

        .no-subfaqs-mobile {
          text-align: center;
          padding: 20px;
          color: #999;
          font-style: italic;
          font-size: 13px;
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
.sub-faqs-container {
  padding: 20px;
  background: #f9f9f9;

  .sub-faqs-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;

    h4 {
      margin: 0;
      color: #333;
      font-size: 16px;
    }

    .new-subfaq-btn {
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

  .sub-faqs-table {
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
      }
    }

    tbody {
      .subfaq-row {
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

      .no-subfaqs {
        text-align: center;
        padding: 30px;
        color: #999;
        font-style: italic;
        font-size: 13px;
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

.edit-btn {
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
  .faq-management {
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
    .search-row,
    .date-row {
      flex-wrap: wrap;
      gap: 15px;
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

  .sub-faqs-table {
    th, td {
      padding: 10px 12px !important;
      font-size: 12px !important;
    }
  }
}

/* 平板直向 (768px - 991px) */
@media (max-width: 991px) and (min-width: 768px) {
  .faq-management {
    padding: 16px;
  }

  .search-section {
    padding: 20px;

    .search-row,
    .date-row {
      flex-direction: column;
      gap: 15px;
      align-items: stretch;

      .search-field,
      .filter-field {
        max-width: none;
      }

      .date-field {
        .date-range {
          justify-content: flex-start;
        }
      }

      .action-buttons {
        flex-direction: row;
        justify-content: center;
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

  .sub-faqs-container {
    padding: 15px;

    .sub-faqs-header {
      flex-direction: column;
      gap: 10px;
      align-items: stretch;

      h4 {
        font-size: 14px;
      }
    }

    .sub-faqs-table {
      th, td {
        padding: 8px 10px !important;
        font-size: 11px !important;
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
  .faq-management {
    padding: 12px;
  }

  .search-section {
    padding: 16px;

    .search-row,
    .date-row {
      flex-direction: column;
      gap: 12px;
      align-items: stretch;

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

    .date-row {
      .date-field {
        .date-range {
          flex-direction: column;
          gap: 8px;
          align-items: stretch;

          .date-separator {
            text-align: center;
          }
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

      .new-faq-btn {
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

      .mobile-subfaqs {
        .mobile-subfaqs-header {
          h5 {
            font-size: 13px;
          }

          .new-subfaq-btn-mobile {
            font-size: 10px;
            padding: 4px 8px;
          }
        }

        .mobile-subfaq-list .mobile-subfaq-item {
          padding: 10px;

          .subfaq-info {
            .subfaq-question {
              font-size: 12px;
            }

            .subfaq-meta .subfaq-time {
              font-size: 10px;
            }
          }

          .subfaq-actions .edit-btn-mobile {
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
  .faq-management {
    padding: 8px;
  }

  .search-section {
    padding: 12px;
    margin-bottom: 12px;

    .search-row .search-field .search-input {
      padding: 10px 40px 10px 12px;
      font-size: 13px;
    }

    .date-row .action-buttons {
      .search-btn,
      .reset-btn {
        padding: 10px 12px;
        font-size: 13px;
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

      .new-faq-btn {
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

        .edit-btn-mobile,
        .expand-btn-mobile {
          padding: 6px 12px;
          font-size: 12px;
        }
      }

      .mobile-subfaqs {
        .mobile-subfaqs-header {
          h5 {
            font-size: 12px;
          }

          .new-subfaq-btn-mobile {
            font-size: 9px;
            padding: 3px 6px;
          }
        }

        .mobile-subfaq-list .mobile-subfaq-item {
          padding: 8px;

          .subfaq-info {
            .subfaq-question {
              font-size: 11px;
            }

            .subfaq-meta .subfaq-time {
              font-size: 9px;
            }
          }

          .subfaq-actions .edit-btn-mobile {
            font-size: 9px;
            padding: 2px 4px;
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
    .date-row {
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

    .mobile-subfaqs {
      .mobile-subfaq-list .mobile-subfaq-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;

        .subfaq-actions {
          align-self: flex-end;
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
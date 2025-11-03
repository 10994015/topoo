<script setup>
import { ref, computed, reactive, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSurveyStore } from '@/stores/survey'
import { formatDate, formatDateTime } from '@/utils/dateUtils'
import { mdiOpenInNew, mdiMagnify, mdiChevronDown } from '@mdi/js'

const router = useRouter()
const surveyStore = useSurveyStore()

// 響應式視窗寬度監聽
const windowWidth = ref(window.innerWidth)

// 搜尋表單
const searchForm = reactive({
  credential: '',
  unitId: '',
  unitName: '', // 新增：用於顯示單位名稱
  startAt: '',
  endAt: ''
})

// 新增：單位搜尋相關狀態
const unitSearchKeyword = ref('')
const showUnitDropdown = ref(false)
const selectedUnitIndex = ref(-1)
const unitDropdownRef = ref(null)
const unitInputRef = ref(null)

// 新增：防抖計時器
let unitSearchTimer = null

// 排序設定
const sortConfig = ref({
  field: 'created_at',
  order: 'ASC'
})

// 分頁設定
const currentPage = ref(1)
const pageSize = ref(10)
const totalItems = ref(0)

// 載入狀態
const isLoading = ref(false)
const isSearching = ref(false)

// 問卷回覆資料
const responseData = ref([])

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

// 新增：單位列表計算屬性
const unitList = computed(() => surveyStore.surveyUnits || [])

// 新增：單位搜尋處理（帶防抖）
const handleUnitSearch = (event) => {
  const keyword = event.target.value
  unitSearchKeyword.value = keyword
  
  // 清除之前的計時器
  if (unitSearchTimer) {
    clearTimeout(unitSearchTimer)
  }
  
  // 如果關鍵字為空，清空列表並隱藏下拉選單
  if (!keyword || keyword.trim() === '') {
    surveyStore.clearSurveyUnits()
    showUnitDropdown.value = false
    searchForm.unitId = ''
    searchForm.unitName = ''
    selectedUnitIndex.value = -1
    return
  }
  
  // 設定新的計時器（500ms 防抖）
  unitSearchTimer = setTimeout(async () => {
    //console.log('執行單位搜尋:', keyword)
    showUnitDropdown.value = true // 顯示下拉選單（可能顯示載入中或無資料）
    await surveyStore.searchSurveyUnits(keyword)
    selectedUnitIndex.value = -1
  }, 500)
}

// 新增：選擇單位
const selectUnit = (unit) => {
  searchForm.unitId = unit.unitId
  searchForm.unitName = unit.name
  unitSearchKeyword.value = unit.name
  showUnitDropdown.value = false
  selectedUnitIndex.value = -1
  //console.log('選擇單位:', unit)
}

// 新增：鍵盤導航處理
const handleUnitKeydown = (event) => {
  if (!showUnitDropdown.value || unitList.value.length === 0) {
    // 如果沒有資料，ESC 鍵仍可關閉下拉選單
    if (event.key === 'Escape') {
      event.preventDefault()
      showUnitDropdown.value = false
      selectedUnitIndex.value = -1
    }
    return
  }
  
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      selectedUnitIndex.value = Math.min(
        selectedUnitIndex.value + 1,
        unitList.value.length - 1
      )
      break
      
    case 'ArrowUp':
      event.preventDefault()
      selectedUnitIndex.value = Math.max(selectedUnitIndex.value - 1, -1)
      break
      
    case 'Enter':
      event.preventDefault()
      if (selectedUnitIndex.value >= 0) {
        selectUnit(unitList.value[selectedUnitIndex.value])
      }
      break
      
    case 'Escape':
      event.preventDefault()
      showUnitDropdown.value = false
      selectedUnitIndex.value = -1
      break
  }
}

// 新增：點擊外部關閉下拉選單
const handleClickOutside = (event) => {
  if (
    unitDropdownRef.value &&
    !unitDropdownRef.value.contains(event.target) &&
    unitInputRef.value &&
    !unitInputRef.value.contains(event.target)
  ) {
    showUnitDropdown.value = false
    selectedUnitIndex.value = -1
  }
}

// 新增：輸入框獲得焦點時的處理
const handleUnitFocus = () => {
  // 如果有關鍵字，顯示下拉選單（可能顯示結果或無資料）
  if (unitSearchKeyword.value.trim() !== '') {
    showUnitDropdown.value = true
  }
}

// 基本方法
const handleSearch = async () => {
  currentPage.value = 1
  isSearching.value = true
  //console.log('執行搜尋:', searchForm)
  await loadData()
  isSearching.value = false
}

const handleReset = async () => {
  searchForm.credential = ''
  searchForm.unitId = ''
  searchForm.unitName = ''
  searchForm.startAt = ''
  searchForm.endAt = ''
  unitSearchKeyword.value = ''
  surveyStore.clearSurveyUnits()
  showUnitDropdown.value = false
  currentPage.value = 1
  await loadData()
}

const loadData = async () => {
  //console.log(currentPage.value)
  
  isLoading.value = true
  const params = {
    credential: searchForm.credential,
    unitId: searchForm.unitId,
    startAt: searchForm.startAt,
    endAt: searchForm.endAt,
    sortBy: sortConfig.value.field,
    sortOrder: sortConfig.value.order,
    page: currentPage.value,
    pageSize: pageSize.value
  }
  //console.log(params)
  
  const response = await surveyStore.fetchSurveyResponses(params)
  //console.log(surveyStore.surveyResponses.data);
  
  responseData.value = surveyStore.surveyResponses.data || []
  //console.log(surveyStore.surveyResponses.total)
  
  totalItems.value = surveyStore.surveyResponses.total || 0
  totalPages.value = surveyStore.surveyResponses.totalPages || 0
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
  //console.log(page)
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    await loadData()
  }
}

const viewResponse = (response) => {
  //console.log('查看問卷回覆詳情:', response)
  router.push(`/settings/survey-response/${response.survey_id}`)
}

// watch pageSize
watch(pageSize, async (newSize) => {
  //console.log('分頁大小變更:', newSize)
  pageSize.value = newSize
  currentPage.value = 1
  await loadData()
})

onMounted(() => {
  // 添加視窗尺寸監聽器
  window.addEventListener('resize', handleResize)
  // 添加點擊外部監聽器
  document.addEventListener('click', handleClickOutside)
  loadData()
})

// 清理函數
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('click', handleClickOutside)
  // 清除計時器
  if (unitSearchTimer) {
    clearTimeout(unitSearchTimer)
  }
})
</script>

<template>
  <div class="survey-response-management">
    <!-- 搜尋區域 -->
    <section class="search-section">
      <div class="search-row">
        <div class="search-field">
          <input 
            type="text" 
            v-model="searchForm.credential"
            placeholder="請輸入填寫者帳號"
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
        
        <!-- 修改：報修單位搜尋欄位 -->
        <div class="search-field unit-search-field">
          <input 
            ref="unitInputRef"
            type="text" 
            v-model="unitSearchKeyword"
            placeholder="請輸入報修單位關鍵字"
            class="search-input"
            @input="handleUnitSearch"
            @focus="handleUnitFocus"
            @keydown="handleUnitKeydown"
            @keyup.enter="handleSearch"
            :disabled="isLoading"
          />
          <button class="search-btn" @click="handleSearch" :disabled="isLoading || isSearching">
            <span v-if="surveyStore.isSearchingUnits" class="loading-spinner">⟳</span>
            <svg v-else-if="isSearching" width="16" height="16" viewBox="0 0 24 24">
              <path :d="mdiMagnify" fill="currentColor"></path>
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24">
              <path :d="showUnitDropdown ? mdiChevronDown : mdiMagnify" fill="currentColor"></path>
            </svg>
          </button>
          
          <!-- 下拉選單 -->
          <div 
            v-if="showUnitDropdown" 
            ref="unitDropdownRef"
            class="unit-dropdown"
            :class="{ 'no-results': unitList.length === 0 && !surveyStore.isSearchingUnits }"
          >
            <!-- 載入中 -->
            <div v-if="surveyStore.isSearchingUnits" class="unit-loading">
              <span class="loading-spinner">⟳</span>
            </div>
            
            <!-- 有資料 -->
            <div 
              v-else-if="unitList.length > 0"
              v-for="(unit, index) in unitList" 
              :key="unit.unitId"
              :class="['unit-item', { selected: index === selectedUnitIndex }]"
              @click="selectUnit(unit)"
            >
              {{ unit.name }}
            </div>
            
            <!-- 無資料 -->
            <div v-else class="no-results-content">
              <div class="no-results-icon">🔍</div>
              <div class="no-results-text">查無符合的單位</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="search-row">
        <div class="date-field">
          <label>問卷填寫日期</label>
          <div class="date-inputs">
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
        
        <div class="right-controls">
          <button class="control-btn create-btn" @click="router.push('/settings/survey-question-management')" :disabled="isLoading">
            問卷題目管理
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
                填寫者帳號
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
                填寫者姓名
                <span class="sort-icon" v-if="sortConfig.field === 'name'">
                  <span v-if="sortConfig.order === 'asc'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th 
                class="sortable" 
                :class="getSortClass('unitId')"
                @click="!isLoading && handleSort('unitId')"
              >
                報修單位
                <span class="sort-icon" v-if="sortConfig.field === 'unitId'">
                  <span v-if="sortConfig.order === 'asc'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th 
                class="sortable" 
                :class="getSortClass('title')"
                @click="!isLoading && handleSort('title')"
              >
                案件標題
                <span class="sort-icon" v-if="sortConfig.field === 'title'">
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
                問卷填寫時間
                <span class="sort-icon" v-if="sortConfig.field === 'created_at'">
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
              <td colspan="7" class="loading-cell">
                <div class="loading-container">
                  <div class="loading-spinner large">⟳</div>
                  <div class="loading-text">資料載入中...</div>
                </div>
              </td>
            </tr>
            
            <!-- 搜尋中狀態 -->
            <tr v-else-if="isSearching" class="loading-row">
              <td colspan="7" class="loading-cell">
                <div class="loading-container">
                  <div class="loading-spinner large">⟳</div>
                  <div class="loading-text">搜尋中...</div>
                </div>
              </td>
            </tr>
            
            <!-- 正常資料顯示 -->
            <tr v-else v-for="(item, index) in responseData" :key="item.id" class="table-row">
              <td>{{ (currentPage - 1) * pageSize + index + 1 }}</td>
              <td>{{ item.credential }}</td>
              <td>{{ item.name }}</td>
              <td>{{ item.repair_unit }}</td>
              <td>{{ item.title }}</td>
              <td>{{ formatDateTime(item.created_at) }}</td>
              <td>
                <button 
                  class="action-btn view-btn" 
                  @click="viewResponse(item)"
                  title="查看詳情"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path :d="mdiOpenInNew" fill="currentColor"></path>
                  </svg>
                </button>
              </td>
            </tr>
            
            <!-- 無資料狀態 -->
            <tr v-if="!isLoading && !isSearching && responseData.length === 0">
              <td colspan="7" class="no-data">暫無資料</td>
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
        <div v-else v-for="(item, index) in responseData" :key="item.id" class="mobile-card" @click="viewResponse(item)">
          <div class="card-header">
            <div class="card-title">{{ item.credential }}</div>
            <div class="card-index">#{{ (currentPage - 1) * pageSize + index + 1 }}</div>
          </div>
          <div class="card-content">
            <div class="card-field">
              <span class="field-label">填寫者姓名：</span>
              <span class="field-value">{{ item.name }}</span>
            </div>
            <div class="card-field">
              <span class="field-label">單位編號：</span>
              <span class="field-value">{{ item.repair_unit }}</span>
            </div>
            <div class="card-field">
              <span class="field-label">業務標題：</span>
              <span class="field-value">{{ item.title }}</span>
            </div>
            <div class="card-field">
              <span class="field-label">填寫時間：</span>
              <span class="field-value">{{ formatDateTime(item.created_at) }}</span>
            </div>
          </div>
          <div class="card-action">
            <span class="view-hint">點擊查看詳情 →</span>
          </div>
        </div>
        
        <!-- 無資料狀態 -->
        <div v-if="!isLoading && !isSearching && responseData.length === 0" class="no-data-mobile">
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
.survey-response-management {
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

  // 新增：單位搜尋欄位樣式
  .unit-search-field {
    .unit-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 4px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      max-height: 300px;
      overflow-y: auto;
      z-index: 1000;

      &.no-results {
        max-height: none;
        overflow: hidden;
      }

      .unit-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 20px;
        color: #666;

        .loading-spinner {
          font-size: 16px;
        }

        .loading-text {
          font-size: 14px;
        }
      }

      .no-results-content {
        padding: 20px 15px;
        text-align: center;
        display: flex;
        justify-content: center;

        .no-results-icon {
          font-size:16px;
          opacity: 0.5;
        }

        .no-results-text {
          color: #999;
          font-size: 14px;
        }
      }

      .unit-item {
        padding: 12px 15px;
        cursor: pointer;
        transition: background-color 0.2s;
        font-size: 14px;
        color: #333;
        border-bottom: 1px solid #f0f0f0;

        &:last-child {
          border-bottom: none;
        }

        &:hover,
        &.selected {
          background-color: #f8f9fa;
          color: #6c5ce7;
        }

        &.selected {
          background-color: rgba(108, 92, 231, 0.1);
        }
      }

      // 捲軸樣式
      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
      }

      &::-webkit-scrollbar-thumb {
        background: #ccc;
        border-radius: 3px;

        &:hover {
          background: #999;
        }
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
  .survey-response-management {
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
    }
  }
}

/* 平板直向 (768px - 991px) */
@media (max-width: 991px) and (min-width: 768px) {
  .survey-response-management {
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
  .survey-response-management {
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
}

/* 小手機 (480px 以下) */
@media (max-width: 479px) {
  .survey-response-management {
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

  // 單位下拉選單在小螢幕的樣式調整
  .unit-search-field {
    .unit-dropdown {
      max-height: 200px;

      .unit-item {
        padding: 10px 12px;
        font-size: 13px;
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
<script setup>
import { ref, computed, reactive, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUnitStore } from '@/stores/unit'
import { formatDateTime } from '@/utils/dateUtils'
import { PERMISSIONS } from '@/utils/permissions'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const unitStore = useUnitStore()
const authStore = useAuthStore()

// 響應式視窗寬度監聽
const windowWidth = ref(window.innerWidth)

// 響應式計算屬性 - 判斷螢幕尺寸
const isMobile = computed(() => windowWidth.value <= 767)
const isTablet = computed(() => windowWidth.value > 767 && windowWidth.value <= 991)
const isDesktop = computed(() => windowWidth.value > 991)

// 視窗尺寸變化處理器
const handleResize = () => {
  windowWidth.value = window.innerWidth
}

const hasWriteUnitPermission = computed(() => authStore.canModify(PERMISSIONS.UNIT_MANAGEMENT))

// 搜尋表單
const searchForm = reactive({
  keyword: ''
})

// 分頁設定
const currentPage = ref(1)
const pageSize = ref(10)
const sortColumn = ref('created_at')
const sortDirection = ref('desc')

// 載入狀態
const isLoading = computed(() => unitStore.isLoading)
const isSearching = ref(false)
const isDeleting = ref(false)

// 資料來源改為從 store 取得
const unitData = computed(() => unitStore.units)

const totalItems = ref(0)
const totalPages = ref(0)
const expandedUnits = ref(new Set()) // 預設全部收合
const apiData = ref(null) // 儲存 API 回應的完整資料

// 計算顯示的扁平化資料
const flattenedData = computed(() => {
  const result = []
  
  const flatten = (units, level = 1, parentExpanded = true) => {
    units.forEach(unit => {
      if (parentExpanded) {
        result.push({
          ...unit,
          level,
          isExpanded: unit.isExpanded || expandedUnits.value.has(unit.id)
        })
      }
      
      if (unit.children && (unit.isExpanded || expandedUnits.value.has(unit.id))) {
        flatten(unit.children, level + 1, parentExpanded)
      }
    })
  }
  
  flatten(unitData.value)
  return result
})

// 計算最外層項次的資料
const displayData = computed(() => {
  return flattenedData.value.map((item) => {
    // 只有第一層的才有項次，其他層級不顯示項次
    const parentIndex = item.level === 1 ? 
      unitData.value.findIndex(parent => parent.id === item.id) + 1 : 
      null
    
    return {
      ...item,
      parentIndex
    }
  })
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
const handleSearch = async () => {
  currentPage.value = 1
  console.log('執行搜尋:', searchForm)
  await getUnitData()
}

const handleReset = async () => {
  searchForm.keyword = ''
  currentPage.value = 1
  
  // 重置時重新載入第一層資料
  console.log('重置搜尋，載入第一層資料')
  await getUnitData()
}

const sortBy = async (column) => {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = 'asc'
  }
  await getUnitData()
  console.log('排序:', column, sortDirection.value)
}

const goToPage = async (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    await getUnitData()
  }
}

const toggleExpand = async (unitId, unitIndex) => {
  try {
    // 需要在實際的樹狀結構中找到正確的單位
    const findUnitInTree = (units, targetId) => {
      for (let i = 0; i < units.length; i++) {
        const unit = units[i]
        if (unit.id === targetId) {
          return { unit, index: i, parent: units }
        }
        if (unit.children && unit.children.length > 0) {
          const found = findUnitInTree(unit.children, targetId)
          if (found) return found
        }
      }
      return null
    }
    
    const unitInfo = findUnitInTree(unitData.value, unitId)
    if (!unitInfo) {
      console.error('找不到單位:', unitId)
      return
    }
    
    // 使用 store 的方法來切換展開狀態，但傳入正確的單位物件
    await toggleUnitInTree(unitInfo.unit, unitInfo.parent, unitInfo.index)
    
  } catch (error) {
    console.error('切換展開狀態失敗:', error)
    alert('載入子單位失敗，請稍後再試')
  }
}

// 新增處理樹狀結構中任意位置單位的方法
const toggleUnitInTree = async (unit, parentArray, unitIndex) => {
  try {
    if (unit.isExpanded) {
      // 收合 - 保留已載入的 children 資料
      unit.isExpanded = false
      console.log('收合單位，保留已載入的資料')
    } else {
      // 展開邏輯
      if (unit.hasChildren === false) {
        return
      }
      
      if (unit.children && unit.children.length > 0) {
        // 已經載入過子單位（可能來自搜尋結果或之前的 API），直接展開
        console.log('使用已載入的子單位資料，不重複呼叫 API，children 長度:', unit.children.length)
        unit.isExpanded = true
      } else {
        // children 為空，需要從 API 載入子單位
        console.log('children 陣列為空，從 API 載入子單位資料:', unit.id)
        unit.isLoading = true
        
        try {
          const response = await unitStore.fetchUnitById(unit.id)
          
          if (response.success && response.data) {
            const unitData = response.data
            
            // 建立子單位陣列
            const childUnits = []
            
            if (unitData.sub_units && unitData.sub_units.length > 0) {
              // 有子單位
              for (const subUnit of unitData.sub_units) {
                childUnits.push({
                  id: subUnit.sub_unit_id,
                  name: subUnit.sub_unit_name,
                  layer: `L${parseInt(unitData.layer.substring(1)) + 1}`,
                  level: parseInt(unitData.layer.substring(1)) + 1,
                  created_at: unitData.created_at,
                  updated_at: unitData.updated_at,
                  deleted_at: null,
                  parent_id: unit.id,
                  hasChildren: true, // 預設都是 true，保持可點擊
                  isExpanded: false,
                  isLoading: false,
                  children: []
                })
              }
              
              // 更新單位狀態：確定有子單位，載入資料並展開
              unit.hasChildren = true
              unit.children = childUnits
              unit.isExpanded = true
              console.log(`成功從 API 載入 ${childUnits.length} 個子單位`)
            } else {
              // 沒有子單位 - 跳出提示
              unit.hasChildren = false
              unit.children = []
              unit.isExpanded = false
              alert('此單位無下級單位')
            }
          }
        } catch (error) {
          console.error('載入子單位失敗:', error)
          unit.hasChildren = false
          unit.isExpanded = false
          throw error
        } finally {
          unit.isLoading = false
        }
      }
    }
  } catch (error) {
    console.error('處理樹狀結構單位失敗:', error)
    throw error
  }
}

const createNewUnit = () => {
  console.log('新增單位')
  router.push('/settings/unit/unit-create')
}

const insertUnit = (id) => {
  console.log('編輯單位:', id)
  router.push(`/settings/unit/unit-insert/${id}`)
}

// 刪除單位
const deleteUnit = async (unitId, unitName) => {
  if (!confirm(`確定要刪除單位「${unitName}」嗎？\n\n注意：刪除後將無法復原。`)) {
    return
  }

  try {
    isDeleting.value = true
    console.log('開始刪除單位:', unitId)

    const response = await unitStore.deleteUnit(unitId)
    
    if (response.success) {
      alert('單位刪除成功')
      
      // 刪除成功後重新載入資料
      await getUnitData()
    }
  } catch (error) {
    console.error('刪除單位失敗:', error)
    alert(`刪除失敗：${error.message || '請稍後再試'}`)
  } finally {
    isDeleting.value = false
  }
}

// 判斷是否有下一個同層級的兄弟節點
const hasNextSibling = (item, index) => {
  // 檢查下一個項目是否存在且層級大於等於當前層級
  for (let i = index + 1; i < displayData.value.length; i++) {
    const nextItem = displayData.value[i]
    if (nextItem.level < item.level) {
      return false // 遇到更高層級，沒有兄弟節點
    }
    if (nextItem.level === item.level) {
      return true // 找到同層級兄弟節點
    }
    // 如果是子節點，繼續找
  }
  return false
}

// 判斷是否為最後一個子節點
const isLastChild = (item, index) => {
  const nextItem = displayData.value[index + 1]
  return !nextItem || nextItem.level <= item.level
}

const getUnitData = async () => {
  try {
    isSearching.value = true
    
    const searchParams = {
      name: searchForm.keyword || undefined, // 關鍵字搜尋
      sortBy: sortColumn.value,
      sortOrder: sortDirection.value.toUpperCase(),
      page: currentPage.value,
      pageSize: pageSize.value
    }
    
    let response
    
    // 根據是否有搜尋關鍵字決定使用哪種搜尋方式
    if (searchForm.keyword && searchForm.keyword.trim()) {
      // 有搜尋關鍵字，使用深度搜尋
      console.log('執行深度搜尋:', searchForm.keyword)
      response = await unitStore.searchUnits(searchParams)
      
      // 深度搜尋不需要分頁（通常返回所有匹配結果）
      if (response && response.data) {
        totalItems.value = unitData.value.length
        totalPages.value = 1 // 深度搜尋通常一頁顯示所有結果
      }
    } else {
      // 沒有搜尋關鍵字，使用原本的邏輯
      console.log('執行第一層查詢')
      if (unitStore.isInitialized) {
        response = await unitStore.searchUnits(searchParams)
      } else {
        response = await unitStore.initializeUnits(searchParams)
      }
      
      if (response && response.data) {
        // 第一層查詢有分頁資訊
        totalItems.value = response.data.total || unitData.value.length
        totalPages.value = response.data.totalPages || Math.ceil(totalItems.value / pageSize.value)
      }
    }
    
    // 統一處理沒有資料的情況
    if (!response || !unitData.value.length) {
      totalItems.value = 0
      totalPages.value = 0
    }
    
    console.log('資料載入完成，單位數量:', unitData.value.length)
    
  } catch (error) {
    console.error('載入單位資料失敗:', error)
    alert('載入資料失敗，請稍後再試')
  } finally {
    isSearching.value = false
  }
}

// watch pageSize
watch(pageSize, async (newSize) => {
  console.log('分頁大小變更:', newSize)
  currentPage.value = 1
  await getUnitData()
})

onMounted(async () => {
  // 添加視窗尺寸監聽器
  window.addEventListener('resize', handleResize)
  
  console.log('onMounted: UnitManagement')
  try {
    await getUnitData()
  } catch (error) {
    console.error('載入資料失敗:', error)
  }
})

// 清理函數
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="unit-management">
    <!-- 搜尋區域 -->
    <section class="search-section">
      <div class="search-row">
        <div class="search-field">
          <input 
            type="text" 
            v-model="searchForm.keyword"
            placeholder="輸入單位名稱進行深度搜尋"
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
        
        <button v-if="hasWriteUnitPermission" class="new-unit-btn" @click="createNewUnit" :class="{ disabled: isLoading }" :disabled="isLoading">
          新增單位
        </button>
      </div>

      <!-- 桌面版和平板版表格 -->
      <div class="table-container" v-if="!isMobile">
        <table class="data-table">
          <thead>
            <tr>
              <th width="80">項次</th>
              <th class="sortable" @click="!isLoading && sortBy('name')">
                單位名稱
                <span class="sort-icon" v-if="sortColumn === 'name'">
                  <span v-if="sortDirection === 'asc'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th class="sortable" @click="!isLoading && sortBy('order')" width="100">
                單位層次
                <span class="sort-icon" v-if="sortColumn === 'order'">
                  <span v-if="sortDirection === 'asc'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th class="sortable" @click="!isLoading && sortBy('created_at')" width="160">
                建立時間
                <span class="sort-icon" v-if="sortColumn === 'created_at'">
                  <span v-if="sortDirection === 'asc'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th width="80">展開</th>
              <th v-if="hasWriteUnitPermission" width="120">新增單位</th>
              <th v-if="hasWriteUnitPermission" width="80">刪除</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading 狀態 -->
            <tr v-if="isLoading" class="loading-row">
              <td :colspan="hasWriteUnitPermission ? 7 : 5" class="loading-cell">
                <div class="loading-container">
                  <div class="loading-spinner large">⟳</div>
                  <div class="loading-text">資料載入中...</div>
                </div>
              </td>
            </tr>
            
            <!-- 搜尋中狀態 -->
            <tr v-else-if="isSearching" class="loading-row">
              <td :colspan="hasWriteUnitPermission ? 7 : 5" class="loading-cell">
                <div class="loading-container">
                  <div class="loading-spinner large">⟳</div>
                  <div class="loading-text">搜尋中...</div>
                </div>
              </td>
            </tr>
            
            <!-- 正常資料顯示 -->
            <tr v-else v-for="(item, index) in displayData" :key="item.id" class="table-row">
              <td>
                <span v-if="item.level === 1">{{ item.parentIndex }}</span>
                <span v-else></span>
              </td>
              <td class="unit-name-cell">
                <div class="unit-tree-item" :style="{ paddingLeft: `${(item.level - 1) * 20 + 10}px` }">
                  <span v-if="item.level > 1" class="tree-connector">└</span>
                  <span 
                    class="expand-icon"
                    @click="toggleExpand(item.id)"
                    :class="{ 'no-click': item.hasChildren === false }"
                  >
                    <span v-if="item.isLoading" class="loading-spinner">⟳</span>
                    <span v-else-if="item.hasChildren === false">📄</span>
                    <span v-else-if="item.isExpanded">📂</span>
                    <span v-else>📁</span>
                  </span>
                  <router-link :to="`/settings/unit/unit-edit/${item.id}`" class="unit-name">{{ item.name }}</router-link>
                </div>
              </td>
              <td>{{ item.level }}</td>
              <td>{{ formatDateTime(item.created_at) }}</td>
              <td>
                <button 
                  class="expand-btn"
                  @click="toggleExpand(item.id, item.parentIndex - 1)"
                  :disabled="isLoading || item.isLoading"
                  :class="{
                    'loading': item.isLoading,
                    'expanded': !item.isExpanded && item.hasChildren,
                    'collapsed': item.isExpanded,
                    'no-children': item.hasChildren === false
                  }"
                  :title="item.isLoading ? '載入中...' : (item.isExpanded ? '收合' : '展開')" 
                >
                  <span v-if="item.isLoading" class="loading-spinner">⟳</span>
                  <span v-else>{{ item.isExpanded ? '收合' : '展開' }}</span>
                </button>
              </td>
              <td v-if="hasWriteUnitPermission">
                <button v-if="item.level < 5" class="action-btn edit-btn" @click="insertUnit(item.id)" title="新增單位">
                  新增L{{ item.level + 1 }}
                </button>
              </td>
              <td v-if="hasWriteUnitPermission">
                <button 
                  class="action-btn delete-btn" 
                  @click="deleteUnit(item.id, item.name)" 
                  :disabled="isDeleting"
                  title="刪除單位"
                >
                  <span v-if="isDeleting" class="loading-spinner">⟳</span>
                  <span v-else>🗑️</span>
                </button>
              </td>
            </tr>
            
            <!-- 無資料狀態 -->
            <tr v-if="!isLoading && !isSearching && displayData.length === 0">
              <td :colspan="hasWriteUnitPermission ? 7 : 5" class="no-data">暫無資料</td>
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
        <div v-else v-for="(item, index) in displayData" :key="item.id" class="mobile-card" :class="`level-${item.level}`">
          <div class="card-header">
            <div class="unit-tree-mobile" :style="{ paddingLeft: `${(item.level - 1) * 15}px` }">
              <span v-if="item.level > 1" class="tree-connector-mobile">└</span>
              <span 
                class="expand-icon-mobile"
                @click="toggleExpand(item.id)"
                :class="{ 'no-click': item.hasChildren === false }"
              >
                <span v-if="item.isLoading" class="loading-spinner">⟳</span>
                <span v-else-if="item.hasChildren === false">📄</span>
                <span v-else-if="item.isExpanded">📂</span>
                <span v-else>📁</span>
              </span>
              <router-link :to="`/settings/unit/unit-edit/${item.id}`" class="unit-name-mobile">
                {{ item.name }}
              </router-link>
            </div>
            <div class="card-index" v-if="item.level === 1">#{{ item.parentIndex }}</div>
          </div>
          
          <div class="card-content">
            <div class="card-field">
              <span class="field-label">單位層次：</span>
              <span class="field-value">L{{ item.level }}</span>
            </div>
            <div class="card-field">
              <span class="field-label">建立時間：</span>
              <span class="field-value">{{ formatDateTime(item.created_at) }}</span>
            </div>
          </div>
          
          <div class="card-actions">
            <button 
              class="action-btn-mobile expand-btn-mobile"
              @click="toggleExpand(item.id)"
              :disabled="isLoading || item.isLoading"
              :class="{
                'loading': item.isLoading,
                'expanded': !item.isExpanded && item.hasChildren,
                'collapsed': item.isExpanded,
                'no-children': item.hasChildren === false
              }"
            >
              <span v-if="item.isLoading" class="loading-spinner">⟳</span>
              <span v-else>{{ item.isExpanded ? '收合子單位' : '展開子單位' }}</span>
            </button>
            
            <div class="action-group" v-if="hasWriteUnitPermission">
              <button 
                v-if="item.level < 5" 
                class="action-btn-mobile add-btn-mobile" 
                @click="insertUnit(item.id)"
                title="新增下級單位"
              >
                新增L{{ item.level + 1 }}
              </button>
              <button 
                class="action-btn-mobile delete-btn-mobile" 
                @click="deleteUnit(item.id, item.name)" 
                :disabled="isDeleting"
                title="刪除單位"
              >
                <span v-if="isDeleting" class="loading-spinner">⟳</span>
                <span v-else>刪除</span>
              </button>
            </div>
          </div>
        </div>
        
        <!-- 無資料狀態 -->
        <div v-if="!isLoading && !isSearching && displayData.length === 0" class="no-data-mobile">
          <div class="no-data-icon">🏢</div>
          <div class="no-data-text">暫無單位資料</div>
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
.unit-management {
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
    max-width: 600px;

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

    .new-unit-btn {
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

          td {
            padding: 15px 20px;
            font-size: 14px;
            color: #333;
          }

          .unit-name-cell {
            position: relative;
            
            .unit-tree-item {
              display: flex;
              align-items: center;
              gap: 8px;
              position: relative;
              min-height: 24px;
              
              .tree-connector {
                color: #999;
                font-family: monospace;
              }
              
              .expand-icon {
                cursor: pointer;
                font-size: 16px;
                min-width: 20px;
                display: flex;
                justify-content: center;
                z-index: 10;
                background: white;
                position: relative;
                
                &:hover {
                  opacity: 0.7;
                }
                
                &.no-click {
                  cursor: default;
                  
                  &:hover {
                    opacity: 1;
                  }
                }
              }

              .unit-name {
                font-size: 14px;
                color: #444;
                z-index: 2;
                text-decoration: none;
                
                &:hover {
                  text-decoration: underline;
                  color: #6c5ce7;
                }
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
    border-left: 4px solid #6c5ce7;

    // 不同層級的卡片樣式
    &.level-1 {
      border-left-color: #6c5ce7;
      background: linear-gradient(135deg, #fff 0%, #f8f9ff 100%);
    }

    &.level-2 {
      border-left-color: #28a745;
      background: linear-gradient(135deg, #fff 0%, #f8fff8 100%);
      margin-left: 10px;
    }

    &.level-3 {
      border-left-color: #ffc107;
      background: linear-gradient(135deg, #fff 0%, #fffef8 100%);
      margin-left: 20px;
    }

    &.level-4 {
      border-left-color: #fd7e14;
      background: linear-gradient(135deg, #fff 0%, #fff9f5 100%);
      margin-left: 30px;
    }

    &.level-5 {
      border-left-color: #e83e8c;
      background: linear-gradient(135deg, #fff 0%, #fff5f9 100%);
      margin-left: 40px;
    }

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

      .unit-tree-mobile {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;

        .tree-connector-mobile {
          color: #999;
          font-family: monospace;
          font-size: 14px;
        }

        .expand-icon-mobile {
          cursor: pointer;
          font-size: 16px;
          min-width: 20px;
          display: flex;
          justify-content: center;
          
          &:hover {
            opacity: 0.7;
          }
          
          &.no-click {
            cursor: default;
            
            &:hover {
              opacity: 1;
            }
          }
        }

        .unit-name-mobile {
          font-size: 16px;
          font-weight: 600;
          color: #333;
          text-decoration: none;
          line-height: 1.4;

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
        margin-left: 12px;
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
      flex-direction: column;
      gap: 8px;

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
        text-align: center;

        &:hover:not(:disabled) {
          background: #138496;
          transform: translateY(-1px);
        }

        &.collapsed {
          background: #e9ecef;
          color: #6c757d;
        }

        &.no-children {
          background: #f8f9fa;
          color: #6c757d;
          cursor: not-allowed;
        }

        &.loading {
          background: #ffc107;
          color: #212529;
          cursor: wait;
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }
      }

      .action-group {
        display: flex;
        gap: 8px;

        .action-btn-mobile {
          flex: 1;
          border: none;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s;
          text-align: center;

          &:hover {
            transform: translateY(-1px);
          }

          &.add-btn-mobile {
            background: #28a745;
            color: white;

            &:hover {
              background: #218838;
            }
          }

          &.delete-btn-mobile {
            background: #dc3545;
            color: white;

            &:hover {
              background: #c82333;
            }

            &:disabled {
              opacity: 0.6;
              cursor: not-allowed;
              transform: none !important;
            }
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

// 動作按鈕
.expand-btn {
  background: #17a2b8;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  min-width: 60px;
  position: relative;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  &.collapsed {
    background: #e9ecef;
    color: #6c757d;
    
    &:hover:not(:disabled) {
      background: #dee2e6;
      color: #495057;
    }
  }

  &.expanded {
    background: #17a2b8;
    color: white;
    
    &:hover:not(:disabled) {
      background: #138496;
    }
  }

  &.no-children {
    background: #f8f9fa !important;
    color: #6c757d !important;
    cursor: not-allowed !important;
    
    &:hover {
      transform: none;
      box-shadow: none;
    }
  }

  &.loading {
    background: #ffc107;
    color: #212529;
    cursor: wait;
    
    &:hover {
      transform: none;
      background: #ffc107;
    }
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: none !important;
  }
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  background: #f8f9fa;
  color: #666;
  padding: 6px 12px;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  &.edit-btn {
    background: #28a745;
    color: white;
    margin-right: 5px;
    
    &:hover {
      background: #218838;
    }
  }

  &.delete-btn {
    background: #f8f9fa;
    border: none;
    padding: 6px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    color: #666;
    transition: all 0.2s;

    &:hover {
      background: #ffebee;
      color: #d32f2f;
      transform: scale(1.1);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
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
  .unit-management {
    padding: 24px;
  }

  .search-section {
    padding: 30px;

    .search-row {
      max-width: 700px;
    }
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

      .action-btn {
        font-size: 11px;
        padding: 5px 10px;
        min-width: 28px;
        height: 28px;
      }
    }
  }
}

/* 平板直向 (768px - 991px) */
@media (max-width: 991px) and (min-width: 768px) {
  .unit-management {
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

      .action-btn {
        font-size: 10px;
        padding: 4px 8px;
        min-width: 26px;
        height: 26px;
      }

      .unit-tree-item {
        gap: 6px;

        .expand-icon {
          font-size: 14px;
          min-width: 18px;
        }

        .unit-name {
          font-size: 13px;
        }
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
  .unit-management {
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

      .new-unit-btn {
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

      &.level-2 {
        margin-left: 8px;
      }

      &.level-3 {
        margin-left: 16px;
      }

      &.level-4 {
        margin-left: 24px;
      }

      &.level-5 {
        margin-left: 32px;
      }

      .card-header {
        .unit-tree-mobile {
          gap: 6px;

          .unit-name-mobile {
            font-size: 15px;
          }
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

      .card-actions {
        .expand-btn-mobile {
          font-size: 12px;
          padding: 6px 12px;
        }

        .action-group .action-btn-mobile {
          font-size: 11px;
          padding: 6px 10px;
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
  .unit-management {
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

      .new-unit-btn {
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

      &.level-2 {
        margin-left: 6px;
      }

      &.level-3 {
        margin-left: 12px;
      }

      &.level-4 {
        margin-left: 18px;
      }

      &.level-5 {
        margin-left: 24px;
      }

      .card-header {
        margin-bottom: 10px;
        padding-bottom: 10px;

        .unit-tree-mobile {
          gap: 4px;

          .unit-name-mobile {
            font-size: 14px;
          }

          .expand-icon-mobile {
            font-size: 14px;
            min-width: 18px;
          }
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
          padding: 6px 10px;
          font-size: 11px;
        }

        .action-group .action-btn-mobile {
          font-size: 10px;
          padding: 5px 8px;
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

    .card-actions {
      .action-group {
        flex-direction: column;
        gap: 6px;
      }
    }

    &.level-2,
    &.level-3,
    &.level-4,
    &.level-5 {
      margin-left: 4px;
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
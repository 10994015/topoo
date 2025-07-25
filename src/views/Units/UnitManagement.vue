<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUnitStore } from '@/stores/unit'
import { formatDateTime } from '@/utils/dateUtils'
import { PERMISSIONS } from '@/utils/permissions'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const unitStore = useUnitStore()
const authStore = useAuthStore()
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
  console.log('onMounted: UnitManagement')
  try {
    await getUnitData()
  } catch (error) {
    console.error('載入資料失敗:', error)
  }
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
        </div>
        
        <button class="search-btn" @click="handleSearch" :disabled="isLoading || isSearching">
          <span v-if="isSearching" class="loading-spinner">⟳</span>
          <span v-else>查詢</span>
        </button>
        <button class="reset-btn" @click="handleReset" :disabled="isLoading">重置</button>
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

      <!-- 資料表格 -->
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>
                項次 
              </th>
              <th class="sortable" @click="!isLoading && sortBy('name')">
                單位名稱
                <span class="sort-icon" v-if="sortColumn === 'name'">
                  <span v-if="sortDirection === 'asc'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th class="sortable" @click="!isLoading && sortBy('order')">
                單位層次
                <span class="sort-icon" v-if="sortColumn === 'order'">
                  <span v-if="sortDirection === 'asc'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th class="sortable" @click="!isLoading && sortBy('created_at')">
                建立時間
                <span class="sort-icon" v-if="sortColumn === 'created_at'">
                  <span v-if="sortDirection === 'asc'">↑</span>
                  <span v-else>↓</span>
                </span>
                <span class="sort-icon neutral" v-else>⇅</span>
              </th>
              <th v-if="hasWriteUnitPermission">
                新增單位
              </th>
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
            <tr v-else v-for="item in displayData" :key="item.id" class="table-row">
              <td>
                <span v-if="item.level === 1">{{ item.parentIndex }}</span>
                <span v-else></span>
              </td>
              <td class="unit-name-cell">
                <div class="unit-tree-item" :style="{ paddingLeft: `${(item.level - 1) * 20 + 10}px` }">
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
                <button v-if="hasWriteUnitPermission" class="action-btn edit-btn" @click="insertUnit(item.id)" title="新增單位">
                  新增單位位階{{ item.level + 1 }}
                </button>
              </td>
            </tr>
            
            <!-- 無資料狀態 -->
            <tr v-if="!isLoading && !isSearching && displayData.length === 0">
              <td colspan="6" class="no-data">暫無資料</td>
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
              min-height: 50px; // 確保有足夠高度

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
                color:#444;
                z-index: 2;
                text-decoration: none;
                &:hover {
                  text-decoration: underline;
                  color:#000;
                }
              }

              // 測試用：明顯的紅色線條
              &[data-level="2"] {
                &::before {
                  content: '';
                  position: absolute;
                  top: 50%;
                  left: 10px;
                  width: 15px;
                  height: 3px;
                  background: red;
                  z-index: 5;
                }
              }

              &[data-level="3"] {
                &::before {
                  content: '';
                  position: absolute;
                  top: 50%;
                  left: 30px;
                  width: 15px;
                  height: 3px;
                  background: blue;
                  z-index: 5;
                }
              }

              &[data-level="4"] {
                &::before {
                  content: '';
                  position: absolute;
                  top: 50%;
                  left: 50px;
                  width: 15px;
                  height: 3px;
                  background: green;
                  z-index: 5;
                }
              }

              // 垂直線測試
              &[data-has-next="true"] {
                &::after {
                  content: '';
                  position: absolute;
                  left: calc(10px + (var(--level, 1) - 1) * 20px);
                  top: 50%;
                  height: 25px;
                  width: 3px;
                  background: purple;
                  z-index: 5;
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
            &:hover {
              background: #f8d7da;
              color: #721c24;
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

  .table-container {
    .data-table {
      min-width: 800px;
    }
  }

  .action-btn {
    font-size: 10px;
    padding: 4px 8px;
    min-width: 28px;
    height: 28px;
  }
}
</style>
<script setup>
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePermissionStore } from '@/stores/permission'
import { useAuthStore } from '@/stores/auth'
import { PERMISSIONS, checkPermission } from '@/utils/permissions'
import { formatDateTime } from '@/utils/dateUtils'

// 引入權限狀態管理
const authStore = useAuthStore()
const permissionStore = usePermissionStore()
const route = useRoute()
const router = useRouter()
const hasFullPermission = computed(() => authStore.canModify(PERMISSIONS.PERMISSION_ROLE_MEMBER_MANAGEMENT));

// 響應式視窗寬度監聽
const windowWidth = ref(window.innerWidth)

// 權限群組ID
const groupId = computed(() => route.params.id)

// Loading狀態
const loading = reactive({
  initial: true,
  save: false,
  table: false  // 新增 table loading 狀態
})

// 群組資訊
const groupInfo = ref({
  name: '客服工程師',
  memberCount: 1,
  createdTime: '2025/05/01 10:30'
})
const tempCheckedUsers = ref([]) // 用於暫存已選擇的用戶
// 搜尋表單
const searchForm = reactive({
  keyword: ''
})

// 分頁設定
const currentPage = ref(1)
const pageSize = ref(25)
const totalItems = ref(0)

// 使用者資料
const users = ref([
 
])

// 排序設定
const sortConfig = ref({
  field: 'id',
  order: 'asc'
})

// 響應式計算屬性 - 判斷是否為手機模式
const isMobile = computed(() => windowWidth.value <= 767)
const isTablet = computed(() => windowWidth.value > 767 && windowWidth.value <= 1024)
const isDesktop = computed(() => windowWidth.value > 1024)

// 視窗尺寸變化處理器
const handleResize = () => {
  windowWidth.value = window.innerWidth
}

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

// 全選狀態
const isAllSelected = computed(() => {
  const selectableUsers = users.value.filter(user => !user.isAdmin)
  return selectableUsers.length > 0 && selectableUsers.every(user => user.isSelected)
})

const isIndeterminate = computed(() => {
  const selectableUsers = users.value.filter(user => !user.isAdmin)
  const selectedCount = selectableUsers.filter(user => user.isSelected).length
  return selectedCount > 0 && selectedCount < selectableUsers.length
})

// 方法
const handleSearch = async () => {
  currentPage.value = 1
  //console.log('執行搜尋:', searchForm.keyword)
  loading.table = true
  try {
    await loadData()
  } finally {
    loading.table = false
  }
}

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
  currentPage.value = 1
  
  loading.table = true
  try {
    await loadData()
  } finally {
    loading.table = false
  }
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
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
  
  loading.table = true
  try {
    await loadData()
  } finally {
    loading.table = false
  }
}

const handlePageSizeChange = async()=>{
  currentPage.value = 1
  //console.log('頁面大小變更:', pageSize.value)
  
  loading.table = true
  try {
    await loadData()
  } finally {
    loading.table = false
  }
}

// 全選/取消全選
const handleSelectAll = (checked) => {
  users.value.forEach(user => {
    if (!user.isAdmin) {
      user.isSelected = checked
      // tempCheckedUsers.value = checked ? users.value.filter(u => !u.isAdmin).map(u => u.id) : []
    }
  })
  
}

// 單選
const handleUserSelect = (user, checked) => {
  if (!user.isAdmin) {
    user.isSelected = checked
    // tempCheckedUsers.value = users.value.filter(u => u.isSelected).map(u => u.id)
  }
  //console.log(users.value);
}

// 儲存
const handleSave = async () => {
  if(!hasFullPermission.value){
    alert('您沒有權限進行此操作！')
    return
  }
  loading.save = true
  
  const patchUsers = users.value.map(user => ({
    user_id: user.id,
    is_in_role: user.isSelected,
  }))
  //console.log('成員:', patchUsers)

  
  try {
    // 模擬 API 調用
    const result = await permissionStore.updateMembersToPermission(groupId.value, patchUsers)

    //console.log(result);
    
    if(result.statusCode === 200){
      alert('儲存成功！');
      // 重新整理
      loading.table = true
        try {
            await loadData()
        } catch (error) {
            //console.error('載入失敗:', error)
        } finally {
            loading.table = false
        }
    }
  } catch (error) {
    //console.error('儲存失敗:', error)
    //console.log(error.response.data.message);
    
    alert('儲存失敗，' + (error.response.data.message || '未知錯誤'))
  } finally {
    loading.save = false
  }
}

// 取消
const handleCancel = () => {
  router.back()
}

const loadData = async ()=>{
    await permissionStore.getPermissionById(groupId.value)
    //console.log(permissionStore.permission);
    
    groupInfo.value = {
      name: permissionStore.permission.role_name,
      memberCount: permissionStore.permission.users.length ?? 0,
      createdTime: permissionStore.permission.created_at
    }
    const params = {
        text: searchForm.keyword,
        sortField: sortConfig.value.field,
        sortOrder: sortConfig.value.order,
        page: currentPage.value,
        pageSize: pageSize.value
    };
    await permissionStore.getPermissionMembers(groupId.value, params)
    //console.log(permissionStore.permissionGroupMembers);
    
    users.value = permissionStore.permissionGroupMembers.data.map(user => ({
      id: user.id,
      credential: user.credential,
      name: user.name,
      nickName: user.nick_name,
      repairUnit: user.repair_unit,
      userJoinTime: user.user_join_time || '尚未加入',
      isSelected: permissionStore.permission.users.some(permissionUser => permissionUser.user_id === user.id),
      isAdmin: user.is_admin // 假設所有載入的用戶都在群組中
    }))
    //console.log(users.value);
    
    totalItems.value = permissionStore.permissionGroupMembers.total
    totalPages.value = permissionStore.permissionGroupMembers.totalPages
}

onMounted(async () => {
  // 添加視窗尺寸監聽器
  window.addEventListener('resize', handleResize)
  
  // 模擬載入資料
  loading.initial = true
  try {
      await loadData()
  } catch (error) {
    //console.error('載入失敗:', error)
  } finally {
    loading.initial = false
  }
})

// 清理函數
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="select-members">
    <!-- 全屏初始載入遮罩 -->
    <div v-if="loading.initial" class="loading-container">
      <div class="loading-spinner">⟳</div>
      <div class="loading-text">載入中...</div>
    </div>

    <!-- 主要內容 -->
    <template v-else>
      <!-- 群組資訊區域 -->
      <div class="group-info-section">
        <div class="info-header">
          <h2 class="section-title">群組成員選取</h2>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">群組</span>
            <span class="info-value">{{ groupInfo.name }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">人數</span>
            <span class="info-value">{{ groupInfo.memberCount }} 人</span>
          </div>
          <div class="info-item">
            <span class="info-label">新增時間</span>
            <span class="info-value">{{ formatDateTime(groupInfo.createdTime) }}</span>
          </div>
        </div>
      </div>

      <!-- 搜尋區域 -->
      <div class="search-section">
        <div class="search-field">
          <input 
            type="text" 
            v-model="searchForm.keyword"
            placeholder="輸入帳號、姓名及權限"
            class="search-input"
            :disabled="loading.table"
            @keyup.enter="handleSearch"
          />
          <button 
            class="search-btn" 
            :disabled="loading.table"
            @click="handleSearch"
          >
            查詢
          </button>
        </div>
      </div>

      <!-- 控制區域 -->
      <div class="control-section">
        <div class="left-controls">
          <select 
            v-model="pageSize" 
            :disabled="loading.table"
            @change="handlePageSizeChange()" 
            class="page-size-select"
          >
            <option value="10">10筆/頁</option>
            <option value="25">25筆/頁</option>
            <option value="20">20筆/頁</option>
            <option value="50">50筆/頁</option>
            <option value="999999999">全部顯示</option>
          </select>
        </div>
        
        <div class="right-controls">
          <button 
            v-if="hasFullPermission"
            class="btn btn-primary" 
            @click="handleSave"
            :disabled="loading.save || loading.table"
          >
            <span v-if="loading.save" class="btn-loading">
              <div class="btn-spinner"></div>
              儲存中...
            </span>
            <span v-else>儲存</span>
          </button>
          <button 
            class="btn btn-secondary" 
            @click="handleCancel"
            :disabled="loading.save || loading.table"
          >
            返回
          </button>
        </div>
      </div>

      <!-- 資料表格區域 -->
      <div class="table-section">
        <!-- 桌面版表格 -->
        <div class="table-container" v-if="!isMobile" :class="{ 'table-loading': loading.table }">
          <!-- Table Loading 遮罩 -->
          <div v-if="loading.table" class="table-loading-overlay">
            <div class="table-loading-spinner">⟳</div>
            <div class="table-loading-text">載入中...</div>
          </div>
          
          <table class="data-table">
            <thead>
              <tr>
                <th class="checkbox-column" v-if="hasFullPermission">
                  <input 
                    type="checkbox" 
                    :checked="isAllSelected"
                    :indeterminate="isIndeterminate"
                    :disabled="loading.table"
                    @change="handleSelectAll($event.target.checked)"
                    class="checkbox-input"
                  />
                </th>
                <th>項次</th>
                <th 
                  class="sortable" 
                  :class="[getSortClass('credential'), { 'disabled': loading.table }]"
                  @click="!loading.table && handleSort('credential')"
                >
                  帳號
                  <span class="sort-icon" v-if="sortConfig.field === 'credential'">
                    <span v-if="sortConfig.order === 'asc'">↑</span>
                    <span v-else>↓</span>
                  </span>
                  <span class="sort-icon neutral" v-else>⇅</span>
                </th>
                <th 
                  class="sortable" 
                  :class="[getSortClass('name'), { 'disabled': loading.table }]"
                  @click="!loading.table && handleSort('name')"
                >
                  姓名
                  <span class="sort-icon" v-if="sortConfig.field === 'name'">
                    <span v-if="sortConfig.order === 'asc'">↑</span>
                    <span v-else>↓</span>
                  </span>
                  <span class="sort-icon neutral" v-else>⇅</span>
                </th>
                <th 
                  class="sortable" 
                  :class="[getSortClass('nick_name'), { 'disabled': loading.table }]"
                  @click="!loading.table && handleSort('nick_name')"
                >
                  暱稱
                  <span class="sort-icon" v-if="sortConfig.field === 'nick_name'">
                    <span v-if="sortConfig.order === 'asc'">↑</span>
                    <span v-else>↓</span>
                  </span>
                  <span class="sort-icon neutral" v-else>⇅</span>
                </th>
                <th 
                  class="sortable" 
                  :class="[getSortClass('department'), { 'disabled': loading.table }]"
                  @click="!loading.table && handleSort('department')"
                >
                  報修單位
                  <span class="sort-icon" v-if="sortConfig.field === 'department'">
                    <span v-if="sortConfig.order === 'asc'">↑</span>
                    <span v-else>↓</span>
                  </span>
                  <span class="sort-icon neutral" v-else>⇅</span>
                </th>
                <th 
                  class="sortable" 
                  :class="[getSortClass('joinTime'), { 'disabled': loading.table }]"
                  @click="!loading.table && handleSort('joinTime')"
                >
                  加入時間
                  <span class="sort-icon" v-if="sortConfig.field === 'joinTime'">
                    <span v-if="sortConfig.order === 'asc'">↑</span>
                    <span v-else>↓</span>
                  </span>
                  <span class="sort-icon neutral" v-else>⇅</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(user, index) in users" :key="user.id" class="table-row">
                <td class="checkbox-cell" v-if="hasFullPermission">
                  <input 
                    type="checkbox" 
                    :checked="user.isSelected"
                    :disabled="user.isAdmin || loading.table"
                    @change="handleUserSelect(user, $event.target.checked)"
                    :class="[
                      'checkbox-input', 
                      { 
                        'checkbox-existing': user.isAdmin,
                        'checkbox-new': user.isSelected && !user.isAdmin
                      }
                    ]"
                  />
                </td>
                <td>{{ index+1}}</td>
                <td>{{ user.credential }}</td>
                <td>{{ user.name }}</td>
                <td>{{ user.nickName }}</td>
                <td>{{ user.repairUnit || '-' }}</td>
                <td>{{ formatDateTime(user.userJoinTime) }}</td>
              </tr>
              
              <!-- 無資料狀態 -->
              <tr v-if="users.length === 0 && !loading.table">
                <td :colspan="hasFullPermission ? 7 : 6" class="no-data">暫無資料</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 手機版卡片 -->
        <div class="mobile-cards" v-else>
          <!-- 全選控制 - 手機版 -->
          <div class="mobile-select-all" v-if="hasFullPermission && users.length > 0">
            <label class="select-all-label">
              <input 
                type="checkbox" 
                :checked="isAllSelected"
                :indeterminate="isIndeterminate"
                :disabled="loading.table"
                @change="handleSelectAll($event.target.checked)"
                class="checkbox-input"
              />
              <span class="select-all-text">全選可選擇的成員</span>
            </label>
          </div>

          <!-- Loading 狀態 -->
          <div v-if="loading.table" class="loading-container">
            <div class="loading-spinner large">⟳</div>
            <div class="loading-text">載入中...</div>
          </div>
          
          <!-- 正常資料顯示 -->
          <div v-else v-for="(user, index) in users" :key="user.id" class="mobile-card">
            <div class="card-header">
              <div class="card-left">
                <div v-if="hasFullPermission" class="card-checkbox">
                  <input 
                    type="checkbox" 
                    :checked="user.isSelected"
                    :disabled="user.isAdmin || loading.table"
                    @change="handleUserSelect(user, $event.target.checked)"
                    :class="[
                      'checkbox-input', 
                      { 
                        'checkbox-existing': user.isAdmin,
                        'checkbox-new': user.isSelected && !user.isAdmin
                      }
                    ]"
                  />
                </div>
                <div class="card-title">{{ user.credential }}</div>
              </div>
              <div class="card-index">#{{ index + 1 }}</div>
            </div>
            <div class="card-content">
              <div class="card-field">
                <span class="field-label">姓名：</span>
                <span class="field-value">{{ user.name }}</span>
              </div>
              <div class="card-field">
                <span class="field-label">暱稱：</span>
                <span class="field-value">{{ user.nickName || '-' }}</span>
              </div>
              <div class="card-field">
                <span class="field-label">報修單位：</span>
                <span class="field-value">{{ user.repairUnit || '-' }}</span>
              </div>
              <div class="card-field">
                <span class="field-label">加入時間：</span>
                <span class="field-value">{{ formatDateTime(user.userJoinTime) }}</span>
              </div>
              <div v-if="user.isAdmin" class="admin-badge">
                <span class="badge">管理員</span>
              </div>
            </div>
          </div>
          
          <!-- 無資料狀態 -->
          <div v-if="!loading.table && users.length === 0" class="no-data-mobile">
            <div class="no-data-icon">👥</div>
            <div class="no-data-text">暫無資料</div>
          </div>
        </div>

        <!-- 分頁控制 -->
        <div class="pagination-section">
          <div class="pagination-info">
            <span>顯示第 {{ startItem }} 到 {{ endItem }} 筆結果 共 {{ totalItems }} 項</span>
          </div>
          
          <div class="pagination-controls">
            <button 
              class="page-btn" 
              :disabled="currentPage === 1 || loading.table"
              @click="goToPage(currentPage - 1)"
            >
              ‹
            </button>
            
            <button 
              v-for="page in visiblePages" 
              :key="page"
              :class="['page-btn', { active: page === currentPage }]"
              :disabled="loading.table"
              @click="goToPage(page)"
            >
              {{ page }}
            </button>
            
            <span v-if="showEllipsis" class="ellipsis">...</span>
            
            <button 
              v-if="totalPages > 5"
              :class="['page-btn', { active: totalPages === currentPage }]"
              :disabled="loading.table"
              @click="goToPage(totalPages)"
            >
              {{ totalPages }}
            </button>
            
            <button 
              class="page-btn" 
              :disabled="currentPage === totalPages || loading.table"
              @click="goToPage(currentPage + 1)"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.select-members {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

// Loading樣式
.loading-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(245, 245, 245, 0.9);
  color: #666;
  z-index: 1000;
  
  .loading-spinner {
    font-size: 32px;
    color: #6c5ce7;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
    
    &.large {
      font-size: 24px;
      margin-bottom: 12px;
    }
  }

  .loading-text {
    font-size: 16px;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// 按鈕loading樣式
.btn-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

// 群組資訊區域
.group-info-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
  overflow: hidden;

  .info-header {
    background: #6c5ce7;
    padding: 20px 25px;

    .section-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: white;
    }
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 30px;
    padding: 20px 25px;

    .info-item {
      display: flex;
      align-items: center;
      gap: 15px;

      .info-label {
        font-weight: 500;
        color: #666;
        min-width: 70px;
        flex-shrink: 0;
      }

      .info-value {
        color: #333;
        font-weight: 500;
        word-break: break-word;
      }
    }
  }
}

// 搜尋區域
.search-section {
  background: white;
  padding: 20px 25px;
  margin-bottom: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  .search-field {
    display: flex;
    gap: 15px;
    align-items: center;

    .search-input {
      flex: 1;
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
        background: #f8f9fa;
        color: #6c757d;
        cursor: not-allowed;
      }
    }

    .search-btn {
      background: #6c5ce7;
      color: white;
      border: none;
      padding: 12px 30px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s;
      flex-shrink: 0;

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
  }
}

// 控制區域
.control-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  gap: 20px;

  .left-controls {
    .page-size-select {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      background: white;
      
      &:disabled {
        background: #f8f9fa;
        color: #6c757d;
        cursor: not-allowed;
      }
    }
  }

  .right-controls {
    display: flex;
    gap: 15px;
    align-items: flex-start;
    flex-wrap: wrap;

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s;
      white-space: nowrap;

      &:disabled {
        cursor: not-allowed;
        transform: none;
      }

      &.btn-primary {
        background: #6c5ce7;
        color: white;

        &:hover:not(:disabled) {
          background: #5b4bcf;
          transform: translateY(-1px);
        }
        
        &:disabled {
          background: #ccc;
        }
      }

      &.btn-secondary {
        background: white;
        color: #666;
        border: 1px solid #ddd;

        &:hover:not(:disabled) {
          background: #f8f9fa;
          border-color: #6c5ce7;
          color: #6c5ce7;
        }
        
        &:disabled {
          background: #f8f9fa;
          color: #ccc;
          border-color: #ccc;
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

  .table-container {
    position: relative;
    overflow-x: auto;

    &.table-loading {
      .data-table {
        opacity: 0.6;
        pointer-events: none;
      }
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 800px; // 確保表格最小寬度

      thead {
        background: #6c5ce7;
        color: white;

        th {
          padding: 15px 20px;
          text-align: left;
          font-weight: 500;
          font-size: 14px;
          position: relative;
          white-space: nowrap;

          &.checkbox-column {
            width: 50px;
            text-align: center;
            padding: 15px 10px;
          }

          &.sortable {
            cursor: pointer;
            user-select: none;
            transition: background-color 0.3s;

            &:hover:not(.disabled) {
              background: rgba(255, 255, 255, 0.1);
            }

            &.sorted-asc,
            &.sorted-desc {
              background: rgba(255, 255, 255, 0.15);
            }
            
            &.disabled {
              cursor: not-allowed;
              opacity: 0.6;
              
              &:hover {
                background: none;
              }
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
            vertical-align: middle;

            &.checkbox-cell {
              text-align: center;
              padding: 15px 10px;
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

  .mobile-select-all {
    background: white;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    
    .select-all-label {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      user-select: none;
      
      .select-all-text {
        font-size: 14px;
        font-weight: 500;
        color: #333;
      }
    }
  }

  .mobile-card {
    background: white;
    border-radius: 8px;
    margin-bottom: 16px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.3s;
    border: 1px solid #e9ecef;

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

      .card-left {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
        min-width: 0; // 防止 flex 項目溢出

        .card-checkbox {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        .card-title {
          font-size: 16px;
          font-weight: 600;
          color: #6c5ce7;
          line-height: 1.4;
          word-break: break-word;
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

      .admin-badge {
        margin-top: 8px;
        
        .badge {
          background: #28a745;
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
          display: inline-block;
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

// Table Loading 遮罩
.table-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: 8px;
  
  .table-loading-spinner {
    font-size: 24px;
    color: #6c5ce7;
    animation: spin 1s linear infinite;
    margin-bottom: 8px;
  }

  .table-loading-text {
    font-size: 14px;
    color: #666;
  }
}

// Checkbox 樣式
.checkbox-input {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #6c5ce7;
  margin: 0;

  &.checkbox-existing {
    accent-color: #28a745; // 綠色 - 原有成員
  }

  &.checkbox-new {
    accent-color: #ffc107; // 黃色 - 新選中成員
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
}

// 分頁區域
.pagination-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  border-top: 1px solid #f0f0f0;
  background: #f8f9fa;

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
        border-color: #ddd;
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
  .select-members {
    padding: 24px;
  }

  .group-info-section {
    .info-header {
      padding: 24px 30px;
    }

    .info-grid {
      padding: 24px 30px;
      gap: 40px;
    }
  }

  .search-section {
    padding: 24px 30px;
  }

  .pagination-section {
    padding: 24px 30px;
  }
}

/* 平板橫向 (1025px - 1399px) */
@media (max-width: 1399px) and (min-width: 1025px) {
  .table-section .data-table {
    thead th {
      padding: 12px 16px;
      font-size: 13px;
    }

    tbody td {
      padding: 12px 16px;
      font-size: 13px;
    }
  }
}

/* 平板直向 (768px - 1024px) */
@media (max-width: 1024px) and (min-width: 768px) {
  .select-members {
    padding: 16px;
  }

  .control-section {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;

    .right-controls {
      flex-direction: row;
      justify-content: flex-end;
      gap: 10px;

      .btn {
        flex: 0 0 auto;
      }
    }
  }

  .group-info-section {
    .info-grid {
      grid-template-columns: 1fr;
      gap: 15px;
    }
  }

  .table-section .data-table {
    min-width: 700px;

    thead th {
      padding: 10px 12px;
      font-size: 12px;
    }

    tbody td {
      padding: 10px 12px;
      font-size: 12px;
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
  .select-members {
    padding: 12px;
  }

  .group-info-section {
    .info-header {
      padding: 16px 20px;

      .section-title {
        font-size: 16px;
      }
    }

    .info-grid {
      padding: 16px 20px;
      grid-template-columns: 1fr;
      gap: 12px;

      .info-item {
        gap: 10px;

        .info-label {
          min-width: 60px;
          font-size: 13px;
        }

        .info-value {
          font-size: 13px;
        }
      }
    }
  }

  .search-section {
    padding: 16px 20px;

    .search-field {
      flex-direction: column;
      gap: 12px;

      .search-btn {
        width: 100%;
        padding: 12px 16px;
      }
    }
  }

  .control-section {
    flex-direction: column;
    gap: 12px;

    .left-controls {
      .page-size-select {
        padding: 8px 10px;
        font-size: 13px;
      }
    }

    .right-controls {
      flex-direction: column;
      gap: 8px;

      .btn {
        width: 100%;
        padding: 12px 16px;
      }
    }
  }

  .mobile-cards {
    padding: 12px 16px;

    .mobile-select-all {
      padding: 12px;
      margin-bottom: 12px;

      .select-all-label {
        gap: 10px;

        .select-all-text {
          font-size: 13px;
        }
      }
    }

    .mobile-card {
      padding: 12px;
      margin-bottom: 12px;

      .card-header {
        .card-left {
          gap: 10px;

          .card-title {
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
  .select-members {
    padding: 8px;
  }

  .group-info-section {
    .info-header {
      padding: 12px 16px;

      .section-title {
        font-size: 15px;
      }
    }

    .info-grid {
      padding: 12px 16px;
      gap: 10px;

      .info-item {
        gap: 8px;
        flex-direction: column;
        align-items: flex-start;

        .info-label {
          min-width: auto;
          font-size: 12px;
          font-weight: 600;
        }

        .info-value {
          font-size: 12px;
        }
      }
    }
  }

  .search-section {
    padding: 12px 16px;

    .search-field {
      gap: 10px;

      .search-input {
        padding: 10px 12px;
        font-size: 13px;
      }

      .search-btn {
        padding: 10px 12px;
        font-size: 13px;
      }
    }
  }

  .control-section {
    gap: 10px;

    .left-controls .page-size-select {
      padding: 6px 8px;
      font-size: 12px;
    }

    .right-controls .btn {
      padding: 10px 12px;
      font-size: 13px;
    }
  }

  .mobile-cards {
    padding: 8px 12px;

    .mobile-select-all {
      padding: 10px;
      margin-bottom: 10px;

      .select-all-label {
        gap: 8px;

        .select-all-text {
          font-size: 12px;
        }
      }
    }

    .mobile-card {
      padding: 10px;
      margin-bottom: 10px;

      .card-header {
        margin-bottom: 10px;
        padding-bottom: 10px;

        .card-left {
          gap: 8px;

          .card-title {
            font-size: 14px;
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
  .group-info-section .info-grid .info-item {
    gap: 4px;
  }

  .mobile-cards .mobile-card {
    .card-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;

      .card-left {
        width: 100%;
      }

      .card-index {
        align-self: flex-end;
        margin-top: -8px;
      }
    }
  }

  .pagination-controls .page-btn {
    padding: 4px 6px;
    font-size: 10px;
    min-width: 28px;
  }
}

/* 特殊樣式優化 */
@media (max-width: 767px) {
  // 確保手機版複選框有足夠的觸控區域
  .checkbox-input {
    width: 20px;
    height: 20px;
  }

  // 手機版載入狀態優化
  .loading-container {
    padding: 40px 20px;
    
    .loading-spinner {
      font-size: 24px;
      margin-bottom: 12px;
    }

    .loading-text {
      font-size: 14px;
    }
  }
}

/* 載入狀態在小手機版的優化 */
@media (max-width: 479px) {
  .loading-container {
    .loading-spinner {
      font-size: 20px;
      margin-bottom: 10px;
    }

    .loading-text {
      font-size: 13px;
    }
  }
}

/* 極小螢幕的特殊處理 */
@media (max-width: 320px) {
  .mobile-cards .mobile-card {
    .card-header .card-left {
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
    }
    
    .card-content .card-field {
      .field-label {
        min-width: 50px;
        font-size: 10px;
      }
      
      .field-value {
        font-size: 10px;
      }
    }
  }
}
</style>
<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePermissionStore } from '@/stores/permission'
import { useAuthStore } from '@/stores/auth'
import { PERMISSIONS, checkPermission } from '@/utils/permissions'
import { formatDate, formatDateTime } from '@/utils/dateUtils'

// 引入權限狀態管理
const authStore = useAuthStore()
const permissionStore = usePermissionStore()
const route = useRoute()
const router = useRouter()
const hasFullPermission = computed(() => authStore.canModify(PERMISSIONS.PERMISSION_ROLE_MEMBER_MANAGEMENT));

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

// 搜尋表單
const searchForm = reactive({
  keyword: ''
})

// 分頁設定
const currentPage = ref(1)
const pageSize = ref(10)
const totalItems = ref(0)

// 使用者資料
const users = ref([
 
])

// 排序設定
const sortConfig = ref({
  field: 'id',
  order: 'asc'
})

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
  console.log('執行搜尋:', searchForm.keyword)
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
  console.log('頁面大小變更:', pageSize.value)
  
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
    }
  })
}

// 單選
const handleUserSelect = (user, checked) => {
  if (!user.isAdmin) {
    user.isSelected = checked
  }
  console.log(users.value);
  
}

// 儲存
const handleSave = async () => {
  if(!hasFullPermission.value){
    alert('您沒有權限進行此操作！')
    return
  }
  loading.save = true
  
  const patchUsers = users.value.filter(user => user.isSelected).map(user => (user.id))
  console.log('成員:', patchUsers)
  
  try {
    // 模擬 API 調用
    const result = await permissionStore.updateMembersToPermission(groupId.value, patchUsers)

    console.log(result);
    
    if(result.statusCode === 200){
      alert('儲存成功！');
      // 重新整理
      loading.table = true
        try {
            await loadData()
        } catch (error) {
            console.error('載入失敗:', error)
        } finally {
            loading.table = false
        }
    }
  } catch (error) {
    console.error('儲存失敗:', error)
    console.log(error.response.data.message);
    
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
    console.log(permissionStore.permission);
    
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
    console.log(permissionStore.permissionGroupMembers);
    
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
    console.log(users.value);
    
    totalItems.value = permissionStore.permissionGroupMembers.total
    totalPages.value = permissionStore.permissionGroupMembers.totalPages
}

onMounted(async () => {
  // 模擬載入資料
  loading.initial = true
  try {
      await loadData()
  } catch (error) {
    console.error('載入失敗:', error)
  } finally {
    loading.initial = false
  }
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
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">群組</span>
            <span class="info-value">{{ groupInfo.name }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">人數</span>
            <span class="info-value">{{ groupInfo.memberCount }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">新增時間</span>
            <span class="info-value">{{ groupInfo.createdTime }}</span>
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
            <option value="1">1筆/頁</option>
            <option value="10">10筆/頁</option>
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
        <div class="table-container" :class="{ 'table-loading': loading.table }">
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
                <th 
                >
                  項次
                </th>
                <th 
                  class="sortable-header" 
                  :class="[getSortClass('credential'), { 'disabled': loading.table }]"
                  @click="!loading.table && handleSort('credential')"
                >
                  帳號
                  <span class="sort-icon">{{ getSortIcon('credential') }}</span>
                </th>
                <th 
                  class="sortable-header" 
                  :class="[getSortClass('name'), { 'disabled': loading.table }]"
                  @click="!loading.table && handleSort('name')"
                >
                  姓名
                  <span class="sort-icon">{{ getSortIcon('name') }}</span>
                </th>
                <th 
                  class="sortable-header" 
                  :class="[getSortClass('nick_name'), { 'disabled': loading.table }]"
                  @click="!loading.table && handleSort('nick_name')"
                >
                  暱稱
                  <span class="sort-icon">{{ getSortIcon('nick_name') }}</span>
                </th>
                <th 
                  class="sortable-header" 
                  :class="[getSortClass('department'), { 'disabled': loading.table }]"
                  @click="!loading.table && handleSort('department')"
                >
                  報修單位
                  <span class="sort-icon">{{ getSortIcon('department') }}</span>
                </th>
                <th 
                  class="sortable-header" 
                  :class="[getSortClass('joinTime'), { 'disabled': loading.table }]"
                  @click="!loading.table && handleSort('joinTime')"
                >
                  加入時間
                  <span class="sort-icon">{{ getSortIcon('joinTime') }}</span>
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
              :disabled="currentPage === 1 || loading.table"
              @click="goToPage(currentPage - 1)"
            >
              ‹
            </button>
            
            <template v-for="page in visiblePages" :key="page">
              <button 
                v-if="page !== '...'"
                :class="['page-btn', { active: page === currentPage }]"
                :disabled="loading.table"
                @click="goToPage(page)"
              >
                {{ page }}
              </button>
              <span v-else class="ellipsis">...</span>
            </template>
            
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
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #666;
  
  .loading-spinner {
    font-size: 32px;
    color: #6c5ce7;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
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
  padding: 20px 25px;
  margin-bottom: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  .info-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 30px;

    .info-item {
      display: flex;
      align-items: center;
      gap: 15px;

      .info-label {
        font-weight: 500;
        color: #666;
        min-width: 70px;
      }

      .info-value {
        color: #333;
        font-weight: 500;
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

    .notice-text {
      background: #fff3cd;
      color: #856404;
      padding: 12px 15px;
      border: 1px solid #ffeaa7;
      border-radius: 6px;
      font-size: 13px;
      line-height: 1.4;
      max-width: 300px;
    }

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
        background: #f8f9fa;
        color: #6c5ce7;
        border: 1px solid #6c5ce7;

        &:hover:not(:disabled) {
          background: #6c5ce7;
          color: white;
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

      thead {
        background: #6c5ce7;
        color: white;

        th {
          padding: 15px 20px;
          text-align: left;
          font-weight: 500;
          font-size: 14px;

          &.checkbox-column {
            width: 50px;
            text-align: center;
          }

          &.sortable-header {
            cursor: pointer;
            user-select: none;
            transition: all 0.2s;
            position: relative;

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
              font-size: 12px;
              opacity: 0.7;
              transition: opacity 0.2s;
            }

            &:hover:not(.disabled) .sort-icon {
              opacity: 1;
            }

            &.sorted-asc .sort-icon,
            &.sorted-desc .sort-icon {
              opacity: 1;
              font-weight: bold;
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

            &.checkbox-cell {
              text-align: center;
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

// Table Loading 遮罩
.table-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
  
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

// 響應式設計
@media (max-width: 1024px) {
  .control-section {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;

    .right-controls {
      flex-direction: column;
      align-items: stretch;
      gap: 10px;

      .notice-text {
        max-width: none;
      }

      .btn {
        width: 100%;
      }
    }
  }

  .group-info-section {
    .info-grid {
      grid-template-columns: 1fr;
      gap: 15px;
    }
  }
}

@media (max-width: 768px) {
  .select-members {
    padding: 15px;
  }

  .search-section {
    .search-field {
      flex-direction: column;
      align-items: stretch;
      gap: 10px;

      .search-btn {
        width: 100%;
      }
    }
  }

  .pagination-section {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }

  .table-container {
    .data-table {
      thead th {
        padding: 12px 10px;
        font-size: 13px;
      }

      tbody td {
        padding: 12px 10px;
        font-size: 13px;
      }
    }
  }
}
</style>
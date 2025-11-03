<script setup>
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { usePermissionStore } from '@/stores/permission'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { PERMISSIONS, checkPermission } from '@/utils/permissions'

import { formatDateTime } from '@/utils/dateUtils'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const permissionStore = usePermissionStore()
const hasFullPermission = computed(() => authStore.canModify(PERMISSIONS.PERMISSION_ROLE_MANAGEMENT));
//console.log(PERMISSIONS.PERMISSION_ROLE_MEMBER_MANAGEMENT);

const hasFullMemberPermission = computed(() => authStore.canAccessPage(PERMISSIONS.PERMISSION_ROLE_MEMBER_MANAGEMENT));
//console.log(hasFullMemberPermission.value);

// 響應式視窗寬度監聽
const windowWidth = ref(window.innerWidth)

// Loading狀態管理
const loading = reactive({
  initial: true,    // 初始載入
  save: false,      // 儲存操作
  delete: false,    // 刪除操作
  cancel: false     // 取消操作（重新載入資料時）
})

// 表單數據
const formData = reactive({
  groupName: '',
  groupStatus: 'Open',
  permissions:[
  ],
})
const permissionId = computed(() => route.params.id)
// 判斷當前模式
const currentMode = ref('create') // 'view', 'edit', 'create'
const isCreateMode = computed(() => !permissionId.value)
const isViewMode = computed(() => currentMode.value === 'view' && !isCreateMode.value)
const isEditMode = computed(() => currentMode.value === 'edit')
// 分頁設定
const currentPage = ref(1)
const pageSize = ref(20)

// 權限數據
const permissions = ref([
//   { category: '帳號管理', name: '帳號管理', mode: ['Full', 'Readonly'] }, 
])

// 響應式計算屬性 - 判斷是否為手機模式
const isMobile = computed(() => windowWidth.value <= 767)
const isTablet = computed(() => windowWidth.value > 767 && windowWidth.value <= 1024)
const isDesktop = computed(() => windowWidth.value > 1024)

// 視窗尺寸變化處理器
const handleResize = () => {
  windowWidth.value = window.innerWidth
}

// 計算屬性
const totalItems = computed(() => permissions.value.length)
const totalPages = computed(() => Math.ceil(totalItems.value / pageSize.value))

const paginatedPermissions = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return permissions.value.slice(start, end)
})

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

// 方法
const handleSave = async () => {
  //console.log('儲存設定:', formData)
  loading.save = true
  try {
    if (isCreateMode.value) {
      const response = await permissionStore.createPermissionGroup(formData)
      //console.log(response)
      if(response.status === 400){
        alert(response.data.message)
        return
      }
      alert(response.message)
      router.push('/settings/permission-management') // 返回列表頁
    } else {
      const response = await permissionStore.updatePermissionGroup(permissionId.value, formData)
      //console.log(response)
      alert('更新成功！')
      currentMode.value = 'view'
    }
  } catch (error) {
    //console.log('儲存失敗:', error)
    alert(error.response?.data?.message || '儲存失敗，請稍後重試')
  } finally {
    loading.save = false
  }
}

const handleCancel = async () => {
  if (isEditMode.value) {
    loading.cancel = true
    currentMode.value = 'view'
    await loadPermissionGroup() // 重新載入資料
    loading.cancel = false
  } else {
    router.back() // 返回上一頁
  }
}

const handleEdit = () => {
  if (!hasFullPermission.value) {
    alert('您沒有編輯權限！')
    return
  }
  currentMode.value = 'edit'
}

const selectMembers = () => {
  if (!hasFullMemberPermission.value) {
    alert('您沒有選取成員的權限！')
    return
  }
  router.push(`/settings/permission-group/${permissionId.value}/members`)
}

const handleDelete = async () => {
  if (!hasFullPermission.value) {
    alert('您沒有刪除權限！')
    return
  }
  if (confirm('確定要刪除此權限群組嗎？')) {
    loading.delete = true
    try {
      const response = await permissionStore.deletePermissionGroup(permissionId.value)
      //console.log(response)
      if(response.status === 400){
        alert(response.data.message)
        return
      }else{
        alert('刪除成功！')
        router.push('/settings/permission-management')
      }
      // router.push('/settings/permission-management') // 返回列表頁
    } catch (error) {
      //console.error('刪除失敗:', error)
    } finally {
      loading.delete = false
    }
  }
}

const handleReturn = () => {
  router.back()
}

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const permissionModes = {
    'Full': '完全控制',
    'Readonly': '唯讀',
    '': '無權限'
}

const loadPermissionGroup = async () => {
    if(permissionId.value) {
        
        await permissionStore.getPermissionById(permissionId.value);
        //console.log(permissionStore.permission);

        formData.groupName = permissionStore.permission.role_name;
        formData.groupStatus = permissionStore.permission.role_status;
        formData.permissions = permissionStore.permission.permissions.map(permission => ({
            category: permission.permission_category,
            name: permission.permission_name,
            mode: permission.mode,
            id: permission.permission_id
        }));
        formData.createdTime = permissionStore.permission.created_at;
        formData.groupMembers = permissionStore.permission.users.length ?? 0;

        //console.log(formData.permissions, permissions.value );
        permissions.value.forEach(permission => {
            const matchedPermission = formData.permissions.find(p => p.id === permission.id);
            if (!matchedPermission) {
                formData.permissions.push({
                    category: permission.category,
                    name: permission.name,
                    mode: '',
                    id: permission.id
                })
            } 
        });
        currentMode.value = 'view';
    }else{
        formData.permissions = permissions.value.map(permission => ({
            category: permission.category,
            name: permission.name,
            mode: '',
            id: permission.id
        }))
    }
}

// 手機版權限設定相關方法
const updatePermissionMode = (permissionId, mode) => {
  const permission = formData.permissions.find(p => p.id === permissionId)
  if (permission) {
    permission.mode = mode
  }
}

onMounted(async() => {
    // 添加視窗尺寸監聽器
    window.addEventListener('resize', handleResize)
    
    // 初始化權限設定頁面
    loading.initial = true
    try {
      await permissionStore.getPermissionCategories();
      permissions.value = permissionStore.permissionCategories;
      //console.log(permissions.value);
      await loadPermissionGroup();
      //console.log(formData);
    } catch (error) {
      //console.error('初始化失敗:', error)
    } finally {
      loading.initial = false
    }
})

// 清理函數
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

//console.log(formData);
//console.log(permissions);

</script>

<template>
  <div class="permission-settings">
    <!-- 全屏初始載入遮罩 -->
    <div v-if="loading.initial" class="loading-container">
      <div class="loading-spinner">⟳</div>
      <div class="loading-text">載入中...</div>
    </div>
    <!-- 主要內容 -->
    <template v-else>
      <!-- 左側表單區域 -->
      <div class="form-section" :class="{ 'loading-disabled': loading.save || loading.delete || loading.cancel }">
        <div class="form-header">
          <h2 class="form-title">
            {{ isCreateMode ? '新增權限群組' : (isEditMode ? '編輯權限群組' : '檢視權限群組') }}
          </h2>
        </div>

        <div class="form-content">
          <div class="form-group">
            <label class="form-label">群組名稱</label>
            <input 
              type="text" 
              v-model="formData.groupName"
              placeholder="請輸入群組名稱"
              class="form-input"
              :disabled="isViewMode || loading.save || loading.delete || loading.cancel"
            />
          </div>

          <div class="form-group">
            <label class="form-label">群組狀態</label>
            <select 
              v-model="formData.groupStatus" 
              :disabled="isViewMode || loading.save || loading.delete || loading.cancel" 
              class="form-select"
            >
              <option value="Open">啟用</option>
              <option value="Invalid">停用</option>
            </select>
          </div>
          
          <!-- 檢視模式下顯示額外資訊 -->
          <div v-if="!isCreateMode" class="form-group">
            <label class="form-label">群組人數</label>
            <div class="member-section">
                <div class="form-display">{{ formData.groupMembers }} 人</div>
                <button 
                  @click="selectMembers()"
                  class="btn btn-primary"
                  :disabled="loading.save || loading.delete || loading.cancel || !hasFullMemberPermission"
                >
                  選取成員
                </button>
            </div>
          </div>

          <div v-if="!isCreateMode" class="form-group">
            <label class="form-label">新增時間</label>
            <div class="form-display">{{ formatDateTime(formData.createdTime) }}</div>
          </div>
        </div>

        <div class="form-actions">
          <!-- 檢視模式 -->
          <template v-if="isViewMode">
            <button 
              v-if="hasFullPermission"
              class="btn btn-primary" 
              @click="handleEdit"
              :disabled="loading.save || loading.delete || loading.cancel"
            >
              編輯群組
            </button>
            <button 
              v-if="hasFullPermission"
              class="btn btn-danger" 
              @click="handleDelete"
              :disabled="loading.save || loading.delete || loading.cancel"
            >
              <span v-if="loading.delete" class="btn-loading">
                <div class="btn-spinner"></div>
                刪除中...
              </span>
              <span v-else>刪除群組</span>
            </button>
            <button 
              class="btn btn-secondary" 
              @click="handleReturn"
              :disabled="loading.save || loading.delete || loading.cancel"
            >
              返回
            </button>
          </template>
          <!-- 編輯/新增模式 -->
          <template v-else>
            <button 
              class="btn btn-primary" 
              @click="handleSave"
              :disabled="loading.save || loading.delete || loading.cancel"
            >
              <span v-if="loading.save" class="btn-loading">
                <div class="btn-spinner"></div>
                {{ isCreateMode ? '創建中...' : '更新中...' }}
              </span>
              <span v-else>儲存</span>
            </button>
            <button 
              class="btn btn-secondary" 
              @click="handleCancel"
              :disabled="loading.save || loading.delete || loading.cancel"
            >
              <span v-if="loading.cancel" class="btn-loading">
                <div class="btn-spinner"></div>
                載入中...
              </span>
              <span v-else>取消</span>
            </button>
          </template>
        </div>
      </div>

      <!-- 右側權限設定區域 -->
      <div class="permissions-section" :class="{ 'loading-disabled': loading.save || loading.delete || loading.cancel }">
        <!-- 頁面設定 -->
        <div class="page-size-control">
          <div class="control-header">
            <h3>權限設定</h3>
            <select 
              v-model="pageSize" 
              class="page-select"
              :disabled="loading.save || loading.delete || loading.cancel"
            >
              <option value="10">10筆/頁</option>
              <option value="20">20筆/頁</option>
              <option value="50">50筆/頁</option>
            </select>
          </div>
        </div>

        <!-- 權限表格 - 桌面版 -->
        <div class="permissions-table" v-if="!isMobile">
          <table class="table">
            <thead>
              <tr>
                <th class="header-main">主權限</th>
                <th class="header-sub">子權限</th>
                <th class="header-category">權限分類</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(permission, index) in paginatedPermissions" :key="index">
                <td class="main-permission">{{ permission.category }}</td>
                <td class="sub-permission">{{ permission.name }}</td>
                <td class="permission-category">
                  <select 
                    v-model="formData.permissions.find(p => p.id === permission.id).mode"
                    class="category-select"
                    :disabled="isViewMode || loading.save || loading.delete || loading.cancel || !hasFullPermission"
                  >
                    <option value="">無權限</option>
                    <option v-for="item in permission.mode" :value="item"> {{ permissionModes[item] ?? '無權限' }} </option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 權限卡片 - 手機版 -->
        <div class="permissions-cards" v-else>
          <div v-for="(permission, index) in paginatedPermissions" :key="index" class="permission-card">
            <div class="card-header">
              <div class="permission-info">
                <div class="main-permission">{{ permission.category }}</div>
                <div class="sub-permission">{{ permission.name }}</div>
              </div>
            </div>
            <div class="card-content">
              <div class="permission-control">
                <label class="control-label">權限分類</label>
                <select 
                  :value="formData.permissions.find(p => p.id === permission.id)?.mode || ''"
                  @change="updatePermissionMode(permission.id, $event.target.value)"
                  class="category-select-mobile"
                  :disabled="isViewMode || loading.save || loading.delete || loading.cancel || !hasFullPermission"
                >
                  <option value="">無權限</option>
                  <option v-for="item in permission.mode" :value="item"> {{ permissionModes[item] ?? '無權限' }} </option>
                </select>
              </div>
            </div>
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
              :disabled="currentPage === 1 || loading.save || loading.delete || loading.cancel"
              @click="goToPage(currentPage - 1)"
            >
              ‹
            </button>
            
            <button 
              v-for="page in visiblePages" 
              :key="page"
              :class="['page-btn', { active: page === currentPage }]"
              @click="goToPage(page)"
              :disabled="loading.save || loading.delete || loading.cancel"
            >
              {{ page }}
            </button>
            
            <span v-if="showEllipsis" class="ellipsis">...</span>
            
            <button 
              v-if="totalPages > 5"
              :class="['page-btn', { active: totalPages === currentPage }]"
              :disabled="loading.save || loading.delete || loading.cancel"
              @click="goToPage(totalPages)"
            >
              {{ totalPages }}
            </button>
            
            <button 
              class="page-btn" 
              :disabled="currentPage === totalPages || loading.save || loading.delete || loading.cancel"
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
.permission-settings {
  display: flex;
  gap: 30px;
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
  position: relative;
}

// Loading樣式
.loading-container {
  width: 100%;
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

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #6c5ce7;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  font-size: 16px;
  color: #666;
  font-weight: 500;
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

// 載入時禁用樣式
.loading-disabled {
  opacity: 0.7;
  pointer-events: none;
  transition: opacity 0.3s;
}

// 左側表單區域
.form-section {
  flex: 0 0 450px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  height: fit-content;
  overflow: hidden;

  .form-header {
    padding: 20px 25px;
    border-bottom: 1px solid #f0f0f0;
    background: #6c5ce7;

    .form-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: white;
    }
  }

  .form-content {
    padding: 25px;
  }

  .form-group {
    margin-bottom: 20px;

    .form-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: #333;
      font-size: 14px;
    }

    .form-input,
    .form-select {
      width: 100%;
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

      &:readonly,
      &:disabled {
        background-color: #f8f9fa;
        color: #6c757d;
        cursor: not-allowed;
      }
    }

    .form-input::placeholder {
      color: #999;
    }

    .form-display {
      padding: 12px 15px;
      background-color: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      color: #495057;
      font-size: 14px;
    }

    .member-section {
      display: flex;
      gap: 10px;
      align-items: center;

      .form-display {
        flex: 1;
        margin: 0;
      }

      .btn {
        flex: 0 0 auto;
        font-size: 13px;
        white-space: nowrap;
        border: none;
        border-radius: 6px;
        padding: 12px 20px;
        cursor: pointer;
        transition: all 0.3s;
        
        &.btn-primary {
          background: #6c5ce7;
          color: white;

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
  }

  .form-actions {
    display: flex;
    gap: 10px;
    padding: 20px 25px;
    background: #f8f9fa;
    border-top: 1px solid #f0f0f0;
    flex-wrap: wrap;

    .btn {
      flex: 1;
      min-width: 80px;
      padding: 12px 20px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s;

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

      &.btn-danger {
        background: #dc3545;
        color: white;

        &:hover:not(:disabled) {
          background: #c82333;
          transform: translateY(-1px);
        }
        
        &:disabled {
          background: #ccc;
        }
      }
    }
  }
}

// 右側權限設定區域
.permissions-section {
  flex: 1;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;

  .page-size-control {
    padding: 20px 25px;
    border-bottom: 1px solid #f0f0f0;
    background: #f8f9fa;

    .control-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #333;
      }

      .page-select {
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        background: white;
        
        &:disabled {
          background-color: #f8f9fa;
          color: #6c757d;
          cursor: not-allowed;
        }
      }
    }
  }

  .permissions-table {
    overflow-x: auto;

    .table {
      width: 100%;
      border-collapse: collapse;

      thead {
        tr {
          background: #6c5ce7;
          color: white;

          th {
            padding: 15px 20px;
            text-align: left;
            font-weight: 500;
            font-size: 14px;

            &.header-main {
              width: 25%;
            }

            &.header-sub {
              width: 45%;
            }

            &.header-category {
              width: 30%;
            }
          }
        }
      }

      tbody {
        tr {
          border-bottom: 1px solid #f0f0f0;
          transition: background-color 0.2s;

          &:hover {
            background: #f8f9fa;
          }

          td {
            padding: 15px 20px;
            font-size: 14px;
            color: #333;

            &.main-permission {
              font-weight: 500;
              color: #666;
            }

            &.sub-permission {
              color: #333;
            }

            &.permission-category {
              .category-select {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 13px;
                background: white;
                transition: border-color 0.3s;

                &:focus {
                  outline: none;
                  border-color: #6c5ce7;
                  box-shadow: 0 0 0 2px rgba(108, 92, 231, 0.1);
                }

                &:disabled {
                  background-color: #f8f9fa;
                  color: #6c757d;
                  cursor: not-allowed;
                }
              }
            }
          }
        }
      }
    }
  }

  // 手機版權限卡片
  .permissions-cards {
    padding: 20px;

    .permission-card {
      background: white;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      margin-bottom: 16px;
      overflow: hidden;
      transition: all 0.3s;

      &:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      &:last-child {
        margin-bottom: 0;
      }

      .card-header {
        background: #f8f9fa;
        padding: 16px;
        border-bottom: 1px solid #e9ecef;

        .permission-info {
          .main-permission {
            font-size: 14px;
            font-weight: 600;
            color: #6c5ce7;
            margin-bottom: 4px;
          }

          .sub-permission {
            font-size: 13px;
            color: #666;
            line-height: 1.4;
          }
        }
      }

      .card-content {
        padding: 16px;

        .permission-control {
          .control-label {
            display: block;
            margin-bottom: 8px;
            font-size: 13px;
            font-weight: 500;
            color: #333;
          }

          .category-select-mobile {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
            background: white;
            transition: border-color 0.3s;

            &:focus {
              outline: none;
              border-color: #6c5ce7;
              box-shadow: 0 0 0 2px rgba(108, 92, 231, 0.1);
            }

            &:disabled {
              background-color: #f8f9fa;
              color: #6c757d;
              cursor: not-allowed;
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
        }
      }

      .ellipsis {
        padding: 8px 4px;
        color: #666;
      }
    }
  }
}

/* ===== 響應式設計 ===== */

/* 大螢幕 (1400px+) */
@media (min-width: 1400px) {
  .permission-settings {
    padding: 24px;
    gap: 40px;
  }

  .form-section {
    flex: 0 0 500px;
  }
}

/* 平板橫向 (1025px - 1399px) */
@media (max-width: 1399px) and (min-width: 1025px) {
  .permission-settings {
    gap: 25px;
  }

  .form-section {
    flex: 0 0 420px;
  }

  .permissions-section .table {
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
  .permission-settings {
    flex-direction: column;
    gap: 20px;
    padding: 16px;
  }

  .form-section {
    flex: none;
    width: 100%;

    .form-actions {
      .btn {
        padding: 10px 16px;
        font-size: 13px;
      }
    }
  }

  .permissions-section {
    .page-size-control {
      padding: 16px 20px;

      .control-header {
        h3 {
          font-size: 15px;
        }

        .page-select {
          padding: 6px 10px;
          font-size: 13px;
        }
      }
    }

    .table {
      thead th {
        padding: 10px 12px;
        font-size: 12px;
      }

      tbody td {
        padding: 10px 12px;
        font-size: 12px;

        &.permission-category {
          .category-select {
            padding: 6px 10px;
            font-size: 12px;
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
}

/* 大手機 (576px - 767px) */
@media (max-width: 767px) {
  .permission-settings {
    flex-direction: column;
    gap: 16px;
    padding: 12px;
  }

  .form-section {
    flex: none;
    width: 100%;

    .form-header {
      padding: 16px 20px;

      .form-title {
        font-size: 16px;
      }
    }

    .form-content {
      padding: 20px;
    }

    .form-group {
      margin-bottom: 16px;

      .form-label {
        font-size: 13px;
      }

      .form-input,
      .form-select {
        padding: 10px 12px;
        font-size: 13px;
      }

      .form-display {
        padding: 10px 12px;
        font-size: 13px;
      }

      .member-section {
        flex-direction: column;
        gap: 8px;
        align-items: stretch;

        .form-display {
          flex: none;
          width: 100%;
        }

        .btn {
          width: 100%;
          padding: 10px 16px;
          font-size: 13px;
        }
      }
    }

    .form-actions {
      padding: 16px 20px;
      flex-direction: column;
      gap: 8px;

      .btn {
        flex: none;
        width: 100%;
        padding: 12px 16px;
        font-size: 14px;
      }
    }
  }

  .permissions-section {
    .page-size-control {
      padding: 12px 16px;

      .control-header {
        flex-direction: column;
        gap: 12px;
        align-items: flex-start;

        h3 {
          font-size: 15px;
        }

        .page-select {
          align-self: flex-start;
          padding: 8px 12px;
          font-size: 13px;
        }
      }
    }

    .permissions-cards {
      padding: 12px 16px;

      .permission-card {
        margin-bottom: 12px;

        .card-header {
          padding: 12px;

          .permission-info {
            .main-permission {
              font-size: 13px;
            }

            .sub-permission {
              font-size: 12px;
            }
          }
        }

        .card-content {
          padding: 12px;

          .permission-control {
            .control-label {
              font-size: 12px;
            }

            .category-select-mobile {
              padding: 8px 10px;
              font-size: 13px;
            }
          }
        }
      }
    }

    .pagination-section {
      padding: 12px 16px;
      flex-direction: column;
      gap: 12px;
      text-align: center;

      .pagination-info {
        font-size: 12px;
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
}

/* 小手機 (480px 以下) */
@media (max-width: 479px) {
  .permission-settings {
    padding: 8px;
    gap: 12px;
  }

  .form-section {
    .form-header {
      padding: 12px 16px;

      .form-title {
        font-size: 15px;
      }
    }

    .form-content {
      padding: 16px;
    }

    .form-group {
      margin-bottom: 14px;

      .form-label {
        font-size: 12px;
        margin-bottom: 6px;
      }

      .form-input,
      .form-select {
        padding: 8px 10px;
        font-size: 12px;
      }

      .form-display {
        padding: 8px 10px;
        font-size: 12px;
      }

      .member-section {
        gap: 6px;

        .btn {
          padding: 8px 12px;
          font-size: 12px;
        }
      }
    }

    .form-actions {
      padding: 12px 16px;
      gap: 6px;

      .btn {
        padding: 10px 12px;
        font-size: 13px;
      }
    }
  }

  .permissions-section {
    .page-size-control {
      padding: 10px 12px;

      .control-header {
        gap: 10px;

        h3 {
          font-size: 14px;
        }

        .page-select {
          padding: 6px 8px;
          font-size: 12px;
        }
      }
    }

    .permissions-cards {
      padding: 8px 12px;

      .permission-card {
        margin-bottom: 10px;

        .card-header {
          padding: 10px;

          .permission-info {
            .main-permission {
              font-size: 12px;
              margin-bottom: 3px;
            }

            .sub-permission {
              font-size: 11px;
            }
          }
        }

        .card-content {
          padding: 10px;

          .permission-control {
            .control-label {
              font-size: 11px;
              margin-bottom: 6px;
            }

            .category-select-mobile {
              padding: 6px 8px;
              font-size: 12px;
            }
          }
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
}

/* 超小螢幕 (360px 以下) */
@media (max-width: 359px) {
  .form-section {
    .form-actions {
      .btn {
        padding: 8px 10px;
        font-size: 12px;
      }
    }
  }

  .permissions-section {
    .page-size-control {
      .control-header {
        h3 {
          font-size: 13px;
        }
      }
    }

    .permissions-cards {
      .permission-card {
        .card-header {
          padding: 8px;

          .permission-info {
            .main-permission {
              font-size: 11px;
            }

            .sub-permission {
              font-size: 10px;
            }
          }
        }

        .card-content {
          padding: 8px;

          .permission-control {
            .control-label {
              font-size: 10px;
            }

            .category-select-mobile {
              padding: 5px 6px;
              font-size: 11px;
            }
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
}

// 特殊樣式優化
@media (max-width: 767px) {
  // 確保手機版權限卡片的選擇器有足夠的觸控區域
  .category-select-mobile {
    min-height: 44px; // 符合觸控標準
  }

  // 手機版按鈕載入狀態優化
  .btn-loading {
    justify-content: center;
  }
}

// 載入狀態在手機版的優化
@media (max-width: 479px) {
  .loading-container {
    .loading-spinner {
      font-size: 24px;
      margin-bottom: 12px;
    }

    .loading-text {
      font-size: 14px;
    }
  }
}
</style>
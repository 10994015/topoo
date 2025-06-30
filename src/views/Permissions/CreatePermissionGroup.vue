<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { usePermissionStore } from '@/stores/permission'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { PERMISSIONS, checkPermission } from '@/utils/permissions'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const permissionStore = usePermissionStore()
const hasFullPermission = computed(() => authStore.canModify(PERMISSIONS.PERMISSION_ROLE_MANAGEMENT));
console.log(PERMISSIONS.PERMISSION_ROLE_MEMBER_MANAGEMENT);

const hasFullMemberPermission = computed(() => authStore.canAccessPage(PERMISSIONS.PERMISSION_ROLE_MEMBER_MANAGEMENT));
console.log(hasFullMemberPermission.value);

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

// 方法
const handleSave = async () => {
  console.log('儲存設定:', formData)
  loading.save = true
  try {
    if (isCreateMode.value) {
      await permissionStore.createPermissionGroup(formData)
      console.log('創建成功')
      alert('創建成功！')
      router.push('/settings/permission-management') // 返回列表頁
    } else {
      await permissionStore.updatePermissionGroup(permissionId.value, formData)
      console.log(formData)
      alert('更新成功！')
      currentMode.value = 'view'
    }
  } catch (error) {
    console.error('儲存失敗:', error)
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
      await permissionStore.deletePermissionGroup(permissionId.value)
      console.log('刪除成功')
      alert('刪除成功！')
      router.push('/settings/permission-management') // 返回列表頁
    } catch (error) {
      console.error('刪除失敗:', error)
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
        console.log(permissionStore.permission);

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

        console.log(formData.permissions, permissions.value );
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

onMounted(async() => {
    // 初始化權限設定頁面
    loading.initial = true
    try {
      await permissionStore.getPermissionCategories();
      permissions.value = permissionStore.permissionCategories;
      console.log(permissions.value);
      await loadPermissionGroup();
      console.log(formData);
    } catch (error) {
      console.error('初始化失敗:', error)
    } finally {
      loading.initial = false
    }
})

console.log(formData);
console.log(permissions);

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
              <div class="form-display">{{ formData.groupMembers }}</div>
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
          <div class="form-display">{{ formData.createdTime }}</div>
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

        <!-- 權限表格 -->
        <div class="permissions-table">
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

        <!-- 分頁控制 -->
        <div class="pagination-section">
          <div class="pagination-info">
            顯示第 {{ startItem }} 到 {{ endItem }} 筆結果 共 {{ totalItems }} 項
          </div>
          
          <div class="pagination-controls">
            <button 
              class="page-btn" 
              :disabled="currentPage === 1 || loading.save || loading.delete || loading.cancel"
              @click="goToPage(currentPage - 1)"
            >
              ‹
            </button>
            
            <template v-for="page in visiblePages" :key="page">
              <button 
                v-if="page !== '...'"
                :class="['page-btn', { active: page === currentPage }]"
                @click="goToPage(page)"
                :disabled="loading.save || loading.delete || loading.cancel"
              >
                {{ page }}
              </button>
              <span v-else class="ellipsis">...</span>
            </template>
            
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
  padding: 25px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  height: fit-content;

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
        flex: 0 0 70%;
        margin: 0;
      }

      .btn {
        flex: 0 0 30%;
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
    margin-top: 30px;
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
}

// 響應式設計
@media (max-width: 1024px) {
  .permission-settings {
    flex-direction: column;
    gap: 20px;
  }

  .form-section {
    flex: none;
    width: 100%;
  }

  .form-actions {
    .btn {
      padding: 10px 16px;
      font-size: 13px;
    }
  }
}

@media (max-width: 768px) {
  .permission-settings {
    padding: 15px;
  }

  .form-section {
    padding: 20px;

    .form-actions {
      .btn {
        flex: none;
        width: 100%;
        margin-bottom: 10px;
      }
    }
  }

  .permissions-section {
    .page-size-control {
      padding: 15px 20px;
    }

    .table {
      thead th {
        padding: 12px 15px;
        font-size: 13px;
      }

      tbody td {
        padding: 12px 15px;
        font-size: 13px;

        &.permission-category {
          .category-select {
            padding: 6px 10px;
            font-size: 12px;
          }
        }
      }
    }

    .pagination-section {
      flex-direction: column;
      gap: 15px;
      text-align: center;
      padding: 15px 20px;
    }
  }
}
</style>
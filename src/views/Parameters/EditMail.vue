<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMailStore } from '@/stores/mail'
import { useAuthStore } from '@/stores/auth'
import { PERMISSIONS, checkPermission } from '@/utils/permissions'
import { formatDate, formatDateTime } from '@/utils/dateUtils'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const mailStore = useMailStore()
const hasFullPermission = computed(() => authStore.canModify(PERMISSIONS.MAIL_MANAGEMENT));

// 判斷是新增還是編輯模式
const isEditMode = computed(() => !!route.params.id)
const mailId = computed(() => route.params.id)

// 表單資料
const formData = reactive({
  email: '',
  password: '',
  smtpServer: '',
  smtpPort: ''
})

// 編輯模式下的信箱資料
const mailDetail = ref({
  email: '',
  smtpServer: '',
  smtpPort: ''
})

// 載入和測試狀態
const isLoading = ref(false)
const isTesting = ref(false)
const isSubmitting = ref(false)

// 測試結果
const testResult = ref(null)
const showTestResult = ref(false)

// 表單驗證錯誤
const formErrors = ref({})

// 分頁設定（用於右側列表）
const currentPage = ref(1)
const pageSize = ref(10)
const totalItems = ref(0)

// 信箱列表資料
const mailboxData = ref([])

// 計算屬性
const totalPages = computed(() => {
  return Math.ceil(totalItems.value / pageSize.value)
})

const startItem = computed(() => {
  return totalItems.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1
})

const endItem = computed(() => {
  const end = currentPage.value * pageSize.value
  return end > totalItems.value ? totalItems.value : end
})

// 表單驗證
const validateForm = () => {
  const errors = {}
  
  if (!formData.email) {
    errors.email = '請輸入信箱名稱'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = '請輸入有效的信箱格式'
  }
  
  if (!formData.password) {
    errors.password = '請輸入應用程式密碼'
  }
  
  if (!formData.smtpServer) {
    errors.smtpServer = '請輸入 SMTP Server'
  }
  
  if (!formData.smtpPort) {
    errors.smtpPort = '請輸入 SMTP Port'
  } else if (!/^\d+$/.test(formData.smtpPort)) {
    errors.smtpPort = 'SMTP Port 必須是數字'
  }
  
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

// 載入信箱列表
const loadMailList = async () => {
  try {
    const params = {
      pageSize: pageSize.value,
      page: currentPage.value,
      sortBy: sortConfig.value.field,
      sortOrder: sortConfig.value.order
    }
    
    const response = await mailStore.fetchMails(params)
    
    if (response && response.data) {
      mailboxData.value = response.data.data || []
      totalItems.value = response.data.total || 0
    }
  } catch (error) {
    console.error('載入信箱列表失敗:', error)
  }
}

// 分頁大小變更
const handlePageSizeChange = async () => {
  currentPage.value = 1
  console.log('分頁大小變更:', pageSize.value)
  await loadMailList()
}

// 排序功能
const handleSort = (field) => {
  if (sortConfig.value.field === field) {
    if (sortConfig.value.order === 'ASC') {
      sortConfig.value.order = 'DESC'
    } else if (sortConfig.value.order === 'DESC') {
      sortConfig.value.field = ''
      sortConfig.value.order = ''
    } else {
      sortConfig.value.order = 'ASC'
    }
  } else {
    sortConfig.value.field = field
    sortConfig.value.order = 'ASC'
  }
  
  loadMailList()
}

// 取得排序圖示
const getSortIcon = (field) => {
  if (sortConfig.value.field !== field) {
    return '⇅'
  }
  return sortConfig.value.order === 'ASC' ? '↑' : '↓'
}

// 取得排序類別
const getSortClass = (field) => {
  if (sortConfig.value.field === field) {
    return `sorted-${sortConfig.value.order.toLowerCase()}`
  }
  return ''
}

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

// 排序設定（用於右側列表）
const sortConfig = ref({
  field: 'created_at',
  order: 'DESC'
})

// 載入編輯資料
const loadEditData = async () => {
  if (!isEditMode.value) return
  
  try {
    isLoading.value = true
    await mailStore.getMailById(mailId.value)
    const data = mailStore.mail.data[0];
    console.log(data);
    
    if (data) {
      // 填充表單資料
      formData.email = data.email || ''
      formData.smtpServer = data.smtp_server || ''
      formData.smtpPort = data.smtp_port || ''
      // 密碼不回填，保持安全性
      formData.password = ''
      
      // 填充顯示資料
      mailDetail.value = {
        email: data.email || '',
        smtpServer: data.smtp_server || '',
        smtpPort: data.smtp_port || ''
      }
    }
    
    isLoading.value = false
  } catch (error) {
    console.error('載入編輯資料失敗:', error)
    isLoading.value = false
  }
}

// 測試信箱連接
const testConnection = async () => {
  if (!isEditMode.value) {
    alert('請先儲存信箱後再進行測試')
    return
  }
  
  try {
    isTesting.value = true
    showTestResult.value = false
    
    const result = await mailStore.testMailConnection(mailId.value)
    
    testResult.value = {
      success: result.statusCode === 202 || false,
      message: result.message || '測試完成'
    }
    
    showTestResult.value = true
    isTesting.value = false
  } catch (error) {
    console.error('測試連接失敗:', error)
    testResult.value = {
      success: false,
      message: error.response?.data?.message || '測試失敗，請檢查設定'
    }
    showTestResult.value = true
    isTesting.value = false
  }
}

// 儲存表單
const handleSave = async () => {
    if (!hasFullPermission.value) {
      alert('沒有權限儲存信箱')
      return
    }
  if (!validateForm()) {
    return
  }
  
  try {
    isSubmitting.value = true
    
    if (isEditMode.value) {
      // 編輯模式
      await mailStore.updateMail(mailId.value, formData)
      alert('更新成功')
      
      // 更新顯示資料
      mailDetail.value = {
        email: formData.email,
        smtpServer: formData.smtpServer,
        smtpPort: formData.smtpPort
      }
    } else {
      // 新增模式
      const result = await mailStore.createMail(formData)
      alert('新增成功')
      
      // 新增成功後跳轉到編輯模式
      if (result.data && result.data.id) {
        router.replace(`/mail/edit/${result.data.id}`)
      }
    }
    
    // 重新載入列表
    await loadMailList()
    isSubmitting.value = false
    
  } catch (error) {
    console.error('儲存失敗:', error)
    alert(error.response?.data?.message || '儲存失敗，請稍後再試')
    isSubmitting.value = false
  }
}

// 取消操作
const handleCancel = () => {
  router.push('/settings/parameter/mail-management')
}

// 刪除信箱
const deleteMail = async (item) => {
  if(!hasFullPermission.value){
    alert('沒有權限刪除信箱')
    return
  }
  if (confirm(`確定要刪除信箱 ${item.email} 嗎？`)) {
    try {
      await mailStore.deleteMail(item.id)
      alert('刪除成功')
      await loadMailList()
      
      // 如果刪除的是當前編輯的信箱，跳轉到列表頁
      if (isEditMode.value && item.id == mailId.value) {
        router.push('/settings/parameter/mail-management')
      }
    } catch (error) {
      console.error('刪除失敗:', error)
      alert('刪除失敗，請稍後再試')
    }
  }
}

// 跳轉到編輯頁面
const editMail = (item) => {
  if (item.id == mailId.value) {
    return // 已經在編輯這個信箱
  }
  router.push(`/settings/parameter/mail-management/edit/${item.id}`)
}

// 分頁跳轉
const goToPage = async (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    await loadMailList()
  }
}

// 監聽路由變化
watch(() => route.params.id, (newId) => {
  if (newId) {
    loadEditData()
  } else {
    // 重置表單
    Object.assign(formData, {
      email: '',
      password: '',
      smtpServer: '',
      smtpPort: ''
    })
    mailDetail.value = {
      email: '',
      smtpServer: '',
      smtpPort: ''
    }
    formErrors.value = {}
    testResult.value = null
    showTestResult.value = false
  }
}, { immediate: true })

// 組件掛載
onMounted(() => {
  loadMailList()
})
</script>

<template>
  <div class="mail-form-page">
    <div class="page-container">
      <!-- 左側表單區域 -->
      <div class="left-section">
        <!-- 新增模式的表單 -->
        <div v-if="!isEditMode && hasFullPermission" class="form-card">
          <h3 class="form-title">新增系統信箱</h3>
          
          <form @submit.prevent="handleSave" class="mail-form">
            <div class="form-group">
              <label for="email" class="form-label">信箱名稱</label>
              <input
                id="email"
                type="email"
                v-model="formData.email"
                class="form-input"
                :class="{ 'error': formErrors.email }"
                placeholder="請輸入信箱名稱"
              />
              <span v-if="formErrors.email" class="error-message">{{ formErrors.email }}</span>
            </div>

            <div class="form-group">
              <label for="password" class="form-label">應用程式密碼</label>
              <input
                id="password"
                type="password"
                v-model="formData.password"
                class="form-input"
                :class="{ 'error': formErrors.password }"
                placeholder="請輸入應用程式密碼"
              />
              <span v-if="formErrors.password" class="error-message">{{ formErrors.password }}</span>
            </div>

            <div class="form-group">
              <label for="smtpServer" class="form-label">SMTP Server</label>
              <input
                id="smtpServer"
                type="text"
                v-model="formData.smtpServer"
                class="form-input"
                :class="{ 'error': formErrors.smtpServer }"
                placeholder="請輸入 SMTP Server"
              />
              <span v-if="formErrors.smtpServer" class="error-message">{{ formErrors.smtpServer }}</span>
            </div>

            <div class="form-group">
              <label for="smtpPort" class="form-label">SMTP Port</label>
              <input
                id="smtpPort"
                type="text"
                v-model="formData.smtpPort"
                class="form-input"
                :class="{ 'error': formErrors.smtpPort }"
                placeholder="請輸入 SMTP Port"
              />
              <span v-if="formErrors.smtpPort" class="error-message">{{ formErrors.smtpPort }}</span>
            </div>

            <div class="form-actions">
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="isSubmitting"
              >
                {{ isSubmitting ? '儲存中...' : '儲存' }}
              </button>
              <button
                type="button"
                class="btn btn-secondary"
                @click="handleCancel"
                :disabled="isSubmitting"
              >
                取消
              </button>
            </div>
          </form>
        </div>

        <!-- 編輯模式的信箱資料顯示 -->
        <div v-else class="info-card">
          <h3 class="info-title">信箱資料</h3>
          
          <div v-if="isLoading" class="loading-state">
            <div class="loading-spinner">⟳</div>
            <div>載入中...</div>
          </div>
          
          <div v-else class="info-content">
            <div class="info-row">
              <span class="info-label">信箱名稱</span>
              <span class="info-value">{{ mailDetail.email || '未設定' }}</span>
            </div>
            
            <div class="info-row">
              <span class="info-label">信箱帳號</span>
              <span class="info-value">{{ mailDetail.email || '未設定' }}</span>
            </div>
            
            <div class="info-row">
              <span class="info-label">應用程式密碼</span>
              <span class="info-value">******************</span>
            </div>
            
            <div class="info-row">
              <span class="info-label">SMTP Server</span>
              <span class="info-value">{{ mailDetail.smtpServer || '未設定' }}</span>
            </div>
            
            <div class="info-row">
              <span class="info-label">SMTP Port</span>
              <span class="info-value">{{ mailDetail.smtpPort || '未設定' }}</span>
            </div>

            <div class="info-actions">
              <button
                class="btn btn-test"
                @click="testConnection"
                :disabled="isTesting"
              >
                {{ isTesting ? '測試中...' : '測試信箱' }}
              </button>
              <button
                class="btn btn-secondary"
                @click="handleCancel"
                style="margin-left: 10px"
              >
                返回
              </button>
            </div>

            <!-- 測試結果 -->
            <div v-if="showTestResult" class="test-result" :class="{ 'success': testResult.success, 'error': !testResult.success }">
              <div class="result-icon">
                {{ testResult.success ? '✅' : '❌' }}
              </div>
              <div class="result-message">
                {{ testResult.message }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右側信箱列表 -->
      <div class="right-section">
        <div class="list-card">
          <div class="list-header">
            <select v-model="pageSize" @change="handlePageSizeChange" class="page-size-select">
              <option value="10">10筆/頁</option>
              <option value="20">20筆/頁</option>
              <option value="50">50筆/頁</option>
            </select>
          </div>

          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="id-column">項次</th>
                  <th 
                    class="email-column sortable-header" 
                    :class="getSortClass('email')"
                    @click="handleSort('email')"
                  >
                    信箱帳號
                    <span class="sort-icon">{{ getSortIcon('email') }}</span>
                  </th>
                  <th 
                    class="time-column sortable-header" 
                    :class="getSortClass('updated_at')"
                    @click="handleSort('updated_at')"
                  >
                    更新時間
                    <span class="sort-icon">{{ getSortIcon('updated_at') }}</span>
                  </th>
                  <th class="action-column" v-if="hasFullPermission">刪除</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="(item, index) in mailboxData" 
                  :key="item.id" 
                  class="table-row"
                  :class="{ 'active': isEditMode && item.id == mailId }"
                  @click="editMail(item)"
                >
                  <td class="id-cell">{{ (currentPage - 1) * pageSize + index + 1 }}</td>
                  <td class="email-cell">{{ item.email }}</td>
                  <td class="time-cell">{{ formatDateTime(item.updated_at) || formatDateTime(item.created_at) }}</td>
                  <td class="action-cell" v-if="hasFullPermission">
                    <button 
                      class="delete-btn"
                      @click.stop="deleteMail(item)"
                      title="刪除"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
                
                <tr v-if="mailboxData.length === 0">
                  <td colspan="4" class="no-data">暫無資料</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 分頁控制 -->
          <div class="pagination-area">
            <div class="pagination-info">
              顯示第 {{ startItem }} 到 {{ endItem }} 筆結果 共 {{ totalItems }} 項
            </div>

            <div class="pagination-controls">
              <button 
                class="page-btn prev-btn" 
                :disabled="currentPage === 1"
                @click="goToPage(currentPage - 1)"
              >
                ‹
              </button>
              
              <template v-for="page in visiblePages" :key="page">
                <button 
                  v-if="page !== '...'"
                  :class="['page-btn', { active: page === currentPage }]"
                  @click="goToPage(page)"
                >
                  {{ page }}
                </button>
                <span v-else class="ellipsis">...</span>
              </template>
              
              <button 
                class="page-btn next-btn" 
                :disabled="currentPage === totalPages"
                @click="goToPage(currentPage + 1)"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.mail-form-page {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.page-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

// 左側區域
.left-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-card, .info-card {
  background: white;
  border-radius: 8px;
  padding: 25px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.form-title, .info-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #6c5ce7;
}

// 表單樣式
.mail-form {
  .form-group {
    margin-bottom: 20px;

    .form-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: #333;
      font-size: 14px;
    }

    .form-input {
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

      &.error {
        border-color: #dc3545;
      }

      &::placeholder {
        color: #999;
      }
    }

    .error-message {
      display: block;
      margin-top: 5px;
      font-size: 12px;
      color: #dc3545;
    }
  }
}

.form-actions {
  display: flex;
  gap: 15px;
  margin-top: 30px;
}

// 信箱資料顯示樣式
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
  color: #666;

  .loading-spinner {
    font-size: 24px;
    animation: spin 1s linear infinite;
    margin-bottom: 10px;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.info-content {
  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }

    .info-label {
      font-weight: 500;
      color: #666;
      flex-shrink: 0;
      width: 120px;
    }

    .info-value {
      color: #333;
      word-break: break-all;
    }
  }
}

.info-actions {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
}

.test-result {
  margin-top: 15px;
  padding: 15px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 10px;

  &.success {
    background: #d4edda;
    border: 1px solid #c3e6cb;
    color: #155724;
  }

  &.error {
    background: #f8d7da;
    border: 1px solid #f5c6cb;
    color: #721c24;
  }

  .result-icon {
    font-size: 18px;
  }

  .result-message {
    flex: 1;
    font-size: 14px;
  }
}

// 右側列表區域
.right-section {
  .list-card {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }
}

.list-header {
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;

  .page-size-select {
    padding: 8px 15px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    background: white;
  }
}

// 表格樣式
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

        &:first-child {
          width: 80px;
          text-align: center;
        }

        &:last-child {
          width: 80px;
          text-align: center;
        }
      }
    }

    tbody {
      .table-row {
        border-bottom: 1px solid #f0f0f0;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          background: #f8f9fa;
        }

        &.active {
          background: #e3f2fd;
          border-left: 4px solid #6c5ce7;
        }

        td {
          padding: 15px 20px;
          font-size: 14px;
          color: #333;

          &:first-child {
            text-align: center;
            font-weight: 500;
            color: #666;
          }

          &:last-child {
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
    .ellipsis {
      padding: 8px 4px;
      color: #666;
    }
  }
}

.delete-btn {
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
}

// 分頁樣式
.pagination-area {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-top: 1px solid #f0f0f0;

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
  }
}

// 按鈕樣式
.btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  border: none;

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
    }
  }

  &.btn-secondary {
    background: #f8f9fa;
    color: #666;
    border: 1px solid #ddd;

    &:hover:not(:disabled) {
      background: #e9ecef;
      border-color: #adb5bd;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  &.btn-test {
    background: #17a2b8;
    color: white;

    &:hover:not(:disabled) {
      background: #138496;
      transform: translateY(-1px);
    }

    &:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
  }
}

// 編輯表單特殊樣式
.edit-form {
  margin-top: 0;

  .form-title {
    border-bottom-color: #28a745;
  }
}

// 響應式設計
@media (max-width: 1200px) {
  .page-container {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .right-section {
    order: -1;
  }
}

@media (max-width: 768px) {
  .mail-form-page {
    padding: 15px;
  }

  .form-card, .info-card {
    padding: 20px;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }

  .data-table {
    th, td {
      padding: 10px 15px;
      font-size: 13px;
    }
  }

  .pagination-area {
    flex-direction: column;
    gap: 10px;
    text-align: center;
  }

  .info-row {
    flex-direction: column;
    gap: 5px;

    .info-label {
      width: auto;
      font-weight: 600;
    }
  }
}
</style>
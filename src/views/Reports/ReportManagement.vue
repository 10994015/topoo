<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useReportStore } from '@/stores/report'
import { useRepairStore } from '@/stores/repair'
import { useAuthStore } from '@/stores/auth'
import { checkPermission, PERMISSIONS } from '@/utils/permissions'

const reportStore = useReportStore()
const repairStore = useRepairStore()
const authStore = useAuthStore()

// 檢查各個報表的權限
//帳號查詢Excel下載
const hasDownloadAccountPermission = computed(() => authStore.canAccessPage(PERMISSIONS.ACCOUNT_EXCEL_DOWNLOAD))
//完修紀錄Excel下載
const hasDownloadRepairNoticePermission = computed(() => authStore.canAccessPage(PERMISSIONS.REPAIR_NOTICE_EXCEL_DOWNLOAD))
//報修進度綜合表查詢Excel下載
const hasDownloadRepairSummaryPermission = computed(() => authStore.canAccessPage(PERMISSIONS.REPAIR_PROGRESS_SUMMARY_EXCEL_DOWNLOAD))
//問卷滿意度報表下載 (假設權限名稱)
const hasDownloadSatisfactionSurveyPermission = computed(() => authStore.canAccessPage(PERMISSIONS.SURVEY_EXCEL_DOWNLOAD))

// 計算預設的 activeTab (按照指定的優先順序)
const getDefaultTab = () => {
  // 第一優先：報修進度綜合表
  if (hasDownloadRepairSummaryPermission.value) {
    return 'repair-progress'
  }
  // 第二優先：帳號管理報表
  else if (hasDownloadAccountPermission.value) {
    return 'account-management'
  }
  // 第三優先：完修記錄報表  
  else if (hasDownloadRepairNoticePermission.value) {
    return 'complete-repair'
  }
  // 第四優先：問卷滿意度報表
  else if (hasDownloadSatisfactionSurveyPermission.value) {
    return 'satisfaction-survey'
  }
  // 都沒有權限
  return null
}

// 當前活躍的報表類型 (不再預設為固定值)
const activeTab = ref('')

// 載入狀態
const isLoading = ref(true)

// 下拉選項數據
const categories = ref([])
const reasons = ref([])
const statuses = ref([])

// 計算允許的日期範圍（當前日期前後1年）
const minDate = computed(() => {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 1)
  return date.toISOString().split('T')[0]
})

const maxDate = computed(() => {
  const date = new Date()
  date.setFullYear(date.getFullYear() + 1)
  return date.toISOString().split('T')[0]
})

// 驗證日期是否在允許範圍內
const validateDateRange = (dateValue) => {
  if (!dateValue) return true
  
  const selectedDate = new Date(dateValue)
  const currentDate = new Date()
  const oneYearAgo = new Date()
  const oneYearLater = new Date()
  
  oneYearAgo.setFullYear(currentDate.getFullYear() - 1)
  oneYearLater.setFullYear(currentDate.getFullYear() + 1)
  
  return selectedDate >= oneYearAgo && selectedDate <= oneYearLater
}

// 帳號狀態選項
const accountStatuses = [
  { value: 'Open', label: '啟用' },
  { value: 'UnderReview', label: '審核中' },
  { value: 'ReviewFailed', label: '審核未通過' },
  { value: 'Invalid', label: '停用' },
  { value: 'Lock', label: '封鎖' },
  { value: 'Inconvenient', label: '不便' },
  { value: 'Leave', label: '請假' }
]

// 報修進度綜合表表單
const repairProgressForm = reactive({
  title: '',
  repairCategoryId: '',
  repairReasonId: '',
  repairStatusId: '',
  emergencyLevel: '',
  importanceLevel: '',
  startAt: '',
  endAt: '',
  repairUnit: '',
  assignUserName: '',
  overdueDays:''
})

// 帳號管理報表表單
const accountManagementForm = reactive({
  status: '',
  startAt: '',
  endAt: ''
})

// 完修記錄報表表單
const completeRepairForm = reactive({
  repairCategoryId: '',
  repairReasonId: '',
  startAt: '',
  endAt: ''
})

// 問卷滿意度報表表單
const satisfactionSurveyForm = reactive({
  assignUser: '',
  credential: '',
  unitName: '',
  assignUserName: '',
  startAt: '',
  endAt: ''
})

// 緊急程度和重要程度選項
const levelOptions = [
  { value: '1', label: '普級' },
  { value: '2', label: '中級' },
  { value: '3', label: '高級' }
]
const levelImportanceOptions = [
  { value: '1', label: '普級' },
  { value: '2', label: '保固級' },
  { value: '3', label: '急件' }
]

// 計算有權限的頁籤列表 (按照優先順序排列)
const validTabs = computed(() => {
  const tabs = []
  
  // 按照優先順序添加有權限的頁籤
  if (hasDownloadRepairSummaryPermission.value) {
    tabs.push('repair-progress')
  }
  if (hasDownloadAccountPermission.value) {
    tabs.push('account-management')
  }
  if (hasDownloadRepairNoticePermission.value) {
    tabs.push('complete-repair')
  }
  if (hasDownloadSatisfactionSurveyPermission.value) {
    tabs.push('satisfaction-survey')
  }
  
  return tabs
})

// 檢查用戶是否有任何報表權限
const hasAnyPermission = computed(() => {
  return hasDownloadRepairSummaryPermission.value || 
         hasDownloadAccountPermission.value || 
         hasDownloadRepairNoticePermission.value ||
         hasDownloadSatisfactionSurveyPermission.value
})

// 監聽權限變化，確保 activeTab 總是有效的
watch(validTabs, (newTabs) => {
  if (newTabs.length > 0 && !newTabs.includes(activeTab.value)) {
    // 如果當前選中的頁籤無效，則選擇第一個有權限的頁籤
    activeTab.value = newTabs[0]
  } else if (newTabs.length === 0) {
    // 如果沒有任何權限
    activeTab.value = null
  }
}, { immediate: true })

// 監聽報修進度綜合表的維修類別變化
watch(() => repairProgressForm.repairCategoryId, async (newCategoryId, oldCategoryId) => {
  if (newCategoryId !== oldCategoryId) {
    // 清空當前選擇的維修原因
    repairProgressForm.repairReasonId = ''
    
    // 如果選擇了類別，則獲取對應的維修原因
    if (newCategoryId) {
      try {
        await repairStore.fetchReasons(newCategoryId)
        reasons.value = repairStore.reasons.data || []
      } catch (error) {
        console.error('獲取維修原因失敗:', error)
        await repairStore.fetchReasons()
        reasons.value = repairStore.reasons.data || []
      }
    } else {
      
      await repairStore.fetchReasons()
      reasons.value = repairStore.reasons.data || []
    }
  }
})

// 監聽完修記錄報表的維修類別變化
watch(() => completeRepairForm.repairCategoryId, async (newCategoryId, oldCategoryId) => {
  if (newCategoryId !== oldCategoryId) {
    // 清空當前選擇的維修原因
    completeRepairForm.repairReasonId = ''
    
    // 如果選擇了類別，則獲取對應的維修原因
    if (newCategoryId) {
      try {
        await repairStore.fetchReasons(newCategoryId)
        reasons.value = repairStore.reasons.data || []
      } catch (error) {
        console.error('獲取維修原因失敗:', error)
        await repairStore.fetchReasons()
        reasons.value = repairStore.reasons.data || []
      }
    } else {
      await repairStore.fetchReasons()
      reasons.value = repairStore.reasons.data || []
    }
  }
})

// 監聽日期變化並驗證 - 報修進度綜合表
watch(() => repairProgressForm.startAt, (newValue) => {
  if (newValue && !validateDateRange(newValue)) {
    alert('報修時間不能選擇超過當前時間1年的日期')
    repairProgressForm.startAt = ''
  }
})

watch(() => repairProgressForm.endAt, (newValue) => {
  if (newValue && !validateDateRange(newValue)) {
    alert('報修時間不能選擇超過當前時間1年的日期')
    repairProgressForm.endAt = ''
  }
})

// 監聽日期變化並驗證 - 帳號管理報表
watch(() => accountManagementForm.startAt, (newValue) => {
  if (newValue && !validateDateRange(newValue)) {
    alert('帳號建立時間不能選擇超過當前時間1年的日期')
    accountManagementForm.startAt = ''
  }
})

watch(() => accountManagementForm.endAt, (newValue) => {
  if (newValue && !validateDateRange(newValue)) {
    alert('帳號建立時間不能選擇超過當前時間1年的日期')
    accountManagementForm.endAt = ''
  }
})

// 監聽日期變化並驗證 - 完修記錄報表
watch(() => completeRepairForm.startAt, (newValue) => {
  if (newValue && !validateDateRange(newValue)) {
    alert('完修記錄建立時間不能選擇超過當前時間1年的日期')
    completeRepairForm.startAt = ''
  }
})

watch(() => completeRepairForm.endAt, (newValue) => {
  if (newValue && !validateDateRange(newValue)) {
    alert('完修記錄建立時間不能選擇超過當前時間1年的日期')
    completeRepairForm.endAt = ''
  }
})

// 監聽日期變化並驗證 - 問卷滿意度報表
watch(() => satisfactionSurveyForm.startAt, (newValue) => {
  if (newValue && !validateDateRange(newValue)) {
    alert('問卷填寫時間不能選擇超過當前時間1年的日期')
    satisfactionSurveyForm.startAt = ''
  }
})

watch(() => satisfactionSurveyForm.endAt, (newValue) => {
  if (newValue && !validateDateRange(newValue)) {
    alert('問卷填寫時間不能選擇超過當前時間1年的日期')
    satisfactionSurveyForm.endAt = ''
  }
})

// 重置表單
const resetForm = async (formType) => {
  switch (formType) {
    case 'repair-progress':
      Object.keys(repairProgressForm).forEach(key => {
        repairProgressForm[key] = ''
      })
      break
    case 'account-management':
      Object.keys(accountManagementForm).forEach(key => {
        accountManagementForm[key] = ''
      })
      break
    case 'complete-repair':
      Object.keys(completeRepairForm).forEach(key => {
        completeRepairForm[key] = ''
      })
      break
    case 'satisfaction-survey':
      Object.keys(satisfactionSurveyForm).forEach(key => {
        satisfactionSurveyForm[key] = ''
      })
      break
  }
  
  // 重置時，重新獲取所有維修原因（不帶類別ID）
  try {
    await repairStore.fetchReasons()
    reasons.value = repairStore.reasons.data || []
  } catch (error) {
    console.error('重置時獲取維修原因失敗:', error)
    reasons.value = []
  }
}

// 下載報表
const downloadReport = async (reportType) => {
  try {
    let result
    
    switch (reportType) {
      case 'repair-progress':
        result = await reportStore.downloadRepairProgressSummary(repairProgressForm)
        break
      case 'account-management':
        result = await reportStore.downloadAccountManagement(accountManagementForm)
        break
      case 'complete-repair':
        result = await reportStore.downloadCompleteRepairRecord(completeRepairForm)
        break
      case 'satisfaction-survey':
        result = await reportStore.downloadSatisfactionSurvey(satisfactionSurveyForm)
        break
    }
    
    if (result && result.success) {
      alert(result.message)
    }
  } catch (error) {
    console.error('下載報表失敗:', error)
    // 顯示後端返回的錯誤訊息
    const errorMessage = error.message || '下載報表失敗，請稍後再試'
    alert(errorMessage)
  }
}

// 切換標籤
const switchTab = async (tabName) => {
  // 檢查是否有權限切換到該頁面
  const hasPermission = 
    (tabName === 'repair-progress' && hasDownloadRepairSummaryPermission.value) ||
    (tabName === 'account-management' && hasDownloadAccountPermission.value) ||
    (tabName === 'complete-repair' && hasDownloadRepairNoticePermission.value) ||
    (tabName === 'satisfaction-survey' && hasDownloadSatisfactionSurveyPermission.value)
  
  if (!hasPermission) {
    console.warn(`無權限訪問 ${tabName} 頁面`)
    return
  }
  
  activeTab.value = tabName
  
  // 切換標籤時重新獲取所有維修原因
  try {
    await repairStore.fetchReasons()
    reasons.value = repairStore.reasons.data || []
  } catch (error) {
    console.error('切換標籤時獲取維修原因失敗:', error)
    reasons.value = []
  }
}

// 初始化數據
onMounted(async () => {
  try {
    // 載入下拉選項數據
    await Promise.all([
      repairStore.fetchCategories(),
      repairStore.fetchReasons(), // 初始載入時獲取所有維修原因
      repairStore.fetchStatuses()
    ])
    
    categories.value = repairStore.categories?.data || []
    reasons.value = repairStore.reasons?.data || []
    statuses.value = repairStore.statuses?.data || []
    
    // 根據權限優先順序設定預設的 activeTab
    activeTab.value = getDefaultTab()
    
  } catch (error) {
    console.error('載入數據失敗:', error)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="report-management">
    <!-- 標籤導航 -->
    <section class="tab-navigation" v-if="hasAnyPermission">
      <div class="tab-container">
        <button 
          :class="['tab-btn', { active: activeTab === 'repair-progress' }]"
          @click="switchTab('repair-progress')"
          v-if="hasDownloadRepairSummaryPermission"
        >
          報修進度綜合報表
        </button>
        <button 
          :class="['tab-btn', { active: activeTab === 'account-management' }]"
          @click="switchTab('account-management')"
          v-if="hasDownloadAccountPermission"
        >
          帳號管理報表
        </button>
        <button 
          :class="['tab-btn', { active: activeTab === 'complete-repair' }]"
          @click="switchTab('complete-repair')"
          v-if="hasDownloadRepairNoticePermission"
        >
          完修記錄報表
        </button>
        <button 
          :class="['tab-btn', { active: activeTab === 'satisfaction-survey' }]"
          @click="switchTab('satisfaction-survey')"
          v-if="hasDownloadSatisfactionSurveyPermission"
        >
          問卷滿意度報表
        </button>
      </div>
    </section>

    <!-- 報修進度綜合報表 -->
    <section v-if="activeTab === 'repair-progress'" class="report-section">
      <div class="form-container">
        <div class="form-row">
          <div class="form-field">
            <input 
              type="text" 
              v-model="repairProgressForm.title"
              placeholder="輸入案件標題"
              class="form-input"
              :disabled="isLoading"
            />
          </div>
          
          <div class="form-field">
            <select v-model="repairProgressForm.repairCategoryId" class="form-select" :disabled="isLoading">
              <option value="">故障類別</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </div>
          
          <div class="form-field">
            <select v-model="repairProgressForm.repairReasonId" class="form-select" :disabled="isLoading">
              <option value="">故障原因</option>
              <option v-for="reason in reasons" :key="reason.id" :value="reason.id">
                {{ reason.name }}
              </option>
            </select>
          </div>
          
          <div class="form-field">
            <select v-model="repairProgressForm.repairStatusId" class="form-select" :disabled="isLoading">
              <option value="">處理狀態</option>
              <option v-for="status in statuses" :key="status.id" :value="status.id">
                {{ status.name }}
              </option>
            </select>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-field">
            <select v-model="repairProgressForm.importanceLevel" class="form-select" :disabled="isLoading">
              <option value="">重要程度</option>
              <option v-for="level in levelImportanceOptions" :key="level.value" :value="level.value">
                {{ level.label }}
              </option>
            </select>
          </div>
          
          <div class="form-field">
            <select v-model="repairProgressForm.emergencyLevel" class="form-select" :disabled="isLoading">
              <option value="">緊急程度</option>
              <option v-for="level in levelOptions" :key="level.value" :value="level.value">
                {{ level.label }}
              </option>
            </select>
          </div>
          
          <div class="form-field">
            <input 
              type="text" 
              v-model="repairProgressForm.repairUnit"
              placeholder="報修單位"
              class="form-input"
              :disabled="isLoading"
            />
          </div>
          
          <div class="form-field">
            <input 
              type="text" 
              v-model="repairProgressForm.assignUserName"
              placeholder="承辦人員姓名或帳號"
              class="form-input"
              :disabled="isLoading"
            />
          </div>
        </div>
        
        <div class="form-row">
          <div class="date-field">
            <label>報修時間</label>
            <input 
              type="date" 
              v-model="repairProgressForm.startAt"
              class="date-input"
              :min="minDate"
              :max="maxDate"
              :disabled="isLoading"
            />
            <span class="date-separator">-</span>
            <input 
              type="date" 
              v-model="repairProgressForm.endAt"
              class="date-input"
              :min="minDate"
              :max="maxDate"
              :disabled="isLoading"
            />
          </div>
          
          <div class="date-field">
            <label>案件逾期日</label>
            <input 
              min="0"
              v-model="repairProgressForm.overdueDays"
              placeholder="篩選條件為大於等於"
              type="number" 
              class="date-input"
              :disabled="isLoading"
            />
          </div>
        </div>
        
        <div class="form-actions">
          <button 
            class="download-btn"
            @click="downloadReport('repair-progress')"
            :disabled="isLoading || reportStore.isLoading"
          >
            <span v-if="reportStore.isLoading" class="loading-spinner">⟳</span>
            <span v-else>📥</span>
            下載
          </button>
          <button 
            class="reset-btn"
            @click="resetForm('repair-progress')"
            :disabled="isLoading"
          >
            重置
          </button>
        </div>
      </div>
    </section>

    <!-- 帳號管理報表 -->
    <section v-if="activeTab === 'account-management'" class="report-section">
      <div class="form-container">
        <div class="form-row">
          <div class="date-field">
            <label>帳號建立時間</label>
            <input 
              type="date" 
              v-model="accountManagementForm.startAt"
              class="date-input"
              :min="minDate"
              :max="maxDate"
              :disabled="isLoading"
            />
            <span class="date-separator">-</span>
            <input 
              type="date" 
              v-model="accountManagementForm.endAt"
              class="date-input"
              :min="minDate"
              :max="maxDate"
              :disabled="isLoading"
            />
          </div>
          
          <div class="form-field">
            <select v-model="accountManagementForm.status" class="form-select" :disabled="isLoading">
              <option value="">帳號狀態</option>
              <option v-for="status in accountStatuses" :key="status.value" :value="status.value">
                {{ status.label }}
              </option>
            </select>
          </div>
        </div>
        
        <div class="form-actions">
          <button 
            class="download-btn"
            @click="downloadReport('account-management')"
            :disabled="isLoading || reportStore.isLoading"
          >
            <span v-if="reportStore.isLoading" class="loading-spinner">⟳</span>
            <span v-else>📥</span>
            下載
          </button>
          <button 
            class="reset-btn"
            @click="resetForm('account-management')"
            :disabled="isLoading"
          >
            重置
          </button>
        </div>
      </div>
    </section>

    <!-- 完修記錄報表 -->
    <section v-if="activeTab === 'complete-repair'" class="report-section">
      <div class="form-container">
        <div class="form-row">
          <div class="date-field">
            <label>完修記錄建立時間</label>
            <input 
              type="date" 
              v-model="completeRepairForm.startAt"
              class="date-input"
              :min="minDate"
              :max="maxDate"
              :disabled="isLoading"
            />
            <span class="date-separator">-</span>
            <input 
              type="date" 
              v-model="completeRepairForm.endAt"
              class="date-input"
              :min="minDate"
              :max="maxDate"
              :disabled="isLoading"
            />
          </div>
          
          <div class="form-field">
            <select v-model="completeRepairForm.repairCategoryId" class="form-select" :disabled="isLoading">
              <option value="">故障類別</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </div>
          
          <div class="form-field">
            <select v-model="completeRepairForm.repairReasonId" class="form-select" :disabled="isLoading">
              <option value="">故障原因</option>
              <option v-for="reason in reasons" :key="reason.id" :value="reason.id">
                {{ reason.name }}
              </option>
            </select>
          </div>
        </div>
        
        <div class="form-actions">
          <button 
            class="download-btn"
            @click="downloadReport('complete-repair')"
            :disabled="isLoading || reportStore.isLoading"
          >
            <span v-if="reportStore.isLoading" class="loading-spinner">⟳</span>
            <span v-else>📥</span>
            下載
          </button>
          <button 
            class="reset-btn"
            @click="resetForm('complete-repair')"
            :disabled="isLoading"
          >
            重置
          </button>
        </div>
      </div>
    </section>

    <!-- 問卷滿意度報表 -->
    <section v-if="activeTab === 'satisfaction-survey'" class="report-section">
      <div class="form-container">
        <div class="form-row">
          <div class="form-field">
            <input 
              type="text" 
              v-model="satisfactionSurveyForm.credential"
              placeholder="請輸入填寫者帳號"
              class="form-input"
              :disabled="isLoading"
            />
          </div>
          
          <div class="form-field">
            <input 
              type="text" 
              v-model="satisfactionSurveyForm.unitName"
              placeholder="請輸入報修單位"
              class="form-input"
              :disabled="isLoading"
            />
          </div>
          
          <div class="form-field">
            <input 
              type="text" 
              v-model="satisfactionSurveyForm.assignUserName"
              placeholder="承辦人員"
              class="form-input"
              :disabled="isLoading"
            />
          </div>
        </div>
        
        <div class="form-row">
          <div class="date-field">
            <label>填寫時間</label>
            <input 
              type="date" 
              v-model="satisfactionSurveyForm.startAt"
              class="date-input"
              :min="minDate"
              :max="maxDate"
              :disabled="isLoading"
            />
            <span class="date-separator">-</span>
            <input 
              type="date" 
              v-model="satisfactionSurveyForm.endAt"
              class="date-input"
              :min="minDate"
              :max="maxDate"
              :disabled="isLoading"
            />
          </div>
        </div>
        
        <div class="form-actions">
          <button 
            class="download-btn"
            @click="downloadReport('satisfaction-survey')"
            :disabled="isLoading || reportStore.isLoading"
          >
            <span v-if="reportStore.isLoading" class="loading-spinner">⟳</span>
            <span v-else>📥</span>
            下載
          </button>
          <button 
            class="reset-btn"
            @click="resetForm('satisfaction-survey')"
            :disabled="isLoading"
          >
            重置
          </button>
        </div>
      </div>
    </section>

    <!-- 無權限提示 -->
    <section v-if="!hasAnyPermission" class="no-permission">
      <div class="no-permission-content">
        <div class="no-permission-icon">🔒</div>
        <h3>沒有報表查詢權限</h3>
        <p>請聯繫系統管理員申請相關權限</p>
      </div>
    </section>

    <!-- 有權限但沒有選中任何頁面的情況 -->
    <section v-else-if="!activeTab" class="loading-section">
      <div class="loading-content">
        <div class="loading-spinner">⟳</div>
        <p>載入中...</p>
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.report-management {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;

  // 平板尺寸調整
  @media (max-width: 1024px) {
    padding: 16px;
  }

  // 手機尺寸調整
  @media (max-width: 768px) {
    padding: 12px;
  }
}

// Loading 動畫
.loading-spinner {
  display: inline-block;
  animation: spin 1s linear infinite;
  margin-right: 8px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// 標籤導航
.tab-navigation {
  margin-bottom: 20px;

  @media (max-width: 768px) {
    margin-bottom: 16px;
  }

  .tab-container {
    display: flex;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    overflow: hidden;

    // 平板：保持水平佈局，但調整間距
    @media (max-width: 1024px) {
      border-radius: 6px;
    }

    // 手機：改為垂直佈局
    @media (max-width: 768px) {
      flex-direction: column;
      border-radius: 6px;
    }

    .tab-btn {
      flex: 1;
      padding: 15px 20px;
      border: none;
      background: #f8f9fa;
      color: #666;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s;
      border-bottom: 3px solid transparent;
      
      // 改善觸控體驗
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;

      // 平板調整
      @media (max-width: 1024px) {
        padding: 14px 18px;
        font-size: 13px;
      }

      // 手機調整
      @media (max-width: 768px) {
        padding: 16px 20px;
        font-size: 14px;
        border-bottom: 1px solid #e9ecef;
        border-left: 3px solid transparent;
        text-align: left;
        
        &:last-child {
          border-bottom: none;
        }
      }

      &:hover:not(.disabled) {
        background: #e9ecef;
        color: #333;

        // 手機上禁用hover效果
        @media (max-width: 768px) {
          background: #f8f9fa;
          color: #666;
        }
      }

      &.active {
        background: white;
        color: #6c5ce7;
        border-bottom-color: #6c5ce7;

        @media (max-width: 768px) {
          border-left-color: #6c5ce7;
          border-bottom-color: transparent;
        }
      }

      &.disabled {
        background: #e9ecef;
        color: #adb5bd;
        cursor: not-allowed;
        opacity: 0.6;
      }
    }
  }
}

// 報表區域 - 完全重新設計的響應式版本
.report-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 30px;

  // 平板尺寸 (768px - 1024px)
  @media (max-width: 1024px) and (min-width: 769px) {
    padding: 24px;
    border-radius: 6px;
  }

  // 手機尺寸 (480px - 768px)
  @media (max-width: 768px) and (min-width: 481px) {
    padding: 20px 16px;
    border-radius: 6px;
    margin: 0 -4px;
  }

  // 小手機尺寸 (≤480px)
  @media (max-width: 480px) {
    padding: 16px 12px;
    border-radius: 4px;
    margin: 0 -6px;
  }

  .form-container {
    .form-row {
      display: flex;
      gap: 20px;
      align-items: end;
      margin-bottom: 20px;

      // 1600px 以下 - 調整間距避免重疊
      @media (max-width: 1600px) and (min-width: 1025px) {
        gap: 16px;
        flex-wrap: wrap; // 允許換行
        align-items: stretch; // 改為拉伸對齊
        
        // 特別針對完修報表的佈局
        &:has(.date-field) {
          .form-field {
            flex: 1 1 auto;
            min-width: 180px;
            max-width: 220px;
          }
        }
      }

      // 平板：保持水平佈局，調整間距
      @media (max-width: 1024px) and (min-width: 769px) {
        gap: 16px;
        margin-bottom: 18px;
        flex-wrap: wrap; // 允許換行
        
        // 如果一行放不下，自動換行
        .form-field {
          min-width: 200px;
          flex: 1 1 calc(50% - 8px);
        }
      }

      // 手機：改為垂直佈局
      @media (max-width: 768px) {
        flex-direction: column;
        gap: 14px;
        align-items: stretch;
        margin-bottom: 16px;
      }

      // 小手機：進一步縮小間距
      @media (max-width: 480px) {
        gap: 12px;
        margin-bottom: 14px;
      }

      &:last-child {
        margin-bottom: 0;
      }
    }

    .form-field {
      flex: 1;
      min-width: 0;

      // 1600px 以下 - 防止與日期欄位重疊
      @media (max-width: 1600px) and (min-width: 1025px) {
        flex: 1 1 200px; // 最小寬度 200px，允許彈性縮放
        min-width: 200px;
        max-width: 250px; // 設置最大寬度避免過度拉伸
      }

      // 平板：確保合適的最小寬度
      @media (max-width: 1024px) and (min-width: 769px) {
        min-width: 180px;
      }

      // 手機：佔滿整個寬度
      @media (max-width: 768px) {
        width: 100%;
        min-width: 0;
      }

      .form-input,
      .form-select {
        width: 100%;
        padding: 12px 15px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        transition: border-color 0.3s, box-shadow 0.3s;
        background: white;
        box-sizing: border-box;
        
        // 移除預設樣式
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;

        // 平板調整
        @media (max-width: 1024px) and (min-width: 769px) {
          padding: 11px 14px;
          font-size: 14px;
          border-radius: 5px;
        }

        // 手機調整 - 增大觸控區域
        @media (max-width: 768px) and (min-width: 481px) {
          padding: 14px 16px;
          font-size: 16px; // 防止iOS縮放
          border-radius: 6px;
          min-height: 48px; // 確保觸控目標足夠大
          box-sizing: border-box;
        }

        // 小手機調整
        @media (max-width: 480px) {
          padding: 12px 14px;
          font-size: 16px;
          border-radius: 4px;
          min-height: 44px;
        }

        &:focus {
          outline: none;
          border-color: #6c5ce7;
          box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
        }

        &:disabled {
          background-color: #f8f9fa;
          color: #999;
          cursor: not-allowed;
          opacity: 0.7;
        }
      }

      // 下拉選單箭頭優化
      .form-select {
        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
        background-position: right 12px center;
        background-repeat: no-repeat;
        background-size: 16px;
        padding-right: 40px;

        @media (max-width: 768px) {
          background-position: right 16px center;
          background-size: 18px;
          padding-right: 48px;
        }

        @media (max-width: 480px) {
          background-size: 16px;
          padding-right: 44px;
        }
      }

      .form-input::placeholder {
        color: #999;
        opacity: 1;
      }
    }

    .date-field {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-width: 0;

      // 1600px 以下 - 防止重疊問題
      @media (max-width: 1600px) and (min-width: 1025px) {
        flex: 2; // 給日期欄位更多空間
        min-width: 350px;
        gap: 10px;
        
        .date-input {
          flex: 1 1 140px;
          min-width: 140px;
        }
      }

      // 平板：保持水平佈局，允許適度換行
      @media (max-width: 1024px) and (min-width: 769px) {
        gap: 10px;
        flex-wrap: wrap;
        min-width: 300px; // 確保日期欄位有足夠空間
        
        .date-input {
          flex: 1 1 120px;
          min-width: 120px;
        }
      }

      // 手機：改為垂直佈局
      @media (max-width: 768px) {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
        width: 100%;
      }

      // 小手機調整
      @media (max-width: 480px) {
        gap: 8px;
      }

      label {
        font-size: 14px;
        color: #333;
        white-space: nowrap;
        font-weight: 500;
        margin-bottom: 0;

        @media (max-width: 1024px) and (min-width: 769px) {
          font-size: 13px;
        }

        @media (max-width: 768px) {
          font-size: 14px;
          margin-bottom: 6px;
          align-self: flex-start;
        }
      }

      .date-input {
        padding: 12px 15px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        transition: border-color 0.3s, box-shadow 0.3s;
        flex: 1;
        min-width: 140px;
        box-sizing: border-box;

        // 平板調整
        @media (max-width: 1024px) and (min-width: 769px) {
          padding: 11px 14px;
          min-width: 120px;
          font-size: 13px;
        }

        // 手機調整
        @media (max-width: 768px) and (min-width: 481px) {
          padding: 14px 16px;
          font-size: 16px; // 防止iOS縮放
          border-radius: 6px;
          width: 100%;
          min-width: 0;
          min-height: 48px;
        }

        // 小手機調整
        @media (max-width: 480px) {
          padding: 12px 14px;
          font-size: 16px;
          min-height: 44px;
          border-radius: 4px;
        }

        &:focus {
          outline: none;
          border-color: #6c5ce7;
          box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
        }

        &:disabled {
          background-color: #f8f9fa;
          color: #999;
          cursor: not-allowed;
          opacity: 0.7;
        }
      }

      .date-separator {
        color: #666;
        font-weight: bold;
        font-size: 16px;
        user-select: none;

        @media (max-width: 1024px) and (min-width: 769px) {
          font-size: 14px;
        }

        @media (max-width: 768px) {
          align-self: center;
          margin: 2px 0;
          font-size: 14px;
        }
      }

      // 針對手機的日期範圍特殊佈局
      @media (max-width: 768px) {
        .date-range-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;

          .date-input {
            flex: 1;
          }

          .date-separator {
            margin: 0;
            flex-shrink: 0;
          }
        }
      }
    }

    .form-actions {
      margin-top: 30px;
      display: flex;
      gap: 15px;
      justify-content: flex-start;
      align-items: center;

      // 平板調整
      @media (max-width: 1024px) and (min-width: 769px) {
        margin-top: 24px;
        gap: 12px;
      }

      // 手機：改為垂直佈局
      @media (max-width: 768px) {
        margin-top: 24px;
        flex-direction: column;
        gap: 12px;
        align-items: stretch;
      }

      // 小手機調整
      @media (max-width: 480px) {
        margin-top: 20px;
        gap: 10px;
      }

      .download-btn {
        background: #6c5ce7;
        color: white;
        border: none;
        padding: 12px 30px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 44px;
        
        // 改善觸控體驗
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;

        // 平板調整
        @media (max-width: 1024px) and (min-width: 769px) {
          padding: 11px 24px;
          font-size: 13px;
          min-height: 42px;
        }

        // 手機調整
        @media (max-width: 768px) and (min-width: 481px) {
          padding: 16px 24px;
          font-size: 15px;
          width: 100%;
          min-height: 50px;
          border-radius: 6px;
        }

        // 小手機調整
        @media (max-width: 480px) {
          padding: 14px 20px;
          font-size: 14px;
          min-height: 46px;
          border-radius: 4px;
        }

        &:hover:not(:disabled) {
          background: #5b4bcf;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(108, 92, 231, 0.3);

          // 手機上使用不同的hover效果
          @media (max-width: 768px) {
            transform: none;
            box-shadow: none;
            background: #5b4bcf;
          }
        }

        &:active {
          transform: translateY(0);
          background: #4a3ba8;
        }

        &:disabled {
          background: #ccc;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .loading-spinner {
          animation: spin 1s linear infinite;
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
        transition: all 0.3s ease;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        
        // 改善觸控體驗
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;

        // 平板調整
        @media (max-width: 1024px) and (min-width: 769px) {
          padding: 11px 18px;
          font-size: 13px;
          min-height: 42px;
        }

        // 手機調整
        @media (max-width: 768px) and (min-width: 481px) {
          padding: 16px 24px;
          font-size: 15px;
          width: 100%;
          min-height: 50px;
          border-radius: 6px;
        }

        // 小手機調整
        @media (max-width: 480px) {
          padding: 14px 20px;
          font-size: 14px;
          min-height: 46px;
          border-radius: 4px;
        }

        &:hover:not(:disabled) {
          background: #f8f9fa;
          border-color: #6c5ce7;
          color: #6c5ce7;
          transform: translateY(-1px);

          @media (max-width: 768px) {
            transform: none;
            background: #f8f9fa;
          }
        }

        &:active {
          background: #e9ecef;
          transform: translateY(0);
        }

        &:disabled {
          background: #f8f9fa;
          color: #ccc;
          cursor: not-allowed;
          transform: none;
        }
      }
    }
  }
}

// 無權限提示
.no-permission {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  .no-permission-content {
    text-align: center;
    color: #666;

    .no-permission-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    h3 {
      margin: 0 0 8px;
      color: #333;
      font-size: 18px;
    }

    p {
      margin: 0;
      font-size: 14px;
    }
  }
}

.loading-section {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  .loading-content {
    text-align: center;
    color: #666;

    .loading-spinner {
      font-size: 24px;
      margin-bottom: 12px;
      display: inline-block;
      animation: spin 1s linear infinite;
    }

    p {
      margin: 0;
      font-size: 14px;
    }
  }
}

// 針對特定螢幕比例的優化
@media (min-width: 769px) and (max-width: 1024px) and (orientation: landscape) {
  .report-section .form-container {
    .form-row {
      gap: 14px;
      
      .form-field {
        min-width: 160px;
        flex: 1 1 calc(33.333% - 10px);
      }
    }
    
    .form-field .form-input,
    .form-field .form-select,
    .date-field .date-input {
      padding: 10px 14px;
      font-size: 13px;
    }
  }
}

// 針對 iPhone SE 等超小螢幕的特殊處理
@media (max-width: 375px) {
  .report-section {
    padding: 12px 8px;
    margin: 0 -4px;

    .form-container {
      .form-field .form-input,
      .form-field .form-select,
      .date-field .date-input {
        padding: 12px;
        font-size: 16px;
        min-height: 42px;
      }

      .form-actions {
        .download-btn,
        .reset-btn {
          padding: 12px 16px;
          min-height: 44px;
          font-size: 14px;
        }
      }
    }
  }
}

// 特殊的響應式調整
@media (max-width: 480px) {
  .report-management {
    padding: 8px;
  }

  .tab-navigation {
    margin-bottom: 12px;
  }
}

// 橫向模式的平板調整
@media (min-width: 769px) and (max-width: 1024px) and (orientation: landscape) {
  .form-row {
    gap: 16px;
  }
  
  .form-field .form-input,
  .form-field .form-select,
  .date-field .date-input {
    padding: 10px 14px;
  }
}

// 針對日期欄位的特殊處理（手機版本）
@media (max-width: 768px) {
  .report-section .form-container .date-field {
    // 創建一個包裝器來處理兩個日期輸入框的佈局
    &.has-range {
      .date-inputs {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 6px;

        .date-input {
          flex: 1;
        }

        .date-separator {
          flex-shrink: 0;
          margin: 0;
        }
      }
    }
  }
}

// 提升可訪問性
.report-section {
  .form-field,
  .date-field {
    label {
      // 確保標籤與輸入框的關聯性
      @media (max-width: 768px) {
        display: block;
        margin-bottom: 6px;
        font-weight: 500;
        color: #333;
      }
    }
  }

  // 改善焦點指示器
  input:focus,
  select:focus {
    outline: 2px solid #6c5ce7;
    outline-offset: 2px;
    
    @media (max-width: 768px) {
      outline-width: 3px;
    }
  }
}

// 確保在所有裝置上的滾動順暢
.report-section * {
  -webkit-overflow-scrolling: touch;
}

// 防止在 iOS 上的縮放
@media (max-width: 768px) {
  .report-section {
    input[type="text"],
    input[type="number"],
    input[type="date"],
    select {
      font-size: 16px !important;
      transform: translateZ(0); // 啟用硬體加速
    }
  }
}

// 確保在所有裝置上的滾動順暢
* {
  -webkit-overflow-scrolling: touch;
}
</style>
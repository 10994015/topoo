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
const hasDownloadAccountPermission = computed(() => authStore.canAccessPage(PERMISSIONS.ACCOUNT_EXCEL_DOWNLOAD))
const hasDownloadRepairNoticePermission = computed(() => authStore.canAccessPage(PERMISSIONS.REPAIR_NOTICE_EXCEL_DOWNLOAD))
const hasDownloadRepairSummaryPermission = computed(() => authStore.canAccessPage(PERMISSIONS.REPAIR_PROGRESS_SUMMARY_EXCEL_DOWNLOAD))

// 當前活躍的報表類型
const activeTab = ref('repair-progress')

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

// 監聽日期變化並驗證
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
    <section class="tab-navigation">
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
              <option value="">報修類別</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </div>
          
          <div class="form-field">
            <select v-model="completeRepairForm.repairReasonId" class="form-select" :disabled="isLoading">
              <option value="">報修原因</option>
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
  </div>
</template>

<style lang="scss" scoped>
.report-management {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
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

  .tab-container {
    display: flex;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    overflow: hidden;

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

      &:hover:not(.disabled) {
        background: #e9ecef;
        color: #333;
      }

      &.active {
        background: white;
        color: #6c5ce7;
        border-bottom-color: #6c5ce7;
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

// 報表區域
.report-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 30px;

  .form-container {
    .form-row {
      display: flex;
      gap: 20px;
      align-items: end;
      margin-bottom: 20px;

      &:last-child {
        margin-bottom: 0;
      }
    }

    .form-field {
      flex: 1;

      .form-input,
      .form-select {
        width: 100%;
        padding: 12px 15px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        transition: border-color 0.3s;
        background: white;

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

      .form-input::placeholder {
        color: #999;
      }
    }

    .date-field {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;

      label {
        font-size: 14px;
        color: #333;
        white-space: nowrap;
        font-weight: 500;
      }

      .date-input {
        padding: 12px 15px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        transition: border-color 0.3s;
        flex: 1;

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

    .form-actions {
      margin-top: 30px;
      display: flex;
      gap: 15px;
      justify-content: flex-start;

      .download-btn {
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
}

// 響應式設計
@media (max-width: 768px) {
  .tab-container {
    flex-direction: column;

    .tab-btn {
      border-bottom: 1px solid #e9ecef;
      border-radius: 0;

      &:last-child {
        border-bottom: none;
      }
    }
  }

  .form-row {
    flex-direction: column;
    gap: 15px;

    .form-field,
    .date-field {
      width: 100%;
    }
  }

  .date-field {
    flex-direction: column;
    align-items: flex-start;

    label {
      margin-bottom: 8px;
    }

    .date-input {
      width: 100%;
    }

    .date-separator {
      align-self: center;
      margin: 5px 0;
    }
  }

  .form-actions {
    flex-direction: column;
    gap: 10px;

    .download-btn,
    .reset-btn {
      width: 100%;
      justify-content: center;
    }
  }
}
</style>
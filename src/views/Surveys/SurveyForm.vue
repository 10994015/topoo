<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useSurveyStore } from '@/stores/survey' // 引入 survey store
import { mdiMagnify } from '@mdi/js'

// Store
const surveyStore = useSurveyStore()

// 響應式數據
const searchKeyword = ref('')
const selectedTicketId = ref(null)
const isDragging = ref(false)
const currentDragQuestionId = ref(null)
const isInitialLoading = ref(true) // 新增：初始載入狀態
const isSearching = ref(false) // 新增：搜尋狀態

// 表單數據
const formData = reactive({})
const errors = reactive({})

// 頂部圖片
const headerImage = ref('/images/survey-bg.jpg')

// 從 API 獲取的問卷題目
const surveyQuestions = computed(() => {
  const questionsResponse = surveyStore.surveyQuestionsList
  // 處理 API 返回的數據結構：{ data: Array(9) }
  const questions = questionsResponse?.data || questionsResponse
  return Array.isArray(questions) ? questions : []
})

// 計算屬性
const filteredTickets = computed(() => {
  console.log(surveyStore.surveys);
  
  const allSurveys = surveyStore.surveys?.data || []
  
  if (!searchKeyword.value || searchKeyword.value.trim() === '') {
    return allSurveys
  }
  
  return allSurveys.filter(survey => 
    survey.title && survey.title.toLowerCase().includes(searchKeyword.value.toLowerCase())
  )
})


const selectedTicket = computed(() => {
  if (!selectedTicketId.value) return null
  
  // 使用 filteredTickets 來查找選中的問卷
  return filteredTickets.value.find(ticket => {
    const ticketId = ticket.repairId || ticket.id
    return ticketId === selectedTicketId.value
  })
})


const isLoading = computed(() => surveyStore.isLoading)
const isSubmitting = computed(() => surveyStore.isSubmitting)


// 方法
const selectTicket = async (ticket) => {
  console.log('選擇的問卷:', ticket)
  console.log('當前 surveys 數據:', surveyStore.surveys)
  console.log('filteredTickets:', filteredTickets.value)

  
  const ticketId = ticket.repairId || ticket.id
  selectedTicketId.value = ticketId
  
  // 清空表單數據和錯誤
  Object.keys(formData).forEach(key => delete formData[key])
  Object.keys(errors).forEach(key => delete errors[key])
  
  try {
    // 選擇案件後載入對應的問卷題目
    console.log('載入問卷題目列表...')
    await surveyStore.fetchSurveyQuestionsList()
    console.log('問卷題目載入完成:', surveyStore.surveyQuestionsList)
    
    // 初始化表單數據 - 確保 surveyQuestions 是數組
    if (Array.isArray(surveyQuestions.value) && surveyQuestions.value.length > 0) {
      surveyQuestions.value.forEach(question => {
        if (question && question.id) {
          if (question.type === 'SingleChoice') {
            formData[question.id] = 0
          } else if (question.type === 'MultipleChoice') {
            formData[question.id] = []
          } else if (question.type === 'ShortAnswer') {
            formData[question.id] = ''
          }
        }
      })
    }
  } catch (error) {
    console.error('載入問卷題目失敗:', error)
    alert('載入問卷題目失敗，請重試')
  }
}

const handleSearch = async () => {
  try {
    isSearching.value = true
    await surveyStore.fetchSurveys(searchKeyword.value)
  } catch (error) {
    console.error('搜尋失敗:', error)
    alert('搜尋失敗，請稍後重試')
  } finally {
    isSearching.value = false
  }
}

const getQuestionTypeLabel = (type) => {
  const typeMap = {
    'SingleChoice': '(評分題)',
    'MultipleChoice': '(複選題)',
    'ShortAnswer': '(簡答題)'
  }
  return typeMap[type] || ''
}

// 滿意度評分相關方法
const getRatingProgress = (questionId) => {
  const question = surveyQuestions.value.find(q => q.id === questionId)
  if (!question || question.type !== 'SingleChoice') return 0
  
  const value = formData[questionId] || 0
  const maxValue = question.maxValue || 5
  return (value / maxValue) * 100
}

const handleProgressClick = (event, questionId) => {
  const question = surveyQuestions.value.find(q => q.id === questionId)
  if (!question || question.type !== 'SingleChoice') return
  
  const rect = event.currentTarget.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const percentage = (clickX / rect.width) * 100
  const maxValue = question.maxValue || 5
  const score = Math.round((percentage / 100) * maxValue)
  
  formData[questionId] = Math.max(0, Math.min(maxValue, score))
  errors[questionId] = ''
}

const handleMouseDown = (event, questionId) => {
  isDragging.value = true
  currentDragQuestionId.value = questionId
  handleProgressClick(event, questionId)
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

const handleMouseMove = (event) => {
  if (!isDragging.value || !currentDragQuestionId.value) return
  
  const progressBar = event.target.closest('.progress-bar')
  if (!progressBar) return
  
  const question = surveyQuestions.value.find(q => q.id === currentDragQuestionId.value)
  if (!question) return
  
  const rect = progressBar.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const percentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100))
  const maxValue = question.maxValue || 5
  const score = Math.round((percentage / 100) * maxValue)
  
  formData[currentDragQuestionId.value] = score
}

const handleMouseUp = () => {
  isDragging.value = false
  currentDragQuestionId.value = null
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}

// 複選題相關方法 - 修正為使用索引
const isOptionSelected = (questionId, optionIndex) => {
  const selectedOptions = formData[questionId] || []
  return selectedOptions.includes(optionIndex)
}

const toggleOption = (questionId, optionIndex) => {
  if (!formData[questionId]) {
    formData[questionId] = []
  }
  
  const selectedOptions = formData[questionId]
  const index = selectedOptions.indexOf(optionIndex)
  
  if (index > -1) {
    selectedOptions.splice(index, 1)
  } else {
    selectedOptions.push(optionIndex)
  }
  
  errors[questionId] = ''
}

// 簡答題相關方法
const getCharCount = (questionId) => {
  const value = formData[questionId] || ''
  return value.length
}

const isOverLimit = (questionId, maxLength = 200) => {
  const value = formData[questionId] || ''
  return value.length > maxLength
}

const updateCharCount = (questionId) => {
  const question = surveyQuestions.value.find(q => q.id === questionId)
  if (!question) return
  
  const maxLength = question.maxLength || 200
  const value = formData[questionId] || ''
  
  if (value.length > maxLength) {
    errors[questionId] = `意見回饋不能超過 ${maxLength} 字`
  } else {
    errors[questionId] = ''
  }
}

// 表單驗證
const hasError = (questionId) => {
  return !!errors[questionId]
}

const validateForm = () => {
  // 清空之前的錯誤
  Object.keys(errors).forEach(key => {
    errors[key] = ''
  })

  let isValid = true

  // 確保 surveyQuestions 是數組
  if (Array.isArray(surveyQuestions.value)) {
    surveyQuestions.value.forEach(question => {
      if (!question || !question.id) return
      if (!question.required) return

      const value = formData[question.id]

      if (question.type === 'SingleChoice') {
        if (!value || value === 0) {
          errors[question.id] = '請選擇滿意度評分'
          isValid = false
        }
      } else if (question.type === 'MultipleChoice') {
        if (!value || value.length === 0) {
          errors[question.id] = '請至少選擇一個選項'
          isValid = false
        }
      } else if (question.type === 'ShortAnswer') {
        if (!value || value.trim() === '') {
          errors[question.id] = '此欄位為必填'
          isValid = false
        }
      }

      // 檢查字數限制
      if (question.type === 'ShortAnswer') {
        const textValue = value || ''
        if (textValue.length > 200) {
          errors[question.id] = '不能超過 200 字'
          isValid = false
        }
      }
    })
  }

  return isValid
}

// 提交表單
const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }

  try {
    // 準備提交的資料，按照API要求的格式
    const questionsResponse = []

    // 將 formData 轉換為API要求的格式
    surveyQuestions.value.forEach(question => {
      if (!question || !question.id) return

      const questionResponse = {
        questionId: question.id,
        type: question.type,
        sequence: question.sequence || 0,
        required: question.required || false,
        content: question.content,
        options: []
      }

      // 根據不同題型處理回答，包含所有選項及其選中狀態
      if (question.type === 'SingleChoice') {
        // 評分題：根據最大值生成所有可能的選項
        const maxValue = question.maxValue || 5
        const selectedScore = formData[question.id] || 0
        
        // 生成從1到maxValue的所有選項
        for (let i = 1; i <= maxValue; i++) {
          questionResponse.options.push({
            content: i.toString(),
            selected: i === selectedScore
          })
        }
      } else if (question.type === 'MultipleChoice') {
        // 複選題：包含所有選項及其選中狀態
        const selectedIndices = formData[question.id] || []
        
        if (question.options && question.options.length > 0) {
          question.options.forEach((optionContent, index) => {
            questionResponse.options.push({
              content: optionContent,
              selected: selectedIndices.includes(index)
            })
          })
        }
      } else if (question.type === 'ShortAnswer') {
        // 簡答題：將文字內容作為選項
        const textAnswer = formData[question.id] || ''
        questionResponse.options.push({
          content: textAnswer,
          selected: textAnswer.trim() !== ''
        })
      }

      questionsResponse.push(questionResponse)
    })

    const submitData = {
      repairId: selectedTicketId.value,
      questionsResponse: questionsResponse
    }

    console.log('提交問卷資料:', submitData)
    console.log('詳細的問卷回答:', JSON.stringify(submitData, null, 2))

    // 呼叫 store 的提交方法
    const result = await surveyStore.submitSurveyResponse(submitData)
    
    // 檢查提交結果
    if (result.success !== false) {
      alert('問卷提交成功！感謝您的回饋。')
      
      // 清空表單數據
      Object.keys(formData).forEach(key => delete formData[key])
      Object.keys(errors).forEach(key => delete errors[key])
      
      // 重新載入左側問卷列表，移除已填寫的問卷
      await surveyStore.fetchSurveys(searchKeyword.value)
      
      // 檢查是否還有其他問卷可以填寫
      if (filteredTickets.value.length > 0) {
        // 自動選擇第一個可用的問卷
        await selectTicket(filteredTickets.value[0])
      } else {
        // 沒有更多問卷時，清空選擇狀態
        selectedTicketId.value = null
      }
    } else {
      // 處理失敗情況
      const errorMessage = result.message || '提交失敗，請稍後重試'
      alert(errorMessage)
    }

  } catch (error) {
    console.error('提交失敗:', error)
    
    // 更詳細的錯誤處理
    let errorMessage = '提交失敗，請稍後重試'
    
    if (error.response) {
      const status = error.response.status
      const errorData = error.response.data
      
      switch (status) {
        case 400:
          errorMessage = errorData.message || '提交的資料格式錯誤'
          break
        case 401:
          errorMessage = '未授權，請重新登入'
          break
        case 403:
          errorMessage = '沒有權限提交此問卷'
          break
        case 404:
          errorMessage = '找不到指定的問卷或案件'
          break
        case 422:
          errorMessage = errorData.message || '資料驗證失敗，請檢查填寫內容'
          break
        case 500:
          errorMessage = '服務器錯誤，請稍後再試'
          break
        default:
          errorMessage = errorData.message || `提交失敗 (${status})`
      }
    } else if (error.request) {
      errorMessage = '網路連接錯誤，請檢查網路連接'
    } else {
      errorMessage = error.message || '提交過程中發生未知錯誤'
    }
    
    alert(errorMessage)
  }
}



// 生命週期
onMounted(async () => {
  try {
    console.log('開始載入資料...')
    
    // 初始載入問卷列表
    console.log('載入問卷列表...')
    await surveyStore.fetchSurveys()
    console.log('問卷列表載入完成:', surveyStore.surveys)
    
    // 自動選擇第一個需要填寫問卷的案件
    if (filteredTickets.value.length > 0) {
      console.log('自動選擇第一個案件')
      await selectTicket(filteredTickets.value[0])
    }
    
    // 完成初始載入
    isInitialLoading.value = false
  } catch (error) {
    console.error('載入資料失敗:', error)
    console.error('錯誤詳情:', error.response?.data || error.message)
    isInitialLoading.value = false
    alert('載入資料失敗，請重新整理頁面')
  }
})

onUnmounted(() => {
  // 清理拖拽事件監聽器
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
})
</script>

<template>
  <div class="survey-page">
    <!-- 左側邊欄 -->
    <div class="sidebar">
      <div class="search-box">
        <input 
          type="text" 
          placeholder="輸入案件標題搜尋問卷" 
          class="search-input"
          v-model="searchKeyword"
          @keyup.enter="handleSearch"
          :disabled="isInitialLoading || isSearching"
        >
        <button class="search-btn" @click="handleSearch" :disabled="isInitialLoading || isSearching">
          <span v-if="isSearching">⟳</span>
          <svg v-else width="16" height="16" viewBox="0 0 24 24">
            <path :d="mdiMagnify" fill="currentColor"></path>
          </svg>
        </button>
      </div>
      
      <div class="sidebar-content">
        <!-- Loading 狀態 - 只在初始載入或搜尋時顯示 -->
        <div v-if="isInitialLoading || isSearching" class="loading-container">
          <div class="loading-spinner">⟳</div>
          <div class="loading-text">載入中...</div>
        </div>
        
        <!-- 問卷列表 -->
        <div 
          v-else
          v-for="ticket in filteredTickets" 
          :key="ticket.repairId || ticket.id"
          class="sidebar-item"
          :class="{ active: selectedTicketId === (ticket.repairId || ticket.id) }"
          @click="selectTicket(ticket)"
        >
          {{ ticket.title }}
        </div>
        
        <!-- 無資料提示 -->
        <div v-if="!isInitialLoading && !isSearching && filteredTickets.length === 0" class="no-data">
          <p>暫無可填寫的問卷</p>
          <small>請確認是否有已完成的報修案件需要填寫滿意度問卷</small>
        </div>
      </div>
    </div>

    <!-- 主要內容 -->
    <div class="main-content">
      <!-- Loading 狀態 - 優先顯示 -->
      <div v-if="isInitialLoading || isLoading" class="loading-container">
        <div class="loading-spinner large">⟳</div>
        <div class="loading-text">載入問卷資料中...</div>
      </div>
      
      <!-- 問卷表單 - 有選中案件且有問卷題目時顯示 -->
      <div v-else-if="selectedTicket && surveyQuestions.length > 0" class="survey-form">
        <!-- 頂部圖片區域 -->
        <div class="survey-image">
          <img 
            :src="headerImage" 
            alt="報修服務問卷"
            class="survey-header-image"
          >
          <!-- 圖片上的標題覆蓋層 -->
          <div class="image-overlay">
            <h1 class="survey-title">報修服務滿意度問卷</h1>
            <h2 class="survey-subtitle">{{ selectedTicket.title }}</h2>
          </div>
        </div>

        <!-- 問卷內容 -->
        <div class="survey-content">
          <!-- 動態渲染問題 -->
          <div 
            v-for="(question, index) in surveyQuestions" 
            :key="question.id"
            class="question-group"
          >
            <div class="question-header">
              <span class="question-number">{{ index + 1 }}.</span>
              <span class="question-text">{{ question.content }}</span>
              <span class="question-type">{{ getQuestionTypeLabel(question.type) }}</span>
              <span v-if="question.required" class="required-tag">必須填寫</span>
              <span 
                v-if="question.type === 'ShortAnswer'" 
                class="char-limit"
              >
                字數限制 200
              </span>
            </div>
            
            <!-- 滿意度評分 (bar) - 修改後的版本 -->
            <div v-if="question.type === 'SingleChoice'" class="satisfaction-container">
              <div class="satisfaction-labels">
                <span class="label-left">{{ question.minLabel || '不滿意' }}</span>
                <span class="label-right">{{ question.maxLabel || '滿意' }}</span>
              </div>
              
              <!-- 分數顯示區域 -->
              <div class="score-display">
                <div 
                  class="score-value"
                  :style="{ left: getRatingProgress(question.id) + '%' }"
                  v-show="formData[question.id] > 0"
                >
                  {{ formData[question.id] || 0 }}
                </div>
              </div>
              
              <div class="progress-container">
                <div 
                  class="progress-bar"
                  @click="handleProgressClick($event, question.id)"
                  @mousedown="handleMouseDown($event, question.id)"
                >
                  <div 
                    class="progress-fill"
                    :style="{ width: getRatingProgress(question.id) + '%' }"
                  ></div>
                  <div 
                    class="progress-handle"
                    :style="{ left: getRatingProgress(question.id) + '%' }"
                    v-show="formData[question.id] > 0"
                  ></div>
                </div>
                <div class="progress-labels">
                  <span>0</span>
                  <span>{{ question.maxValue || 5 }}</span>
                </div>
              </div>
            </div>

            <!-- 複選題 -->
            <div v-if="question.type === 'MultipleChoice'" class="options-container">
              <!-- 將選項分組，每行兩個 -->
              <div 
                v-for="rowIndex in Math.ceil(question.options.length / 2)"
                :key="`row-${rowIndex}`"
                class="option-row"
              >
                <!-- 第一個選項 -->
                <div 
                  v-if="question.options[(rowIndex - 1) * 2]"
                  class="option-item"
                  :class="{ selected: isOptionSelected(question.id, (rowIndex - 1) * 2) }"
                  @click="toggleOption(question.id, (rowIndex - 1) * 2)"
                >
                  <div class="option-circle">
                    {{ isOptionSelected(question.id, (rowIndex - 1) * 2) ? '●' : '○' }}
                  </div>
                  <span>{{ question.options[(rowIndex - 1) * 2] }}</span>
                </div>
                
                <!-- 第二個選項（如果存在） -->
                <div 
                  v-if="question.options[(rowIndex - 1) * 2 + 1]"
                  class="option-item"
                  :class="{ selected: isOptionSelected(question.id, (rowIndex - 1) * 2 + 1) }"
                  @click="toggleOption(question.id, (rowIndex - 1) * 2 + 1)"
                >
                  <div class="option-circle">
                    {{ isOptionSelected(question.id, (rowIndex - 1) * 2 + 1) ? '●' : '○' }}
                  </div>
                  <span>{{ question.options[(rowIndex - 1) * 2 + 1] }}</span>
                </div>
              </div>
            </div>

            <!-- 簡答題 -->
            <div v-if="question.type === 'ShortAnswer'" class="textarea-container">
              <textarea
                v-model="formData[question.id]"
                placeholder="請輸入文字"
                class="form-textarea"
                :class="{ 
                  error: hasError(question.id), 
                  'over-limit': isOverLimit(question.id, 200) 
                }"
                :rows="question.rows || 6"
                :maxlength="250"
                @input="updateCharCount(question.id)"
                :disabled="isSubmitting"
              ></textarea>
            </div>
            
            <!-- 錯誤訊息 -->
            <span 
              v-if="errors[question.id]" 
              class="error-message"
            >
              {{ errors[question.id] }}
            </span>
          </div>

          <!-- 提交按鈕 -->
          <div class="form-actions">
            <button 
              type="button"
              class="submit-btn"
              :disabled="isSubmitting"
              @click="handleSubmit"
            >
              <span v-if="isSubmitting">提交中...</span>
              <span v-else>提交問卷</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 未選擇案件或無問卷題目時的提示 -->
      <div v-else-if="!isInitialLoading && filteredTickets.length === 0" class="no-selection">
        <h3>暫無可填寫的問卷</h3>
        <p>請確認是否有已完成的報修案件需要填寫滿意度問卷</p>
      </div>
      
      <!-- 有案件但無問卷題目時的提示 -->
      <div v-else-if="!isInitialLoading && filteredTickets.length > 0 && surveyQuestions.length === 0" class="no-selection">
        <h3>該案件暫無問卷題目</h3>
        <p>請聯繫管理員設定問卷題目</p>
      </div>
      
      <!-- 其他情況的默認提示 -->
      <div v-else-if="!isInitialLoading" class="no-selection">
        <h3>請從左側選擇一個報修案件以填寫問卷</h3>
        <p>目前暫無可填寫的問卷，或請嘗試搜尋特定案件</p>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
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

.survey-page {
  display: flex;
  min-height: 100vh;
  background: #f5f5f5;
}

// 左側邊欄
.sidebar {
  width: 280px;
  background: white;
  border-right: 1px solid #e0e0e0;
  padding: 20px;
  
  .search-box {
    position: relative;
    margin-bottom: 20px;
    
    .search-input {
      width: 100%;
      padding: 10px 40px 10px 15px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      
      &::placeholder {
        color: #999;
      }
      
      &:disabled {
        background-color: #f8f9fa;
        color: #999;
        cursor: not-allowed;
      }
    }
    
    .search-btn {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      
      &:disabled {
        cursor: not-allowed;
        opacity: 0.5;
      }
    }
  }
  
  .sidebar-content {
    .sidebar-item {
      padding: 12px 15px;
      margin-bottom: 8px;
      border-radius: 6px;
      font-size: 14px;
      line-height: 1.4;
      cursor: pointer;
      transition: all 0.3s;
      
      &:hover {
        background: #f8f9fa;
      }
      
      &.active {
        background: #E3E2FF;
        color: #5F25DC;
        font-weight: 700;
      }
    }
    
    .no-data {
      text-align: center;
      padding: 20px;
      color: #666;
      
      p {
        margin: 0 0 8px 0;
        font-size: 14px;
      }
      
      small {
        font-size: 12px;
        opacity: 0.8;
      }
    }
  }
}

// 主要內容區域
.main-content {
  flex: 1;
  padding: 40px;
  overflow-y: auto;
}

.no-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
  text-align: center;
  
  h3 {
    color: #666;
    margin-bottom: 10px;
  }
  
  p {
    color: #999;
    font-size: 14px;
  }
}

// 問卷表單
.survey-form {
  background: white;
  border-radius: 12px;
  padding: 0;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  
  // 頂部圖片區域
  .survey-image {
    position: relative;
    width: 100%;
    height: 300px;
    overflow: hidden;
    
    .survey-header-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    
    // 圖片覆蓋層
    .image-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
      padding: 40px 40px 30px;
      color: white;
      
      .survey-title {
        font-size: 28px;
        font-weight: 600;
        margin: 0 0 8px 0;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }
      
      .survey-subtitle {
        font-size: 18px;
        font-weight: 400;
        margin: 0;
        opacity: 0.9;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      }
    }
  }
  
  // 問卷內容區域
  .survey-content {
    padding: 40px;
  }
  
  .question-group {
    margin-bottom: 40px;
    
    &:last-of-type {
      margin-bottom: 0;
    }
    
    .question-header {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 20px;
      flex-wrap: wrap;
      
      .question-number {
        color: #333;
        font-weight: 600;
        font-size: 16px;
        flex-shrink: 0;
      }
      
      .question-text {
        color: #333;
        font-size: 16px;
        line-height: 1.5;
        flex: 1;
      }
      
      .question-type {
        color: #666;
        font-size: 14px;
        flex-shrink: 0;
      }
      
      .required-tag {
        background: #3383A8;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        flex-shrink: 0;
      }
      
      .char-limit {
        color: #666;
        font-size: 12px;
        margin-left: auto;
        flex-shrink: 0;
      }
    }
  }
}

// 滿意度評分樣式
.satisfaction-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  
  .satisfaction-labels {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    color: #666;
    margin-bottom: 8px;
  }
  
  // 分數顯示區域
  .score-display {
    position: relative;
    height: 30px; // 為分數顯示預留空間
    margin-bottom: 8px;
    
    .score-value {
      position: absolute;
      top: 0;
      transform: translateX(-50%);
      background: #6F91DF;
      color: white;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      min-width: 30px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(111, 145, 223, 0.3);
      transition: left 0.2s ease;
      
      // 添加小箭頭指向進度條
      &::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 6px solid #6F91DF;
      }
    }
  }
  
  .progress-container {
    .progress-bar {
      position: relative;
      width: 100%;
      height: 8px;
      background: #e9ecef;
      border-radius: 4px;
      cursor: pointer;
      margin-bottom: 8px;
      
      .progress-fill {
        height: 100%;
        background: #6F91DF;
        border-radius: 4px;
        transition: width 0.2s ease;
      }
      
      .progress-handle {
        position: absolute;
        top: 50%;
        transform: translateY(-50%) translateX(-50%);
        width: 20px;
        height: 20px;
        background: white;
        border: 3px solid #6F91DF;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        transition: left 0.2s ease;
        
        // 鼠標懸停時的效果
        &:hover {
          transform: translateY(-50%) translateX(-50%) scale(1.1);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }
      }
    }
    
    .progress-labels {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #666;
    }
  }
}

// 選項容器
.options-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  
  .option-row {
    display: flex;
    gap: 16px;
    
    .option-item {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 20px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s;
      background: white;
      
      &:hover {
        border-color: #6F91DF;
        background: #f8f7ff;
      }
      
      &.selected {
        background: #6F91DF;
        border-color: #6F91DF;
        color: white;
      }
      
      .option-circle {
        font-size: 16px;
        color: #6F91DF;
        font-weight: bold;
      }
      
      &.selected .option-circle {
        color: white;
      }
      
      span {
        font-size: 14px;
        font-weight: 500;
      }
    }
  }
}

// 文字輸入區域
.textarea-container {
  .form-textarea {
    width: 100%;
    padding: 16px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
    transition: all 0.3s;
    
    &:focus {
      outline: none;
      border-color: #6F91DF;
      box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
    }
    
    &.error {
      border-color: #e74c3c;
      box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
    }
    
    &.over-limit {
      border-color: #e74c3c;
      box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
    }
    
    &::placeholder {
      color: #999;
    }
    
    &:disabled {
      background-color: #f8f9fa;
      color: #999;
      cursor: not-allowed;
    }
  }
}

// 錯誤訊息
.error-message {
  color: #e74c3c;
  font-size: 12px;
  margin-top: 8px;
  display: block;
}

// 表單操作按鈕
.form-actions {
  display: flex;
  justify-content: center;
  margin-top: 40px;
  
  .submit-btn {
    background: #476DF6;
    color: white;
    border: none;
    padding: 12px 60px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    
    &:hover:not(:disabled) {
      background: #3f5be1;
      transition: .2s ease;
    }
    
    &:disabled {
      background: #bbb;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
  }
}

/* ===== 響應式設計 ===== */

@media (max-width: 991px) {
  .survey-page {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .main-content {
    padding: 20px;
  }
  
  .survey-image {
    height: 250px !important;
    
    .image-overlay {
      padding: 30px 30px 25px !important;
      
      .survey-title {
        font-size: 24px !important;
      }
      
      .survey-subtitle {
        font-size: 16px !important;
      }
    }
  }
  
  .survey-content {
    padding: 30px !important;
  }
}

@media (max-width: 767px) {
  .main-content {
    padding: 16px;
  }
  
  .survey-image {
    height: 200px !important;
    
    .image-overlay {
      padding: 20px 20px 15px !important;
      
      .survey-title {
        font-size: 20px !important;
      }
      
      .survey-subtitle {
        font-size: 14px !important;
      }
    }
  }
  
  .survey-content {
    padding: 24px !important;
  }
  
  .options-container .option-row {
    flex-direction: column;
    
    .option-item {
      width: 100%;
    }
  }
  
  .question-header {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 8px !important;
  }

  .satisfaction-container {
    .score-display {
      height: 25px;
      
      .score-value {
        padding: 4px 10px;
        font-size: 13px;
        
        &::after {
          border-left-width: 5px;
          border-right-width: 5px;
          border-top-width: 5px;
        }
      }
    }
    
    .progress-container .progress-bar .progress-handle {
      width: 18px;
      height: 18px;
      border-width: 2px;
    }
  }
}

@media (max-width: 479px) {
  .sidebar {
    padding: 16px;
  }
  
  .main-content {
    padding: 12px;
  }
  
  .survey-content {
    padding: 20px !important;
  }
  
  .survey-image {
    height: 180px !important;
    
    .image-overlay {
      padding: 15px !important;
      
      .survey-title {
        font-size: 18px !important;
      }
      
      .survey-subtitle {
        font-size: 13px !important;
      }
    }
  }
  
  .form-actions .submit-btn {
    width: 100%;
    padding: 14px;
  }
}
</style>
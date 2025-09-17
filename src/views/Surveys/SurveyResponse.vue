<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSurveyStore } from '@/stores/survey'
import { formatDateTime } from '@/utils/dateUtils'
import { mdiArrowLeft, mdiAccount, mdiOfficeBuilding, mdiCalendarClock } from '@mdi/js'

const route = useRoute()
const router = useRouter()
const surveyStore = useSurveyStore()

// 響應式數據
const responseDetail = ref(null)
const isLoading = ref(true)
const loadError = ref(null)

// 頂部圖片
const headerImage = ref('/images/survey-bg.jpg')

// 計算屬性
const surveyQuestions = computed(() => {
  if (!responseDetail.value?.surveyQuestion) return []
  return responseDetail.value.surveyQuestion || []
})

const responseInfo = computed(() => {
  if (!responseDetail.value) return {}
  return {
    repairTitle: responseDetail.value.repairTitle || '',
    name: responseDetail.value.name || '',
    repairUnit: responseDetail.value.repairUnit || '',
    created_at: responseDetail.value.created_at || ''
  }
})

// 方法
const getQuestionTypeLabel = (type) => {
  const typeMap = {
    'SingleChoice': '(單選題)',
    'MultipleChoice': '(複選題)',
    'ShortAnswer': '(簡答題)'
  }
  return typeMap[type] || ''
}

// 獲取滿意度評分的進度條寬度
const getRatingProgress = (question) => {
  if (question.type !== 'SingleChoice') return 0
  
  const selectedOption = question.options?.find(opt => opt.selected === 1)
  if (!selectedOption) return 0
  
  const score = parseInt(selectedOption.option_content) || 0
  const maxValue = 5 // 預設最大值為 5
  return (score / maxValue) * 100
}

// 獲取評分分數
const getRatingScore = (question) => {
  if (question.type !== 'SingleChoice') return 0
  
  const selectedOption = question.options?.find(opt => opt.selected === 1)
  return selectedOption ? parseInt(selectedOption.option_content) || 0 : 0
}

// 獲取複選題的選中選項
const getSelectedOptions = (question) => {
  if (question.type !== 'MultipleChoice') return []
  
  return question.options?.filter(opt => opt.selected === 1).map(opt => opt.option_content) || []
}

// 獲取簡答題的回答內容
const getTextAnswer = (question) => {
  if (question.type !== 'ShortAnswer') return ''
  
  const selectedOption = question.options?.find(opt => opt.selected === 1)
  return selectedOption ? selectedOption.option_content : ''
}

// 返回列表頁面
const goBack = () => {
  router.push('/settings/survey-management')
}

// 載入問卷回覆詳情
const loadResponseDetail = async () => {
  try {
    isLoading.value = true
    loadError.value = null
    
    const responseId = route.params.id
    console.log('載入問卷回覆詳情，ID:', responseId)
    
    const result = await surveyStore.fetchSurveyResponseDetail(responseId)
    
    if (result.success) {
      responseDetail.value = result.data
      console.log('問卷回覆詳情載入成功:', responseDetail.value)
      console.log('surveyQuestion 數據:', responseDetail.value?.surveyQuestion)
      console.log('問題數量:', responseDetail.value?.surveyQuestion?.length)
      
      // 檢查每個問題的結構
      if (responseDetail.value?.surveyQuestion) {
        responseDetail.value.surveyQuestion.forEach((question, index) => {
          console.log(`問題 ${index + 1}:`, question)
          console.log(`問題 ${index + 1} 選項:`, question.options)
        })
      }
    } else {
      loadError.value = result.message || '載入失敗'
      console.error('載入問卷回覆詳情失敗:', result.message)
    }
  } catch (error) {
    console.error('載入問卷回覆詳情時發生錯誤:', error)
    loadError.value = '載入過程中發生錯誤，請稍後重試'
  } finally {
    isLoading.value = false
  }
}

// 生命週期
onMounted(() => {
  loadResponseDetail()
})
</script>

<template>
  <div class="survey-page">
    <!-- 主要內容 -->
    <div class="main-content">
      <!-- Loading 狀態 - 優先顯示 -->
      <div v-if="isLoading" class="loading-container">
        <div class="loading-spinner large">⟳</div>
        <div class="loading-text">載入問卷詳情中...</div>
      </div>

      <!-- 錯誤狀態 -->
      <div v-else-if="loadError" class="no-selection">
        <h3>載入失敗</h3>
        <p>{{ loadError }}</p>
        <button class="retry-btn" @click="loadResponseDetail">重新載入</button>
      </div>

      <!-- 問卷表單 - 有選中案件且有問卷題目時顯示 -->
      <div v-else-if="responseDetail && surveyQuestions.length > 0" class="survey-form">
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
            <h2 class="survey-subtitle">{{ responseInfo.repairTitle }}</h2>
            <div class="response-status">
              <span class="status-badge completed">已完成</span>
            </div>
          </div>
        </div>

        <!-- 問卷基本資訊 -->
        <div class="response-info">
          <div class="info-grid">
            <div class="info-item">
              <svg width="16" height="16" viewBox="0 0 24 24" class="info-icon">
                <path :d="mdiAccount" fill="currentColor"></path>
              </svg>
              <span class="info-label">填寫人：</span>
              <span class="info-value">{{ responseInfo.name }}</span>
            </div>
            <div class="info-item">
              <svg width="16" height="16" viewBox="0 0 24 24" class="info-icon">
                <path :d="mdiOfficeBuilding" fill="currentColor"></path>
              </svg>
              <span class="info-label">報修單位：</span>
              <span class="info-value">{{ responseInfo.repairUnit }}</span>
            </div>
            <div class="info-item">
              <svg width="16" height="16" viewBox="0 0 24 24" class="info-icon">
                <path :d="mdiCalendarClock" fill="currentColor"></path>
              </svg>
              <span class="info-label">填寫時間：</span>
              <span class="info-value">{{ formatDateTime(responseInfo.created_at) }}</span>
            </div>
          </div>
        </div>

        <!-- 問卷內容 -->
        <div class="survey-content">
          <!-- 動態渲染問題 -->
          <div 
            v-for="(question, index) in surveyQuestions" 
            :key="question.id"
            class="question-group readonly"
          >
            <div class="question-header">
              <span class="question-number">{{ index + 1 }}.</span>
              <span class="question-text">{{ question.content }}</span>
              <span class="question-type">{{ getQuestionTypeLabel(question.type) }}</span>
              <span v-if="question.required" class="required-tag">必填</span>
            </div>
            
            <!-- 滿意度評分顯示 -->
            <div v-if="question.type === 'SingleChoice'" class="satisfaction-container readonly">
              <div class="satisfaction-labels">
                <span class="label-left">不滿意</span>
                <span class="label-right">滿意</span>
              </div>
              
              <!-- 分數顯示區域 -->
              <div class="score-display">
                <div 
                  class="score-value active"
                  :style="{ left: getRatingProgress(question) + '%' }"
                  v-show="getRatingScore(question) > 0"
                >
                  {{ getRatingScore(question) }}
                </div>
              </div>
              
              <div class="progress-container">
                <div class="progress-bar readonly">
                  <div 
                    class="progress-fill"
                    :style="{ width: getRatingProgress(question) + '%' }"
                  ></div>
                  <div 
                    class="progress-handle"
                    :style="{ left: getRatingProgress(question) + '%' }"
                    v-show="getRatingScore(question) > 0"
                  ></div>
                </div>
                <div class="progress-labels">
                  <span>0</span>
                  <span>5</span>
                </div>
              </div>
            </div>

            <!-- 複選題顯示 -->
            <div v-if="question.type === 'MultipleChoice'" class="options-container readonly">
              <div class="selected-options-display">
                <div 
                  v-for="option in getSelectedOptions(question)"
                  :key="option"
                  class="selected-option-item"
                >
                  <div class="option-circle selected">●</div>
                  <span>{{ option }}</span>
                </div>
                <div v-if="getSelectedOptions(question).length === 0" class="no-selection-msg">
                  <span class="empty-text">未選擇任何選項</span>
                </div>
              </div>
            </div>

            <!-- 簡答題顯示 -->
            <div v-if="question.type === 'ShortAnswer'" class="textarea-container readonly">
              <div class="answer-display">
                <div v-if="getTextAnswer(question)" class="text-answer">
                  {{ getTextAnswer(question) }}
                </div>
                <div v-else class="no-answer">
                  <span class="empty-text">未填寫</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 返回按鈕區域 - 移到問卷內容下方 -->
          <div class="footer-actions">
            <button class="back-btn" @click="goBack">
              返回
            </button>
          </div>
        </div>
      </div>

      <!-- 無資料狀態 -->
      <div v-else class="no-selection">
        <h3>找不到問卷回覆詳情</h3>
        <p>請檢查問卷ID是否正確</p>
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
  flex-direction: column;
  min-height: 100vh;
  background: #f5f5f5;
}

// 主要內容區域
.main-content {
  flex: 1;
  padding: 20px 40px 40px;
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
    margin-bottom: 20px;
  }

  .retry-btn {
    background: #6c5ce7;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      background: #5b4bcf;
      transform: translateY(-1px);
    }
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
        margin: 0 0 12px 0;
        opacity: 0.9;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      }

      .response-status {
        .status-badge {
          background: #6F91DF;
          color: white;
          padding: 6px 12px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 500;
          text-shadow: none;

          &.completed {
            background: #6F91DF;
          }
        }
      }
    }
  }

  // 問卷基本資訊
  .response-info {
    padding: 30px 40px;
    background: #f8f9fa;
    border-bottom: 1px solid #e9ecef;

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;

      .info-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

        .info-icon {
          color: #6c5ce7;
          flex-shrink: 0;
        }

        .info-label {
          font-size: 14px;
          color: #666;
          font-weight: 500;
          flex-shrink: 0;
        }

        .info-value {
          font-size: 14px;
          color: #333;
          font-weight: 600;
        }
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

    &.readonly {
      background: #f8f9fa;
      padding: 24px;
      border-radius: 8px;
      border-left: 4px solid #6F91DF;
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
        font-weight: 500;
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
    }
  }
}

// 底部返回按鈕區域
.footer-actions {
  display: flex;
  justify-content: center;
  margin-top: 40px;
  padding-top: 30px;
  border-top: 1px solid #e9ecef;

  .back-btn {
    border: 1px solid #476DF6;
    background-color: #fff;
    color: #476DF6;
    padding: 12px 60px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    
    &:hover:not(:disabled) {
      background: #3f5be1;
      transition: .2s ease;
      color:#fff;
    }
    
    &:disabled {
      background: #bbb;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
  }
}

// 滿意度評分樣式 (只讀模式)
.satisfaction-container {
  display: flex;
  flex-direction: column;
  gap: 12px;

  &.readonly {
    pointer-events: none;
  }
  
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
    height: 30px;
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
      box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3);
      
      &.active {
        display: block;
      }
      
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
      margin-bottom: 8px;

      &.readonly {
        cursor: default;
      }
      
      .progress-fill {
        height: 100%;
        background: #6F91DF;
        border-radius: 4px;
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
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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

// 複選題顯示樣式 (只讀模式)
.options-container {
  &.readonly {
    .selected-options-display {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .selected-option-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        background: #dce1ec;
        border: 1px solid #6F91DF;
        border-radius: 8px;
        color: #291557;

        .option-circle {
          font-size: 16px;
          color: #6F91DF;
          font-weight: bold;

          &.selected {
            color: #6F91DF;
          }
        }

        span {
          font-size: 14px;
          font-weight: 500;
        }
      }

      .no-selection-msg {
        padding: 20px;
        text-align: center;
        background: #fff3cd;
        border: 1px dashed #ffeaa7;
        border-radius: 8px;

        .empty-text {
          color: #856404;
          font-style: italic;
          font-size: 14px;
        }
      }
    }
  }
}

// 簡答題顯示樣式 (只讀模式)
.textarea-container {
  &.readonly {
    .answer-display {
      .text-answer {
        background: white;
        padding: 16px;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        font-size: 14px;
        line-height: 1.6;
        color: #333;
        white-space: pre-wrap;
        word-break: break-word;
        min-height: 100px;
      }

      .no-answer {
        padding: 20px;
        text-align: center;
        background: #fff3cd;
        border: 1px dashed #ffeaa7;
        border-radius: 8px;

        .empty-text {
          color: #856404;
          font-style: italic;
          font-size: 14px;
        }
      }
    }
  }
}

/* ===== 響應式設計 ===== */

@media (max-width: 991px) {
  .survey-page {
    padding: 0;
  }

  .main-content {
    padding: 16px 20px 20px;
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

  .response-info {
    padding: 24px 30px !important;

    .info-grid {
      grid-template-columns: 1fr;
      gap: 16px;
    }
  }
}

@media (max-width: 767px) {
  .main-content {
    padding: 12px 16px 16px;
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

  .response-info {
    padding: 20px !important;

    .info-grid .info-item {
      padding: 10px 12px;
      flex-wrap: wrap;

      .info-label,
      .info-value {
        font-size: 13px;
      }
    }
  }

  .question-group.readonly {
    padding: 20px;
  }

  .question-header {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 8px !important;
  }

  .footer-actions {
    margin-top: 30px;
    padding-top: 24px;

    .back-btn {
      padding: 10px 20px;
      font-size: 13px;
      min-width: 100px;
    }
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
  .main-content {
    padding: 8px 12px 12px;
  }

  .survey-content {
    padding: 20px !important;
  }

  .response-info {
    padding: 16px !important;

    .info-grid .info-item {
      padding: 8px 10px;

      .info-label,
      .info-value {
        font-size: 12px;
      }
    }
  }

  .question-group.readonly {
    padding: 16px;

    .question-header {
      .question-text,
      .question-number {
        font-size: 15px;
      }

      .question-type {
        font-size: 13px;
      }
    }
  }

  .footer-actions {
    margin-top: 24px;
    padding-top: 20px;

    .back-btn {
      padding: 8px 16px;
      font-size: 12px;
      min-width: 90px;
    }
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
}
</style>
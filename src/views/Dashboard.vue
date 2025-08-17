<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDashboardStore } from '@/stores/dashboard'
import * as Chart from 'chart.js'
import { useAuthStore } from '@/stores/auth'
import { PERMISSIONS } from '@/utils/permissions' // 引入權限常數

const authStore = useAuthStore()
const hasTodoPermission = computed(() => authStore.canAccessPage(PERMISSIONS.TODO_MANAGEMENT))
const hasRepairTodoPermission = computed(() => authStore.canAccessPage(PERMISSIONS.REPAIR_TODO_MANAGEMENT))

// Chart.js 組件
Chart.Chart.register(...Chart.registerables)

// 使用 router 和 dashboard store
const router = useRouter()
const dashboardStore = useDashboardStore()

// Chart.js 實例引用
const trendChartRef = ref(null)
const barChartRef = ref(null)
let trendChart = null
let barChart = null
const treeChartRef = ref(null)
let treeChart = null

// 響應式視窗寬度監聽
const windowWidth = ref(window.innerWidth)

// 時間範圍選擇 - 分別為兩個圖表創建獨立的狀態
const trendTimeRange = ref('近1週')  // 趨勢圖的時間範圍
const barTimeRange = ref('近1週')    // 長條圖的時間範圍
const timeOptions = ['近1週', '近1個月', '近6個月']

// 獨立的載入狀態
const isTrendLoading = ref(false)  // 趨勢圖載入狀態
const isBarLoading = ref(false)    // 長條圖載入狀態

// 響應式樹狀圖尺寸計算
const treeChartSize = computed(() => {
  if (windowWidth.value <= 479) {
    return 100  // 小手機
  } else if (windowWidth.value <= 767) {
    return 120  // 大手機
  } else if (windowWidth.value <= 991) {
    return 140  // 平板
  } else {
    return 160  // PC 和大螢幕
  }
})

// 根據時間範圍獲取標籤文字的計算屬性
const getTrendLabels = computed(() => {
  if (trendTimeRange.value === '近6個月') {
    return {
      completing: '當月完成數量',
      remaining: '當月剩餘數量',
      all: '當月報修數量'
    }
  } else {
    return {
      completing: '當日完成數量',
      remaining: '當日剩餘數量',
      all: '當日報修數量'
    }
  }
})

const getBarLabels = computed(() => {
  if (barTimeRange.value === '近6個月') {
    return {
      completing: '當月完成數量',
      remaining: '當月剩餘數量',
      all: '當月報修數量'
    }
  } else {
    return {
      completing: '當日完成數量',
      remaining: '當日剩餘數量',
      all: '當日報修數量'
    }
  }
})

// Chart.js 通用配置
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false 
    },
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      titleColor: '#333',
      bodyColor: '#666',
      borderColor: '#e0e0e0',
      borderWidth: 1,
      cornerRadius: 8,
      displayColors: true,
      intersect: false,
      mode: 'index',
      titleFont: {
        size: 13,
        weight: 'bold'
      },
      bodyFont: {
        size: 12
      },
      padding: 12
    }
  },
  scales: {
    x: {
      grid: {
        display: true,
        color: '#f0f0f0'
      },
      ticks: {
        color: '#999',
        font: {
          size: 11
        }
      }
    },
    y: {
      grid: {
        display: true,
        color: '#f0f0f0'
      },
      ticks: {
        color: '#999',
        font: {
          size: 11
        }
      },
      beginAtZero: true
    }
  }
}

// 創建趨勢折線圖
const createTrendChart = () => {
  if (trendChart) {
    trendChart.destroy()
  }

  const ctx = trendChartRef.value?.getContext('2d')
  if (!ctx || !dashboardStore.repairTrendData) return

  const labels = dashboardStore.repairTrendData.map(item => item.month)
  const trendLabels = getTrendLabels.value

  trendChart = new Chart.Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: trendLabels.completing,
          data: dashboardStore.repairTrendData.map(item => item.completing),
          borderColor: '#5BD7DB',
          backgroundColor: 'rgba(91, 215, 219, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointBackgroundColor: '#5BD7DB',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: trendLabels.remaining,
          data: dashboardStore.repairTrendData.map(item => item.remaining),
          borderColor: '#FF6600',
          backgroundColor: 'rgba(255, 102, 0, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointBackgroundColor: '#FF6600',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: trendLabels.all,
          data: dashboardStore.repairTrendData.map(item => item.all),
          borderColor: '#793AE7',
          backgroundColor: 'rgba(93, 0, 255, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointBackgroundColor: '#793AE7',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    },
    options: {
      ...chartOptions,
      interaction: {
        intersect: false,
        mode: 'index'
      }
    }
  })
}

// 計算樹木節省百分比
const progressPercentage = computed(() => {
  const current = dashboardStore.esgStats.systemTressSavingNumber || 0
  const target = 1000
  return Math.min((current / target) * 100, 100)
})

const treeColor = computed(() => {
  const current = dashboardStore.esgStats.systemTressSavingNumber || 0
  if(current <= 500){
    return '#B3F214'
  } else if(current <= 750){
    return '#76E713'
  } else {
    return '#55A50F'
  }
})

// 修改後的響應式樹狀圖創建函數
const createTreeChart = () => {
  if (treeChart) {
    treeChart.destroy()
  }

  const ctx = treeChartRef.value?.getContext('2d')
  if (!ctx) return

  const current = dashboardStore.esgStats.systemTressSavingNumber || 0
  const remaining = Math.max(1000 - current, 0)
  const size = treeChartSize.value

  // 動態設置 canvas 尺寸
  if (treeChartRef.value) {
    treeChartRef.value.width = size
    treeChartRef.value.height = size
    treeChartRef.value.style.width = `${size}px`
    treeChartRef.value.style.height = `${size}px`
  }
 
  treeChart = new Chart.Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [current, remaining],
        backgroundColor: [
          treeColor.value, 
          '#e8f5e8'  
        ],
        borderWidth: 0,
        cutout: '70%',
        rotation: 0, 
        circumference: 360
      }]
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: false
        }
      },
      elements: {
        arc: {
          borderWidth: 0
        }
      },
      animation: {
        animateRotate: true,
        animateScale: false,
        duration: 1000,
        easing: 'easeOutCubic'
      }
    }
  })
}

// 創建處理量長條圖
const createBarChart = () => {
  if (barChart) {
    barChart.destroy()
  }

  const ctx = barChartRef.value?.getContext('2d')
  if (!ctx || !dashboardStore.caseProcessingData) return

  const labels = dashboardStore.caseProcessingData.map(item => item.month)
  const barLabels = getBarLabels.value

  barChart = new Chart.Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: barLabels.completing,
          data: dashboardStore.caseProcessingData.map(item => item.completing),
          backgroundColor: '#5BD7DB',
          borderRadius: 4,
          borderSkipped: false,
          barThickness: 'flex',
          maxBarThickness: 40
        },
        {
          label: barLabels.remaining,
          data: dashboardStore.caseProcessingData.map(item => item.remaining),
          backgroundColor: '#FF6600',
          borderRadius: 4,
          borderSkipped: false,
          barThickness: 'flex',
          maxBarThickness: 40
        },
        {
          label: barLabels.all,
          data: dashboardStore.caseProcessingData.map(item => item.all),
          backgroundColor: '#793AE7',
          borderRadius: 4,
          borderSkipped: false,
          barThickness: 'flex',
          maxBarThickness: 40
        }
      ]
    },
    options: {
      ...chartOptions,
      scales: {
        ...chartOptions.scales,
        x: {
          ...chartOptions.scales.x,
          stacked: false
        },
        y: {
          ...chartOptions.scales.y,
          stacked: false
        }
      }
    }
  })
}

// 視窗尺寸變化處理器
const handleResize = () => {
  windowWidth.value = window.innerWidth
}

// 切換趨勢圖時間範圍
const switchTrendTimeRange = async (range) => {
  trendTimeRange.value = range
  isTrendLoading.value = true
  console.log('切換趨勢圖時間範圍:', range)
  
  try {
    // 更新趨勢圖數據
    await dashboardStore.fetchRepairTrendData(range)
    
    // 重新創建圖表
    await nextTick()
    createTrendChart()
  } catch (error) {
    console.error('趨勢圖數據載入失敗:', error)
  } finally {
    isTrendLoading.value = false
  }
}

// 切換長條圖時間範圍
const switchBarTimeRange = async (range) => {
  barTimeRange.value = range
  isBarLoading.value = true
  console.log('切換長條圖時間範圍:', range)
  
  try {
    // 更新長條圖數據
    await dashboardStore.fetchCaseProcessingData(range)
    
    // 重新創建圖表
    await nextTick()
    createBarChart()
  } catch (error) {
    console.error('長條圖數據載入失敗:', error)
  } finally {
    isBarLoading.value = false
  }
}

// 切換搜尋類型
const switchSearchType = async (searchType) => {
  console.log('切換搜尋類型:', searchType)
  if (
    searchType === 'All' &&
    !hasRepairTodoPermission.value &&
    !hasTodoPermission.value
  ) {
    return
  }
  await dashboardStore.switchRepairSearchType(searchType)
}

// 根據搜尋類型返回標籤文字
const getSearchTypeLabel = () => {
  const searchTypeLabels = {
    'All': '系統',
    'Remaining': '剩餘',
    'Completing': '完成'
  }
  return searchTypeLabels[dashboardStore.searchType] || '全部'
}

// 根據狀態返回對應的 CSS 類別
const getStatusClass = (status) => {
  // 根據不同的狀態返回對應的樣式類別
  const statusMap = {
    '已完成': 'completed',
    '完成': 'completed',
    '處理中': 'processing',
    '已通報處理中': 'processing',
    '等待中': 'pending',
    '尚未承辦': 'pending',
    '已修正未更新': 'completed',
    '已取消': 'cancelled',
    '取消': 'cancelled'
  }
  
  return statusMap[status] || 'default'
}

// 調整顏色亮度的輔助函式
const adjustColor = (color, percent) => {
  // 移除 # 符號
  const hex = color.replace('#', '')
  
  // 轉換為 RGB
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  
  // 調整亮度
  const adjustedR = Math.max(0, Math.min(255, r + (r * percent / 100)))
  const adjustedG = Math.max(0, Math.min(255, g + (g * percent / 100)))
  const adjustedB = Math.max(0, Math.min(255, b + (b * percent / 100)))
  
  // 轉換回十六進制
  const toHex = (num) => {
    const hex = Math.round(num).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  
  return `#${toHex(adjustedR)}${toHex(adjustedG)}${toHex(adjustedB)}`
}

// 查看案件詳情
const viewCase = (caseId) => {
  console.log('查看案件:', caseId)
  router.push(`/view-repair/${caseId}`)
}

// 查看詳細資訊
const viewDetails = () => {
  console.log('查看詳細資訊')
  let url = '/repair-system'
  if(hasTodoPermission.value) {
    url = 'settings/todo-management'
  }else if(hasRepairTodoPermission.value) {
    url = 'settings/repair-todo-management'
  }
  router.push(url)
}

// 監聽 store 數據變化，重新創建圖表
watch([
  () => dashboardStore.repairTrendData,
], async () => {
  await nextTick()
  createTrendChart()
}, { deep: true })

watch([
  () => dashboardStore.caseProcessingData
], async () => {
  await nextTick()
  createBarChart()
}, { deep: true })

watch([
  () => dashboardStore.esgStats.systemTressSavingNumber
], async () => {
  await nextTick()
  createTreeChart()
}, { deep: true })

// 監聽時間範圍變化，重新創建圖表（用於更新標籤）
watch([trendTimeRange], async () => {
  await nextTick()
  createTrendChart()
})

watch([barTimeRange], async () => {
  await nextTick()
  createBarChart()
})

// 監聽樹狀圖尺寸變化
watch([treeChartSize], async () => {
  await nextTick()
  createTreeChart()
})

// 初始化
onMounted(async () => {
  console.log('Dashboard 組件初始化')
  
  // 添加視窗尺寸監聽器
  window.addEventListener('resize', handleResize)
  
  // 初始化儀表板數據
  await dashboardStore.initializeDashboard()
  
  // 等待 DOM 渲染完成後創建圖表
  await nextTick()
  createTrendChart()
  createBarChart()
  createTreeChart()
})

// 清理函數
onUnmounted(() => {
  // 移除事件監聽器
  window.removeEventListener('resize', handleResize)
  
  // 清理圖表實例
  if (trendChart) {
    trendChart.destroy()
    trendChart = null
  }
  if (barChart) {
    barChart.destroy()
    barChart = null
  }
  if (treeChart) {
    treeChart.destroy()
    treeChart = null
  }
})
</script>

<template>
  <main class="dashboard">
    <!-- 統計卡片區域 -->
    <section class="charts-section">
      <!-- ESG 數據統計區域 -->
      <section class="esg-section">
        <div class="esg-header">
          <h2>本年度 ESG 數據統計</h2>
        </div>
        
        <div class="esg-stats">
          <div class="stat-card personal">
            <div class="stat-info">
              <div class="stat-number">{{ dashboardStore.esgStats.personalPaperSavingNumber }}張</div>
              <div class="stat-label">個人紙張節省數</div>
              <div class="stat-icon">
                <!-- 紙張 SVG 圖標 -->
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <polyline points="10,9 9,9 8,9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </div>
          </div>

          <div class="stat-card total">
            <div class="stat-info">
              <div class="stat-number">{{ dashboardStore.esgStats.systemPaperSavingNumber }}張</div>
              <div class="stat-label">全系統紙張節省數</div>
              <div class="stat-icon">
                <!-- 紙張 SVG 圖標 -->
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <polyline points="10,9 9,9 8,9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </div>
          </div>

          <div class="stat-card target">
            <div class="tree-chart-container">
              <div class="chart-wrapper">
                <canvas ref="treeChartRef" :width="treeChartSize" :height="treeChartSize"></canvas>
                <div class="chart-center-content">
                  <div class="tree-label">全系統節約</div>
                  <div class="tree-count"></div>
                  <div class="tree-label"><b>{{ dashboardStore.esgStats.systemTressSavingNumber }}</b>顆樹木</div>
                  <div class="tree-icon">
                    <!-- 樹木 SVG 圖標 -->
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <!-- 樹幹 -->
                      <rect x="10.5" y="16" width="3" height="6" fill="currentColor" opacity="0.8"/>
                      <!-- 第一層樹葉（最下層） -->
                      <path d="M5 16C5 16 7 10 12 10C17 10 19 16 19 16C19 16 17 18 12 18C7 18 5 16 5 16Z" fill="currentColor"/>
                      <!-- 第二層樹葉（中層） -->
                      <path d="M6 13C6 13 8 8 12 8C16 8 18 13 18 13C18 13 16 15 12 15C8 15 6 13 6 13Z" fill="currentColor"/>
                      <!-- 第三層樹葉（頂層） -->
                      <path d="M7 10C7 10 9 6 12 6C15 6 17 10 17 10C17 10 15 12 12 12C9 12 7 10 7 10Z" fill="currentColor"/>
                      <!-- 樹頂 -->
                      <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 報修趨勢圖 -->
      <div class="chart-container">
        <div class="chart-header">
          <h3>報修趨勢圖 ({{ trendTimeRange }})</h3>
          <div class="time-selector">
            <button 
              v-for="option in timeOptions" 
              :key="`trend-${option}`"
              :class="['time-btn', { active: trendTimeRange === option }]"
              @click="switchTrendTimeRange(option)"
              :disabled="isTrendLoading"
            >
              {{ option }}
            </button>
          </div>
        </div>
        
        <div class="chart-content">
          <div class="chart-legend">
            <div class="legend-item">
              <span class="legend-color completing"></span>
              <span>{{ getTrendLabels.completing }}</span>
            </div>
            <div class="legend-item">
              <span class="legend-color remaining"></span>
              <span>{{ getTrendLabels.remaining }}</span>
            </div>
            <div class="legend-item">
              <span class="legend-color all"></span>
              <span>{{ getTrendLabels.all }}</span>
            </div>
          </div>
          
          <div class="chart-wrapper">
            <canvas ref="trendChartRef"></canvas>
            <div v-if="isTrendLoading" class="chart-loading">
              <div class="loading-spinner">⟳</div>
              <span>載入中...</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 圖表區域 -->
    <section class="charts-section">
      <section class="stats-cards" :style="[(hasRepairTodoPermission || hasTodoPermission) ? 'grid-template-columns: repeat(3, 1fr)' : 'grid-template-columns: repeat(2, 1fr)']">
        <div class="stat-card-item completed" @click="switchSearchType('Completing')"> 
          <div class="card-icon">
            <!-- 完成圖標 - 打勾 -->
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="card-content">
            <div class="card-title">本月案件完成數</div>
            <div class="card-number">{{ dashboardStore.monthlyStats.completedCases }}件</div>
            <div class="card-subtitle">完成率：{{ dashboardStore.monthlyStats.completionRate }}%</div>
          </div>
        </div>

        <div class="stat-card-item reports" @click="switchSearchType('Remaining')">
          <div class="card-icon">
            <!-- 維修圖標 - 扳手 -->
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" 
                    fill="currentColor"/>
            </svg>
          </div>
          <div class="card-content">
            <div class="card-title">本月剩餘報修數</div>
            <div class="card-number">{{ dashboardStore.monthlyStats.newReports }}件</div>
          </div>
        </div>

        <div class="stat-card-item repairs" @click="switchSearchType('All')" v-if="hasRepairTodoPermission || hasTodoPermission">
          <div class="card-icon">
            <!-- 總計圖標 - 資料夾 -->
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 19C22 19.5304 21.7893 20.0391 21.4142 20.4142C21.0391 20.7893 20.5304 21 20 21H4C3.46957 21 2.96086 20.7893 2.58579 20.4142C2.21071 20.0391 2 19.5304 2 19V5C2 4.46957 2.21071 3.96086 2.58579 3.58579C2.96086 3.21071 3.46957 3 4 3H9L11 6H20C20.5304 6 21.0391 6.21071 21.4142 6.58579C21.7893 6.96086 22 7.46957 22 8V19Z" 
                    fill="currentColor"/>
            </svg>
          </div>
          <div class="card-content">
            <div class="card-title">本月總報修數</div>
            <div class="card-number">{{ dashboardStore.monthlyStats.totalRepairs }}件</div>
          </div>
        </div>
      </section>
      
      <!-- 案件處理量圖 -->
      <div class="chart-container">
        <div class="chart-header">
          <h3>案件處理量 ({{ barTimeRange }})</h3>
          <div class="time-selector">
            <button 
              v-for="option in timeOptions" 
              :key="`bar-${option}`"
              :class="['time-btn', { active: barTimeRange === option }]"
              @click="switchBarTimeRange(option)"
              :disabled="isBarLoading"
            >
              {{ option }}
            </button>
          </div>
        </div>
        
        <div class="chart-content">
          <div class="chart-legend">
            <div class="legend-item">
              <span class="legend-color completing"></span>
              <span>{{ getBarLabels.completing }}</span>
            </div>
            <div class="legend-item">
              <span class="legend-color remaining"></span>
              <span>{{ getBarLabels.remaining }}</span>
            </div>
            <div class="legend-item">
              <span class="legend-color all"></span>
              <span>{{ getBarLabels.all }}</span>
            </div>
          </div>
          
          <div class="chart-wrapper">
            <canvas ref="barChartRef"></canvas>
            <div v-if="isBarLoading" class="chart-loading">
              <div class="loading-spinner">⟳</div>
              <span>載入中...</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 緊急案件列表 -->
    <section class="urgent-cases-section">
      <div class="section-header" :style="{ background: `linear-gradient(135deg, ${dashboardStore.currentHeaderColor} 0%, ${adjustColor(dashboardStore.currentHeaderColor, -20)} 100%)` }">
        <h3>
          <span class="star-icon">⭐</span>
          <span v-if="hasTodoPermission">本月全系統 報修案件</span>
          <span v-else-if="hasRepairTodoPermission">本月個人 承辦案件</span>
          <span v-else>本月單位 報修案件</span>
        </h3>
        
        <!-- 搜尋類型切換按鈕 -->
        <div class="search-type-controls">
          <div class="search-type-buttons">
            <button 
              :class="['search-type-btn', { active: dashboardStore.searchType === 'Completing' }]"
              @click="switchSearchType('Completing')"
              :disabled="dashboardStore.isLoading"
            >
              完成案件
            </button>
            <button 
              :class="['search-type-btn', { active: dashboardStore.searchType === 'Remaining' }]"
              @click="switchSearchType('Remaining')"
              :disabled="dashboardStore.isLoading"
            >
              剩餘案件
            </button>
            <button 
              :class="['search-type-btn', { active: dashboardStore.searchType === 'All' }]"
              @click="switchSearchType('All')"
              :disabled="dashboardStore.isLoading"
              v-if="hasRepairTodoPermission || hasTodoPermission"
            >
              全部案件
            </button>
          </div>
          
          <button class="details-btn" @click="viewDetails">
            詳細資訊
          </button>
        </div>
      </div>
      
      <div class="cases-table">
        <div class="table-header" :style="{ backgroundColor: dashboardStore.currentHeaderColor }">
          <div class="header-cell">案件標題</div>
          <div class="header-cell">故障類別</div>
          <div class="header-cell">故障原因</div>
          <div class="header-cell">承辦人員</div>
          <div class="header-cell">報修時間</div>
          <div class="header-cell">處理狀態</div>
        </div>
        
        <div class="table-body">
          <div 
            v-for="caseItem in dashboardStore.urgentCases" 
            :key="caseItem.id"
            class="table-row"
            @click="viewCase(caseItem.id)"
          >
            <div class="cell title" data-label="案件標題">{{ caseItem.title }}</div>
            <div class="cell" data-label="故障類別">{{ caseItem.category }}</div>
            <div class="cell" data-label="故障原因">{{ caseItem.reason }}</div>
            <div class="cell" data-label="承辦人員">{{ caseItem.assignee }}</div>
            <div class="cell" data-label="報修時間">{{ caseItem.reportTime }}</div>
            <div class="cell status" data-label="處理狀態">
              <span :class="['status-badge', getStatusClass(caseItem.status)]">
                {{ caseItem.status }}
              </span>
            </div>
          </div>
          
          <!-- 載入狀態 -->
          <div v-if="dashboardStore.isLoading && !dashboardStore.urgentCases.length" class="table-loading">
            <div class="loading-spinner">⟳</div>
            <span>載入中...</span>
          </div>
          
          <!-- 無資料狀態 -->
          <div v-if="!dashboardStore.isLoading && !dashboardStore.urgentCases.length" class="no-data">
            <div class="no-data-icon">📋</div>
            <div class="no-data-text">暫無{{ getSearchTypeLabel() }}案件</div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
<style lang="scss" scoped>
.dashboard {
  padding: 20px;
  background-color: #f8f9fa;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

// Loading 動畫
.loading-spinner {
  display: inline-block;
  animation: spin 1s linear infinite;
  font-size: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// ESG 統計區域
.esg-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  .esg-header {
    margin-bottom: 20px;
    
    h2 {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin: 0;
    }
  }

  .esg-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    align-items: stretch;

    .stat-card {
      width: 100%;
      min-height: 200px;
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 4px 12px rgba(76, 175, 80, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      
      &.target {
        .tree-chart-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          width: 100%;
          height: 100%;

          .chart-wrapper {
            position: relative;
            width: 160px;
            height: 160px;
            display: flex;
            align-items: center;
            justify-content: center;

            canvas {
              width: 160px !important;
              height: 160px !important;
            }

            .chart-center-content {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              pointer-events: none;

              .tree-icon {
                width: 32px;
                height: 32px;
                color: #55A50F;
                margin-bottom: 4px;

                svg {
                  width: 100%;
                  height: 100%;
                }
              }

              .tree-count {
                font-size: 28px;
                font-weight: 700;
                color: #9DC20F;
                line-height: 1;
              }

              .tree-label {
                font-size: 14px;
                color: #9DC20F;
                margin-top: 4px;
                font-weight: 500;
              }
            }
          }

          .chart-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 4px;

            .chart-title {
              font-size: 16px;
              font-weight: 600;
              color: #2e7d32;
              margin: 0;
            }

            .chart-subtitle {
              font-size: 12px;
              color: #4caf50;
              margin: 0;
            }

            .progress-percentage {
              font-size: 18px;
              font-weight: 700;
              color: #1b5e20;
              margin-top: 8px;
            }
          }
        }
      }

      &.personal, &.total {
        margin: 10px;
        box-shadow: 0 4px 12px rgba(76, 175, 80, 0.15);
        background-color: #FAFAFA;
        
        .stat-info {
          padding: 20px;
          border-radius: 8px;
          width: 100%;
          display: flex;
          flex-direction: column;
          
          .stat-number {
            font-size: 32px;
            font-weight: 700;
            color: #3750A1;
            line-height: 1;
          }

          .stat-label {
            font-size: 14px;
            color: #3750A1;
            margin-top: 5px;
          }
          
          .stat-icon {
            width: 60px;
            height: 60px;
            color: #3750A1;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-left: auto;
            margin-top: 10px;

            svg {
              width: 48px;
              height: 48px;
            }
          }
        }
      }
    }
  }
}

// 統計卡片區域
.stats-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  cursor: pointer;

  .stat-card-item {
    background: white;
    border-radius: 8px;
    padding: 60px 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: 15px;
    transition: transform 0.2s, box-shadow 0.2s;
    min-height: 180px;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    }

    .card-icon {
      width: 72px;
      height: 72px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      
      svg {
        width: 72px;
        height: 72px;
        transition: all 0.3s ease;
      }
    }

    .card-content {
      text-align: center;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      
      .card-title {
        font-size: 16px;
        color: #333;
        margin-bottom: 8px;
        line-height: 1.3;
      }

      .card-number {
        font-size: 24px;
        font-weight: 700;
        color: #111;
        line-height: 1;
      }

      .card-subtitle {
        font-size: 14px;
        color: #444;
        margin-top: 4px;
      }
    }

    // 不同卡片的顏色主題
    &.completed {
      .card-icon {
        color: #52C2C6;
        &:hover {
          transform: scale(1.05);
        }
      }
      
      &:hover .card-icon svg {
        transform: scale(1.1);
      }
    }

    &.reports {
      .card-icon {
        color: #E45C00;
        &:hover {
          transform: scale(1.05);
        }
      }
      
      &:hover .card-icon svg {
        transform: scale(1.1);
      }
    }

    &.repairs {
      .card-icon {
        color: #7739E3;
        
        &:hover {
          transform: scale(1.05);
        }
      }
      
      &:hover .card-icon svg {
        transform: scale(1.1);
      }
    }
  }
}

// 圖表容器樣式
.chart-container {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 10px;

    h3 {
      font-size: 16px;
      font-weight: 600;
      color: #333;
      margin: 0;
      min-width: 0;
      flex: 1;
    }

    .time-selector {
      display: flex;
      gap: 4px;
      flex-shrink: 0;

      .time-btn {
        padding: 6px 12px;
        border: 1px solid #ddd;
        background: white;
        color: #666;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;

        &:hover:not(:disabled) {
          border-color: #5dade2;
          color: #5dade2;
        }

        &.active {
          background: #5dade2;
          color: white;
          border-color: #5dade2;
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }
    }
  }

  .chart-content {
    .chart-legend {
      display: flex;
      gap: 20px;
      margin-bottom: 15px;
      flex-wrap: wrap;

      .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: #666;

        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 2px;
          flex-shrink: 0;

          &.completing { background: #5BD7DB; }
          &.remaining { background: #FF6600; }
          &.all { background: #793AE7; }
        }
      }
    }

    .chart-wrapper {
      height: 260px;
      position: relative;

      canvas {
        max-height: 100%;
        width: 100% !important;
      }

      .chart-loading {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        align-items: center;
        gap: 8px;
        color: #666;
        font-size: 14px;
        
        .loading-spinner {
          display: inline-block;
          animation: spin 1s linear infinite;
          font-size: 16px;
        }
      }
    }
  }
}

// 圖表區域
.charts-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

// 緊急案件區域
.urgent-cases-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    color: white;
    transition: background 0.3s ease;
    flex-wrap: wrap;
    gap: 15px;

    h3 {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;

      .star-icon {
        font-size: 18px;
        flex-shrink: 0;
      }
    }

    .search-type-controls {
      display: flex;
      align-items: center;
      gap: 15px;
      flex-wrap: wrap;

      .search-type-buttons {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;

        .search-type-btn {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;

          &:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-1px);
          }

          &.active {
            background: rgba(255, 255, 255, 0.9);
            color: #333;
            border-color: rgba(255, 255, 255, 0.9);
            font-weight: 500;
          }

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
          }
        }
      }

      .details-btn {
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.3);
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;

        &:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-1px);
        }
      }
    }
  }

  .cases-table {
    .table-header {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr 1.2fr 1fr;
      color: white;
      font-weight: 500;
      transition: background-color 0.3s ease;

      .header-cell {
        padding: 15px;
        font-size: 14px;
      }
    }

    .table-body {
      .table-row {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 1fr 1.2fr 1fr;
        border-bottom: 1px solid #f0f0f0;
        cursor: pointer;
        transition: background-color 0.2s;

        &:hover {
          background: #f8f9fa;
        }

        .cell {
          padding: 15px;
          font-size: 13px;
          color: #333;
          display: flex;
          align-items: center;
          min-width: 0;
          overflow: hidden;

          &.title {
            color: #1976d2;
            font-weight: 500;
          }

          &.status {
            .status-badge {
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 500;
              white-space: nowrap;

              &.completed {
                background: #e8f5e8;
                color: #2e7d32;
              }

              &.processing {
                background: #fff3e0;
                color: #f57c00;
              }

              &.pending {
                background: #e3f2fd;
                color: #1976d2;
              }

              &.cancelled {
                background: #ffebee;
                color: #d32f2f;
              }

              &.default {
                background: #f5f5f5;
                color: #666;
              }
            }
          }
        }

        &:last-child {
          border-bottom: none;
        }
      }

      .table-loading,
      .no-data {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px;
        color: #666;
        font-size: 14px;
        gap: 8px;
        flex-direction: column;

        .no-data-icon {
          font-size: 48px;
          opacity: 0.5;
          margin-bottom: 8px;
        }

        .no-data-text {
          font-size: 16px;
          color: #999;
        }
      }

      .table-loading {
        flex-direction: row;
        
        .loading-spinner {
          display: inline-block;
          animation: spin 1s linear infinite;
          font-size: 16px;
        }
      }
    }
  }
}

/* ===== 響應式設計 ===== */

/* 大螢幕 (1400px+) */
@media (min-width: 1400px) {
  .dashboard {
    padding: 24px;
    gap: 24px;
  }

  .chart-container .chart-content .chart-wrapper {
    height: 300px;
  }
}

/* 平板橫向 (992px - 1199px) */
@media (max-width: 1199px) {
  .charts-section {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .esg-section .esg-stats {
    grid-template-columns: repeat(2, 1fr);
    
    .stat-card.target {
      grid-column: 1 / -1;
      max-width: 400px;
      margin: 0 auto;
    }
  }

  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
    
    &[style*="repeat(3, 1fr)"] {
      grid-template-columns: repeat(3, 1fr);
    }
  }
}

/* 平板直向 (768px - 991px) */
@media (max-width: 991px) {
  .dashboard {
    padding: 16px;
    gap: 16px;
  }

  .esg-section {
    padding: 16px;
    
    .esg-header h2 {
      font-size: 16px;
    }
    
    .esg-stats {
      grid-template-columns: 1fr;
      gap: 16px;
      
      .stat-card {
        min-height: 160px;
        padding: 16px;
        
        &.personal, &.total {
          margin: 5px;
          
          .stat-info {
            padding: 16px;
            
            .stat-number {
              font-size: 28px;
            }
            
            .stat-icon {
              width: 50px;
              height: 50px;
              
              svg {
                width: 40px;
                height: 40px;
              }
            }
          }
        }
        
        &.target {
          max-width: 350px;
          margin: 0 auto;
          
          .tree-chart-container {
            .chart-wrapper {
              width: 140px;
              height: 140px;
              
              canvas {
                width: 140px !important;
                height: 140px !important;
              }
              
              .chart-center-content {
                .tree-icon {
                  width: 28px;
                  height: 28px;
                }
                
                .tree-count {
                  font-size: 24px;
                }
                
                .tree-label {
                  font-size: 12px;
                }
              }
            }
          }
        }
      }
    }
  }

  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    
    .stat-card-item {
      padding: 16px;
      min-height: 160px;
      
      .card-icon {
        width: 50px;
        height: 50px;
        
        svg {
          width: 40px;
          height: 40px;
        }
      }
      
      .card-content {
        .card-title {
          font-size: 14px;
        }
        
        .card-number {
          font-size: 20px;
        }
        
        .card-subtitle {
          font-size: 12px;
        }
      }
    }
  }

  .chart-container {
    padding: 16px;
    
    .chart-header {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
      
      h3 {
        font-size: 14px;
        text-align: center;
      }
      
      .time-selector {
        justify-content: center;
        
        .time-btn {
          padding: 8px 12px;
          font-size: 11px;
        }
      }
    }
    
    .chart-content {
      .chart-wrapper {
        height: 220px;
      }
      
      .chart-legend {
        justify-content: center;
        gap: 16px;
        
        .legend-item {
          font-size: 11px;
        }
      }
    }
  }

  .urgent-cases-section {
    .section-header {
      padding: 16px;
      
      h3 {
        font-size: 14px;
      }
      
      .search-type-controls {
        width: 100%;
        justify-content: space-between;
        
        .search-type-buttons {
          .search-type-btn {
            padding: 6px 10px;
            font-size: 11px;
          }
        }
        
        .details-btn {
          padding: 6px 12px;
          font-size: 11px;
        }
      }
    }
    
    .cases-table {
      .table-header {
        grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr 0.8fr;
        
        .header-cell {
          padding: 12px 8px;
          font-size: 12px;
        }
      }
      
      .table-body .table-row {
        grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr 0.8fr;
        
        .cell {
          padding: 12px 8px;
          font-size: 12px;
          
          &.status .status-badge {
            font-size: 10px;
            padding: 2px 6px;
          }
        }
      }
    }
  }
}

/* 大手機 (576px - 767px) */
@media (max-width: 767px) {
  .dashboard {
    padding: 12px;
    gap: 12px;
  }

  .stats-cards {
    grid-template-columns: 1fr;
    gap: 12px;
    
    .stat-card-item {
      flex-direction: row;
      text-align: left;
      padding: 16px;
      gap: 16px;
      
      .card-icon {
        flex-shrink: 0;
      }
      
      .card-content {
        text-align: left;
        flex: 1;
      }
    }
  }

  .esg-section {
    .esg-stats .stat-card.target {
      .tree-chart-container {
        flex-direction: column;
        gap: 12px;
        
        .chart-wrapper {
          width: 120px;
          height: 120px;
          
          canvas {
            width: 120px !important;
            height: 120px !important;
          }
          
          .chart-center-content {
            .tree-icon {
              width: 24px;
              height: 24px;
            }
            
            .tree-count {
              font-size: 20px;
            }
            
            .tree-label {
              font-size: 11px;
            }
          }
        }
      }
    }
  }

  .chart-container {
    .chart-content .chart-wrapper {
      height: 200px;
    }
  }

  .urgent-cases-section {
    .section-header {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
      
      .search-type-controls {
        flex-direction: column;
        gap: 8px;
        
        .search-type-buttons {
          justify-content: center;
        }
        
        .details-btn {
          align-self: center;
        }
      }
    }
    
    .cases-table {
      .table-header {
        display: none;
      }
      
      .table-body .table-row {
        grid-template-columns: 1fr;
        gap: 0;
        padding: 12px;
        
        .cell {
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;
          position: relative;
          padding-left: 100px;
          min-height: 36px;
          
          &:before {
            content: attr(data-label);
            position: absolute;
            left: 0;
            top: 8px;
            width: 90px;
            font-weight: 500;
            color: #666;
            font-size: 12px;
          }
          
          &:nth-child(1):before { content: "案件標題"; }
          &:nth-child(2):before { content: "故障類別"; }
          &:nth-child(3):before { content: "故障原因"; }
          &:nth-child(4):before { content: "承辦人員"; }
          &:nth-child(5):before { content: "報修時間"; }
          &:nth-child(6):before { content: "處理狀態"; }
          
          &:last-child {
            border-bottom: 2px solid #e0e0e0;
            margin-bottom: 8px;
            padding-bottom: 12px;
          }
        }
      }
    }
  }
}

/* 小手機 (480px 以下) */
@media (max-width: 479px) {
  .dashboard {
    padding: 8px;
    gap: 8px;
  }

  .esg-section,
  .chart-container,
  .urgent-cases-section {
    border-radius: 6px;
  }

  .esg-section {
    padding: 12px;
    
    .esg-header h2 {
      font-size: 14px;
    }
    
    .esg-stats .stat-card {
      min-height: 140px;
      padding: 12px;
      border-radius: 12px;
      
      &.personal, &.total {
        margin: 0;
        
        .stat-info {
          padding: 12px;
          
          .stat-number {
            font-size: 24px;
          }
          
          .stat-label {
            font-size: 12px;
          }
          
          .stat-icon {
            width: 40px;
            height: 40px;
            
            svg {
              width: 32px;
              height: 32px;
            }
          }
        }
      }
      
      &.target {
        .tree-chart-container .chart-wrapper {
          width: 100px;
          height: 100px;
          
          canvas {
            width: 100px !important;
            height: 100px !important;
          }
          
          .chart-center-content {
            .tree-icon {
              width: 20px;
              height: 20px;
            }
            
            .tree-count {
              font-size: 16px;
            }
            
            .tree-label {
              font-size: 10px;
            }
          }
        }
      }
    }
  }

  .stats-cards .stat-card-item {
    padding: 12px;
    min-height: 120px;
    
    .card-icon {
      width: 40px;
      height: 40px;
      
      svg {
        width: 32px;
        height: 32px;
      }
    }
    
    .card-content {
      .card-title {
        font-size: 13px;
      }
      
      .card-number {
        font-size: 18px;
      }
      
      .card-subtitle {
        font-size: 11px;
      }
    }
  }

  .chart-container {
    padding: 12px;
    
    .chart-header {
      .time-selector .time-btn {
        padding: 6px 8px;
        font-size: 10px;
      }
    }
    
    .chart-content {
      .chart-wrapper {
        height: 180px;
      }
      
      .chart-legend {
        gap: 12px;
        
        .legend-item {
          font-size: 10px;
          
          .legend-color {
            width: 10px;
            height: 10px;
          }
        }
      }
    }
  }

  .urgent-cases-section {
    .section-header {
      padding: 12px;
      
      h3 {
        font-size: 13px;
        
        .star-icon {
          font-size: 14px;
        }
      }
      
      .search-type-controls {
        .search-type-buttons .search-type-btn {
          padding: 5px 8px;
          font-size: 10px;
        }
        
        .details-btn {
          padding: 5px 10px;
          font-size: 10px;
        }
      }
    }
    
    .cases-table .table-body .table-row .cell {
      padding-left: 80px;
      font-size: 11px;
      
      &:before {
        width: 70px;
        font-size: 10px;
      }
    }
  }
}

/* 超小螢幕 (360px 以下) */
@media (max-width: 359px) {
  .urgent-cases-section .cases-table .table-body .table-row .cell {
    padding-left: 70px;
    
    &:before {
      width: 60px;
      font-size: 9px;
    }
  }
  
  .chart-container .chart-header .time-selector {
    gap: 2px;
    
    .time-btn {
      padding: 4px 6px;
      font-size: 9px;
    }
  }
}
</style>
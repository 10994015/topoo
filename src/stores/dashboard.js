// stores/dashboard.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axiosClient from '../axios' // 引入 axios 實例
import { useAuthStore } from '@/stores/auth'
import { PERMISSIONS } from '@/utils/permissions' // 引入權限常數


export const useDashboardStore = defineStore('dashboard', () => {
    const isLoading = ref(false)
    const authStore = useAuthStore()

    const hasTodoPermission = computed(() => authStore.canAccessPage(PERMISSIONS.TODO_MANAGEMENT))
    const hasRepairTodoPermission = computed(() => authStore.canAccessPage(PERMISSIONS.REPAIR_TODO_MANAGEMENT))

    
    // ESG 數據統計
    const esgStats = ref({
        personalPaperSavingNumber: 0,
        systemPaperSavingNumber: 0,
        systemTressSavingNumber: 0
    })
    
    // 月度統計
    const monthlyStats = ref({
        completedCases: 15,
        completionRate: 66.6,
        newReports: 5,
        totalRepairs: 20
    })
    
    // 報修趨勢圖表數據 - 改為從 API 獲取
    const repairTrendData = ref([])
    
    // 案件處理量圖表數據 - 改為從 API 獲取
    const caseProcessingData = ref([])
    
    // 待處理案件列表 - 改為從 API 獲取
    const urgentCases = ref([])
    
    // 系統報修案件的搜尋類型和對應顏色
    const searchType = ref('All') // 預設為 All
    const searchTypeColors = {
        'All': '#8640FF',
        'Remaining': '#FF6600', 
        'Completing': '#5BD7DB'
    }
    
    // 計算屬性
    const chartLabels = computed(() => repairTrendData.value.map(item => item.month))
    const currentHeaderColor = computed(() => searchTypeColors[searchType.value] || '#8640FF')
    
    // 時間範圍映射函數
    const getTimeRangeParam = (timeRange) => {
        const timeRangeMap = {
            '近1週': '1w',
            '近1個月': '1m', 
            '近6個月': '6m'
        }
        return timeRangeMap[timeRange] || '6m'
    }
    
    // 格式化 API 數據為圖表所需格式（更新變數名稱）
    const formatChartData = (apiData) => {
        if (!apiData || !Array.isArray(apiData)) {
            console.warn('API 數據格式不正確:', apiData)
            return []
        }
        
        return apiData.map(item => ({
            month: item.x_time ? formatTimeLabel(item.x_time) : '未知',
            all: item.all_repair || 0,           // 當月報修數量
            completing: item.completing_repair || 0,  // 當月完成數量 
            remaining: item.remaining_repair || 0     // 當月剩餘數量
        }))
    }
    
    // 格式化系統報修案件數據
    const formatRepairCaseData = (apiData) => {
        if (!apiData || !Array.isArray(apiData)) {
            console.warn('系統報修 API 數據格式不正確:', apiData)
            return []
        }
        
        return apiData.map(item => ({
            id: item.id,
            title: item.title || '無標題',
            category: item.repair_category || '未分類',
            reason: item.repair_reason || '未知原因',
            assignee: item.assign_user_name || item.repair_name || '未指派',
            reportTime: item.repair_time ? formatDateTime(item.repair_time) : '未知時間',
            status: item.repair_status || '未知狀態',
            importanceLevel: item.importance_level,
            emergencyLevel: item.emergency_level,
            estimatedCompletion: item.estimated_completion_time ? formatDateTime(item.estimated_completion_time) : null
        }))
    }
    
    // 格式化時間標籤
    const formatTimeLabel = (timeStr) => {
        try {
            // 判斷不同的時間格式
            if (timeStr.includes('T')) {
                // 完整的 ISO 時間格式：2025-07-28T09:54:08.018Z
                const date = new Date(timeStr)
                const month = date.getMonth() + 1
                const day = date.getDate()
                return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`
            } else if (timeStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                // 日期格式：2025-07-01
                const [year, month, day] = timeStr.split('-')
                return `${parseInt(month)}/${parseInt(day)}`
            } else if (timeStr.match(/^\d{4}-\d{2}$/)) {
                // 月份格式：2025-07
                const [year, month] = timeStr.split('-')
                return `${parseInt(month)}月`
            } else {
                // 其他格式，嘗試解析為日期
                const date = new Date(timeStr)
                if (!isNaN(date.getTime())) {
                    const month = date.getMonth() + 1
                    const day = date.getDate()
                    // 如果原始字符串包含日期信息，則顯示月/日
                    if (timeStr.includes('-') && timeStr.split('-').length >= 3) {
                        return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`
                    } else {
                        return `${month}月`
                    }
                } else {
                    // 無法解析時直接返回原字符串
                    console.warn('無法解析的時間格式:', timeStr)
                    return timeStr
                }
            }
        } catch (error) {
            console.error('時間格式化錯誤:', error, timeStr)
            return timeStr
        }
    }
    
    // 格式化日期時間顯示
    const formatDateTime = (timeStr) => {
        try {
            const date = new Date(timeStr)
            if (isNaN(date.getTime())) {
                return timeStr
            }
            
            const year = date.getFullYear()
            const month = (date.getMonth() + 1).toString().padStart(2, '0')
            const day = date.getDate().toString().padStart(2, '0')
            const hours = date.getHours().toString().padStart(2, '0')
            const minutes = date.getMinutes().toString().padStart(2, '0')
            
            return `${year}/${month}/${day} ${hours}:${minutes}`
        } catch (error) {
            console.error('日期時間格式化錯誤:', error, timeStr)
            return timeStr
        }
    }
    
    // API 方法
    
    // 獲取 ESG 統計數據
    const fetchEsgStats = async () => {
        isLoading.value = true
        try {
            const response = await axiosClient.get('/dashboard/carbon-saving')
            console.log('ESG API 響應:', response.data)
            
            if (response.data.statusCode === 200) {
                esgStats.value = response.data.data
                // 暫時硬編碼樹木節省數，等待 API 提供
                // esgStats.value.systemTressSavingNumber = 150
            }
            
            console.log('ESG 統計數據已載入')
        } catch (error) {
            console.error('獲取 ESG 統計數據失敗:', error)
        } finally {
            isLoading.value = false
        }
    }
    
    // 獲取月度統計數據
    const fetchMonthlyStats = async () => {
        isLoading.value = true
        try {
            // TODO: 替換為真實 API 調用
            // const response = await axiosClient.get('/dashboard/monthly-stats')
            // monthlyStats.value = response.data.data
            
            await new Promise(resolve => setTimeout(resolve, 500))
            console.log('月度統計數據已載入')
        } catch (error) {
            console.error('獲取月度統計數據失敗:', error)
        } finally {
            isLoading.value = false
        }
    }
    
    // 獲取報修趨勢數據 - 使用新的 API（更新模擬數據變數名稱）
    const fetchRepairTrendData = async (timeRange = '近6個月') => {
        isLoading.value = true
        try {
            const timeRangeParam = getTimeRangeParam(timeRange)
            console.log('獲取報修趨勢數據:', timeRange, '->', timeRangeParam)
            
            const response = await axiosClient.get('/dashboard/repair-chart', {
                params: { 
                    timeRange: timeRangeParam,
                    baseTime: new Date().toISOString()
                }
            })
            
            console.log('報修趨勢 API 響應:', response.data)
            
            if (response.data.statusCode === 200 && response.data.data) {
                const formattedData = formatChartData(response.data.data.chartData)
                repairTrendData.value = formattedData
                console.log('報修趨勢數據已格式化:', formattedData)
            } else {
                console.warn('報修趨勢 API 響應狀態異常:', response.data)
                // 如果 API 失敗，保持當前數據不變
            }
            
        } catch (error) {
            console.error('獲取報修趨勢數據失敗:', error)
            
            // API 失敗時使用模擬數據作為後備（更新變數名稱）
            console.log('使用模擬數據作為後備')
            if (timeRange === '近1週') {
                repairTrendData.value = [
                    { month: '07/26', all: 8, completing: 3, remaining: 5 },
                    { month: '07/27', all: 9, completing: 2, remaining: 6 },
                    { month: '07/28', all: 7, completing: 4, remaining: 4 },
                    { month: '07/29', all: 11, completing: 1, remaining: 7 },
                    { month: '07/30', all: 6, completing: 5, remaining: 3 },
                    { month: '07/31', all: 12, completing: 2, remaining: 8 },
                    { month: '08/01', all: 10, completing: 3, remaining: 5 }
                ]
            } else if (timeRange === '近1個月') {
                repairTrendData.value = [
                    { month: '第1週', all: 12, completing: 6, remaining: 8 },
                    { month: '第2週', all: 15, completing: 4, remaining: 10 },
                    { month: '第3週', all: 14, completing: 8, remaining: 6 },
                    { month: '第4週', all: 18, completing: 3, remaining: 12 }
                ]
            } else {
                repairTrendData.value = [
                    { month: '07月', all: 15, completing: 8, remaining: 12 },
                    { month: '08月', all: 18, completing: 6, remaining: 14 },
                    { month: '09月', all: 12, completing: 10, remaining: 16 },
                    { month: '10月', all: 22, completing: 4, remaining: 11 },
                    { month: '11月', all: 19, completing: 7, remaining: 13 },
                    { month: '12月', all: 25, completing: 5, remaining: 9 }
                ]
            }
        } finally {
            isLoading.value = false
        }
    }
    
    // 獲取案件處理量數據 - 使用相同的 API，但保存到不同的變量（更新模擬數據變數名稱）
    const fetchCaseProcessingData = async (timeRange = '近6個月') => {
        isLoading.value = true
        try {
            const timeRangeParam = getTimeRangeParam(timeRange)
            console.log('獲取案件處理量數據:', timeRange, '->', timeRangeParam)
            
            const response = await axiosClient.get('/dashboard/repair-chart', {
                params: { 
                    timeRange: timeRangeParam,
                    baseTime: new Date().toISOString()
                }
            })
            
            console.log('案件處理量 API 響應:', response.data)
            
            if (response.data.statusCode === 200 && response.data.data) {
                const formattedData = formatChartData(response.data.data.chartData)
                caseProcessingData.value = formattedData
                console.log('案件處理量數據已格式化:', formattedData)
            } else {
                console.warn('案件處理量 API 響應狀態異常:', response.data)
            }
            
        } catch (error) {
            console.error('獲取案件處理量數據失敗:', error)
            
            // API 失敗時使用模擬數據作為後備（更新變數名稱）
            console.log('使用模擬數據作為後備')
            if (timeRange === '近1週') {
                caseProcessingData.value = [
                    { month: '07/26', all: 6, completing: 2, remaining: 3 },
                    { month: '07/27', all: 7, completing: 1, remaining: 4 },
                    { month: '07/28', all: 5, completing: 3, remaining: 2 },
                    { month: '07/29', all: 9, completing: 0, remaining: 5 },
                    { month: '07/30', all: 4, completing: 4, remaining: 1 },
                    { month: '07/31', all: 10, completing: 1, remaining: 6 },
                    { month: '08/01', all: 8, completing: 2, remaining: 3 }
                ]
            } else if (timeRange === '近1個月') {
                caseProcessingData.value = [
                    { month: '第1週', all: 10, completing: 4, remaining: 6 },
                    { month: '第2週', all: 13, completing: 2, remaining: 8 },
                    { month: '第3週', all: 12, completing: 6, remaining: 4 },
                    { month: '第4週', all: 16, completing: 1, remaining: 10 }
                ]
            } else {
                caseProcessingData.value = [
                    { month: '07月', all: 12, completing: 5, remaining: 8 },
                    { month: '08月', all: 15, completing: 7, remaining: 10 },
                    { month: '09月', all: 18, completing: 9, remaining: 12 },
                    { month: '10月', all: 20, completing: 6, remaining: 14 },
                    { month: '11月', all: 22, completing: 8, remaining: 16 },
                    { month: '12月', all: 25, completing: 4, remaining: 11 }
                ]
            }
        } finally {
            isLoading.value = false
        }
    }
    
    // 獲取系統報修案件列表 - 新增
    const fetchSystemRepairCases = async (searchTypeParam = 'Remaining') => {
        isLoading.value = true
        try {
            if(searchTypeParam === 'All' && !hasTodoPermission.value && !hasRepairTodoPermission.value) {
                console.warn('無權限查看所有系統報修案件')
                urgentCases.value = []
                isLoading.value = false
                return
            }
            console.log('獲取系統報修案件:', searchTypeParam)
            let url = '/dashboard/unit-repair';
            if(hasTodoPermission.value){
                url = '/dashboard/system-repair';
            }else if(hasRepairTodoPermission.value){
                url = '/dashboard/personal-process-repair';
            }
            const response = await axiosClient.get(url, {
                params: { 
                    searchType: searchTypeParam
                }
            })
            
            console.log('系統報修 API 響應:', response.data)
            
            if (response.data.statusCode === 200 && response.data.data) {
                // 更新搜尋類型
                searchType.value = response.data.data.searchType || searchTypeParam
                
                // 格式化案件數據
                const formattedCases = formatRepairCaseData(response.data.data.repairs || [])
                urgentCases.value = formattedCases
                
                console.log('系統報修案件已格式化:', formattedCases)
                console.log('當前搜尋類型:', searchType.value)

                monthlyStats.value.completedCases = response.data.data.completing_repair || 0
                monthlyStats.value.newReports = response.data.data.remaining_repair || 0
                monthlyStats.value.totalRepairs = response.data.data.all_repair || 0
                monthlyStats.value.completionRate = response.data.data.rate * 100 || 0


            } else {
                console.warn('系統報修 API 響應狀態異常:', response.data)
                urgentCases.value = []
            }
            
        } catch (error) {
            console.error('獲取系統報修案件失敗:', error)
            
            // API 失敗時使用空數組
            urgentCases.value = []
        } finally {
            isLoading.value = false
        }
    }
    
    // 切換系統報修案件搜尋類型
    const switchRepairSearchType = async (newSearchType) => {
        if (newSearchType === searchType.value) return
        
        console.log('切換系統報修搜尋類型:', searchType.value, '->', newSearchType)
        await fetchSystemRepairCases(newSearchType)
    }
    
    // 獲取緊急案件列表 (保留原有方法，但改為調用新的 API)
    const fetchUrgentCases = async () => {
        await fetchSystemRepairCases('All')
    }
    
    // 初始化儀表板數據
    const initializeDashboard = async () => {
        try {
            await Promise.all([
                fetchEsgStats(),
                fetchMonthlyStats(),
                fetchRepairTrendData(),
                fetchCaseProcessingData(),
                fetchSystemRepairCases('Remaining') // 預設載入所有案件
            ])
            console.log('儀表板數據初始化完成')
        } catch (error) {
            console.error('儀表板數據初始化失敗:', error)
        }
    }
    
    return {
        // 狀態
        isLoading: computed(() => isLoading.value),
        esgStats: computed(() => esgStats.value),
        monthlyStats: computed(() => monthlyStats.value),
        repairTrendData: computed(() => repairTrendData.value),
        caseProcessingData: computed(() => caseProcessingData.value),
        urgentCases: computed(() => urgentCases.value),
        searchType: computed(() => searchType.value),
        currentHeaderColor,
        chartLabels,
        
        // 方法
        fetchEsgStats,
        fetchMonthlyStats,
        fetchRepairTrendData,
        fetchCaseProcessingData,
        fetchSystemRepairCases,
        switchRepairSearchType,
        fetchUrgentCases,
        initializeDashboard
    }
})
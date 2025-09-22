import { defineStore } from 'pinia'
import { ref } from 'vue'
import axiosClient from '../axios' // 引入 axios 實例

export const useLogStore = defineStore('log', () => {
    const logs = ref(null) // 日誌列表
    const isLoading = ref(false)
    const isInitialized = ref(false) // 標記是否已初始化

    // 日誌等級選項
    const logLevels = ref([
        { id: '1', name: '一般記錄' },
        { id: '2', name: '警告紀錄' },
        { id: '3', name: '系統錯誤' }
    ])

    // 日誌操作類型選項
    const logActions = ref([])
    const isLoadingActions = ref(false)

    // 獲取日誌操作類型選項
    const fetchLogActions = async () => {
        try {
            isLoadingActions.value = true
            console.log('開始獲取日誌操作類型...')
            
            const response = await axiosClient.get('/backend/log/action')
            console.log('日誌操作類型API回應:', response.data)
            
            if (response.data && response.data.data) {
                logActions.value = response.data.data
                console.log('日誌操作類型設定完成:', logActions.value)
            } else {
                logActions.value = []
                console.warn('API回應格式異常，設為空陣列')
            }
            
            return response.data
        } catch (error) {
            console.error('獲取日誌操作類型失敗:', error)
            logActions.value = []
            throw error
        } finally {
            isLoadingActions.value = false
        }
    }

    // 根據選擇的模組獲取對應的操作選項
    const getActionsByCategory = (category) => {
        if (!logActions.value || !category) return []
        
        const categoryData = logActions.value.find(item => item.category === category)
        return categoryData ? categoryData.action : []
    }

    // 獲取所有模組選項
    const getCategories = () => {
        if (!logActions.value) return []
        return logActions.value.map(item => item.category)
    }

    // 獲取日誌列表
    const fetchLogs = async (searchForm = {
        credential: '',
        ip: '',
        requestStatusCode: '',
        responseStatusCode: '',
        level: '',
        logMsgCode: '',
        startAt: '',
        endAt: '',
        log_category: '',
        log_action: ''
    }, column = "created_at", sortDirection = "desc", limit = 10, page = 1) => {
        try {
            console.log('搜尋參數:', searchForm);
            console.log('時間範圍:', searchForm.startAt, searchForm.endAt);
            console.log(column, sortDirection, limit, page);
            
            const params = {};
            
            // 只添加有值的參數
            if (searchForm.credential) params.credential = searchForm.credential;
            if (searchForm.ip) params.ip = searchForm.ip;
            if (searchForm.requestStatusCode) params.requestStatusCode = searchForm.requestStatusCode;
            if (searchForm.responseStatusCode) params.responseStatusCode = searchForm.responseStatusCode;
            if (searchForm.level) params.level = searchForm.level;
            if (searchForm.logMsgCode) params.logMsgCode = searchForm.logMsgCode;
            if (searchForm.log_category) params.log_category = searchForm.log_category;
            if (searchForm.log_action) params.log_action = searchForm.log_action;
            
            // 處理開始時間：設為當天開始
            if (searchForm.startAt) {
                const startDate = new Date(searchForm.startAt);
                startDate.setHours(0, 0, 0, 0);
                params.startAt = startDate.toISOString();
            }
            
            // 處理結束時間：設為當天的 23:59:59
            if (searchForm.endAt) {
                const endDate = new Date(searchForm.endAt);
                endDate.setHours(23, 59, 59, 999);
                params.endAt = endDate.toISOString();
            }
            
            params.sortBy = column; // 排序欄位
            params.sortOrder = sortDirection.toUpperCase(); // 排序方向
            params.pageSize = limit; // 每頁數量
            params.page = page; // 頁數
            
            console.log('API 參數:', params);
            
            const response = await axiosClient.get('/backend/log', { params });
            console.log('API 回應:', response.data);
            logs.value = response.data;
            
            return response.data;
        } catch (error) {
            console.error('獲取日誌列表失敗:', error);
            throw error;
        }
    }

    // 獲取日誌等級文字
    const getLevelText = (level) => {
        const levelMap = {
            '1': '一般記錄',
            '2': '警告紀錄', 
            '3': '系統錯誤'
        }
        return levelMap[level] || level
    }

    // 獲取日誌等級樣式類別
    const getLevelClass = (level) => {
        const levelClassMap = {
            '1': 'level-info',
            '2': 'level-warning',
            '3': 'level-error'
        }
        return levelClassMap[level] || ''
    }
    const fetchLogById = async (id) => {
        try {
            isLoading.value = true
            console.log('獲取日誌詳情:', id)
            
            const response = await axiosClient.get(`/backend/log/${id}`)
            console.log('日誌詳情API回應:', response.data)
            
            if (response.data && response.data.data) {
                return response.data.data
            } else {
                throw new Error('API回應格式異常')
            }
        } catch (error) {
            console.error('獲取日誌詳情失敗:', error)
            throw error
        } finally {
            isLoading.value = false
        }
    }

    return {
        logs,
        isLoading,
        isInitialized,
        logLevels,
        logActions,
        isLoadingActions,
        fetchLogs,
        fetchLogActions,
        getActionsByCategory,
        getCategories,
        getLevelText,
        getLevelClass,
        fetchLogById
    }
})
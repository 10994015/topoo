import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axiosClient from '../axios' // 引入 axios 實例

export const useFaqStore = defineStore('faq', () => {
    // 狀態
    const faqList = ref([]) // FAQ 列表
    const faqDetails = ref(new Map()) // 前台 FAQ 詳細內容 Map<faqId, detailContent>
    const backendFaqDetails = ref(new Map()) // 後台 FAQ 詳細內容 Map<faqId, detailContent>
    const isLoading = ref(false)
    const isLoadingDetail = ref(new Set()) // 正在載入詳細內容的 FAQ ID
    
    // 後台管理額外狀態
    const backendFaqList = ref([]) // 後台FAQ列表
    const totalItems = ref(0) // 總筆數
    const totalPages = ref(0) // 總頁數
    const currentPage = ref(1) // 當前頁數
    const isSearching = ref(false) // 搜尋狀態

    // 新增：分類選項相關狀態
    const categoryOptions = ref([]) // 分類選項列表
    const isLoadingCategories = ref(false) // 載入分類狀態

    // 計算屬性 - 獲取特定 FAQ 的詳細內容
    const getFaqDetail = computed(() => {
        return (faqId, isBackend = false) => {
            const cache = isBackend ? backendFaqDetails.value : faqDetails.value
            return cache.get(faqId) || null
        }
    })

    // 計算屬性 - 檢查是否正在載入詳細內容
    const isLoadingFaqDetail = computed(() => {
        return (faqId) => {
            return isLoadingDetail.value.has(faqId)
        }
    })

    /**
     * 獲取分類選項列表 (第一層FAQ作為分類)
     * 使用新的 /api/fqa/{id} API
     */
    const fetchCategoryOptions = async () => {
        try {
            isLoadingCategories.value = true
            
            console.log('開始獲取分類選項...')
            
            // 先取得所有第一層FAQ列表
            const response = await axiosClient.get('/fqa/layer/1', { 
                params: { 
                    status: 'Open' // 只取啟用的分類
                } 
            })
            
            console.log('第一層FAQ列表回應:', response.data)
            
            const firstLayerFaqs = response.data.data || []
            
            // 使用新的API逐一獲取每個分類的詳細資料
            const categoryPromises = firstLayerFaqs.map(async (faq) => {
                try {
                    const detailResponse = await axiosClient.get(`/fqa/${faq.id}`)
                    return detailResponse.data.data.data // 根據API文檔的嵌套結構
                } catch (error) {
                    console.error(`獲取分類 ${faq.id} 詳細資料失敗:`, error)
                    return null
                }
            })
            
            // 等待所有請求完成
            const categoryDetails = await Promise.all(categoryPromises)
            
            // 過濾掉失敗的請求，只保留有效的分類
            categoryOptions.value = categoryDetails
                .filter(detail => detail && detail.status === 'Open')
                .map(detail => ({
                    id: detail.id,
                    question: detail.question,
                    answer: detail.answer,
                    status: detail.status,
                    sequence: detail.sequence,
                    created_at: detail.created_at,
                    updated_at: detail.updated_at
                }))
            
            console.log('載入的分類選項:', categoryOptions.value)
            
            return {
                success: true,
                data: categoryOptions.value
            }
            
        } catch (error) {
            console.error('載入分類選項失敗:', error)
            categoryOptions.value = []
            
            return {
                success: false,
                message: error.response?.data?.message || '載入分類選項失敗',
                error: error.response?.data || error.message
            }
        } finally {
            isLoadingCategories.value = false
        }
    }

    /**
     * 根據分類ID獲取分類詳細資料
     * @param {string} categoryId - 分類ID
     */
    const fetchCategoryDetail = async (categoryId) => {
        try {
            console.log(`獲取分類 ${categoryId} 詳細資料`)
            
            const response = await axiosClient.get(`/fqa/${categoryId}`)
            console.log(`分類 ${categoryId} 詳細資料回應:`, response.data)
            
            return {
                success: true,
                data: response.data.data.data // 根據API文檔的嵌套結構
            }
            
        } catch (error) {
            console.error(`獲取分類 ${categoryId} 詳細資料失敗:`, error)
            
            return {
                success: false,
                message: error.response?.data?.message || '獲取分類詳細資料失敗',
                error: error.response?.data || error.message
            }
        }
    }

    /**
     * 根據分類ID獲取分類名稱
     * @param {string} categoryId - 分類ID
     */
    const getCategoryName = (categoryId) => {
        const category = categoryOptions.value.find(cat => cat.id === categoryId)
        return category ? category.question : '未分類'
    }

    /**
     * 獲取 FAQ 列表 (前台使用，固定使用 layer = 1)
     * @param {string} question - 搜尋關鍵字 (可選)
     */
    const fetchFaqList = async (question = '') => {
        try {
            isLoading.value = true
            
            const params = {}
            
            // 如果有搜尋關鍵字，加入參數
            if (question && question.trim()) {
                params.question = question.trim()
            }
            
            console.log('獲取 FAQ 列表參數:', params)
            
            // 固定使用 layer 1
            const response = await axiosClient.get('/fqa/layer/1', { params })
            console.log('FAQ 列表回應:', response.data)
            
            // 根據 API 文檔，資料在 response.data.data 中
            faqList.value = response.data.data || []
            
            return {
                success: true,
                data: response.data.data || []
            }
            
        } catch (error) {
            console.error('獲取 FAQ 列表失敗:', error)
            
            // 提供預設的空資料結構
            faqList.value = []
            
            return {
                success: false,
                message: error.response?.data?.message || '獲取資料失敗',
                error: error.response?.data || error.message
            }
        } finally {
            isLoading.value = false
        }
    }

    /**
     * 獲取後台 FAQ 列表 (支援完整搜尋參數)
     * @param {Object} searchForm - 搜尋表單
     * @param {string} sortColumn - 排序欄位
     * @param {string} sortDirection - 排序方向
     * @param {number} pageSize - 每頁筆數
     * @param {number} page - 頁碼
     */
    const fetchBackendFaqList = async (
        searchForm = { question: '', status: '', startAt: '', endAt: '' },
        sortColumn = 'sequence',
        sortDirection = 'asc',
        pageSize = 10,
        page = 1
    ) => {
        try {
            isSearching.value = true
            
            const params = {
                sortBy: sortColumn,
                sortOrder: sortDirection.toUpperCase(),
                pageSize: pageSize,
                page: page
            }
            console.log(params);
            
            // 添加搜尋條件
            if (searchForm.question && searchForm.question.trim()) {
                params.question = searchForm.question.trim()
            }
            if (searchForm.status) {
                params.status = searchForm.status
            }
            if (searchForm.startAt) {
                const startDate = new Date(searchForm.startAt)
                startDate.setHours(0, 0, 0, 0)
                params.startAt = startDate.toISOString()
            }
            if (searchForm.endAt) {
                const endDate = new Date(searchForm.endAt)
                endDate.setHours(23, 59, 59, 999)
                params.endAt = endDate.toISOString()
            }

            
            console.log('獲取後台 FAQ 列表參數:', params)
            
            // 固定使用 layer 1
            const response = await axiosClient.get('/backend/fqa/layer/1', { params })
            console.log('後台 FAQ 列表回應:', response.data)
            
            // 更新狀態
            backendFaqList.value = response.data.data.data || []
            totalItems.value = response.data.data.total || 0
            totalPages.value = response.data.data.totalPages || 0
            currentPage.value = response.data.data.page || page
            
            return {
                success: true,
                data: response.data.data
            }
            
        } catch (error) {
            console.error('獲取後台 FAQ 列表失敗:', error)
            
            // 提供預設的空資料結構
            backendFaqList.value = []
            totalItems.value = 0
            totalPages.value = 0
            
            return {
                success: false,
                message: error.response?.data?.message || '獲取資料失敗',
                error: error.response?.data || error.message
            }
        } finally {
            isSearching.value = false
        }
    }

    /**
     * 獲取特定 FAQ 的詳細內容 (包含 sub_fqas)
     * @param {string} faqId - FAQ ID
     * @param {boolean} useBackendApi - 是否使用後台API
     */
    const fetchFaqDetail = async (faqId, useBackendApi = false) => {
        try {
            // 選擇對應的快取
            const cache = useBackendApi ? backendFaqDetails.value : faqDetails.value
            
            // 如果已經有詳細內容，直接返回
            if (cache.has(faqId)) {
                console.log(`使用 ${useBackendApi ? '後台' : '前台'} 快取的 FAQ ${faqId} 詳細內容`)
                return {
                    success: true,
                    data: cache.get(faqId)
                }
            }

            // 添加到載入中的集合
            isLoadingDetail.value.add(faqId)
            
            console.log(`獲取 ${useBackendApi ? '後台' : '前台'} FAQ ${faqId} 詳細內容`)
            
            // 根據是否使用後台API選擇不同的endpoint
            const apiPath = useBackendApi ? `/backend/fqa/${faqId}` : `/fqa/${faqId}`
            const response = await axiosClient.get(apiPath)
            console.log(`FAQ ${faqId} 詳細內容回應:`, response.data)
            
            // 根據 API 文檔，詳細內容在 response.data.data.data 中 (嵌套結構)
            let detailData = response.data.data.data || response.data.data
            
            // 前台 API 需要過濾停用狀態
            if (!useBackendApi) {
                // 只保留啟用的 sub_fqas
                if (detailData.sub_fqas && Array.isArray(detailData.sub_fqas)) {
                    detailData = {
                        ...detailData,
                        sub_fqas: detailData.sub_fqas.filter(sub => sub.status === 'Open')
                    }
                    console.log(`前台過濾後的 sub_fqas 數量:`, detailData.sub_fqas.length)
                }
            }
            
            // 將詳細內容存入對應的快取 (包含 sub_fqas)
            cache.set(faqId, detailData)
            console.log(`已存入 ${useBackendApi ? '後台' : '前台'} 快取`)
            
            return {
                success: true,
                data: detailData
            }
            
        } catch (error) {
            console.error(`獲取 FAQ ${faqId} 詳細內容失敗:`, error)
            
            return {
                success: false,
                message: error.response?.data?.message || '獲取詳細資料失敗',
                error: error.response?.data || error.message
            }
        } finally {
            // 從載入中的集合移除
            isLoadingDetail.value.delete(faqId)
        }
    }

    /**
     * 新增 FAQ
     * @param {Object} faqData - FAQ 資料
     */
    const createFaq = async (faqData) => {
        try {
            console.log('新增 FAQ 資料:', faqData)
            
            const response = await axiosClient.post('/backend/fqa', faqData)
            console.log('新增 FAQ 回應:', response.data)
            
            // 清除相關快取
            if (faqData.parentId) {
                clearFaqDetailCache(faqData.parentId, true) // 清除後台快取
            }
            
            return {
                success: true,
                data: response.data.data || response.data,
                message: response.data.message || '新增成功'
            }
        } catch (error) {
            console.error('新增 FAQ 失敗:', error)
            
            let errorMessage = '新增失敗'
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message
            } else if (error.message) {
                errorMessage = error.message
            }
            
            return {
                success: false,
                message: errorMessage,
                error: error.response?.data || error.message
            }
        }
    }

    /**
     * 更新 FAQ
     * @param {string} faqId - FAQ ID
     * @param {Object} faqData - FAQ 資料
     */
    const updateFaq = async (faqId, faqData) => {
        try {
            console.log(`更新 FAQ ${faqId} 資料:`, faqData)
            
            const response = await axiosClient.patch(`/backend/fqa/${faqId}`, faqData)
            console.log('更新 FAQ 回應:', response.data)
            
            // 清除前後台快取以確保資料一致性
            clearFaqDetailCache(faqId, false) // 清除前台快取
            clearFaqDetailCache(faqId, true)  // 清除後台快取
            
            // 如果有 parentId，也清除父項目的快取
            if (faqData.parentId) {
                clearFaqDetailCache(faqData.parentId, false)
                clearFaqDetailCache(faqData.parentId, true)
            }
            
            return {
                success: true,
                data: response.data.data || response.data,
                message: response.data.message || '更新成功'
            }
        } catch (error) {
            console.error(`更新 FAQ ${faqId} 失敗:`, error)
            
            let errorMessage = '更新失敗'
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message
            } else if (error.message) {
                errorMessage = error.message
            }
            
            return {
                success: false,
                message: errorMessage,
                error: error.response?.data || error.message
            }
        }
    }

    /**
     * 刪除 FAQ
     * @param {string} faqId - FAQ ID
     */
    const deleteFaq = async (faqId) => {
        try {
            console.log(`刪除 FAQ ${faqId}`)
            
            const response = await axiosClient.delete(`/backend/fqa/${faqId}`)
            console.log('刪除 FAQ 回應:', response.data)
            
            // 清除前後台快取
            clearFaqDetailCache(faqId, false)
            clearFaqDetailCache(faqId, true)
            
            return {
                success: true,
                message: response.data.message || '刪除成功'
            }
        } catch (error) {
            console.error(`刪除 FAQ ${faqId} 失敗:`, error)
            
            let errorMessage = '刪除失敗'
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message
            } else if (error.message) {
                errorMessage = error.message
            }
            
            return {
                success: false,
                message: errorMessage,
                error: error.response?.data || error.message
            }
        }
    }

    /**
     * 切換 FAQ 狀態
     * @param {string} faqId - FAQ ID
     * @param {string} status - 新狀態 (Open/Invalid)
     */
    const toggleFaqStatus = async (faqId, status) => {
        try {
            console.log(`切換 FAQ ${faqId} 狀態為:`, status)
            
            const response = await axiosClient.patch(`/backend/fqa/${faqId}/status`, { status })
            console.log('切換 FAQ 狀態回應:', response.data)
            
            // 清除前後台快取以確保資料一致性
            clearFaqDetailCache(faqId, false)
            clearFaqDetailCache(faqId, true)
            
            return {
                success: true,
                data: response.data.data || response.data,
                message: response.data.message || '狀態更新成功'
            }
        } catch (error) {
            console.error(`切換 FAQ ${faqId} 狀態失敗:`, error)
            
            let errorMessage = '狀態更新失敗'
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message
            } else if (error.message) {
                errorMessage = error.message
            }
            
            return {
                success: false,
                message: errorMessage,
                error: error.response?.data || error.message
            }
        }
    }

    /**
     * 批量操作 FAQ
     * @param {Array} faqIds - FAQ ID 陣列
     * @param {string} action - 操作類型 (delete/enable/disable)
     */
    const batchUpdateFaqs = async (faqIds, action) => {
        try {
            console.log(`批量操作 FAQ:`, { faqIds, action })
            
            const response = await axiosClient.post('/backend/fqa/batch', { 
                ids: faqIds, 
                action: action 
            })
            console.log('批量操作 FAQ 回應:', response.data)
            
            // 清除相關快取
            faqIds.forEach(id => {
                clearFaqDetailCache(id, false)
                clearFaqDetailCache(id, true)
            })
            
            return {
                success: true,
                data: response.data.data || response.data,
                message: response.data.message || '批量操作成功'
            }
        } catch (error) {
            console.error('批量操作 FAQ 失敗:', error)
            
            let errorMessage = '批量操作失敗'
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message
            } else if (error.message) {
                errorMessage = error.message
            }
            
            return {
                success: false,
                message: errorMessage,
                error: error.response?.data || error.message
            }
        }
    }

    /**
     * 搜尋 FAQ (前台使用)
     * @param {string} keyword - 搜尋關鍵字
     */
    const searchFaq = async (keyword) => {
        return await fetchFaqList(keyword)
    }

    /**
     * 更新後台列表中特定FAQ的sub_fqas
     * @param {string} faqId - FAQ ID
     * @param {Array} subFqas - 子問題陣列
     */
    const updateFaqSubFqas = (faqId, subFqas) => {
        const faqIndex = backendFaqList.value.findIndex(faq => faq.id === faqId)
        if (faqIndex !== -1) {
            backendFaqList.value[faqIndex].sub_fqas = subFqas || []
        }
    }

    /**
     * 更新 FAQ 順序
     * @param {string} faqId - FAQ ID
     * @param {number} newSequence - 新順序
     */
    const updateFaqSequence = async (faqId, newSequence) => {
        try {
            console.log(`更新 FAQ ${faqId} 順序為:`, newSequence)
            
            const response = await axiosClient.patch(`/backend/fqa/${faqId}/sequence`, { sequence: newSequence })
            console.log('更新 FAQ 順序回應:', response.data)
            
            // 清除相關快取
            clearFaqDetailCache(faqId, false)
            clearFaqDetailCache(faqId, true)
            
            return {
                success: true,
                data: response.data.data || response.data,
                message: response.data.message || '順序更新成功'
            }
        } catch (error) {
            console.error(`更新 FAQ ${faqId} 順序失敗:`, error)
            
            let errorMessage = '順序更新失敗'
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message
            } else if (error.message) {
                errorMessage = error.message
            }
            
            return {
                success: false,
                message: errorMessage,
                error: error.response?.data || error.message
            }
        }
    }

    /**
     * 清除特定 FAQ 的詳細內容快取
     * @param {string} faqId - FAQ ID
     * @param {boolean} isBackend - 是否為後台快取
     */
    const clearFaqDetailCache = (faqId, isBackend = false) => {
        const cache = isBackend ? backendFaqDetails.value : faqDetails.value
        const cacheType = isBackend ? '後台' : '前台'
        
        if (cache.has(faqId)) {
            cache.delete(faqId)
            console.log(`已清除 ${cacheType} FAQ ${faqId} 的詳細內容快取`)
        }
        
        isLoadingDetail.value.delete(faqId)
    }

    /**
     * 清除所有快取
     */
    const clearAllCache = () => {
        faqList.value = []
        backendFaqList.value = []
        faqDetails.value.clear()
        backendFaqDetails.value.clear() // 清除後台快取
        isLoadingDetail.value.clear()
        categoryOptions.value = []
        totalItems.value = 0
        totalPages.value = 0
        currentPage.value = 1
        console.log('已清除所有 FAQ 快取 (包含前後台)')
    }

    /**
     * 重置後台搜尋狀態
     */
    const resetBackendSearch = () => {
        backendFaqList.value = []
        totalItems.value = 0
        totalPages.value = 0
        currentPage.value = 1
        isSearching.value = false
    }

    // 返回 store 的狀態和方法
    return {
        // 原有狀態
        faqList,
        faqDetails,
        backendFaqDetails, // 新增：後台快取
        isLoading,
        isLoadingDetail,
        
        // 後台管理狀態
        backendFaqList,
        totalItems,
        totalPages,
        currentPage,
        isSearching,
        
        // 分類相關狀態
        categoryOptions,
        isLoadingCategories,
        
        // 計算屬性
        getFaqDetail,
        isLoadingFaqDetail,
        
        // 原有方法
        fetchFaqList,
        fetchFaqDetail,
        searchFaq,
        clearFaqDetailCache,
        clearAllCache,
        
        // 後台管理方法
        fetchBackendFaqList,
        createFaq,
        updateFaq,
        deleteFaq,
        toggleFaqStatus,
        updateFaqSequence,
        batchUpdateFaqs,
        updateFaqSubFqas,
        resetBackendSearch,
        
        // 分類相關方法
        fetchCategoryOptions,
        fetchCategoryDetail,
        getCategoryName
    }
})
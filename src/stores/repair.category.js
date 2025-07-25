import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axiosClient from '../axios' // 引入 axios 實例

export const useCategoryStore = defineStore('category', () => {
    // 狀態
    const categories = ref(null) // 類別列表
    const categoryReasons = ref(new Map()) // 每個類別的原因列表 Map<categoryId, reasonData>
    const isLoading = ref(false)
    const isInitialized = ref(false)

    // 計算屬性 - 獲取特定類別的原因
    const getCategoryReasons = computed(() => {
        return (categoryId) => {
            const reasonData = categoryReasons.value.get(categoryId)
            console.log(reasonData);
            
            return reasonData?.data.data || []
        }
    })

    // 計算屬性 - 獲取特定類別原因的總頁數
    const getReasonTotalPages = computed(() => {
        return (categoryId) => {
            const reasonData = categoryReasons.value.get(categoryId)
            return reasonData?.data.totalPages || 0
        }
    })

    // 計算屬性 - 獲取特定類別原因的總數量
    const getReasonTotal = computed(() => {
        return (categoryId) => {
            const reasonData = categoryReasons.value.get(categoryId)
            return reasonData?.data.total || 0
        }
    })

    /**
     * 獲取類別列表
     * @param {Object} searchForm - 搜尋表單
     * @param {string} column - 排序欄位
     * @param {string} sortDirection - 排序方向
     * @param {number} limit - 每頁數量
     * @param {number} page - 頁碼
     */
    const fetchCategories = async (
        searchForm = { name: '' },
        column = 'sequence',
        sortDirection = 'asc',
        limit = 10,
        page = 1
    ) => {
        try {
            isLoading.value = true
            
            const params = {}
            
            // 只添加有值的參數
            if (searchForm.name && searchForm.name.trim()) {
                params.name = searchForm.name.trim()
            }
            
            // 排序和分頁參數
            params.sortBy = column
            params.sortOrder = sortDirection.toUpperCase()
            params.pageSize = limit
            params.page = page
            
            console.log(params.sortBy);
            
            console.log('獲取類別列表參數:', params)
            
            const response = await axiosClient.get('/backend/enum/repair-category', { params })
            console.log('類別列表回應:', response.data)
            
            categories.value = response.data
            
        } catch (error) {
            console.error('獲取類別列表失敗:', error)
            // 提供預設的空資料結構
            categories.value = {
                data: [],
                total: 0,
                totalPages: 0,
                currentPage: page
            }
            throw error
        } finally {
            isLoading.value = false
        }
    }

    /**
     * 獲取特定類別的原因列表
     * @param {string} categoryId - 類別ID
     * @param {string} column - 排序欄位
     * @param {string} sortDirection - 排序方向
     * @param {number} limit - 每頁數量
     * @param {number} page - 頁碼
     */
    const fetchReasons = async (
        categoryId,
        column = 'updated_at',
        sortDirection = 'desc',
        limit = 5,
        page = 1
    ) => {
        try {
            const params = {
                sortBy: column,
                sortOrder: sortDirection.toUpperCase(),
                pageSize: limit,
                page: page
            }
            if(categoryId) { params.parentId = categoryId }
            
            console.log(`獲取類別 ${categoryId} 的原因列表參數:`, params)
            
            const response = await axiosClient.get('/backend/enum/repair-reason', { params })
            console.log(`類別 ${categoryId} 原因列表回應:`, response.data)
            
            categoryReasons.value.set(categoryId, response.data)

            console.log(categoryReasons.value);
            
            
        } catch (error) {
            console.error(`獲取類別 ${categoryId} 原因列表失敗:`, error)
            // 提供預設的空資料結構
            categoryReasons.value.set(categoryId, {
                data: [],
                total: 0,
                totalPages: 0,
                currentPage: page
            })
            throw error
        }
    }

    /**
     * 新增類別
     * @param {Object} categoryData - 類別資料
     */
    const createCategory = async (categoryData) => {
        try {
            console.log('新增類別資料:', categoryData)
            
            const response = await axiosClient.post('/backend/enum/repair-category', categoryData)
            console.log('新增類別回應:', response.data)
            
            return {
                success: true,
                data: response.data.data || response.data,
                message: response.data.message || '新增成功'
            }
        } catch (error) {
            console.error('新增類別失敗:', error)
            
            // 處理錯誤回應
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
     * 更新類別
     * @param {string} categoryId - 類別ID
     * @param {Object} categoryData - 類別資料
     */
    const updateCategory = async (categoryId, categoryData) => {
        try {
            console.log(`更新類別 ${categoryId} 資料:`, categoryData)
            
            const response = await axiosClient.patch(`/backend/enum/repair-category/${categoryId}`, categoryData)
            console.log('更新類別回應:', response.data)
            
            return {
                success: true,
                data: response.data.data || response.data,
                message: response.data.message || '更新成功'
            }
        } catch (error) {
            console.error(`更新類別 ${categoryId} 失敗:`, error)
            
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
     * 刪除類別
     * @param {string} categoryId - 類別ID
     */
    const deleteCategory = async (categoryId) => {
        try {
            console.log(`刪除類別 ${categoryId}`)
            
            const response = await axiosClient.delete(`/backend/enum/repair-category/${categoryId}`)
            console.log('刪除類別回應:', response.data)
            
            // 同時清除該類別的原因快取
            categoryReasons.value.delete(categoryId)
            
            return {
                success: true,
                message: response.data.message || '刪除成功'
            }
        } catch (error) {
            console.error(`刪除類別 ${categoryId} 失敗:`, error)
            
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
     * 獲取單一類別詳細資料
     * @param {string} categoryId - 類別ID
     */
    const fetchCategoryDetail = async (categoryId) => {
        try {
            console.log(`獲取類別 ${categoryId} 詳細資料`)
            
            const params = {
                enumId: categoryId
            }
            
            const response = await axiosClient.get('/backend/enum/repair-category', { params })
            console.log('類別詳細資料回應:', response.data)
            
            // 從列表中找到對應的類別
            const category = response.data.data.data[0]|| []
            console.log(category);
            
            if (category) {
                return {
                    success: true,
                    data: category
                }
            } else {
                return {
                    success: false,
                    message: '找不到指定的類別'
                }
            }
        } catch (error) {
            console.error(`獲取類別 ${categoryId} 詳細資料失敗:`, error)
            
            return {
                success: false,
                message: error.response?.data?.message || '獲取資料失敗',
                error: error.response?.data || error.message
            }
        }
    }
    // 置頂 /backend/enum/repair-category/{id}/sequence
    const moveCategoryToTop = async (categoryId) => {
        console.log(`將類別 ${categoryId} 置頂`)
        try{
            const response = await axiosClient.patch(`/backend/enum/repair-category/${categoryId}/sequence`)

            console.log(response.data);

            if (response.data.statusCode === 200) {
                console.log(`類別 ${categoryId} 已成功置頂`)
                return {
                    success: true,
                    message: response.data.message || '置頂成功'
                }
            } else {
                console.error(`類別 ${categoryId} 置頂失敗:`, response.data.message)
                return {
                    success: false,
                    message: response.data.message || '置頂失敗',
                    error: response.data
                }
            }
        } catch (error) {
            console.error(`類別 ${categoryId} 置頂失敗:`, error)
            
            let errorMessage = '置頂失敗'
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
     * 新增原因
     * @param {string} categoryId - 類別ID
     * @param {Object} reasonData - 原因資料
     */
    const createReason = async (categoryId, reasonData) => {
        try {
            console.log(`新增類別 ${categoryId} 的原因:`, reasonData)
            
            // 確保包含 parentId
            const data = {
                ...reasonData,
                parentId: categoryId
            }

            console.log(data);
            
            
            const response = await axiosClient.post('/backend/enum/repair-reason', data)
            console.log('新增原因回應:', response.data)
            
            return {
                success: true,
                data: response.data.data || response.data,
                message: response.data.message || '新增成功'
            }
        } catch (error) {
            console.error(`新增類別 ${categoryId} 原因失敗:`, error)
            
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
     * 更新原因
     * @param {string} reasonId - 原因ID
     * @param {Object} reasonData - 原因資料
     */
    const updateReason = async (reasonId, reasonData) => {
        try {
            console.log(`更新原因 ${reasonId} 資料:`, reasonData)
            
            const response = await axiosClient.patch(`/backend/enum/repair-reason/${reasonId}`, reasonData)
            console.log('更新原因回應:', response.data)
            
            return {
                success: true,
                data: response.data.data || response.data,
                message: response.data.message || '更新成功'
            }
        } catch (error) {
            console.error(`更新原因 ${reasonId} 失敗:`, error)
            
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
     * 刪除原因
     * @param {string} reasonId - 原因ID
     * @param {string} categoryId - 類別ID (用於清除快取)
     */
    const deleteReason = async (reasonId, categoryId = null) => {
        try {
            console.log(`刪除原因 ${reasonId}`)
            
            const response = await axiosClient.delete(`/backend/enum/repair-reason/${reasonId}`)
            console.log('刪除原因回應:', response.data)
            
            // 如果提供了 categoryId，清除該類別的原因快取
            if (categoryId) {
                categoryReasons.value.delete(categoryId)
            }
            
            return {
                success: true,
                message: response.data.message || '刪除成功'
            }
        } catch (error) {
            console.error(`刪除原因 ${reasonId} 失敗:`, error)
            
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
     * 獲取單一原因詳細資料
     * @param {string} reasonId - 原因ID
     */
    const fetchReasonDetail = async (reasonId) => {
        try {
            console.log(`獲取原因 ${reasonId} 詳細資料`)
            const params = {
                enumId: reasonId
            }
            const response = await axiosClient.get(`/backend/enum/repair-reason`, { params })
            console.log('原因詳細資料回應:', response.data)
            
            return {
                success: true,
                data: response.data.data.data[0] || response.data.data[0]
            }
        } catch (error) {
            console.error(`獲取原因 ${reasonId} 詳細資料失敗:`, error)
            
            return {
                success: false,
                message: error.response?.data?.message || '獲取資料失敗',
                error: error.response?.data || error.message
            }
        }
    }

    // 置頂原因
    const moveReasonToTop = async (reasonId) => {
        try {
            console.log(`置頂原因 ${reasonId}`)
            const response = await axiosClient.patch(`/backend/enum/repair-reason/${reasonId}/sequence`)
            console.log('置頂原因回應:', response.data)
            
            return {
                success: true,
                message: response.data.message || '置頂成功'
            }
        } catch (error) {
            console.error(`置頂原因 ${reasonId} 失敗:`, error)
            
            let errorMessage = '置頂失敗'
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
     * 清除特定類別的原因快取
     * @param {string} categoryId - 類別ID
     */
    const clearCategoryReasonsCache = (categoryId) => {
        categoryReasons.value.delete(categoryId)
        console.log(`已清除類別 ${categoryId} 的原因快取`)
    }

    /**
     * 清除所有快取
     */
    const clearAllCache = () => {
        categories.value = null
        categoryReasons.value.clear()
        isInitialized.value = false
        console.log('已清除所有快取')
    }

    // 返回 store 的狀態和方法
    return {
        // 狀態
        categories,
        categoryReasons,
        isLoading,
        isInitialized,
        
        // 計算屬性
        getCategoryReasons,
        getReasonTotalPages,
        getReasonTotal,
        
        // 類別相關方法
        fetchCategories,
        createCategory,
        updateCategory,
        deleteCategory,
        fetchCategoryDetail,
        moveCategoryToTop,
        
        // 原因相關方法
        fetchReasons,
        createReason,
        updateReason,
        deleteReason,
        fetchReasonDetail,
        moveReasonToTop,
        
        // 快取管理
        clearCategoryReasonsCache,
        clearAllCache
    }
})
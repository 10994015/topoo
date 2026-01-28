import { defineStore } from 'pinia'
import { ref } from 'vue'
import axiosClient from '../axios' // 引入 axios 實例

export const useUnitTagStore = defineStore('unitTag', () => {
    // 狀態
    const tags = ref(null) // 單位標籤列表
    const isLoading = ref(false)
    const isInitialized = ref(false)

    /**
     * 獲取單位標籤列表
     * @param {Object} searchForm - 搜尋表單
     * @param {string} column - 排序欄位
     * @param {string} sortDirection - 排序方向
     * @param {number} limit - 每頁數量
     * @param {number} page - 頁碼
     */
    const fetchTags = async (
        searchForm = { name: '', enumId: '', parentId: '' },
        column = 'sequence',
        sortDirection = 'asc',
        limit = 10,
        page = 1
    ) => {
        try {
            isLoading.value = true
            
            const params = {}
            
            // 只添加有值的參數
            if (searchForm.enumId && searchForm.enumId.trim()) {
                params.enumId = searchForm.enumId.trim()
            }
            
            if (searchForm.parentId && searchForm.parentId.trim()) {
                params.parentId = searchForm.parentId.trim()
            }
            
            if (searchForm.name && searchForm.name.trim()) {
                params.name = searchForm.name.trim()
            }
            
            // 排序和分頁參數
            params.sortBy = column
            params.sortOrder = sortDirection.toUpperCase()
            params.pageSize = limit
            params.page = page
            
            console.log('獲取單位標籤列表參數:', params)
            
            const response = await axiosClient.get('/backend/enum/unit-label', { params })
            console.log('單位標籤列表回應:', response.data)
            
            tags.value = response.data
            
        } catch (error) {
            console.error('獲取單位標籤列表失敗:', error)
            // 提供預設的空資料結構
            tags.value = {
                data: {
                    data: [],
                    total: 0,
                    totalPages: 0,
                    page: page,
                    pageSize: limit
                }
            }
            throw error
        } finally {
            isLoading.value = false
        }
    }

    /**
     * 新增單位標籤
     * @param {Object} tagData - 單位標籤資料 { name: string }
     */
    const createTag = async (tagData) => {
        try {
            console.log('新增單位標籤資料:', tagData)
            
            // 只傳送 name 參數
            const submitData = {
                name: tagData.name
            }
            
            const response = await axiosClient.post('/backend/enum/unit-label', submitData)
            console.log('新增單位標籤回應:', response.data)
            
            return {
                success: true,
                data: response.data.data || response.data,
                message: response.data.message || '新增成功'
            }
        } catch (error) {
            console.error('新增單位標籤失敗:', error)
            
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
     * 更新單位標籤
     * @param {string} tagId - 單位標籤ID
     * @param {Object} tagData - 單位標籤資料 { name: string }
     */
    const updateTag = async (tagId, tagData) => {
        try {
            console.log(`更新單位標籤 ${tagId} 資料:`, tagData)
            
            // 只傳送 name 參數
            const submitData = {
                name: tagData.name
            }
            
            const response = await axiosClient.patch(`/backend/enum/unit-label/${tagId}`, submitData)
            console.log('更新單位標籤回應:', response.data)
            
            return {
                success: true,
                data: response.data.data || response.data,
                message: response.data.message || '更新成功'
            }
        } catch (error) {
            console.error(`更新單位標籤 ${tagId} 失敗:`, error)
            
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
     * 刪除單位標籤
     * @param {string} tagId - 單位標籤ID
     */
    const deleteTag = async (tagId) => {
        try {
            console.log(`刪除單位標籤 ${tagId}`)
            
            const response = await axiosClient.delete(`/backend/enum/unit-label/${tagId}`)
            console.log('刪除單位標籤回應:', response.data)
            
            return {
                success: true,
                message: response.data.message || '刪除成功'
            }
        } catch (error) {
            console.error(`刪除單位標籤 ${tagId} 失敗:`, error)
            
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
     * 獲取單一單位標籤詳細資料
     * @param {string} tagId - 單位標籤ID
     */
    const fetchTagDetail = async (tagId) => {
        try {
            console.log(`獲取單位標籤 ${tagId} 詳細資料`)
            
            const params = {
                enumId: tagId
            }
            
            const response = await axiosClient.get('/backend/enum/unit-label', { params })
            console.log('單位標籤詳細資料回應:', response.data)
            
            // 從列表中找到對應的單位標籤
            const tag = response.data.data.data[0] || null
            console.log('找到的單位標籤:', tag)
            
            if (tag) {
                return {
                    success: true,
                    data: tag
                }
            } else {
                return {
                    success: false,
                    message: '找不到指定的單位標籤'
                }
            }
        } catch (error) {
            console.error(`獲取單位標籤 ${tagId} 詳細資料失敗:`, error)
            
            return {
                success: false,
                message: error.response?.data?.message || '獲取資料失敗',
                error: error.response?.data || error.message
            }
        }
    }

    /**
     * 置頂單位標籤
     * @param {string} tagId - 單位標籤ID
     */
    const handleMoveToTop = async (tagId) => {
        console.log(`將單位標籤 ${tagId} 置頂`)
        try {
            // 修正 API 路徑：使用 /sequence
            const response = await axiosClient.patch(`/backend/enum/unit-label/${tagId}/sequence`)

            console.log('置頂回應:', response.data)

            if (response.data.statusCode === 200) {
                console.log(`單位標籤 ${tagId} 已成功置頂`)
                return {
                    success: true,
                    message: response.data.message || '置頂成功'
                }
            } else {
                console.error(`單位標籤 ${tagId} 置頂失敗:`, response.data.message)
                return {
                    success: false,
                    message: response.data.message || '置頂失敗',
                    error: response.data
                }
            }
        } catch (error) {
            console.error(`單位標籤 ${tagId} 置頂失敗:`, error)
            
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
     * 清除所有快取
     */
    const clearAllCache = () => {
        tags.value = null
        isInitialized.value = false
        console.log('已清除所有單位標籤快取')
    }

    // 返回 store 的狀態和方法
    return {
        // 狀態
        tags,
        isLoading,
        isInitialized,
        
        // 單位標籤相關方法
        fetchTags,
        createTag,
        updateTag,
        deleteTag,
        fetchTagDetail,
        handleMoveToTop,
        
        // 快取管理
        clearAllCache
    }
})
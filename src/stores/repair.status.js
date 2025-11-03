import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axiosClient from '../axios' // 引入 axios 實例

export const useRepairStatusStore = defineStore('repairStatus', () => {
    // 狀態
    const statuses = ref(null) // 維修狀態列表
    const isLoading = ref(false)
    const isInitialized = ref(false)

    /**
     * 獲取維修狀態列表
     * @param {Object} searchForm - 搜尋表單
     * @param {string} column - 排序欄位
     * @param {string} sortDirection - 排序方向
     * @param {number} limit - 每頁數量
     * @param {number} page - 頁碼
     */
    const fetchStatuses = async (
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
            
            //console.log('獲取維修狀態列表參數:', params)
            
            const response = await axiosClient.get('/backend/enum/repair-status', { params })
            //console.log('維修狀態列表回應:', response.data)
            
            statuses.value = response.data
            
        } catch (error) {
            //console.error('獲取維修狀態列表失敗:', error)
            // 提供預設的空資料結構
            statuses.value = {
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
     * 新增維修狀態
     * @param {Object} statusData - 維修狀態資料
     */
    const createStatus = async (statusData) => {
        try {
            //console.log('新增維修狀態資料:', statusData)
            
            const response = await axiosClient.post('/backend/enum/repair-status', statusData)
            //console.log('新增維修狀態回應:', response.data)
            
            return {
                success: true,
                data: response.data.data || response.data,
                message: response.data.message || '新增成功'
            }
        } catch (error) {
            //console.error('新增維修狀態失敗:', error)
            
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
     * 更新維修狀態
     * @param {string} statusId - 維修狀態ID
     * @param {Object} statusData - 維修狀態資料
     */
    const updateStatus = async (statusId, statusData) => {
        try {
            //console.log(`更新維修狀態 ${statusId} 資料:`, statusData)
            
            const response = await axiosClient.patch(`/backend/enum/repair-status/${statusId}`, statusData)
            //console.log('更新維修狀態回應:', response.data)
            
            return {
                success: true,
                data: response.data.data || response.data,
                message: response.data.message || '更新成功'
            }
        } catch (error) {
            //console.error(`更新維修狀態 ${statusId} 失敗:`, error)
            
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
     * 刪除維修狀態
     * @param {string} statusId - 維修狀態ID
     */
    const deleteStatus = async (statusId) => {
        try {
            //console.log(`刪除維修狀態 ${statusId}`)
            
            const response = await axiosClient.delete(`/backend/enum/repair-status/${statusId}`)
            //console.log('刪除維修狀態回應:', response.data)
            
            return {
                success: true,
                message: response.data.message || '刪除成功'
            }
        } catch (error) {
            //console.error(`刪除維修狀態 ${statusId} 失敗:`, error)
            
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
     * 獲取單一維修狀態詳細資料
     * @param {string} statusId - 維修狀態ID
     */
    const fetchStatusDetail = async (statusId) => {
        try {
            //console.log(`獲取維修狀態 ${statusId} 詳細資料`)
            
            const params = {
                enumId: statusId
            }
            
            const response = await axiosClient.get('/backend/enum/repair-status', { params })
            //console.log('維修狀態詳細資料回應:', response.data)
            
            // 從列表中找到對應的維修狀態
            const status = response.data.data.data[0] || null
            //console.log('找到的維修狀態:', status);
            
            if (status) {
                return {
                    success: true,
                    data: status
                }
            } else {
                return {
                    success: false,
                    message: '找不到指定的維修狀態'
                }
            }
        } catch (error) {
            //console.error(`獲取維修狀態 ${statusId} 詳細資料失敗:`, error)
            
            return {
                success: false,
                message: error.response?.data?.message || '獲取資料失敗',
                error: error.response?.data || error.message
            }
        }
    }

    /**
     * 置頂維修狀態
     * @param {string} statusId - 維修狀態ID
     */
    const handleMoveToTop = async (statusId) => {
        //console.log(`將維修狀態 ${statusId} 置頂`)
        try {
            const response = await axiosClient.patch(`/backend/enum/repair-status/${statusId}/sequence`)

            //console.log('置頂回應:', response.data);

            if (response.data.statusCode === 200) {
                //console.log(`維修狀態 ${statusId} 已成功置頂`)
                return {
                    success: true,
                    message: response.data.message || '置頂成功'
                }
            } else {
                //console.error(`維修狀態 ${statusId} 置頂失敗:`, response.data.message)
                return {
                    success: false,
                    message: response.data.message || '置頂失敗',
                    error: response.data
                }
            }
        } catch (error) {
            //console.error(`維修狀態 ${statusId} 置頂失敗:`, error)
            
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
        statuses.value = null
        isInitialized.value = false
        //console.log('已清除所有維修狀態快取')
    }

    // 返回 store 的狀態和方法
    return {
        // 狀態
        statuses,
        isLoading,
        isInitialized,
        
        // 維修狀態相關方法
        fetchStatuses,
        createStatus,
        updateStatus,
        deleteStatus,
        fetchStatusDetail,
        handleMoveToTop,
        
        // 快取管理
        clearAllCache
    }
})
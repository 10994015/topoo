import { defineStore } from 'pinia'
import { ref } from 'vue'
import axiosClient from '../axios' // 引入 axios 實例

export const useReportStore = defineStore('report', () => {
    const isLoading = ref(false)

    // 下載報修進度綜合表
    const downloadRepairProgressSummary = async (params = {}) => {
        try {
            isLoading.value = true
            
            // 處理參數，只添加有值的參數
            const queryParams = {}
            if (params.title) queryParams.title = params.title
            if (params.repairCategoryId) queryParams.repairCategoryId = params.repairCategoryId
            if (params.repairReasonId) queryParams.repairReasonId = params.repairReasonId
            if (params.repairStatusId) queryParams.repairStatusId = params.repairStatusId
            if (params.emergencyLevel) queryParams.emergencyLevel = params.emergencyLevel
            if (params.importanceLevel) queryParams.importanceLevel = params.importanceLevel
            if (params.overdueDays) queryParams.overdueDays = params.overdueDays

            if (params.startAt) {
                const startDate = new Date(params.startAt);
                startDate.setHours(0, 0, 0, 0); // 設為當天開始
                queryParams.startAt = startDate.toISOString();
            }
            // 處理結束時間：設為當天的 23:59:59
            if (params.endAt) {
                const endDate = new Date(params.endAt);
                endDate.setHours(23, 59, 59, 999); // 設為當天結束
                queryParams.endAt = endDate.toISOString();
            }
            if (params.repairUnit) queryParams.repairUnit = params.repairUnit
            if (params.assignUserName) queryParams.assignUserName = params.assignUserName

            console.log('下載報修進度綜合表參數:', queryParams)

            const response = await axiosClient.get('/backend/report/repair-progress-summary', {
                params: queryParams,
                responseType: 'blob', // 重要：設置響應類型為 blob
                headers: {
                    'Accept': 'application/octet-stream'
                }
            })

            // 創建下載連結
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            
            // 從響應頭獲取文件名，或使用默認名稱
            const contentDisposition = response.headers['content-disposition']
            let filename = '報修進度綜合表.xlsx'
            
            if (contentDisposition) {
                // 處理多種編碼格式的檔案名
                let filenameMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/)
                if (filenameMatch) {
                    // UTF-8 編碼的檔案名
                    filename = decodeURIComponent(filenameMatch[1])
                } else {
                    // 嘗試標準格式
                    filenameMatch = contentDisposition.match(/filename="([^"]+)"/)
                    if (filenameMatch) {
                        filename = filenameMatch[1]
                    } else {
                        // 嘗試不帶引號的格式
                        filenameMatch = contentDisposition.match(/filename=([^;]+)/)
                        if (filenameMatch) {
                            filename = filenameMatch[1].trim()
                        }
                    }
                }
                
                // 如果檔案名是英文系統名稱，使用中文名稱替代
                if (filename.includes('RepairSystem') || filename.includes('repair-progress-summary')) {
                    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
                    filename = `報修進度綜合表_${timestamp}.xlsx`
                }
                
                // 如果檔案名包含 URL 編碼，進行解碼
                try {
                    filename = decodeURIComponent(filename)
                } catch (e) {
                    // 如果解碼失敗，使用原始檔案名
                    console.warn('檔案名解碼失敗:', e)
                }
            }
            
            link.setAttribute('download', filename)
            document.body.appendChild(link)
            link.click()
            
            // 清理
            link.remove()
            window.URL.revokeObjectURL(url)

            return {
                success: true,
                message: '報修進度綜合表下載成功'
            }

        } catch (error) {
            console.error('下載報修進度綜合表失敗:', error)
            
            // 提取後端錯誤訊息
            let errorMessage = '下載報修進度綜合表失敗，請稍後再試'
            
            if (error.response && error.response.data) {
                // 如果錯誤回應是 blob，需要轉換為文字
                if (error.response.data instanceof Blob) {
                    try {
                        const errorText = await error.response.data.text()
                        const errorData = JSON.parse(errorText)
                        errorMessage = errorData.message || errorMessage
                    } catch (parseError) {
                        console.error('解析錯誤訊息失敗:', parseError)
                    }
                } else if (error.response.data.message) {
                    errorMessage = error.response.data.message
                }
            }
            
            throw new Error(errorMessage)
        } finally {
            isLoading.value = false
        }
    }

    // 下載帳號管理報表
    const downloadAccountManagement = async (params = {}) => {
        try {
            isLoading.value = true
            
            // 處理參數，只添加有值的參數
            const queryParams = {}
            if (params.status) queryParams.status = params.status
            if (params.startAt) {
                const startDate = new Date(params.startAt);
                startDate.setHours(0, 0, 0, 0); // 設為當天開始
                queryParams.startAt = startDate.toISOString();
            }
            // 處理結束時間：設為當天的 23:59:59
            if (params.endAt) {
                const endDate = new Date(params.endAt);
                endDate.setHours(23, 59, 59, 999); // 設為當天結束
                queryParams.endAt = endDate.toISOString();
            }

            console.log('下載帳號管理報表參數:', queryParams)

            const response = await axiosClient.get('/backend/report/account-management', {
                params: queryParams,
                responseType: 'blob', // 重要：設置響應類型為 blob
                headers: {
                    'Accept': 'application/octet-stream'
                }
            })

            // 創建下載連結
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            
            // 從響應頭獲取文件名，或使用默認名稱
            const contentDisposition = response.headers['content-disposition']
            let filename = '帳號管理報表.xlsx'
            
            if (contentDisposition) {
                // 處理多種編碼格式的檔案名
                let filenameMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/)
                if (filenameMatch) {
                    // UTF-8 編碼的檔案名
                    filename = decodeURIComponent(filenameMatch[1])
                } else {
                    // 嘗試標準格式
                    filenameMatch = contentDisposition.match(/filename="([^"]+)"/)
                    if (filenameMatch) {
                        filename = filenameMatch[1]
                    } else {
                        // 嘗試不帶引號的格式
                        filenameMatch = contentDisposition.match(/filename=([^;]+)/)
                        if (filenameMatch) {
                            filename = filenameMatch[1].trim()
                        }
                    }
                }
                
                // 如果檔案名是英文系統名稱，使用中文名稱替代
                if (filename.includes('RepairSystem') || filename.includes('AccountManagement')) {
                    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
                    filename = `帳號管理報表_${timestamp}.xlsx`
                }
                
                // 如果檔案名包含 URL 編碼，進行解碼
                try {
                    filename = decodeURIComponent(filename)
                } catch (e) {
                    // 如果解碼失敗，使用原始檔案名
                    console.warn('檔案名解碼失敗:', e)
                }
            }
            
            link.setAttribute('download', filename)
            document.body.appendChild(link)
            link.click()
            
            // 清理
            link.remove()
            window.URL.revokeObjectURL(url)

            return {
                success: true,
                message: '帳號管理報表下載成功'
            }

        } catch (error) {
            console.error('下載帳號管理報表失敗:', error)
            
            // 提取後端錯誤訊息
            let errorMessage = '下載帳號管理報表失敗，請稍後再試'
            
            if (error.response && error.response.data) {
                // 如果錯誤回應是 blob，需要轉換為文字
                if (error.response.data instanceof Blob) {
                    try {
                        const errorText = await error.response.data.text()
                        const errorData = JSON.parse(errorText)
                        errorMessage = errorData.message || errorMessage
                    } catch (parseError) {
                        console.error('解析錯誤訊息失敗:', parseError)
                    }
                } else if (error.response.data.message) {
                    errorMessage = error.response.data.message
                }
            }
            
            throw new Error(errorMessage)
        } finally {
            isLoading.value = false
        }
    }

    // 下載完修記錄報表
    const downloadCompleteRepairRecord = async (params = {}) => {
        try {
            isLoading.value = true
            
            // 處理參數，只添加有值的參數
            const queryParams = {}
            if (params.repairCategoryId) queryParams.repairCategoryId = params.repairCategoryId
            if (params.repairReasonId) queryParams.repairReasonId = params.repairReasonId
            if (params.startAt) {
                const startDate = new Date(params.startAt);
                startDate.setHours(0, 0, 0, 0); // 設為當天開始
                queryParams.startAt = startDate.toISOString();
            }
            // 處理結束時間：設為當天的 23:59:59
            if (params.endAt) {
                const endDate = new Date(params.endAt);
                endDate.setHours(23, 59, 59, 999); // 設為當天結束
                queryParams.endAt = endDate.toISOString();
            }

            console.log('下載完修記錄報表參數:', queryParams)

            const response = await axiosClient.get('/backend/report/complete-repair-record', {
                params: queryParams,
                responseType: 'blob', // 重要：設置響應類型為 blob
                headers: {
                    'Accept': 'application/octet-stream'
                }
            })

            // 創建下載連結
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            
            // 從響應頭獲取文件名，或使用默認名稱
            const contentDisposition = response.headers['content-disposition']
            let filename = '完修記錄報表.xlsx'
            
            if (contentDisposition) {
                // 處理多種編碼格式的檔案名
                let filenameMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/)
                if (filenameMatch) {
                    // UTF-8 編碼的檔案名
                    filename = decodeURIComponent(filenameMatch[1])
                } else {
                    // 嘗試標準格式
                    filenameMatch = contentDisposition.match(/filename="([^"]+)"/)
                    if (filenameMatch) {
                        filename = filenameMatch[1]
                    } else {
                        // 嘗試不帶引號的格式
                        filenameMatch = contentDisposition.match(/filename=([^;]+)/)
                        if (filenameMatch) {
                            filename = filenameMatch[1].trim()
                        }
                    }
                }
                
                // 如果檔案名是英文系統名稱，使用中文名稱替代
                if (filename.includes('RepairSystem') || filename.includes('complete-repair-record')) {
                    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
                    filename = `完修記錄報表_${timestamp}.xlsx`
                }
                
                // 如果檔案名包含 URL 編碼，進行解碼
                try {
                    filename = decodeURIComponent(filename)
                } catch (e) {
                    // 如果解碼失敗，使用原始檔案名
                    console.warn('檔案名解碼失敗:', e)
                }
            }
            
            link.setAttribute('download', filename)
            document.body.appendChild(link)
            link.click()
            
            // 清理
            link.remove()
            window.URL.revokeObjectURL(url)

            return {
                success: true,
                message: '完修記錄報表下載成功'
            }

        } catch (error) {
            console.error('下載完修記錄報表失敗:', error)
            
            // 提取後端錯誤訊息
            let errorMessage = '下載完修記錄報表失敗，請稍後再試'
            
            if (error.response && error.response.data) {
                // 如果錯誤回應是 blob，需要轉換為文字
                if (error.response.data instanceof Blob) {
                    try {
                        const errorText = await error.response.data.text()
                        const errorData = JSON.parse(errorText)
                        errorMessage = errorData.message || errorMessage
                    } catch (parseError) {
                        console.error('解析錯誤訊息失敗:', parseError)
                    }
                } else if (error.response.data.message) {
                    errorMessage = error.response.data.message
                }
            }
            
            throw new Error(errorMessage)
        } finally {
            isLoading.value = false
        }
    }

    return {
        isLoading,
        downloadRepairProgressSummary,
        downloadAccountManagement,
        downloadCompleteRepairRecord
    }
})
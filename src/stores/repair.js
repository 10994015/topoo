import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axiosClient from '../axios' // 引入 axios 實例

export const useRepairStore = defineStore('repair', () => {

    const categories = ref(null); // 報修分類
    const reasons = ref(null); // 報修原因
    const statuses = ref(null); // 狀態
    const repairs = ref(null); // 報修列表
    const isLoading = ref(false)
    const isInitialized = ref(false) // 標記是否已初始化檢查
    const repairDetail = ref(null); // 單一報修詳細資料
    const repairProgress = ref(null); // 報修進度記錄
    const fetchCategories = async () => {
        try {
            const response = await axiosClient.get('/enum/repair-category')
            console.log(response.data);
            
            categories.value = response.data;
        } catch (error) {
            console.error('獲取類別失敗:', error);
        }
    }

    const fetchReasons = async () => {
        try {
            const response = await axiosClient.get('/enum/repair-reason')
            console.log(response.data);
            
            reasons.value = response.data;
        } catch (error) {
            console.error('獲取類別失敗:', error);
        }
    }
    
    const fetchStatuses = async () => {
        try {
            const response = await axiosClient.get('/enum/repair-status')
            console.log(response.data);
            
            statuses.value = response.data;
        } catch (error) {
            console.error('獲取類別失敗:', error);
        }
    }

    const fetchRepairs = async (searchForm={
        title: '',
        repairCategoryId: '',
        repairStatusId: '',
        repairReasonId: '',
        startAt: '',
        endAt: ''
    }, column="repair_time", sortDirection="asc", limit=10, page=1) => {
        try {
            console.log(searchForm);
            console.log(searchForm.startAt, searchForm.endAt);
            
            const params = {};
            
            // 只添加有值的參數
            if (searchForm.title) params.title = searchForm.title;
            if (searchForm.repairCategoryId) params.repairCategoryId = searchForm.repairCategoryId;
            if (searchForm.repairStatusId) params.repairStatusId = searchForm.repairStatusId;
            if (searchForm.repairReasonId) params.repairReasonId = searchForm.repairReasonId;
            if (searchForm.startAt) params.startAt = new Date(searchForm.startAt).toISOString();
            if (searchForm.endAt) params.endAt = new Date(searchForm.endAt).toISOString();
            
            params.sortBy = column; // 排序欄位
            params.sortOrder = sortDirection.toUpperCase(); // 排序方向
            params.pageSize = limit; // 每頁數量
            params.page = page; // 偏移量
            console.log(params);
            
            const response = await axiosClient.get('/repair', { params });
            console.log(response.data);
            repairs.value = response.data;
        } catch (error) {
            console.error('獲取報修列表失敗:', error);
        }
    }

    const createRepair = async (repairData) => {
        console.log('repairData 物件類型:', repairData.constructor.name);
        
        // repairData.repairTime +8小時
        if (!repairData.repairTime) {
            console.error('repairTime 為空，請提供有效的時間');
            throw new Error('repairTime 為空，請提供有效的時間');
        }
        
        repairData.repairTime = new Date(repairData.repairTime).toISOString(); // 確保 repairTime 有值
        try {
            const response = await axiosClient.post('/repair', repairData, {
                headers: {
                    
                }
            })
            console.log('API 回應:', response.data);
            
            return response.data
        } catch (error) {
            console.error('創建報修失敗:', error);
            
            // 更詳細的錯誤資訊
            if (error.response) {
                console.error('錯誤狀態:', error.response.status);
                console.error('錯誤資料:', error.response.data);
            }
            throw error; 
        }
    }

    const saveRepairFiles = async (formData) => {
        try {
            console.log(formData);
            
            const response = await axiosClient.post('/repair/file', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
            console.log('檔案上傳回應:', response.data);
            
            return {
                success: true,
                data: response.data.data || response.data,
                message: response.data.message
            }
        } catch (error) {
            console.error('檔案上傳失敗:', error);
            throw error
        }
    }

    const removeRepairFile = async (fileId) => {
        try {
            const response = await axiosClient.delete(`/repair/file/${fileId}`)
            console.log('檔案刪除回應:', response.data);
            
            return {
                success: true,
                message: response.data.message
            }
        } catch (error) {
            console.error('檔案刪除失敗:', error);
            throw error
        }
    }
    
    // 獲取單一報修詳細資料
    const fetchRepairDetail = async (repairId) => {
        try {
            console.log(repairId);
            
            const response = await axiosClient.get(`/repair/${repairId}`)
            console.log(response);
            repairDetail.value = response.data.data
            return response.data.statusCode
        } catch (error) {
            console.error('獲取報修詳細資料失敗:', error)
            throw error
        }
    }

    // 獲取報修進度記錄  
    const fetchRepairProgress = async (repairId) => {
        try {
            const response = await axiosClient.get(`/repair/${repairId}/record`)
            console.log(response);
            repairProgress.value = response.data.data
            console.log(repairProgress.value);
            
            return response.data.data
        } catch (error) {
            console.error('獲取進度記錄失敗:', error)
            throw error
        }
    }
    // 下載檔案/api/repair/file/{id}/download
    const downloadFile = async (fileId) => {
        try {
            const response = await axiosClient.get(`/repair/file/${fileId}/download`, {
                responseType: 'blob', // 重要：設置響應類型為 blob
                headers: {
                    'Accept': 'application/octet-stream'
                }
            });
            
            // 創建下載連結
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            
            // 從響應頭獲取文件名，或使用默認名稱
            const contentDisposition = response.headers['content-disposition'];
            let filename = 'download';
            
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch) {
                    filename = filenameMatch[1];
                }
            }
            
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            
            // 清理
            link.remove();
            window.URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('下載失敗:', error);
            return error;
        }
    }

    // 檢視檔案 /api/repair/file/{id}
    const viewFile = async (fileId) => {
        try {
            const response = await axiosClient.get(`/repair/file/${fileId}` ,{
                responseType: 'blob', // 重要：設置響應類型為 blob
                headers: {
                    'Accept': 'application/octet-stream'
                }
            })
            console.log('檔案詳細資料:', response);
            
            return response.data
        } catch (error) {
            console.error('獲取檔案詳細資料失敗:', error);
        }
    }
    return {
        categories,
        reasons,
        statuses,
        isLoading,
        isInitialized,
        repairs,
        repairDetail,
        repairProgress,
        fetchCategories,
        fetchReasons,
        fetchStatuses,
        createRepair,
        fetchRepairs,
        saveRepairFiles,
        removeRepairFile,
        fetchRepairDetail,
        fetchRepairProgress,
        downloadFile,
        viewFile
    }


});
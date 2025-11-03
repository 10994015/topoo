import { defineStore } from 'pinia'
import { ref } from 'vue'
import axiosClient from '../axios' // 引入 axios 實例

export const useTodoStore = defineStore('todo', () => {
    const todos = ref(null) // 待辦列表
    const isLoading = ref(false)
    const isInitialized = ref(false) // 標記是否已初始化檢查
    const todoDetail = ref(null) // 單一待辦詳細資料
    const users = ref(null) // 承辦人員列表
    const todoProgress = ref(null) // 待辦案件進度記錄
    const statuses = ref(null) // 狀態列表
    // 獲取待辦報修案件列表
    const fetchTodos = async (searchForm = {
        q: '',
        repairCategoryId: '',
        repairReasonId: '',
        repairStatusId: '',
        emergencyLevel: '',
        importanceLevel: '',
        startAt: '',
        endAt: ''
    }, column , sortDirection , limit = 10, page = 1) => {
        try {
            //console.log('搜尋參數:', searchForm);
            //console.log('時間範圍:', searchForm.startAt, searchForm.endAt);
            //console.log(column, sortDirection, limit, page);
            
            
            const params = {};
            
            // 只添加有值的參數
            if (searchForm.q) params.q = searchForm.q;
            if (searchForm.repairCategoryId) params.repairCategoryId = searchForm.repairCategoryId;
            if (searchForm.repairReasonId) params.repairReasonId = searchForm.repairReasonId;
            if (searchForm.repairStatusId) params.repairStatusId = searchForm.repairStatusId;
            if (searchForm.emergencyLevel) params.emergencyLevel = searchForm.emergencyLevel;
            if (searchForm.importanceLevel) params.importanceLevel = searchForm.importanceLevel;
            if (searchForm.startAt) {
                const startDate = new Date(searchForm.startAt);
                startDate.setHours(0, 0, 0, 0); // 設為當天開始
                params.startAt = startDate.toISOString();
            }
            
            // 處理結束時間：設為當天的 23:59:59
            if (searchForm.endAt) {
                const endDate = new Date(searchForm.endAt);
                endDate.setHours(23, 59, 59, 999); // 設為當天結束
                params.endAt = endDate.toISOString();
            }
            
            params.sortBy = column; // 排序欄位
            params.sortOrder = sortDirection.toUpperCase(); // 排序方向
            params.pageSize = limit; // 每頁數量
            params.page = page; // 頁數
            
            //console.log('API 參數:', params);
            
            const response = await axiosClient.get('/backend/todo/repair', { params });
            //console.log('API 回應:', response.data);
            todos.value = response.data;
            
            return response.data;
        } catch (error) {
            //console.error('獲取待辦列表失敗:', error);
            throw error;
        }
    }
    const fetchStatuses = async () => {
        try {
            const response = await axiosClient.get('/backend/todo/repair-status')
            //console.log(response.data);
            
            statuses.value = response.data;
        } catch (error) {
            //console.error('獲取類別失敗:', error);
        }
    }
    // 獲取單一報修詳細資料GET
    const fetchTodoDetail = async (todoId) => {
        try {
            //console.log(todoId);
            
            const response = await axiosClient.get(`/backend/todo/repair/${todoId}`)
            //console.log(response);
            todoDetail.value = response.data.data
            return response.data.statusCode
        } catch (error) {
            //console.error('獲取報修詳細資料失敗:', error)
            throw error
        }
    }
    // 獲取派工資料 - 對應 GET /api/backend/todo/{id}
    const fetchTodo = async (todoId) => {
        try {
            //console.log('獲取派工資料:', todoId);
            
            const response = await axiosClient.get(`/backend/todo/${todoId}`);
            //console.log('派工資料回應:', response.data);
            // todoDetail.value = response.data.data
            return {
                success: true,
                data: response.data.data || response.data,
                message: response.data.message
            };
        } catch (error) {
            //console.error('獲取派工資料失敗:', error);
            
            if (error.response) {
                //console.error('錯誤狀態:', error.response.status);
                //console.error('錯誤資料:', error.response.data);
                throw new Error(error.response.data.message || '獲取派工資料失敗');
            }
            throw error;
        }
    }

    // 指派案件 - 對應 POST /api/backend/todo
    const assignWork = async (assignData) => {
        try {
            //console.log('指派案件數據:', assignData);
            assignData.estimatedCompletionTime = new Date(assignData.estimatedCompletionTime).toISOString()
            const response = await axiosClient.post('/backend/todo', assignData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            //console.log('指派案件回應:', response.data);
            
            return {
                success: true,
                data: response.data.data || response.data,
                message: response.data.message
            };
        } catch (error) {
            //console.error('指派案件失敗:', error);
            
            // 更詳細的錯誤資訊
            if (error.response) {
                //console.error('錯誤狀態:', error.response.status);
                //console.error('錯誤資料:', error.response.data);
                throw new Error(error.response.data.message || '指派失敗');
            }
            throw error;
        }
    }
    // 編輯案件 - 對應 PATCH /api/backend/todo/{id}
    const editTodo = async (updateData) => {
        try {
            //console.log('編輯案件數據:',updateData);

            const todoId = updateData.todoId
            updateData.estimatedCompletionTime = new Date(updateData.estimatedCompletionTime).toISOString()
            const params = {
                assignUserId: updateData.assignUserId,
                importanceLevel: updateData.importanceLevel,
                emergencyLevel: updateData.emergencyLevel,
                estimatedCompletionTime: updateData.estimatedCompletionTime,
                fileIds: updateData.fileIds
            }
            
            const response = await axiosClient.patch(`/backend/todo/${todoId}`, params, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            //console.log('編輯案件回應:', response.data);
            
            return {
                success: true,
                data: response.data.data || response.data,
                message: response.data.message
            };
        } catch (error) {
            //console.error('編輯案件失敗:', error);
            // 更詳細的錯誤資訊
            if (error.response) {
                //console.error('錯誤狀態:', error.response.status);
                //console.error('錯誤資料:', error.response.data);
                throw new Error(error.response.data.message || '編輯失敗');
            }
        }
    }
    // 刪除派工
    const removeTodo = async (todoId) => {
        try {
            //console.log('刪除待辦案件:', todoId);
            
            const response = await axiosClient.delete(`/backend/todo/${todoId}`);
            //console.log('案件刪除回應:', response.data);
            
            return {
                success: true,
                message: response.data.message
            };
        } catch (error) {
            //console.error('案件刪除失敗:', error);
            
            if (error.response) {
                //console.error('錯誤狀態:', error.response.status);
                //console.error('錯誤資料:', error.response.data);
                throw new Error(error.response.data.message || '案件刪除失敗');
            }
            throw error;
        }
    }

    // 檢視派工案件進度backend/todo/repair/{id}/record
    const fetchTodoProgress = async (todoId) => {
        try {
            //console.log('檢視待辦案件進度:', todoId);
            
            const response = await axiosClient.get(`/backend/todo/repair/${todoId}/record`);
            //console.log('案件進度回應:', response.data);
            todoProgress.value = response.data.data || [];
            return {
                success: true,
                data: response.data.data || response.data,
                message: response.data.message
            };
        } catch (error) {
            //console.error('案件進度查詢失敗:', error);
            
            if (error.response) {
                //console.error('錯誤狀態:', error.response.status);
                //console.error('錯誤資料:', error.response.data);
                throw new Error(error.response.data.message || '案件進度查詢失敗');
            }
            throw error;
        }
    }
    // 上傳待辦案件檔案 - 對應 POST /api/backend/todo/file
    const saveTodoFiles = async (formData) => {
        try {
            //console.log('上傳待辦案件檔案:', formData);
            
            const response = await axiosClient.post('/backend/todo/file', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            //console.log('檔案上傳回應:', response.data);
            
            return {
                success: true,
                data: response.data.data || response.data,
                message: response.data.message
            };
        } catch (error) {
            //console.error('檔案上傳失敗:', error);
            
            if (error.response) {
                //console.error('錯誤狀態:', error.response.status);
                //console.error('錯誤資料:', error.response.data);
                throw new Error(error.response.data.message || '檔案上傳失敗');
            }
            throw error;
        }
    }

    // 刪除待辦案件檔案 - 對應 DELETE /api/backend/todo/file/{id}
    const removeTodoFile = async (fileId) => {
        try {
            //console.log('刪除待辦案件檔案:', fileId);
            
            const response = await axiosClient.delete(`/backend/todo/file/${fileId}`);
            //console.log('檔案刪除回應:', response.data);
            
            return {
                success: true,
                message: response.data.message
            };
        } catch (error) {
            //console.error('檔案刪除失敗:', error);
            
            if (error.response) {
                //console.error('錯誤狀態:', error.response.status);
                //console.error('錯誤資料:', error.response.data);
                throw new Error(error.response.data.message || '檔案刪除失敗');
            }
            throw error;
        }
    }

    // 查詢具有承辦資格帳號 /api/backend/todo/user 
    const fetchAssignableUsers = async (params = {}) => {
        try {
            //console.log('查詢有資格承辦的所有人員', params);
            
            // 設定預設參數
            const queryParams = {
                page: params.page || 1,
                pageSize: params.pageSize || 10
            };
            
            // 如果有搜尋關鍵字，加入參數
            if (params.keyword) {
                queryParams.q = params.keyword;
            }
            //console.log(queryParams);
            
            const response = await axiosClient.get('/backend/todo/user', { 
                params: queryParams 
            });
            
            users.value = response.data;
            //console.log('API 回應:', response.data);
            return response.data;
        } catch (error) {
            //console.error('查詢有資格承辦的所有人員失敗:', error);
            throw error;
        }
    }
    // 下載檔案/api/repair/file/{id}/download
    const downloadFile = async (fileId) => {
        try {
            const response = await axiosClient.get(`/backend/todo/file/${fileId}/download`, {
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
            
            link.setAttribute('download', decodeURIComponent(filename));
            document.body.appendChild(link);
            link.click();
            
            // 清理
            link.remove();
            window.URL.revokeObjectURL(url);
            
        } catch (error) {
            //console.error('下載失敗:', error);
            return error;
        }
    }

    // 檢視檔案 /api/repair/file/{id}
    const viewFile = async (fileId) => {
        //console.log(fileId);
        try {
            const response = await axiosClient.get(`/backend/todo/file/${fileId}` ,{
                responseType: 'blob', // 重要：設置響應類型為 blob
                headers: {
                    'Accept': 'application/octet-stream'
                }
            })
            //console.log('檔案詳細資料:', response);
            
            return response.data
        } catch (error) {
            //console.error('獲取檔案詳細資料失敗:', error);
        }
    }
    return {
        todos,
        isLoading,
        isInitialized,
        todoDetail,
        todoProgress,
        statuses,
        fetchTodos,
        fetchTodoDetail,
        assignWork,
        saveTodoFiles,
        removeTodoFile,
        fetchAssignableUsers,
        editTodo,
        removeTodo,
        fetchTodoProgress,
        downloadFile,
        viewFile,
        fetchTodo,
        fetchStatuses,
    }
})
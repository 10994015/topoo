import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axiosClient from '../axios' // 引入 axios 實例

export const useAccountStore = defineStore('account', () => {

    const accounts = ref(null); // 帳號列表
    const account = ref(null); // 單個帳號
    const isLoading = ref(false)

    const fetchAccounts = async (searchForm={
        text: '',
        status: '',
        startAt: '',
        endAt: '',
        pageSize:10,
        page:1,
        sortField: 'created_at',
        sortOrder: 'ASC',
        provider:'',
    }) => {
        try {
            console.log(searchForm);
            const params = {};
            if (searchForm.text) params.q = searchForm.text;
            if (searchForm.status) params.status = searchForm.status;
            if (searchForm.provider) params.provider = searchForm.provider; // 新增 provider 條件
            if (searchForm.startAt) params.startAt =new Date(searchForm.startAt).toISOString(); // 確保日期格式正確
            if (searchForm.endAt) params.endAt = new Date(searchForm.endAt).toISOString(); // 確保日期格式正確
            params.pageSize = searchForm.pageSize;
            params.page = searchForm.page;
            params.sortBy = searchForm.sortField; // 排序欄位
            params.sortOrder = searchForm.sortOrder.toUpperCase(); // 排序方向
            const response = await axiosClient.get('/backend/user', { params });
            console.log(response.data);
            accounts.value = response.data.data;
        } catch (error) {
            console.error('獲取帳號列表失敗:', error);
        }
    }

    const getAccountById = async (id) => {
        try {
            const response = await axiosClient.get(`/backend/user/${id}`);
            console.log(response.data);
            account.value = response.data.data;
            return response.data.data;
        } catch (error) {
            console.error('獲取帳號失敗:', error);
        }
    }

    const updateAccount = async (id, data) => {
        try {
            const response = await axiosClient.patch(`/backend/user/${id}`, data);
            console.log(response.data);
            // 更新成功後，重新獲取帳號列表
            account.value = response.data.data;
            await fetchAccounts();
            return response.data;
        } catch (error) {
            console.error('更新帳號失敗:', error);
        }
    }

    const deleteAccount = async (id) => {
        try {
            const response = await axiosClient.delete(`/backend/user/${id}`);
            console.log(response.data);
            // 刪除成功後，重新獲取帳號列表
            await fetchAccounts();
            return response.data;
        } catch (error) {
            console.error('刪除帳號失敗:', error);
        }
    }

    const createAccount = async (data) => {
        try {
            const response = await axiosClient.post('/backend/user', data);
            console.log(response.data);
            // 創建成功後，重新獲取帳號列表
            await fetchAccounts();
            return response.data;
        } catch (error) {
            console.error('創建帳號失敗:', error.response.data);
            return error.response
        }
    }
    // /api/backend/user/import-template
    // 下載帳號匯入Excel檔範本
    const downloadImportTemplate = async () => {
        try {
            const response = await axiosClient.get('/backend/user/import-template', {
                responseType: 'blob' // 重要：指定回應類型為 blob
            });
            // 創建一個 URL 來下載檔案
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'account_import_template.xlsx'); // 設定下載檔名
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link); // 下載後移除連結
        } catch (error) {
            console.error('下載帳號匯入範本失敗:', error);
        }
    }
    /*
    api/backend/user/import-user
    excel 匯入 新增帳號
    */
    const importAccounts = async (formData) => {
        try {
            isLoading.value = true;
            
            const response = await axiosClient.post('/backend/user/import-user', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                timeout: 60000, // 60秒超時，因為檔案處理可能需要較長時間
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    console.log(`上傳進度: ${percentCompleted}%`);
                    // 可以通過事件發送進度更新
                }
            });
            
            console.log('帳號匯入回應:', response.data);
            
            // 匯入成功後，重新獲取帳號列表
            await fetchAccounts();
            
            isLoading.value = false;
            
            // 返回標準化的響應格式
            return {
                success: true,
                message: response.data.message || '匯入成功',
                data: response.data
            };
            
        } catch (error) {
            isLoading.value = false;
            console.error('帳號匯入失敗:', error);
            
            let errorMessage = '匯入失敗';
            let errorDetails = [];
            
            if (error.response) {
                const status = error.response.status;
                const errorData = error.response.data;
                
                switch (status) {
                    case 400:
                        errorMessage = errorData.message || '請求參數錯誤，請檢查檔案格式';
                        break;
                    case 401:
                        errorMessage = '未授權，請重新登入';
                        break;
                    case 413:
                        errorMessage = '檔案過大，請選擇較小的檔案（限制5MB）';
                        break;
                    case 422:
                        errorMessage = errorData.message || '檔案格式錯誤或資料驗證失敗';
                        errorDetails = errorData.errors || errorData.data?.errors || [];
                        break;
                    case 500:
                        errorMessage = '服務器錯誤，請稍後再試';
                        break;
                    default:
                        errorMessage = errorData.message || `服務器錯誤 (${status})`;
                }
                
                // 如果有詳細的錯誤信息
                if (errorData.errors && Array.isArray(errorData.errors)) {
                    errorDetails = errorData.errors;
                } else if (errorData.data && errorData.data.errors) {
                    errorDetails = errorData.data.errors;
                }
                
            } else if (error.request) {
                errorMessage = '網路連接錯誤，請檢查網路連接';
            } else if (error.code === 'ECONNABORTED') {
                errorMessage = '請求超時，檔案可能過大或網路較慢，請重試';
            } else {
                errorMessage = error.message || '匯入過程中發生未知錯誤';
            }
            
            // 拋出統一格式的錯誤
            throw {
                response: {
                    data: {
                        success: false,
                        message: errorMessage,
                        errors: errorDetails
                    }
                }
            };
        }
    }


    return {
        accounts,
        account,
        fetchAccounts,
        getAccountById,
        updateAccount,
        deleteAccount,
        createAccount,
        downloadImportTemplate,
        importAccounts,
    }
})
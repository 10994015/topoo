import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axiosClient from '../axios' // 引入 axios 實例

export const useMailStore = defineStore('mail', () => {

    const mails = ref(null); // 信箱列表
    const mail = ref(null); // 單個信箱
    const isLoading = ref(false)

    const fetchMails = async (searchForm={
        mailId: '',
        email: '',
        pageSize: 10,
        page: 1,
        sortBy: 'created_at',
        sortOrder: 'ASC'
    }) => {
        try {
            isLoading.value = true;
            console.log(searchForm);
            
            const params = {};
            if (searchForm.email) params.email = searchForm.email;
            params.pageSize = searchForm.pageSize;
            params.page = searchForm.page;
            params.sortBy = searchForm.sortBy; // 排序欄位
            params.sortOrder = searchForm.sortOrder.toUpperCase(); // 排序方向
            console.log(params);
            
            const response = await axiosClient.get('/backend/mail/', { params });
            console.log(response.data);
            mails.value = response.data.data;
            isLoading.value = false;
            return response.data;
        } catch (error) {
            isLoading.value = false;
            console.error('獲取信箱列表失敗:', error);
            throw error;
        }
    }

    const getMailById = async (id) => {
        try {
            isLoading.value = true;
            const response = await axiosClient.get(`/backend/mail`, {
                params: { mailId: id },
            });
            console.log(response.data.data.data[0]);
            mail.value = response.data.data
            isLoading.value = false;
            return response.data.data;
        } catch (error) {
            isLoading.value = false;
            console.error('獲取信箱失敗:', error);
            throw error;
        }
    }

    const createMail = async (data) => {
        try {
            isLoading.value = true;
            
            // 根據 API 文檔，創建信箱需要的參數
            const payload = {
                name: data.name, // 信箱名稱
                email: data.email,
                password: data.password,
                smtpServer: data.smtpServer,
                smtpPort: data.smtpPort
            };
            
            console.log('創建信箱參數:', payload);
            const response = await axiosClient.post('/backend/mail/', payload);
            console.log(response.data);
            
            // 創建成功後，更新單個信箱狀態
            mail.value = response.data.data;
            isLoading.value = false;
            return response.data;
        } catch (error) {
            isLoading.value = false;
            console.error('創建信箱失敗:', error.response?.data || error);
            throw error;
        }
    }

    const updateMail = async (id, data) => {
        try {
            isLoading.value = true;
            
            // 根據 API 文檔，更新信箱的參數
            const payload = {
                name: data.name, // 信箱名稱
                email: data.email,
                password: data.password,
                smtpServer: data.smtpServer,
                smtpPort: data.smtpPort
            };
            
            console.log('更新信箱參數:', payload);
            const response = await axiosClient.patch(`/backend/mail/${id}`, payload);
            console.log(response.data);
            
            // 更新成功後，更新信箱狀態
            mail.value = response.data.data;
            isLoading.value = false;
            return response.data;
        } catch (error) {
            isLoading.value = false;
            console.error('更新信箱失敗:', error);
            throw error;
        }
    }

    const deleteMail = async (id) => {
        try {
            isLoading.value = true;
            const response = await axiosClient.delete(`/backend/mail/${id}`);
            console.log(response.data);
            isLoading.value = false;
            return response.data;
        } catch (error) {
            isLoading.value = false;
            console.error('刪除信箱失敗:', error);
            throw error;
        }
    }

    // 測試信箱連接
    const testMailConnection = async (id) => {
        try {
            isLoading.value = true;
            const response = await axiosClient.post(`/backend/mail/${id}/test`);
            console.log('測試連接結果:', response.data);
            isLoading.value = false;
            return response.data;
        } catch (error) {
            isLoading.value = false;
            console.error('測試信箱連接失敗:', error);
            throw error;
        }
    }

    // 批量刪除信箱
    const batchDeleteMails = async (ids) => {
        try {
            isLoading.value = true;
            const response = await axiosClient.delete('/backend/mail/batch', {
                data: { ids }
            });
            console.log(response.data);
            isLoading.value = false;
            return response.data;
        } catch (error) {
            isLoading.value = false;
            console.error('批量刪除信箱失敗:', error);
            throw error;
        }
    }

    // 驗證信箱地址
    const validateMailAddress = async (email) => {
        try {
            const response = await axiosClient.post('/backend/mail/validate', { email });
            console.log(response.data);
            return response.data;
        } catch (error) {
            console.error('驗證信箱失敗:', error);
            throw error;
        }
    }

    // 重置單個信箱狀態
    const resetMailState = () => {
        mail.value = null;
    }

    // 重置所有狀態
    const resetAllState = () => {
        mails.value = null;
        mail.value = null;
        isLoading.value = false;
    }

    // Computed 屬性
    const totalMails = computed(() => {
        return mails.value?.total || 0;
    });

    const totalPages = computed(() => {
        return mails.value?.totalPages || 0;
    });

    const currentPageNum = computed(() => {
        return mails.value?.currentPage || 1;
    });

    const hasNextPage = computed(() => {
        return mails.value?.hasNext || false;
    });

    const hasPrevPage = computed(() => {
        return mails.value?.hasPrev || false;
    });

    return {
        // State
        mails,
        mail,
        isLoading,
        
        // Actions
        fetchMails,
        getMailById,
        createMail,
        updateMail,
        deleteMail,
        batchDeleteMails,
        validateMailAddress,
        testMailConnection,
        resetMailState,
        resetAllState,
        
        // Computed
        totalMails,
        totalPages,
        currentPageNum,
        hasNextPage,
        hasPrevPage
    }
})
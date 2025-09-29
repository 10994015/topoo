import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axiosClient from '../axios' // 引入 axios 實例

export const useSurveyStore = defineStore('survey', () => {
    
    // 響應式數據
    const surveys = ref(null) // 問卷列表
    const surveyDetail = ref(null) // 單一問卷詳細資料
    const surveyResponses = ref(null) // 問卷回覆列表
    const surveyQuestionsList = ref(null) // 前台問卷題目列表
    const surveyUnits = ref([]) // 新增：報修單位列表
    const isLoading = ref(false)
    const isSubmitting = ref(false)
    const isSearchingUnits = ref(false) // 新增：查詢單位載入狀態
    const totalSurveyCount = ref(0) // 總問卷數量（不受搜尋影響）
    const currentSurveyCount = ref(0) // 當前顯示的問卷數量（受搜尋影響）

    // 計算屬性：header 顯示的問卷數量（使用總數量）
    const surveyCount = computed(() => totalSurveyCount.value)

    // 新增：根據關鍵字查詢報修單位
    const searchSurveyUnits = async (name) => {
        try {
            isSearchingUnits.value = true
            console.log('查詢報修單位，關鍵字:', name)
            
            // 如果關鍵字為空，清空單位列表
            if (!name || name.trim() === '') {
                surveyUnits.value = []
                return { success: true, data: [] }
            }
            
            const response = await axiosClient.get(`/backend/survey/unit/${name.trim()}`)
            console.log('報修單位查詢 API 回應:', response.data)
            
            surveyUnits.value = response.data.data || []
            
            return {
                success: true,
                data: surveyUnits.value
            }
        } catch (error) {
            console.error('查詢報修單位失敗:', error)
            surveyUnits.value = []
            
            return {
                success: false,
                message: error.response?.data?.message || '查詢報修單位失敗',
                data: []
            }
        } finally {
            isSearchingUnits.value = false
        }
    }

    // 新增：清空報修單位列表
    const clearSurveyUnits = () => {
        surveyUnits.value = []
    }

    // 獲取問卷列表
    const fetchSurveys = async (title = '') => {
        try {
            isLoading.value = true
            console.log('獲取問卷列表，標題篩選:', title)
            
            const params = {}
            if (title && title.trim()) {
                params.title = title.trim()
            }
            
            const response = await axiosClient.get('/survey/', { params })
            console.log('問卷列表 API 回應:', response.data)
            
            const responseData = response.data?.data || []
            
            // 如果沒有搜尋關鍵字，更新總數量
            if (!title || title.trim() === '') {
                totalSurveyCount.value = responseData.length
                console.log('更新總問卷數量:', totalSurveyCount.value)
            }
            
            // 更新當前顯示的數量
            currentSurveyCount.value = responseData.length
            
            surveys.value = response.data
            
            // 添加調試信息
            console.log('設置後的 surveys.value:', surveys.value)
            console.log('總問卷數量:', totalSurveyCount.value)
            console.log('當前問卷數量:', currentSurveyCount.value)
            
            return response.data
        } catch (error) {
            console.error('獲取問卷列表失敗:', error)
            throw error
        } finally {
            isLoading.value = false
        }
    }

    const fetchTotalSurveyCount = async () => {
        try {
            const response = await axiosClient.get('/survey/')
            const responseData = response.data?.data || []
            totalSurveyCount.value = responseData.length
            console.log('獲取總問卷數量:', totalSurveyCount.value)
            return totalSurveyCount.value
        } catch (error) {
            console.error('獲取總問卷數量失敗:', error)
            return totalSurveyCount.value
        }
    }

    // 新增：獲取前台問卷題目列表
    const fetchSurveyQuestionsList = async () => {
        try {
            isLoading.value = true
            console.log('獲取前台問卷題目列表')
            
            const response = await axiosClient.get('/survey/questions')
            console.log('前台問卷題目列表 API 回應:', response.data)

            surveyQuestionsList.value = response.data.data
            
            return response.data
        } catch (error) {
            console.error('獲取前台問卷題目列表失敗:', error)
            throw error
        } finally {
            isLoading.value = false
        }
    }

    const submitSurveyResponse = async (data) => {
        try {
            isSubmitting.value = true
            console.log('提交問卷回覆，資料:', data)
            
            const response = await axiosClient.post(`/survey/response`, data)
            console.log('問卷回覆提交 API 回應:', response.data)
            
            // 提交成功後，重新獲取總問卷數量
            await fetchTotalSurveyCount()
            
            return {
                success: true,
                message: response.data.message || '提交成功',
                data: response.data
            }
        } catch (error) {
            console.error('提交問卷回覆失敗:', error)
            
            // 返回統一的錯誤格式
            return {
                success: false,
                message: error.response?.data?.message || '提交失敗，請稍後重試',
                error: error.response?.data || error.message
            }
        } finally {
            isSubmitting.value = false
        }
    }

    const fetchSurveyResponseDetail = async (id) => {
        try {
            isLoading.value = true
            console.log('獲取問卷回覆詳情:', id)
            
            const response = await axiosClient.get(`/backend/survey/response/${id}`)
            console.log('問卷回覆詳情 API 回應:', response.data)
            
            return {
                success: true,
                data: response.data.data
            }
        } catch (error) {
            console.error('獲取問卷回覆詳情失敗:', error)
            return {
                success: false,
                message: error.response?.data?.message || '獲取詳情失敗'
            }
        } finally {
            isLoading.value = false
        }
    }

    // 獲取問卷回覆列表
    const fetchSurveyResponses = async (searchForm = {
        credential: '',
        unitId: '',
        startAt: '',
        endAt: '',
        pageSize: 10,
        page: 1,
        sortBy: 'created_at',
        sortOrder: 'ASC'
    }) => {
        try {
            isLoading.value = true
            console.log('獲取問卷回覆列表:', searchForm)
            
            const params = {}
            if (searchForm.credential) params.credential = searchForm.credential
            if (searchForm.unitId) params.unitId = searchForm.unitId
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
            params.pageSize = searchForm.pageSize
            params.page = searchForm.page
            params.sortBy = searchForm.sortBy
            params.sortOrder = searchForm.sortOrder.toUpperCase()
            
            const response = await axiosClient.get('/backend/survey/response', { params })
            console.log('問卷回覆列表 API 回應:', response.data)
            
            surveyResponses.value = response.data.data
            return response.data
        } catch (error) {
            console.error('獲取問卷回覆列表失敗:', error)
            if (error.response) {
                console.error('錯誤狀態:', error.response.status)
                console.error('錯誤資料:', error.response.data)
            }
            throw error
        } finally {
            isLoading.value = false
        }
    }

    const fetchSurveyQuestions = async (params = {}) => {
        try {
            isLoading.value = true
            
            const queryParams = {}
            if (params.content) queryParams.content = params.content
            if (params.status) queryParams.status = params.status
            if(params.sortBy){
                queryParams.sortBy = params.sortBy
            }else{
                queryParams.sortBy = 'sequence'
            }
            if(params.sortOrder){
                queryParams.sortOrder = params.sortOrder.toUpperCase()
            }else{
                queryParams.sortOrder = 'ASC'
            }
            if (params.page) queryParams.page = params.page
            if (params.pageSize) queryParams.pageSize = params.pageSize
            
            const response = await axiosClient.get('/backend/survey/question', { 
                params: queryParams 
            })
            console.log(response.data);
            
            return response.data.data
        } catch (error) {
            console.error('獲取問卷題目列表失敗:', error)
            throw error
        } finally {
            isLoading.value = false
        }
    }

    // 獲取問卷題目詳情
    const fetchSurveyQuestionDetail = async (id) => {
        try {
            const response = await axiosClient.get(`/backend/survey/question/${id}`)
            console.log(response);
            
            return { success: true, data: response.data.data }
        } catch (error) {
            return { success: false, message: error.response?.data?.message || '獲取失敗' }
        }
    }

    // 新增問卷題目
    const createSurveyQuestion = async (data) => {
        console.log(data);
        
        try {
            const response = await axiosClient.post('/backend/survey/question', data)
            return { success: true, data: response.data }
        } catch (error) {
            return { success: false, message: error.response?.data?.message || '新增失敗' }
        }
    }

    // 更新問卷題目
    const updateSurveyQuestion = async (id, data) => {
        try {
            const response = await axiosClient.patch(`/backend/survey/question/${id}`, data)
            return { success: true, data: response.data }
        } catch (error) {
            return { success: false, message: error.response?.data?.message || '更新失敗' }
        }
    }

    // 刪除問卷題目
    const deleteSurveyQuestion = async (id) => {
        try {
            await axiosClient.delete(`/backend/survey/question/${id}`)
            return { success: true }
        } catch (error) {
            return { success: false, message: error.response?.data?.message || '刪除失敗' }
        }
    }

    const downloadSurveyQuestionTemplate  = async () => {
        try {
            const response = await axiosClient.get('/backend/survey/question/import-template', {
                responseType: 'blob' // 設定響應類型為 blob
            });
            console.log(response.data);
            
            // 創建一個 URL 來下載檔案
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'survey_question_import_template.xlsx'); // 設定下載檔名
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link); // 下載後移除連結

            return { success: true, message: '問卷題目匯入範本下載成功' };
        } catch (error) {
            console.error('下載問卷題目匯入範本失敗:', error);
            return { success: false, message: '問卷題目匯入範本下載失敗' };
        }
    }

    const importSurveyQuestions = async (formData) => {
        try {
            isLoading.value = true;
            
            const response = await axiosClient.post('/backend/survey/question/import-question', formData, {
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
            
            console.log('問卷題目匯入回應:', response.data);
            
            isLoading.value = false;
            
            // 返回標準化的響應格式
            return {
                success: true,
                message: response.data.message || '匯入成功',
                data: response.data
            };
            
        } catch (error) {
            isLoading.value = false;
            console.error('問卷題目匯入失敗:', error);
            
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

    const updateSurveyQuestionSequence = async (id, sequence) => {
        console.log(id, ':', sequence);
        
        try {
            const response = await axiosClient.patch(`/backend/survey/question/${id}/sequence`, {
                sequence: sequence
            })
            return { success: true, data: response.data }
        } catch (error) {
            console.error('更新題目順序失敗:', error)
            return { 
                success: false, 
                message: error.response?.data?.message || '更新題目順序失敗' 
            }
        }
    }

    return {
        // 狀態
        surveys,
        surveyDetail,
        surveyResponses,
        surveyQuestionsList, // 前台問卷題目列表狀態
        surveyUnits, // 新增：報修單位列表狀態
        isLoading,
        isSubmitting,
        isSearchingUnits, // 新增：查詢單位載入狀態
        surveyCount,

        // 方法
        fetchSurveys,
        fetchSurveyResponses,
        fetchSurveyQuestions,
        fetchSurveyQuestionsList, // 前台問卷題目列表方法
        searchSurveyUnits, // 新增：查詢報修單位方法
        clearSurveyUnits, // 新增：清空報修單位列表方法

        fetchTotalSurveyCount,
        fetchSurveyQuestionDetail,
        createSurveyQuestion,
        updateSurveyQuestion,
        deleteSurveyQuestion,
        fetchSurveyResponseDetail,
        updateSurveyQuestionSequence,

        downloadSurveyQuestionTemplate,
        importSurveyQuestions,
        submitSurveyResponse,
    }
})
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axiosClient from '../axios' // 引入 axios 實例

export const useRepairStore = defineStore('repair', () => {

    const categories = ref(null); // 報修分類
    const reasons = ref(null); // 報修原因
    const statuses = ref(null); // 狀態
    const isLoading = ref(false)
    const isInitialized = ref(false) // 標記是否已初始化檢查

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

    return {
        categories,
        reasons,
        statuses,
        isLoading,
        isInitialized,
        fetchCategories,
        fetchReasons,
        fetchStatuses
    }


});
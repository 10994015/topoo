// stores/auth.js - 認證相關的 store
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axiosClient from '../axios' // 引入 axios 實例

export const useMenuStore = defineStore('menu', () => {
    const menuName = ref();
    const breadcrumbs = ref([]); 

    const setMenuName = (name) => {
        menuName.value = name;
    }

    const setBreadcrumbs = (items) => {
        breadcrumbs.value = items;
    }
    return {
        menuName,
        breadcrumbs,
        setMenuName,
        setBreadcrumbs
    }
})
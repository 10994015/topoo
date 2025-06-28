import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axiosClient from '../axios' // 引入 axios 實例

export const usePermissionStore = defineStore('permission', () => {

    const permissions = ref(null); // 權限群組列表
    const permission = ref(null); // 單個權限群組
    const isLoading = ref(false)

    const permissionCategories = ref([]); // 權限群組類別

    const permissionGroupMembers = ref([]);
    const fetchPermissions = async (searchForm = {
        text: '',
        status: '',
        sortField: '',
        sortOrder: '',
        page: 1,
        pageSize: 10,
    }) => {
        try {
            console.log(searchForm);
            
            const params = {};
            if (searchForm.text) params.name = searchForm.text;
            if (searchForm.sortField) params.sortBy = searchForm.sortField;
            if (searchForm.sortOrder) params.sortOrder = searchForm.sortOrder.toUpperCase(); // 確保排序方向是大寫
            params.page = searchForm.page;
            params.pageSize = searchForm.pageSize;
            console.log(params);
            
            const response = await axiosClient.get('/backend/auth/role', { params });
            console.log(response.data);
            permissions.value = response.data.data;
            return response.data;
        } catch (error) {
            console.error('獲取權限群組列表失敗:', error);
            throw error;
        }
    }

    // 獲得權限群組所有類別
    const getPermissionCategories = async () => {
        try {
            const response = await axiosClient.get('/backend/auth/permission');
            console.log(response.data);
            permissionCategories.value = []; // 清空之前的類別
            // 將每個權限群組的類別和權限添加到 permissionCategories 中
            for(let i=0; i< response.data.data.length; i++){
                for(let j=0; j< response.data.data[i].permissions.length; j++){
                    permissionCategories.value.push({
                        id: response.data.data[i].permissions[j].id,
                        category: response.data.data[i].category,
                        name: response.data.data[i].permissions[j].name,
                        mode: response.data.data[i].permissions[j].mode, 
                    })
                }
            }
            return response.data;
        } catch (error) {
            console.error('獲取權限群組類別失敗:', error);
            throw error;
        }
    }

    // 創建新的權限群組
    const createPermissionGroup = async (data) => {
        try {
            const rolePermissions = data.permissions.filter(permission => permission.mode != '')
            .map(permission => ({
                    permission_id: permission.id,
                    mode: permission.mode
            }))
            // 真正的送出資料
            const formattedData = {
                name: data.groupName,
                status: data.groupStatus,
                rolePermissions: rolePermissions
            }
            console.log(formattedData);
            
            const response = await axiosClient.post('/backend/auth/role', formattedData);
            console.log(response.data);
            // 創建成功後，重新獲取權限群組列表
            await fetchPermissions();
            return response.data;
        } catch (error) {
            console.error('創建權限群組失敗:', error.response?.data || error);
            return error.response;
        }
    }
    const getPermissionById = async (id) => {
        try {
            console.log(id);
            
            const response = await axiosClient.get(`/backend/auth/role/${id}`);
            console.log(response.data);
            
            permission.value = response.data.data;
            console.log(permission.value);
            return response.data.data;
        } catch (error) {
            console.error('獲取權限群組失敗:', error);
            throw error;
        }
    }

    const updatePermissionGroup = async (id, data) => {
        try {
            console.log(data);
            
            const rolePermissions = data.permissions.filter(permission => permission.mode != '')
            .map(permission => ({
                    permission_id: permission.id,
                    mode: permission.mode
            }))
            // 真正的送出資料
            const formattedData = {
                name: data.groupName,
                status: data.groupStatus,
                rolePermissions: rolePermissions
            }
            console.log(formattedData);
            
            const response = await axiosClient.patch(`/backend/auth/role/${id}`, formattedData);
            console.log(response.data);
            // 更新成功後，重新獲取權限群組列表
            permission.value = response.data.data;
            await fetchPermissions();
            return response.data;
        } catch (error) {
            console.error('更新權限群組失敗:', error);
            throw error;
        }
    }

    const deletePermissionGroup = async (id) => {
        try {
            const response = await axiosClient.delete(`/backend/auth/role/${id}`);
            console.log(response.data);
            // 刪除成功後，重新獲取權限群組列表
            await fetchPermissions();
            return response.data;
        } catch (error) {
            console.error('刪除權限群組失敗:', error);
            throw error;
        }
    }

    // 獲取權限群組的成員列表
    const getPermissionMembers = async (id, searchForm = {
        text: '',
        sortField: '',
        sortOrder: '',
        page: 1,
        pageSize: 10,
    }) => {
        try {
            console.log(searchForm);
            
            const params = {};
            if (searchForm.text) params.q = searchForm.text;
            if (searchForm.sortField) params.sortBy = searchForm.sortField;
            if (searchForm.sortOrder) params.sortOrder = searchForm.sortOrder.toUpperCase(); // 確保排序方向是大寫
            params.page = searchForm.page;
            params.pageSize = searchForm.pageSize;
            const response = await axiosClient.get(`/backend/auth/role/${id}/user`, { params });

            console.log('權限群組成員:', response.data);
            permissionGroupMembers.value = response.data.data;
            return response.data.data;
        } catch (error) {
            console.error('獲取權限群組成員失敗:', error);
            throw error;
        }
    }
    // 為權限群組添加成員
    const updateMembersToPermission = async (id, userIds) => {
        try {
            const response = await axiosClient.patch(`/backend/auth/role/${id}/user`, {
                userIds
            });
            console.log(response.data);
            return response.data;
        } catch (error) {
            console.error('添加成員失敗:', error);
            throw error;
        }
    }
    // 獲取所有可用權限選項
    const fetchAvailablePermissions = async () => {
        try {
            const response = await axiosClient.get('/backend/permissions');
            console.log('可用權限:', response.data);
            return response.data.data;
        } catch (error) {
            console.error('獲取可用權限失敗:', error);
            throw error;
        }
    }

    // 批量更新權限群組狀態
    const batchUpdateStatus = async (ids, status) => {
        try {
            const response = await axiosClient.patch('/backend/permission-group/batch-status', {
                ids,
                status
            });
            console.log(response.data);
            // 批量更新成功後，重新獲取權限群組列表
            await fetchPermissions();
            return response.data;
        } catch (error) {
            console.error('批量更新狀態失敗:', error);
            throw error;
        }
    }

    // 複製權限群組
    const duplicatePermission = async (id, newName) => {
        try {
            const response = await axiosClient.post(`/backend/permission-group/${id}/duplicate`, {
                name: newName
            });
            console.log(response.data);
            // 複製成功後，重新獲取權限群組列表
            await fetchPermissions();
            return response.data;
        } catch (error) {
            console.error('複製權限群組失敗:', error);
            throw error;
        }
    }

    

    

    // 從權限群組移除成員
    const removeMembersFromPermission = async (id, memberIds) => {
        try {
            const response = await axiosClient.delete(`/backend/permission-group/${id}/members`, {
                data: { memberIds }
            });
            console.log(response.data);
            return response.data;
        } catch (error) {
            console.error('移除成員失敗:', error);
            throw error;
        }
    }

    return {
        permissions,
        permission,
        isLoading,
        permissionCategories,
        permissionGroupMembers,
        fetchPermissions,
        getPermissionCategories,
        createPermissionGroup,
        getPermissionById,
        updatePermissionGroup,
        deletePermissionGroup,
        getPermissionMembers,
        updateMembersToPermission,
    }
})
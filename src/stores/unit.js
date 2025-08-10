import { defineStore } from 'pinia'
import { ref } from 'vue'
import axiosClient from '../axios' // 引入 axios 實例

export const useUnitStore = defineStore('unit', () => {
    const units = ref([]) // 單位列表
    const unitDetail = ref(null) // 單一單位詳細資料
    const isLoading = ref(false)
    const isInitialized = ref(false)

    // 深度搜尋單位 - 對應 GET /api/backend/unit/deep
    const fetchUnitsDeep = async (searchName) => {
        try {
            console.log('深度搜尋單位:', searchName);
            
            const params = {
                name: searchName
            };
            
            console.log('深度搜尋 API 參數:', params);
            
            const response = await axiosClient.get('/backend/unit/deep', { 
                params: params
            });
            
            console.log('深度搜尋回應:', response.data);
            
            return {
                success: true,
                data: response.data,
                message: response.data.message
            };
        } catch (error) {
            console.error('深度搜尋單位失敗:', error);
            
            if (error.response) {
                console.error('錯誤狀態:', error.response.status);
                console.error('錯誤資料:', error.response.data);
                throw new Error(error.response.data.message || '深度搜尋單位失敗');
            }
            throw error;
        }
    }
    const fetchUnitsByLayer = async (layerNumber = 1, searchParams = {}) => {
        try {
            console.log(`查詢第 ${layerNumber} 層單位:`, searchParams);
            
            const params = {
                // 必要參數
                number: layerNumber
            };
            
            // 可選參數
            if (searchParams.name) params.name = searchParams.name;
            if (searchParams.sortBy) params.sortBy = searchParams.sortBy;
            if (searchParams.sortOrder) params.sortOrder = searchParams.sortOrder;
            if (searchParams.page) params.page = searchParams.page;
            if (searchParams.pageSize) params.pageSize = searchParams.pageSize;
            
            console.log('API 參數:', params);
            
            const response = await axiosClient.get(`/backend/unit/layer/${layerNumber}`, { 
                params: {
                    name: params.name,
                    sortBy: params.sortBy,
                    sortOrder: params.sortOrder,
                    page: params.page,
                    pageSize: params.pageSize
                }
            });
            
            console.log(`第 ${layerNumber} 層單位查詢回應:`, response.data);
            
            return {
                success: true,
                data: response.data,
                message: response.data.message
            };
        } catch (error) {
            console.error(`查詢第 ${layerNumber} 層單位失敗:`, error);
            
            if (error.response) {
                console.error('錯誤狀態:', error.response.status);
                console.error('錯誤資料:', error.response.data);
                throw new Error(error.response.data.message || `查詢第 ${layerNumber} 層單位失敗`);
            }
            throw error;
        }
    }
    // 查詢單一單位 - 對應 GET /api/backend/unit/{id}  
    const fetchUnitById = async (unitId) => {
        try {
            console.log('查詢單位詳細資料:', unitId);
            
            const response = await axiosClient.get(`/backend/unit/${unitId}`);
            console.log('單位詳細資料回應:', response.data);
            
            unitDetail.value = response.data.data;
            
            return {
                success: true,
                data: response.data.data,
                message: response.data.message
            };
        } catch (error) {
            console.error('查詢單位詳細資料失敗:', error);
            
            if (error.response) {
                console.error('錯誤狀態:', error.response.status);
                console.error('錯誤資料:', error.response.data);
                throw new Error(error.response.data.message || '查詢單位詳細資料失敗');
            }
            throw error;
        }
    }
    // 建立搜尋結果的樹狀結構
    const buildSearchResultTree = (searchResults) => {
        const processUnit = (unit) => {
            const processedUnit = {
                id: unit.id,
                name: unit.name,
                layer: unit.layer,
                level: parseInt(unit.layer.substring(1)),
                created_at: unit.created_at,
                updated_at: unit.updated_at,
                deleted_at: unit.deleted_at,
                parent_id: unit.parent_id,
                hasChildren: true, // 預設為 true，保持可點擊狀態
                isExpanded: false, // 預設收合
                isLoading: false,
                children: []
            }
            
            // 遞歸處理子單位
            if (unit.sub_units && unit.sub_units.length > 0) {
                processedUnit.children = unit.sub_units.map(subUnit => 
                    processUnit(subUnit)
                )
                // 如果有子單位，自動展開（顯示搜尋結果）
                processedUnit.isExpanded = true
                processedUnit.hasChildren = true
            } else {
                // 沒有子單位在搜尋結果中，但仍然保持可點擊
                // 點擊後會呼叫 API 檢查是否真的有子單位
                processedUnit.hasChildren = true
                processedUnit.isExpanded = false
                processedUnit.children = []
            }
            
            return processedUnit
        }
        
        return searchResults.map(unit => processUnit(unit))
    }
    const buildUnitTree = async (parentUnits) => {
        const unitsWithChildren = []
        
        for (const unit of parentUnits) {
            const unitWithChildren = {
                id: unit.id,
                name: unit.name,
                layer: unit.layer, // "L1", "L2", etc.
                level: parseInt(unit.layer.substring(1)), // 轉換 "L1" -> 1
                created_at: unit.created_at,
                updated_at: unit.updated_at,
                deleted_at: unit.deleted_at,
                parent_id: unit.parent_id,
                hasChildren: true, // 預設都是 true，假定都有子單位
                isExpanded: false, // 預設收合
                isLoading: false,
                children: [] // 空陣列，動態載入時才填入
            }
            
            unitsWithChildren.push(unitWithChildren)
        }
        
        return unitsWithChildren
    }
    // 載入子單位資料
    const loadChildUnits = async (parentUnitId, parentIndex = null) => {
        try {
            console.log('載入子單位:', parentUnitId);
            
            // 設定載入狀態
            if (parentIndex !== null && units.value[parentIndex]) {
                units.value[parentIndex].isLoading = true
            }
            
            const response = await fetchUnitById(parentUnitId)
            
            if (response.success && response.data) {
                const unitData = response.data
                
                // 建立子單位陣列 - 從 sub_units 取得
                const childUnits = []
                
                if (unitData.sub_units && unitData.sub_units.length > 0) {
                    // 有子單位
                    for (const subUnit of unitData.sub_units) {
                        childUnits.push({
                            id: subUnit.sub_unit_id,
                            name: subUnit.sub_unit_name,
                            layer: `L${parseInt(unitData.layer.substring(1)) + 1}`, // 父層 L1 -> 子層 L2
                            level: parseInt(unitData.layer.substring(1)) + 1,
                            created_at: unitData.created_at, // 可能需要子單位自己的時間
                            updated_at: unitData.updated_at,
                            deleted_at: null, // 子單位資訊可能需要額外查詢
                            parent_id: parentUnitId,
                            hasChildren: true, // 預設都是 true
                            isExpanded: false,
                            isLoading: false,
                            children: []
                        })
                    }
                    
                    // 更新父單位狀態：確定有子單位
                    if (parentIndex !== null && units.value[parentIndex]) {
                        units.value[parentIndex].hasChildren = true
                        units.value[parentIndex].children = childUnits
                        units.value[parentIndex].isExpanded = true
                        units.value[parentIndex].isLoading = false
                    }
                } else {
                    // 沒有子單位 - 設定為 false，之後就不會再撈 API
                    if (parentIndex !== null && units.value[parentIndex]) {
                        units.value[parentIndex].hasChildren = false
                        units.value[parentIndex].children = []
                        units.value[parentIndex].isExpanded = false // 沒有子單位就不展開
                        units.value[parentIndex].isLoading = false
                    }
                }
                
                return childUnits
            }
            
            return []
        } catch (error) {
            console.error('載入子單位失敗:', error);
            
            // API 失敗時，設定為沒有子單位，避免重複嘗試
            if (parentIndex !== null && units.value[parentIndex]) {
                units.value[parentIndex].hasChildren = false
                units.value[parentIndex].isLoading = false
                units.value[parentIndex].isExpanded = false
            }
            
            throw error
        }
    }
    // 初始化載入第一層單位
    const initializeUnits = async (searchParams = {}) => {
        try {
            isLoading.value = true
            console.log('初始化載入第一層單位');
            
            const defaultParams = {
                sortBy: 'name',
                sortOrder: 'ASC',
                page: 1,
                pageSize: 10,
                ...searchParams
            }
            
            const response = await fetchUnitsByLayer(1, defaultParams)
            
            if (response.success && response.data && response.data.data) {
                const unitsData = response.data.data.data || response.data.data
                units.value = await buildUnitTree(unitsData)
                
                console.log('第一層單位載入完成:', units.value);
                return response.data
            }
            
            units.value = []
            return null
        } catch (error) {
            console.error('初始化單位失敗:', error);
            units.value = []
            throw error
        } finally {
            isLoading.value = false
            isInitialized.value = true
        }
    }
    // 搜尋單位（支援深度搜尋和第一層搜尋）
    const searchUnits = async (searchParams = {}) => {
        try {
            console.log('搜尋單位:', searchParams);
            
            // 如果有 name 參數且不為空，使用深度搜尋
            if (searchParams.name && searchParams.name.trim()) {
                console.log('使用深度搜尋 API');
                const response = await fetchUnitsDeep(searchParams.name.trim())
                
                if (response.success && response.data && response.data.data) {
                    const searchResults = response.data.data
                    units.value = buildSearchResultTree(searchResults)
                    console.log('深度搜尋結果處理完成:', units.value);
                    return response.data
                }
                
                units.value = []
                return null
            } else {
                // 沒有搜尋關鍵字，使用原本的第一層查詢
                console.log('使用第一層查詢 API');
                const params = {
                    sortBy: 'name',
                    sortOrder: 'ASC',
                    page: 1,
                    pageSize: 10,
                    ...searchParams
                }
                
                const response = await fetchUnitsByLayer(1, params)
                
                if (response.success && response.data && response.data.data) {
                    const unitsData = response.data.data.data || response.data.data
                    units.value = await buildUnitTree(unitsData)
                    return response.data
                }
                
                return null
            }
        } catch (error) {
            console.error('搜尋單位失敗:', error);
            throw error
        }
    }
    // 切換展開/收合狀態
    const toggleUnitExpansion = async (unitId, unitIndex) => {
        try {
            const unit = units.value[unitIndex]
            if (!unit) return
            
            if (unit.isExpanded) {
                // 收合
                unit.isExpanded = false
                unit.children = [] // 清空子單位，下次展開時重新載入
            } else {
                // 展開邏輯：
                // 1. hasChildren 為 false，不撈 API
                // 2. children 已經有資料，直接展開
                // 3. hasChildren 為 true 且 children 為空，撈 API
                
                if (unit.hasChildren === false) {
                    // 已經確定沒有子單位，不做任何動作
                    console.log('此單位沒有子單位，不執行 API')
                    return
                }
                
                if (unit.children && unit.children.length > 0) {
                    // 已經載入過子單位，直接展開
                    console.log('使用已載入的子單位資料')
                    unit.isExpanded = true
                } else {
                    // 載入子單位
                    console.log('載入子單位資料')
                    await loadChildUnits(unitId, unitIndex)
                }
            }
        } catch (error) {
            console.error('切換展開狀態失敗:', error);
            throw error
        }
    }
    // 重置狀態
    const resetUnits = () => {
        units.value = []
        unitDetail.value = null
        isLoading.value = false
        isInitialized.value = false
    }
    // 查詢單位底下的有資格用戶 - 對應 GET /api/backend/unit/{id}/user
    const fetchUnitUsers = async (unitId, searchParams = {}) => {
        try {
            console.log(`查詢單位 ${unitId} 的有資格用戶:`, searchParams);
            
            const params = {
                // 可選參數
                q: searchParams.q || undefined,
                sortBy: searchParams.sortBy || 'name',
                sortOrder: searchParams.sortOrder || 'ASC',
                page: searchParams.page || 1,
                pageSize: searchParams.pageSize || 10
            };
            
            // 移除 undefined 值
            Object.keys(params).forEach(key => {
                if (params[key] === undefined) {
                    delete params[key];
                }
            });
            
            console.log('查詢用戶 API 參數:', params);
            
            const response = await axiosClient.get(`/backend/unit/${unitId}/user`, { 
                params: params
            });
            
            console.log(`單位 ${unitId} 用戶查詢回應:`, response.data);
            
            return {
                success: true,
                data: response.data,
                message: response.data.message
            };
        } catch (error) {
            console.error(`查詢單位 ${unitId} 用戶失敗:`, error);
            
            if (error.response) {
                console.error('錯誤狀態:', error.response.status);
                console.error('錯誤資料:', error.response.data);
                throw new Error(error.response.data.message || `查詢單位用戶失敗`);
            }
            throw error;
        }
    }
    // 如果沒有單位ID 則用該funcion 查用戶
    const fetchEmptyUnitUsers = async (searchParams = {}) => {
        try {
            console.log('查詢所有有資格用戶:', searchParams);
            
            const params = {
                // 可選參數
                q: searchParams.q || undefined,
                sortBy: searchParams.sortBy || 'name',
                sortOrder: searchParams.sortOrder || 'ASC',
                page: searchParams.page || 1,
                pageSize: searchParams.pageSize || 10
            };
            
            // 移除 undefined 值
            Object.keys(params).forEach(key => {
                if (params[key] === undefined) {
                    delete params[key];
                }
            });
            
            console.log('查詢用戶 API 參數:', params);
            
            const response = await axiosClient.get('/backend/unit/user', { 
                params: params
            });
            
            console.log('所有有資格用戶查詢回應:', response.data);
            
            return {
                success: true,
                data: response.data,
                message: response.data.message
            };
        } catch (error) {
            console.error('查詢所有有資格用戶失敗:', error);
            
            if (error.response) {
                console.error('錯誤狀態:', error.response.status);
                console.error('錯誤資料:', error.response.data);
                throw new Error(error.response.data.message || '查詢所有有資格用戶失敗');
            }
            throw error;
        }
    }


    // 新增單位 - 對應 POST /api/backend/unit/
    const createUnit = async (unitData) => {
        try {
            console.log('新增單位資料:', unitData);
            
            const response = await axiosClient.post('/backend/unit/', unitData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('新增單位回應:', response.data);
            
            return {
                success: true,
                data: response.data.data || response.data,
                message: response.data.message
            };
        } catch (error) {
            console.error('新增單位失敗:', error);
            
            if (error.response) {
                console.error('錯誤狀態:', error.response.status);
                console.error('錯誤資料:', error.response.data);
                throw new Error(error.response.data.message || '新增單位失敗');
            }
            throw error;
        }
    }

    // 編輯單位 - 對應 PATCH /api/backend/unit/{id}
    const updateUnit = async (unitId, unitData) => {
        try {
            console.log('編輯單位資料:', { unitId, unitData });
            
            const response = await axiosClient.patch(`/backend/unit/${unitId}`, unitData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('編輯單位回應:', response.data);
            
            return {
                success: true,
                data: response.data.data || response.data,
                message: response.data.message
            };
        } catch (error) {
            console.error('編輯單位失敗:', error);
            
            if (error.response) {
                console.error('錯誤狀態:', error.response.status);
                console.error('錯誤資料:', error.response.data);
                throw new Error(error.response.data.message || '編輯單位失敗');
            }
            throw error;
        }
    }
    const deleteUnit = async (unitId) => {
        try {
            console.log('刪除單位:', unitId);

            
            const response = await axiosClient.delete(`/backend/unit/${unitId}`);
            console.log('刪除單位回應:', response.data);
            
            return {
                success: true,
                message: response.data.message
            };
        } catch (error) {
            console.error('刪除單位失敗:', error);
            
            if (error.response) {
                console.error('錯誤狀態:', error.response.status);
                console.error('錯誤資料:', error.response.data);
                throw new Error(error.response.data.message || '刪除單位失敗');
            }
            throw error;
        }
    }
  
    return {
        // 狀態
        units,
        unitDetail,
        isLoading,
        isInitialized,
        
        // 方法
        fetchUnitsByLayer,
        fetchUnitById,
        fetchUnitsDeep,
        buildUnitTree,
        buildSearchResultTree,
        loadChildUnits,
        initializeUnits,
        searchUnits,
        toggleUnitExpansion,
        resetUnits,
        fetchUnitUsers,
        createUnit,
        updateUnit,
        deleteUnit,
        fetchEmptyUnitUsers
    }
})
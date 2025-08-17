
<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUnitStore } from '@/stores/unit'
import { formatDateTime } from '@/utils/dateUtils'
import { PERMISSIONS } from '@/utils/permissions'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const unitStore = useUnitStore()
const authStore = useAuthStore()

const hasWriteUnitPermission = computed(() => authStore.canModify(PERMISSIONS.UNIT_MANAGEMENT))


// 路由參數
const parentId = ref(route.params.parentId || null)
const editUnitId = ref(route.params.id || null)
const isInsertMode = computed(() => route.name === 'app.settings.unit.unit-insert')
const isCreateMode = computed(() => route.name === 'app.settings.unit.unit-create')
const isEditMode = computed(() => route.name === 'app.settings.unit.unit-edit')

// 表單資料
const formData = reactive({
  unitLayers: [
    { 
      level: 1, // 確保第一層是 level 1
      type: 'select', 
      selectedId: '', 
      inputValue: '', 
      options: [], 
      isLoading: false, 
      isLocked: false 
    }
  ]
})
// 備份資料
const backupData = reactive({
  originalUnitName: '',
  originalUserSelections: []
})

// 編輯模式專用資料
const editUnitData = ref(null)
const originalUnitName = ref('')
const isEditingUnitName = ref(false) // 控制單位名稱是否可編輯
const unitUsersCount = ref(0) // 單位用戶數量

// 載入狀態
const isLoading = ref(false)
const isSaving = ref(false)

// 用戶管理相關
const searchKeyword = ref('')
const pageSize = ref(10)
const currentPage = ref(1)
const isSearching = ref(false)
const isLoadingUsers = ref(false)

// 用戶資料
const availableUsers = ref([])
const totalUsers = ref(0)
const totalPages = ref(0)

// 分頁控制
const visiblePages = computed(() => {
  const pages = []
  const total = totalPages.value
  const current = currentPage.value
  
  if (total <= 5) {
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    if (current <= 3) {
      for (let i = 1; i <= 4; i++) {
        pages.push(i)
      }
    } else if (current >= total - 2) {
      for (let i = total - 3; i <= total; i++) {
        pages.push(i)
      }
    } else {
      for (let i = current - 1; i <= current + 1; i++) {
        pages.push(i)
      }
    }
  }
  
  return pages
})

const showEllipsis = computed(() => {
  return totalPages.value > 5 && currentPage.value < totalPages.value - 2
})

// 當前選擇的單位 ID（用於查詢用戶）
const currentUnitId = computed(() => {
  // 編輯模式：直接返回編輯單位的 ID
  if (isEditMode.value && editUnitData.value) {
    return editUnitData.value.id
  }
  
  // 其他模式：找到最後一個有 selectedId 的層級
  for (let i = formData.unitLayers.length - 1; i >= 0; i--) {
    const layer = formData.unitLayers[i]
    if (layer.type === 'select' && layer.selectedId) {
      return layer.selectedId
    }
  }
  return null
})

const selectedUsers = computed(() => {
  return availableUsers.value.filter(user => user.isSelected)
})

// 計算最終單位路徑
const unitPath = computed(() => {
  return formData.unitLayers
    .filter(layer => layer.selectedId || layer.inputValue)
    .map(layer => {
      if (layer.type === 'select' && layer.selectedId) {
        const option = layer.options.find(opt => opt.id === layer.selectedId)
        return option ? option.name : ''
      } else if (layer.type === 'input' && layer.inputValue) {
        return layer.inputValue
      }
      return ''
    })
    .filter(name => name)
    .join(' > ')
})

// 從編輯單位 ID 建構完整路徑並初始化表單
const buildEditUnitPath = async (targetUnitId) => {
  try {
    console.log('建構編輯單位路徑，目標 ID:', targetUnitId)
    
    // 查詢目標單位的詳細資料
    const response = await unitStore.fetchUnitById(targetUnitId)
    if (!response.success || !response.data) {
      throw new Error('無法取得單位資料')
    }
    
    const targetUnit = response.data
    console.log('目標單位資料:', targetUnit)
    
    // 儲存編輯單位資料
    editUnitData.value = targetUnit
    originalUnitName.value = targetUnit.name
    
    // 計算用戶數量
    unitUsersCount.value = targetUnit.users ? targetUnit.users.length : 0
    console.log('單位用戶數量:', unitUsersCount.value)
    
    // 建構從根到目標單位的完整路徑
    const path = []
    
    // 遞歸往上找父層
    const buildPath = async (unit) => {
      const levelNumber = parseInt(unit.layer.substring(1))
      
      path.unshift({
        id: unit.id,
        name: unit.name,
        layer: unit.layer,
        level: levelNumber,
        isTarget: unit.id === targetUnitId // 標記目標單位
      })
      
      if (unit.parent_id) {
        const parentResponse = await unitStore.fetchUnitById(unit.parent_id)
        if (parentResponse.success && parentResponse.data) {
          await buildPath(parentResponse.data)
        }
      }
    }
    
    await buildPath(targetUnit)
    console.log('編輯模式完整路徑:', path)
    
    return path
  } catch (error) {
    console.error('建構編輯單位路徑失敗:', error)
    throw error
  }
}

// 根據編輯模式路徑初始化表單
const initializeEditForm = async (path) => {
  try {
    console.log('根據編輯路徑初始化表單:', path)
    
    // 重置表單層級
    formData.unitLayers = []
    
    // 為每一層建立表單層級
    for (let i = 0; i < path.length; i++) {
      const pathItem = path[i]
      
      // 載入當前層級的選項
      let options = []
      if (i === 0) {
        // 第一層
        options = await loadLayerOptions(1)
      } else {
        // 其他層級，基於父 ID 載入
        const parentPathItem = path[i - 1]
        const response = await unitStore.fetchUnitById(parentPathItem.id)
        if (response.success && response.data && response.data.sub_units) {
          options = response.data.sub_units.map(subUnit => ({
            id: subUnit.sub_unit_id,
            name: subUnit.sub_unit_name,
            layer: `L${i + 1}`
          }))
        }
      }
      
      // 建立表單層級
      const formLayer = {
        level: pathItem.level,
        type: 'select',
        selectedId: pathItem.id,
        inputValue: pathItem.isTarget ? pathItem.name : '', // 只有目標單位才有 inputValue
        options: options,
        isLoading: false,
        isLocked: !pathItem.isTarget, // 只有目標單位不鎖定
        isTarget: pathItem.isTarget || false // 標記目標單位
      }
      
      // 如果是目標單位，設為 input 模式讓用戶可以編輯名稱
      if (pathItem.isTarget) {
        formLayer.type = 'input'
        formLayer.inputValue = pathItem.name
        formLayer.selectedId = ''
        formLayer.isLocked = true // 預設鎖定，需要點擊編輯按鈕才能解鎖
      }
      
      formData.unitLayers.push(formLayer)
    }
    
    console.log('編輯模式表單初始化完成:', formData.unitLayers)
    
    // 編輯模式初始化完成後，立即載入目標單位的用戶資料
    console.log('🚀 編輯模式：開始載入目標單位的用戶資料，單位ID:', editUnitData.value.id)
    await loadUsers(editUnitData.value.id)
    
  } catch (error) {
    console.error('初始化編輯表單失敗:', error)
    throw error
  }
}
const buildParentPath = async (targetParentId) => {
  try {
    console.log('建構父層路徑，目標 ID:', targetParentId)
    
    // 查詢目標單位的詳細資料
    const response = await unitStore.fetchUnitById(targetParentId)
    if (!response.success || !response.data) {
      throw new Error('無法取得父單位資料')
    }
    
    const parentUnit = response.data
    console.log('父單位資料:', parentUnit)
    
    // 建構從根到父單位的完整路徑
    const path = []
    
    // 遞歸往上找父層
    const buildPath = async (unit) => {
      // 從 layer 字串中提取數字 (例如 "L2" -> 2)
      const levelNumber = parseInt(unit.layer.substring(1))
      
      path.unshift({
        id: unit.id,
        name: unit.name,
        layer: unit.layer,
        level: levelNumber
      })
      
      if (unit.parent_id) {
        const parentResponse = await unitStore.fetchUnitById(unit.parent_id)
        if (parentResponse.success && parentResponse.data) {
          await buildPath(parentResponse.data)
        }
      }
    }
    
    await buildPath(parentUnit)
    console.log('完整路徑:', path)
    
    return path
  } catch (error) {
    console.error('建構父層路徑失敗:', error)
    throw error
  }
}

// 根據父層路徑初始化表單
const initializeFormFromPath = async (path) => {
  try {
    console.log('根據路徑初始化表單:', path)
    
    // 重置表單層級
    formData.unitLayers = []
    
    // 為每一層建立表單層級
    for (let i = 0; i < path.length; i++) {
      const pathItem = path[i]
      const isLastParent = i === path.length - 1
      
      // 載入當前層級的選項
      let options = []
      if (i === 0) {
        // 第一層
        options = await loadLayerOptions(1)
      } else {
        // 其他層級，基於父 ID 載入
        const parentPathItem = path[i - 1]
        const response = await unitStore.fetchUnitById(parentPathItem.id)
        if (response.success && response.data && response.data.sub_units) {
          options = response.data.sub_units.map(subUnit => ({
            id: subUnit.sub_unit_id,
            name: subUnit.sub_unit_name,
            layer: `L${i + 1}`
          }))
        }
      }
      
      // 建立表單層級
      const formLayer = {
        level: pathItem.level,
        type: 'select',
        selectedId: pathItem.id,
        inputValue: '',
        options: options,
        isLoading: false,
        isLocked: true // 父層都鎖定不可更改
      }
      
      formData.unitLayers.push(formLayer)
    }
    
    // 添加新的輸入層級（給用戶輸入新單位名稱）
    const nextLevel = path.length + 1
    if (nextLevel <= 5) {
      console.log(`插入模式：添加第 ${nextLevel} 層輸入欄位`)
      formData.unitLayers.push({
        level: nextLevel,
        type: 'input', // 預設為輸入模式
        selectedId: '',
        inputValue: '',
        options: [],
        isLoading: false,
        isLocked: false // 新增的層級不鎖定
      })
    }
    
    console.log('表單初始化完成:', formData.unitLayers)
  } catch (error) {
    console.error('初始化表單失敗:', error)
    throw error
  }
}

// 修復後的 handleLayerChange 函數
const handleLayerChange = async (layerIndex) => {
  const currentLayer = formData.unitLayers[layerIndex]
  
  // 編輯模式下，如果是目標單位層級，只處理名稱變更，不清除後續層級
  if (isEditMode.value && currentLayer.isTarget) {
    console.log('編輯模式：目標單位名稱變更')
    return
  }
  
  // 清除後續層級
  formData.unitLayers = formData.unitLayers.slice(0, layerIndex + 1)
  
  // 只有當前層是 select 類型且有選擇時，才載入下一層選項
  if (currentLayer.type === 'select' && currentLayer.selectedId) {
    await loadNextLayerOptions(layerIndex + 1, currentLayer.selectedId)
  }
  
  // 移除自動添加 input 層級的邏輯
  // 用戶需要手動點擊按鈕來添加 input 層級
}

// 載入指定層級的選項
const loadLayerOptions = async (layerNumber) => {
  try {
    console.log(`載入第 ${layerNumber} 層選項`)
    const response = await unitStore.fetchUnitsByLayer(layerNumber, {})
    
    if (response.success && response.data && response.data.data) {
      const unitsData = response.data.data.data || response.data.data
      return unitsData.map(unit => ({
        id: unit.id,
        name: unit.name,
        layer: unit.layer
      }))
    }
    
    return []
  } catch (error) {
    console.error(`載入第 ${layerNumber} 層選項失敗:`, error)
    return []
  }
}

// 修復後的 loadNextLayerOptions 函數
const loadNextLayerOptions = async (nextLayerLevel, parentId) => {
  if (nextLayerLevel > 5) return
  
  try {
    console.log(`載入第 ${nextLayerLevel} 層選項，父級 ID:`, parentId)
    
    // 使用 fetchUnitById 獲取子單位
    const response = await unitStore.fetchUnitById(parentId)
    
    if (response.success && response.data && response.data.sub_units) {
      const options = response.data.sub_units.map(subUnit => ({
        id: subUnit.sub_unit_id,
        name: subUnit.sub_unit_name,
        layer: `L${nextLayerLevel}`
      }))
      
      // 關鍵修復：只有當有選項時才添加 select 層級
      if (options.length > 0) {
        const newLayer = {
          level: nextLayerLevel,
          type: 'select', // 有選項時使用 select
          selectedId: '',
          inputValue: '',
          options: options,
          isLoading: false,
          isLocked: false
        }
        
        formData.unitLayers.push(newLayer)
      }
      // 如果沒有子單位，不添加任何層級
      // 用戶需要手動點擊"添加層級"按鈕來添加 input 層級
    }
  } catch (error) {
    console.error(`載入第 ${nextLayerLevel} 層選項失敗:`, error)
    // 載入失敗時也不自動添加 input 層級
  }
}

// 修復後的 addInputLayer 函數
const addInputLayer = (level) => {
  if (level > 5) return
  
  // 檢查是否已經有這個層級
  const existingLayer = formData.unitLayers.find(layer => layer.level === level)
  if (existingLayer) {
    console.log(`第 ${level} 層已存在，不重複添加`)
    return
  }
  
  console.log(`添加第 ${level} 層 input`)
  formData.unitLayers.push({
    level: level, // 確保 level 正確
    type: 'input',
    selectedId: '',
    inputValue: '',
    options: [],
    isLoading: false,
    isLocked: false
  })
}

// 切換層級類型（select/input）
const toggleLayerType = async (layerIndex) => {
  const layer = formData.unitLayers[layerIndex]
  
  // 如果是鎖定的層級，不允許切換
  if (layer.isLocked) {
    console.log('此層級已鎖定，不允許切換類型')
    return
  }
  
  if (layer.type === 'select') {
    // 切換到 input
    layer.type = 'input'
    layer.selectedId = ''
    layer.inputValue = ''
  } else {
    // 切換到 select，需要載入選項
    layer.type = 'select'
    layer.inputValue = ''
    layer.selectedId = ''
    layer.isLoading = true
    
    try {
      // 根據是否有父級決定載入方式
      if (layerIndex === 0) {
        // 第一層直接載入
        layer.options = await loadLayerOptions(1)
      } else {
        // 其他層基於父級載入
        const parentLayer = formData.unitLayers[layerIndex - 1]
        if (parentLayer.selectedId) {
          const response = await unitStore.fetchUnitById(parentLayer.selectedId)
          if (response.success && response.data && response.data.sub_units) {
            layer.options = response.data.sub_units.map(subUnit => ({
              id: subUnit.sub_unit_id,
              name: subUnit.sub_unit_name,
              layer: `L${layer.level}`
            }))
          }
        }
      }
    } catch (error) {
      console.error('載入選項失敗:', error)
      layer.options = []
    } finally {
      layer.isLoading = false
    }
  }
  
  // 清除後續層級
  formData.unitLayers = formData.unitLayers.slice(0, layerIndex + 1)
}

// 載入用戶資料
const loadUsers = async (unitId = null, forceReload = false) => {
  try {
    isLoadingUsers.value = true
    
    const searchParams = {
      q: searchKeyword.value || undefined,
      sortBy: 'name',
      sortOrder: 'ASC',
      page: currentPage.value,
      pageSize: pageSize.value
    }
    
    let response
    
    if (unitId) {
      // 有單位 ID，查詢特定單位的用戶
      console.log('🔄 載入單位用戶:', { 
        unitId, 
        forceReload,
        isEditMode: isEditMode.value, 
        editUnitId: editUnitData.value?.id,
        unitName: editUnitData.value?.name,
        timestamp: new Date().toLocaleTimeString()
      })
      
      console.log('📡 發送 fetchUnitUsers API 請求...')
      if(isInsertMode.value){
        // 插入模式，查詢所有有資格的用戶
        response = await unitStore.fetchEmptyUnitUsers(searchParams)
      } else {
        // 編輯模式或其他情況，查詢特定單位的用戶
        response = await unitStore.fetchUnitUsers(unitId, searchParams)
      }
      console.log('📡 fetchUnitUsers API 回應:', response)
    } else {
      // 沒有單位 ID，查詢所有有資格的用戶
      console.log('🔄 載入所有有資格用戶:', { 
        forceReload,
        searchParams,
        timestamp: new Date().toLocaleTimeString()
      })
      
      console.log('📡 發送 fetchEmptyUnitUsers API 請求...')
      response = await unitStore.fetchEmptyUnitUsers(searchParams)
      console.log('📡 fetchEmptyUnitUsers API 回應:', response)
    }
    
    if (response.success && response.data && response.data.data) {
      const usersData = response.data.data
      console.log('📊 原始用戶資料:', usersData)
      
      // 處理用戶資料，加入 isSelected 狀態
      let processedUsers
      
      if (unitId) {
        // 有單位 ID 的情況：根據 is_join 設定 isSelected
        processedUsers = usersData.data.map(user => ({
          id: user.id,
          account: user.credential,
          name: user.name,
          nick_name: user.nick_name,
          repair_unit: user.repair_unit,
          status: user.is_join ? '已加入' : '未加入',
          is_join: user.is_join,
          isSelected: user.is_join // 已加入的預設選中
        }))
      } else {
        // 沒有單位 ID 的情況：所有用戶預設未選中
        processedUsers = usersData.data.map(user => ({
          id: user.id,
          account: user.credential,
          name: user.name,
          nick_name: user.nick_name,
          repair_unit: user.repair_unit,
          status: '未加入',
          is_join: false, // 預設未加入任何特定單位
          isSelected: false // 預設未選中
        }))
      }
      
      // ✨ 新增：將已加入的用戶排序置頂
      if (unitId) {
        // 將用戶分為兩組：已加入的和未加入的
        const joinedUsers = processedUsers.filter(user => user.is_join)
        const notJoinedUsers = processedUsers.filter(user => !user.is_join)
        
        // 對兩組分別按照姓名排序（保持原有的排序邏輯）
        const sortUsers = (users) => {
          return users.sort((a, b) => {
            return a.name.localeCompare(b.name, 'zh-Hant', { numeric: true })
          })
        }
        
        // 合併：已加入的用戶在前，未加入的用戶在後
        processedUsers = [
          ...sortUsers(joinedUsers),
          ...sortUsers(notJoinedUsers)
        ]
        
        console.log('🔝 用戶排序完成:', {
          joinedCount: joinedUsers.length,
          notJoinedCount: notJoinedUsers.length,
          totalCount: processedUsers.length
        })
      }
      
      console.log('🔄 更新 availableUsers.value...')
      availableUsers.value = processedUsers
      
      // 更新分頁資訊
      totalUsers.value = usersData.total || 0
      totalPages.value = usersData.totalPages || 0
      currentPage.value = usersData.page || 1
      
      if (unitId) {
        console.log(`✅ 單位用戶載入完成:`, {
          unitId,
          unitName: editUnitData.value?.name,
          totalUsers: availableUsers.value.length,
          joinedUsers: availableUsers.value.filter(u => u.isSelected).length,
          notJoinedUsers: availableUsers.value.filter(u => !u.isSelected).length,
          timestamp: new Date().toLocaleTimeString()
        })
        
        // 如果是編輯模式，額外顯示加入狀態詳情
        if (isEditMode.value) {
          console.log('📊 編輯模式用戶狀態詳情（已按加入狀態排序）:')
          availableUsers.value.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name} (${user.account}): ${user.is_join ? '✅ 已加入' : '❌ 未加入'}`)
          })
        }
      } else {
        console.log(`✅ 所有用戶載入完成:`, {
          totalUsers: availableUsers.value.length,
          allUsersAvailable: true,
          timestamp: new Date().toLocaleTimeString()
        })
      }
      
      console.log('✅ availableUsers.value 更新完成，當前長度:', availableUsers.value.length)
    } else {
      console.log('⚠️ 無用戶資料返回或回應格式錯誤:', response)
      availableUsers.value = []
      totalUsers.value = 0
      totalPages.value = 0
    }
  } catch (error) {
    console.error('❌ 載入用戶失敗:', error)
    console.error('❌ 錯誤詳情:', error.stack)
    availableUsers.value = []
    totalUsers.value = 0
    totalPages.value = 0
    alert('載入用戶資料失敗，請稍後再試')
  } finally {
    isLoadingUsers.value = false
    console.log('🏁 loadUsers 函數執行完成，isLoadingUsers:', isLoadingUsers.value)
  }
}


// 用戶搜尋
const searchUsers = async () => {
  currentPage.value = 1
  await loadUsers(currentUnitId.value)
}

// 重置搜尋
const resetSearch = () => {
  searchKeyword.value = ''
  currentPage.value = 1
  if (currentUnitId.value) {
    loadUsers(currentUnitId.value)
  }
}

// 分頁變更
const goToPage = async (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    await loadUsers(currentUnitId.value)
  }
}

// 監聽頁面大小變更
watch(pageSize, async () => {
  currentPage.value = 1
  if (currentUnitId.value) {
    await loadUsers(currentUnitId.value)
  }
})

// 監聽單位變更
watch(currentUnitId, async (newUnitId, oldUnitId) => {
  console.log('單位變更監聽器觸發:', { newUnitId, oldUnitId, isEditMode: isEditMode.value })
  
  // 編輯模式下，如果是初始化載入，不重複觸發
  if (isEditMode.value && oldUnitId === null && newUnitId === editUnitData.value?.id) {
    console.log('編輯模式初始化，跳過重複載入用戶')
    return
  }
  
  // 編輯模式下，如果是手動重新載入（reloadEditPageData 觸發），允許執行
  if (isEditMode.value && newUnitId === editUnitData.value?.id) {
    console.log('編輯模式：允許重新載入用戶資料')
    currentPage.value = 1
    searchKeyword.value = ''
    await loadUsers(newUnitId)
    return
  }
  
  // 編輯模式下，單位ID不應該變更，如果變更了就有問題
  if (isEditMode.value && newUnitId !== editUnitData.value?.id) {
    console.warn('編輯模式下單位ID異常變更，保持原有單位ID')
    return
  }
  
  // 非編輯模式的正常處理
  if (!isEditMode.value) {
    currentPage.value = 1
    searchKeyword.value = ''
    await loadUsers(newUnitId)
  }
})

const toggleUserSelection = (userId) => {
  const user = availableUsers.value.find(u => u.id === userId)
  if (user) {
    user.isSelected = !user.isSelected
  }
}

// 全選/取消全選
const toggleSelectAll = () => {
  const allSelected = availableUsers.value.every(user => user.isSelected)
  availableUsers.value.forEach(user => {
    user.isSelected = !allSelected
  })
}

// 建構要發送到 API 的資料結構
const buildApiData = () => {
  let parentId = null
  let startBuildIndex = 0
  
  // 找到最後一個 select 類型的層級作為 parentId
  for (let i = 0; i < formData.unitLayers.length; i++) {
    const layer = formData.unitLayers[i]
    if (layer.type === 'select' && layer.selectedId) {
      parentId = layer.selectedId
      startBuildIndex = i + 1 // 從下一層開始建構新單位
    }
  }
  
  // 從 startBuildIndex 開始，建構嵌套的單位結構
  const buildNestedUnits = (startIndex) => {
    if (startIndex >= formData.unitLayers.length) {
      return []
    }
    
    const currentLayer = formData.unitLayers[startIndex]
    
    // 只處理 input 類型的層級
    if (currentLayer.type === 'input' && currentLayer.inputValue) {
      const unit = {
        name: currentLayer.inputValue,
        users: [], // 預設空陣列，最深層才會有用戶
        sub_units: buildNestedUnits(startIndex + 1) // 遞歸建構子單位
      }
      
      // 如果這是最後一層有值的單位，添加選中的用戶
      const hasMoreLayers = formData.unitLayers
        .slice(startIndex + 1)
        .some(layer => layer.type === 'input' && layer.inputValue)
      
      if (!hasMoreLayers) {
        unit.users = selectedUsers.value.map(user => user.id)
      }
      
      return [unit]
    }
    
    // 如果當前層沒有值，繼續下一層
    return buildNestedUnits(startIndex + 1)
  }
  
  const units = buildNestedUnits(startBuildIndex)
  
  return {
    parentId: parentId,
    units: units
  }
}

// 修復後的手動添加下一層
const addManualLayer = () => {
  // 編輯模式不允許添加新層級
  if (isEditMode.value) {
    alert('編輯模式不允許添加新的子單位層級')
    return
  }
  
  const nextLevel = formData.unitLayers.length + 1
  if (nextLevel > 5) {
    alert('最多只能建立 5 層單位')
    return
  }
  
  console.log(`手動添加第 ${nextLevel} 層`)
  addInputLayer(nextLevel)
}

const previewApiData = computed(() => {
  try {
    return buildApiData()
  } catch (error) {
    console.error('建構 API 資料時發生錯誤:', error)
    return { parentId: null, units: [] }
  }
})
const cancel = () => {
  router.push('/settings/unit-management')
}
// 測試建構資料的方法
const testBuildData = () => {
  console.log('=== 測試建構 API 資料 ===')
  
  if (isEditMode.value) {
    // 編輯模式測試
    const targetLayer = formData.unitLayers.find(layer => layer.isTarget)
    const editData = {
      name: targetLayer?.inputValue,
      updateUnitUsers: availableUsers.value.map(user => ({
        user_id: user.id,
        is_in_unit: user.isSelected
      }))
    }
    
    console.log('編輯模式 API 資料:', editData)
    console.log('用戶選擇狀態詳細分析:')
    availableUsers.value.forEach(user => {
      console.log(`- ${user.name} (${user.account}):`, {
        原本狀態: user.is_join ? '已加入' : '未加入',
        目前勾選: user.isSelected ? '是' : '否',
        將發送: `is_in_unit: ${user.isSelected}`,
        變更: user.is_join !== user.isSelected ? '有變更' : '無變更'
      })
    })
  } else {
    // 新增模式測試
    console.log('當前表單層級:', formData.unitLayers)
    console.log('選中的用戶:', selectedUsers.value)
    console.log('建構的 API 資料:', previewApiData.value)
  }
  
  console.log('=========================')
}

const saveForm = async () => {
  try {
    isSaving.value = true
    
    if (isEditMode.value) {
      // 編輯模式：只更新單位名稱和用戶
      const targetLayer = formData.unitLayers.find(layer => layer.isTarget)
      if (!targetLayer || !targetLayer.inputValue) {
        alert('請輸入單位名稱')
        return
      }
      
      // 建構編輯 API 資料 - 包含所有用戶的狀態變更
      const editData = {
        name: targetLayer.inputValue,
        updateUnitUsers: availableUsers.value.map(user => ({
          user_id: user.id,
          is_in_unit: user.isSelected // 關鍵：使用用戶當前的選擇狀態
        }))
      }
      
      console.log('準備發送的編輯 API 資料:', editData)
      console.log('用戶狀態變更詳情:', availableUsers.value.map(user => ({
        user_id: user.id,
        name: user.name,
        account: user.account,
        originalStatus: user.is_join ? '原本已加入' : '原本未加入',
        currentSelection: user.isSelected ? '目前勾選' : '目前未勾選',
        willBeSent: user.isSelected ? 'is_in_unit: true' : 'is_in_unit: false',
        action: user.is_join !== user.isSelected ? 
          (user.isSelected ? '將加入單位' : '將移除單位') : '狀態無變更'
      })))
      
      // 呼叫編輯 API
      const response = await unitStore.updateUnit(editUnitData.value.id, editData)
      
      if (response.success) {
        console.log('✅ 編輯 API 成功，開始重新載入資料...')
        
        // 重新載入編輯頁面資料
        try {
          await reloadEditPageData()
          console.log('✅ 編輯完成，資料已重新載入')
          alert('編輯單位成功！')
        } catch (reloadError) {
          console.error('❌ 重新載入資料時發生錯誤:', reloadError)
          alert('編輯成功，但重新載入資料失敗，請手動刷新頁面')
        }
      } else {
        alert('編輯失敗：' + (response.message || '未知錯誤'))
      }
    } else {
      // 新增模式：原有邏輯
      // 驗證表單
      if (!unitPath.value) {
        alert('請至少選擇或輸入一層單位')
        return
      }
      
      // 檢查是否有需要新增的單位（至少一個 input 類型）
      const hasNewUnits = formData.unitLayers.some(layer => 
        layer.type === 'input' && layer.inputValue
      )
      
      if (!hasNewUnits) {
        alert('請至少輸入一個新的單位名稱')
        return
      }
      
      // 建構 API 資料
      const apiData = buildApiData()
      
      console.log('準備發送的 API 資料:', apiData)
      
      // 呼叫新增 API
      const response = await unitStore.createUnit(apiData)
      
      if (response.success) {
        alert('新增單位成功！')
        router.push('/settings/unit-management')
      } else {
        alert('新增失敗：' + (response.message || '未知錯誤'))
      }
    }
    
  } catch (error) {
    console.error('儲存失敗:', error)
    alert('儲存失敗：' + (error.message || '請稍後再試'))
  } finally {
    isSaving.value = false
  }
}

// 編輯模式：切換單位名稱編輯狀態
// 2. 修改 toggleEditUnitName 函數
const toggleEditUnitName = () => {
  if(!hasWriteUnitPermission.value){
    alert('您沒有權限編輯單位名稱')
    return
  }
  
  if (!isEditingUnitName.value) {
    // 進入編輯模式 - 備份當前資料
    console.log('進入編輯模式，備份當前資料')
    
    // 備份單位名稱
    const targetLayer = formData.unitLayers.find(layer => layer.isTarget)
    if (targetLayer) {
      backupData.originalUnitName = targetLayer.inputValue
    }
    
    // 備份用戶選擇狀態
    backupData.originalUserSelections = availableUsers.value.map(user => ({
      id: user.id,
      isSelected: user.isSelected
    }))
    
    console.log('備份資料:', {
      unitName: backupData.originalUnitName,
      userSelectionsCount: backupData.originalUserSelections.length
    })
    
    // 設定編輯模式
    isEditingUnitName.value = true
    
    // 找到目標單位層級並解鎖
    if (targetLayer) {
      targetLayer.isLocked = false
    }
  } else {
    // 取消編輯模式 - 恢復備份資料
    console.log('取消編輯模式，恢復備份資料')
    
    // 恢復單位名稱
    const targetLayer = formData.unitLayers.find(layer => layer.isTarget)
    if (targetLayer && backupData.originalUnitName !== '') {
      targetLayer.inputValue = backupData.originalUnitName
      console.log('恢復單位名稱:', backupData.originalUnitName)
    }
    
    // 恢復用戶選擇狀態
    if (backupData.originalUserSelections.length > 0) {
      backupData.originalUserSelections.forEach(backup => {
        const user = availableUsers.value.find(u => u.id === backup.id)
        if (user) {
          user.isSelected = backup.isSelected
        }
      })
      console.log('恢復用戶選擇狀態完成')
    }
    
    // 設定為非編輯模式
    isEditingUnitName.value = false
    
    // 鎖定目標單位層級
    if (targetLayer) {
      targetLayer.isLocked = true
    }
    
    // 清空備份資料
    backupData.originalUnitName = ''
    backupData.originalUserSelections = []
  }
  
  console.log('編輯模式狀態:', isEditingUnitName.value)
}


// 重新載入編輯頁面資料
const reloadEditPageData = async () => {
  try {
    console.log('🔄 開始重新載入編輯頁面資料，當前時間:', new Date().toLocaleTimeString())
    
    if (!editUnitData.value || !editUnitData.value.id) {
      throw new Error('editUnitData 或 editUnitData.id 不存在')
    }
    
    console.log('📡 重新獲取單位詳細資料，單位ID:', editUnitData.value.id)
    
    // 重新獲取單位詳細資料
    const response = await unitStore.fetchUnitById(editUnitData.value.id)
    if (response.success && response.data) {
      console.log('✅ 單位詳細資料獲取成功:', response.data)
      
      // 更新單位資料
      editUnitData.value = response.data
      originalUnitName.value = response.data.name
      unitUsersCount.value = response.data.users ? response.data.users.length : 0
      
      console.log('📊 單位資料已更新:', {
        name: editUnitData.value.name,
        usersCount: unitUsersCount.value
      })
      
      // 更新表單中的單位名稱
      const targetLayer = formData.unitLayers.find(layer => layer.isTarget)
      if (targetLayer) {
        targetLayer.inputValue = response.data.name
        console.log('📝 表單中的單位名稱已更新:', targetLayer.inputValue)
      }
    } else {
      throw new Error('重新獲取單位資料失敗：' + (response.message || '未知錯誤'))
    }
    
    // 直接重新載入用戶資料，不依賴監聽器
    console.log('🔄 直接重新載入用戶資料，單位ID:', editUnitData.value.id)
    currentPage.value = 1
    searchKeyword.value = ''
    
    // 直接調用 loadUsers，加上額外的錯誤處理
    try {
      await loadUsers(editUnitData.value.id, true) // 強制重新載入
      console.log('✅ 用戶資料重新載入成功')
    } catch (userLoadError) {
      console.error('❌ 載入用戶資料時發生錯誤:', userLoadError)
      throw new Error('載入用戶資料失敗：' + userLoadError.message)
    }
    
    console.log('🎉 編輯頁面資料重新載入完成，時間:', new Date().toLocaleTimeString())
  } catch (error) {
    console.error('❌ 重新載入資料失敗:', error)
    console.error('錯誤詳情:', error.stack)
    throw error // 重新拋出錯誤，讓調用方處理
  }
}
const saveUnitNameChange = async () => {
  const targetLayer = formData.unitLayers.find(layer => layer.isTarget)
  if (!targetLayer || !targetLayer.inputValue) {
    alert('請輸入單位名稱')
    return
  }
  
  try {
    isSaving.value = true
    
    // 只更新單位名稱，不更改用戶狀態
    const editData = {
      name: targetLayer.inputValue,
      updateUnitUsers: availableUsers.value.map(user => ({
        user_id: user.id,
        is_in_unit: user.isSelected // 使用當前選擇狀態
      }))
    }
    
    console.log('單位名稱更新 API 資料:', editData)
    
    const response = await unitStore.updateUnit(editUnitData.value.id, editData)
    
    if (response.success) {
      // 更新本地資料
      originalUnitName.value = targetLayer.inputValue
      editUnitData.value.name = targetLayer.inputValue
      
      // 切換回唯讀模式
      isEditingUnitName.value = false
      targetLayer.isLocked = true
      
      // 清空備份資料（因為已經成功儲存）
      backupData.originalUnitName = ''
      backupData.originalUserSelections = []
      
      alert('單位更新成功！')
      await reloadEditPageData();
      
      // 更新當前用戶的 repair_unit
      const currentUser = availableUsers.value.find(user => user.id === authStore.user.id);
      if (currentUser) {
        if (currentUser.isSelected) {
          authStore.user.repair_unit = targetLayer.inputValue;
          console.log('用户仍在单位中，更新 repair_unit 为:', targetLayer.inputValue);
        } else {
          authStore.user.repair_unit = '';
          console.log('用户已被移除单位，清空 repair_unit');
        }
      } else {
        console.log('当前用户不在此单位的用户列表中');
      }
      
    } else {
      alert('更新失敗：' + (response.message || '未知錯誤'))
    }
  } catch (error) {
    console.error('更新單位名稱失敗:', error)
    alert('更新失敗：' + (error.message || '請稍後再試'))
  } finally {
    isSaving.value = false
  }
}


// 刪除單位
const deleteUnit = async () => {
  if (!hasWriteUnitPermission.value) {
    alert('您沒有權限刪除單位')
    return
  }
  if (!editUnitData.value) return
  
  const confirmMessage = `確定要刪除「${editUnitData.value.name}」嗎？此操作無法復原。`
  if (!confirm(confirmMessage)) return
  
  try {
    isSaving.value = true
    
    // 這裡需要添加刪除 API 調用
    const response = await unitStore.deleteUnit(editUnitData.value.id)
    // 暫時用 alert 提示
    
    if (response.success) {
      alert('刪除單位成功！')
      router.push('/settings/unit-management')
    } else {
      alert('刪除失敗：' + (response.message || '未知錯誤'))
    }
  } catch (error) {
    console.error('刪除單位失敗:', error)
    alert('刪除失敗：' + (error.message || '請稍後再試'))
  } finally {
    isSaving.value = false
  }
}
const getInputPlaceholder = (layer) => {
  if (layer.isTarget && isEditMode.value) {
    return '請輸入新的單位名稱'
  }
  return `請輸入新的單位名稱`
}

// 取得切換按鈕提示文字
const getToggleButtonTitle = (layer) => {
  if (isEditMode.value) {
    return '編輯模式不允許切換類型'
  }
  if (layer.isLocked) {
    return '此層級已鎖定'
  }
  return layer.type === 'select' ? '切換到輸入模式' : '切換到選擇模式'
}


// 初始化載入
onMounted(async () => {
  isLoading.value = true
  try {
    console.log('🚀 onMounted: 路由模式:', { 
      isCreateMode: isCreateMode.value, 
      isInsertMode: isInsertMode.value,
      isEditMode: isEditMode.value,
      parentId: parentId.value,
      editUnitId: editUnitId.value,
      routeName: route.name 
    })
    
    if (isEditMode.value && editUnitId.value) {
      // 編輯模式：建構編輯單位路徑並初始化表單
      console.log('🚀 編輯模式，建構編輯單位路徑')
      const editPath = await buildEditUnitPath(editUnitId.value)
      await initializeEditForm(editPath)
    } else if (isInsertMode.value && parentId.value) {
      // 插入模式：建構父層路徑並初始化表單
      console.log('🚀 插入模式，建構父層路徑')
      const parentPath = await buildParentPath(parentId.value)
      await initializeFormFromPath(parentPath)
    } else {
      // 創建模式：載入第一層選項
      console.log('🚀 創建模式，載入第一層選項')
      const firstLayerOptions = await loadLayerOptions(1)
      formData.unitLayers[0].options = firstLayerOptions
      formData.unitLayers[0].type = firstLayerOptions.length > 0 ? 'select' : 'input'
      formData.unitLayers[0].isLocked = false
      console.log('🚀 創建模式初始化完成，第一層:', { 
        level: formData.unitLayers[0].level, 
        type: formData.unitLayers[0].type, 
        options: formData.unitLayers[0].options.length 
      })
      
      // 創建模式：初始載入所有有資格的用戶
      console.log('🚀 創建模式：載入所有有資格的用戶')
      await loadUsers(null) // 沒有單位 ID，載入所有用戶
    }
    
    console.log('🚀 初始化完成，最終層級狀態:', formData.unitLayers.map(l => ({ 
      level: l.level, 
      type: l.type, 
      isLocked: l.isLocked,
      isTarget: l.isTarget 
    })))
  } catch (error) {
    console.error('❌ 初始化失敗:', error)
    alert('初始化失敗：' + (error.message || '請稍後再試'))
    
    // 初始化失敗時的fallback
    if (!isEditMode.value) {
      formData.unitLayers[0].type = 'input'
      formData.unitLayers[0].isLocked = false
      
      // fallback 時也嘗試載入用戶
      try {
        await loadUsers(null)
      } catch (userError) {
        console.error('❌ fallback 載入用戶失敗:', userError)
      }
    }
  } finally {
    isLoading.value = false
  }
})

</script>

<template>
  <div class="create-unit-page">
    <!-- 頁面標題區域 - 響應式設計 -->
    <div class="page-header">
      <h2>
        <span v-if="isCreateMode">新增單位群組</span>
        <span v-else-if="isInsertMode">新增子單位</span>
        <span v-else-if="isEditMode">{{ hasWriteUnitPermission ? '編輯單位' : '檢視單位' }}</span>
        <span v-else>單位群組資訊</span>
      </h2>
      
      <!-- 桌面版和平板版按鈕群組 -->
      <div class="header-actions desktop-tablet-actions">
        <!-- 非編輯模式的按鈕 -->
        <template v-if="!isEditMode">
          <button class="save-btn" @click="saveForm" :disabled="isSaving">
            <span v-if="isSaving">儲存中...</span>
            <span v-else>儲存</span>
          </button>
          <button class="cancel-btn" @click="cancel">返回</button>
        </template>
        
        <!-- 編輯模式的按鈕 -->
        <template v-else>
          <!-- 編輯/儲存單位名稱按鈕 -->
          <button 
            v-if="!isEditingUnitName && hasWriteUnitPermission"
            class="edit-btn" 
            @click="toggleEditUnitName"
            :disabled="isSaving"
          >
            編輯單位
          </button>
          <button 
            v-else
            class="save-btn" 
            @click="saveUnitNameChange"
            :disabled="isSaving"
          >
            <span v-if="isSaving">儲存中...</span>
            <span v-else>儲存</span>
          </button>
          
          <!-- 刪除單位按鈕 -->
          <button 
            v-if="!isEditingUnitName && hasWriteUnitPermission"
            class="delete-btn" 
            @click="deleteUnit"
            :disabled="isSaving"
          >
            刪除單位
          </button>
          <!-- 返回 -->
          <button 
            v-if="!isEditingUnitName"
            class="cancel-btn" 
            @click="cancel"
            :disabled="isSaving"
          >
            <span>返回</span>
          </button>
          <button 
            v-else
            class="cancel-btn" 
            @click="toggleEditUnitName"
            :disabled="isSaving"
          >
            <span>取消</span>
          </button>
        </template>
      </div>
    </div>

    <!-- 手機版專用的浮動按鈕 -->
    <div class="mobile-action-buttons">
      <!-- 非編輯模式的按鈕 -->
      <template v-if="!isEditMode">
        <button class="mobile-save-btn" @click="saveForm" :disabled="isSaving">
          <span class="btn-icon">💾</span>
          <span class="btn-text">儲存</span>
        </button>
      </template>
      
      <!-- 編輯模式的按鈕 -->
      <template v-else>
        <button 
          v-if="!isEditingUnitName && hasWriteUnitPermission"
          class="mobile-edit-btn" 
          @click="toggleEditUnitName"
          :disabled="isSaving"
        >
          <span class="btn-icon">✏️</span>
          <span class="btn-text">編輯</span>
        </button>
        <button 
          v-else
          class="mobile-save-btn" 
          @click="saveUnitNameChange"
          :disabled="isSaving"
        >
          <span class="btn-icon">💾</span>
          <span class="btn-text">{{ isSaving ? '儲存中...' : '儲存' }}</span>
        </button>
        
        <button 
          v-if="!isEditingUnitName && hasWriteUnitPermission"
          class="mobile-delete-btn" 
          @click="deleteUnit"
          :disabled="isSaving"
        >
          <span class="btn-icon">🗑️</span>
          <span class="btn-text">刪除</span>
        </button>
      </template>
      
      <!-- 返回按鈕 - 手機版固定顯示 -->
      <button 
        class="mobile-back-btn" 
        @click="isEditingUnitName ? toggleEditUnitName() : cancel()"
        :disabled="isSaving"
      >
        <span class="btn-icon">{{ isEditingUnitName ? '❌' : '⬅️' }}</span>
        <span class="btn-text">{{ isEditingUnitName ? '取消' : '返回' }}</span>
      </button>
    </div>

    <!-- 載入狀態 -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner">⟳</div>
      <div class="loading-text">載入中...</div>
    </div>

    <div v-else class="form-container">
      <!-- 單位階層選擇區域 -->
      <section class="unit-section">
        <!-- 編輯模式單位資訊卡片 - 響應式 -->
        <div v-if="isEditMode" class="unit-info-card">
          <div class="unit-info-header">
            <h3>單位群組資訊</h3>
          </div>
          <div class="unit-info-content">
            <!-- 桌面版和平板版 - 橫向佈局 -->
            <div class="info-grid desktop-tablet-grid">
              <div class="info-row">
                <label class="info-label">單位</label>
                <div class="info-value">{{ unitPath }}</div>
              </div>
              <div class="info-row">
                <label class="info-label">人數</label>
                <div class="info-value">{{ unitUsersCount }}</div>
              </div>
              <div class="info-row">
                <label class="info-label">新增時間</label>
                <div class="info-value">{{ formatDateTime(editUnitData?.created_at) || 'N/A' }}</div>
              </div>
            </div>
            
            <!-- 手機版 - 縱向卡片式佈局 -->
            <div class="info-grid mobile-grid">
              <div class="info-card">
                <div class="info-card-icon">🏢</div>
                <div class="info-card-content">
                  <div class="info-card-label">單位</div>
                  <div class="info-card-value">{{ unitPath }}</div>
                </div>
              </div>
              
              <div class="info-card">
                <div class="info-card-icon">👥</div>
                <div class="info-card-content">
                  <div class="info-card-label">人數</div>
                  <div class="info-card-value">{{ unitUsersCount }}</div>
                </div>
              </div>
              
              <div class="info-card">
                <div class="info-card-icon">📅</div>
                <div class="info-card-content">
                  <div class="info-card-label">新增時間</div>
                  <div class="info-card-value">{{ formatDateTime(editUnitData?.created_at) || 'N/A' }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 單位選擇表單 -->
        <div class="unit-form-section">
          <!-- 桌面版和平板版 - 原有佈局 -->
          <div class="desktop-tablet-form">
            <div class="form-row">
              <label class="form-label">單位</label>
              <div class="unit-layers">
                <div 
                  v-for="(layer, index) in formData.unitLayers" 
                  :key="index"
                  class="layer-container"
                >
                  <!-- Select 模式 -->
                  <div v-if="layer.type === 'select'" class="layer-item">
                    <select 
                      v-model="layer.selectedId"
                      @change="handleLayerChange(index)"
                      :disabled="layer.isLoading || layer.isLocked"
                      :class="['layer-select', { 'locked': layer.isLocked, 'target': layer.isTarget }]"
                    >
                      <option value="">請選擇單位</option>
                      <option 
                        v-for="option in layer.options" 
                        :key="option.id" 
                        :value="option.id"
                      >
                        {{ option.name }}
                      </option>
                    </select>
                    <button 
                      class="toggle-btn" 
                      @click="toggleLayerType(index)"
                      :title="getToggleButtonTitle(layer)"
                      :disabled="layer.isLocked || isEditMode"
                      :class="{ 'locked': layer.isLocked || isEditMode }"
                    >
                      <span v-if="layer.isLocked || isEditMode">🔒</span>
                      <span v-else>✏️</span>
                    </button>
                  </div>

                  <!-- Input 模式 -->
                  <div v-else class="layer-item">
                    <input 
                      v-model="layer.inputValue"
                      @input="handleLayerChange(index)"
                      :placeholder="getInputPlaceholder(layer)"
                      :disabled="layer.isLocked"
                      :class="['layer-input', { 
                        'locked': layer.isLocked, 
                        'target': layer.isTarget,
                        'editable': layer.isTarget && isEditMode && isEditingUnitName
                      }]"
                    />
                    <button 
                      class="toggle-btn" 
                      @click="toggleLayerType(index)"
                      :title="getToggleButtonTitle(layer)"
                      :disabled="layer.isLoading || layer.isLocked || isEditMode"
                      :class="{ 'locked': layer.isLocked || isEditMode }"
                    >
                      <span v-if="layer.isLocked || isEditMode">🔒</span>
                      <span v-else-if="layer.isLoading">⟳</span>
                      <span v-else>📋</span>
                    </button>
                  </div>

                  <!-- 層級分隔符 -->
                  <span v-if="index < formData.unitLayers.length - 1" class="layer-separator">></span>
                </div>
              </div>
            </div>
          </div>

          <!-- 手機版 - 卡片式佈局 -->
          <div class="mobile-form">
            <div class="mobile-form-header">
              <h4>單位層級設定</h4>
              <span class="layer-count">{{ formData.unitLayers.length }}/5</span>
            </div>
            
            <div class="mobile-layers">
              <div 
                v-for="(layer, index) in formData.unitLayers" 
                :key="index"
                class="mobile-layer-card"
                :class="{ 
                  'locked': layer.isLocked, 
                  'target': layer.isTarget,
                  'editable': layer.isTarget && isEditMode && isEditingUnitName
                }"
              >
                <div class="mobile-layer-header">
                  <div class="layer-info">
                    <span class="layer-type-badge" :class="layer.type">
                      {{ layer.type === 'select' ? '選擇' : '輸入' }}
                    </span>
                  </div>
                  
                  <button 
                    v-if="!layer.isLocked && !isEditMode"
                    class="mobile-toggle-btn" 
                    @click="toggleLayerType(index)"
                    :disabled="layer.isLoading"
                  >
                    <span v-if="layer.isLoading">⟳</span>
                    <span v-else-if="layer.type === 'select'">✏️</span>
                    <span v-else>📋</span>
                  </button>
                  
                  <span v-else-if="layer.isLocked || isEditMode" class="lock-indicator">
                    🔒
                  </span>
                </div>

                <div class="mobile-layer-content">
                  <!-- Select 模式 -->
                  <div v-if="layer.type === 'select'" class="mobile-select-container">
                    <select 
                      v-model="layer.selectedId"
                      @change="handleLayerChange(index)"
                      :disabled="layer.isLoading || layer.isLocked"
                      class="mobile-layer-select"
                    >
                      <option value="">請選擇單位</option>
                      <option 
                        v-for="option in layer.options" 
                        :key="option.id" 
                        :value="option.id"
                      >
                        {{ option.name }}
                      </option>
                    </select>
                  </div>

                  <!-- Input 模式 -->
                  <div v-else class="mobile-input-container">
                    <input 
                      v-model="layer.inputValue"
                      @input="handleLayerChange(index)"
                      :placeholder="getInputPlaceholder(layer)"
                      :disabled="layer.isLocked"
                      class="mobile-layer-input"
                    />
                  </div>
                </div>

                <!-- 特殊狀態指示 -->
                <div v-if="layer.isTarget" class="target-indicator">
                  <span class="target-badge">目標單位</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 手動添加層級按鈕 -->
        <div v-if="!isEditMode" class="add-layer-section">
          <button 
            class="add-layer-btn" 
            @click="addManualLayer"
            :disabled="formData.unitLayers.length >= 5"
          >
            <span class="btn-icon">➕</span>
            <span class="btn-text">添加新層級</span>
          </button>
        </div>

        <!-- 單位路徑預覽 -->
        <div v-if="unitPath" class="unit-path-preview">
          <label class="form-label">單位路徑預覽</label>
          <div class="path-display">{{ unitPath }}</div>
        </div>
      </section>

      <!-- 用戶管理區域 -->
      <section class="users-section">
        <!-- 桌面版和平板版標題區 -->
        <div class="users-header desktop-tablet-header">
          <div class="search-area">
            <input 
              v-model="searchKeyword"
              type="text" 
              placeholder="輸入帳號、姓名或暱稱"
              class="search-input"
              @keyup.enter="searchUsers"
            />
            <button class="search-btn" @click="searchUsers" :disabled="isSearching">
              <span v-if="isSearching">⟳</span>
              <span v-else>查詢</span>
            </button>
            <button class="reset-btn" @click="resetSearch">
              重置
            </button>
          </div>

          <div class="page-size-control">
            <select v-model="pageSize" class="page-size-select">
              <option value="10">10筆/頁</option>
              <option value="20">20筆/頁</option>
              <option value="50">50筆/頁</option>
            </select>
          </div>
        </div>

        <!-- 手機版搜尋區 -->
        <div class="mobile-search-section">
          <div class="mobile-search-header">
            <h4>用戶管理</h4>
            <div class="search-controls">
              <select v-model="pageSize" class="mobile-page-size">
                <option value="10">10筆</option>
                <option value="20">20筆</option>
                <option value="50">50筆</option>
              </select>
            </div>
          </div>
          
          <div class="mobile-search-bar">
            <div class="search-input-group">
              <input 
                v-model="searchKeyword"
                type="text" 
                placeholder="搜尋帳號、姓名或暱稱"
                class="mobile-search-input"
                @keyup.enter="searchUsers"
              />
              <button class="mobile-search-btn" @click="searchUsers" :disabled="isSearching">
                <span v-if="isSearching">⟳</span>
                <span v-else>🔍</span>
              </button>
            </div>
            <button class="mobile-reset-btn" @click="resetSearch">
              重置
            </button>
          </div>
        </div>

        <!-- 桌面版和平板版用戶表格 -->
        <div class="users-table-container desktop-tablet-table">
          <table class="users-table">
            <thead>
              <tr>
                <th v-if="hasWriteUnitPermission">
                  <input 
                    type="checkbox" 
                    @change="toggleSelectAll"
                    :checked="availableUsers.length > 0 && availableUsers.every(user => user.isSelected)"
                    :disabled="isEditMode && (!isEditingUnitName || isLoadingUsers)"
                  />
                </th>
                <th class="sortable">項次</th>
                <th class="sortable">帳號</th>
                <th class="sortable">姓名</th>
                <th class="sortable">暱稱</th>
                <th class="sortable">單位</th>
                <th class="sortable">狀態</th>
              </tr>
            </thead>
            <tbody>
              <!-- 載入狀態 -->
              <tr v-if="isLoadingUsers">
                <td colspan="7" class="loading-cell">
                  <div class="loading-container">
                    <div class="loading-spinner">⟳</div>
                    <div class="loading-text">載入用戶資料中...</div>
                  </div>
                </td>
              </tr>
              
              <!-- 正常資料顯示 -->
              <tr v-else v-for="(user, index) in availableUsers" :key="user.id" 
                  :class="{ selected: user.isSelected, 'existing-member': user.is_join }">
                <td v-if="hasWriteUnitPermission">
                  <input 
                    type="checkbox" 
                    :checked="user.isSelected"
                    @change="toggleUserSelection(user.id)"
                    :disabled="isEditMode && (!isEditingUnitName || isLoadingUsers)"
                  />
                </td>
                <td>{{ (currentPage - 1) * pageSize + index + 1 }}</td>
                <td>{{ user.account }}</td>
                <td>{{ user.name }}</td>
                <td>{{ user.nick_name }}</td>
                <td>{{ user.repair_unit || '-' }}</td>
                <td>
                  <span :class="['status-badge', user.is_join ? 'status-active' : 'status-inactive']">
                    {{ user.status }}
                  </span>
                </td>
              </tr>
              
              <!-- 無資料狀態 -->
              <tr v-if="!isLoadingUsers && availableUsers.length === 0">
                <td colspan="7" class="no-data">
                  <span v-if="currentUnitId">此單位暫無有資格的用戶</span>
                  <span v-else>暫無有資格的用戶</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 手機版用戶卡片列表 -->
        <div class="mobile-users-list">
          <!-- 全選控制 -->
          <div v-if="hasWriteUnitPermission && availableUsers.length > 0" class="mobile-select-all">
            <label class="select-all-checkbox">
              <input 
                type="checkbox" 
                @change="toggleSelectAll"
                :checked="availableUsers.every(user => user.isSelected)"
                :disabled="isEditMode && (!isEditingUnitName || isLoadingUsers)"
              />
              <span class="select-all-text">全選/取消全選</span>
            </label>
          </div>

          <!-- 載入狀態 -->
          <div v-if="isLoadingUsers" class="mobile-loading">
            <div class="loading-spinner large">⟳</div>
            <div class="loading-text">載入用戶資料中...</div>
          </div>
          
          <!-- 用戶卡片 -->
          <div v-else class="user-cards">
            <div 
              v-for="(user, index) in availableUsers" 
              :key="user.id" 
              class="user-card"
              :class="{ 
                selected: user.isSelected, 
                'existing-member': user.is_join,
                disabled: isEditMode && (!isEditingUnitName || isLoadingUsers)
              }"
              @click="hasWriteUnitPermission && (!isEditMode || isEditingUnitName) && !isLoadingUsers ? toggleUserSelection(user.id) : null"
            >
              <!-- 卡片標題 -->
              <div class="user-card-header">
                <div class="user-basic-info">
                  <div class="user-name">{{ user.name }}</div>
                  <div class="user-account">{{ user.account }}</div>
                </div>
                
                <div class="card-controls">
                  <span class="user-index">#{{ (currentPage - 1) * pageSize + index + 1 }}</span>
                  <input 
                    v-if="hasWriteUnitPermission"
                    type="checkbox" 
                    :checked="user.isSelected"
                    @click.stop
                    @change="toggleUserSelection(user.id)"
                    :disabled="isEditMode && (!isEditingUnitName || isLoadingUsers)"
                    class="user-checkbox"
                  />
                </div>
              </div>

              <!-- 卡片內容 -->
              <div class="user-card-content">
                <div class="user-field">
                  <span class="field-label">暱稱</span>
                  <span class="field-value">{{ user.nick_name || '-' }}</span>
                </div>
                
                <div class="user-field">
                  <span class="field-label">所屬單位</span>
                  <span class="field-value">{{ user.repair_unit || '-' }}</span>
                </div>
                
                <div class="user-field">
                  <span class="field-label">狀態</span>
                  <span :class="['status-badge mobile-status', user.is_join ? 'status-active' : 'status-inactive']">
                    {{ user.status }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 無資料狀態 -->
          <div v-if="!isLoadingUsers && availableUsers.length === 0" class="mobile-no-data">
            <div class="no-data-icon">👥</div>
            <div class="no-data-text">
              <span v-if="currentUnitId">此單位暫無有資格的用戶</span>
              <span v-else>暫無有資格的用戶</span>
            </div>
          </div>
        </div>

        <!-- 分頁和統計資訊 -->
        <div class="table-footer">
          <div class="results-info">
            <span v-if="isLoadingUsers">載入中...</span>
            <span v-else>
              顯示第 {{ (currentPage - 1) * pageSize + 1 }} 到 {{ Math.min(currentPage * pageSize, totalUsers) }} 筆結果 共 {{ totalUsers }} 項
              <span v-if="currentUnitId" class="unit-context">（當前單位）</span>
              <span v-else class="all-users-context">（所有有資格用戶）</span>
            </span>
          </div>
          
          <div class="pagination">
            <button 
              class="page-btn" 
              :disabled="currentPage === 1 || !currentUnitId"
              @click="goToPage(currentPage - 1)"
            >
              ‹
            </button>
            
            <button 
              v-for="page in visiblePages" 
              :key="page"
              :class="['page-btn', { active: page === currentPage }]"
              :disabled="!currentUnitId"
              @click="goToPage(page)"
            >
              {{ page }}
            </button>
            
            <span v-if="showEllipsis" class="ellipsis">...</span>
            
            <button 
              v-if="totalPages > 5"
              :class="['page-btn', { active: totalPages === currentPage }]"
              :disabled="!currentUnitId"
              @click="goToPage(totalPages)"
            >
              {{ totalPages }}
            </button>
            
            <button 
              class="page-btn" 
              :disabled="currentPage === totalPages || !currentUnitId"
              @click="goToPage(currentPage + 1)"
            >
              ›
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
<style lang="scss" scoped>
// 響應式斷點
$breakpoint-mobile: 480px;
$breakpoint-tablet: 768px;
$breakpoint-desktop: 1024px;

// 顏色定義
$primary-color: #6c5ce7;
$primary-hover: #5b4bcf;
$success-color: #28a745;
$success-hover: #218838;
$danger-color: #dc3545;
$danger-hover: #c82333;
$warning-color: #ffc107;
$warning-bg: #fff3cd;
$warning-text: #856404;

// 基礎樣式
.create-unit-page {
  padding: 16px;
  background-color: #f5f5f5;
  min-height: 100vh;

  @media (min-width: $breakpoint-tablet) {
    padding: 20px;
  }

  @media (min-width: $breakpoint-desktop) {
    padding: 24px;
  }
}

// 頁面標題區域
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  @media (max-width: $breakpoint-mobile) {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
    padding: 16px;
  }

  @media (min-width: $breakpoint-tablet) {
    margin-bottom: 30px;
    padding: 20px 30px;
  }

  h2 {
    margin: 0;
    color: #333;
    font-size: 18px;
    font-weight: 600;

    @media (min-width: $breakpoint-tablet) {
      font-size: 22px;
    }

    @media (min-width: $breakpoint-desktop) {
      font-size: 24px;
    }
  }

  // 桌面版和平板版按鈕群組
  .desktop-tablet-actions {
    display: none;

    @media (min-width: $breakpoint-tablet) {
      display: flex;
      gap: 10px;
    }

    .save-btn, .edit-btn {
      background: $primary-color;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s;

      @media (min-width: $breakpoint-desktop) {
        padding: 12px 30px;
      }

      &:hover:not(:disabled) {
        background: $primary-hover;
        transform: translateY(-1px);
      }

      &:disabled {
        background: #ccc;
        cursor: not-allowed;
        transform: none;
      }
    }

    .delete-btn {
      background: $danger-color;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s;

      @media (min-width: $breakpoint-desktop) {
        padding: 12px 20px;
      }

      &:hover:not(:disabled) {
        background: $danger-hover;
        transform: translateY(-1px);
      }

      &:disabled {
        background: #ccc;
        cursor: not-allowed;
        transform: none;
      }
    }

    .cancel-btn {
      background: #f8f9fa;
      color: #666;
      border: 1px solid #ddd;
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s;

      @media (min-width: $breakpoint-desktop) {
        padding: 12px 20px;
      }

      &:hover {
        background: #e9ecef;
        border-color: $primary-color;
        color: $primary-color;
      }
    }
  }
}

// 手機版浮動按鈕
.mobile-action-buttons {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
  z-index: 1000;
  padding: 0 16px;

  @media (min-width: $breakpoint-tablet) {
    display: none;
  }

  .mobile-save-btn, .mobile-edit-btn, .mobile-delete-btn, .mobile-back-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 12px;
    border-radius: 50px;
    border: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    cursor: pointer;
    transition: all 0.3s;
    min-width: 64px;
    height: 64px;

    .btn-icon {
      font-size: 20px;
      margin-bottom: 2px;
    }

    .btn-text {
      font-size: 10px;
      font-weight: 500;
      line-height: 1;
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
    }
  }

  .mobile-save-btn, .mobile-edit-btn {
    background: $primary-color;
    color: white;

    &:hover:not(:disabled) {
      background: $primary-hover;
      transform: translateY(-2px);
    }
  }

  .mobile-delete-btn {
    background: $danger-color;
    color: white;

    &:hover:not(:disabled) {
      background: $danger-hover;
      transform: translateY(-2px);
    }
  }

  .mobile-back-btn {
    background: #f8f9fa;
    color: #666;
    border: 1px solid #ddd;

    &:hover:not(:disabled) {
      background: #e9ecef;
      transform: translateY(-2px);
    }
  }
}

// 載入狀態
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #666;

  @media (min-width: $breakpoint-tablet) {
    padding: 60px 20px;
  }

  .loading-spinner {
    font-size: 24px;
    animation: spin 1s linear infinite;
    margin-bottom: 12px;

    @media (min-width: $breakpoint-tablet) {
      font-size: 32px;
      margin-bottom: 16px;
    }

    &.large {
      font-size: 32px;
    }
  }

  .loading-text {
    font-size: 14px;

    @media (min-width: $breakpoint-tablet) {
      font-size: 16px;
    }
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// 表單容器
.form-container {
  display: flex;
  flex-direction: column;
  gap: 20px;

  @media (min-width: $breakpoint-tablet) {
    gap: 30px;
  }
}

// 單位選擇區域
.unit-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  @media (min-width: $breakpoint-tablet) {
    padding: 30px;
  }

  // 單位資訊卡片
  .unit-info-card {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    margin-bottom: 20px;
    overflow: hidden;

    @media (min-width: $breakpoint-tablet) {
      margin-bottom: 25px;
    }

    .unit-info-header {
      background: $primary-color;
      color: white;
      padding: 12px 16px;

      @media (min-width: $breakpoint-tablet) {
        padding: 15px 20px;
      }
      
      h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;

        @media (min-width: $breakpoint-tablet) {
          font-size: 16px;
        }
      }
    }

    .unit-info-content {
      padding: 16px;

      @media (min-width: $breakpoint-tablet) {
        padding: 20px;
      }

      // 桌面版和平板版 - 橫向佈局
      .desktop-tablet-grid {
        display: none;

        @media (min-width: $breakpoint-tablet) {
          display: block;
        }

        .info-row {
          display: flex;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #e9ecef;

          &:last-child {
            border-bottom: none;
          }

          .info-label {
            min-width: 80px;
            font-weight: 500;
            color: #495057;
            font-size: 14px;
          }

          .info-value {
            flex: 1;
            color: #212529;
            font-size: 14px;
            font-weight: 500;
          }
        }
      }

      // 手機版 - 縱向卡片式佈局
      .mobile-grid {
        display: flex;
        flex-direction: column;
        gap: 12px;

        @media (min-width: $breakpoint-tablet) {
          display: none;
        }

        .info-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: white;
          border-radius: 6px;
          border: 1px solid #e9ecef;

          .info-card-icon {
            font-size: 20px;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8f9fa;
            border-radius: 50%;
          }

          .info-card-content {
            flex: 1;

            .info-card-label {
              font-size: 12px;
              color: #6c757d;
              margin-bottom: 2px;
            }

            .info-card-value {
              font-size: 14px;
              font-weight: 500;
              color: #212529;
            }
          }
        }
      }
    }
  }

  // 單位表單區域
  .unit-form-section {
    .desktop-tablet-form {
      display: none;

      @media (min-width: $breakpoint-tablet) {
        display: block;
      }

      .form-row {
        display: flex;
        align-items: center;
        margin-bottom: 20px;
        gap: 20px;

        &:last-child {
          margin-bottom: 0;
        }

        .form-label {
          min-width: 100px;
          font-weight: 500;
          color: #333;
          font-size: 14px;
        }

        .unit-layers {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .layer-container {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .layer-item {
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
        }

        .layer-select,
        .layer-input {
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          min-width: 160px;
          transition: border-color 0.3s;

          &:focus {
            outline: none;
            border-color: $primary-color;
            box-shadow: 0 0 0 2px rgba(108, 92, 231, 0.1);
          }

          &:disabled {
            background-color: #f8f9fa;
            color: #999;
            cursor: not-allowed;
          }

          &.locked {
            background-color: $warning-bg;
            border-color: $warning-color;
            color: $warning-text;
          }

          &.target {
            border-color: $success-color;
            background-color: #f8fff9;
          }

          &.editable {
            border-color: #007bff;
            background-color: #f0f8ff;
            font-weight: 500;
          }
        }

        .toggle-btn {
          background: #f8f9fa;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 8px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 32px;
          min-height: 32px;

          &:hover:not(:disabled) {
            background: #e9ecef;
            border-color: $primary-color;
          }

          &:disabled {
            background-color: #f8f9fa;
            color: #999;
            cursor: not-allowed;
          }

          &.locked {
            background-color: $warning-bg;
            border-color: $warning-color;
            color: $warning-text;
            cursor: not-allowed;
          }
        }

        .layer-separator {
          color: #666;
          font-weight: bold;
          margin: 0 5px;
        }
      }
    }

    // 手機版表單
    .mobile-form {
      display: block;

      @media (min-width: $breakpoint-tablet) {
        display: none;
      }

      .mobile-form-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;

        h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }

        .layer-count {
          background: $primary-color;
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }
      }

      .mobile-layers {
        display: flex;
        flex-direction: column;
        gap: 12px;

        .mobile-layer-card {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 16px;
          transition: all 0.3s;

          &.locked {
            background-color: $warning-bg;
            border-color: $warning-color;
          }

          &.target {
            border-color: $success-color;
            background-color: #f8fff9;
          }

          &.editable {
            border-color: #007bff;
            background-color: #f0f8ff;
          }

          .mobile-layer-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;

            .layer-info {
              display: flex;
              align-items: center;
              gap: 8px;

              .layer-level {
                background: $primary-color;
                color: white;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
              }

              .layer-type-badge {
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;

                &.select {
                  background: #e3f2fd;
                  color: #1976d2;
                }

                &.input {
                  background: #f3e5f5;
                  color: #7b1fa2;
                }
              }
            }

            .mobile-toggle-btn {
              background: white;
              border: 1px solid #ddd;
              border-radius: 50%;
              width: 32px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              transition: all 0.2s;

              &:hover:not(:disabled) {
                background: #f8f9fa;
                border-color: $primary-color;
              }

              &:disabled {
                background-color: #f8f9fa;
                color: #999;
                cursor: not-allowed;
              }
            }

            .lock-indicator {
              font-size: 16px;
              color: $warning-text;
            }
          }

          .mobile-layer-content {
            .mobile-select-container,
            .mobile-input-container {
              .mobile-layer-select,
              .mobile-layer-input {
                width: 100%;
                padding: 12px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 14px;
                transition: border-color 0.3s;

                &:focus {
                  outline: none;
                  border-color: $primary-color;
                  box-shadow: 0 0 0 2px rgba(108, 92, 231, 0.1);
                }

                &:disabled {
                  background-color: #f8f9fa;
                  color: #999;
                  cursor: not-allowed;
                }
              }
            }
          }

          .target-indicator {
            margin-top: 8px;
            text-align: right;

            .target-badge {
              background: $success-color;
              color: white;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 500;
            }
          }
        }
      }
    }
  }

  // 添加層級按鈕
  .add-layer-section {
    margin: 20px 0;
    text-align: center;

    .add-layer-btn {
      background: $success-color;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s;
      display: inline-flex;
      align-items: center;
      gap: 8px;

      .btn-icon {
        font-size: 16px;
      }

      &:hover:not(:disabled) {
        background: $success-hover;
        transform: translateY(-1px);
      }

      &:disabled {
        background: #ccc;
        cursor: not-allowed;
        transform: none;
      }
    }
  }

  // 單位路徑預覽
  .unit-path-preview {
    margin: 20px 0;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 6px;
    border-left: 4px solid $primary-color;

    .form-label {
      margin-bottom: 8px;
      display: block;
      font-weight: 500;
      color: #333;
      font-size: 14px;
    }

    .path-display {
      font-size: 14px;
      color: #333;
      font-weight: 500;

      @media (min-width: $breakpoint-tablet) {
        font-size: 16px;
      }
    }
  }
}

// 用戶管理區域
.users-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;

  // 桌面版和平板版標題區
  .desktop-tablet-header {
    display: none;

    @media (min-width: $breakpoint-tablet) {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 30px;
      border-bottom: 1px solid #f0f0f0;
    }

    .search-area {
      display: flex;
      gap: 10px;
      flex: 1;
      max-width: 500px;

      .search-input {
        flex: 1;
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;

        &:focus {
          outline: none;
          border-color: $primary-color;
          box-shadow: 0 0 0 2px rgba(108, 92, 231, 0.1);
        }

        &:disabled {
          background-color: #f8f9fa;
          color: #999;
          cursor: not-allowed;
        }
      }

      .search-btn {
        background: $primary-color;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s;

        &:hover:not(:disabled) {
          background: $primary-hover;
        }

        &:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
      }

      .reset-btn {
        background: white;
        color: #666;
        border: 1px solid #ddd;
        padding: 10px 16px;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.3s;

        &:hover:not(:disabled) {
          background: #f8f9fa;
          border-color: $primary-color;
          color: $primary-color;
        }

        &:disabled {
          background: #f8f9fa;
          color: #ccc;
          cursor: not-allowed;
        }
      }
    }

    .page-size-control {
      .page-size-select {
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;

        &:disabled {
          background-color: #f8f9fa;
          color: #999;
          cursor: not-allowed;
        }
      }
    }
  }

  // 手機版搜尋區
  .mobile-search-section {
    display: block;
    padding: 16px 20px;
    border-bottom: 1px solid #f0f0f0;

    @media (min-width: $breakpoint-tablet) {
      display: none;
    }

    .mobile-search-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;

      h4 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #333;
      }

      .search-controls {
        .mobile-page-size {
          padding: 6px 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 12px;
          background: white;
        }
      }
    }

    .mobile-search-bar {
      display: flex;
      gap: 8px;
      align-items: stretch;

      .search-input-group {
        flex: 1;
        display: flex;
        position: relative;

        .mobile-search-input {
          flex: 1;
          padding: 10px 12px;
          padding-right: 44px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;

          &:focus {
            outline: none;
            border-color: $primary-color;
            box-shadow: 0 0 0 2px rgba(108, 92, 231, 0.1);
          }
        }

        .mobile-search-btn {
          position: absolute;
          right: 4px;
          top: 50%;
          transform: translateY(-50%);
          background: $primary-color;
          color: white;
          border: none;
          padding: 6px;
          border-radius: 4px;
          cursor: pointer;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;

          &:disabled {
            background: #ccc;
            cursor: not-allowed;
          }
        }
      }

      .mobile-reset-btn {
        background: white;
        color: #666;
        border: 1px solid #ddd;
        padding: 10px 12px;
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
        white-space: nowrap;

        &:hover:not(:disabled) {
          background: #f8f9fa;
          border-color: $primary-color;
          color: $primary-color;
        }
      }
    }
  }

  // 桌面版和平板版用戶表格
  .desktop-tablet-table {
    display: none;

    @media (min-width: $breakpoint-tablet) {
      display: block;
      overflow-x: auto;
    }

    .users-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 700px;

      thead {
        background: $primary-color;
        color: white;

        th {
          padding: 15px 20px;
          text-align: left;
          font-weight: 500;
          font-size: 14px;
          white-space: nowrap;

          &.sortable {
            cursor: pointer;
            user-select: none;

            &:hover {
              background: rgba(255, 255, 255, 0.1);
            }
          }
        }
      }

      tbody {
        tr {
          border-bottom: 1px solid #f0f0f0;
          transition: background-color 0.2s;

          &:hover {
            background: #f8f9fa;
          }

          &.selected {
            background: #e3f2fd;
          }

          &.existing-member {
            background: #fff3e0;

            &.selected {
              background: #ffcc80;
            }
          }

          td {
            padding: 15px 20px;
            font-size: 14px;
            color: #333;
            white-space: nowrap;

            &.loading-cell {
              text-align: center;
              padding: 40px 20px;
            }

            &.no-data {
              text-align: center;
              padding: 40px 20px;
              color: #666;
              font-style: italic;
            }
          }
        }
      }
    }
  }

  // 手機版用戶列表
  .mobile-users-list {
    display: block;
    padding: 16px 20px;

    @media (min-width: $breakpoint-tablet) {
      display: none;
    }

    .mobile-select-all {
      margin-bottom: 16px;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 6px;

      .select-all-checkbox {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;

        input[type="checkbox"] {
          width: 16px;
          height: 16px;
        }

        .select-all-text {
          font-size: 14px;
          font-weight: 500;
          color: #333;
        }
      }
    }

    .mobile-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      color: #666;
    }

    .user-cards {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .user-card {
        background: white;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        padding: 16px;
        cursor: pointer;
        transition: all 0.3s;

        &:hover:not(.disabled) {
          border-color: $primary-color;
          box-shadow: 0 2px 8px rgba(108, 92, 231, 0.1);
        }

        &.selected {
          border-color: $primary-color;
          background: #f8f9ff;
        }

        &.existing-member {
          background: #fff8f0;
          border-color: #ffa726;

          &.selected {
            background: #ffe0b2;
          }
        }

        &.disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .user-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;

          .user-basic-info {
            flex: 1;

            .user-name {
              font-size: 16px;
              font-weight: 600;
              color: #333;
              margin-bottom: 4px;
            }

            .user-account {
              font-size: 14px;
              color: #666;
            }
          }

          .card-controls {
            display: flex;
            align-items: center;
            gap: 8px;

            .user-index {
              font-size: 12px;
              color: #999;
              font-weight: 500;
            }

            .user-checkbox {
              width: 18px;
              height: 18px;
            }
          }
        }

        .user-card-content {
          .user-field {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 0;
            border-bottom: 1px solid #f0f0f0;

            &:last-child {
              border-bottom: none;
            }

            .field-label {
              font-size: 12px;
              color: #666;
              font-weight: 500;
            }

            .field-value {
              font-size: 14px;
              color: #333;
              text-align: right;
              max-width: 60%;
              word-break: break-word;
            }
          }
        }
      }
    }

    .mobile-no-data {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      color: #666;

      .no-data-icon {
        font-size: 48px;
        margin-bottom: 16px;
        opacity: 0.5;
      }

      .no-data-text {
        font-size: 14px;
        text-align: center;
        font-style: italic;
      }
    }
  }

  // 分頁和統計資訊
  .table-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-top: 1px solid #f0f0f0;
    background: #f8f9fa;
    flex-direction: column;
    gap: 12px;

    @media (min-width: $breakpoint-tablet) {
      flex-direction: row;
      gap: 0;
      padding: 20px 30px;
    }

    .results-info {
      font-size: 12px;
      color: #666;
      text-align: center;

      @media (min-width: $breakpoint-tablet) {
        font-size: 14px;
        text-align: left;
      }

      .unit-context,
      .all-users-context {
        font-weight: 500;
        color: $primary-color;
      }
    }

    .pagination {
      display: flex;
      gap: 4px;
      align-items: center;
      justify-content: center;

      @media (min-width: $breakpoint-tablet) {
        gap: 5px;
        justify-content: flex-end;
      }

      .page-btn {
        padding: 6px 8px;
        border: 1px solid #ddd;
        background: white;
        color: #333;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
        min-width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;

        @media (min-width: $breakpoint-tablet) {
          padding: 8px 12px;
          font-size: 14px;
        }

        &:hover:not(:disabled) {
          background: #f8f9fa;
          border-color: $primary-color;
        }

        &.active {
          background: $primary-color;
          color: white;
          border-color: $primary-color;
        }

        &:disabled {
          background: #f8f9fa;
          color: #ccc;
          cursor: not-allowed;
        }
      }

      .ellipsis {
        padding: 8px 4px;
        color: #666;
        font-size: 12px;

        @media (min-width: $breakpoint-tablet) {
          font-size: 14px;
        }
      }
    }
  }
}

// 狀態標籤
.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;

  @media (min-width: $breakpoint-tablet) {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
  }

  &.status-active {
    background: #d4edda;
    color: #155724;
  }

  &.status-inactive {
    background: #f8d7da;
    color: #721c24;
  }

  &.mobile-status {
    padding: 2px 6px;
    font-size: 10px;
  }
}

// 手機版專用底部間距（避免被浮動按鈕遮蓋）
@media (max-width: calc($breakpoint-tablet - 1px)) {
  .form-container {
    padding-bottom: 100px;
  }
}

// 通用的表單輸入樣式
.form-input {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s;

  &:focus {
    outline: none;
    border-color: $primary-color;
    box-shadow: 0 0 0 2px rgba(108, 92, 231, 0.1);
  }

  &.small {
    max-width: 120px;
  }

  &:disabled {
    background-color: #f8f9fa;
    color: #999;
    cursor: not-allowed;
  }
}

// 響應式文字大小調整
@media (max-width: $breakpoint-mobile) {
  html {
    font-size: 14px;
  }
}

@media (min-width: $breakpoint-mobile) and (max-width: $breakpoint-tablet) {
  html {
    font-size: 15px;
  }
}

@media (min-width: $breakpoint-tablet) {
  html {
    font-size: 16px;
  }
}

// 滾動條美化（僅桌面版）
@media (min-width: $breakpoint-desktop) {
  .users-table-container {
    &::-webkit-scrollbar {
      height: 8px;
    }

    &::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 4px;

      &:hover {
        background: #a8a8a8;
      }
    }
  }
}

// 無障礙輔助
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

// 高對比度模式支援
@media (prefers-contrast: high) {
  .page-header,
  .unit-section,
  .users-section {
    border: 2px solid #000;
  }

  .mobile-action-buttons button {
    border: 2px solid #000;
  }
}

// 打印樣式
@media print {
  .mobile-action-buttons,
  .desktop-tablet-actions,
  .mobile-search-section,
  .desktop-tablet-header {
    display: none !important;
  }

  .create-unit-page {
    background: white !important;
    box-shadow: none !important;
  }

  .page-header,
  .unit-section,
  .users-section {
    box-shadow: none !important;
    border: 1px solid #000 !important;
  }
}
</style>
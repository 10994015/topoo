<script setup>
import { ref, computed, reactive, onMounted, watch, onBeforeUnmount } from 'vue'
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

// 重要程度選項
const importance_levelOptions = [
  { value: '1', label: '普級' },
  { value: '2', label: '保固級' },
  { value: '3', label: '急件' }
]

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
      level: 1,
      type: 'select', 
      selectedId: '', 
      inputValue: '', 
      importance_level: '1',
      unit_label_ids: [], // ⭐ 單位標籤 IDs
      unit_labels: [], // ⭐ 單位標籤名稱（用於顯示）
      options: [], 
      isLoading: false, 
      isLocked: false 
    }
  ]
})

// 備份資料
const backupData = reactive({
  originalUnitName: '',
  originalimportance_level: '',
  originalUnitLabelIds: [], // ⭐ 備份標籤 IDs
  originalUnitLabels: [], // ⭐ 備份標籤名稱
  originalUserSelections: []
})

// ⭐ 單位標籤相關狀態
const availableUnitLabels = ref([])
const isLoadingLabels = ref(false)
const labelSearchKeyword = ref('')
const showLabelDropdown = ref(false)
const showMobileLabelModal = ref(false)

// 編輯模式專用資料
const editUnitData = ref(null)
const originalUnitName = ref('')
const isEditingUnitName = ref(false)
const unitUsersCount = ref(0)

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

// ⭐ 修改：獲取當前層的標籤（用於顯示）
const getCurrentLayerLabels = () => {
  // 編輯模式：取目標層的標籤
  if (isEditMode.value) {
    const targetLayer = formData.unitLayers.find(layer => layer.isTarget)
    return targetLayer?.unit_labels || []
  }
  
  // 新增模式：取最後一個 input 層的標籤
  for (let i = formData.unitLayers.length - 1; i >= 0; i--) {
    const layer = formData.unitLayers[i]
    if (layer.type === 'input' && layer.inputValue) {
      return layer.unit_labels || []
    }
  }
  
  return []
}

// ⭐ 修改：當前層已選標籤（字串陣列）
const currentLayerLabels = computed(() => getCurrentLayerLabels())

// ⭐ 修改：已選標籤物件（用於顯示）
const selectedLabels = computed(() => {
  const labelNames = currentLayerLabels.value
  
  // 如果沒有標籤名稱，返回空陣列
  if (!labelNames || labelNames.length === 0) {
    return []
  }
  
  // 如果 availableUnitLabels 還沒載入，直接用標籤名稱建立暫時物件
  if (availableUnitLabels.value.length === 0) {
    return labelNames.map((name, index) => ({
      id: `temp-${index}`, // 暫時 ID
      name: name
    }))
  }
  
  // 從 availableUnitLabels 中找到對應的標籤物件
  const matched = availableUnitLabels.value.filter(label => 
    labelNames.includes(label.name)
  )
  
  // 如果有些標籤在 availableUnitLabels 中找不到（可能是舊標籤），也顯示出來
  const matchedNames = matched.map(l => l.name)
  const unmatchedNames = labelNames.filter(name => !matchedNames.includes(name))
  
  const unmatchedLabels = unmatchedNames.map((name, index) => ({
    id: `unmatched-${index}`, // 暫時 ID
    name: name
  }))
  
  return [...matched, ...unmatchedLabels]
})



// ⭐ 過濾後的標籤列表
const filteredUnitLabels = computed(() => {
  if (!labelSearchKeyword.value) {
    return availableUnitLabels.value
  }
  
  const keyword = labelSearchKeyword.value.toLowerCase()
  return availableUnitLabels.value.filter(label => 
    label.name.toLowerCase().includes(keyword)
  )
})

// ⭐ 判斷是否可以選擇標籤
const canSelectLabelsInCreateMode = computed(() => {
  // 編輯模式：看是否在編輯狀態
  if (isEditMode.value) {
    return isEditingUnitName.value
  }
  
  // 新增模式：檢查當前層是否有輸入內容
  const currentLayer = getCurrentLayer()
  if (!currentLayer) return false
  
  // 如果是 input 類型，檢查是否有輸入值
  if (currentLayer.type === 'input') {
    return currentLayer.inputValue && currentLayer.inputValue.trim().length > 0
  }
  
  // 如果是 select 類型，檢查是否有選擇
  if (currentLayer.type === 'select') {
    return !!currentLayer.selectedId
  }
  
  return false
})

// ⭐ 載入單位標籤
const loadUnitLabels = async () => {
  try {
    isLoadingLabels.value = true
    const response = await unitStore.fetchUnitLabels(labelSearchKeyword.value)
    
    if (response.success && response.data) {
      availableUnitLabels.value = response.data
    } else {
      availableUnitLabels.value = []
    }
  } catch (error) {
    console.error('載入單位標籤失敗:', error)
    availableUnitLabels.value = []
  } finally {
    isLoadingLabels.value = false
  }
}

// ⭐ 修改：切換標籤選擇
const toggleLabelSelection = (labelId) => {
  const targetLayer = getCurrentLayer()
  if (!targetLayer) return
  
  // 初始化陣列
  if (!targetLayer.unit_label_ids) {
    targetLayer.unit_label_ids = []
  }
  if (!targetLayer.unit_labels) {
    targetLayer.unit_labels = []
  }
  
  // 找到對應的標籤物件
  const label = availableUnitLabels.value.find(l => l.id === labelId)
  if (!label) return
  
  // 切換選擇狀態
  const idIndex = targetLayer.unit_label_ids.indexOf(labelId)
  const nameIndex = targetLayer.unit_labels.indexOf(label.name)
  
  if (idIndex > -1) {
    // 取消選擇
    targetLayer.unit_label_ids.splice(idIndex, 1)
    if (nameIndex > -1) {
      targetLayer.unit_labels.splice(nameIndex, 1)
    }
  } else {
    // 新增選擇
    targetLayer.unit_label_ids.push(labelId)
    targetLayer.unit_labels.push(label.name)
  }
}

// ⭐ 修改：判斷標籤是否已選
const isLabelSelected = (labelId) => {
  const label = availableUnitLabels.value.find(l => l.id === labelId)
  if (!label) return false
  
  return currentLayerLabels.value.includes(label.name)
}

// ⭐ 修改：移除單個標籤（接收標籤名稱）
const removeSelectedLabel = (labelName) => {
  const targetLayer = getCurrentLayer()
  if (!targetLayer) return
  
  // 找到對應的標籤物件
  const label = availableUnitLabels.value.find(l => l.name === labelName)
  if (!label) return
  
  // 移除 ID
  const idIndex = targetLayer.unit_label_ids?.indexOf(label.id)
  if (idIndex !== undefined && idIndex > -1) {
    targetLayer.unit_label_ids.splice(idIndex, 1)
  }
  
  // 移除名稱
  const nameIndex = targetLayer.unit_labels?.indexOf(labelName)
  if (nameIndex !== undefined && nameIndex > -1) {
    targetLayer.unit_labels.splice(nameIndex, 1)
  }
}

// ⭐ 修改：清空所有標籤
const clearAllLabels = () => {
  const targetLayer = getCurrentLayer()
  if (targetLayer) {
    targetLayer.unit_label_ids = []
    targetLayer.unit_labels = []
  }
}

// ⭐ 獲取當前操作的層級
const getCurrentLayer = () => {
  if (isEditMode.value) {
    return formData.unitLayers.find(layer => layer.isTarget)
  }
  
  for (let i = formData.unitLayers.length - 1; i >= 0; i--) {
    const layer = formData.unitLayers[i]
    if (layer.type === 'input' && layer.inputValue) {
      return layer
    }
  }
  
  return formData.unitLayers[formData.unitLayers.length - 1]
}

// ⭐ 桌面版切換下拉選單
const toggleLabelDropdown = () => {
  showLabelDropdown.value = !showLabelDropdown.value
  if (showLabelDropdown.value && availableUnitLabels.value.length === 0) {
    loadUnitLabels()
  }
}

// ⭐ 手機版開啟/關閉標籤選擇 Modal
const openMobileLabelModal = () => {
  showMobileLabelModal.value = true
  if (availableUnitLabels.value.length === 0) {
    loadUnitLabels()
  }
}

const closeMobileLabelModal = () => {
  showMobileLabelModal.value = false
  labelSearchKeyword.value = ''
}

// ⭐ 關閉桌面版下拉選單（點擊外部時）
const closeDropdownOnClickOutside = (event) => {
  const dropdown = document.querySelector('.label-dropdown')
  const button = document.querySelector('.select-labels-btn')
  
  if (dropdown && !dropdown.contains(event.target) && 
      button && !button.contains(event.target)) {
    showLabelDropdown.value = false
  }
}

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

const currentUnitId = computed(() => {
  if (isEditMode.value && editUnitData.value) {
    return editUnitData.value.id
  }
  
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

// ⭐ 修改：從編輯單位 ID 建構完整路徑並初始化表單
const buildEditUnitPath = async (targetUnitId) => {
  try {
    const response = await unitStore.fetchUnitById(targetUnitId)
    if (!response.success || !response.data) {
      throw new Error('無法取得單位資料')
    }
    
    const targetUnit = response.data
    editUnitData.value = targetUnit
    originalUnitName.value = targetUnit.name
    unitUsersCount.value = targetUnit.users ? targetUnit.users.length : 0
    
    const path = []
    
    const buildPath = async (unit) => {
      const levelNumber = parseInt(unit.layer.substring(1))
      
      path.unshift({
        id: unit.id,
        name: unit.name,
        layer: unit.layer,
        level: levelNumber,
        importance_level: unit.importance_level || '1',
        unit_label_ids: unit.unit_label_ids || [], // ⭐ 保持這個用於提交
        unit_labels: unit.unit_labels || [], // ⭐ 新增：用於顯示的標籤名稱陣列
        isTarget: unit.id === targetUnitId
      })
      
      if (unit.parent_id) {
        const parentResponse = await unitStore.fetchUnitById(unit.parent_id)
        if (parentResponse.success && parentResponse.data) {
          await buildPath(parentResponse.data)
        }
      }
    }
    
    await buildPath(targetUnit)
    return path
  } catch (error) {
    console.error('建構編輯單位路徑失敗:', error)
    throw error
  }
}

// ⭐ 修改：根據編輯模式路徑初始化表單
const initializeEditForm = async (path) => {
  try {
    formData.unitLayers = []
    
    for (let i = 0; i < path.length; i++) {
      const pathItem = path[i]
      
      let options = []
      if (i === 0) {
        options = await loadLayerOptions(1)
      } else {
        const parentPathItem = path[i - 1]
        const response = await unitStore.fetchUnitById(parentPathItem.id)
        if (response.success && response.data && response.data.sub_units) {
          options = response.data.sub_units.map(subUnit => ({
            id: subUnit.sub_unit_id,
            name: subUnit.sub_unit_name,
            layer: `L${i + 1}`,
            importance_level: subUnit.importance_level || '1',
            unit_label_ids: subUnit.unit_label_ids || [],
            unit_labels: subUnit.unit_labels || [] // ⭐ 新增
          }))
        }
      }
      
      const formLayer = {
        level: pathItem.level,
        type: 'select',
        selectedId: pathItem.id,
        inputValue: pathItem.isTarget ? pathItem.name : '',
        importance_level: pathItem.importance_level,
        unit_label_ids: pathItem.unit_label_ids || [],
        unit_labels: pathItem.unit_labels || [], // ⭐ 新增：用於顯示
        options: options,
        isLoading: false,
        isLocked: !pathItem.isTarget,
        isTarget: pathItem.isTarget || false
      }
      
      if (pathItem.isTarget) {
        formLayer.type = 'input'
        formLayer.inputValue = pathItem.name
        formLayer.selectedId = ''
        formLayer.isLocked = true
      }
      
      formData.unitLayers.push(formLayer)
    }
    
    await loadUsers(editUnitData.value.id)
    
  } catch (error) {
    console.error('初始化編輯表單失敗:', error)
    throw error
  }
}

const buildParentPath = async (targetParentId) => {
  try {
    const response = await unitStore.fetchUnitById(targetParentId)
    if (!response.success || !response.data) {
      throw new Error('無法取得父單位資料')
    }
    
    const parentUnit = response.data
    const path = []
    
    const buildPath = async (unit) => {
      const levelNumber = parseInt(unit.layer.substring(1))
      
      path.unshift({
        id: unit.id,
        name: unit.name,
        layer: unit.layer,
        level: levelNumber,
        importance_level: unit.importance_level || '1',
        unit_label_ids: unit.unit_label_ids || [],
        unit_labels: unit.unit_labels || [] // ⭐ 新增
      })
      
      if (unit.parent_id) {
        const parentResponse = await unitStore.fetchUnitById(unit.parent_id)
        if (parentResponse.success && parentResponse.data) {
          await buildPath(parentResponse.data)
        }
      }
    }
    
    await buildPath(parentUnit)
    return path
  } catch (error) {
    console.error('建構父層路徑失敗:', error)
    throw error
  }
}

// 根據父層路徑初始化表單
const initializeFormFromPath = async (path) => {
  try {
    formData.unitLayers = []
    
    for (let i = 0; i < path.length; i++) {
      const pathItem = path[i]
      
      let options = []
      if (i === 0) {
        options = await loadLayerOptions(1)
      } else {
        const parentPathItem = path[i - 1]
        const response = await unitStore.fetchUnitById(parentPathItem.id)
        if (response.success && response.data && response.data.sub_units) {
          options = response.data.sub_units.map(subUnit => ({
            id: subUnit.sub_unit_id,
            name: subUnit.sub_unit_name,
            layer: `L${i + 1}`,
            importance_level: subUnit.importance_level || '1',
            unit_label_ids: subUnit.unit_label_ids || [],
            unit_labels: subUnit.unit_labels || [] // ⭐ 新增
          }))
        }
      }
      
      const formLayer = {
        level: pathItem.level,
        type: 'select',
        selectedId: pathItem.id,
        inputValue: '',
        importance_level: pathItem.importance_level,
        unit_label_ids: pathItem.unit_label_ids || [],
        unit_labels: pathItem.unit_labels || [], // ⭐ 新增
        options: options,
        isLoading: false,
        isLocked: true
      }
      
      formData.unitLayers.push(formLayer)
    }
    
    const nextLevel = path.length + 1
    if (nextLevel <= 5) {
      formData.unitLayers.push({
        level: nextLevel,
        type: 'input',
        selectedId: '',
        inputValue: '',
        importance_level: '1',
        unit_label_ids: [],
        unit_labels: [], // ⭐ 新增
        options: [],
        isLoading: false,
        isLocked: false
      })
    }
  } catch (error) {
    console.error('初始化表單失敗:', error)
    throw error
  }
}

const handleLayerChange = async (layerIndex) => {
  const currentLayer = formData.unitLayers[layerIndex]
  
  if (isEditMode.value && currentLayer.isTarget) {
    return
  }
  
  formData.unitLayers = formData.unitLayers.slice(0, layerIndex + 1)
  
  if (currentLayer.type === 'select' && currentLayer.selectedId) {
    await loadNextLayerOptions(layerIndex + 1, currentLayer.selectedId)
  }
}

const loadLayerOptions = async (layerNumber) => {
  try {
    const response = await unitStore.fetchUnitsByLayer(layerNumber, {})
    
    if (response.success && response.data && response.data.data) {
      const unitsData = response.data.data.data || response.data.data
      return unitsData.map(unit => ({
        id: unit.id,
        name: unit.name,
        layer: unit.layer,
        importance_level: unit.importance_level || '1',
        unit_label_ids: unit.unit_label_ids || [],
        unit_labels: unit.unit_labels || [] // ⭐ 新增
      }))
    }
    
    return []
  } catch (error) {
    console.error(`載入第 ${layerNumber} 層選項失敗:`, error)
    return []
  }
}

const loadNextLayerOptions = async (nextLayerLevel, parentId) => {
  if (nextLayerLevel > 5) return
  
  try {
    const response = await unitStore.fetchUnitById(parentId)
    
    if (response.success && response.data && response.data.sub_units) {
      const options = response.data.sub_units.map(subUnit => ({
        id: subUnit.sub_unit_id,
        name: subUnit.sub_unit_name,
        layer: `L${nextLayerLevel}`,
        importance_level: subUnit.importance_level || '1',
        unit_label_ids: subUnit.unit_label_ids || [],
        unit_labels: subUnit.unit_labels || [] // ⭐ 新增
      }))
      
      if (options.length > 0) {
        const newLayer = {
          level: nextLayerLevel,
          type: 'select',
          selectedId: '',
          inputValue: '',
          importance_level: '1',
          unit_label_ids: [],
          unit_labels: [], // ⭐ 新增
          options: options,
          isLoading: false,
          isLocked: false
        }
        
        formData.unitLayers.push(newLayer)
      }
    }
  } catch (error) {
    console.error(`載入第 ${nextLayerLevel} 層選項失敗:`, error)
  }
}

const addInputLayer = (level) => {
  if (level > 5) return
  
  const existingLayer = formData.unitLayers.find(layer => layer.level === level)
  if (existingLayer) {
    return
  }
  
  formData.unitLayers.push({
    level: level,
    type: 'input',
    selectedId: '',
    inputValue: '',
    importance_level: '1',
    unit_label_ids: [],
    unit_labels: [], // ⭐ 新增
    options: [],
    isLoading: false,
    isLocked: false
  })
}

const toggleLayerType = async (layerIndex) => {
  const layer = formData.unitLayers[layerIndex]
  
  if (layer.isLocked) {
    return
  }
  
  if (layer.type === 'select') {
    layer.type = 'input'
    layer.selectedId = ''
    layer.inputValue = ''
  } else {
    layer.type = 'select'
    layer.inputValue = ''
    layer.selectedId = ''
    layer.isLoading = true
    
    try {
      if (layerIndex === 0) {
        layer.options = await loadLayerOptions(1)
      } else {
        const parentLayer = formData.unitLayers[layerIndex - 1]
        if (parentLayer.selectedId) {
          const response = await unitStore.fetchUnitById(parentLayer.selectedId)
          if (response.success && response.data && response.data.sub_units) {
            layer.options = response.data.sub_units.map(subUnit => ({
              id: subUnit.sub_unit_id,
              name: subUnit.sub_unit_name,
              layer: `L${layer.level}`,
              importance_level: subUnit.importance_level || '1',
              unit_label_ids: subUnit.unit_label_ids || [],
              unit_labels: subUnit.unit_labels || [] // ⭐ 新增
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
  
  formData.unitLayers = formData.unitLayers.slice(0, layerIndex + 1)
}

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
      if(isInsertMode.value){
        response = await unitStore.fetchEmptyUnitUsers(searchParams)
      } else {
        response = await unitStore.fetchUnitUsers(unitId, searchParams)
      }
    } else {
      response = await unitStore.fetchEmptyUnitUsers(searchParams)
    }
    
    if (response.success && response.data && response.data.data) {
      const usersData = response.data.data
      
      let processedUsers
      
      if (unitId) {
        processedUsers = usersData.data.map(user => ({
          id: user.id,
          account: user.credential,
          name: user.name,
          nick_name: user.nick_name,
          repair_unit: user.repair_unit,
          status: user.is_join ? '已加入' : '未加入',
          is_join: user.is_join,
          isSelected: user.is_join
        }))
      } else {
        processedUsers = usersData.data.map(user => ({
          id: user.id,
          account: user.credential,
          name: user.name,
          nick_name: user.nick_name,
          repair_unit: user.repair_unit,
          status: '未加入',
          is_join: false,
          isSelected: false
        }))
      }
      
      if (unitId) {
        const joinedUsers = processedUsers.filter(user => user.is_join)
        const notJoinedUsers = processedUsers.filter(user => !user.is_join)
        
        const sortUsers = (users) => {
          return users.sort((a, b) => {
            return a.name.localeCompare(b.name, 'zh-Hant', { numeric: true })
          })
        }
        
        processedUsers = [
          ...sortUsers(joinedUsers),
          ...sortUsers(notJoinedUsers)
        ]
      }
      
      availableUsers.value = processedUsers
      
      totalUsers.value = usersData.total || 0
      totalPages.value = usersData.totalPages || 0
      currentPage.value = usersData.page || 1
    } else {
      availableUsers.value = []
      totalUsers.value = 0
      totalPages.value = 0
    }
  } catch (error) {
    console.error('❌ 載入用戶失敗:', error)
    availableUsers.value = []
    totalUsers.value = 0
    totalPages.value = 0
    alert('載入用戶資料失敗，請稍後再試')
  } finally {
    isLoadingUsers.value = false
  }
}

const searchUsers = async () => {
  currentPage.value = 1
  await loadUsers(currentUnitId.value)
}

const resetSearch = () => {
  searchKeyword.value = ''
  currentPage.value = 1
  if (currentUnitId.value) {
    loadUsers(currentUnitId.value)
  }
}

const goToPage = async (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    await loadUsers(currentUnitId.value)
  }
}

watch(pageSize, async () => {
  currentPage.value = 1
  if (currentUnitId.value) {
    await loadUsers(currentUnitId.value)
  }
})

watch(currentUnitId, async (newUnitId, oldUnitId) => {
  if (isEditMode.value && oldUnitId === null && newUnitId === editUnitData.value?.id) {
    return
  }
  
  if (isEditMode.value && newUnitId === editUnitData.value?.id) {
    currentPage.value = 1
    searchKeyword.value = ''
    await loadUsers(newUnitId)
    return
  }
  
  if (isEditMode.value && newUnitId !== editUnitData.value?.id) {
    return
  }
  
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

const toggleSelectAll = () => {
  const allSelected = availableUsers.value.every(user => user.isSelected)
  availableUsers.value.forEach(user => {
    user.isSelected = !allSelected
  })
}

// 建構要發送到 API 的資料結構（新增模式）
const buildApiData = () => {
  let parentId = null
  let startBuildIndex = 0
  
  for (let i = 0; i < formData.unitLayers.length; i++) {
    const layer = formData.unitLayers[i]
    if (layer.type === 'select' && layer.selectedId) {
      parentId = layer.selectedId
      startBuildIndex = i + 1
    }
  }
  
  const buildNestedUnits = (startIndex) => {
    if (startIndex >= formData.unitLayers.length) {
      return []
    }
    
    const currentLayer = formData.unitLayers[startIndex]
    
    if (currentLayer.type === 'input' && currentLayer.inputValue) {
      const unit = {
        name: currentLayer.inputValue,
        importance_level: currentLayer.importance_level,
        unit_label_ids: currentLayer.unit_label_ids || [], // ⭐ 標籤 IDs
        users: [],
        sub_units: buildNestedUnits(startIndex + 1)
      }
      
      const hasMoreLayers = formData.unitLayers
        .slice(startIndex + 1)
        .some(layer => layer.type === 'input' && layer.inputValue)
      
      if (!hasMoreLayers) {
        unit.users = selectedUsers.value.map(user => user.id)
      }
      
      return [unit]
    }
    
    return buildNestedUnits(startIndex + 1)
  }
  
  const units = buildNestedUnits(startBuildIndex)
  
  return {
    parentId: parentId,
    units: units
  }
}

const addManualLayer = () => {
  if (isEditMode.value) {
    alert('編輯模式不允許添加新的子單位層級')
    return
  }
  
  const nextLevel = formData.unitLayers.length + 1
  if (nextLevel > 5) {
    alert('最多只能建立 5 層單位')
    return
  }
  
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

const saveForm = async () => {
  try {
    isSaving.value = true
    
    if (isEditMode.value) {
      const targetLayer = formData.unitLayers.find(layer => layer.isTarget)
      if (!targetLayer || !targetLayer.inputValue) {
        alert('請輸入單位名稱')
        return
      }
      
      const editData = {
        name: targetLayer.inputValue,
        importance_level: targetLayer.importance_level,
        unit_label_ids: targetLayer.unit_label_ids || [], // ⭐ 標籤 IDs
        updateUnitUsers: availableUsers.value.map(user => ({
          user_id: user.id,
          is_in_unit: user.isSelected
        }))
      }
      
      const response = await unitStore.updateUnit(editUnitData.value.id, editData)
      
      if (response.success) {
        try {
          await reloadEditPageData()
          alert('編輯單位成功！')
        } catch (reloadError) {
          console.error('❌ 重新載入資料時發生錯誤:', reloadError)
          alert('編輯成功，但重新載入資料失敗，請手動刷新頁面')
        }
      } else {
        alert('編輯失敗：' + (response.message || '未知錯誤'))
      }
    } else {
      if (!unitPath.value) {
        alert('請至少選擇或輸入一層單位')
        return
      }
      
      const hasNewUnits = formData.unitLayers.some(layer => 
        layer.type === 'input' && layer.inputValue
      )
      
      if (!hasNewUnits) {
        alert('請至少輸入一個新的單位名稱')
        return
      }
      
      const apiData = buildApiData()
      
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

// ⭐ 修改：編輯單位名稱切換
const toggleEditUnitName = () => {
  if(!hasWriteUnitPermission.value){
    alert('您沒有權限編輯單位名稱')
    return
  }
  
  if (!isEditingUnitName.value) {
    const targetLayer = formData.unitLayers.find(layer => layer.isTarget)
    if (targetLayer) {
      backupData.originalUnitName = targetLayer.inputValue
      backupData.originalimportance_level = targetLayer.importance_level
      backupData.originalUnitLabelIds = [...(targetLayer.unit_label_ids || [])]
      backupData.originalUnitLabels = [...(targetLayer.unit_labels || [])] // ⭐ 新增：備份標籤名稱
    }
    
    backupData.originalUserSelections = availableUsers.value.map(user => ({
      id: user.id,
      isSelected: user.isSelected
    }))
    
    isEditingUnitName.value = true
    
    if (targetLayer) {
      targetLayer.isLocked = false
    }
  } else {
    const targetLayer = formData.unitLayers.find(layer => layer.isTarget)
    if (targetLayer && backupData.originalUnitName !== '') {
      targetLayer.inputValue = backupData.originalUnitName
      targetLayer.importance_level = backupData.originalimportance_level
      targetLayer.unit_label_ids = [...backupData.originalUnitLabelIds]
      targetLayer.unit_labels = [...backupData.originalUnitLabels] // ⭐ 新增：恢復標籤名稱
    }
    
    if (backupData.originalUserSelections.length > 0) {
      backupData.originalUserSelections.forEach(backup => {
        const user = availableUsers.value.find(u => u.id === backup.id)
        if (user) {
          user.isSelected = backup.isSelected
        }
      })
    }
    
    isEditingUnitName.value = false
    
    if (targetLayer) {
      targetLayer.isLocked = true
    }
    
    backupData.originalUnitName = ''
    backupData.originalimportance_level = ''
    backupData.originalUnitLabelIds = []
    backupData.originalUnitLabels = [] // ⭐ 新增
    backupData.originalUserSelections = []
  }
}

// ⭐ 修改：重新載入編輯頁面資料
const reloadEditPageData = async () => {
  try {
    if (!editUnitData.value || !editUnitData.value.id) {
      throw new Error('editUnitData 或 editUnitData.id 不存在')
    }
    
    const response = await unitStore.fetchUnitById(editUnitData.value.id)
    if (response.success && response.data) {
      editUnitData.value = response.data
      originalUnitName.value = response.data.name
      unitUsersCount.value = response.data.users ? response.data.users.length : 0
      
      const targetLayer = formData.unitLayers.find(layer => layer.isTarget)
      if (targetLayer) {
        targetLayer.inputValue = response.data.name
        targetLayer.importance_level = response.data.importance_level || '1'
        targetLayer.unit_label_ids = response.data.unit_label_ids || []
        targetLayer.unit_labels = response.data.unit_labels || [] // ⭐ 新增
      }
    } else {
      throw new Error('重新獲取單位資料失敗：' + (response.message || '未知錯誤'))
    }
    
    currentPage.value = 1
    searchKeyword.value = ''
    
    try {
      await loadUsers(editUnitData.value.id, true)
    } catch (userLoadError) {
      console.error('❌ 載入用戶資料時發生錯誤:', userLoadError)
      throw new Error('載入用戶資料失敗：' + userLoadError.message)
    }
  } catch (error) {
    console.error('❌ 重新載入資料失敗:', error)
    throw error
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
    
    const editData = {
      name: targetLayer.inputValue,
      importance_level: targetLayer.importance_level,
      unit_label_ids: targetLayer.unit_label_ids || [], // ⭐ 標籤 IDs
      updateUnitUsers: availableUsers.value.map(user => ({
        user_id: user.id,
        is_in_unit: user.isSelected
      }))
    }
    
    const response = await unitStore.updateUnit(editUnitData.value.id, editData)
    
    if (response.success) {
      originalUnitName.value = targetLayer.inputValue
      editUnitData.value.name = targetLayer.inputValue
      editUnitData.value.importance_level = targetLayer.importance_level
      editUnitData.value.unit_label_ids = targetLayer.unit_label_ids || []
      editUnitData.value.unit_labels = targetLayer.unit_labels || [] // ⭐ 新增
      
      isEditingUnitName.value = false
      targetLayer.isLocked = true
      
      backupData.originalUnitName = ''
      backupData.originalimportance_level = ''
      backupData.originalUnitLabelIds = []
      backupData.originalUnitLabels = [] // ⭐ 新增
      backupData.originalUserSelections = []
      
      alert('單位更新成功！')
      await reloadEditPageData()
      
      const currentUser = availableUsers.value.find(user => user.id === authStore.user.id)
      if (currentUser) {
        if (currentUser.isSelected) {
          authStore.user.repair_unit = targetLayer.inputValue
        } else {
          authStore.user.repair_unit = ''
        }
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
    
    const response = await unitStore.deleteUnit(editUnitData.value.id)
    
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

const getToggleButtonTitle = (layer) => {
  if (isEditMode.value) {
    return '編輯模式不允許切換類型'
  }
  if (layer.isLocked) {
    return '此層級已鎖定'
  }
  return layer.type === 'select' ? '切換到輸入模式' : '切換到選擇模式'
}

// 獲取重要程度標籤文字
const getimportance_levelLabel = (value) => {
  const option = importance_levelOptions.find(opt => opt.value === value)
  return option ? option.label : '普級'
}

// ⭐ 點擊外部關閉下拉選單
onMounted(async () => {
  isLoading.value = true
  try {
    if (isEditMode.value && editUnitId.value) {
      const editPath = await buildEditUnitPath(editUnitId.value)
      await initializeEditForm(editPath)
    } else if (isInsertMode.value && parentId.value) {
      const parentPath = await buildParentPath(parentId.value)
      await initializeFormFromPath(parentPath)
    } else {
      const firstLayerOptions = await loadLayerOptions(1)
      formData.unitLayers[0].options = firstLayerOptions
      formData.unitLayers[0].type = firstLayerOptions.length > 0 ? 'select' : 'input'
      formData.unitLayers[0].isLocked = false
      
      await loadUsers(null)
    }
    
    // ⭐ 監聽點擊外部事件
    document.addEventListener('click', closeDropdownOnClickOutside)
  } catch (error) {
    console.error('❌ 初始化失敗:', error)
    alert('初始化失敗：' + (error.message || '請稍後再試'))
    
    if (!isEditMode.value) {
      formData.unitLayers[0].type = 'input'
      formData.unitLayers[0].isLocked = false
      
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

// ⭐ 組件卸載時移除事件監聽
onBeforeUnmount(() => {
  document.removeEventListener('click', closeDropdownOnClickOutside)
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
          
          <button 
            v-if="!isEditingUnitName && hasWriteUnitPermission"
            class="delete-btn" 
            @click="deleteUnit"
            :disabled="isSaving"
          >
            刪除單位
          </button>
          
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
      <template v-if="!isEditMode">
        <button class="mobile-save-btn" @click="saveForm" :disabled="isSaving">
          <span class="btn-icon">💾</span>
          <span class="btn-text">儲存</span>
        </button>
      </template>
      
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
        <!-- 編輯模式單位資訊卡片 -->
        <div v-if="isEditMode" class="unit-info-card">
          <div class="unit-info-header">
            <h3>單位群組資訊</h3>
          </div>
          <div class="unit-info-content">
            <!-- 桌面版和平板版 -->
            <div class="info-grid desktop-tablet-grid">
              <div class="info-row">
                <label class="info-label">單位</label>
                <div class="info-value">{{ unitPath }}</div>
              </div>
              <div class="info-row">
                <label class="info-label">重要程度</label>
                <div class="info-value">
                  <span :class="['importance-badge', `level-${editUnitData?.importance_level || '1'}`]">
                    {{ getimportance_levelLabel(editUnitData?.importance_level || '1') }}
                  </span>
                </div>
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
            
            <!-- 手機版 -->
            <div class="info-grid mobile-grid">
              <div class="info-card">
                <div class="info-card-icon">🏢</div>
                <div class="info-card-content">
                  <div class="info-card-label">單位</div>
                  <div class="info-card-value">{{ unitPath }}</div>
                </div>
              </div>
              
              <div class="info-card">
                <div class="info-card-icon">⚡</div>
                <div class="info-card-content">
                  <div class="info-card-label">重要程度</div>
                  <div class="info-card-value">
                    <span :class="['importance-badge', `level-${editUnitData?.importance_level || '1'}`]">
                      {{ getimportance_levelLabel(editUnitData?.importance_level || '1') }}
                    </span>
                  </div>
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
          <!-- 桌面版和平板版 -->
          <div class="desktop-tablet-form">
            <div class="form-row">
              <label class="form-label">單位</label>
              <div class="unit-layers">
                <div 
                  v-for="(layer, index) in formData.unitLayers" 
                  :key="index"
                  class="layer-container"
                >
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

                  <span v-if="index < formData.unitLayers.length - 1" class="layer-separator">></span>
                </div>
              </div>
            </div>

            <!-- 重要程度選擇 -->
            <div class="form-row importance-row">
              <label class="form-label">重要程度</label>
              <div class="importance-layers">
                <div 
                  v-for="(layer, index) in formData.unitLayers" 
                  :key="`importance-${index}`"
                  class="importance-container"
                >
                  <select 
                    v-model="layer.importance_level"
                    :disabled="layer.isLocked && (!layer.isTarget || !isEditingUnitName)"
                    :class="[
                      'importance-select', 
                      `level-${layer.importance_level}`,
                      { 
                        'locked': layer.isLocked && (!layer.isTarget || !isEditingUnitName),
                        'target': layer.isTarget,
                        'editable': layer.isTarget && isEditMode && isEditingUnitName
                      }
                    ]"
                  >
                    <option 
                      v-for="option in importance_levelOptions" 
                      :key="option.value" 
                      :value="option.value"
                    >
                      {{ option.label }}
                    </option>
                  </select>
                  
                  <span v-if="index < formData.unitLayers.length - 1" class="importance-separator">></span>
                </div>
              </div>
            </div>

            <!-- 單位標籤選擇區域（桌面版） -->
            <div class="form-row unit-label-row">
              <label class="form-label">單位標籤</label>
              <div class="unit-label-section">
                <!-- 已選標籤顯示 -->
                <div class="selected-labels-display">
                  <div v-if="selectedLabels.length === 0" class="no-labels-hint">
                    尚未選擇標籤
                  </div>
                  <div v-else class="selected-labels-list">
                    <span 
                      v-for="label in selectedLabels" 
                      :key="label.id"
                      class="selected-label-tag"
                    >
                      {{ label.name }}
                      <button 
                        class="remove-label-btn"
                        @click="removeSelectedLabel(label.name)"
                        :disabled="!canSelectLabelsInCreateMode"
                        title="移除標籤"
                      >
                        ✕
                      </button>
                    </span>
                  </div>
                </div>

                <!-- 選擇標籤按鈕 -->
                <button 
                  class="select-labels-btn"
                  @click="toggleLabelDropdown"
                  :disabled="!canSelectLabelsInCreateMode"
                  type="button"
                >
                  <span class="btn-icon">🏷️</span>
                  <span class="btn-text">選擇標籤</span>
                </button>

                <!-- 標籤下拉選單 -->
                <div v-if="showLabelDropdown" class="label-dropdown">
                  <div class="dropdown-header">
                    <input 
                      v-model="labelSearchKeyword"
                      type="text"
                      placeholder="搜尋標籤..."
                      class="label-search-input"
                      @input="loadUnitLabels"
                    />
                    <div class="dropdown-actions">
                      <span class="selected-count">已選 {{ selectedLabels.length }} 個</span>
                      <button 
                        v-if="selectedLabels.length > 0"
                        class="clear-all-btn"
                        @click="clearAllLabels"
                        type="button"
                      >
                        清空
                      </button>
                    </div>
                  </div>

                  <div class="dropdown-body">
                    <div v-if="isLoadingLabels" class="loading-state">
                      <div class="loading-spinner small">⟳</div>
                      <span>載入標籤中...</span>
                    </div>
                    <div v-else-if="filteredUnitLabels.length === 0" class="empty-state">
                      暫無標籤
                    </div>
                    <div v-else class="labels-list">
                      <label 
                        v-for="label in filteredUnitLabels"
                        :key="label.id"
                        class="label-checkbox-item"
                      >
                        <input 
                          type="checkbox"
                          :checked="isLabelSelected(label.id)"
                          @change="toggleLabelSelection(label.id)"
                        />
                        <span class="label-name">{{ label.name }}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 手機版表單 -->
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

                  <div v-else class="mobile-input-container">
                    <input 
                      v-model="layer.inputValue"
                      @input="handleLayerChange(index)"
                      :placeholder="getInputPlaceholder(layer)"
                      :disabled="layer.isLocked"
                      class="mobile-layer-input"
                    />
                  </div>

                  <!-- 手機版重要程度選擇 -->
                  <div class="mobile-importance-container">
                    <label class="mobile-importance-label">重要程度</label>
                    <select 
                      v-model="layer.importance_level"
                      :disabled="layer.isLocked && (!layer.isTarget || !isEditingUnitName)"
                      :class="[
                        'mobile-importance-select', 
                        `level-${layer.importance_level}`,
                        { 
                          'locked': layer.isLocked && (!layer.isTarget || !isEditingUnitName),
                          'editable': layer.isTarget && isEditMode && isEditingUnitName
                        }
                      ]"
                    >
                      <option 
                        v-for="option in importance_levelOptions" 
                        :key="option.value" 
                        :value="option.value"
                      >
                        {{ option.label }}
                      </option>
                    </select>
                  </div>
                </div>

                <div v-if="layer.isTarget" class="target-indicator">
                  <span class="target-badge">目標單位</span>
                </div>
              </div>
            </div>

            <!-- 手機版單位標籤選擇 -->
            <div class="mobile-label-section">
              <div class="mobile-label-header">
                <h5>單位標籤</h5>
                <button 
                  class="mobile-select-labels-btn"
                  @click="openMobileLabelModal"
                  :disabled="!canSelectLabelsInCreateMode"
                  type="button"
                >
                  選擇標籤
                </button>
              </div>

              <!-- 已選標籤顯示 -->
              <div class="mobile-selected-labels">
                <div v-if="selectedLabels.length === 0" class="no-labels-hint">
                  尚未選擇標籤
                </div>
                <div v-else class="mobile-labels-list">
                  <span 
                    v-for="label in selectedLabels" 
                    :key="label.id"
                    class="mobile-label-tag"
                  >
                    {{ label.name }}
                    <button 
                      class="remove-label-btn"
                      @click="removeSelectedLabel(label.name)"
                      :disabled="!canSelectLabelsInCreateMode"
                    >
                      ✕
                    </button>
                  </span>
                </div>
              </div>

              <!-- 手機版標籤選擇 Modal -->
              <div v-if="showMobileLabelModal" class="mobile-label-modal">
                <div class="modal-overlay" @click="closeMobileLabelModal"></div>
                <div class="modal-content">
                  <div class="modal-header">
                    <h5>選擇標籤</h5>
                    <button class="close-modal-btn" @click="closeMobileLabelModal">✕</button>
                  </div>

                  <div class="modal-search">
                    <input 
                      v-model="labelSearchKeyword"
                      type="text"
                      placeholder="搜尋標籤..."
                      class="modal-search-input"
                      @input="loadUnitLabels"
                    />
                  </div>

                  <div class="modal-body">
                    <div v-if="isLoadingLabels" class="loading-state">
                      <div class="loading-spinner">⟳</div>
                      <span>載入標籤中...</span>
                    </div>
                    <div v-else-if="filteredUnitLabels.length === 0" class="empty-state">
                      暫無標籤
                    </div>
                    <div v-else class="modal-labels-list">
                      <label 
                        v-for="label in filteredUnitLabels"
                        :key="label.id"
                        class="modal-label-item"
                      >
                        <input 
                          type="checkbox"
                          :checked="isLabelSelected(label.id)"
                          @change="toggleLabelSelection(label.id)"
                        />
                        <span class="label-name">{{ label.name }}</span>
                      </label>
                    </div>
                  </div>

                  <div class="modal-footer">
                    <div class="selected-count">已選 {{ selectedLabels.length }} 個標籤</div>
                    <div class="modal-actions">
                      <button 
                        v-if="selectedLabels.length > 0"
                        class="clear-btn"
                        @click="clearAllLabels"
                        type="button"
                      >
                        清空
                      </button>
                      <button 
                        class="confirm-btn"
                        @click="closeMobileLabelModal"
                        type="button"
                      >
                        確定
                      </button>
                    </div>
                  </div>
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
              <tr v-if="isLoadingUsers">
                <td colspan="7" class="loading-cell">
                  <div class="loading-container">
                    <div class="loading-spinner">⟳</div>
                    <div class="loading-text">載入用戶資料中...</div>
                  </div>
                </td>
              </tr>
              
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

          <div v-if="isLoadingUsers" class="mobile-loading">
            <div class="loading-spinner large">⟳</div>
            <div class="loading-text">載入用戶資料中...</div>
          </div>
          
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
@use 'sass:color';

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

// 重要程度顏色定義
$importance-normal: #6c757d;
$importance-warranty: #ffc107;
$importance-urgent: #dc3545;

// 標籤相關顏色
$label-gradient-start: #17a2b8;
$label-gradient-end: #764ba2;
$label-bg: #f8f9ff;
$label-border: #e0e3ff;

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

    &.small {
      font-size: 16px;
      margin-bottom: 0;
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

// ⭐⭐單位標籤選擇區域樣式（桌面版） ⭐⭐⭐
.unit-label-row {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e9ecef;

  @media (min-width: $breakpoint-tablet) {
    margin-top: 25px;
    padding-top: 25px;
  }
}

.unit-label-section {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
  position: relative;

  .selected-labels-display {
    flex: 1;
    min-height: 42px;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: white;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;

    .no-labels-hint {
      color: #999;
      font-size: 14px;
    }

    .selected-labels-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      width: 100%;
    }
  }

  .selected-label-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: $label-gradient-start;
    color: white;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;
    box-shadow: 0 2px 4px rgba($label-gradient-start, 0.3);
    transition: all 0.2s;
    animation: slideIn 0.3s ease;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba($label-gradient-start, 0.4);
    }

    .remove-label-btn {
      background: rgba(255, 255, 255, 0.3);
      border: none;
      color: white;
      border-radius: 50%;
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 10px;
      line-height: 1;
      transition: all 0.2s;
      padding: 0;

      &:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.5);
        transform: scale(1.1);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }

  .select-labels-btn {
    background: $primary-color;
    color: white;
    border: none;
    padding: 10px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;

    .btn-icon {
      font-size: 16px;
    }

    &:hover:not(:disabled) {
      background: $primary-hover;
      transform: translateY(-1px);
    }

    &:disabled {
      background: #ccc;
      cursor: not-allowed;
      opacity: 0.6;
    }
  }

  .label-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 8px;
    width: 400px;
    max-width: calc(100vw - 32px);
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 100;
    animation: dropdownSlideIn 0.2s ease;

    .dropdown-header {
      padding: 12px;
      border-bottom: 1px solid #f0f0f0;

      .label-search-input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        margin-bottom: 8px;

        &:focus {
          outline: none;
          border-color: $primary-color;
          box-shadow: 0 0 0 2px rgba($primary-color, 0.1);
        }
      }

      .dropdown-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .selected-count {
          font-size: 12px;
          color: #666;
        }

        .clear-all-btn {
          background: none;
          border: none;
          color: $danger-color;
          font-size: 12px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.2s;

          &:hover {
            background: rgba($danger-color, 0.1);
          }
        }
      }
    }

    .dropdown-body {
      max-height: 300px;
      overflow-y: auto;
      padding: 8px;

      .loading-state,
      .empty-state {
        padding: 20px;
        text-align: center;
        color: #999;
        font-size: 14px;
      }

      .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }

      .labels-list {
        display: flex;
        flex-direction: column;
        gap: 4px;

        .label-checkbox-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;

          &:hover {
            background: $label-bg;
          }

          input[type="checkbox"] {
            width: 16px;
            height: 16px;
            cursor: pointer;
          }

          .label-name {
            flex: 1;
            font-size: 14px;
            color: #333;
          }
        }
      }
    }
  }
}

// ⭐⭐手機版標籤選擇區域 ⭐⭐⭐
.mobile-label-section {
  margin-top: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #dee2e6;

  .mobile-label-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    h5 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #333;
    }

    .mobile-select-labels-btn {
      background: $primary-color;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s;

      &:active:not(:disabled) {
        transform: scale(0.95);
      }

      &:disabled {
        background: #ccc;
        cursor: not-allowed;
        opacity: 0.6;
      }
    }
  }

  .mobile-selected-labels {
    .no-labels-hint {
      color: #999;
      font-size: 13px;
      text-align: center;
      padding: 12px;
    }

    .mobile-labels-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .mobile-label-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: linear-gradient(135deg, $label-gradient-start 0%, $label-gradient-end 100%);
      color: white;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      box-shadow: 0 2px 4px rgba($label-gradient-start, 0.3);
      animation: slideIn 0.3s ease;

      .remove-label-btn {
        background: rgba(255, 255, 255, 0.3);
        border: none;
        color: white;
        border-radius: 50%;
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 10px;
        line-height: 1;
        padding: 0;

        &:active:not(:disabled) {
          transform: scale(0.9);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
    }
  }
}

// ⭐⭐手機版標籤選擇 Modal ⭐⭐⭐
.mobile-label-modal {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: flex-end;
  justify-content: center;

  .modal-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    animation: fadeIn 0.3s ease;
  }

  .modal-content {
    position: relative;
    width: 100%;
    max-height: 80vh;
    background: white;
    border-radius: 16px 16px 0 0;
    display: flex;
    flex-direction: column;
    animation: slideUp 0.3s ease;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #f0f0f0;

      h5 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #333;
      }

      .close-modal-btn {
        background: none;
        border: none;
        font-size: 24px;
        color: #999;
        cursor: pointer;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s;

        &:active {
          background: #f0f0f0;
          transform: scale(0.9);
        }
      }
    }

    .modal-search {
      padding: 12px 20px;
      border-bottom: 1px solid #f0f0f0;

      .modal-search-input {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 14px;

        &:focus {
          outline: none;
          border-color: $primary-color;
          box-shadow: 0 0 0 2px rgba($primary-color, 0.1);
        }
      }
    }

    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 12px 20px;

      .loading-state,
      .empty-state {
        padding: 40px 20px;
        text-align: center;
        color: #999;
        font-size: 14px;
      }

      .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }

      .modal-labels-list {
        display: flex;
        flex-direction: column;
        gap: 8px;

        .modal-label-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #f8f9fa;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;

          &:active {
            background: $label-bg;
            transform: scale(0.98);
          }

          input[type="checkbox"] {
            width: 18px;
            height: 18px;
            cursor: pointer;
          }

          .label-name {
            flex: 1;
            font-size: 15px;
            color: #333;
          }
        }
      }
    }

    .modal-footer {
      padding: 16px 20px;
      border-top: 1px solid #f0f0f0;
      background: #f8f9fa;
      display: flex;
      justify-content: space-between;
      align-items: center;

      .selected-count {
        font-size: 13px;
        color: #666;
        font-weight: 500;
      }

      .modal-actions {
        display: flex;
        gap: 8px;

        .clear-btn {
          background: white;
          color: $danger-color;
          border: 1px solid $danger-color;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;

          &:active {
            background: rgba($danger-color, 0.1);
            transform: scale(0.95);
          }
        }

        .confirm-btn {
          background: $primary-color;
          color: white;
          border: none;
          padding: 8px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;

          &:active {
            background: $primary-hover;
            transform: scale(0.95);
          }
        }
      }
    }
  }
}

// 動畫效果
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes dropdownSlideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// 接續 Part 1...

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
            min-width: 100px;
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

      // 重要程度選擇行
      .importance-row {
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid #e9ecef;

        @media (min-width: $breakpoint-tablet) {
          margin-top: 25px;
          padding-top: 25px;
        }
      }

      .importance-layers {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;

        .importance-container {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .importance-select {
          padding: 8px 12px;
          border: 2px solid #ddd;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          min-width: 120px;
          transition: all 0.3s;
          cursor: pointer;

          @media (min-width: $breakpoint-tablet) {
            padding: 10px 14px;
            font-size: 14px;
            min-width: 140px;
          }

          &:focus {
            outline: none;
            box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
          }

          &:disabled {
            background-color: #f8f9fa;
            color: #999;
            cursor: not-allowed;
            opacity: 0.7;
          }

          &.level-1 {
            border-color: $importance-normal;
            background-color: color.adjust($importance-normal, $lightness: 45%);
            color: color.adjust($importance-normal, $lightness: -10%);

            &:not(:disabled):hover {
              border-color: color.adjust($importance-normal, $lightness: -10%);
              background-color: color.adjust($importance-normal, $lightness: 40%);
            }
          }

          &.level-2 {
            border-color: $importance-warranty;
            background-color: color.adjust($importance-warranty, $lightness: 45%);
            color: color.adjust($importance-warranty, $lightness: -30%);

            &:not(:disabled):hover {
              border-color: color.adjust($importance-warranty, $lightness: -10%);
              background-color: color.adjust($importance-warranty, $lightness: 40%);
            }
          }

          &.level-3 {
            border-color: $importance-urgent;
            background-color: color.adjust($importance-urgent, $lightness: 45%);
            color: color.adjust($importance-urgent, $lightness: -10%);

            &:not(:disabled):hover {
              border-color: color.adjust($importance-urgent, $lightness: -10%);
              background-color: color.adjust($importance-urgent, $lightness: 40%);
            }
          }

          &.locked {
            background-color: #fff3cd;
            border-color: #ffc107;
            color: #856404;
          }

          &.target {
            border-width: 2px;
            box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.1);
          }

          &.editable {
            border-color: #007bff;
            background-color: #f0f8ff;
            font-weight: 600;
            box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
          }
        }

        .importance-separator {
          color: #666;
          font-weight: bold;
          margin: 0 5px;
          font-size: 14px;
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

              &:active:not(:disabled) {
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

            .mobile-importance-container {
              margin-top: 12px;
              padding-top: 12px;
              border-top: 1px dashed #dee2e6;

              .mobile-importance-label {
                display: block;
                font-size: 12px;
                color: #6c757d;
                font-weight: 500;
                margin-bottom: 6px;
              }

              .mobile-importance-select {
                width: 100%;
                padding: 10px 12px;
                border: 2px solid #ddd;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.3s;
                cursor: pointer;
                appearance: none;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: right 12px center;
                background-size: 12px;
                padding-right: 36px;

                &:focus {
                  outline: none;
                  box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
                }

                &:disabled {
                  background-color: #f8f9fa;
                  color: #999;
                  cursor: not-allowed;
                  opacity: 0.7;
                }

                &.level-1 {
                  border-color: $importance-normal;
                  background-color: color.adjust($importance-normal, $lightness: 47%);
                  color: color.adjust($importance-normal, $lightness: -10%);

                  &:not(:disabled):active {
                    background-color: color.adjust($importance-normal, $lightness: 42%);
                  }
                }

                &.level-2 {
                  border-color: $importance-warranty;
                  background-color: color.adjust($importance-warranty, $lightness: 47%);
                  color: color.adjust($importance-warranty, $lightness: -30%);

                  &:not(:disabled):active {
                    background-color: color.adjust($importance-warranty, $lightness: 42%);
                  }
                }

                &.level-3 {
                  border-color: $importance-urgent;
                  background-color: color.adjust($importance-urgent, $lightness: 47%);
                  color: color.adjust($importance-urgent, $lightness: -10%);

                  &:not(:disabled):active {
                    background-color: color.adjust($importance-urgent, $lightness: 42%);
                  }
                }

                &.locked {
                  background-color: #fff3cd;
                  border-color: #ffc107;
                  color: #856404;
                }

                &.editable {
                  border-color: #007bff;
                  border-width: 2px;
                  background-color: #e7f3ff;
                  font-weight: 600;
                  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
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

// 重要程度 Badge 樣式
.importance-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
  transition: all 0.2s ease;

  @media (max-width: $breakpoint-mobile) {
    padding: 3px 8px;
    font-size: 11px;
  }

  @media (min-width: $breakpoint-tablet) {
    padding: 5px 14px;
    font-size: 13px;
  }

  &:hover {
    transform: scale(1.05);
  }

  &.level-1 {
    background: color.adjust($importance-normal, $lightness: 35%);
    color: color.adjust($importance-normal, $lightness: -10%);
    border: 1px solid color.adjust($importance-normal, $lightness: 15%);
  }

  &.level-2 {
    background: color.adjust($importance-warranty, $lightness: 35%);
    color: color.adjust($importance-warranty, $lightness: -30%);
    border: 1px solid color.adjust($importance-warranty, $lightness: 15%);
  }

  &.level-3 {
    background: color.adjust($importance-urgent, $lightness: 35%);
    color: color.adjust($importance-urgent, $lightness: -10%);
    border: 1px solid color.adjust($importance-urgent, $lightness: 15%);
  }
}

// 手機版專用底部間距
@media (max-width: calc($breakpoint-tablet - 1px)) {
  .form-container {
    padding-bottom: 100px;
  }
}

// 響應式調整
@media (max-width: $breakpoint-mobile) {
  .desktop-tablet-form {
    .importance-layers {
      flex-direction: column;
      align-items: stretch;
      gap: 8px;

      .importance-container {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;

        .importance-select {
          width: 100%;
        }

        .importance-separator {
          display: none;
        }
      }
    }
  }
}
// ⭐⭐⭐ 用戶管理區域完整樣式 ⭐⭐⭐
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
</style>
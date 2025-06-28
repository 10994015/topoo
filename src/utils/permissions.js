// utils/permissions.js - 權限名稱常數
export const PERMISSIONS = {
  ACCOUNT_MANAGEMENT: '帳號管理',
  PERMISSION_MANAGEMENT: '權限管理',
  WORKFLOW_MANAGEMENT: '流程管理',
  TODO_MANAGEMENT: '待辦管理',
  DEPARTMENT_MANAGEMENT: '單位管理',
  REPORT_MANAGEMENT: '報表管理',
  PARAMETER_MANAGEMENT: '參數管理'
}

// 權限檢查輔助函數
export const checkPermission = (authStore, permissionName, mode = 'Read') => {
  return authStore.hasPermission(permissionName, mode)
}

// 批量權限檢查
export const checkMultiplePermissions = (authStore, permissions, mode = 'Read') => {
  return permissions.every(permission => authStore.hasPermission(permission, mode))
}

// 檢查是否有任一權限
export const checkAnyPermission = (authStore, permissions, mode = 'Read') => {
  return permissions.some(permission => authStore.hasPermission(permission, mode))
}
// utils/permissions.js - 權限名稱常數
export const PERMISSIONS = {
  ACCOUNT_MANAGEMENT: '帳號管理',
  REPAIR_MANAGEMENT: '報修管理',
  PERMISSION_ROLE_MANAGEMENT: '權限角色管理',
  PERMISSION_ROLE_MEMBER_MANAGEMENT: '權限角色成員管理',
  MAIL_MANAGEMENT: '寄信管理',
  PARAMETER_MANAGEMENT: '參數管理',
  TODO_MANAGEMENT: '派工管理',
  REPAIR_TODO_MANAGEMENT: '報修管理',
  REPAIR_CATEGORY_MANAGEMENT: '故障類別管理',
  REPAIR_REASON_MANAGEMENT: '故障原因類別管理',
  REPAIR_STATUS_MANAGEMENT: '報修狀態管理',
  UNIT_MANAGEMENT: '單位管理',
  ACCOUNT_EXCEL_DOWNLOAD: '帳號查詢Excel下載',
  REPAIR_NOTICE_EXCEL_DOWNLOAD: '完修紀錄Excel下載',
  REPAIR_PROGRESS_SUMMARY_EXCEL_DOWNLOAD: '報修進度綜合表查詢Excel下載',
  SURVEY_MANAGEMENT: '滿意度問卷管理',
  SURVEY_EXCEL_DOWNLOAD: '問卷滿意度報表Excel下載',
}

// 權限檢查輔助函數
export const checkPermission = (authStore, permissionName, mode = 'Readonly') => {
  return authStore.hasPermission(permissionName, mode)
}

// 批量權限檢查
export const checkMultiplePermissions = (authStore, permissions, mode = 'Readonly') => {
  return permissions.every(permission => authStore.hasPermission(permission, mode))
}

// 檢查是否有任一權限
export const checkAnyPermission = (authStore, permissions, mode = 'Readonly') => {
  return permissions.some(permission => authStore.hasPermission(permission, mode))
}
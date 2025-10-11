export const formatDate = (dateString) => {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

export const formatDateTime = (dateString) => {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

export const toUTCString = (date) => {
  if (!date) return null;
  
  try {
    // 如果是字串，直接創建 Date 物件（會被視為本地時間）
    const localDate = new Date(date);
    
    // 檢查日期是否有效
    if (isNaN(localDate.getTime())) {
      console.warn('無效的日期格式:', date);
      return null;
    }
    
    // 轉換為 UTC ISO 字串
    return localDate.toISOString();
  } catch (error) {
    console.error('UTC 轉換錯誤:', error);
    return null;
  }
};

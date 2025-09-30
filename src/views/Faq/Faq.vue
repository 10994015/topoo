<script setup>
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { useFaqStore } from '@/stores/faq'
import { mdiMagnify, mdiPlus, mdiMinus, mdiClose } from '@mdi/js'

// Store
const faqStore = useFaqStore()

// 響應式數據
const searchTerm = ref('')
const selectedFaqId = ref(null) // 當前選中的 FAQ ID
const searchTimeout = ref(null)
const expandedSubFqas = ref(new Set()) // 展開的子問題ID集合
const isSearchFocused = ref(false) // 搜尋框焦點狀態
const searchInputRef = ref(null) // 搜尋框引用
const sidebarRef = ref(null) // 側邊欄引用
const mainContentRef = ref(null) // 主內容區引用

// 計算屬性
const filteredFaqList = computed(() => {
  if (!searchTerm.value.trim()) {
    return faqStore.faqList
  }
  
  return faqStore.faqList.filter(faq =>
    faq.question.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
    (faq.answer && faq.answer.toLowerCase().includes(searchTerm.value.toLowerCase()))
  )
})

// 選中的 FAQ 詳細資料
const selectedFaqDetail = computed(() => {
  if (!selectedFaqId.value) return null
  return faqStore.getFaqDetail(selectedFaqId.value, false) // false = 使用前台快取
})

// 檢查子問題是否展開
const isSubFqaExpanded = (subFqaId) => {
  return expandedSubFqas.value.has(subFqaId)
}

// 獲取展開圖示
const getExpandIcon = (subFqaId) => {
  return isSubFqaExpanded(subFqaId) ? mdiMinus : mdiPlus
}

// 選中 FAQ 並載入詳細資料
const selectFaq = async (faqId) => {
  // 如果點擊的是當前選中的FAQ，不做任何操作
  if (selectedFaqId.value === faqId) return
  
  selectedFaqId.value = faqId
  
  // 重置展開的子問題
  expandedSubFqas.value.clear()
  
  // 滾動到主內容區頂部 (移動端需要)
  if (window.innerWidth <= 768 && mainContentRef.value) {
    mainContentRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  
  // 如果還沒有詳細資料，載入它
  if (!faqStore.getFaqDetail(faqId)) {
    try {
      const result = await faqStore.fetchFaqDetail(faqId, false)
    } catch (error) {
      console.error('載入FAQ詳細資料失敗:', error)
      // 可以在這裡加入錯誤提示
    }
  }
}

// 切換子問題展開/收起狀態
const toggleSubFqa = (subFqaId, event) => {
  // 阻止事件冒泡
  event.stopPropagation()
  
  if (expandedSubFqas.value.has(subFqaId)) {
    expandedSubFqas.value.delete(subFqaId)
  } else {
    expandedSubFqas.value.add(subFqaId)
  }
  
  // 觸發響應式更新
  expandedSubFqas.value = new Set(expandedSubFqas.value)
}

// 展開所有子問題
const expandAllSubFqas = () => {
  if (selectedFaqDetail.value && selectedFaqDetail.value.sub_fqas) {
    selectedFaqDetail.value.sub_fqas.forEach(subFqa => {
      expandedSubFqas.value.add(subFqa.id)
    })
    expandedSubFqas.value = new Set(expandedSubFqas.value)
  }
}

// 收起所有子問題
const collapseAllSubFqas = () => {
  expandedSubFqas.value.clear()
  expandedSubFqas.value = new Set(expandedSubFqas.value)
}

// 搜尋處理 (加入防抖動)
const handleSearch = async () => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
  
  searchTimeout.value = setTimeout(async () => {
    try {
      // 如果有搜尋詞，調用API搜尋
      if (searchTerm.value.trim()) {
        await faqStore.searchFaq(searchTerm.value.trim())
      }
      
      // 如果當前選中的FAQ不在搜尋結果中，清除選中狀態
      if (selectedFaqId.value && !filteredFaqList.value.find(faq => faq.id === selectedFaqId.value)) {
        selectedFaqId.value = null
        expandedSubFqas.value.clear()
      }
    } catch (error) {
      console.error('搜尋失敗:', error)
    }
  }, 300) // 減少防抖時間到300ms提高響應速度
}

// 清除搜尋
const clearSearch = async () => {
  searchTerm.value = ''
  selectedFaqId.value = null
  expandedSubFqas.value.clear()
  
  // 重新載入完整列表
  try {
    await faqStore.fetchFaqList()
  } catch (error) {
    console.error('載入FAQ列表失敗:', error)
  }
  
  // 聚焦到搜尋框
  nextTick(() => {
    if (searchInputRef.value) {
      searchInputRef.value.focus()
    }
  })
}

// 重試載入FAQ詳細資料
const retryLoadFaqDetail = async () => {
  if (selectedFaqId.value) {
    try {
      await faqStore.fetchFaqDetail(selectedFaqId.value)
    } catch (error) {
      console.error('重試載入失敗:', error)
    }
  }
}

// 重新載入FAQ列表
const refreshFaqList = async () => {
  selectedFaqId.value = null
  expandedSubFqas.value.clear()
  searchTerm.value = ''
  
  try {
    await faqStore.fetchFaqList()
  } catch (error) {
    console.error('重新載入FAQ列表失敗:', error)
  }
}

// 搜尋框焦點事件
const onSearchFocus = () => {
  isSearchFocused.value = true
}

const onSearchBlur = () => {
  isSearchFocused.value = false
}

// 鍵盤事件處理
const handleKeydown = (event) => {
  // ESC鍵清除搜尋或取消選中
  if (event.key === 'Escape') {
    if (searchTerm.value) {
      clearSearch()
    } else if (selectedFaqId.value) {
      selectedFaqId.value = null
      expandedSubFqas.value.clear()
    }
    return
  }
  
  // Enter鍵觸發搜尋
  if (event.key === 'Enter' && isSearchFocused.value) {
    handleSearch()
    return
  }
  
  // 方向鍵導航FAQ列表 (只在桌面端啟用)
  if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && window.innerWidth > 768) {
    event.preventDefault()
    navigateFaqList(event.key === 'ArrowDown' ? 1 : -1)
    return
  }
}

// 導航FAQ列表
const navigateFaqList = (direction) => {
  const currentIndex = filteredFaqList.value.findIndex(faq => faq.id === selectedFaqId.value)
  let newIndex = currentIndex + direction
  
  // 循環導航
  if (newIndex >= filteredFaqList.value.length) {
    newIndex = 0
  } else if (newIndex < 0) {
    newIndex = filteredFaqList.value.length - 1
  }
  
  if (filteredFaqList.value[newIndex]) {
    selectFaq(filteredFaqList.value[newIndex].id)
  }
}

// 複製FAQ連結到剪貼板 (保留功能，可選用)
const copyFaqLink = async (faqId) => {
  try {
    const url = `${window.location.origin}${window.location.pathname}?faq=${faqId}`
    await navigator.clipboard.writeText(url)
    console.log('連結已複製到剪貼板')
  } catch (error) {
    console.error('複製連結失敗:', error)
  }
}

// 監聽搜尋詞變化
watch(searchTerm, (newValue, oldValue) => {
  // 如果搜尋詞為空，直接顯示所有結果
  if (!newValue.trim()) {
    // 清除搜尋超時
    if (searchTimeout.value) {
      clearTimeout(searchTimeout.value)
      searchTimeout.value = null
    }
    
    // 如果之前有搜尋詞，重新載入完整列表
    if (oldValue && oldValue.trim()) {
      faqStore.fetchFaqList().catch(error => {
        console.error('載入FAQ列表失敗:', error)
      })
    }
    return
  }
  
  // 有搜尋詞時觸發搜尋
  handleSearch()
}, { immediate: false })

// 監聽選中的FAQ變化，更新URL
watch(selectedFaqId, (newFaqId) => {
  // 更新URL參數（可選功能）
  const url = new URL(window.location)
  if (newFaqId) {
    url.searchParams.set('faq', newFaqId)
  } else {
    url.searchParams.delete('faq')
  }
  window.history.replaceState({}, '', url.toString())
})

// 從URL參數初始化選中的FAQ
const initFromUrl = () => {
  const urlParams = new URLSearchParams(window.location.search)
  const faqId = urlParams.get('faq')
  if (faqId && faqStore.faqList.find(faq => faq.id === faqId)) {
    selectFaq(faqId)
  }
}

// 處理窗口大小變化
const handleResize = () => {
  // 在移動端切換到桌面端時，確保布局正確
  if (window.innerWidth > 768 && selectedFaqId.value) {
    // 可以在這裡添加一些桌面端特定的邏輯
  }
}

// 組件掛載時的初始化
onMounted(async () => {
  try {
    // 載入FAQ列表
    await faqStore.fetchFaqList()
    
    // 從URL參數初始化
    initFromUrl()
    
    // 添加全局鍵盤事件監聽
    document.addEventListener('keydown', handleKeydown)
    
    // 添加窗口大小變化監聽
    window.addEventListener('resize', handleResize)
    
  } catch (error) {
    console.error('初始化失敗:', error)
  }
})

// 組件卸載時清理事件監聽
onUnmounted(() => {
  // 清理定時器
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
  
  // 移除事件監聽
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', handleResize)
})

// 暴露一些方法供外部調用
defineExpose({
  selectFaq,
  clearSearch,
  refreshFaqList,
  expandAllSubFqas,
  collapseAllSubFqas,
  copyFaqLink
})
</script>
<template>
  <div class="faq-page">
    <div class="faq-container">
      <!-- 左側導航 -->
      <aside class="sidebar" ref="sidebarRef">
        <div class="sidebar-content">
          <div class="sidebar-header">
            <h2 class="title">支援說明</h2>
            <p class="description">
              分類提供各項說明的基本資訊解答，也能查看特定說明情況
            </p>
            
            <!-- 搜尋框 -->
            <div class="search-box">
              <input
                ref="searchInputRef"
                type="text"
                v-model="searchTerm"
                placeholder="輸入關鍵詞搜尋"
                class="search-input"
                @keyup.enter="handleSearch"
                @focus="onSearchFocus"
                @blur="onSearchBlur"
              />
              <button 
                v-if="searchTerm"
                class="clear-search-btn" 
                @click="clearSearch"
                title="清除搜尋"
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path :d="mdiClose" fill="currentColor"></path>
                </svg>
              </button>
              <button class="search-icon-btn" @click="handleSearch">
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path :d="mdiMagnify" fill="currentColor"></path>
                </svg>
              </button>
            </div>
          </div>

          <!-- 導航選項 -->
          <nav class="navigation">
            <ul class="nav-list">
              <!-- Loading 狀態 -->
              <li v-if="faqStore.isLoading" class="nav-item loading-item">
                <div class="nav-loading">
                  <div class="loading-spinner">⟳</div>
                  <span>載入中...</span>
                </div>
              </li>
              
              <!-- FAQ 列表 -->
              <li 
                v-for="faq in filteredFaqList" 
                :key="faq.id" 
                class="nav-item"
                @click="selectFaq(faq.id)"
              >
                <span 
                  class="nav-link"
                  :class="{ 
                    'active': selectedFaqId === faq.id,
                    'inactive': selectedFaqId !== faq.id
                  }"
                >
                  {{ faq.question }}
                </span>
              </li>
              
              <!-- 無資料 -->
              <li v-if="filteredFaqList.length === 0 && !faqStore.isLoading" class="nav-item no-data-item">
                <span class="nav-link inactive">暫無相關問題</span>
              </li>
            </ul>
          </nav>
        </div>
      </aside>

      <!-- 右側內容 -->
      <main class="main-content" ref="mainContentRef">
        <div class="content-card">
          <div class="content-body">
            <!-- 未選擇任何 FAQ 的狀態 -->
            <div v-if="!selectedFaqId" class="no-selection">
              <div class="no-selection-content">
                <svg width="48" height="48" viewBox="0 0 24 24" class="no-selection-icon">
                  <path :d="mdiMagnify" fill="currentColor"></path>
                </svg>
                <h3>選擇左側問題查看詳細說明</h3>
                <p>請從左側列表選擇一個常見問題以查看詳細解答</p>
              </div>
            </div>

            <!-- Loading 狀態 -->
            <div v-else-if="faqStore.isLoadingFaqDetail(selectedFaqId)" class="loading-container">
              <div class="loading-spinner">⟳</div>
              <p class="loading-text">載入詳細內容中...</p>
            </div>

            <!-- 顯示選中 FAQ 的 sub_fqas -->
            <div v-else-if="selectedFaqDetail" class="faq-detail">
              <!-- 顯示 sub_fqas 列表 -->
              <div v-if="selectedFaqDetail.sub_fqas && selectedFaqDetail.sub_fqas.length > 0" class="sub-fqas">
                <!-- 添加操作按鈕 -->
                <div class="header-actions">
                  <button @click="expandAllSubFqas" class="action-btn expand-all-btn">
                    展開全部
                  </button>
                  <button @click="collapseAllSubFqas" class="action-btn collapse-all-btn">
                    收起全部
                  </button>
                </div>

                <div class="sub-fqas-list">
                  <div
                    v-for="subFaq in selectedFaqDetail.sub_fqas"
                    :key="subFaq.id"
                    class="sub-fqa-item"
                    :class="{ 'expanded': isSubFqaExpanded(subFaq.id) }"
                  >
                    <!-- FAQ問題部分 -->
                    <div class="sub-fqa-question" @click="toggleSubFqa(subFaq.id, $event)">
                      <span class="question-text">{{ subFaq.question }}</span>
                      <div class="expand-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24">
                          <path :d="getExpandIcon(subFaq.id)" fill="currentColor"></path>
                        </svg>
                      </div>
                    </div>
                    
                    <!-- FAQ答案部分 -->
                    <Transition name="slide-fade">
                      <div v-if="isSubFqaExpanded(subFaq.id)" class="sub-fqa-answer">
                        <div class="answer-content">
                          <p class="answer-text">{{ subFaq.answer }}</p>
                        </div>
                      </div>
                    </Transition>
                  </div>
                </div>
              </div>

              <!-- 沒有子問題的情況 -->
              <div v-else-if="selectedFaqDetail.sub_fqas && selectedFaqDetail.sub_fqas.length === 0" class="no-sub-fqas">
                <p>此問題暫無詳細子問題</p>
              </div>
            </div>

            <!-- 載入失敗狀態 -->
            <div v-else class="error-state">
              <div class="error-content">
                <p>載入詳細內容失敗</p>
                <button @click="retryLoadFaqDetail" class="retry-btn">重試</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.faq-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20px;
}

.faq-container {
  display: flex;
  height: calc(100vh - 40px);
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

// Loading 動畫
.loading-spinner {
  display: inline-block;
  animation: spin 1s linear infinite;
  font-size: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// 滑動淡入動畫
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s ease-in;
}

.slide-fade-enter-from {
  transform: translateY(-10px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}

// 左側導航
.sidebar {
  width: 320px;
  flex-shrink: 0;
  background: white;
  border-right: 1px solid #e5e7eb;

  .sidebar-content {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .sidebar-header {
    padding: 24px 20px;
    border-bottom: 1px solid #f0f0f0;

    .title {
      margin: 0 0 12px 0;
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
    }

    .description {
      margin: 0 0 20px 0;
      font-size: 13px;
      color: #6b7280;
      line-height: 1.5;
    }

    .search-box {
      position: relative;

      .search-input {
        width: 100%;
        padding: 12px 45px 12px 16px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 14px;
        background: #f9fafb;
        transition: all 0.2s;

        &:focus {
          outline: none;
          border-color: #3b82f6;
          background: white;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        &::placeholder {
          color: #9ca3af;
        }
      }

      .clear-search-btn {
        position: absolute;
        right: 40px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        cursor: pointer;
        color: #9ca3af;
        transition: color 0.2s;
        padding: 4px;

        &:hover {
          color: #ef4444;
        }
      }

      .search-icon-btn {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        cursor: pointer;
        color: #6b7280;
        transition: color 0.2s;
        padding: 4px;

        &:hover {
          color: #3b82f6;
        }
      }
    }
  }

  .navigation {
    flex: 1;
    overflow-y: auto;

    .nav-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .nav-item {
      &.loading-item {
        .nav-loading {
          display: flex;
          align-items: center;
          padding: 16px 20px;
          color: #6b7280;
          font-size: 14px;

          .loading-spinner {
            margin-right: 8px;
            font-size: 16px;
          }
        }
      }

      &.no-data-item {
        .nav-link.inactive {
          color: #9ca3af;
          font-style: italic;
          cursor: default;

          &:hover {
            background-color: transparent;
          }
        }
      }

      .nav-link {
        display: block;
        padding: 16px 20px;
        font-size: 14px;
        text-decoration: none;
        cursor: pointer;
        transition: all 0.2s;
        word-break: break-word;
        line-height: 1.4;
        border-bottom: 1px solid #f3f4f6;

        &.inactive {
          color: #374151;
          
          &:hover {
            background-color: #f9fafb;
            color: #1f2937;
          }
        }

        &.active {
          background: #eff6ff;
          color: #2563eb;
          font-weight: 500;
          border-left: 3px solid #2563eb;
          border-bottom-color: #e5e7eb;
        }
      }
    }

    // 滾動條樣式
    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: #f1f1f1;
    }

    &::-webkit-scrollbar-thumb {
      background: #d1d5db;
      border-radius: 3px;

      &:hover {
        background: #9ca3af;
      }
    }
  }
}

// 右側內容
.main-content {
  flex: 1;
  background: white;
  overflow-y: auto;

  .content-card {
    height: 100%;
  }

  .content-body {
    padding: 24px 32px;
    height: 100%;
  }
}

// 未選擇狀態
.no-selection {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;

  .no-selection-content {
    text-align: center;
    color: #6b7280;

    .no-selection-icon {
      opacity: 0.5;
      margin-bottom: 16px;
    }

    h3 {
      margin: 0 0 8px 0;
      font-size: 18px;
      font-weight: 500;
      color: #374151;
    }

    p {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
    }
  }
}

// Loading 狀態
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6b7280;

  .loading-text {
    margin-top: 12px;
    font-size: 14px;
  }
}

// FAQ 詳細內容
.faq-detail {
  height: 100%;

  .sub-fqas {
    height: 100%;
    display: flex;
    flex-direction: column;

    .header-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-bottom: 16px;

      .action-btn {
        padding: 6px 12px;
        font-size: 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        background: white;
        color: #6b7280;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          border-color: #2563eb;
          color: #2563eb;
        }

        &.expand-all-btn:hover {
          background: #eff6ff;
        }

        &.collapse-all-btn:hover {
          background: #fef3c7;
          border-color: #f59e0b;
          color: #f59e0b;
        }
      }
    }

    .sub-fqas-list {
      flex: 1;
      overflow-y: auto;

      .sub-fqa-item {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        margin-bottom: 8px;
        overflow: hidden;
        transition: all 0.2s;

        &:last-child {
          margin-bottom: 0;
        }

        &:hover {
          border-color: #3b82f6;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
        }

        &.expanded {
          .sub-fqa-question {
            background: #f8fafc;
            
            .expand-icon svg {
              transform: rotate(45deg);
              color: #2563eb;
            }

            .question-text {
              color: #2563eb;
            }
          }
        }

        .sub-fqa-question {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;

          &:hover {
            background: #f8fafc;
          }

          .question-text {
            color: #3b82f6;
            font-weight: 500;
            font-size: 14px;
            flex: 1;
            margin-right: 16px;
            line-height: 1.4;
          }

          .expand-icon {
            color: #6b7280;
            flex-shrink: 0;
            transition: all 0.2s;

            svg {
              transition: all 0.2s;
            }

            &:hover {
              color: #2563eb;
            }
          }
        }

        .sub-fqa-answer {
          .answer-content {
            padding: 20px;
            background: #f8fafc;
            border-top: 1px solid #f1f5f9;

            .answer-text {
              margin: 0;
              color: #374151;
              font-size: 14px;
              line-height: 1.6;
              white-space: pre-line;
            }
          }
        }
      }

      // 滾動條樣式
      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-track {
        background: #f1f1f1;
      }

      &::-webkit-scrollbar-thumb {
        background: #d1d5db;
        border-radius: 3px;

        &:hover {
          background: #9ca3af;
        }
      }
    }
  }

  .no-sub-fqas {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #9ca3af;
    font-style: italic;

    p {
      margin: 0;
      font-size: 14px;
    }
  }
}

// 錯誤狀態
.error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;

  .error-content {
    text-align: center;
    color: #ef4444;

    p {
      margin: 0 0 16px 0;
      font-size: 16px;
    }

    .retry-btn {
      padding: 8px 16px;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.2s;

      &:hover {
        background: #1d4ed8;
      }

      &:active {
        transform: translateY(1px);
      }
    }
  }
}

// 響應式設計
@media (max-width: 768px) {
  .faq-page {
    padding: 16px;
  }

  .faq-container {
    flex-direction: column;
    height: auto;
    min-height: calc(100vh - 32px);
  }

  .sidebar {
    width: 100%;
    height: auto;

    .sidebar-header {
      padding: 16px;

      .title {
        font-size: 16px;
      }

      .description {
        font-size: 12px;
      }

      .search-box {
        .search-input {
          font-size: 13px;
          padding: 10px 40px 10px 14px;
        }
      }
    }

    .navigation {
      max-height: 300px;

      .nav-item {
        .nav-link {
          padding: 14px 16px;
          font-size: 13px;
        }
      }
    }
  }

  .main-content {
    .content-body {
      padding: 16px;
      height: auto;
      min-height: 400px;
    }
  }

  .faq-detail {
    height: auto;

    .sub-fqas {
      height: auto;

      .header-actions {
        justify-content: center;
        margin-bottom: 12px;
      }

      .sub-fqas-list {
        height: auto;

        .sub-fqa-item {
          .sub-fqa-question {
            padding: 14px 16px;

            .question-text {
              font-size: 13px;
            }
          }

          .sub-fqa-answer {
            .answer-content {
              padding: 16px;

              .answer-text {
                font-size: 13px;
              }
            }
          }
        }
      }
    }
  }

  .no-selection {
    height: 300px;

    .no-selection-content {
      h3 {
        font-size: 16px;
      }

      p {
        font-size: 13px;
      }
    }
  }
}
</style>
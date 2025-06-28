<script setup>
import router from '@/router'
import { ref, computed, reactive, onMounted } from 'vue'

// 搜尋表單
const searchForm = reactive({
  keyword: ''
})

// 分頁設定
const currentPage = ref(1)
const pageSize = ref(10)
const totalItems = ref(3)

// 載入狀態
const isLoading = ref(false)

// 模擬參數資料
const parameterData = ref([
  {
    id: 1,
    parameterName: '故障類別',
    url:''
  },
  {
    id: 2,
    parameterName: '維修狀態',
    url:''
  },
  {
    id: 3,
    parameterName: '系統信箱',
    url:'/settings/parameter/mail-management'
  }
])

// 計算屬性
const totalPages = computed(() => {
  return Math.ceil(totalItems.value / pageSize.value)
})

const startItem = computed(() => {
  return totalItems.value === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1
})

const endItem = computed(() => {
  const end = currentPage.value * pageSize.value
  return end > totalItems.value ? totalItems.value : end
})

// 顯示的頁碼
const visiblePages = computed(() => {
  const pages = []
  const total = totalPages.value
  const current = currentPage.value
  
  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    } else if (current >= total - 3) {
      pages.push(1)
      pages.push('...')
      for (let i = total - 4; i <= total; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)
      pages.push('...')
      for (let i = current - 1; i <= current + 1; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    }
  }
  
  return pages
})

// 方法
const handleSearch = () => {
  currentPage.value = 1
  console.log('執行搜尋:', searchForm.keyword)
  // 這裡可以實現實際的搜索邏輯
}

const handleReset = () => {
  searchForm.keyword = ''
  currentPage.value = 1
  console.log('重置搜尋')
}

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
  console.log('跳轉到第', page, '頁')
}

const addParameter = () => {
  console.log('新增參數')
}

const editParameter = (url) => {
  router.push(url)
}

const deleteParameter = (item) => {
  console.log('刪除參數:', item)
}

onMounted(() => {
  console.log('參數管理頁面已載入')
})
</script>

<template>
  <div class="parameter-management">
    <!-- 頁面標題 -->
    <div class="page-header">
      <h1 class="page-title">參數管理</h1>
    </div>

    <!-- 搜尋區域 -->
    <section class="search-section">
      <div class="search-row">
        <div class="search-field">
          <input 
            type="text" 
            v-model="searchForm.keyword"
            placeholder="請輸入參數名稱"
            class="search-input"
            @keyup.enter="handleSearch"
          />
          <button class="search-btn" @click="handleSearch">
            🔍
          </button>
        </div>
        
        <div class="action-buttons">
          <button class="query-btn" @click="handleSearch">
            查詢
          </button>
          <button class="reset-btn" @click="handleReset">
            重置
          </button>
        </div>
      </div>
    </section>

    <!-- 功能按鈕區域 -->
    <section class="control-section">
      <div class="left-controls">
        <div class="result-info">
          顯示第 {{ startItem }} 到 {{ endItem }} 筆結果 共 {{ totalItems }} 項
        </div>
      </div>
      
      <div class="right-controls">
        <button class="control-btn add-btn" v-if="false" @click="addParameter">
          新增參數
        </button>
      </div>
    </section>

    <!-- 資料表格區域 -->
    <section class="table-section">
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th class="id-column">項次</th>
              <th class="name-column">參數類別</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading 狀態 -->
            <tr v-if="isLoading" class="loading-row">
              <td colspan="2" class="loading-cell">
                <div class="loading-container">
                  <div class="loading-spinner">⟳</div>
                  <div class="loading-text">資料載入中...</div>
                </div>
              </td>
            </tr>
            
            <!-- 正常資料顯示 -->
            <tr v-else v-for="(item, index) in parameterData" :key="item.id" class="table-row cursor-pointer" @click="editParameter(item.url)">
              <td class="id-cell">{{ item.id }}</td>
              <td class="name-cell">{{ item.parameterName }}</td>
            </tr>
            
            <!-- 無資料狀態 -->
            <tr v-if="!isLoading && parameterData.length === 0">
              <td colspan="3" class="no-data">暫無資料</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分頁控制 -->
      <div class="pagination-section">
        <div class="pagination-info">
          <span v-if="isLoading">載入中...</span>
          <span v-else>顯示第 {{ startItem }} 到 {{ endItem }} 筆結果 共 {{ totalItems }} 項</span>
        </div>
        
        <div class="pagination-controls">
          <button 
            class="page-btn" 
            :disabled="currentPage === 1 || isLoading"
            @click="goToPage(currentPage - 1)"
          >
            ‹
          </button>
          
          <template v-for="page in visiblePages" :key="page">
            <button 
              v-if="page !== '...'"
              :class="['page-btn', { active: page === currentPage }]"
              :disabled="isLoading"
              @click="goToPage(page)"
            >
              {{ page }}
            </button>
            <span v-else class="ellipsis">...</span>
          </template>
          
          <button 
            class="page-btn" 
            :disabled="currentPage === totalPages || isLoading"
            @click="goToPage(currentPage + 1)"
          >
            ›
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.parameter-management {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

// 頁面標題
.page-header {
  margin-bottom: 20px;
  
  .page-title {
    font-size: 24px;
    font-weight: 600;
    color: #333;
    margin: 0;
  }
}

// Loading 動畫
.loading-spinner {
  display: inline-block;
  animation: spin 1s linear infinite;
  font-size: 24px;
  color: #6c5ce7;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #666;
}

.loading-text {
  margin-top: 12px;
  font-size: 14px;
  color: #666;
}

.loading-row {
  .loading-cell {
    border: none;
    background: #f8f9fa;
  }
}

// 搜尋區域
.search-section {
  background: white;
  padding: 25px 30px;
  margin-bottom: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  .search-row {
    display: flex;
    gap: 20px;
    align-items: end;
  }

  .search-field {
    position: relative;
    flex: 1;
    max-width: 400px;

    .search-input {
      width: 100%;
      padding: 12px 45px 12px 15px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.3s;
      
      &:focus {
        outline: none;
        border-color: #6c5ce7;
        box-shadow: 0 0 0 2px rgba(108, 92, 231, 0.1);
      }
    }

    .search-btn {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      font-size: 16px;
      color: #666;
      transition: color 0.3s;

      &:hover {
        color: #6c5ce7;
      }
    }
  }

  .action-buttons {
    display: flex;
    gap: 10px;

    .query-btn, .reset-btn {
      padding: 12px 30px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s;
      border: none;
    }

    .query-btn {
      background: #6c5ce7;
      color: white;

      &:hover {
        background: #5b4bcf;
        transform: translateY(-1px);
      }
    }

    .reset-btn {
      background: #f8f9fa;
      color: #666;
      border: 1px solid #ddd;

      &:hover {
        background: #e9ecef;
        border-color: #adb5bd;
      }
    }
  }
}

// 控制區域
.control-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  .left-controls {
    .result-info {
      font-size: 14px;
      color: #666;
    }
  }

  .right-controls {
    .add-btn {
      background: #28a745;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s;

      &:hover {
        background: #218838;
        transform: translateY(-1px);
      }
    }
  }
}

// 表格區域
.table-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;

  .table-container {
    overflow-x: auto;

    .data-table {
      width: 100%;
      border-collapse: collapse;

      thead {
        background: #6c5ce7;
        color: white;

        th {
          padding: 15px 20px;
          text-align: left;
          font-weight: 500;
          font-size: 14px;

          &.id-column {
            width: 100px;
            text-align: center;
          }

          &.name-column {
            text-align: left;
          }

          &.action-column {
            width: 120px;
            text-align: center;
          }
        }
      }

      tbody {
        .table-row {
          border-bottom: 1px solid #f0f0f0;
          transition: background-color 0.2s;
        &.cursor-pointer{
            cursor: pointer;
        }
          &:hover {
            background: #f8f9fa;
          }

          td {
            padding: 15px 20px;
            font-size: 14px;
            color: #333;

            &.id-cell {
              text-align: center;
              font-weight: 500;
              color: #6c5ce7;
            }

            &.name-cell {
              text-align: left;
            }

            &.action-cell {
              text-align: center;
              padding: 10px 20px;
            }
          }
        }

        .no-data {
          text-align: center;
          padding: 40px;
          color: #999;
          font-style: italic;
        }
      }
    }
  }
}

// 操作按鈕樣式
.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;

  .action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
    background: #f8f9fa;
    color: #666;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    &.edit-btn {
      &:hover {
        background: #fff3e0;
        color: #f57c00;
      }
    }

    &.delete-btn {
      &:hover {
        background: #ffebee;
        color: #d32f2f;
      }
    }
  }
}

// 分頁區域
.pagination-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  border-top: 1px solid #f0f0f0;

  .pagination-info {
    font-size: 14px;
    color: #666;
  }

  .pagination-controls {
    display: flex;
    gap: 5px;
    align-items: center;

    .page-btn {
      padding: 8px 12px;
      border: 1px solid #ddd;
      background: white;
      color: #333;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;

      &:hover:not(:disabled) {
        background: #f8f9fa;
        border-color: #6c5ce7;
      }

      &.active {
        background: #6c5ce7;
        color: white;
        border-color: #6c5ce7;
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
    }
  }
}

// 響應式設計
@media (max-width: 768px) {
  .search-row {
    flex-direction: column;
    gap: 15px;

    .search-field {
      max-width: none;
    }
  }

  .control-section {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;

    .left-controls,
    .right-controls {
      text-align: center;
    }
  }

  .pagination-section {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }

  .action-buttons {
    gap: 4px;
    
    .action-btn {
      width: 28px;
      height: 28px;
      font-size: 12px;
    }
  }

  .data-table {
    th, td {
      padding: 10px 15px;
      font-size: 13px;
    }
  }
}
</style>
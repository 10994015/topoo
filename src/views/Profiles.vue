<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// 使用 router 和認證 store
const router = useRouter()
const authStore = useAuthStore()
authStore.getPermissions()
//console.log(authStore.permissions);

const isManager =  computed(() => authStore.permissions.length > 0)
//console.log(isManager.value);

// 響應式資料
const isLoading = ref(false)
const isEditing = ref(false)

// 用戶資料
const userProfile = reactive({
  account: '',
  name: '',
  email: '',
  nickname: '',
  status: 'Open'
})

// 編輯表單 (只有可編輯的欄位)
const editForm = reactive({
  nickname: '',
  status: 'Open'
})

// 表單驗證錯誤
const errors = reactive({})

// 狀態選項
const statusOptions = [
  { value: 'Open', label: '啟用' },
  { value: 'Leave', label: '請假' },
  { value: 'Inconvenient', label: '不便' }
]

// functions
const loadUserProfile = async () => {
  isLoading.value = true
  try {
    // 從 authStore 獲取用戶資料
    const user = authStore.user || await authStore.fetchUser()
    
    //console.log(user);
    
    // 設定用戶資料
    Object.assign(userProfile, {
      account: user.credential || '尚未設定',
      name: user.name || '尚未設定',
      email: user.email || '尚未設定',
      nickname: user.nick_name || '尚未設定',
      status: user.status || '啟用'
    })
    
    // 複製到編輯表單
    Object.assign(editForm, userProfile)
  } catch (error) {
    //console.error('載入用戶資料失敗:', error)
    // 設定預設值
    Object.assign(userProfile, {
      account: 'User001',
      name: '黃曉明',
      email: 'user@example.com',
      nickname: '',
      status: 'Open'
    })
    Object.assign(editForm, {
      nickname: userProfile.nickname,
      status: userProfile.status
    })
  } finally {
    isLoading.value = false
  }
}

const startEdit = () => {
  isEditing.value = true
  // 重新複製當前資料到編輯表單 (只複製可編輯的欄位)
  Object.assign(editForm, {
    nickname: userProfile.nickname,
    status: userProfile.status
  })
  // 清除錯誤
  Object.assign(errors, {})
}

const cancelEdit = () => {
  isEditing.value = false
  Object.assign(errors, {})
}

const validateForm = () => {
  Object.keys(errors).forEach(key => delete errors[key])
  
  if (!editForm.nickname || editForm.nickname.trim() === '') {
    errors.nickname = '請輸入暱稱'
    
  }else if (editForm.nickname && editForm.nickname.length > 20) {
    errors.nickname = '暱稱不能超過20個字元'
    
  }

  return Object.keys(errors).length === 0
}

const saveProfile = async () => {
  if (!validateForm()) return
  
  isLoading.value = true
  try {
    // 這裡調用 API 更新用戶資料
    //console.log('更新用戶資料:', editForm)
    const params= {
      nickname: editForm.nickname,
    }
    if(isManager.value){
      params.status = editForm.status
    }
    // 模擬 API 調用
    const response = await authStore.updateUser(params)
    //console.log(response);
    if(response.success){
      // 更新本地資料 (只更新可編輯的欄位)
      userProfile.nickname = editForm.nickname
      userProfile.status = editForm.status
      
      // 關閉編輯模式
      isEditing.value = false
      
      alert('個人資料更新成功！')
    }else{
      alert('更新失敗，權限不足或資料錯誤')
    }
   
  } catch (error) {
    //console.error('更新失敗:', error)
    alert('更新失敗，請重試')
  } finally {
    isLoading.value = false
  }
}

const goBack = () => {
  router.back()
}



// 生命週期
onMounted(() => {
  loadUserProfile();
})
</script>

<template>
  <div class="profile-page">
    <!-- 操作按鈕區域 -->
    <div class="action-buttons">
      <template v-if="!isEditing">
        <button @click="startEdit" class="edit-btn">
          編輯帳號
        </button>
        <button @click="goBack" class="back-btn">
          返回
        </button>
      </template>
      
      <template v-else>
        <button 
          @click="saveProfile" 
          class="save-btn"
          :disabled="isLoading"
        >
          {{ isLoading ? '儲存中...' : '儲存帳號' }}
        </button>
        <button @click="cancelEdit" class="cancel-btn">
          取消
        </button>
      </template>
    </div>

    <!-- 載入指示器 -->
    <div v-if="isLoading && !isEditing" class="loading">
      <div class="loading-spinner"></div>
      <span>載入中...</span>
    </div>

    <!-- 個人資料表格 -->
    <div v-else class="profile-table">
      <table class="data-table">
        <tbody>
          <tr class="table-row">
            <td class="label-cell">帳號</td>
            <td class="value-cell readonly">
              {{ userProfile.account }}
            </td>
          </tr>
          
          <tr class="table-row">
            <td class="label-cell">姓名</td>
            <td class="value-cell readonly">
              {{ userProfile.name }}
            </td>
          </tr>
          
          <tr class="table-row">
            <td class="label-cell">暱稱</td>
            <td class="value-cell">
              <template v-if="!isEditing">
                {{ userProfile.nickname || '未設定' }}
              </template>
              <template v-else>
                <input 
                  type="text" 
                  v-model="editForm.nickname"
                  class="form-input"
                  :class="{ error: errors.nickname }"
                  placeholder="請輸入暱稱"
                  maxlength="20"
                />
                <div v-if="errors.nickname" class="error-message">
                  {{ errors.nickname }}
                </div>
              </template>
            </td>
          </tr>
          
          <tr class="table-row">
            <td class="label-cell">帳號狀態</td>
            <td class="value-cell">
              <template v-if="!isEditing">
                <span class="status-badge" :class="userProfile.status">
                  {{ statusOptions.find(option => option.value === userProfile.status)?.label ||  userProfile.status }}
                </span>
              </template>
              <template v-else>
                  <template v-if="isManager">
                    <select v-model="editForm.status" class="form-select" >
                      <option 
                        v-for="option in statusOptions" 
                        :key="option.value"
                        :value="option.value"
                      >
                        {{ option.label }}
                      </option>
                    </select>
                  </template>
                  <template v-else>
                    <span class="status-badge" :class="userProfile.status">
                        {{ statusOptions.find(option => option.value === userProfile.status)?.label ||  userProfile.status }}
                    </span>
                  </template>
              </template>
            </td>
          </tr>
          
          <tr class="table-row">
            <td class="label-cell">Email 信箱</td>
            <td class="value-cell readonly">
              {{ userProfile.email }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.profile-page {
  background-color: #f5f5f5;
  min-height: 100vh;
  padding: 0;
}

// 頁面標題區域
.page-header {
  background: white;
  padding: 20px 30px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  .header-left {
    .page-title {
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 8px 0;
      color: #333;
    }

    .breadcrumb {
      font-size: 14px;
      color: #666;

      .separator {
        margin: 0 8px;
        color: #999;
      }
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 15px;

    .user-info {
      display: flex;
      align-items: center;
      cursor: pointer;
      color: #6c5ce7;
      font-weight: 500;

      .username {
        margin-right: 8px;
      }

      .dropdown-arrow {
        font-size: 12px;
      }
    }

    .icon-btn {
      width: 32px;
      height: 32px;
      border: 1px solid #ddd;
      background: white;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s;

      &:hover {
        border-color: #6c5ce7;
        color: #6c5ce7;
      }
    }
  }
}

// 操作按鈕區域
.action-buttons {
  background: white;
  padding: 20px 30px;
  display: flex;
  gap: 15px;
  border-bottom: 1px solid #e0e0e0;

  .edit-btn,
  .save-btn {
    background: #6c5ce7;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;

    &:hover:not(:disabled) {
      background: #5b4bcf;
    }

    &:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }
  }

  .back-btn,
  .cancel-btn {
    background: white;
    color: #666;
    border: 1px solid #ddd;
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      border-color: #6c5ce7;
      color: #6c5ce7;
    }
  }
}

// 載入指示器
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  padding: 60px;
  background: white;
  margin: 20px 30px;
  border-radius: 8px;

  .loading-spinner {
    width: 24px;
    height: 24px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #6c5ce7;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// 個人資料表格
.profile-table {
  background: white;
  margin: 20px 30px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;

  .data-table {
    width: 100%;
    border-collapse: collapse;

    .table-row {
      border-bottom: 1px solid #f0f0f0;

      &:last-child {
        border-bottom: none;
      }

      .label-cell {
        background: #fafbfc;
        width: 200px;
        padding: 20px 25px;
        font-weight: 500;
        color: #333;
        border-right: 1px solid #f0f0f0;
        vertical-align: top;
      }

      .value-cell {
        padding: 20px 25px;
        color: #666;
        vertical-align: top;
        position: relative;

        .form-input {
          width: 100%;
          max-width: 400px;
          padding: 10px 15px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          transition: all 0.3s;

          &:focus {
            outline: none;
            border-color: #6c5ce7;
            box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
          }

          &.error {
            border-color: #dc3545;
            box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
          }
        }

        .form-select {
          padding: 10px 15px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
          background: white;
          cursor: pointer;

          &:focus {
            outline: none;
            border-color: #6c5ce7;
            box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
          }
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;

          &.Open {
            background: #d4edda;
            color: #155724;
          }

          &.Inconvenient {
            background: #f8d7da;
            color: #721c24;
          }
          
          &.Leave {
            background: #fff3cd;
            color: #856404;
          }
        }

        .readonly-note {
          font-size: 12px;
          color: #999;
          margin-left: 10px;
        }
        
        &.readonly {
          background: #fafbfc;
          color: #666;
        }

        .error-message {
          color: #dc3545;
          font-size: 12px;
          margin-top: 5px;
        }
      }
    }
  }
}

// 響應式設計
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;

    .header-right {
      align-self: flex-end;
    }
  }

  .action-buttons {
    flex-wrap: wrap;
  }

  .profile-table {
    margin: 15px 20px;

    .data-table {
      .table-row {
        .label-cell {
          width: 120px;
          padding: 15px 20px;
          font-size: 14px;
        }

        .value-cell {
          padding: 15px 20px;

          .form-input {
            max-width: none;
          }
        }
      }
    }
  }
}

// 極小螢幕
@media (max-width: 480px) {
  .profile-table {
    margin: 15px;

    .data-table {
      .table-row {
        display: block;
        border-bottom: 2px solid #f0f0f0;

        .label-cell,
        .value-cell {
          display: block;
          width: 100%;
          border-right: none;
          border-bottom: 1px solid #f0f0f0;
        }

        .label-cell {
          background: #f8f9fa;
          padding: 12px 20px 8px;
          font-size: 12px;
          font-weight: 600;
        }

        .value-cell {
          padding: 8px 20px 15px;
        }
      }
    }
  }
}
</style>
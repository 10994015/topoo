<script setup>
import { ref, onMounted, onUnmounted, computed} from 'vue'
import { useRouter, useRoute  } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// 響應式資料
const isUserMenuOpen = ref(false)

// 使用 router 和 store
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const pageTitle = computed(() => {
  return route.meta?.title || 'TOPOO'
})

// 麵包屑計算屬性
const breadcrumbItems = computed(() => {
  // 如果路由 meta 中有自定義的 breadcrumbs，直接使用
  if (route.meta?.breadcrumbs) {
    return route.meta.breadcrumbs
  }
  
  // 基於路由層級自動生成麵包屑
  const items = [{ text: '首頁', to: '/' }]
  
  // 過濾掉沒有 title 的路由記錄
  const matchedRoutes = route.matched.filter(record => record.meta?.title)
  
  matchedRoutes.forEach((record, index) => {
    const isLast = index === matchedRoutes.length - 1
    
    items.push({
      text: record.meta.title,
      to: isLast ? null : record.path // 最後一項不設連結
    })
  })
  
  return items
})

// 當前使用者資料
const currentUser = ref({
  name: 'User001',
  role: '系統管理員',
  email: 'user001@company.com',
  avatar: null
})

// 使用者頭像縮寫
const userInitials = computed(() => {
  return currentUser.value.name.charAt(0).toUpperCase()
})

// 方法
const toggleUserMenu = (event) => {
  event.stopPropagation()
  isUserMenuOpen.value = !isUserMenuOpen.value
}

const closeUserMenu = (event) => {
  if (!event.target.closest('.user-dropdown')) {
    isUserMenuOpen.value = false
  }
}

const preferences = () => {
  console.log('偏好設定')
  isUserMenuOpen.value = false
  router.push('/settings')
}

const logout = async () => {
  console.log('登出')
  isUserMenuOpen.value = false
  
  try {
    const confirmed = confirm('確定要登出嗎？')
    if (!confirmed) return
    
    await authStore.logout()
    router.push('/login')
  } catch (error) {
    console.error('登出失敗:', error)
    alert('登出失敗，請重試')
  }
}

// 生命週期
onMounted( () => {
  document.addEventListener('click', closeUserMenu)
  const user =  authStore.user
  console.log(user);

  if(user){
      currentUser.value = {
        name: user.name || 'User001',
        role: user.nick_name || '系統管理員',
        email: user.email || 'user001@company.com',
    }
  }
})

onUnmounted(() => {
  document.removeEventListener('click', closeUserMenu)
})
</script>

<template>
  <header class="top-header">
    <div class="page-info">
      <h2 class="page-title">{{ pageTitle }}</h2>
      <nav class="breadcrumb">
        <template v-for="(item, index) in breadcrumbItems" :key="index">
          <router-link 
            v-if="item.to" 
            :to="item.to" 
            class="breadcrumb-link"
          >
            {{ item.text }}
          </router-link>
          <span v-else class="breadcrumb-current">{{ item.text }}</span>
          
          <span 
            v-if="index < breadcrumbItems.length - 1" 
            class="separator"
          >
            >
          </span>
        </template>
      </nav>
    </div>
    
    <div class="user-section">
      <!-- 用戶下拉選單 -->
      <div class="user-dropdown" @click="toggleUserMenu">
        <!-- 用戶頭像 -->
        <div class="user-avatar">
          <img 
            v-if="currentUser.avatar" 
            :src="currentUser.avatar" 
            :alt="currentUser.name"
            class="avatar-image"
          />
          <span v-else class="avatar-initials">{{ userInitials }}</span>
        </div>
        
        <span class="username">{{ currentUser.name }}</span>
        <span class="dropdown-arrow" :class="{ open: isUserMenuOpen }">▼</span>
        
        <!-- 下拉選單 -->
        <Transition name="dropdown">
          <div v-if="isUserMenuOpen" class="dropdown-menu">
            <!-- 用戶資訊 -->
            <div class="user-info">
              <div class="user-name">{{ currentUser.name }}</div>
              <div class="user-role">{{ currentUser.role }}</div>
              <div class="user-email">{{ currentUser.email }}</div>
            </div>
            
            <hr class="menu-divider">
            
            <!-- 選單項目 -->
            <router-link to="/profiles" class="menu-item">
              <span class="menu-icon">👤</span>
              <span>個人資料</span>
            </router-link>
            
            <router-link to="/change-password" class="menu-item" >
              <span class="menu-icon">🔑</span>
              <span>修改密碼</span>
            </router-link>
            
            <hr class="menu-divider">
            
            <!-- 登出按鈕 -->
            <a href="#" class="menu-item logout" @click.prevent="logout">
              <span class="menu-icon">🚪</span>
              <span>登出</span>
            </a>
          </div>
        </Transition>
      </div>
    </div>
  </header>
</template>

<style scoped lang="scss">
.top-header {
  background: white;
  padding: 20px 30px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;

  .page-info {
    .page-title {
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 8px 0;
      color: #333;
    }

    .breadcrumb {
      font-size: 14px;
      color: #666;
      display: flex;
      align-items: center;

      .breadcrumb-link {
        color: #666;
        text-decoration: none;
        transition: color 0.3s;

        &:hover {
          color: #111;
          text-decoration: underline;
        }
      }

      .breadcrumb-current {
        color: #333;
        font-weight: 500;
      }

      .separator {
        margin: 0 8px;
        color: #999;
        font-size: 12px;
      }
    }
  }

  .user-section {
    display: flex;
    align-items: center;
    gap: 20px;

    // 用戶下拉選單
    .user-dropdown {
      position: relative;
      display: flex;
      align-items: center;
      cursor: pointer;
      padding: 8px 12px;
      border-radius: 8px;
      transition: all 0.3s;

      &:hover {
        background-color: #f5f5f5;
      }

      .user-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        margin-right: 10px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #6c5ce7;
        color: white;

        .avatar-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-initials {
          font-weight: bold;
          font-size: 14px;
        }
      }

      .username {
        color: #6c5ce7;
        font-weight: 500;
        margin-right: 8px;
      }

      .dropdown-arrow {
        font-size: 12px;
        color: #666;
        transition: transform 0.3s;

        &.open {
          transform: rotate(180deg);
        }
      }

      // 下拉選單
      .dropdown-menu {
        position: absolute;
        top: 100%;
        right: 0;
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        min-width: 220px;
        z-index: 1000;
        margin-top: 8px;

        .user-info {
          padding: 15px;
          border-bottom: 1px solid #f0f0f0;

          .user-name {
            font-weight: 600;
            color: #333;
            margin-bottom: 4px;
            font-size: 16px;
          }

          .user-role {
            font-size: 12px;
            color: #6c5ce7;
            font-weight: 500;
            margin-bottom: 4px;
          }

          .user-email {
            font-size: 12px;
            color: #999;
          }
        }

        .menu-divider {
          margin: 8px 0;
          border: none;
          border-top: 1px solid #f0f0f0;
        }

        .menu-item {
          display: flex;
          align-items: center;
          padding: 12px 15px;
          color: #333;
          text-decoration: none;
          transition: all 0.3s;
          font-size: 14px;

          &:hover {
            background-color: #f8f9fa;
            color: #6c5ce7;
          }

          &.logout {
            color: #dc3545;

            &:hover {
              background-color: #fff5f5;
              color: #c82333;
            }
          }

          .menu-icon {
            margin-right: 10px;
            font-size: 16px;
            width: 20px;
            text-align: center;
          }
        }
      }
    }
  }
}

// 通知徽章動畫
@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

// 下拉選單動畫
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.3s ease;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

// 響應式設計
@media (max-width: 768px) {
  .top-header {
    padding: 15px 20px;

    .page-info {
      .page-title {
        font-size: 20px;
      }

      .breadcrumb {
        font-size: 12px;
        
        .separator {
          margin: 0 6px;
        }
      }
    }

    .user-section {
      gap: 15px;

      .username {
        display: none;
      }

      .dropdown-menu {
        min-width: 200px;
        right: -10px;
      }
    }
  }
}
// 深色模式支援
// @media (prefers-color-scheme: dark) {
//   .top-header {
//     background: #1a1a1a;
//     border-bottom-color: #333;
//     color: white;

//     .page-info {
//       .page-title {
//         color: white;
//       }

//       .breadcrumb {
//         color: #ccc;

//         .breadcrumb-link {
//           color: #ccc;

//           &:hover {
//             color: #a78bfa;
//           }
//         }

//         .breadcrumb-current {
//           color: white;
//         }

//         .separator {
//           color: #666;
//         }
//       }
//     }

//     .user-section {
//       .user-dropdown {
//         &:hover {
//           background-color: #333;
//         }

//         .dropdown-menu {
//           background: #2a2a2a;
//           border-color: #444;

//           .user-info {
//             border-bottom-color: #444;

//             .user-name {
//               color: white;
//             }

//             .user-email {
//               color: #999;
//             }
//           }

//           .menu-divider {
//             border-top-color: #444;
//           }

//           .menu-item {
//             color: #ccc;

//             &:hover {
//               background-color: #333;
//               color: #6c5ce7;
//             }
//           }
//         }
//       }
//     }
//   }
// }

</style>
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const authStore = useAuthStore()

// 展開狀態管理
const expandedMenus = ref(['settings']) // 預設展開系統管理

// 側邊欄收合狀態（手機版用）
const isSidebarOpen = ref(false)
const isMobile = ref(false)

// 檢測螢幕尺寸
const checkScreenSize = () => {
  isMobile.value = window.innerWidth <= 768
  // 桌面版自動展開側邊欄
  if (!isMobile.value) {
    isSidebarOpen.value = true
  }
}

// 切換側邊欄狀態
const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

// 關閉側邊欄（點擊連結後）
const closeSidebar = () => {
  if (isMobile.value) {
    isSidebarOpen.value = false
  }
}

// 點擊外部關閉側邊欄
const handleOutsideClick = (event) => {
  if (!isMobile.value) return
  
  const sidebar = document.querySelector('.sidebar')
  const toggleBtn = document.querySelector('.sidebar-toggle')
  
  if (sidebar && !sidebar.contains(event.target) && 
      toggleBtn && !toggleBtn.contains(event.target) && 
      isSidebarOpen.value) {
    isSidebarOpen.value = false
  }
}

onMounted(() => {
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
  document.addEventListener('click', handleOutsideClick)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize)
  document.removeEventListener('click', handleOutsideClick)
})

const menuItems = [
  {
    name: 'dashboard',
    label: '首頁',
    icon: '📋',
    path: '/'
  },
  {
    name: 'repair',
    label: '線上報修',
    icon: '🔔',
    path: '/repair-system',
  },
  {
    name: 'settings',
    label: '系統管理',
    icon: '⚙️',
    path: '/settings',
    hasSubmenu: true,
    submenu: [
      {
        name: 'account-management',
        label: '帳號管理',
        path: '/settings/account-management',
        permission: '帳號管理',
        permissionMode: 'Readonly'
      },
      {
        name: 'permission-management',
        label: '權限管理',
        path: '/settings/permission-management',
        permission: '權限角色管理',
        permissionMode: 'Readonly'
      },
      {
        name: 'workflow-management',
        label: '流程管理',
        path: '/settings/workflow-management',
        permission: '流程管理',
        permissionMode: 'Readonly'
      },
      {
        name: 'todo-management',
        label: '待辦管理',
        path: '/settings/todo-management',
        permission: '待辦管理',
        permissionMode: 'Readonly'
      },
      {
        name: 'department-management',
        label: '單位管理',
        path: '/settings/department-management',
        permission: '單位管理',
        permissionMode: 'Readonly'
      },
      {
        name: 'report-management',
        label: '報表管理',
        path: '/settings/report-management',
        permission: '報表管理',
        permissionMode: 'Readonly'
      },
      {
        name: 'parameter-management',
        label: '參數管理',
        path: '/settings/parameter-management',
      }
    ]
  }
]

// 過濾有權限的選單項目
const filteredMenuItems = computed(() => {
  return menuItems.map(item => {
    if (item.hasSubmenu && item.submenu) {
      const filteredSubmenu = item.submenu.filter(subItem => {
        if (!subItem.permission) return true
        const requiredMode = subItem.permissionMode || 'Readonly'
        return authStore.hasPermission(subItem.permission, requiredMode)
      })
      
      if (filteredSubmenu.length > 0) {
        return {
          ...item,
          submenu: filteredSubmenu
        }
      }
      return null
    }
    
    if (item.permission) {
      const requiredMode = item.permissionMode || 'Readonly'
      return authStore.hasPermission(item.permission, requiredMode) ? item : null
    }
    
    return item
  }).filter(Boolean)
})

const isActiveRoute = (path) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}

const isMenuExpanded = (menuName) => {
  return expandedMenus.value.includes(menuName)
}

const toggleMenu = (menuName) => {
  const index = expandedMenus.value.indexOf(menuName)
  if (index > -1) {
    expandedMenus.value.splice(index, 1)
  } else {
    expandedMenus.value.push(menuName)
  }
}

const hasActiveSubmenu = (item) => {
  if (!item.submenu) return false
  return item.submenu.some(subItem => isActiveRoute(subItem.path))
}

// 處理選單項目點擊
const handleMenuClick = (item) => {
  if (item.hasSubmenu) {
    toggleMenu(item.name)
  } else {
    closeSidebar()
  }
}

// 處理子選單項目點擊
const handleSubmenuClick = () => {
  closeSidebar()
}
</script>

<template>
  <div>
    <!-- 手機版漢堡選單按鈕 -->
    <button 
      v-if="isMobile"
      @click="toggleSidebar"
      class="sidebar-toggle"
      :class="{ active: isSidebarOpen }"
      aria-label="切換選單"
    >
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
      <span class="hamburger-line"></span>
    </button>

    <!-- 手機版遮罩層 -->
    <div 
      v-if="isMobile && isSidebarOpen"
      class="sidebar-overlay"
      @click="closeSidebar"
    ></div>

    <!-- 側邊欄 -->
    <aside 
      class="sidebar"
      :class="{ 
        'mobile-open': isMobile && isSidebarOpen,
        'mobile-closed': isMobile && !isSidebarOpen 
      }"
    >
      <div class="logo-section">
        <h1 class="logo">TOPOO</h1>
        <p class="system-name">線上報修系統</p>
        
        <!-- 手機版關閉按鈕 -->
        <button 
          v-if="isMobile"
          @click="closeSidebar"
          class="close-btn"
          aria-label="關閉選單"
        >
          ✕
        </button>
      </div>
      
      <nav class="nav-menu">
        <template v-for="item in filteredMenuItems" :key="item.name">
          <div class="nav-item-wrapper">
            <component
              :is="item.hasSubmenu ? 'button' : 'router-link'"
              :to="!item.hasSubmenu ? item.path : undefined"
              @click="handleMenuClick(item)"
              class="nav-item"
              :class="{ 
                active: !item.hasSubmenu && isActiveRoute(item.path),
                'has-submenu': item.hasSubmenu,
                'parent-active': item.hasSubmenu && (hasActiveSubmenu(item) || isMenuExpanded(item.name))
              }"
            >
              <span class="nav-icon">{{ item.icon }}</span>
              <span class="nav-label">{{ item.label }}</span>
              <span v-if="item.hasSubmenu" class="expand-icon" :class="{ expanded: isMenuExpanded(item.name) }">
                ▼
              </span>
            </component>
            
            <div 
              v-if="item.hasSubmenu" 
              class="submenu"
              :class="{ expanded: isMenuExpanded(item.name) }"
            >
              <router-link
                v-for="subItem in item.submenu"
                :key="subItem.name"
                :to="subItem.path"
                @click="handleSubmenuClick"
                class="submenu-item"
                :class="{ active: isActiveRoute(subItem.path) }"
              >
                <span class="submenu-label">{{ subItem.label }}</span>
              </router-link>
            </div>
          </div>
        </template>
      </nav>
    </aside>
  </div>
</template>

<style scoped lang="scss">
// 漢堡選單按鈕
.sidebar-toggle {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 1002;
  width: 44px;
  height: 44px;
  background: #6c5ce7;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;

  &:hover {
    background: #5b4bcf;
    transform: scale(1.05);
  }

  &.active {
    background: #5b4bcf;
    
    .hamburger-line {
      &:nth-child(1) {
        transform: rotate(45deg) translate(6px, 6px);
      }
      &:nth-child(2) {
        opacity: 0;
      }
      &:nth-child(3) {
        transform: rotate(-45deg) translate(6px, -6px);
      }
    }
  }

  .hamburger-line {
    width: 22px;
    height: 2px;
    background: white;
    border-radius: 1px;
    transition: all 0.3s ease;
  }
}

// 遮罩層
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.sidebar {
  width: 240px;
  background: linear-gradient(180deg, #6c5ce7 0%, #5b4bcf 100%);
  color: white;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
  height: auto;
  transition: transform 0.3s ease;
  height: 100%;
  .logo-section {
    padding: 30px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    position: relative;

    .logo {
      font-size: 28px;
      font-weight: bold;
      margin: 0 0 8px 0;
      letter-spacing: 1px;
    }

    .system-name {
      font-size: 14px;
      opacity: 0.9;
      margin: 0;
      font-weight: 300;
    }

    .close-btn {
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      transition: all 0.3s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: scale(1.1);
      }
    }
  }

  .nav-menu {
    padding: 20px 0;
    flex: 1;

    .nav-item-wrapper {
      position: relative;
    }

    .nav-item {
      display: flex;
      align-items: center;
      padding: 15px 25px;
      color: white;
      text-decoration: none;
      transition: all 0.3s ease;
      border-right: 3px solid transparent;
      position: relative;
      width: 100%;
      background: none;
      border: none;
      cursor: pointer;
      font-family: inherit;
      text-align: left;

      &:hover {
        background-color: rgba(255, 255, 255, 0.1);
        text-decoration: none;
        color: white;
        transform: translateX(5px);
      }

      &.active,
      &.parent-active {
        background-color: rgba(255, 255, 255, 0.15);
        border-right-color: white;
        font-weight: 500;
        
        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: white;
        }
      }

      &.has-submenu {
        justify-content: space-between;
        
        .expand-icon {
          font-size: 12px;
          transition: transform 0.3s ease;
          transform: rotate(-90deg);
          
          &.expanded {
            transform: rotate(0deg);
          }
        }
      }

      .nav-icon {
        margin-right: 12px;
        font-size: 16px;
        width: 20px;
        text-align: center;
        transition: transform 0.3s ease;
      }

      .nav-label {
        font-size: 14px;
        font-weight: inherit;
        flex: 1;
      }

      &:hover .nav-icon {
        transform: scale(1.1);
      }

      &.active .nav-icon,
      &.parent-active .nav-icon {
        animation: bounce 0.6s ease;
      }
    }

    .submenu {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease, opacity 0.3s ease;
      opacity: 0;
      background: rgba(0, 0, 0, 0.1);

      &.expanded {
        max-height: 500px;
        opacity: 1;
      }

      .submenu-item {
        display: block;
        padding: 12px 25px 12px 55px;
        color: rgba(255, 255, 255, 0.8);
        text-decoration: none;
        font-size: 13px;
        transition: all 0.3s ease;
        border-left: 3px solid transparent;
        position: relative;

        &:hover {
          background-color: rgba(255, 255, 255, 0.05);
          color: white;
          text-decoration: none;
          padding-left: 60px;
        }

        &.active {
          background-color: rgba(255, 255, 255, 0.1);
          color: white;
          font-weight: 500;
          border-left-color: rgba(255, 255, 255, 0.6);
          
          &::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 2px;
            background: white;
          }
        }

        .submenu-label {
          display: block;
        }
      }
    }
  }
}

// 手機版樣式
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 280px;
    z-index: 1000;
    height: 100vh;
    overflow-y: auto;
    transform: translateX(-100%);

    &.mobile-open {
      transform: translateX(0);
      animation: slideIn 0.3s ease;
    }

    &.mobile-closed {
      transform: translateX(-100%);
    }

    .logo-section {
      padding: 70px 20px 30px 20px; // 增加頂部間距避免與按鈕重疊
      text-align: center;
    }
    
    .nav-menu {
      padding: 10px;
      
      .nav-item-wrapper {
        margin-bottom: 5px;
      }
      
      .nav-item {
        padding: 12px 15px;
        border-radius: 6px;
        border-right: none;
        
        &.active,
        &.parent-active {
          border-right: none;
          background-color: rgba(255, 255, 255, 0.2);
          
          &::before {
            display: none;
          }
        }

        &:hover {
          transform: none;
          border-radius: 6px;
        }

        .nav-icon {
          margin-right: 10px;
          font-size: 14px;
        }

        .nav-label {
          font-size: 13px;
        }
      }

      .submenu {
        margin-top: 5px;
        border-radius: 6px;
        background: rgba(0, 0, 0, 0.15);

        .submenu-item {
          padding: 10px 15px 10px 35px;
          border-radius: 4px;
          margin: 2px;
          border-left: none;

          &:hover {
            padding-left: 35px;
            background-color: rgba(255, 255, 255, 0.1);
          }

          &.active {
            border-left: none;
            background-color: rgba(255, 255, 255, 0.15);
            
            &::before {
              display: none;
            }
          }
        }
      }
    }
  }
}

@keyframes slideIn {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}

// 圖示彈跳動畫
@keyframes bounce {
  0%, 20%, 60%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-3px);
  }
  80% {
    transform: translateY(-1px);
  }
}

// 平板設計
@media (min-width: 769px) and (max-width: 1024px) {
  .sidebar {
    width: 200px;
    
    .logo-section {
      padding: 25px 15px;
      
      .logo {
        font-size: 24px;
      }
      
      .system-name {
        font-size: 12px;
      }
    }
    
    .nav-menu {
      .nav-item {
        padding: 12px 20px;
        
        .nav-icon {
          margin-right: 10px;
          font-size: 14px;
        }
        
        .nav-label {
          font-size: 13px;
        }
      }

      .submenu {
        .submenu-item {
          padding: 10px 20px 10px 45px;
          font-size: 12px;

          &:hover {
            padding-left: 50px;
          }
        }
      }
    }
  }
}

// 大螢幕優化
@media (min-width: 1200px) {
  .sidebar {
    width: 260px;
    
    .logo-section {
      padding: 35px 25px;
      
      .logo {
        font-size: 32px;
      }
      
      .system-name {
        font-size: 15px;
      }
    }
    
    .nav-menu {
      .nav-item {
        padding: 18px 30px;
        
        .nav-icon {
          margin-right: 15px;
          font-size: 18px;
        }
        
        .nav-label {
          font-size: 15px;
        }
      }

      .submenu {
        .submenu-item {
          padding: 14px 30px 14px 65px;
          font-size: 14px;

          &:hover {
            padding-left: 70px;
          }
        }
      }
    }
  }
}

// 減少動畫模式
@media (prefers-reduced-motion: reduce) {
  .sidebar {
    transition: none;
    
    .nav-item {
      transition: none;
      
      &:hover {
        transform: none;
      }
      
      .nav-icon {
        transition: none;
        animation: none;
      }
      
      &:hover .nav-icon {
        transform: none;
      }
      
      &.active .nav-icon,
      &.parent-active .nav-icon {
        animation: none;
      }

      .expand-icon {
        transition: none;
      }
    }

    .submenu {
      transition: none;
      
      .submenu-item {
        transition: none;
      }
    }
  }

  .sidebar-toggle {
    transition: none;
    
    &:hover {
      transform: none;
    }
    
    .hamburger-line {
      transition: none;
    }
  }

  .sidebar-overlay {
    animation: none;
  }
}
</style>
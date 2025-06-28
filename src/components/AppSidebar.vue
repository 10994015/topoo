<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const authStore = useAuthStore()

// 展開狀態管理
const expandedMenus = ref(['settings']) // 預設展開系統管理

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
    permission: '報修管理',
    permissionMode: 'Readonly' // 只需要讀取權限
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
        permissionMode: 'Readonly' // 只需要讀取權限就能看到選單
      },
      {
        name: 'permission-management',
        label: '權限管理',
        path: '/settings/permission-management',
        permission: '權限角色管理',
        permissionMode: 'Readonly' // 只需要讀取權限就能看到選單
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
      // 過濾子選單
      const filteredSubmenu = item.submenu.filter(subItem => {
        // 如果沒有設定權限要求，就顯示
        if (!subItem.permission) return true
        
        // 檢查權限，使用指定的權限模式，預設為 Readonly
        const requiredMode = subItem.permissionMode || 'Readonly'
        return authStore.hasPermission(subItem.permission, requiredMode)
      })
      
      // 如果有可顯示的子選單，才顯示父選單
      if (filteredSubmenu.length > 0) {
        return {
          ...item,
          submenu: filteredSubmenu
        }
      }
      return null
    }
    
    // 一般選單項目，檢查權限
    if (item.permission) {
      const requiredMode = item.permissionMode || 'Readonly'
      return authStore.hasPermission(item.permission, requiredMode) ? item : null
    }
    
    return item
  }).filter(Boolean) // 移除 null 項目
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

// 檢查父選單是否有子項目被激活
const hasActiveSubmenu = (item) => {
  if (!item.submenu) return false
  return item.submenu.some(subItem => isActiveRoute(subItem.path))
}
</script>

<template>
  <aside class="sidebar">
    <div class="logo-section">
      <h1 class="logo">TOPOO</h1>
      <p class="system-name">線上報修系統</p>
    </div>
    
    <nav class="nav-menu">
      <template v-for="item in filteredMenuItems" :key="item.name">
        <!-- 主選單項目 -->
        <div class="nav-item-wrapper">
          <component
            :is="item.hasSubmenu ? 'button' : 'router-link'"
            :to="!item.hasSubmenu ? item.path : undefined"
            @click="item.hasSubmenu ? toggleMenu(item.name) : undefined"
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
          
          <!-- 子選單 -->
          <div 
            v-if="item.hasSubmenu" 
            class="submenu"
            :class="{ expanded: isMenuExpanded(item.name) }"
          >
            <router-link
              v-for="subItem in item.submenu"
              :key="subItem.name"
              :to="subItem.path"
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
</template>

<style scoped lang="scss">
.sidebar {
  width: 240px;
  background: linear-gradient(180deg, #6c5ce7 0%, #5b4bcf 100%);
  color: white;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
  height: auto;

  .logo-section {
    padding: 30px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

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

    // 子選單樣式
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

// 響應式設計
@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    height: auto;
    position: relative;
    
    .logo-section {
      text-align: center;
      padding: 20px;
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

// 深色模式支援
@media (prefers-color-scheme: dark) {
  .sidebar {
    background: linear-gradient(180deg, #4c1d95 0%, #3b1a6b 100%);
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.3);
  }
}

// 高對比模式支援
@media (prefers-contrast: high) {
  .sidebar {
    .nav-item {
      &.active,
      &.parent-active {
        background-color: rgba(255, 255, 255, 0.3);
        border-right-color: #fff;
      }
      
      &:hover {
        background-color: rgba(255, 255, 255, 0.2);
      }
    }

    .submenu {
      .submenu-item {
        &.active {
          background-color: rgba(255, 255, 255, 0.2);
        }
        
        &:hover {
          background-color: rgba(255, 255, 255, 0.15);
        }
      }
    }
  }
}

// 減少動畫模式
@media (prefers-reduced-motion: reduce) {
  .sidebar {
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
}
</style>
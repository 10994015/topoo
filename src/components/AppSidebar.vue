<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
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
    path: '/repair-system'
  },
  {
    name: 'settings',
    label: '系統管理',
    icon: '⚙️',
    path: '/settings'
  }
]

const isActiveRoute = (path) => {
  if (path === '/') {
    // 首頁只有完全匹配才算活躍
    return route.path === '/'
  }
  // 其他路由使用 startsWith 匹配
  return route.path.startsWith(path)
}
</script>
<template>
    <aside class="sidebar">
        <div class="logo-section">
        <h1 class="logo">TOPOO</h1>
        <p class="system-name">線上報修系統</p>
        </div>
        
        <nav class="nav-menu">
         <router-link 
            v-for="item in menuItems" 
            :key="item.name"
            :to="item.path"
            class="nav-item"
            :class="{ active: isActiveRoute(item.path) }"
          >
            <span class="nav-icon">{{ item.icon }}</span>
            <span class="nav-label">{{ item.label }}</span>
          </router-link>
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

    .nav-item {
      display: flex;
      align-items: center;
      padding: 15px 25px;
      color: white;
      text-decoration: none;
      transition: all 0.3s ease;
      border-right: 3px solid transparent;
      position: relative;

      &:hover {
        background-color: rgba(255, 255, 255, 0.1);
        text-decoration: none;
        color: white;
        transform: translateX(5px);
      }

      &.active {
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
      }

      // 添加 hover 時圖示動畫
      &:hover .nav-icon {
        transform: scale(1.1);
      }

      // 激活狀態的圖示動畫
      &.active .nav-icon {
        animation: bounce 0.6s ease;
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
      display: flex;
      padding: 10px;
      overflow-x: auto;
      
      .nav-item {
        flex-shrink: 0;
        min-width: 120px;
        justify-content: center;
        border-right: none;
        border-bottom: 3px solid transparent;
        flex-direction: column;
        padding: 15px 10px;

        &.active {
          border-right: none;
          border-bottom-color: white;
          
          &::before {
            display: none;
          }
        }

        &:hover {
          transform: translateY(-2px);
        }

        .nav-icon {
          margin-right: 0;
          margin-bottom: 5px;
          font-size: 18px;
        }

        .nav-label {
          font-size: 12px;
          text-align: center;
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
      &.active {
        background-color: rgba(255, 255, 255, 0.3);
        border-right-color: #fff;
      }
      
      &:hover {
        background-color: rgba(255, 255, 255, 0.2);
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
      
      &.active .nav-icon {
        animation: none;
      }
    }
  }
}
</style>
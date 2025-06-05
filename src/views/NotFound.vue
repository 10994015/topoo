<template>
  <div class="not-found-container">
    <div class="not-found-content">
      <!-- 404 數字 -->
      <div class="error-number">404</div>
      
      <!-- 錯誤訊息 -->
      <div class="error-message">
        <h1 class="error-title">頁面不存在</h1>
        <p class="error-description">
          很抱歉，您要尋找的頁面不存在或已被移除。
        </p>
      </div>

      <!-- 返回首頁按鈕 -->
      <router-link :to="homeRoute" class="btn-home">
        回到首頁
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// 檢查是否已登入
const isAuthenticated = computed(() => authStore.isAuthenticated)

// 根據登入狀態決定首頁路由
const homeRoute = computed(() => {
  return isAuthenticated.value ? '/' : '/login'
})

// 設定頁面標題
document.title = '404 - 頁面不存在 | TOPOO'
</script>

<style scoped lang="scss">
.not-found-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  padding: 2rem;
}

.not-found-content {
  text-align: center;
  max-width: 500px;
}

.error-number {
  font-size: 8rem;
  font-weight: bold;
  color: #6c5ce7;
  margin-bottom: 1rem;
  line-height: 1;
}

.error-message {
  margin-bottom: 2rem;
  
  .error-title {
    font-size: 2rem;
    font-weight: 600;
    color: #333;
    margin-bottom: 1rem;
  }
  
  .error-description {
    font-size: 1.1rem;
    color: #666;
    line-height: 1.6;
  }
}

.btn-home {
  display: inline-block;
  padding: 0.75rem 2rem;
  background: #6c5ce7;
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s;
  
  &:hover {
    background: #5a4fcf;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(108, 92, 231, 0.3);
  }
}

// 響應式設計
@media (max-width: 768px) {
  .not-found-container {
    padding: 1rem;
  }
  
  .error-number {
    font-size: 5rem;
  }
  
  .error-message {
    .error-title {
      font-size: 1.5rem;
    }
    
    .error-description {
      font-size: 1rem;
    }
  }
}

// 深色模式支援
@media (prefers-color-scheme: dark) {
  .not-found-container {
    background: #1a1a1a;
  }
  
  .error-message {
    .error-title {
      color: white;
    }
    
    .error-description {
      color: #ccc;
    }
  }
}
</style>
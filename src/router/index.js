import { createRouter, createWebHistory } from 'vue-router'
import Login from '@/views/Login.vue'
import Dashboard from '@/views/Dashboard.vue'
import { useAuthStore } from '../stores/auth'
import Register from '@/views/Register.vue'
import RepairSystem from '@/views/RepairSystem.vue'
import AppLayout from '@/components/AppLayout.vue'
import Profiles from '@/views/Profiles.vue'
import ChangePassword from '@/views/ChangePassword.vue'
import NotFound from '@/views/NotFound.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'app',
      component: AppLayout, 
      meta: { requiresAuth: true },
      children: [
        {
            path:'',
            name:'app.dashboard',
            component:Dashboard,
            meta: { 
              title: '首頁',
              breadcrumbs: [
                { text: '首頁', to: '/' },
              ]
            }
        },
        {
            path:'/profiles',
            name:'app.profiles',
            component:Profiles,
            meta: { 
              title: '個人資料',
              breadcrumbs: [
                { text: '個人資料', to: '/profiles' },
              ]
            }
        },
        {
            path:'/change-password',
            name:'app.change-password',
            component:ChangePassword,
            meta: { 
              title: '修改密碼',
              breadcrumbs: [
                { text: '修改密碼', to: '/change-password' },
              ]
            }
        },
        {
            path:'repair-system',
            name:'app.repair-system',
            component:RepairSystem,
            meta: { 
              title: '線上報修',
              breadcrumbs: [
                { text: '首頁', to: '/' },
                { text: '線上報修', to: '/repair-system' },
              ]
            }
        },
        // 在 AppLayout 內的 404 處理（已登入狀態下的未知路由）
        {
          path: ':pathMatch(.*)*',
          name: 'app.not-found',
          component: NotFound,
          meta: { 
            title: '頁面不存在',
            breadcrumbs: [
              { text: '首頁', to: '/' },
              { text: '頁面不存在' },
            ]
          }
        }
      ]
    },
    {
      path: '/login',
      name: 'login',
      component: Login,
    },
    {
      path: '/register',
      name: 'register',
      component: Register,
    },
    // 全域 404 處理（適用於未登入狀態或不在 AppLayout 內的路由）
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFound,
      meta: {
        title: '頁面不存在'
      }
    }
  ],
})

// 全域路由守衛
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  console.log(authStore.isAuthenticated);
  
  console.log(`導航到: ${to.path}, 需要認證: ${to.meta.requiresAuth}`)
  
  // 如果頁面需要認證
  if (to.meta.requiresAuth) {
    const isAuthenticated = await authStore.checkAuth();
    console.log(isAuthenticated);
    
    console.log('認證狀態:', isAuthenticated)
    
    if (!isAuthenticated) {
      console.log('未認證，跳轉到登入頁')
      next('/login')
      return
    }
  }
  
  // ✅ 如果已登入用戶訪問登入頁或註冊頁，導向首頁
  if ((to.name === 'login' || to.name === 'register')) {
        // 🔥 重新檢查認證狀態，因為可能剛登入
        const isAuthenticated = await authStore.checkAuth()
        
        if (isAuthenticated) {
            console.log('→ 已登入，跳轉到首頁')
            next('/')
            return
        }
    }

  console.log('正常導航')
  next()
})

export default router
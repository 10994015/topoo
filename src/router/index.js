import { createRouter, createWebHistory } from 'vue-router'
import { PERMISSIONS } from '@/utils/permissions' // 引入權限常數
import Login from '@/views/Login.vue'
import Dashboard from '@/views/Dashboard.vue'
import { useAuthStore } from '../stores/auth'
import Register from '@/views/Register.vue'
import RepairSystem from '@/views/RepairSystem.vue'
import AppLayout from '@/components/AppLayout.vue'
import Profiles from '@/views/Profiles.vue'
import ChangePassword from '@/views/ChangePassword.vue'
import NotFound from '@/views/NotFound.vue'
import CreateRepair from '@/views/CreateRepair.vue'
import ForgetPassword from '@/views/ForgetPassword.vue'
import EmailVerification from '@/views/EmailVerification.vue'
import AccountManagement from '@/views/Accounts/AccountManagement.vue'
import AccountView from '@/views/Accounts/AccountView.vue'
import CreateAccount from '@/views/Accounts/CreateAccount.vue'
import PermissionManagement from '@/views/Permissions/PermissionManagement.vue'
import CreatePermissionGroup from '@/views/Permissions/CreatePermissionGroup.vue'
import SelectPermissionMembers from '@/views/Permissions/SelectPermissionMembers.vue'
import ParameterManagement from '@/views/Parameters/ParameterManagement.vue'
import MailManagement from '@/views/Parameters/MailManagement.vue'
import EditMail from '@/views/Parameters/EditMail.vue'

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
          path: '',
          name: 'app.dashboard',
          component: Dashboard,
          meta: { 
            title: '首頁',
            breadcrumbs: [
              { text: '首頁', to: null },
            ]
          }
        },
        {
          path: '/profiles',
          name: 'app.profiles',
          component: Profiles,
          meta: { 
            title: '個人資料',
            breadcrumbs: [
              { text: '個人資料', to: null },
            ]
          }
        },
        {
          path: '/change-password',
          name: 'app.change-password',
          component: ChangePassword,
          meta: { 
            title: '修改密碼',
            breadcrumbs: [
              { text: '修改密碼', to: null },
            ]
          }
        },
        {
          path: 'repair-system',
          name: 'app.repair-system',
          component: RepairSystem,
          meta: { 
            title: '線上報修',
            breadcrumbs: [
              { text: '首頁', to: '/' },
              { text: '線上報修', to: null },
            ],
            permission: PERMISSIONS.REPAIR_MANAGEMENT,
            permissionMode: 'Readonly' // 讀取權限即可訪問
          }
        },
        {
          path: 'create-repair',
          name: 'app.create-repair',
          component: CreateRepair,
          meta: { 
            title: '新增報修',
            breadcrumbs: [
              { text: '首頁', to: '/' },
              { text: '線上報修', to: '/repair-system' },
              { text: '新增報修', to: null },
            ],
            permission: PERMISSIONS.REPAIR_MANAGEMENT,
            permissionMode: 'Full' // 需要完整權限
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
      path: '/settings',
      name: 'app.settings',
      component: AppLayout, 
      meta: { requiresAuth: true },
      children: [
        {
          path: 'account-management',
          name: 'app.settings.account-management',
          component: AccountManagement,
          meta: { 
            title: '帳號管理',
            breadcrumbs: [
              { text: '首頁', to: '/' },
              { text: '帳號管理', to: null },
            ],
            permission: PERMISSIONS.ACCOUNT_MANAGEMENT,
            permissionMode: 'Readonly' // 讀取權限即可查看列表
          }
        },
        {
          path: 'account-view/:id',
          name: 'app.settings.account-view',
          component: AccountView,
          meta: { 
            title: '檢視帳號',
            breadcrumbs: [
              { text: '首頁', to: '/' },
              { text: '帳號管理', to: '/settings/account-management' },
              { text: '檢視帳號', to: null },
            ],
            permission: PERMISSIONS.ACCOUNT_MANAGEMENT,
            permissionMode: 'Readonly' // 讀取權限即可查看詳情
          }
        },
        {
          path: 'account/create',
          name: 'app.settings.account-create',
          component: CreateAccount,
          meta: { 
            title: '新建帳號',
            breadcrumbs: [
              { text: '首頁', to: '/' },
              { text: '帳號管理', to: '/settings/account-management' },
              { text: '新建帳號', to: null },
            ],
            permission: PERMISSIONS.ACCOUNT_MANAGEMENT,
            permissionMode: 'Full' // 需要完整權限才能新增
          }
        },
        {
          path: 'account/edit/:id',
          name: 'app.settings.account-edit',
          component: CreateAccount, // 假設編輯用同個組件
          meta: { 
            title: '編輯帳號',
            breadcrumbs: [
              { text: '首頁', to: '/' },
              { text: '帳號管理', to: '/settings/account-management' },
              { text: '編輯帳號', to: null },
            ],
            permission: PERMISSIONS.ACCOUNT_MANAGEMENT,
            permissionMode: 'Full' // 需要完整權限才能編輯
          }
        },
        {
          path: 'permission-management',
          name: 'app.settings.permission-management',
          component: PermissionManagement,
          meta: { 
            title: '權限管理',
            breadcrumbs: [
              { text: '首頁', to: '/' },
              { text: '權限管理', to: null },
            ],
            permission: PERMISSIONS.PERMISSION_ROLE_MANAGEMENT,
            permissionMode: 'Readonly' // 讀取權限即可查看
          }
        },
        {
          path: 'permission-group/create',
          name: 'app.settings.permission-group-create',
          component: CreatePermissionGroup,
          meta: { 
            title: '新增權限群組',
            breadcrumbs: [
              { text: '首頁', to: '/' },
              { text: '權限管理', to: '/settings/permission-management' },
              { text: '新增權限群組', to: null },
            ],
            permission: PERMISSIONS.PERMISSION_ROLE_MANAGEMENT,
            permissionMode: 'Full' // 需要完整權限才能新增
          }
        },
        {
          path: 'permission-group/edit/:id',
          name: 'app.settings.permission-group-edit',
          component: CreatePermissionGroup,
          meta: { 
            title: '編輯權限群組',
            breadcrumbs: [
              { text: '首頁', to: '/' },
              { text: '權限管理', to: '/settings/permission-management' },
              { text: '編輯權限群組', to: null },
            ],
            permission: '權限角色管理',
            permissionMode: 'Readonly' // 需要完整權限才能編輯
          }
        },
        {
          path: 'permission-group/:id/members',
          name: 'app.settings.permission-group-select-members',
          component: SelectPermissionMembers,
          meta: { 
            title: '權限成員編輯',
            breadcrumbs: [
              { text: '首頁', to: '/' },
              { text: '權限管理', to: '/settings/permission-management' },
              { text: '編輯權限群組', to: '/settings/permission-group/edit/:id' },
              { text: '權限成員編輯', to: null },
            ],
            permission: PERMISSIONS.PERMISSION_ROLE_MEMBER_MANAGEMENT,
            permissionMode: 'Readonly' // 需要完整權限才能管理成員
          }
        },
        {
          path: 'parameter-management',
          name: 'app.settings.parameter-management',
          component: ParameterManagement,
          meta: { 
            title: '參數管理',
            breadcrumbs: [
              { text: '首頁', to: '/' },
              { text: '參數管理', to: null },
            ],
          }
        },
        {
          path: 'parameter/mail-management',
          name: 'app.settings.mail-management',
          component: MailManagement,
          meta: { 
            title: '寄信管理',
            breadcrumbs: [
              { text: '首頁', to: '/' },
              { text: '參數管理', to: '/settings/parameter-management' },
              { text: '寄信管理', to: null },
            ],
            permission: PERMISSIONS.MAIL_MANAGEMENT,
            permissionMode: 'Readonly' 
          },
        },
        {
          path: 'parameter/mail-management/create',
          name: 'app.settings.mail-management.create',
          component: EditMail,
          meta: { 
            title: '新增信箱',
            breadcrumbs: [
              { text: '首頁', to: '/' },
              { text: '參數管理', to: '/settings/parameter-management' },
              { text: '寄信管理', to: '/settings/parameter/mail-management' },
              { text: '新增信箱', to: null },
            ],
            permission: PERMISSIONS.MAIL_MANAGEMENT,
            permissionMode: 'Full' 
          },
        },
        {
          path: 'parameter/mail-management/edit/:id',
          name: 'app.settings.mail-management.edit',
          component: EditMail,
          meta: { 
            title: '編輯信箱',
            breadcrumbs: [
              { text: '首頁', to: '/' },
              { text: '參數管理', to: '/settings/parameter-management' },
              { text: '寄信管理', to: '/settings/parameter/mail-management' },
              { text: '編輯信箱', to: null },
            ],
            permission: PERMISSIONS.MAIL_MANAGEMENT,
            permissionMode: 'Readonly' 
          },
        },
      ]
    },
    
    {
      path: '/login',
      name: 'login',
      component: Login,
      meta: {
        title: '登入'
      }
    },
    {
      path: '/register',
      name: 'register',
      component: Register,
      meta: {
        title: '註冊'
      }
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: ForgetPassword,
      meta: {
        title: '忘記密碼'
      }
    },
    {
      path: '/email-verification',
      name: 'email-verification',
      component: EmailVerification,
      meta: {
        title: 'Email 驗證'
      }
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
  // authStore.getPermissions();
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

    // 檢查頁面權限
    if (to.meta.permission) {
      console.log('abc');
      
      const permissionName = to.meta.permission
      const requiredMode = to.meta.permissionMode || 'Readonly' // 預設為讀取權限
      console.log( requiredMode);
      
      console.log(`檢查權限: ${permissionName}, 需要模式: ${requiredMode}`)
      
      const hasPagePermission = authStore.hasPermission(permissionName, requiredMode)
      
      if (!hasPagePermission) {
        console.log(`無權限訪問: ${permissionName} (${requiredMode})`)
        
        // 如果需要的是Full權限但只有Readonly權限，可以給更友善的提示
        if (requiredMode === 'Full' && authStore.hasPermission(permissionName, 'Readonly')) {
          console.log('用戶有讀取權限但沒有完整權限')
          // 可以跳轉到無權限頁面，或顯示提示
          alert('您沒有執行此操作的權限')
          next(from.path || '/')
          return
        }
        
        // 完全沒有權限，跳轉到首頁
        next('/')
        return
      }
      
      console.log(`權限檢查通過: ${permissionName} (${requiredMode})`)
    }
  }
  
  // 如果已登入用戶訪問登入頁或註冊頁，導向首頁
  if ((to.name === 'login' || to.name === 'register')) {
    // 重新檢查認證狀態，因為可能剛登入
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

// 🎯 在路由切換後更新網頁標題
router.afterEach((to, from) => {
  // 設定網頁標題
  const systemName = 'TOPOO 線上報修系統'
  
  if (to.meta && to.meta.title) {
    document.title = `${to.meta.title} - ${systemName}`
  } else {
    document.title = systemName
  }
  
  console.log(`網頁標題已更新為: ${document.title}`)
})

export default router
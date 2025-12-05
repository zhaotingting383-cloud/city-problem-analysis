import type { RouteRecordRaw } from 'vue-router' // 注意 type 关键字
import { createRouter, createWebHistory } from 'vue-router'

// 懒加载各模块组件
const MainLayout = () => import('@/views/layout/MainLayout.vue')
const DataImport = () => import('@/views/data-import/DataImport.vue')
const AIAnalysis = () => import('@/views/ai-analysis/AIAnalysis.vue')
const Dashboard = () => import('@/views/dashboard/Dashboard.vue')
const WarningTrack = () => import('@/views/warning-track/WarningTrack.vue')
const AIChat = () => import('@/views/ai-chat/AIChat.vue')
const DailyReport = () => import('@/views/daily-report/DailyReport.vue')
const DataFilter = () => import('@/views/data-filter/DataFilter.vue')

// 路由规则
const routes: RouteRecordRaw = [
  {
    path: '/',
    component: MainLayout, // 主布局（包含侧边栏导航）
    // redirect: '/dashboard', // 默认跳转到大屏
    redirect: '/data-import', // 默认跳转到导入
    children: [
      {
        path: 'data-import',
        name: 'DataImport',
        component: DataImport,
        meta: { title: '多源数据导入与结构化展示', icon: 'el-icon-upload' },
      },
      {
        path: 'ai-analysis',
        name: 'AIAnalysis',
        component: AIAnalysis,
        meta: { title: 'AI智能分析与建议生成', icon: 'el-icon-s-data' },
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: Dashboard,
        meta: { title: '城市运行态势大屏', icon: 'el-icon-monitor' },
      },
      {
        path: 'warning-track',
        name: 'WarningTrack',
        component: WarningTrack,
        meta: { title: '智能预警与处置跟踪', icon: 'el-icon-bell' },
      },
      {
        path: 'ai-chat',
        name: 'AIChat',
        component: AIChat,
        meta: { title: 'AI对话助手', icon: 'el-icon-chat-dot-round' },
      },
      {
        path: 'daily-report',
        name: 'DailyReport',
        component: DailyReport,
        meta: { title: '自动生成处置日报', icon: 'el-icon-document' },
      },
      {
        path: 'data-filter',
        name: 'DataFilter',
        component: DataFilter,
        meta: { title: '多维筛选与对比', icon: 'el-icon-filter' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

// 路由守卫：设置页面标题
router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = `智能城市系统 - ${to.meta.title}`
  }
  next()
})

export default router

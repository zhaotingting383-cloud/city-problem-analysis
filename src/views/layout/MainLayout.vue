<template>
  <div class="main-layout">
    <!-- 侧边栏导航 -->
    <el-aside width="220px" class="sidebar">
      <div class="sidebar-logo">
        <img src="https://picsum.photos/40/40" alt="logo" class="logo-img" />
        <span class="logo-text">智能城市运行系统</span>
      </div>
      <el-menu
        default-active="dashboard"
        class="sidebar-menu"
        background-color="#0f172a"
        text-color="#e2e8f0"
        active-text-color="#00c6ff"
        router
      >
        <el-menu-item index="data-import">
          <el-icon><Upload /></el-icon>
          <template #title>多源数据导入</template>
        </el-menu-item>
        <el-menu-item index="ai-analysis">
          <el-icon><DataAnalysis /></el-icon>
          <template #title>AI智能分析</template>
        </el-menu-item>
        <el-menu-item index="dashboard">
          <el-icon><Monitor /></el-icon>
          <template #title>城市运行大屏</template>
        </el-menu-item>
        <el-menu-item index="warning-track">
          <el-icon><Bell /></el-icon>
          <template #title>预警与处置跟踪</template>
        </el-menu-item>
        <el-menu-item index="ai-chat">
          <el-icon><ChatDotRound /></el-icon>
          <template #title>AI对话助手</template>
        </el-menu-item>
        <el-menu-item index="daily-report">
          <el-icon><Document /></el-icon>
          <template #title>自动生成日报</template>
        </el-menu-item>
        <el-menu-item index="data-filter">
          <el-icon><Filter /></el-icon>
          <template #title>多维筛选与对比</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 主内容区域 -->
    <el-container class="main-content">
      <!-- 顶部导航 -->
      <el-header class="header">
        <div class="header-left">
          <el-icon class="toggle-sidebar" @click="toggleSidebar"><Menu /></el-icon>
          <span class="current-module">{{ $route.meta.title }}</span>
        </div>
        <div class="header-right">
          <el-dropdown>
            <span class="user-info">
              <el-icon><User /></el-icon>
              系统管理员
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>个人中心</el-dropdown-item>
                <el-dropdown-item>系统设置</el-dropdown-item>
                <el-dropdown-item divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 内容区域 -->
      <el-main class="content-wrapper">
        <router-view />
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  Upload,
  DataAnalysis,
  Monitor,
  Bell,
  ChatDotRound,
  Document,
  Filter,
  Menu,
  User,
} from '@element-plus/icons-vue'

const sidebarCollapse = ref(false)
const toggleSidebar = () => {
  sidebarCollapse.value = !sidebarCollapse.value
}
</script>

<style scoped>
/* 布局样式 - 深色科技感 */
.main-layout {
  display: flex;
  width: 100vw;
  height: 100vh;
  background-color: #0f172a;
  color: #e2e8f0;
}

/* 侧边栏 */
.sidebar {
  background: linear-gradient(180deg, #1e293b, #0f172a);
  border-right: 1px solid #334155;
  transition: width 0.3s;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #334155;
}

.logo-img {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  margin-right: 12px;
}

.logo-text {
  font-size: 16px;
  font-weight: bold;
  color: #00c6ff;
}

.sidebar-menu {
  border-right: none;
  height: calc(100% - 72px);
}

/* 主内容 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #0f172a;
}

/* 顶部导航 */
.header {
  background: linear-gradient(90deg, #1e293b, #0f172a);
  border-bottom: 1px solid #334155;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 64px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.toggle-sidebar {
  font-size: 20px;
  cursor: pointer;
  color: #00c6ff;
}

.current-module {
  font-size: 18px;
  font-weight: 500;
  color: #e2e8f0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

/* 内容容器 */
.content-wrapper {
  flex: 1;
  padding: 20px;
  overflow: auto;
  background-color: #0f172a;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #1e293b;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #00c6ff;
}
</style>

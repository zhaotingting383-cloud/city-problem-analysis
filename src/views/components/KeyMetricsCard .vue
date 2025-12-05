<template>
  <div class="key-metrics-card">
    <!-- 卡片标题 -->
    <div class="card-header" v-if="showTitle">
      <el-icon><DataAnalysis /></el-icon>
      <span>{{ title }}</span>
      <el-button size="mini" type="text" @click="refreshMetrics">
        <el-icon><Refresh /></el-icon>刷新
      </el-button>
    </div>

    <!-- 指标网格 -->
    <div class="metrics-grid">
      <!-- 今日事件数 -->
      <div class="metric-item">
        <div class="metric-header">
          <span class="metric-name">今日事件数</span>
          <span class="metric-trend" :class="todayEvents.trend">
            {{ todayEvents.trend > 0 ? '↑' : '↓' }}{{ Math.abs(todayEvents.trend) }}%
          </span>
        </div>
        <div class="metric-value">{{ todayEvents.value }}</div>
        <div class="metric-footer">
          <span class="metric-desc">环比昨日</span>
          <el-progress
            :percentage="todayEvents.progress"
            :stroke-width="4"
            :color="todayEvents.color"
            class="metric-progress"
          />
        </div>
      </div>

      <!-- 异常设备数 -->
      <div class="metric-item">
        <div class="metric-header">
          <span class="metric-name">异常设备数</span>
          <span class="metric-trend" :class="abnormalDevices.trend">
            {{ abnormalDevices.trend > 0 ? '↑' : '↓' }}{{ Math.abs(abnormalDevices.trend) }}%
          </span>
        </div>
        <div class="metric-value">{{ abnormalDevices.value }}</div>
        <div class="metric-footer">
          <span class="metric-desc">占总设备{{ abnormalDevices.rate }}%</span>
          <el-progress
            :percentage="abnormalDevices.progress"
            :stroke-width="4"
            :color="abnormalDevices.color"
            class="metric-progress"
          />
        </div>
      </div>

      <!-- 高优先级问题数 -->
      <div class="metric-item">
        <div class="metric-header">
          <span class="metric-name">高优先级问题数</span>
          <el-tag size="small" type="danger" class="priority-tag">紧急</el-tag>
        </div>
        <div class="metric-value high-priority">{{ highPriority.value }}</div>
        <div class="metric-footer">
          <span class="metric-desc">未处理{{ highPriority.unhandled }}件</span>
          <el-progress
            :percentage="highPriority.progress"
            :stroke-width="4"
            color="#ff4757"
            class="metric-progress"
          />
        </div>
      </div>

      <!-- 平均响应时长 -->
      <div class="metric-item">
        <div class="metric-header">
          <span class="metric-name">平均响应时长</span>
          <span class="metric-trend" :class="avgResponseTime.trend">
            {{ avgResponseTime.trend > 0 ? '↑' : '↓' }}{{ Math.abs(avgResponseTime.trend) }}%
          </span>
        </div>
        <div class="metric-value">{{ avgResponseTime.value }} 分钟</div>
        <div class="metric-footer">
          <span class="metric-desc">目标≤15分钟</span>
          <el-progress
            :percentage="avgResponseTime.progress"
            :stroke-width="4"
            :color="avgResponseTime.color"
            class="metric-progress"
          />
        </div>
      </div>
    </div>

    <!-- 数据更新时间 -->
    <div class="card-footer" v-if="showUpdateTime">
      数据更新时间：{{ updateTime }}
      <el-tooltip content="每5分钟自动更新">
        <el-icon class="tooltip-icon"><InfoFilled /></el-icon>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { DataAnalysis, Refresh, InfoFilled } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

// Props定义
interface Props {
  // 卡片标题
  title?: string
  // 是否显示标题
  showTitle?: boolean
  // 是否显示更新时间
  showUpdateTime?: boolean
  // 自动刷新间隔（秒），0为不自动刷新
  autoRefreshInterval?: number
  // 卡片宽度
  width?: string | number
  // 卡片高度
  height?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  title: '核心运营指标',
  showTitle: true,
  showUpdateTime: true,
  autoRefreshInterval: 300, // 5分钟自动刷新
  width: '100%',
  height: 'auto',
})

// Emits定义
const emit = defineEmits<{
  (e: 'metricsRefresh', data: any): void
  (e: 'valueChange', metric: string, value: number): void
}>()

// 响应式数据
const updateTime = ref(dayjs().format('YYYY-MM-DD HH:mm:ss'))
// 定时器
let refreshTimer: NodeJS.Timeout | null = null

// 核心指标数据
const todayEvents = reactive({
  value: 0,
  trend: 0, // 环比趋势（%）
  progress: 0, // 进度条百分比
  color: '#00c6ff', // 主题色
})

const abnormalDevices = reactive({
  value: 0,
  trend: 0,
  rate: 0, // 占总设备比例
  progress: 0,
  color: '#7b61ff',
})

const highPriority = reactive({
  value: 0,
  unhandled: 0, // 未处理数量
  progress: 0,
})

const avgResponseTime = reactive({
  value: 0,
  trend: 0,
  progress: 0,
  color: '#2ed573',
})

// 生成随机指标值（模拟真实数据波动）
const generateMetricValues = () => {
  // 今日事件数（80-200之间）
  const newTodayEvents = 80 + Math.floor(Math.random() * 120)
  todayEvents.trend = Math.floor(Math.random() * 15) * (Math.random() > 0.5 ? 1 : -1)
  todayEvents.value = newTodayEvents
  todayEvents.progress = Math.min(100, Math.max(0, (newTodayEvents / 200) * 100))
  // 根据数值调整颜色
  todayEvents.color =
    newTodayEvents > 150 ? '#ff4757' : newTodayEvents > 100 ? '#ffa801' : '#00c6ff'

  // 异常设备数（20-80之间）
  const totalDevices = 500 // 总设备数
  const newAbnormalDevices = 20 + Math.floor(Math.random() * 60)
  abnormalDevices.trend = Math.floor(Math.random() * 10) * (Math.random() > 0.5 ? 1 : -1)
  abnormalDevices.value = newAbnormalDevices
  abnormalDevices.rate = Math.round((newAbnormalDevices / totalDevices) * 100)
  abnormalDevices.progress = Math.min(100, Math.max(0, (newAbnormalDevices / totalDevices) * 100))
  abnormalDevices.color =
    newAbnormalDevices > 50 ? '#ff4757' : newAbnormalDevices > 30 ? '#ffa801' : '#7b61ff'

  // 高优先级问题数（5-25之间）
  const newHighPriority = 5 + Math.floor(Math.random() * 20)
  highPriority.value = newHighPriority
  highPriority.unhandled = Math.floor(newHighPriority * (0.3 + Math.random() * 0.7))
  highPriority.progress = Math.min(
    100,
    Math.max(0, (highPriority.unhandled / newHighPriority) * 100),
  )

  // 平均响应时长（5-25分钟）
  const newAvgResponseTime = 5 + Math.floor(Math.random() * 20)
  avgResponseTime.trend = Math.floor(Math.random() * 10) * (Math.random() > 0.5 ? 1 : -1)
  avgResponseTime.value = newAvgResponseTime
  // 进度条：越短越好，所以反向计算
  avgResponseTime.progress = Math.min(100, Math.max(0, 100 - ((newAvgResponseTime - 5) / 20) * 100))
  avgResponseTime.color =
    newAvgResponseTime <= 15 ? '#2ed573' : newAvgResponseTime <= 20 ? '#ffa801' : '#ff4757'

  // 更新时间
  updateTime.value = dayjs().format('YYYY-MM-DD HH:mm:ss')

  // 触发事件
  emit('metricsRefresh', {
    todayEvents: { ...todayEvents },
    abnormalDevices: { ...abnormalDevices },
    highPriority: { ...highPriority },
    avgResponseTime: { ...avgResponseTime },
  })
}

// 刷新指标
const refreshMetrics = () => {
  // 显示加载状态（模拟）
  const allMetrics = [todayEvents, abnormalDevices, highPriority, avgResponseTime]
  allMetrics.forEach((metric) => {
    if ('value' in metric) {
      metric.value = 0
    }
  })

  setTimeout(() => {
    generateMetricValues()
    ElMessage.success('指标数据已刷新')
  }, 500)
}

// 启动自动刷新
const startAutoRefresh = () => {
  if (props.autoRefreshInterval <= 0 || refreshTimer) return

  refreshTimer = setInterval(() => {
    generateMetricValues()
  }, props.autoRefreshInterval * 1000)
}

// 停止自动刷新
const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

// 监听自动刷新间隔变化
watch(
  () => props.autoRefreshInterval,
  () => {
    stopAutoRefresh()
    startAutoRefresh()
  },
  { immediate: true },
)

// 组件挂载
onMounted(() => {
  // 初始化数据
  generateMetricValues()
  // 启动自动刷新
  startAutoRefresh()
})

// 组件卸载
onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.key-metrics-card {
  width: v-bind(width);
  height: v-bind(height);
  background-color: #0f172a;
  border-radius: 8px;
  border: 1px solid #334155;
  padding: 15px;
  font-family: 'Helvetica Neue', sans-serif;
}

/* 卡片标题 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #334155;
  color: #e2e8f0;
  font-size: 16px;
  font-weight: 500;
}

.card-header span {
  margin-left: 8px;
}

/* 指标网格 */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}

/* 指标项 */
.metric-item {
  background: linear-gradient(135deg, #1e293b, #0f172a);
  border-radius: 8px;
  padding: 20px 15px;
  border: 1px solid #475569;
  transition: all 0.3s ease;
}

.metric-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  border-color: #00c6ff;
}

/* 指标头部 */
.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.metric-name {
  color: #94a3b8;
  font-size: 14px;
  font-weight: 400;
}

.metric-trend {
  font-size: 12px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 4px;
}

/* 趋势样式 */
.metric-trend:deep(.up) {
  color: #ff4757;
  background-color: rgba(255, 71, 87, 0.1);
}

.metric-trend:deep(.down) {
  color: #2ed573;
  background-color: rgba(46, 213, 115, 0.1);
}

/* 优先级标签 */
.priority-tag {
  font-size: 11px;
}

/* 指标数值 */
.metric-value {
  font-size: 32px;
  font-weight: bold;
  color: #e2e8f0;
  line-height: 1.2;
  margin-bottom: 15px;
}

.high-priority {
  color: #ff4757;
}

/* 指标底部 */
.metric-footer {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.metric-desc {
  font-size: 12px;
  color: #64748b;
}

.metric-progress {
  width: 100%;
}

/* 进度条样式覆盖 */
.metric-progress :deep(.el-progress-bar__outer) {
  background-color: #1e293b;
  border-radius: 2px;
}

.metric-progress :deep(.el-progress-bar__inner) {
  border-radius: 2px;
}

/* 卡片底部 */
.card-footer {
  margin-top: 20px;
  padding-top: 10px;
  border-top: 1px dashed #334155;
  font-size: 12px;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
}

.tooltip-icon {
  font-size: 12px;
  cursor: help;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .metric-value {
    font-size: 28px;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}

@media (max-width: 480px) {
  .metric-value {
    font-size: 24px;
  }

  .metric-item {
    padding: 15px 10px;
  }
}
</style>

<template>
  <div class="realtime-event-list">
    <!-- 头部 -->
    <div class="list-header">
      <div class="header-title">
        <el-icon><Bell /></el-icon>
        <span>实时事件监控</span>
        <el-badge :value="unhandledCount" class="badge" type="danger">
          <span class="badge-text">未处理</span>
        </el-badge>
      </div>
      <div class="header-actions">
        <el-select v-model="filterStatus" size="small" @change="filterEvents">
          <el-option label="全部事件" value="all"></el-option>
          <el-option label="未处理" value="pending"></el-option>
          <el-option label="处理中" value="processing"></el-option>
          <el-option label="已处理" value="resolved"></el-option>
        </el-select>
        <el-button size="small" type="primary" @click="handleRefresh">
          <el-icon><Refresh /></el-icon>刷新
        </el-button>
        <el-switch
          v-model="autoRefresh"
          size="small"
          active-text="自动刷新"
          inactive-text="手动刷新"
          @change="toggleAutoRefresh"
        ></el-switch>
      </div>
    </div>

    <!-- 列表容器 -->
    <div class="list-container" ref="listContainer">
      <!-- 空数据提示 -->
      <div class="empty-tip" v-if="filteredEvents.length === 0">
        <el-empty description="暂无事件数据" />
      </div>

      <!-- 事件列表 -->
      <div class="event-list">
        <div
          v-for="(event, index) in filteredEvents"
          :key="event.id"
          class="event-item"
          :class="[
            event.status,
            { 'new-item': isNewEvent(event.id) },
            { highlight: index === hoverIndex },
          ]"
          @mouseenter="hoverIndex = index"
          @mouseleave="hoverIndex = -1"
          @click="handleEventClick(event)"
        >
          <!-- NEW标识 -->
          <div class="new-tag" v-if="isNewEvent(event.id)">NEW</div>

          <!-- 事件状态标识 -->
          <div class="status-tag" :class="event.status">
            {{ statusMap[event.status] }}
          </div>

          <!-- 事件内容 -->
          <div class="event-content">
            <div class="event-title">
              <span class="title-text">{{ event.title }}</span>
              <span class="event-level" :class="event.level">
                {{ levelMap[event.level] }}
              </span>
            </div>
            <div class="event-meta">
              <span class="meta-item">
                <el-icon><Location /></el-icon>
                {{ event.area }}
              </span>
              <span class="meta-item">
                <el-icon><Clock /></el-icon>
                {{ formatTime(event.createTime) }}
              </span>
              <span class="meta-item" v-if="event.handler">
                <el-icon><User /></el-icon>
                {{ event.handler || '未分配' }}
              </span>
            </div>
            <div class="event-desc">{{ event.description }}</div>
          </div>

          <!-- 操作按钮 -->
          <div class="event-actions" v-if="hoverIndex === index">
            <el-button size="mini" type="primary" @click.stop="handleProcess(event)">
              处理
            </el-button>
            <el-button
              size="mini"
              type="success"
              @click.stop="handleComplete(event)"
              v-if="event.status !== 'resolved'"
            >
              完成
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部统计 -->
    <div class="list-footer">
      <div class="footer-stat">
        <span class="stat-item">
          <span class="stat-label">总事件数：</span>
          <span class="stat-value">{{ eventList.length }}</span>
        </span>
        <span class="stat-item">
          <span class="stat-label">新增/分钟：</span>
          <span class="stat-value">{{ addPerMinute }}</span>
        </span>
        <span class="stat-item">
          <span class="stat-label">处理完成率：</span>
          <span class="stat-value">{{ completionRate }}%</span>
        </span>
      </div>
      <div class="footer-update">最后更新：{{ lastUpdateTime }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Bell, Refresh, Location, Clock, User } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

// Props定义
interface Props {
  // 列表高度
  height?: string | number
  // 最大显示条数
  maxCount?: number
  // 自动刷新间隔（秒）
  refreshInterval?: number
  // 是否显示NEW标识
  showNewTag?: boolean
  // NEW标识持续时间（秒）
  newTagDuration?: number
}

const props = withDefaults(defineProps<Props>(), {
  height: '500px',
  maxCount: 20,
  refreshInterval: 10,
  showNewTag: true,
  newTagDuration: 30,
})

// Emits定义
const emit = defineEmits<{
  (e: 'eventClick', event: any): void
  (e: 'eventProcess', event: any): void
  (e: 'eventComplete', event: any): void
  (e: 'newEvent', event: any): void
}>()

// 状态映射
const statusMap = {
  pending: '未处理',
  processing: '处理中',
  resolved: '已处理',
}

const levelMap = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
}

// 响应式数据
const eventList = ref<any[]>([]) // 原始事件列表
const filterStatus = ref('all') // 筛选状态
const autoRefresh = ref(true) // 自动刷新开关
const hoverIndex = ref(-1) // 鼠标悬浮索引
const newEventIds = ref<Set<string>>(new Set()) // 新事件ID集合
const lastUpdateTime = ref(dayjs().format('HH:mm:ss')) // 最后更新时间
const addPerMinute = ref(0) // 每分钟新增数
const completionRate = ref(0) // 完成率
const listContainer = ref<HTMLDivElement>() // 列表容器引用

// 定时器
let refreshTimer: NodeJS.Timeout | null = null
let statsTimer: NodeJS.Timeout | null = null

// 区域列表
const areas = ['朝阳区', '海淀区', '西城区', '东城区', '丰台区', '昌平区', '顺义区']
// 事件类型
const eventTypes = [
  '交通拥堵',
  '设备故障',
  '传感器异常',
  '噪音扰民',
  '环境异常',
  '公共设施损坏',
  '道路积水',
  '信号中断',
]
// 处理人列表
const handlers = ['张三', '李四', '王五', '赵六', '未分配']

// 筛选后的事件列表
const filteredEvents = computed(() => {
  let filtered = [...eventList.value]

  // 按状态筛选
  if (filterStatus.value !== 'all') {
    filtered = filtered.filter((item) => item.status === filterStatus.value)
  }

  // 按最大条数限制
  if (filtered.length > props.maxCount) {
    filtered = filtered.slice(0, props.maxCount)
  }

  return filtered
})

// 未处理事件数
const unhandledCount = computed(() => {
  return eventList.value.filter((item) => item.status === 'pending').length
})

// 判断是否为新事件
const isNewEvent = (id: string) => {
  return props.showNewTag && newEventIds.value.has(id)
}

// 格式化时间
const formatTime = (time: string) => {
  return dayjs(time).format('MM-DD HH:mm:ss')
}

// 生成随机事件
const generateRandomEvent = (): any => {
  const id = `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  const type = eventTypes[Math.floor(Math.random() * eventTypes.length)]
  const area = areas[Math.floor(Math.random() * areas.length)]
  const level = ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as
    | 'high'
    | 'medium'
    | 'low'

  return {
    id,
    title: `${area}${type}`,
    area,
    level,
    status: 'pending' as 'pending' | 'processing' | 'resolved',
    createTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    description: `${area}${Math.random() > 0.5 ? '核心区域' : '周边区域'}发生${type}，${level === 'high' ? '需立即处理' : '请尽快处理'}`,
    handler: handlers[Math.floor(Math.random() * handlers.length)],
    location: `${116.3 + Math.random() * 0.5}, ${39.9 + Math.random() * 0.5}`,
  }
}

// 添加新事件
const addNewEvent = () => {
  const newEvent = generateRandomEvent()

  // 添加到列表头部
  eventList.value.unshift(newEvent)

  // 记录新事件ID
  newEventIds.value.add(newEvent.id)

  // 超过最大条数时移除最后一条
  if (eventList.value.length > 50) {
    // 最大缓存50条
    eventList.value.pop()
  }

  // 定时移除NEW标识
  setTimeout(() => {
    newEventIds.value.delete(newEvent.id)
  }, props.newTagDuration * 1000)

  // 更新最后更新时间
  lastUpdateTime.value = dayjs().format('HH:mm:ss')

  // 触发新事件事件
  emit('newEvent', newEvent)

  // 滚动到顶部
  if (listContainer.value) {
    listContainer.value.scrollTop = 0
    // 添加滚动动画
    listContainer.value.style.scrollBehavior = 'smooth'
  }
}

// 启动自动刷新
const startAutoRefresh = () => {
  if (refreshTimer) clearInterval(refreshTimer)

  if (autoRefresh.value) {
    refreshTimer = setInterval(() => {
      addNewEvent()
    }, props.refreshInterval * 1000)
  }
}

// 停止自动刷新
const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

// 切换自动刷新
const toggleAutoRefresh = () => {
  if (autoRefresh.value) {
    startAutoRefresh()
    ElMessage.success('已开启自动刷新')
  } else {
    stopAutoRefresh()
    ElMessage.info('已关闭自动刷新')
  }
}

// 手动刷新
const handleRefresh = () => {
  addNewEvent()
  updateStats()
  ElMessage.success('数据刷新成功')
}

// 筛选事件
const filterEvents = () => {
  // 筛选逻辑由computed处理
}

// 点击事件
const handleEventClick = (event: any) => {
  emit('eventClick', event)
}

// 处理事件
const handleProcess = (event: any) => {
  ElMessageBox.confirm(`确定要处理【${event.title}】事件吗？`, '处理确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'info',
  }).then(() => {
    // 更新事件状态
    eventList.value = eventList.value.map((item) =>
      item.id === event.id ? { ...item, status: 'processing', handler: '当前登录用户' } : item,
    )
    emit('eventProcess', event)
    ElMessage.success(`已开始处理【${event.title}】`)
    updateStats()
  })
}

// 完成事件
const handleComplete = (event: any) => {
  ElMessageBox.confirm(`确定要标记【${event.title}】事件为已完成吗？`, '完成确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'success',
  }).then(() => {
    // 更新事件状态
    eventList.value = eventList.value.map((item) =>
      item.id === event.id
        ? { ...item, status: 'resolved', completeTime: dayjs().format('YYYY-MM-DD HH:mm:ss') }
        : item,
    )
    emit('eventComplete', event)
    ElMessage.success(`已完成【${event.title}】事件处理`)
    updateStats()
  })
}

// 更新统计数据
const updateStats = () => {
  // 计算完成率
  const total = eventList.value.length
  const completed = eventList.value.filter((item) => item.status === 'resolved').length
  completionRate.value = total > 0 ? Math.round((completed / total) * 100) : 0

  // 计算每分钟新增数（模拟）
  addPerMinute.value = Math.floor((60 / props.refreshInterval) * (1 + Math.random() * 2))
}

// 初始化统计定时器
const initStatsTimer = () => {
  if (statsTimer) clearInterval(statsTimer)

  statsTimer = setInterval(() => {
    updateStats()
  }, 60000) // 每分钟更新一次统计
}

// 初始化数据
const initData = () => {
  // 初始生成5-10条数据
  const initCount = 5 + Math.floor(Math.random() * 6)
  for (let i = 0; i < initCount; i++) {
    const event = generateRandomEvent()
    // 随机设置一些状态
    event.status = ['pending', 'processing', 'resolved'][Math.floor(Math.random() * 3)] as any
    // 调整创建时间
    event.createTime = dayjs()
      .subtract(i * 2, 'minute')
      .format('YYYY-MM-DD HH:mm:ss')
    eventList.value.push(event)
  }

  // 初始统计
  updateStats()
}

// 监听自动刷新开关
watch(autoRefresh, toggleAutoRefresh, { immediate: true })

// 组件挂载
onMounted(() => {
  initData()
  startAutoRefresh()
  initStatsTimer()
})

// 组件卸载
onUnmounted(() => {
  stopAutoRefresh()
  if (statsTimer) clearInterval(statsTimer)
})
</script>

<style scoped>
.realtime-event-list {
  width: 100%;
  background-color: #0f172a;
  border-radius: 8px;
  border: 1px solid #334155;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: v-bind(height);
}

/* 头部样式 */
.list-header {
  padding: 12px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(90deg, #1e293b, #0f172a);
  border-bottom: 1px solid #334155;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e2e8f0;
  font-size: 16px;
  font-weight: 500;
}

.badge {
  margin-left: 10px;
}

.badge-text {
  font-size: 12px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 列表容器 */
.list-container {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  background-color: #0f172a;
}

.list-container::-webkit-scrollbar {
  width: 6px;
}

.list-container::-webkit-scrollbar-track {
  background: #1e293b;
  border-radius: 3px;
}

.list-container::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 3px;
}

.list-container::-webkit-scrollbar-thumb:hover {
  background: #00c6ff;
}

/* 空数据提示 */
.empty-tip {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #94a3b8;
}

/* 事件列表 */
.event-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 事件项 */
.event-item {
  padding: 12px 15px;
  background-color: #1e293b;
  border-radius: 6px;
  border-left: 4px solid transparent;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

/* 状态边框 */
.event-item.pending {
  border-left-color: #ff4757;
}

.event-item.processing {
  border-left-color: #ffa801;
}

.event-item.resolved {
  border-left-color: #2ed573;
}

/* 高亮效果 */
.event-item.highlight {
  background-color: #27374d;
  transform: translateX(2px);
}

/* NEW标识 */
.new-tag {
  position: absolute;
  top: 0;
  right: 0;
  background-color: #ff4757;
  color: white;
  font-size: 10px;
  font-weight: bold;
  padding: 2px 8px;
  border-radius: 0 0 0 4px;
  animation: flash 1s infinite alternate;
  z-index: 1;
}

@keyframes flash {
  from {
    opacity: 1;
  }
  to {
    opacity: 0.7;
  }
}

/* 状态标签 */
.status-tag {
  min-width: 60px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
  margin-top: 2px;
}

.status-tag.pending {
  background-color: rgba(255, 71, 87, 0.2);
  color: #ff4757;
}

.status-tag.processing {
  background-color: rgba(255, 168, 1, 0.2);
  color: #ffa801;
}

.status-tag.resolved {
  background-color: rgba(46, 213, 115, 0.2);
  color: #2ed573;
}

/* 事件内容 */
.event-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.event-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-text {
  color: #e2e8f0;
  font-size: 15px;
  font-weight: 500;
}

.event-level {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
}

.event-level.high {
  background-color: rgba(255, 71, 87, 0.2);
  color: #ff4757;
}

.event-level.medium {
  background-color: rgba(255, 168, 1, 0.2);
  color: #ffa801;
}

.event-level.low {
  background-color: rgba(0, 198, 255, 0.2);
  color: #00c6ff;
}

.event-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  font-size: 12px;
  color: #94a3b8;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.event-desc {
  font-size: 13px;
  color: #cbd5e1;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 操作按钮 */
.event-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  margin-left: 10px;
}

/* 底部统计 */
.list-footer {
  padding: 10px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(90deg, #0f172a, #1e293b);
  border-top: 1px solid #334155;
  font-size: 12px;
  color: #94a3b8;
}

.footer-stat {
  display: flex;
  gap: 20px;
}

.stat-item {
  display: flex;
  gap: 5px;
}

.stat-label {
  color: #94a3b8;
}

.stat-value {
  color: #00c6ff;
  font-weight: bold;
}

.footer-update {
  color: #64748b;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .event-meta {
    gap: 10px;
  }

  .list-footer {
    flex-direction: column;
    gap: 5px;
    padding: 8px 10px;
  }

  .footer-stat {
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .event-actions {
    flex-direction: column;
  }
}
</style>

<template>
  <div class="dashboard-container">
    <!-- 顶部概览指标 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="3" v-for="(item, index) in statsList" :key="index">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-icon" :style="{ backgroundColor: item.color }">
            <el-icon :size="24">{{ item.icon }}</el-icon>
          </div>
          <div class="stat-title">{{ item.title }}</div>
          <div class="stat-value">{{ item.value }}</div>
          <div class="stat-trend" :class="item.trend > 0 ? 'up' : 'down'">
            {{ item.trend > 0 ? '↑' : '↓' }}{{ Math.abs(item.trend) }}%
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 核心可视化区域 -->
    <el-row :gutter="20" class="chart-row" style="margin-top: 20px">
      <!-- 左侧：热力图 + 实时告警 -->
      <el-col :span="10">
        <el-card class="chart-card" shadow="hover">
          <template #header>
            <span>城市问题热力图</span>
            <el-select v-model="heatmapDate" size="small" style="width: 120px">
              <el-option label="今日" value="today"></el-option>
              <el-option label="本周" value="week"></el-option>
              <el-option label="本月" value="month"></el-option>
            </el-select>
          </template>
          <CityHeatmap v-if="heatmapData.length > 0"
            :data="heatmapData"
            defaultCity="beijing"
            @dataChange="handleDataChange"
            @cityChange="handleCityChange"
          />
        </el-card>

        <KeyMetricsCard
          title="城市运行核心指标"
          :auto-refresh-interval="300"
          :show-title="true"
          :show-update-time="true"
          width="100%"
          height="auto"
          @metricsRefresh="handleMetricsRefresh"
          @valueChange="handleValueChange"
        />
        <!-- <el-card class="warning-card" shadow="hover" style="margin-top: 20px">
          <template #header>
            <span>实时告警（{{ realtimeWarnings.length }}）</span>
            <el-button size="small" type="text" @click="clearWarnings">清空</el-button>
          </template>
          <div class="warning-list">
            <div
              v-for="warning in realtimeWarnings"
              :key="warning.id"
              class="warning-item"
              :class="{ new: warning.isNew }"
            >
              <el-icon class="warning-icon"><Bell /></el-icon>
              <div class="warning-content">
                <div class="warning-text">{{ warning.content }}</div>
                <div class="warning-time">{{ warning.time }}</div>
              </div>
              <el-button size="mini" type="text" @click="handleWarning(warning.id)">处理</el-button>
            </div>
            <div v-if="realtimeWarnings.length === 0" class="empty-warning">暂无实时告警</div>
          </div>
        </el-card> -->
      </el-col>

      <!-- 右侧：多维度图表 -->
      <el-col :span="14">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-card class="chart-card" shadow="hover">
              <template #header>
                <span>问题类型分布</span>
              </template>
              <ProblemCategoryChart
                title="事件 vs 传感器异常分类对比"
                :height="400"
                :show-sub-type="true"
                @dataChange="handleDataChange"
                @itemClick="handleItemClick"
              />
              <!-- <div ref="typeChartRef" class="chart-container small-chart"></div> -->
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card class="chart-card" shadow="hover">
              <template #header>
                <span>区域分布TOP5</span>
              </template>
              <RealtimeEventList
                height="600px"
                :max-count="15"
                :refresh-interval="10"
                :show-new-tag="true"
                :new-tag-duration="20"
                @eventClick="handleEventClick"
                @eventProcess="handleEventProcess"
                @eventComplete="handleEventComplete"
                @newEvent="handleNewEvent"
              />
              <!-- <div ref="areaChartRef" class="chart-container small-chart"></div> -->
            </el-card>
          </el-col>
        </el-row>

        <el-card class="chart-card" shadow="hover" style="margin-top: 20px">
          <template #header>
            <span>7天问题趋势</span>
            <el-select v-model="trendType" size="small" style="width: 100px">
              <el-option label="全部" value="all"></el-option>
              <el-option label="高优先级" value="high"></el-option>
              <el-option label="传感器异常" value="sensor"></el-option>
            </el-select>
          </template>

          <SevenDayTrendChart
            title="近7天城市运行问题数量趋势"
            height="400px"
            themeColor="#7b61ff"
            @pointClick="handlePointClick"
          />
          <!-- <div ref="trendChartRef" class="chart-container"></div> -->
        </el-card>

        <!-- 实时数据滚动 -->
        <el-card class="realtime-card" shadow="hover" style="margin-top: 20px">
          <template #header>
            <span>实时处置进度</span>
          </template>
          <div class="realtime-scroll">
            <marquee behavior="scroll" direction="left" scrollamount="5">
              <span v-for="item in realtimeProgress" :key="item.id" class="progress-item">
                {{ item.area }} - {{ item.type }} - {{ item.status }} - {{ item.time }}
              </span>
            </marquee>
          </div>
          <div class="progress-stats">
            <div class="progress-item">
              今日处置完成率：<span class="rate">{{ completionRate }}%</span>
            </div>
            <div class="progress-item">
              平均处置时长：<span class="rate">{{ avgHandleTime }}分钟</span>
            </div>
            <div class="progress-item">
              未处理高优先级：<span class="rate danger">{{ highPriorityCount }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import * as echarts from 'echarts'
import {
  Monitor,
  Warning,
  Clock,
  Location,
  LineChart,
  PieChart,
  Bell,
  Check,
} from '@element-plus/icons-vue'
import { useMainStore } from '@/store'
import CityHeatmap from '../components/CityHeatmap.vue'
import ProblemCategoryChart from '../components/ProblemCategoryChart.vue'
import RealtimeEventList from '../components/RealtimeEventList.vue'
import KeyMetricsCard from '../components/keyCard.vue'
import SevenDayTrendChart from '../components/SevenDayTrendChart.vue'

const store = useMainStore()
// const heatmapRef = ref<HTMLDivElement>()
// const typeChartRef = ref<HTMLDivElement>()
// const areaChartRef = ref<HTMLDivElement>()
// const trendChartRef = ref<HTMLDivElement>()

// 筛选参数
const heatmapDate = ref('today')
const trendType = ref('all')

// 概览指标
const statsList = ref([
  {
    title: '今日问题数',
    value: store.statistics.todayProblems || 2,
    trend: 12,
    color: '#00c6ff',
    // icon: <LineChart />,
  },
  {
    title: '异常设备数',
    value: store.statistics.errorDevices || 4,
    trend: -5,
    color: '#7b61ff',
    // icon: <Warning />,
  },
  {
    title: '高优先级数',
    value: store.statistics.highPriority || 6,
    trend: 8,
    color: '#ff4757',
    // icon: <Bell />,
  },
  {
    title: '平均响应时长',
    value: `${store.statistics.avgResponseTime}分钟` || 8,
    trend: -3,
    color: '#ffa801',
    // icon: <Clock />,
  },
  {
    title: '事件类问题',
    value: store.statistics.eventCount || 10,
    trend: 10,
    color: '#00d2d3',
    // icon: <Location />,
  },
  {
    title: '传感器异常',
    value: store.statistics.sensorErrorCount || 12,
    trend: 15,
    color: '#ff6b81',
    // icon: <Monitor />,
  },
  {
    title: '处置完成率',
    value: '78%',
    trend: 4,
    color: '#2ed573',
    // icon: <Check />,
  },
  {
    title: '预警处理数',
    value: store.warnings.filter((w) => w.status === 'processed').length || 12,
    trend: 20,
    color: '#1e90ff',
    // icon: <PieChart />,
  },
])

// 实时告警
const realtimeWarnings = ref([
  { id: 1, content: '朝阳区交通拥堵（高优先级）', time: '10:23:45', isNew: true },
  { id: 2, content: '海淀区传感器异常', time: '10:15:30', isNew: false },
  { id: 3, content: '西城区噪音超标', time: '10:05:20', isNew: false },
])

// 实时处置进度
const realtimeProgress = ref([
  { id: 1, area: '东城区', type: '设备故障', status: '已处理', time: '10:20:15' },
  { id: 2, area: '丰台区', type: '空气质量异常', status: '处理中', time: '10:18:45' },
  { id: 3, area: '昌平区', type: '水位异常', status: '待处理', time: '10:10:30' },
])

// 进度统计
const completionRate = ref(78)
const avgHandleTime = ref(15)
const highPriorityCount = ref(8)

// 处理告警
const handleWarning = (id: number) => {
  realtimeWarnings.value = realtimeWarnings.value.filter((item) => item.id !== id)
}

// 清空告警
const clearWarnings = () => {
  realtimeWarnings.value = []
}
const handleDataChange = () => {}
const handleCityChange = () => {}
// 数据变更回调
// const handleDataChange = (data) => {
//   console.log('分类数据:', data)
// }

// 点击项回调
const handleItemClick = (data) => {
  console.log('选中项:', data)
}
// 事件点击回调
const handleEventClick = (event) => {
  console.log('点击事件:', event)
}

// 处理事件回调
const handleEventProcess = (event) => {
  console.log('处理事件:', event)
}

// 完成事件回调
const handleEventComplete = (event) => {
  console.log('完成事件:', event)
}

// 新事件回调
const handleNewEvent = (event) => {
  console.log('新增事件:', event)
}
// 指标刷新回调
const handleMetricsRefresh = (data) => {
  console.log('指标数据刷新:', data)
}

// 数值变化回调
const handleValueChange = (metric, value) => {
  console.log(`指标${metric}值变为:`, value)
}
// 数据变更回调
// const handleDataChange = (data) => {
//   console.log('趋势数据变更:', data)
// }

// 数据点点击回调
const handlePointClick = (data) => {
  console.log(`日期：${data.date}，问题数：${data.value}`)
}
// 监听数据变化
watch(
  [() => store.statistics, heatmapDate, trendType],
  () => {
    // 更新概览指标
    statsList.value[0].value = store.statistics.todayProblems
    statsList.value[1].value = store.statistics.errorDevices
    statsList.value[2].value = store.statistics.highPriority
    statsList.value[3].value = `${store.statistics.avgResponseTime}分钟`
    statsList.value[4].value = store.statistics.eventCount
    statsList.value[5].value = store.statistics.sensorErrorCount

    // 重新初始化图表
    // initCharts()
  },
  { deep: true },
)

onMounted(() => {
  // initCharts()

  // 模拟实时数据更新
  setInterval(() => {
    completionRate.value = Math.floor(Math.random() * 20) + 70
    avgHandleTime.value = Math.floor(Math.random() * 10) + 10
    highPriorityCount.value = Math.floor(Math.random() * 10) + 5
  }, 5000)
})
</script>

<style scoped>
.dashboard-container {
  width: 100%;
  height: 100%;
  color: #e2e8f0;
}

.stats-row {
  width: 100%;
}

.stat-card {
  background: linear-gradient(135deg, #1e293b, #0f172a);
  border: 1px solid #334155;
  text-align: center;
  padding: 15px 0;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 10px;
}

.stat-title {
  font-size: 14px;
  color: #94a3b8;
  margin-bottom: 5px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 5px;
}

.stat-trend {
  font-size: 12px;
}

.up {
  color: #2ed573;
}

.down {
  color: #ff4757;
}

.chart-row {
  height: calc(100% - 140px);
}

.chart-card,
.warning-card,
.realtime-card {
  background: linear-gradient(135deg, #1e293b, #0f172a);
  border: 1px solid #334155;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chart-container {
  flex: 1;
  width: 100%;
  height: 100%;
}

.small-chart {
  height: 200px;
}

.warning-card {
  height: calc(100% - 420px);
}

.warning-list {
  flex: 1;
  overflow: auto;
  padding: 10px;
}

.warning-item {
  display: flex;
  align-items: center;
  padding: 10px;
  margin-bottom: 8px;
  background-color: #0f172a;
  border-radius: 8px;
  border-left: 3px solid #ff4757;
}

.warning-item.new {
  animation: flash 1s infinite alternate;
}

@keyframes flash {
  from {
    background-color: #0f172a;
  }
  to {
    background-color: #27374d;
  }
}

.warning-icon {
  color: #ff4757;
  margin-right: 10px;
}

.warning-content {
  flex: 1;
}

.warning-text {
  font-size: 14px;
  margin-bottom: 4px;
}

.warning-time {
  font-size: 12px;
  color: #94a3b8;
}

.empty-warning {
  text-align: center;
  padding: 20px 0;
  color: #94a3b8;
}

.realtime-card {
  height: 120px;
}

.realtime-scroll {
  padding: 10px;
  border-bottom: 1px solid #334155;
}

.progress-item {
  margin-right: 20px;
  color: #e2e8f0;
}

.progress-stats {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 10px 0;
}

.rate {
  color: #00c6ff;
  font-weight: bold;
}

.danger {
  color: #ff4757;
}

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

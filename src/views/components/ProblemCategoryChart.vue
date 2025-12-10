<template>
  <div class="comparison-pie-container">
    <!-- 筛选工具栏 -->
    <div class="chart-toolbar">
      <el-select v-model="timeRange" size="small" @change="updateChart">
        <el-option label="今日" value="today"></el-option>
        <el-option label="本周" value="week"></el-option>
        <el-option label="本月" value="month"></el-option>
      </el-select>

      <el-select v-model="area" size="small" @change="updateChart">
        <el-option label="全部区域" value="all"></el-option>
        <el-option label="朝阳区" value="chaoyang"></el-option>
        <el-option label="海淀区" value="haidian"></el-option>
        <el-option label="西城区" value="xicheng"></el-option>
        <el-option label="东城区" value="dongcheng"></el-option>
      </el-select>

      <el-button size="small" type="primary" @click="refreshData">
        <el-icon><Refresh /></el-icon>刷新
      </el-button>

      <el-button size="small" type="text" @click="toggleViewMode">
        {{ isCompareMode ? '合并视图' : '对比视图' }}
      </el-button>
    </div>

    <!-- 图表容器 -->
    <div class="chart-content">
      <!-- 对比视图/合并视图切换 -->
      <div class="chart-wrapper" v-if="isCompareMode">
        <!-- 事件类问题 -->
        <div class="chart-item">
          <div class="chart-title">事件类问题</div>
          <div ref="eventChartRef" class="chart-main"></div>
          <div class="chart-stats">
            <div class="stat-item">
              <span class="label">总数：</span>
              <span class="value">{{ eventTotal }}</span>
              <span class="unit">起</span>
            </div>
            <div class="stat-item">
              <span class="label">占比：</span>
              <span class="value">{{ eventRatio }}%</span>
            </div>
          </div>
        </div>

        <!-- 传感器异常类问题 -->
        <div class="chart-item">
          <div class="chart-title">传感器异常类问题</div>
          <div ref="sensorChartRef" class="chart-main"></div>
          <div class="chart-stats">
            <div class="stat-item">
              <span class="label">总数：</span>
              <span class="value">{{ sensorTotal }}</span>
              <span class="unit">起</span>
            </div>
            <div class="stat-item">
              <span class="label">占比：</span>
              <span class="value">{{ sensorRatio }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 合并视图 -->
      <div class="chart-wrapper single-chart" v-else>
        <div ref="mergeChartRef" class="chart-main merge-chart"></div>

        <!-- 核心对比数据面板 -->
        <div class="comparison-panel">
          <div class="panel-title">核心分类对比</div>
          <div class="panel-content">
            <div class="comparison-item">
              <div class="item-label">事件类</div>
              <div class="item-value">{{ eventTotal }} 起</div>
              <div class="item-ratio">{{ eventRatio }}%</div>
              <div class="progress-bar">
                <div class="progress-fill event-fill" :style="{ width: eventRatio + '%' }"></div>
              </div>
            </div>

            <div class="comparison-item">
              <div class="item-label">传感器异常类</div>
              <div class="item-value">{{ sensorTotal }} 起</div>
              <div class="item-ratio">{{ sensorRatio }}%</div>
              <div class="progress-bar">
                <div class="progress-fill sensor-fill" :style="{ width: sensorRatio + '%' }"></div>
              </div>
            </div>

            <div class="comparison-item total-item">
              <div class="item-label">总计</div>
              <div class="item-value">{{ totalCount }} 起</div>
              <div class="item-ratio">100%</div>
              <div class="progress-bar">
                <div class="progress-fill total-fill" style="width: 100%"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 趋势分析 -->
    <div class="trend-analysis">
      <div class="trend-item">
        <span class="trend-label">事件类环比：</span>
        <span class="trend-value" :class="eventTrend > 0 ? 'up' : 'down'">
          {{ eventTrend > 0 ? '↑' : '↓' }}{{ Math.abs(eventTrend) }}%
        </span>
      </div>
      <div class="trend-item">
        <span class="trend-label">传感器异常环比：</span>
        <span class="trend-value" :class="sensorTrend > 0 ? 'up' : 'down'">
          {{ sensorTrend > 0 ? '↑' : '↓' }}{{ Math.abs(sensorTrend) }}%
        </span>
      </div>
      <div class="trend-item">
        <span class="trend-label">处置效率提升：</span>
        <span class="trend-value up">{{ handleEfficiency }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import type { ECharts, EChartsOption } from 'echarts'
import { Refresh } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

// Props定义
interface Props {
  // 自定义标题
  title?: string
  // 图表高度
  height?: string | number
  // 是否显示子分类
  showSubType?: boolean
  // 初始数据（可选）
  initData?: {
    event: Array<{ name: string; value: number }>
    sensor: Array<{ name: string; value: number }>
  }
}

const props = withDefaults(defineProps<Props>(), {
  title: '问题分类对比',
  height: '350px',
  showSubType: true,
  initData: () => ({ event: [], sensor: [] }),
})

// Emits定义
const emit = defineEmits<{
  (e: 'dataChange', data: { event: any[]; sensor: any[]; total: number }): void
  (e: 'itemClick', data: { type: 'event' | 'sensor'; item: any }): void
}>()

// 响应式数据
const timeRange = ref('today')
const area = ref('all')
const isCompareMode = ref(false) // 对比视图/合并视图切换
// 图表实例
let eventChart: ECharts | null = null
let sensorChart: ECharts | null = null
let mergeChart: ECharts | null = null
// DOM引用
const eventChartRef = ref<HTMLDivElement>()
const sensorChartRef = ref<HTMLDivElement>()
const mergeChartRef = ref<HTMLDivElement>()
// 统计数据
const eventTotal = ref(0)
const sensorTotal = ref(0)
const totalCount = ref(0)
const eventRatio = ref(0)
const sensorRatio = ref(0)
// 趋势数据
const eventTrend = ref(5)
const sensorTrend = ref(-3)
const handleEfficiency = ref(8)

// 基础分类数据
// 事件类子类型
const eventSubTypes = [
  { name: '交通拥堵', value: 0, color: '#00c6ff' },
  { name: '噪音扰民', value: 0, color: '#ffa801' },
  { name: '环境异常', value: 0, color: '#ff4757' },
  { name: '公共设施损坏', value: 0, color: '#00d2d3' },
]

// 传感器异常子类型
const sensorSubTypes = [
  { name: '数据采集异常', value: 0, color: '#7b61ff' },
  { name: '设备离线', value: 0, color: '#5f27cd' },
  { name: '信号中断', value: 0, color: '#3742fa' },
  { name: '硬件故障', value: 0, color: '#18dcff' },
]

// 生成模拟数据
const generateChartData = () => {
  // 基础乘数（根据时间范围调整）
  const timeMultiplier = {
    today: 1,
    week: 3,
    month: 5,
  }[timeRange.value] || 1

  // 区域乘数
  const areaMultiplier = area.value === 'all' ? 1 : 0.7

  // 生成事件类数据
  const eventData = eventSubTypes.map((item) => {
    // 使用初始数据或生成随机数
    const initItem = props.initData.event.find((i) => i.name === item.name)
    const value =
      initItem?.value || Math.floor(Math.random() * 60 * timeMultiplier * areaMultiplier) + 15
    return { ...item, value }
  })

  // 生成传感器异常数据
  const sensorData = sensorSubTypes.map((item) => {
    const initItem = props.initData.sensor.find((i) => i.name === item.name)
    const value =
      initItem?.value || Math.floor(Math.random() * 40 * timeMultiplier * areaMultiplier) + 10
    return { ...item, value }
  })

  // 计算总数和占比
  eventTotal.value = eventData.reduce((sum, item) => sum + item.value, 0)
  sensorTotal.value = sensorData.reduce((sum, item) => sum + item.value, 0)
  totalCount.value = eventTotal.value + sensorTotal.value

  // 计算占比
  eventRatio.value = Math.round((eventTotal.value / totalCount.value) * 100)
  sensorRatio.value = Math.round((sensorTotal.value / totalCount.value) * 100)

  // 随机生成趋势数据
  eventTrend.value = Math.floor(Math.random() * 10) * (Math.random() > 0.6 ? 1 : -1)
  sensorTrend.value = Math.floor(Math.random() * 8) * (Math.random() > 0.4 ? 1 : -1)
  handleEfficiency.value = Math.floor(Math.random() * 10) + 5

  return { eventData, sensorData }
}

// 初始化事件类图表
const initEventChart = (data: any[]) => {
  if (!eventChartRef.value) return

  // 销毁原有实例
  if (eventChart) eventChart.dispose()

  // 创建新实例
  eventChart = echarts.init(eventChartRef.value)

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => `
        <div style="color:#e2e8f0;">
          <p><strong>${params.name}</strong></p>
          <p>数量：${params.value} 起</p>
          <p>占比：${((params.value / eventTotal.value) * 100).toFixed(1)}%</p>
        </div>
      `,
      backgroundColor: 'rgba(15, 23, 42, 0.8)',
      borderColor: '#334155',
      borderWidth: 1,
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
    },
    series: [
      {
        name: '事件类',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '50%'],
        data,
        label: {
          show: props.showSubType,
          formatter: '{b}: {c}',
          color: '#e2e8f0',
          fontSize: 11,
        },
        labelLine: {
          show: true,
          lineStyle: { color: '#94a3b8' },
        },
        itemStyle: {
          color: (params: any) => params.data.color,
          borderColor: '#0f172a',
          borderWidth: 2,
        },
      },
    ],
  }

  eventChart.setOption(option)

  // 绑定点击事件
  eventChart.on('click', (params: any) => {
    emit('itemClick', { type: 'event', item: params.data })
  })
}

// 初始化传感器异常图表
const initSensorChart = (data: any[]) => {
  if (!sensorChartRef.value) return

  if (sensorChart) sensorChart.dispose()
  sensorChart = echarts.init(sensorChartRef.value)

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => `
        <div style="color:#e2e8f0;">
          <p><strong>${params.name}</strong></p>
          <p>数量：${params.value} 起</p>
          <p>占比：${((params.value / sensorTotal.value) * 100).toFixed(1)}%</p>
        </div>
      `,
      backgroundColor: 'rgba(15, 23, 42, 0.8)',
      borderColor: '#334155',
      borderWidth: 1,
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
    },
    series: [
      {
        name: '传感器异常',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '50%'],
        data,
        label: {
          show: props.showSubType,
          formatter: '{b}: {c}',
          color: '#e2e8f0',
          fontSize: 11,
        },
        labelLine: {
          show: true,
          lineStyle: { color: '#94a3b8' },
        },
        itemStyle: {
          color: (params: any) => params.data.color,
          borderColor: '#0f172a',
          borderWidth: 2,
        },
      },
    ],
  }

  sensorChart.setOption(option)

  sensorChart.on('click', (params: any) => {
    emit('itemClick', { type: 'sensor', item: params.data })
  })
}

// 初始化合并视图图表
const initMergeChart = () => {
  if (!mergeChartRef.value) return

  if (mergeChart) mergeChart.dispose()
  mergeChart = echarts.init(mergeChartRef.value)

  // 合并数据（仅显示大类）
  const mergeData = [
    { name: '事件类', value: eventTotal.value, color: '#00c6ff' },
    { name: '传感器异常类', value: sensorTotal.value, color: '#7b61ff' },
  ]

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => `
        <div style="color:#e2e8f0;">
          <p><strong>${params.name}</strong></p>
          <p>数量：${params.value} 起</p>
          <p>占比：${((params.value / totalCount.value) * 100).toFixed(1)}%</p>
        </div>
      `,
      backgroundColor: 'rgba(15, 23, 42, 0.8)',
      borderColor: '#334155',
      borderWidth: 1,
    },
    legend: {
      orient: 'horizontal',
      bottom: '5%',
      left: 'center',
      textStyle: { color: '#e2e8f0', fontSize: 14 },
    },
    series: [
      {
        name: '问题分类',
        type: 'pie',
        radius: ['30%', '70%'],
        center: ['50%', '40%'],
        data: mergeData,
        label: {
          show: true,
          formatter: '{b}: {c} ({d}%)',
          color: '#e2e8f0',
          fontSize: 13,
          fontWeight: '500',
        },
        labelLine: {
          show: true,
          lineStyle: { color: '#94a3b8' },
        },
        itemStyle: {
          color: (params: any) => params.data.color,
          borderColor: '#0f172a',
          borderWidth: 3,
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.3)',
        },
        emphasis: {
          scale: true,
          scaleSize: 10,
        },
      },
    ],
  }

  mergeChart.setOption(option)

  mergeChart.on('click', (params: any) => {
    emit('itemClick', {
      type: params.name === '事件类' ? 'event' : 'sensor',
      item: params.data,
    })
  })
}

// 更新图表
const updateChart = () => {
  const { eventData, sensorData } = generateChartData()

  if (isCompareMode.value) {
    initEventChart(eventData)
    initSensorChart(sensorData)
  } else {
    initMergeChart()
  }

  // 触发数据变更事件
  emit('dataChange', {
    event: eventData,
    sensor: sensorData,
    total: totalCount.value,
  })
}

// 刷新数据
const refreshData = () => {
  // 显示加载动画
  const allCharts = [eventChart, sensorChart, mergeChart].filter(Boolean)
  allCharts.forEach((chart) => {
    chart?.showLoading({
      text: '加载中...',
      color: '#00c6ff',
      textColor: '#e2e8f0',
      maskColor: 'rgba(15, 23, 42, 0.5)',
    })
  })

  setTimeout(() => {
    updateChart()
    allCharts.forEach((chart) => chart?.hideLoading())
  }, 800)
}

// 切换视图模式
const toggleViewMode = () => {
  isCompareMode.value = !isCompareMode.value
  updateChart()
}

// 处理窗口大小变化
const handleResize = () => {
  eventChart?.resize()
  sensorChart?.resize()
  mergeChart?.resize()
}

// 监听Props变化
watch(
  [() => props.initData, () => props.showSubType],
  () => {
    updateChart()
  },
  { deep: true },
)

// 组件挂载
onMounted(() => {
  updateChart()
  window.addEventListener('resize', handleResize)
})

// 组件卸载
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  eventChart?.dispose()
  sensorChart?.dispose()
  mergeChart?.dispose()
  eventChart = null
  sensorChart = null
  mergeChart = null
})
</script>

<style scoped>
.comparison-pie-container {
  width: 100%;
  background-color: #0f172a;
  border-radius: 8px;
  border: 1px solid #334155;
  overflow: hidden;
}

/* 工具栏 */
.chart-toolbar {
  padding: 10px 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  background: linear-gradient(90deg, #1e293b, #0f172a);
  border-bottom: 1px solid #334155;
}

/* 图表内容区 */
.chart-content {
  padding: 15px;
}

/* 对比视图 */
.chart-wrapper {
  display: flex;
  gap: 20px;
  height: v-bind(height);
}

.chart-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #1e293b;
  border-radius: 8px;
  padding: 10px;
  border: 1px solid #475569;
}

.chart-title {
  text-align: center;
  color: #00c6ff;
  font-size: 16px;
  margin-bottom: 10px;
  font-weight: 500;
}

.chart-main {
  flex: 1;
  min-height: 200px;
}

/* 合并视图 */
.single-chart {
  flex-direction: row;
  height: v-bind(height);
}

.merge-chart {
  flex: 2;
  min-height: 300px;
}

/* 对比面板 */
.comparison-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 20px;
  background-color: #1e293b;
  border-radius: 8px;
  border: 1px solid #475569;
}

.panel-title {
  color: #00c6ff;
  font-size: 18px;
  text-align: center;
  margin-bottom: 20px;
  font-weight: 500;
}

.panel-content {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.comparison-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-label {
  color: #94a3b8;
  font-size: 14px;
}

.item-value {
  color: #e2e8f0;
  font-size: 20px;
  font-weight: bold;
}

.item-ratio {
  color: #00c6ff;
  font-size: 16px;
  font-weight: 500;
}

.progress-bar {
  height: 8px;
  background-color: #0f172a;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #334155;
}

.progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.5s ease;
}

.event-fill {
  background: linear-gradient(90deg, #00c6ff, #00a8e8);
}

.sensor-fill {
  background: linear-gradient(90deg, #7b61ff, #5f27cd);
}

.total-fill {
  background: linear-gradient(90deg, #00c6ff, #7b61ff);
}

.total-item {
  opacity: 0.8;
}

/* 图表统计 */
.chart-stats {
  display: flex;
  justify-content: space-around;
  padding: 10px 0;
  border-top: 1px dashed #334155;
  margin-top: 10px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.stat-item .label {
  color: #94a3b8;
  font-size: 14px;
}

.stat-item .value {
  color: #00c6ff;
  font-size: 16px;
  font-weight: bold;
}

.stat-item .unit {
  color: #94a3b8;
  font-size: 14px;
}

/* 趋势分析 */
.trend-analysis {
  padding: 15px 20px;
  display: flex;
  justify-content: space-around;
  background: linear-gradient(90deg, #0f172a, #1e293b);
  border-top: 1px solid #334155;
}

.trend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.trend-label {
  color: #94a3b8;
  font-size: 14px;
}

.trend-value {
  color: #e2e8f0;
  font-size: 16px;
  font-weight: bold;
}

.up {
  color: #2ed573;
}

.down {
  color: #ff4757;
}

/* 响应式适配 */
@media (max-width: 992px) {
  .chart-wrapper {
    flex-direction: column;
    height: auto;
  }

  .single-chart {
    flex-direction: column;
  }

  .merge-chart {
    min-height: 250px;
  }

  .comparison-panel {
    margin-top: 20px;
  }
}

@media (max-width: 576px) {
  .chart-toolbar {
    flex-wrap: wrap;
    gap: 10px;
  }

  .trend-analysis {
    flex-direction: column;
    gap: 10px;
    padding: 10px;
  }

  .trend-item {
    justify-content: center;
  }
}
</style>

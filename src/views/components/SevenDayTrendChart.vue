<template>
  <div class="seven-day-problem-trend-chart">
    <!-- 标题栏 -->
    <div class="chart-header">
      <div class="header-left">
        <el-icon class="header-icon"><TrendCharts /></el-icon>
        <h3 class="header-title">{{ title }}</h3>
      </div>
      <div class="header-right">
        <el-button size="mini" type="text" @click="refreshData" class="refresh-btn">
          <el-icon><Refresh /></el-icon>刷新
        </el-button>
        <el-select v-model="chartMode" size="small" @change="updateChart" class="mode-select">
          <el-option label="折线图" value="line"></el-option>
          <el-option label="面积图" value="area"></el-option>
          <el-option label="柱状图" value="bar"></el-option>
        </el-select>
      </div>
    </div>

    <!-- 关键指标卡片 -->
    <div class="metric-cards">
      <div class="metric-card">
        <div class="metric-label">日均问题数</div>
        <div class="metric-value">{{ avgValue }}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">最高值</div>
        <div class="metric-value high">{{ maxValue }}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">最低值</div>
        <div class="metric-value low">{{ minValue }}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">环比变化</div>
        <div class="metric-value" :class="changeRate > 0 ? 'up' : changeRate < 0 ? 'down' : 'flat'">
          {{ changeRate > 0 ? '↑' : changeRate < 0 ? '↓' : '' }}{{ Math.abs(changeRate) }}%
        </div>
      </div>
    </div>

    <!-- 图表容器 -->
    <div ref="chartContainer" class="chart-main"></div>

    <!-- 数据说明 -->
    <div class="chart-footer">
      <span class="footer-text">数据周期：{{ startDate }} - {{ endDate }}</span>
      <span class="footer-text">最后更新：{{ updateTime }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import type { ECharts, EChartsOption } from 'echarts'
import { TrendCharts, Refresh } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

// Props定义
interface Props {
  title?: string
  height?: string | number
  themeColor?: string
  autoRefresh?: boolean
  refreshInterval?: number // 单位：秒
}

const props = withDefaults(defineProps<Props>(), {
  title: '近7天问题数量变化趋势',
  height: '380px',
  themeColor: '#00c6ff',
  autoRefresh: true,
  refreshInterval: 300, // 5分钟
})

// Emits定义
const emit = defineEmits<{
  (e: 'dataRefresh', data: any): void
  (e: 'pointClick', data: { date: string; value: number }): void
}>()

// 响应式数据
const chartContainer = ref<HTMLDivElement>()
const chartMode = ref('line')
const updateTime = ref(dayjs().format('YYYY-MM-DD HH:mm:ss'))
const startDate = ref('')
const endDate = ref('')

// 统计数据
const avgValue = ref(0)
const maxValue = ref(0)
const minValue = ref(0)
const changeRate = ref(0)

// 图表实例
let chartInstance: ECharts | null = null
// 定时器
let refreshTimer: NodeJS.Timeout | null = null

// 生成贴近真实业务的7天模拟数据
const generateRealisticData = () => {
  // 1. 生成日期标签（近7天）
  const dates: string[] = []
  const today = dayjs()
  for (let i = 6; i >= 0; i--) {
    const date = today.subtract(i, 'day')
    dates.push(date.format('MM-DD'))
  }
  startDate.value = dates[0]
  endDate.value = dates[6]

  // 2. 生成符合业务规律的问题数量
  const values: number[] = []
  // 基础配置（模拟真实业务特征）
  const base = 70 // 基础值
  const weekdayStep = 15 // 工作日波动步长
  const weekendStep = 8 // 周末波动步长
  const abnormalRate = 0.2 // 异常值概率
  const trend = Math.random() > 0.5 ? 2 : -2 // 整体趋势

  for (let i = 0; i < 7; i++) {
    const day = today.subtract(i, 'day').day()
    const isWeekend = day === 0 || day === 6

    // 基础值（工作日高，周末低）
    let val = isWeekend
      ? base - 10 + Math.floor(Math.random() * weekendStep)
      : base + Math.floor(Math.random() * weekdayStep)

    // 整体趋势
    val += trend * i

    // 随机异常值（突发问题）
    if (Math.random() < abnormalRate) {
      val = isWeekend ? val * 1.6 : val * 1.9
    }

    // 确保数值为正
    values.push(Math.max(10, Math.round(val)))
  }

  // 3. 计算统计指标
  avgValue.value = Math.round(values.reduce((a, b) => a + b, 0) / 7)
  maxValue.value = Math.max(...values)
  minValue.value = Math.min(...values)

  // 4. 计算环比（对比前7天）
  const lastPeriodAvg = 75 + Math.floor(Math.random() * 20) // 前7天均值
  changeRate.value = Math.round(((avgValue.value - lastPeriodAvg) / lastPeriodAvg) * 100)

  // 5. 更新时间
  updateTime.value = dayjs().format('YYYY-MM-DD HH:mm:ss')

  return { dates, values }
}

// 初始化图表
const initChart = () => {
  if (!chartContainer.value) return

  // 销毁旧实例
  if (chartInstance) {
    chartInstance.dispose()
  }

  // 创建新实例
  chartInstance = echarts.init(chartContainer.value)
  const { dates, values } = generateRealisticData()

  // 图表配置
  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
        lineStyle: { color: `${props.themeColor}30` },
      },
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      borderColor: '#334155',
      borderWidth: 1,
      padding: 12,
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: (params: any) => {
        const [p] = params
        return `<div>
          <p style="font-weight:600;margin-bottom:6px;">${p.axisValue}</p>
          <p style="color:${props.themeColor};">问题数量：${p.value} 件</p>
        </div>`
      },
    },
    grid: {
      left: '4%',
      right: '4%',
      bottom: '10%',
      top: '5%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#94a3b8', fontSize: 12 },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 0,
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: {
        color: '#94a3b8',
        fontSize: 12,
        formatter: '{value} 件',
      },
      splitLine: {
        lineStyle: { color: '#1e293b', type: 'dashed' },
      },
    },
    series: [
      {
        name: '问题数量',
        type: chartMode.value,
        data: values,
        smooth: chartMode.value !== 'bar',
        color: props.themeColor,
        lineStyle: { width: 3 },
        itemStyle: {
          borderRadius: chartMode.value === 'bar' ? 4 : 0,
          borderColor: '#0f172a',
          borderWidth: 2,
        },
        symbol: chartMode.value !== 'bar' ? 'circle' : undefined,
        symbolSize: chartMode.value !== 'bar' ? 8 : undefined,
        // 面积图配置
        areaStyle:
          chartMode.value === 'area'
            ? {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: `${props.themeColor}80` },
                  { offset: 1, color: `${props.themeColor}10` },
                ]),
              }
            : undefined,
        // 数值标注
        label: {
          show: true,
          position: chartMode.value === 'bar' ? 'top' : 'top',
          color: '#e2e8f0',
          fontSize: 11,
          formatter: '{c}',
        },
        // 极值标记
        markPoint: {
          data: [
            { type: 'max', name: '峰值', itemStyle: { color: '#ff4757' } },
            { type: 'min', name: '谷值', itemStyle: { color: '#2ed573' } },
          ],
          label: { color: '#fff', fontSize: 10 },
        },
        // 平均值线
        markLine: {
          data: [{ type: 'average', name: '均值' }],
          lineStyle: { color: '#ffa801', type: 'dashed' },
          label: { color: '#ffa801', fontSize: 10 },
        },
      },
    ],
  }

  // 设置配置
  chartInstance.setOption(option)

  // 绑定点击事件
  chartInstance.on('click', (params: any) => {
    emit('pointClick', {
      date: dates[params.dataIndex],
      value: params.value,
    })
  })

  // 触发数据刷新事件
  emit('dataRefresh', {
    dates,
    values,
    avg: avgValue.value,
    max: maxValue.value,
    min: minValue.value,
    changeRate: changeRate.value,
  })
}

// 更新图表
const updateChart = () => {
  initChart()
}

// 手动刷新数据
const refreshData = () => {
  chartInstance?.showLoading({
    text: '加载中...',
    color: props.themeColor,
    textColor: '#e2e8f0',
    maskColor: 'rgba(15, 23, 42, 0.5)',
  })

  setTimeout(() => {
    initChart()
    chartInstance?.hideLoading()
  }, 600)
}

// 启动自动刷新
const startAutoRefresh = () => {
  if (!props.autoRefresh || refreshTimer) return

  refreshTimer = setInterval(() => {
    refreshData()
  }, props.refreshInterval * 1000)
}

// 停止自动刷新
const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

// 处理窗口大小变化
const handleResize = () => {
  chartInstance?.resize()
}

// 监听配置变化
watch(
  [() => props.themeColor, chartMode],
  () => {
    initChart()
  },
  { deep: true },
)

// 生命周期
onMounted(() => {
  initChart()
  startAutoRefresh()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  stopAutoRefresh()
  window.removeEventListener('resize', handleResize)
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})
</script>

<style scoped>
.seven-day-problem-trend-chart {
  width: 100%;
  background-color: #0f172a;
  border-radius: 8px;
  border: 1px solid #334155;
  overflow: hidden;
  font-family: 'Inter', system-ui, sans-serif;
}

/* 标题栏 */
.chart-header {
  padding: 12px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(90deg, #1e293b, #0f172a);
  border-bottom: 1px solid #334155;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  color: v-bind(props.themeColor);
  font-size: 18px;
}

.header-title {
  margin: 0;
  color: #e2e8f0;
  font-size: 16px;
  font-weight: 500;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.refresh-btn {
  color: #94a3b8;
  transition: color 0.2s;
}

.refresh-btn:hover {
  color: v-bind(props.themeColor);
}

.mode-select {
  width: 100px;
}

/* 指标卡片 */
.metric-cards {
  padding: 10px 20px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  background-color: #1e293b;
  border-bottom: 1px solid #334155;
}

.metric-card {
  text-align: center;
}

.metric-label {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 4px;
  display: block;
}

.metric-value {
  font-size: 18px;
  font-weight: 600;
  color: #e2e8f0;
}

.metric-value.high {
  color: #ff4757;
}

.metric-value.low {
  color: #2ed573;
}

.metric-value.up {
  color: #ff4757;
}

.metric-value.down {
  color: #2ed573;
}

.metric-value.flat {
  color: #94a3b8;
}

/* 图表主体 */
.chart-main {
  width: 100%;
  height: v-bind(height);
  padding: 10px;
}

/* 页脚 */
.chart-footer {
  padding: 8px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #1e293b;
  border-top: 1px solid #334155;
  font-size: 12px;
  color: #64748b;
}

.footer-text {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 响应式适配 */
@media (max-width: 992px) {
  .metric-cards {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
}

@media (max-width: 576px) {
  .chart-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 10px;
  }

  .metric-cards {
    grid-template-columns: 1fr;
    padding: 10px;
  }

  .chart-main {
    height: 300px;
  }

  .chart-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
    padding: 8px 10px;
  }
}
</style>

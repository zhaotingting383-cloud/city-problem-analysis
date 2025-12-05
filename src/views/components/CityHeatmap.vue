<template>
  <div class="heatmap-container">
    <!-- 筛选工具栏 -->
    <div class="heatmap-toolbar">
      <el-select v-model="city" size="small" @change="handleCityChange">
        <el-option label="北京市" value="beijing"></el-option>
        <el-option label="上海市" value="shanghai"></el-option>
        <el-option label="广州市" value="guangzhou"></el-option>
      </el-select>

      <el-select v-model="timeRange" size="small" @change="handleTimeRangeChange">
        <el-option label="今日" value="today"></el-option>
        <el-option label="本周" value="week"></el-option>
        <el-option label="本月" value="month"></el-option>
      </el-select>

      <el-select v-model="problemType" size="small" @change="handleTypeChange">
        <el-option label="全部类型" value="all"></el-option>
        <el-option label="交通拥堵" value="traffic"></el-option>
        <el-option label="设备故障" value="device"></el-option>
        <el-option label="环境异常" value="environment"></el-option>
      </el-select>

      <el-button size="small" type="primary" @click="refreshData">
        <el-icon><Refresh /></el-icon>刷新
      </el-button>

      <el-button size="small" type="text" @click="toggleLegend">
        {{ showLegend ? '隐藏图例' : '显示图例' }}
      </el-button>
    </div>

    <!-- 热力图容器 -->
    <div ref="heatmapRef" class="heatmap-chart"></div>

    <!-- 数据统计卡片 -->
    <div class="heatmap-stats">
      <el-card class="stat-card">
        <div class="stat-title">问题总数</div>
        <div class="stat-value">{{ totalCount }}</div>
        <div class="stat-trend" :class="totalTrend > 0 ? 'up' : 'down'">
          {{ totalTrend > 0 ? '↑' : '↓' }}{{ Math.abs(totalTrend) }}%
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-title">高优先级占比</div>
        <div class="stat-value">{{ highPriorityRate }}%</div>
        <div class="stat-desc">主要分布：{{ highPriorityArea }}</div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-title">处置完成率</div>
        <div class="stat-value">{{ completionRate }}%</div>
        <div class="stat-trend" :class="completionTrend > 0 ? 'up' : 'down'">
          {{ completionTrend > 0 ? '↑' : '↓' }}{{ Math.abs(completionTrend) }}%
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import type { ECharts, EChartsOption } from 'echarts'
import { Refresh } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
interface typeMap {
  traffic: string;
  device: string;
  environment: string;
}
// 定义Props
interface Props {
  // 热力图数据格式：[经度, 纬度, 问题数量, 问题类型]
  data?: [number, number, number, string][]
  // 默认城市
  defaultCity?: string
  // 加载状态
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  defaultCity: 'beijing',
  loading: false,
})

// 定义Emits
const emit = defineEmits<{
  (e: 'dataChange', data: [number, number, number, string][]): void
  (e: 'cityChange', city: string): void
}>()

// 响应式数据
const heatmapRef = ref<HTMLDivElement>()
const city = ref(props.defaultCity)
const timeRange = ref('today')
const problemType = ref('all')
const showLegend = ref(true)
const totalCount = ref(0)
const totalTrend = ref(5)
const highPriorityRate = ref(28)
const highPriorityArea = ref('朝阳区、海淀区')
const completionRate = ref(78)
const completionTrend = ref(3)

// ECharts实例
let heatmapChart: ECharts | null = null

// 城市地图配置（经纬度范围、地图名称）
const cityConfig = {
  beijing: {
    name: '北京',
    geoJson: 'https://geo.datav.aliyun.com/areas_v3/bound/110000_full.json',
    center: [116.403963, 39.915119],
    zoom: 11,
  },
  shanghai: {
    name: '上海',
    geoJson: 'https://geo.datav.aliyun.com/areas_v3/bound/310000_full.json',
    center: [121.473701, 31.230416],
    zoom: 11,
  },
  guangzhou: {
    name: '广东',
    geoJson: 'https://geo.datav.aliyun.com/areas_v3/bound/440000_full.json',
    center: [113.264388, 23.12911],
    zoom: 9,
  },
}

// 模拟热力图数据（实际项目替换为接口数据）
const generateHeatmapData = (): [number, number, number, string][] => {
  const config = cityConfig[city.value as keyof typeof cityConfig]
  const baseLng = config.center[0] | 0
  const baseLat = config.center[1] | 0

  // 生成随机热力点
  const data: [number, number, number, string][] = []
  const types = ['traffic', 'device', 'environment']

  // 不同区域的问题密度
  const areas = [
    { lngOffset: 0.1, latOffset: 0.1, count: 30, type: 'traffic' }, // 核心区-交通
    { lngOffset: -0.1, latOffset: 0.1, count: 25, type: 'device' }, // 西区-设备
    { lngOffset: 0.1, latOffset: -0.1, count: 20, type: 'environment' }, // 南区-环境
    { lngOffset: -0.1, latOffset: -0.1, count: 15, type: 'traffic' }, // 北区-混合
    { lngOffset: 0.2, latOffset: 0, count: 18, type: 'device' }, // 东区-设备
    { lngOffset: 0, latOffset: 0.2, count: 22, type: 'environment' }, // 中区-环境
  ]

  // 生成基础数据
  areas.forEach((area) => {
    const lng = baseLng + area.lngOffset + (Math.random() - 0.5) * 0.1
    const lat = baseLat + area.latOffset + (Math.random() - 0.5) * 0.1
    const count = Math.floor(area.count * (0.8 + Math.random() * 0.4))

    // 时间范围过滤
    const timeMultiplier = timeRange.value === 'today' ? 1 : timeRange.value === 'week' ? 3 : 5
    const finalCount = count * timeMultiplier

    data.push([lng, lat, finalCount, area.type])
  })

  // 类型过滤
  if (problemType.value !== 'all') {
    return data.filter((item) => item[3] === problemType.value)
  }

  return data
}

// 初始化热力图
const initHeatmap = () => {
  if (!heatmapRef.value) return

  // 销毁原有实例
  if (heatmapChart) {
    heatmapChart.dispose()
  }

  // 创建新实例
  heatmapChart = echarts.init(heatmapRef.value)

  // 获取城市配置
  const config = cityConfig[city.value as keyof typeof cityConfig]

  // 基础配置
  const option: EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: (params: typeMap) => {
        const typeMap = {
          traffic: '交通拥堵',
          device: '设备故障',
          environment: '环境异常',
        }
        return `
          <div style="color:#e2e8f0;">
            <p>位置：${params.name || '未知区域'}</p>
            <p>问题数量：${params.value[2]}起</p>
            <p>问题类型：${typeMap[params.value[3]] || '其他'}</p>
            <p>时间范围：${timeRange.value === 'today' ? '今日' : timeRange.value === 'week' ? '本周' : '本月'}</p>
          </div>
        `
      },
      textStyle: { color: '#e2e8f0' },
      backgroundColor: 'rgba(15, 23, 42, 0.8)',
      borderColor: '#334155',
      borderWidth: 1,
    },
    geo: {
      map: config.name,
      roam: true, // 支持缩放、拖拽
      center: config.center,
      zoom: config.zoom,
      label: {
        show: true,
        color: '#e2e8f0',
        fontSize: 12,
      },
      itemStyle: {
        areaColor: 'rgba(15, 23, 42, 0.6)',
        borderColor: '#334155',
        borderWidth: 1,
      },
      emphasis: {
        label: {
          color: '#00c6ff',
        },
        itemStyle: {
          areaColor: 'rgba(30, 41, 59, 0.8)',
        },
      },
    },
    visualMap: {
      show: showLegend.value,
      type: 'continuous',
      min: 0,
      max: 100,
      left: 'left',
      bottom: '20px',
      text: ['高', '低'],
      textStyle: { color: '#e2e8f0' },
      calculable: true,
      inRange: {
        color: [
          'rgba(0, 198, 255, 0.1)', // 低密度
          'rgba(0, 198, 255, 0.3)', // 中低密度
          'rgba(75, 97, 255, 0.5)', // 中密度
          'rgba(255, 71, 87, 0.7)', // 中高密度
          'rgba(255, 71, 87, 0.9)', // 高密度
        ],
      },
      borderColor: '#334155',
      backgroundColor: 'rgba(15, 23, 42, 0.5)',
    },
    series: [
      {
        type: 'heatmap',
        coordinateSystem: 'geo',
        data: generateHeatmapData(),
        pointSize: 15, // 热力点大小
        blurSize: 20, // 模糊程度
        maxOpacity: 0.8,
        minOpacity: 0.1,
      },
    ],
  }

  // 设置配置项
  heatmapChart.setOption(option)

  // 更新统计数据
  updateStats()

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
}

// 更新统计数据
const updateStats = () => {
  const data = generateHeatmapData()
  // 计算总数
  totalCount.value = data.reduce((sum, item) => sum + item[2], 0)

  // 计算高优先级占比（模拟）
  const highPriorityCount = Math.floor(totalCount.value * 0.28)
  highPriorityRate.value = Math.round((highPriorityCount / totalCount.value) * 100)

  // 计算完成率（模拟）
  completionRate.value = 70 + Math.floor(Math.random() * 15)

  // 模拟趋势
  totalTrend.value = Math.floor(Math.random() * 10) * (Math.random() > 0.5 ? 1 : -1)
  completionTrend.value = Math.floor(Math.random() * 5) * (Math.random() > 0.5 ? 1 : -1)
}

// 处理城市切换
const handleCityChange = () => {
  emit('cityChange', city.value)
  initHeatmap()
}

// 处理时间范围切换
const handleTimeRangeChange = () => {
  initHeatmap()
}

// 处理类型切换
const handleTypeChange = () => {
  const filteredData = generateHeatmapData()
  emit('dataChange', filteredData)
  initHeatmap()
}

// 刷新数据
const refreshData = () => {
  initHeatmap()
}

// 切换图例显示
const toggleLegend = () => {
  showLegend.value = !showLegend.value
  if (heatmapChart) {
    heatmapChart.setOption({
      visualMap: {
        show: showLegend.value,
      },
    })
  }
}

// 处理窗口大小变化
const handleResize = () => {
  if (heatmapChart) {
    heatmapChart.resize()
  }
}

// 监听Props变化
watch(
  [() => props.data, () => props.loading],
  () => {
    initHeatmap()
  },
  { deep: true },
)

// 组件挂载时初始化
onMounted(() => {
  // 注册地图（使用阿里云地图JSON）
  fetch(cityConfig[city.value as keyof typeof cityConfig].geoJson)
    .then((res) => res.json())
    .then((geoJson) => {
      echarts.registerMap(cityConfig[city.value as keyof typeof cityConfig].name, geoJson)
      initHeatmap()
    })
    .catch((err) => {
      console.error('地图数据加载失败:', err)
      // 降级使用默认地图
      initHeatmap()
    })
})

// 组件卸载时销毁
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (heatmapChart) {
    heatmapChart.dispose()
    heatmapChart = null
  }
})
</script>

<style scoped>
.heatmap-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #0f172a;
  border-radius: 8px;
  overflow: hidden;
}

/* 工具栏样式 */
.heatmap-toolbar {
  padding: 10px 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  background: linear-gradient(90deg, #1e293b, #0f172a);
  border-bottom: 1px solid #334155;
}

/* 热力图容器 */
.heatmap-chart {
  flex: 1;
  width: 100%;
  min-height: 500px;
}

/* 统计卡片 */
.heatmap-stats {
  display: flex;
  gap: 20px;
  padding: 15px 20px;
  background-color: #0f172a;
  border-top: 1px solid #334155;
}

.stat-card {
  flex: 1;
  background: linear-gradient(135deg, #1e293b, #0f172a);
  border: 1px solid #334155;
  text-align: center;
  padding: 10px;
}

.stat-title {
  font-size: 14px;
  color: #94a3b8;
  margin-bottom: 5px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #00c6ff;
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

.stat-desc {
  font-size: 12px;
  color: #94a3b8;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .heatmap-stats {
    flex-direction: column;
    gap: 10px;
  }

  .heatmap-toolbar {
    flex-wrap: wrap;
    gap: 10px;
  }

  .heatmap-chart {
    min-height: 300px;
  }
}
</style>

<template>
  <div class="data-filter-container">
    <el-card class="filter-card" shadow="hover">
      <template #header>
        <span>多维筛选与对比分析</span>
      </template>

      <!-- 筛选条件 -->
      <el-row :gutter="20" class="filter-row">
        <el-col :span="4">
          <el-form-item label="时间范围">
            <el-date-picker
              v-model="filterForm.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              class="filter-input"
            ></el-date-picker>
          </el-form-item>
        </el-col>
        <el-col :span="3">
          <el-form-item label="问题类型">
            <el-select v-model="filterForm.type" placeholder="全部类型" class="filter-input">
              <el-option label="全部类型" value="all"></el-option>
              <el-option label="事件类" value="event"></el-option>
              <el-option label="传感器异常" value="sensor_error"></el-option>
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="3">
          <el-form-item label="优先级">
            <el-select v-model="filterForm.priority" placeholder="全部优先级" class="filter-input">
              <el-option label="全部优先级" value="all"></el-option>
              <el-option label="高" value="high"></el-option>
              <el-option label="中" value="medium"></el-option>
              <el-option label="低" value="low"></el-option>
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="3">
          <el-form-item label="处置状态">
            <el-select v-model="filterForm.status" placeholder="全部状态" class="filter-input">
              <el-option label="全部状态" value="all"></el-option>
              <el-option label="待处理" value="pending"></el-option>
              <el-option label="处理中" value="processing"></el-option>
              <el-option label="已处理" value="resolved"></el-option>
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="3">
          <el-form-item label="区域">
            <el-select v-model="filterForm.area" placeholder="全部区域" class="filter-input">
              <el-option label="全部区域" value="all"></el-option>
              <el-option label="朝阳区" value="朝阳区"></el-option>
              <el-option label="海淀区" value="海淀区"></el-option>
              <el-option label="西城区" value="西城区"></el-option>
              <el-option label="东城区" value="东城区"></el-option>
              <el-option label="丰台区" value="丰台区"></el-option>
              <el-option label="昌平区" value="昌平区"></el-option>
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="2">
          <el-form-item label="对比模式">
            <el-select v-model="compareMode" placeholder="无" class="filter-input">
              <el-option label="无" value="none"></el-option>
              <el-option label="区域对比" value="area"></el-option>
              <el-option label="时间对比" value="time"></el-option>
              <el-option label="类型对比" value="type"></el-option>
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="2">
          <el-form-item label="操作">
            <el-button type="primary" @click="applyFilter">筛选</el-button>
            <el-button @click="resetFilter">重置</el-button>
          </el-form-item>
        </el-col>
      </el-row>

      <!-- 对比选择（对比模式下显示） -->
      <div class="compare-panel" v-if="compareMode !== 'none'">
        <el-divider content-position="left">对比条件</el-divider>
        <el-row :gutter="20">
          <el-col :span="12" v-if="compareMode === 'area'">
            <el-form-item label="对比区域">
              <el-select
                v-model="compareAreas"
                multiple
                placeholder="选择对比区域"
                class="filter-input"
              >
                <el-option label="朝阳区" value="朝阳区"></el-option>
                <el-option label="海淀区" value="海淀区"></el-option>
                <el-option label="西城区" value="西城区"></el-option>
                <el-option label="东城区" value="东城区"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="compareMode === 'time'">
            <el-form-item label="对比时间段">
              <el-select
                v-model="compareTimeRange"
                placeholder="选择对比时间段"
                class="filter-input"
              >
                <el-option label="本周vs上周" value="week_vs_lastweek"></el-option>
                <el-option label="今日vs昨日" value="today_vs_yesterday"></el-option>
                <el-option label="本月vs上月" value="month_vs_lastmonth"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="compareMode === 'type'">
            <el-form-item label="对比类型">
              <el-select
                v-model="compareTypes"
                multiple
                placeholder="选择对比类型"
                class="filter-input"
              >
                <el-option label="交通拥堵" value="交通拥堵"></el-option>
                <el-option label="空气质量异常" value="空气质量异常"></el-option>
                <el-option label="设备故障" value="设备故障"></el-option>
                <el-option label="噪音超标" value="噪音超标"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="对比维度">
              <el-select
                v-model="compareDimension"
                multiple
                placeholder="选择对比维度"
                class="filter-input"
              >
                <el-option label="数量" value="count"></el-option>
                <el-option label="处置时长" value="handle_time"></el-option>
                <el-option label="完成率" value="completion_rate"></el-option>
                <el-option label="重复率" value="repeat_rate"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-button type="primary" @click="generateCompareReport">生成对比报告</el-button>
      </div>

      <!-- 筛选结果 -->
      <el-divider content-position="left">筛选结果</el-divider>
      <div class="result-container">
        <!-- 左侧：数据表格 -->
        <div class="result-table">
          <el-table :data="filteredData" border stripe class="data-table" :loading="loading">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="area" label="区域" width="100" />
            <el-table-column prop="type" label="问题类型" width="120">
              <template #default="scope">
                <el-tag :type="scope.row.type === 'event' ? 'primary' : 'warning'">
                  {{ scope.row.type === 'event' ? '事件类' : '传感器异常' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="subType" label="子类型" width="120" />
            <el-table-column prop="priority" label="优先级" width="100">
              <template #default="scope">
                <el-tag
                  :type="
                    scope.row.priority === 'high'
                      ? 'danger'
                      : scope.row.priority === 'medium'
                        ? 'warning'
                        : 'success'
                  "
                >
                  {{
                    scope.row.priority === 'high'
                      ? '高'
                      : scope.row.priority === 'medium'
                        ? '中'
                        : '低'
                  }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="scope">
                <el-tag
                  :type="
                    scope.row.status === 'pending'
                      ? 'info'
                      : scope.row.status === 'processing'
                        ? 'primary'
                        : 'success'
                  "
                >
                  {{
                    scope.row.status === 'pending'
                      ? '待处理'
                      : scope.row.status === 'processing'
                        ? '处理中'
                        : '已处理'
                  }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createTime" label="创建时间" width="180" />
            <el-table-column prop="responseTime" label="响应时长(分钟)" width="120" />
            <el-table-column label="操作" width="100">
              <template #default="scope">
                <el-button size="small" type="primary" @click="viewDetail(scope.row)"
                  >详情</el-button
                >
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
            :current-page="pagination.page"
            :page-sizes="[10, 20, 50]"
            :page-size="pagination.size"
            layout="total, sizes, prev, pager, next, jumper"
            :total="pagination.total"
            class="pagination"
          />
        </div>

        <!-- 右侧：可视化对比 -->
        <div class="result-charts">
          <el-card class="chart-item" shadow="hover">
            <template #header>
              <span>数量分布</span>
            </template>
            <div ref="countChartRef" class="chart-container"></div>
          </el-card>
          <el-card class="chart-item" shadow="hover" style="margin-top: 20px">
            <template #header>
              <span>处置效率对比</span>
            </template>
            <div ref="efficiencyChartRef" class="chart-container"></div>
          </el-card>

          <!-- 对比报告 -->
          <div class="compare-report" v-if="compareReport">
            <el-card shadow="hover" style="margin-top: 20px">
              <template #header>
                <span>对比分析报告</span>
                <el-button size="small" type="text" @click="exportCompareReport">
                  <el-icon><Download /></el-icon>导出报告
                </el-button>
              </template>
              <div class="report-content" v-html="compareReport"></div>
            </el-card>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { Download } from '@element-plus/icons-vue'
import { useMainStore } from '@/store'
import { CityProblemData } from '@/types'

const store = useMainStore()
const countChartRef = ref<HTMLDivElement>()
const efficiencyChartRef = ref<HTMLDivElement>()

// 筛选表单
const filterForm = ref({
  dateRange: [],
  type: 'all',
  priority: 'all',
  status: 'all',
  area: 'all',
})

// 对比配置
const compareMode = ref('none')
const compareAreas = ref<string[]>([])
const compareTimeRange = ref('')
const compareTypes = ref<string[]>([])
const compareDimension = ref<string[]>([])

// 分页
const pagination = ref({
  page: 1,
  size: 10,
  total: 0,
})

// 状态
const loading = ref(false)
const compareReport = ref('')
const filteredData = ref<CityProblemData[]>([])

// 筛选后的数据
const getFilteredData = computed(() => {
  let data = [...store.problemData]

  // 时间筛选
  if (filterForm.value.dateRange.length === 2) {
    const start = new Date(filterForm.value.dateRange[0]).getTime()
    const end = new Date(filterForm.value.dateRange[1]).getTime()
    data = data.filter((item) => {
      const time = new Date(item.createTime).getTime()
      return time >= start && time <= end
    })
  }

  // 类型筛选
  if (filterForm.value.type !== 'all') {
    data = data.filter((item) => item.type === filterForm.value.type)
  }

  // 优先级筛选
  if (filterForm.value.priority !== 'all') {
    data = data.filter((item) => item.priority === filterForm.value.priority)
  }

  // 状态筛选
  if (filterForm.value.status !== 'all') {
    data = data.filter((item) => item.status === filterForm.value.status)
  }

  // 区域筛选
  if (filterForm.value.area !== 'all') {
    data = data.filter((item) => item.area === filterForm.value.area)
  }

  return data
})

// 应用筛选
const applyFilter = () => {
  loading.value = true

  setTimeout(() => {
    filteredData.value = getFilteredData.value
    pagination.value.total = filteredData.value.length

    // 分页处理
    const start = (pagination.value.page - 1) * pagination.value.size
    const end = start + pagination.value.size
    filteredData.value = filteredData.value.slice(start, end)

    // 更新图表
    initCharts()

    loading.value = false
    ElMessage.success(`筛选完成，共找到${pagination.value.total}条数据`)
  }, 500)
}

// 重置筛选
const resetFilter = () => {
  filterForm.value = {
    dateRange: [],
    type: 'all',
    priority: 'all',
    status: 'all',
    area: 'all',
  }
  compareMode.value = 'none'
  compareAreas.value = []
  compareTimeRange.value = ''
  compareTypes.value = []
  compareDimension.value = []
  compareReport.value = ''
  pagination.value.page = 1

  applyFilter()
}

// 生成对比报告
const generateCompareReport = () => {
  if (compareMode.value === 'none') return

  if (
    (compareMode.value === 'area' && compareAreas.value.length < 2) ||
    (compareMode.value === 'type' && compareTypes.value.length < 2) ||
    (compareMode.value === 'time' && !compareTimeRange.value) ||
    compareDimension.value.length === 0
  ) {
    ElMessage.warning('请完整选择对比条件')
    return
  }

  loading.value = true

  setTimeout(() => {
    // 构建对比报告
    let report = '<h3>多维对比分析报告</h3>'

    if (compareMode.value === 'area') {
      report += `<p><strong>对比区域：</strong>${compareAreas.value.join(' vs ')}</p>`

      compareDimension.value.forEach((dim) => {
        if (dim === 'count') {
          const areaCounts = compareAreas.value.map((area) => {
            const count = getFilteredData.value.filter((item) => item.area === area).length
            return `${area}：${count}条`
          })
          report += `<p><strong>数量对比：</strong>${areaCounts.join('；')}</p>`

          const maxArea = compareAreas.value.reduce((a, b) => {
            const aCount = getFilteredData.value.filter((item) => item.area === a).length
            const bCount = getFilteredData.value.filter((item) => item.area === b).length
            return aCount > bCount ? a : b
          })
          report += `<p><strong>核心发现：</strong>${maxArea}问题数量最多，需重点关注该区域的资源配置和处置效率。</p>`
        }

        if (dim === 'handle_time') {
          const areaTimes = compareAreas.value.map((area) => {
            const times = getFilteredData.value
              .filter((item) => item.area === area && item.responseTime)
              .map((item) => item.responseTime!)
            const avg = times.length
              ? (times.reduce((sum, t) => sum + t, 0) / times.length).toFixed(1)
              : 0
            return `${area}：${avg}分钟`
          })
          report += `<p><strong>处置时长对比：</strong>${areaTimes.join('；')}</p>`
        }
      })
    }

    if (compareMode.value === 'type') {
      report += `<p><strong>对比类型：</strong>${compareTypes.value.join(' vs ')}</p>`

      compareDimension.value.forEach((dim) => {
        if (dim === 'count') {
          const typeCounts = compareTypes.value.map((type) => {
            const count = getFilteredData.value.filter((item) => item.subType === type).length
            return `${type}：${count}条`
          })
          report += `<p><strong>数量对比：</strong>${typeCounts.join('；')}</p>`
        }

        if (dim === 'completion_rate') {
          const typeRates = compareTypes.value.map((type) => {
            const total = getFilteredData.value.filter((item) => item.subType === type).length
            const completed = getFilteredData.value.filter(
              (item) => item.subType === type && item.status === 'resolved',
            ).length
            const rate = total ? ((completed / total) * 100).toFixed(1) : 0
            return `${type}：${rate}%`
          })
          report += `<p><strong>完成率对比：</strong>${typeRates.join('；')}</p>`
        }
      })
    }

    report += `<p><strong>优化建议：</strong>基于对比分析，建议优先优化问题高发${compareMode.value === 'area' ? '区域' : '类型'}的处置流程，配置更多资源，降低平均处置时长，提升整体处置效率。</p>`

    compareReport.value = report
    loading.value = false
    ElMessage.success('对比分析报告生成成功')
  }, 800)
}

// 初始化图表
const initCharts = () => {
  // 数量分布图表
  if (countChartRef.value) {
    const countChart = echarts.init(countChartRef.value)

    // 按区域统计
    const areaMap: Record<string, number> = {}
    filteredData.value.forEach((item) => {
      areaMap[item.area] = (areaMap[item.area] || 0) + 1
    })

    const areaData = Object.keys(areaMap).map((key) => ({
      name: key,
      value: areaMap[key],
    }))

    countChart.setOption({
      backgroundColor: 'transparent',
      color: ['#00c6ff', '#7b61ff', '#ff4757', '#ffa801', '#00d2d3'],
      tooltip: { trigger: 'item' },
      series: [
        {
          name: '数量分布',
          type: 'pie',
          radius: ['40%', '70%'],
          data: areaData,
          label: { color: '#e2e8f0' },
        },
      ],
    })

    window.addEventListener('resize', () => countChart.resize())
  }

  // 处置效率对比图表
  if (efficiencyChartRef.value) {
    const efficiencyChart = echarts.init(efficiencyChartRef.value)

    // 按优先级统计平均响应时长
    const priorityMap: Record<string, number[]> = {
      high: [],
      medium: [],
      low: [],
    }

    filteredData.value.forEach((item) => {
      if (item.responseTime) {
        priorityMap[item.priority].push(item.responseTime!)
      }
    })

    const priorityAvg = Object.keys(priorityMap).map((key) => ({
      name: key === 'high' ? '高' : key === 'medium' ? '中' : '低',
      value: priorityMap[key].length
        ? (priorityMap[key].reduce((sum, t) => sum + t, 0) / priorityMap[key].length).toFixed(1)
        : 0,
    }))

    efficiencyChart.setOption({
      backgroundColor: 'transparent',
      color: ['#00c6ff'],
      tooltip: { trigger: 'axis' },
      grid: { left: '10%', right: '10%', top: '20%', bottom: '10%' },
      xAxis: {
        type: 'category',
        data: priorityAvg.map((item) => item.name),
        axisLabel: { color: '#e2e8f0' },
      },
      yAxis: {
        type: 'value',
        name: '响应时长（分钟）',
        axisLabel: { color: '#e2e8f0' },
        nameTextStyle: { color: '#e2e8f0' },
      },
      series: [
        {
          name: '平均响应时长',
          type: 'bar',
          data: priorityAvg.map((item) => Number(item.value)),
          itemStyle: { borderRadius: 4 },
        },
      ],
    })

    window.addEventListener('resize', () => efficiencyChart.resize())
  }
}

// 导出对比报告
const exportCompareReport = () => {
  ElMessage.success('对比分析报告已导出为PDF格式')
}

// 查看详情
const viewDetail = (row: CityProblemData) => {
  ElMessage.info(`查看${row.area}${row.subType}的详细信息`)
}

// 分页处理
const handleSizeChange = (size: number) => {
  pagination.value.size = size
  applyFilter()
}

const handleCurrentChange = (page: number) => {
  pagination.value.page = page
  applyFilter()
}

// 监听数据变化
watch(
  [() => store.problemData, compareMode],
  () => {
    if (filteredData.value.length > 0) {
      applyFilter()
    }
  },
  { deep: true },
)

onMounted(() => {
  // 初始化筛选
  applyFilter()
})
</script>

<style scoped>
.data-filter-container {
  width: 100%;
  height: 100%;
}

.filter-card {
  background: linear-gradient(135deg, #1e293b, #0f172a);
  border: 1px solid #334155;
  height: 100%;
}

.filter-row {
  margin-bottom: 20px;
  align-items: flex-end;
}

.filter-input {
  width: 100%;
}

.compare-panel {
  padding: 10px 0;
  margin-bottom: 20px;
  border-top: 1px solid #334155;
  border-bottom: 1px solid #334155;
}

.result-container {
  display: flex;
  gap: 20px;
  height: calc(100% - 300px);
}

.result-table {
  flex: 1;
  overflow: auto;
}

.data-table {
  --el-table-bg-color: transparent;
  --el-table-row-hover-bg-color: #334155;
  --el-table-header-text-color: #00c6ff;
  --el-table-border-color: #334155;
  --el-table-text-color: #e2e8f0;
  width: 100%;
}

.pagination {
  margin-top: 20px;
  text-align: right;
  --el-pagination-text-color: #e2e8f0;
  --el-pagination-button-bg-color: #1e293b;
  --el-pagination-button-hover-bg-color: #334155;
}

.result-charts {
  width: 50%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.chart-item {
  background: linear-gradient(135deg, #1e293b, #0f172a);
  border: 1px solid #334155;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.chart-container {
  flex: 1;
  width: 100%;
  height: 100%;
}

.compare-report {
  margin-top: auto;
}

.report-content {
  padding: 10px;
  line-height: 1.8;
}

.report-content h3 {
  color: #00c6ff;
  margin-bottom: 10px;
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

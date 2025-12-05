<template>
  <div class="ai-analysis-container">
    <el-row :gutter="20">
      <!-- 分析条件 -->
      <el-col :span="6">
        <el-card class="condition-card" shadow="hover">
          <template #header>
            <span>分析条件设置</span>
          </template>
          <el-form :model="analysisForm" label-width="100px" class="analysis-form">
            <el-form-item label="分析维度">
              <el-select v-model="analysisForm.dimension" multiple placeholder="选择分析维度">
                <el-option label="区域分布" value="area"></el-option>
                <el-option label="问题类型" value="type"></el-option>
                <el-option label="时间趋势" value="time"></el-option>
                <el-option label="优先级分布" value="priority"></el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="时间范围">
              <el-date-picker
                v-model="analysisForm.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                format="YYYY-MM-DD"
              ></el-date-picker>
            </el-form-item>
            <el-form-item label="区域筛选">
              <el-select v-model="analysisForm.area" placeholder="选择区域">
                <el-option label="全部区域" value="all"></el-option>
                <el-option label="朝阳区" value="朝阳区"></el-option>
                <el-option label="海淀区" value="海淀区"></el-option>
                <el-option label="西城区" value="西城区"></el-option>
                <el-option label="东城区" value="东城区"></el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="分析深度">
              <el-slider
                v-model="analysisForm.depth"
                min="1"
                max="5"
                step="1"
                show-input
              ></el-slider>
              <div class="slider-tip">1=基础分析，5=深度分析</div>
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                @click="generateAnalysis"
                :loading="loading"
                class="analysis-btn"
              >
                生成AI分析报告
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <!-- 分析结果 -->
      <el-col :span="18">
        <el-card class="result-card" shadow="hover">
          <template #header>
            <span>AI智能分析报告</span>
            <el-button type="text" @click="exportReport" :disabled="!analysisResult">
              <el-icon><Download /></el-icon>导出报告
            </el-button>
          </template>

          <div v-if="loading" class="loading-container">
            <el-skeleton :rows="10" animated />
          </div>

          <div v-else-if="analysisResult" class="analysis-result">
            <!-- 分析结论 -->
            <div class="result-section">
              <h3 class="section-title">一、核心分析结论</h3>
              <div class="result-content">{{ analysisResult.conclusion }}</div>
            </div>

            <!-- 关键发现 -->
            <div class="result-section">
              <h3 class="section-title">二、关键发现</h3>
              <ul class="key-findings">
                <li v-for="(item, index) in analysisResult.findings" :key="index">
                  {{ item }}
                </li>
              </ul>
            </div>

            <!-- 优化建议 -->
            <div class="result-section">
              <h3 class="section-title">三、优化建议</h3>
              <div class="suggestions">
                <div
                  v-for="(item, index) in analysisResult.suggestions"
                  :key="index"
                  class="suggestion-item"
                >
                  <span class="suggestion-num">{{ index + 1 }}.</span>
                  <span class="suggestion-content">{{ item }}</span>
                </div>
              </div>
            </div>

            <!-- 数据支撑 -->
            <div class="result-section">
              <h3 class="section-title">四、数据支撑</h3>
              <el-row :gutter="20">
                <el-col :span="12">
                  <div ref="chart1Ref" class="chart-item"></div>
                </el-col>
                <el-col :span="12">
                  <div ref="chart2Ref" class="chart-item"></div>
                </el-col>
              </el-row>
            </div>
          </div>

          <div v-else class="empty-result">
            <el-empty description="暂无分析结果，请设置条件后生成分析报告"></el-empty>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { Download } from '@element-plus/icons-vue'
import { useMainStore } from '@/store'

const store = useMainStore()
const loading = ref(false)
const analysisResult = ref<any>(null)
const chart1Ref = ref<HTMLDivElement>()
const chart2Ref = ref<HTMLDivElement>()

// 分析表单
const analysisForm = ref({
  dimension: [],
  dateRange: [],
  area: 'all',
  depth: 3,
})

// 生成AI分析报告
const generateAnalysis = async () => {
  if (analysisForm.value.dimension.length === 0) {
    ElMessage.warning('请选择至少一个分析维度')
    return
  }

  loading.value = true
  try {
    // 构建分析提示词
    const prompt = `
      基于以下条件分析城市运行数据：
      1. 分析维度：${analysisForm.value.dimension.join('、')}
      2. 时间范围：${analysisForm.value.dateRange.length ? analysisForm.value.dateRange.join('至') : '全部时间'}
      3. 区域：${analysisForm.value.area === 'all' ? '全部区域' : analysisForm.value.area}
      4. 分析深度：${analysisForm.value.depth}级

      要求：
      1. 核心结论（200字以内）
      2. 关键发现（3-5条）
      3. 优化建议（3-5条）
      4. 数据支撑图表说明
    `

    // 调用AI生成分析报告
    const aiContent = await store.sendChatMessage(prompt)

    // 模拟AI返回结果（实际项目替换为真实解析）
    analysisResult.value = {
      conclusion: `根据${analysisForm.value.dimension.join('、')}维度分析，${analysisForm.value.area === 'all' ? '全市' : analysisForm.value.area}近${analysisForm.value.dateRange.length ? '指定时间段' : '一个月'}内共发生各类问题${store.statistics.totalProblems}起，其中高优先级问题${store.statistics.highPriority}起，主要集中在${analysisForm.value.area === 'all' ? '朝阳区和海淀区' : analysisForm.value.area}，传感器异常占比${((store.statistics.sensorErrorCount / store.statistics.totalProblems) * 100).toFixed(1)}%，平均响应时长${store.statistics.avgResponseTime}分钟，整体处置效率需提升。`,
      findings: [
        `${analysisForm.value.area === 'all' ? '朝阳区' : analysisForm.value.area}问题数量占比最高，达${analysisForm.value.area === 'all' ? '35%' : '60%'}`,
        `事件类问题中交通拥堵占比40%，传感器异常中设备故障占比55%`,
        `高优先级问题响应时长平均比低优先级快15分钟`,
        `周末问题数量比工作日高20%`,
        `近7天问题数量呈上升趋势，需重点关注`,
      ],
      suggestions: [
        `在${analysisForm.value.area === 'all' ? '朝阳区、海淀区' : analysisForm.value.area}增加巡检频次，优化资源配置`,
        `针对交通拥堵问题，建议优化信号灯配时，增加临时疏导人员`,
        `建立传感器设备定期维护机制，降低异常率`,
        `完善高优先级问题快速响应机制，进一步缩短响应时长`,
        `建立周度数据分析机制，提前预判问题高发区域和时段`,
      ],
    }

    // 初始化图表
    initCharts()
    ElMessage.success('AI分析报告生成成功')
  } catch (error) {
    ElMessage.error('分析报告生成失败：' + (error as Error).message)
  } finally {
    loading.value = false
  }
}

// 初始化图表
const initCharts = () => {
  // 图表1：问题类型分布
  const chart1 = echarts.init(chart1Ref.value!)
  chart1.setOption({
    backgroundColor: 'transparent',
    color: ['#00c6ff', '#7b61ff'],
    tooltip: { trigger: 'item' },
    title: { text: '问题类型分布', left: 'center', textStyle: { color: '#e2e8f0' } },
    series: [
      {
        name: '问题类型',
        type: 'pie',
        radius: ['40%', '70%'],
        data: [
          { value: store.statistics.eventCount, name: '事件' },
          { value: store.statistics.sensorErrorCount, name: '传感器异常' },
        ],
        label: { color: '#e2e8f0' },
      },
    ],
  })

  // 图表2：近7天趋势
  const chart2 = echarts.init(chart2Ref.value!)
  chart2.setOption({
    backgroundColor: 'transparent',
    color: ['#00c6ff'],
    tooltip: { trigger: 'axis' },
    title: { text: '近7天问题趋势', left: 'center', textStyle: { color: '#e2e8f0' } },
    xAxis: {
      type: 'category',
      data: store.statistics.weeklyTrend.map((item) => item.date),
      axisLabel: { color: '#e2e8f0' },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#e2e8f0' },
    },
    series: [
      {
        name: '问题数量',
        type: 'line',
        data: store.statistics.weeklyTrend.map((item) => item.count),
      },
    ],
  })

  // 响应窗口变化
  window.addEventListener('resize', () => {
    chart1.resize()
    chart2.resize()
  })
}

// 导出报告
const exportReport = () => {
  // 模拟导出PDF/Word
  ElMessage.success('分析报告导出成功')
}

onMounted(() => {
  // 初始化默认数据
  if (store.problemData.length > 0) {
    analysisForm.value.dimension = ['type', 'area']
  }
})
</script>

<style scoped>
.ai-analysis-container {
  width: 100%;
  height: 100%;
}

.condition-card,
.result-card {
  background: linear-gradient(135deg, #1e293b, #0f172a);
  border: 1px solid #334155;
  height: 100%;
}

.analysis-form {
  padding: 10px 0;
}

.slider-tip {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 8px;
}

.analysis-btn {
  width: 100%;
}

.loading-container {
  padding: 20px;
}

.analysis-result {
  padding: 20px;
}

.result-section {
  margin-bottom: 30px;
}

.section-title {
  color: #00c6ff;
  font-size: 18px;
  margin-bottom: 16px;
  border-left: 4px solid #00c6ff;
  padding-left: 10px;
}

.result-content {
  line-height: 1.8;
  color: #e2e8f0;
  text-indent: 2em;
}

.key-findings {
  padding-left: 20px;
  line-height: 2;
  color: #e2e8f0;
}

.suggestions {
  line-height: 2;
  color: #e2e8f0;
}

.suggestion-item {
  display: flex;
  margin-bottom: 8px;
}

.suggestion-num {
  font-weight: bold;
  color: #00c6ff;
  margin-right: 8px;
}

.chart-item {
  width: 100%;
  height: 300px;
}

.empty-result {
  padding: 50px 0;
  text-align: center;
}
</style>

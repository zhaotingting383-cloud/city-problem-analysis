<template>
  <div class="daily-report-container">
    <el-card class="report-card" shadow="hover">
      <template #header>
        <span>自动生成处置日报</span>
      </template>

      <el-row :gutter="20" class="report-form-row">
        <el-col :span="8">
          <el-form :model="reportForm" label-width="100px" class="report-form">
            <el-form-item label="报告日期">
              <el-date-picker
                v-model="reportForm.date"
                type="date"
                placeholder="选择报告日期"
                format="YYYY-MM-DD"
              ></el-date-picker>
            </el-form-item>
            <el-form-item label="报告类型">
              <el-select v-model="reportForm.type" placeholder="选择报告类型">
                <el-option label="日报" value="daily"></el-option>
                <el-option label="周报" value="weekly"></el-option>
                <el-option label="月报" value="monthly"></el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="报告范围">
              <el-select v-model="reportForm.scope" placeholder="选择报告范围">
                <el-option label="全市" value="all"></el-option>
                <el-option label="朝阳区" value="朝阳区"></el-option>
                <el-option label="海淀区" value="海淀区"></el-option>
                <el-option label="西城区" value="西城区"></el-option>
                <el-option label="东城区" value="东城区"></el-option>
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="generateReport" :loading="loading">
                生成日报
              </el-button>
              <el-button type="success" @click="exportReport" :disabled="!reportContent">
                <el-icon><Download /></el-icon>导出报告
              </el-button>
            </el-form-item>
          </el-form>
        </el-col>

        <el-col :span="16">
          <div class="report-preview">
            <div v-if="loading" class="loading-container">
              <el-skeleton :rows="15" animated />
            </div>
            <div v-else-if="reportContent" class="report-content">
              <div class="report-header">
                <h1 class="report-title">{{ reportTitle }}</h1>
                <div class="report-meta">
                  生成时间：{{ new Date().toLocaleString() }} | 报告范围：{{
                    reportForm.scope === 'all' ? '全市' : reportForm.scope
                  }}
                </div>
              </div>
              <div class="report-body" v-html="reportContent"></div>
            </div>
            <div v-else class="empty-report">
              <el-empty description="暂无报告，请选择日期后生成"></el-empty>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 历史报告列表 -->
    <el-card class="history-card" shadow="hover" style="margin-top: 20px">
      <template #header>
        <span>历史报告</span>
      </template>
      <el-table :data="historyReports" border stripe class="history-table">
        <el-table-column prop="date" label="报告日期" width="120" />
        <el-table-column prop="type" label="报告类型" width="100">
          <template #default="scope">
            <el-tag>{{
              scope.row.type === 'daily' ? '日报' : scope.row.type === 'weekly' ? '周报' : '月报'
            }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="scope" label="报告范围" width="100" />
        <el-table-column prop="createTime" label="生成时间" width="180" />
        <el-table-column label="操作" width="120">
          <template #default="scope">
            <el-button size="small" type="primary" @click="viewHistoryReport(scope.row)"
              >查看</el-button
            >
            <el-button size="small" type="success" @click="exportHistoryReport(scope.row)"
              >导出</el-button
            >
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'
import { useMainStore } from '@/store'
import dayjs from 'dayjs'

const store = useMainStore()
const loading = ref(false)
const reportContent = ref('')
const handleRecord = ref('')

// 报告表单
const reportForm = ref({
  date: '',
  type: 'daily',
  scope: 'all',
})

// 历史报告
const historyReports = ref([
  {
    date: '2025-09-14',
    type: 'daily',
    scope: 'all',
    createTime: '2025-09-14 18:00:00',
  },
  {
    date: '2025-09-08',
    type: 'weekly',
    scope: 'all',
    createTime: '2025-09-08 09:00:00',
  },
])

// 报告标题
const reportTitle = computed(() => {
  if (!reportForm.value.date) return '城市运行处置报告'

  const dateText = dayjs(reportForm.value.date).format('YYYY年MM月DD日')
  const typeText =
    reportForm.value.type === 'daily'
      ? '日报'
      : reportForm.value.type === 'weekly'
        ? '周报'
        : '月报'
  const scopeText = reportForm.value.scope === 'all' ? '全市' : reportForm.value.scope

  return `${dateText}${scopeText}城市运行处置${typeText}`
})

// 生成日报
const generateReport = async () => {
  if (!reportForm.value.date) {
    ElMessage.warning('请选择报告日期')
    return
  }

  loading.value = true
  try {
    // 构建日报生成提示词
    const prompt = `
      生成${reportForm.value.scope === 'all' ? '全市' : reportForm.value.scope}${reportForm.value.type === 'daily' ? '日报' : reportForm.value.type === 'weekly' ? '周报' : '月报'}，日期：${reportForm.value.date}
      报告结构：
      1. 总体概况（当日/周/月问题总数、类型分布、区域分布）
      2. 处置情况（已处理数量、待处理数量、平均响应时长）
      3. 重点问题（高优先级问题、重复出现问题）
      4. 改进建议（3-5条具体可执行建议）
      5. 次日/周/月工作计划

      要求：
      - 使用HTML格式，标题用<h3>，段落用<p>，列表用<ul><li>
      - 语言专业、简洁，数据准确
      - 整体篇幅控制在800字以内
    `

    // 调用AI生成日报
    await store.sendChatMessage(prompt)

    // 模拟AI返回的HTML格式报告
    reportContent.value = `
      <h3>一、总体概况</h3>
      <p>${reportForm.value.scope === 'all' ? '全市' : reportForm.value.scope}${reportForm.value.type === 'daily' ? '当日' : reportForm.value.type === 'weekly' ? '本周' : '本月'}共发生各类问题${store.statistics.totalProblems}起，其中事件类${store.statistics.eventCount}起（占${((store.statistics.eventCount / store.statistics.totalProblems) * 100).toFixed(1)}%），传感器异常${store.statistics.sensorErrorCount}起（占${((store.statistics.sensorErrorCount / store.statistics.totalProblems) * 100).toFixed(1)}%）。区域分布上，${reportForm.value.scope === 'all' ? '朝阳区问题数量最多，达35%' : reportForm.value.scope + '问题主要集中在核心区域'}。</p>

      <h3>二、处置情况</h3>
      <p>当日/周/月累计处理问题${Math.floor(store.statistics.totalProblems * 0.7)}起，处置完成率${(70).toFixed(1)}%，待处理${Math.floor(store.statistics.totalProblems * 0.3)}起。高优先级问题平均响应时长${store.statistics.avgResponseTime - 5}分钟，整体平均响应时长${store.statistics.avgResponseTime}分钟，较上${reportForm.value.type === 'daily' ? '日' : reportForm.value.type === 'weekly' ? '周' : '月'}缩短${5}分钟。</p>

      <h3>三、重点问题</h3>
      <ul>
        <li>高优先级问题${store.statistics.highPriority}起，主要为${reportForm.value.scope === 'all' ? '交通拥堵和设备故障' : reportForm.value.scope + '的环境异常'}</li>
        <li>${reportForm.value.scope === 'all' ? '海淀区' : reportForm.value.scope}重复出现${Math.floor(Math.random() * 5) + 1}类问题，需重点关注</li>
        <li>传感器异常主要集中在${reportForm.value.scope === 'all' ? '老旧设备' : reportForm.value.scope + '的核心区域设备'}</li>
      </ul>

      <h3>四、改进建议</h3>
      <ul>
        <li>在${reportForm.value.scope === 'all' ? '朝阳区、海淀区' : reportForm.value.scope}增加巡检人员配置，优化资源分配</li>
        <li>建立重复问题跟踪机制，分析根本原因并制定长效解决方案</li>
        <li>加快老旧传感器设备更换进度，降低异常率</li>
        <li>优化高优先级问题响应流程，进一步缩短响应时长</li>
        <li>加强跨部门协同，提升复杂问题处置效率</li>
      </ul>

      <h3>五、工作计划</h3>
      <p>1. 明日/周/月重点关注${reportForm.value.scope === 'all' ? '朝阳区' : reportForm.value.scope}问题处置情况；2. 完成${Math.floor(Math.random() * 20) + 10}台异常设备的检修；3. 组织一次处置流程培训；4. 每日定时复盘高优先级问题处置进度。</p>
    `

    // 添加到历史报告
    historyReports.value.unshift({
      date: reportForm.value.date,
      type: reportForm.value.type,
      scope: reportForm.value.scope,
      createTime: new Date().toLocaleString(),
    })

    ElMessage.success('处置日报生成成功')
  } catch (error) {
    ElMessage.error('日报生成失败：' + (error as Error).message)
  } finally {
    loading.value = false
  }
}

// 导出报告
const exportReport = () => {
  // 模拟导出PDF
  ElMessage.success('报告已导出为PDF格式')
}

// 查看历史报告
const viewHistoryReport = (row: any) => {
  reportForm.value = {
    date: row.date,
    type: row.type,
    scope: row.scope,
  }
  // 重新生成对应报告
  generateReport()
}

// 导出历史报告
const exportHistoryReport = (row: any) => {
  ElMessage.success(
    `${row.date}${row.scope === 'all' ? '全市' : row.scope}${row.type === 'daily' ? '日报' : row.type === 'weekly' ? '周报' : '月报'}导出成功`,
  )
}
</script>

<style scoped>
.daily-report-container {
  width: 100%;
  height: 100%;
}

.report-card,
.history-card {
  background: linear-gradient(135deg, #1e293b, #0f172a);
  border: 1px solid #334155;
  margin-bottom: 20px;
}

.report-form-row {
  align-items: flex-start;
}

.report-form {
  padding: 10px 0;
}

.report-preview {
  height: 500px;
  overflow: auto;
  padding: 10px;
  background-color: #1e293b;
  border-radius: 8px;
}

.loading-container {
  padding: 20px;
}

.report-content {
  padding: 20px;
  line-height: 1.8;
}

.report-header {
  text-align: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #334155;
}

.report-title {
  color: #00c6ff;
  margin-bottom: 10px;
}

.report-meta {
  color: #94a3b8;
  font-size: 14px;
}

.report-body h3 {
  color: #00c6ff;
  margin: 20px 0 10px;
}

.report-body p {
  margin-bottom: 10px;
  text-indent: 2em;
}

.report-body ul {
  padding-left: 40px;
  margin-bottom: 10px;
}

.empty-report {
  padding: 100px 0;
  text-align: center;
}

.history-table {
  --el-table-bg-color: transparent;
  --el-table-row-hover-bg-color: #334155;
}
</style>

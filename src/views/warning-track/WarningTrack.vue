<template>
  <div class="warning-track-container">
    <el-row :gutter="20">
      <!-- 预警筛选 -->
      <el-col :span="6">
        <el-card class="filter-card" shadow="hover">
          <template #header>
            <span>预警筛选</span>
          </template>
          <el-form :model="filterForm" label-width="100px" class="filter-form">
            <el-form-item label="预警状态">
              <el-select v-model="filterForm.status" placeholder="选择状态">
                <el-option label="全部" value="all"></el-option>
                <el-option label="待处理" value="pending"></el-option>
                <el-option label="已处理" value="processed"></el-option>
                <el-option label="待跟进" value="follow_up"></el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="优先级">
              <el-select v-model="filterForm.priority" placeholder="选择优先级">
                <el-option label="全部" value="all"></el-option>
                <el-option label="高" value="high"></el-option>
                <el-option label="中" value="medium"></el-option>
                <el-option label="低" value="low"></el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="区域">
              <el-select v-model="filterForm.area" placeholder="选择区域">
                <el-option label="全部" value="all"></el-option>
                <el-option label="朝阳区" value="朝阳区"></el-option>
                <el-option label="海淀区" value="海淀区"></el-option>
                <el-option label="西城区" value="西城区"></el-option>
                <el-option label="东城区" value="东城区"></el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="时间范围">
              <el-date-picker
                v-model="filterForm.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                format="YYYY-MM-DD"
              ></el-date-picker>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="filterWarnings">筛选</el-button>
              <el-button @click="resetFilter">重置</el-button>
            </el-form-item>
          </el-form>

          <!-- 处置统计 -->
          <div class="statistics-box">
            <h4 class="stats-title">处置统计</h4>
            <div class="stats-item">
              <span class="stats-label">总预警数：</span>
              <span class="stats-value">{{ filteredWarnings.length }}</span>
            </div>
            <div class="stats-item">
              <span class="stats-label">待处理：</span>
              <span class="stats-value danger">{{
                filteredWarnings.filter((w) => w.status === 'pending').length
              }}</span>
            </div>
            <div class="stats-item">
              <span class="stats-label">已处理：</span>
              <span class="stats-value success">{{
                filteredWarnings.filter((w) => w.status === 'processed').length
              }}</span>
            </div>
            <div class="stats-item">
              <span class="stats-label">待跟进：</span>
              <span class="stats-value warning">{{
                filteredWarnings.filter((w) => w.status === 'follow_up').length
              }}</span>
            </div>
            <div class="stats-item">
              <span class="stats-label">平均处置时长：</span>
              <span class="stats-value">{{ avgHandleTime }}分钟</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 预警列表 -->
      <el-col :span="18">
        <el-card class="warning-list-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>预警列表与处置跟踪</span>
              <el-button type="primary" @click="batchHandle">
                <el-icon><Check /></el-icon>批量标记已处理
              </el-button>
            </div>
          </template>

          <el-table
            :data="filteredWarnings"
            border
            stripe
            class="warning-table"
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="55" />
            <el-table-column prop="id" label="预警ID" width="120" />
            <el-table-column prop="area" label="区域" width="100" />
            <el-table-column prop="type" label="预警类型" width="120" />
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
                      : scope.row.status === 'processed'
                        ? 'success'
                        : 'warning'
                  "
                >
                  {{
                    scope.row.status === 'pending'
                      ? '待处理'
                      : scope.row.status === 'processed'
                        ? '已处理'
                        : '待跟进'
                  }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createTime" label="创建时间" width="180" />
            <el-table-column label="处置操作" width="280">
              <template #default="scope">
                <el-button
                  size="small"
                  type="success"
                  @click="updateStatus(scope.row.id, 'processed')"
                  :disabled="scope.row.status === 'processed'"
                >
                  标记已处理
                </el-button>
                <el-button
                  size="small"
                  type="primary"
                  @click="updateStatus(scope.row.id, 'follow_up')"
                  :disabled="scope.row.status === 'follow_up'"
                >
                  标记待跟进
                </el-button>
                <el-button size="small" type="info" @click="viewSuggestion(scope.row)">
                  AI建议
                </el-button>
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
            :total="filteredWarnings.length"
            class="pagination"
          />
        </el-card>
      </el-col>
    </el-row>

    <!-- AI处置建议弹窗 -->
    <el-dialog v-model="showSuggestionDialog" title="AI处置建议" width="600px">
      <div v-if="currentWarning" class="suggestion-dialog">
        <div class="warning-info">
          <p><strong>预警信息：</strong>{{ currentWarning.message }}</p>
          <p><strong>区域：</strong>{{ currentWarning.area }}</p>
          <p>
            <strong>优先级：</strong
            >{{
              currentWarning.priority === 'high'
                ? '高'
                : currentWarning.priority === 'medium'
                  ? '中'
                  : '低'
            }}
          </p>
        </div>
        <div class="suggestion-content">
          <h4>AI处置建议：</h4>
          <div v-if="currentWarning.aiSuggestion" class="suggestion-text">
            {{ currentWarning.aiSuggestion }}
          </div>
          <div v-else class="no-suggestion">
            <el-button type="primary" @click="generateSuggestion">生成AI处置建议</el-button>
          </div>
        </div>
        <div class="handle-record">
          <h4>处置记录：</h4>
          <el-input
            v-model="handleRecord"
            type="textarea"
            placeholder="输入处置记录..."
            rows="4"
          ></el-input>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Check } from '@element-plus/icons-vue'
import { useMainStore } from '@/store'
import { Warning } from '@/types'

const store = useMainStore()
const selectedWarnings = ref<string[]>([])
const showSuggestionDialog = ref(false)
const currentWarning = ref<Warning | null>(null)
const handleRecord = ref('')
const loading = ref(false)

// 筛选表单
const filterForm = ref({
  status: 'all',
  priority: 'all',
  area: 'all',
  dateRange: [],
})

// 分页
const pagination = ref({
  page: 1,
  size: 10,
  total: 0,
})

// 筛选后的预警列表
const filteredWarnings = computed(() => {
  let list = [...store.warnings]

  // 状态筛选
  if (filterForm.value.status !== 'all') {
    list = list.filter((w) => w.status === filterForm.value.status)
  }

  // 优先级筛选
  if (filterForm.value.priority !== 'all') {
    list = list.filter((w) => w.priority === filterForm.value.priority)
  }

  // 区域筛选
  if (filterForm.value.area !== 'all') {
    list = list.filter((w) => w.area === filterForm.value.area)
  }

  // 时间筛选
  if (filterForm.value.dateRange.length === 2) {
    const start = new Date(filterForm.value.dateRange[0]).getTime()
    const end = new Date(filterForm.value.dateRange[1]).getTime()
    list = list.filter((w) => {
      const time = new Date(w.createTime).getTime()
      return time >= start && time <= end
    })
  }

  // 更新总数
  pagination.value.total = list.length

  // 分页
  const start = (pagination.value.page - 1) * pagination.value.size
  const end = start + pagination.value.size
  return list.slice(start, end)
})

// 平均处置时长
const avgHandleTime = computed(() => {
  // 模拟数据
  return Math.floor(Math.random() * 30) + 5
})

// 筛选预警
const filterWarnings = () => {
  pagination.value.page = 1 // 重置页码
}

// 重置筛选
const resetFilter = () => {
  filterForm.value = {
    status: 'all',
    priority: 'all',
    area: 'all',
    dateRange: [],
  }
  pagination.value.page = 1
}

// 选择预警
const handleSelectionChange = (val: any[]) => {
  selectedWarnings.value = val.map((item) => item.id)
}

// 批量处理
const batchHandle = () => {
  if (selectedWarnings.value.length === 0) {
    ElMessage.warning('请选择至少一条预警')
    return
  }

  selectedWarnings.value.forEach((id) => {
    store.updateWarningStatus(id, 'processed')
  })

  ElMessage.success(`已批量标记${selectedWarnings.value.length}条预警为已处理`)
  selectedWarnings.value = []
}

// 更新状态
const updateStatus = (id: string, status: any) => {
  store.updateWarningStatus(id, status)
  ElMessage.success(`预警已标记为${status === 'processed' ? '已处理' : '待跟进'}`)
}

// 查看AI建议
const viewSuggestion = (warning: Warning) => {
  currentWarning.value = warning
  handleRecord.value = ''
  showSuggestionDialog.value = true
}

// 生成AI建议
const generateSuggestion = async () => {
  if (!currentWarning.value) return

  loading.value = true
  try {
    await store.generateAiSuggestion(currentWarning.value.id)
    // 刷新当前预警数据
    currentWarning.value = store.warnings.find((w) => w.id === currentWarning.value!.id)!
    ElMessage.success('AI处置建议生成成功')
  } catch (error) {
    ElMessage.error('生成失败：' + (error as Error).message)
  } finally {
    loading.value = false
  }
}

// 分页处理
const handleSizeChange = (size: number) => {
  pagination.value.size = size
}

const handleCurrentChange = (page: number) => {
  pagination.value.page = page
}

// 监听预警数据变化
watch(
  () => store.warnings,
  () => {
    pagination.value.total = filteredWarnings.value.length
  },
  { deep: true },
)
</script>

<style scoped>
.warning-track-container {
  width: 100%;
  height: 100%;
}

.filter-card,
.warning-list-card {
  background: linear-gradient(135deg, #1e293b, #0f172a);
  border: 1px solid #334155;
  height: 100%;
}

.filter-form {
  padding: 10px 0;
}

.statistics-box {
  margin-top: 30px;
  padding: 15px;
  background-color: #1e293b;
  border-radius: 8px;
}

.stats-title {
  color: #00c6ff;
  margin-bottom: 15px;
  font-size: 16px;
}

.stats-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.stats-label {
  color: #94a3b8;
}

.stats-value {
  font-weight: bold;
}

.danger {
  color: #ff4757;
}

.success {
  color: #00d2d3;
}

.warning {
  color: #ffa801;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.warning-table {
  --el-table-bg-color: transparent;
  --el-table-row-hover-bg-color: #334155;
  --el-table-header-text-color: #00c6ff;
  --el-table-border-color: #334155;
  --el-table-text-color: #e2e8f0;
  margin-top: 20px;
}

.pagination {
  margin-top: 20px;
  text-align: right;
  --el-pagination-text-color: #e2e8f0;
  --el-pagination-button-bg-color: #1e293b;
  --el-pagination-button-hover-bg-color: #334155;
}

.suggestion-dialog {
  padding: 10px 0;
}

.warning-info {
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #334155;
}

.suggestion-content {
  margin-bottom: 20px;
}

.suggestion-text {
  padding: 10px;
  background-color: #1e293b;
  border-radius: 8px;
  line-height: 1.8;
}

.no-suggestion {
  text-align: center;
  padding: 20px 0;
}

.handle-record {
  margin-top: 20px;
}
</style>

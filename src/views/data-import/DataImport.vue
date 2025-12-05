<template>
  <div class="data-import-container">
    <el-card class="import-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>多源数据导入</span>
          <el-tag type="info">支持JSON/Excel/CSV格式</el-tag>
        </div>
      </template>

      <!-- 导入方式选择 -->
      <el-tabs v-model="activeTab" class="import-tabs">
        <el-tab-pane label="文件上传" name="file">
          <div class="upload-area">
            <el-upload
              class="upload-demo"
              drag
              :auto-upload="false"
              :on-change="handleFileChange"
              :file-list="fileList"
              accept=".json,.xlsx,.csv"
            >
              <i class="el-icon-upload"></i>
              <div class="el-upload__text">拖放文件到此处，或<em>点击上传</em></div>
              <div class="el-upload__tip" slot="tip">
                仅支持JSON、Excel、CSV格式，单文件最大10MB
              </div>
            </el-upload>
            <el-button
              type="primary"
              @click="parseFile"
              :disabled="fileList.length === 0 || loading"
              class="parse-btn"
            >
              解析并导入数据
            </el-button>
          </div>
        </el-tab-pane>

        <el-tab-pane label="接口导入" name="api">
          <el-form :model="apiForm" label-width="100px" class="api-form">
            <el-form-item label="API地址">
              <el-input v-model="apiForm.url" placeholder="输入数据接口地址"></el-input>
            </el-form-item>
            <el-form-item label="请求方式">
              <el-select v-model="apiForm.method" placeholder="选择请求方式">
                <el-option label="GET" value="GET"></el-option>
                <el-option label="POST" value="POST"></el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="请求头">
              <el-input
                v-model="apiForm.headers"
                type="textarea"
                placeholder="JSON格式，如{\'Authorization\':\'Bearer token\'}"
              ></el-input>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="fetchApiData" :loading="loading">
                调用接口导入数据
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="手动录入" name="manual">
          <el-form :model="manualForm" label-width="100px" class="manual-form">
            <el-form-item label="区域">
              <el-input v-model="manualForm.area" placeholder="输入区域名称"></el-input>
            </el-form-item>
            <el-form-item label="问题类型">
              <el-select v-model="manualForm.type" placeholder="选择问题类型">
                <el-option label="事件" value="event"></el-option>
                <el-option label="传感器异常" value="sensor_error"></el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="优先级">
              <el-select v-model="manualForm.priority" placeholder="选择优先级">
                <el-option label="高" value="high"></el-option>
                <el-option label="中" value="medium"></el-option>
                <el-option label="低" value="low"></el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="经纬度">
              <el-row :gutter="10">
                <el-col :span="12">
                  <el-input v-model="manualForm.lng" placeholder="经度"></el-input>
                </el-col>
                <el-col :span="12">
                  <el-input v-model="manualForm.lat" placeholder="纬度"></el-input>
                </el-col>
              </el-row>
            </el-form-item>
            <el-form-item label="问题描述">
              <el-input
                v-model="manualForm.desc"
                type="textarea"
                placeholder="输入问题描述"
              ></el-input>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="submitManualData" :loading="loading">
                提交数据
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 数据结构化展示 -->
    <el-card class="data-table-card" shadow="hover" v-if="structuredData.length > 0">
      <template #header>
        <span>数据结构化展示</span>
      </template>
      <el-table :data="structuredData" border stripe class="data-table" :loading="loading">
        <el-table-column prop="id" label="ID" />
        <el-table-column prop="type" label="类型" />
        <el-table-column prop="description" label="问题描述" />

        <!-- 嵌套对象字段：使用 formatter 解析 -->
        <el-table-column label="区域" align="center">
          <template #default="scope">
            <!-- 方式1：模板直接取值（简单场景） -->
            {{ scope.row.location.district || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="街道" align="center">
          <template #default="scope">
            <!-- 方式1：模板直接取值（简单场景） -->
            {{ scope.row.location.street || '-' }}
          </template>
        </el-table-column>

        <el-table-column prop="reportTime" label="上报时间" width="180" />
        <el-table-column prop="reporterType" label="上报渠道" width="180" />
        <el-table-column label="操作" width="120">
          <template #default="scope">
            <el-button size="small" type="primary" @click="viewDetail(scope.row)"
              >查看详情</el-button
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
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useMainStore } from '@/store'
import { CityProblemData } from '@/types'

const store = useMainStore()
const loading = ref(false)
const activeTab = ref('file')
const fileList = ref<any[]>([])
const structuredData = ref<CityProblemData[]>([])

// 分页
const pagination = ref({
  page: 1,
  size: 10,
  total: 0,
})

// API导入表单
const apiForm = ref({
  url: '',
  method: 'GET',
  headers: '',
})

// 手动录入表单
const manualForm = ref({
  area: '',
  type: '',
  priority: '',
  lng: '',
  lat: '',
  desc: '',
})

// 文件上传处理
const handleFileChange = (file: any) => {
  fileList.value = [file] // 只保留最新文件
}

// 解析上传文件
const parseFile = async () => {
  loading.value = true
  try {
    const result = await store.parseJsonFile(fileList.value[0].raw)
    if (result.success) {
      structuredData.value = store.problemData
      pagination.value.total = store.problemData.length
      ElMessage.success('数据解析导入成功')
    } else {
      ElMessage.error(result.message)
    }
  } catch (error) {
    ElMessage.error('文件解析失败：' + (error as Error).message)
  } finally {
    loading.value = false
  }
}

// 调用API导入数据
const fetchApiData = async () => {
  if (!apiForm.value.url) {
    ElMessage.warning('请输入API地址')
    return
  }
  loading.value = true
  try {
    let headers = {}
    if (apiForm.value.headers) {
      headers = JSON.parse(apiForm.value.headers)
    }

    const response = await fetch(apiForm.value.url, {
      method: apiForm.value.method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    })

    const data = await response.json()
    // 模拟数据处理
    store.problemData = data as CityProblemData[]
    structuredData.value = store.problemData
    pagination.value.total = store.problemData.length
    ElMessage.success('API数据导入成功')
  } catch (error) {
    ElMessage.error('API调用失败：' + (error as Error).message)
  } finally {
    loading.value = false
  }
}

// 提交手动录入数据
const submitManualData = () => {
  if (!manualForm.value.area || !manualForm.value.type || !manualForm.value.priority) {
    ElMessage.warning('请填写必填字段')
    return
  }

  loading.value = true
  try {
    const newData: CityProblemData = {
      id: Date.now().toString(),
      area: manualForm.value.area,
      areaCode: '110100', // 默认编码
      lng: Number(manualForm.value.lng) || 116.4,
      lat: Number(manualForm.value.lat) || 39.9,
      type: manualForm.value.type as 'event' | 'sensor_error',
      subType: manualForm.value.desc || '手动录入',
      priority: manualForm.value.priority as 'high' | 'medium' | 'low',
      status: 'pending',
      createTime: new Date().toLocaleString(),
      responseTime: 0,
    }

    store.problemData.push(newData)
    structuredData.value = store.problemData
    pagination.value.total = store.problemData.length

    // 重置表单
    manualForm.value = {
      area: '',
      type: '',
      priority: '',
      lng: '',
      lat: '',
      desc: '',
    }

    ElMessage.success('手动数据提交成功')
  } catch (error) {
    ElMessage.error('数据提交失败：' + (error as Error).message)
  } finally {
    loading.value = false
  }
}

// 查看详情
const viewDetail = (row: CityProblemData) => {
  ElMessage.info(`查看${row.area}的${row.subType}详情`)
}

// 分页处理
const handleSizeChange = (size: number) => {
  pagination.value.size = size
  store.setPagination(pagination.value.page, size)
}

const handleCurrentChange = (page: number) => {
  pagination.value.page = page
  store.setPagination(page, pagination.value.size)
}
</script>

<style scoped>
.data-import-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.import-card,
.data-table-card {
  background: linear-gradient(135deg, #1e293b, #0f172a);
  border: 1px solid #334155;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.import-tabs {
  margin-top: 20px;
}

.upload-area {
  padding: 20px;
  text-align: center;
}

.parse-btn {
  margin-top: 20px;
}

.api-form,
.manual-form {
  padding: 20px;
}

.data-table {
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
</style>

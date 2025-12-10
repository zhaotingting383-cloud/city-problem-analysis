import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'

// 类型定义（若已在 src/types/index.ts 定义，可导入使用）
export interface ChatMessage {
  id: string | undefined
  role: 'user' | 'assistant'
  content: string | undefined
  timestamp: number
}

export interface CityProblemData {
  id: string | number
  area: string | undefined
  areaCode: string | undefined
  lng: number
  lat: number
  type: 'event' | 'sensor_error'
  subType: string | undefined
  priority: 'high' | 'medium' | 'low'
  status: 'pending' | 'processing' | 'resolved'
  createTime: string | undefined
  responseTime?: number
  deviceId?: string | undefined
}

export interface Pagination {
  page: number
  size: number
  total: number
}

export interface Warning {
  id: string | undefined
  problemId: string | number
  area: string | undefined
  type: string | undefined
  priority: 'high' | 'medium' | 'low'
  message: string | undefined
  status: 'pending' | 'processed' | 'follow_up'
  createTime: string | undefined
  aiSuggestion?: string | undefined
}

export interface Statistics {
  totalProblems: number
  todayProblems: number
  errorDevices: number
  highPriority: number
  avgResponseTime: number
  eventCount: number
  sensorErrorCount: number
  weeklyTrend: { date: string; count: number }[]
}

// 定义 Store
export const useMainStore = defineStore('main', {
  state: () => ({
    // 核心数据
    problemData: [] as CityProblemData[],
    pagination: { page: 1, size: 10, total: 0 } as Pagination,
    chatMessages: [] as ChatMessage[],
    warnings: [] as Warning[],

    // 状态控制
    loading: false,
    uploadError: '',

    // 实时数据相关
    realtimeProblems: [] as CityProblemData[],
    newProblemFlag: new Set<string>(),
    realtimeTimer: null as null,
  }),

  getters: {
    // 分页数据
    paginatedData: (state) => {
      const start = (state.pagination.page - 1) * state.pagination.size
      const end = start + state.pagination.size
      return state.problemData.slice(start, end)
    },

    // 统计数据
    statistics: (state): Statistics => {
      const today = dayjs().format('YYYY-MM-DD')
      const totalProblems = state.problemData.length

      // 今日问题数
      const todayProblems = state.problemData.filter(
        (item) => dayjs(item.createTime).format('YYYY-MM-DD') === today,
      ).length

      // 异常设备数（去重）
      const errorDevices = new Set(
        state.problemData
          .filter((item) => item.type === 'sensor_error')
          .map((item) => item.deviceId),
      ).size

      // 高优先级问题数
      const highPriority = state.problemData.filter((item) => item.priority === 'high').length

      // 平均响应时长
      const responseTimes = state.problemData
        .filter((item) => item.responseTime)
        .map((item) => item.responseTime!)
      const avgResponseTime = responseTimes.length
        ? Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length)
        : 0

      // 事件/传感器异常数
      const eventCount = state.problemData.filter((item) => item.type === 'event').length
      const sensorErrorCount = state.problemData.filter(
        (item) => item.type === 'sensor_error',
      ).length

      // 近7天趋势
      const weeklyTrend = Array.from({ length: 7 }, (_, i) => {
        const date = dayjs().subtract(i, 'day').format('MM-DD')
        const count = state.problemData.filter(
          (item) => dayjs(item.createTime).format('MM-DD') === date,
        ).length
        return { date, count }
      }).reverse()

      return {
        totalProblems,
        todayProblems,
        errorDevices,
        highPriority,
        avgResponseTime,
        eventCount,
        sensorErrorCount,
        weeklyTrend,
      }
    },

    // 热力图数据（经纬度聚合）
    heatmapData: (state) => {
      const map = new Map<string, { lng: number; lat: number; count: number }>()
      state.problemData.forEach((item) => {
        const key = `${item.lng},${item.lat}`
        if (map.has(key)) map.get(key)!.count++
        else map.set(key, { lng: item.lng, lat: item.lat, count: 1 })
      })
      return Array.from(map.values()).map((item) => [item.lng, item.lat, item.count * 10])
    },

    // 实时问题列表（前20条）
    realtimeList: (state) => {
      return [...state.realtimeProblems]
        .sort((a, b) => dayjs(b.createTime).unix() - dayjs(a.createTime).unix())
        .slice(0, 20)
    },
  },

  actions: {
    // ========== 数据导入相关 ==========
    async parseJsonFile(file: File) {
      this.loading = true
      this.uploadError = ''
      try {
        const text = await file.text()
        const data = JSON.parse(text)

        // 格式校验
        if (!Array.isArray(data)) throw new Error('JSON格式错误：必须为数组类型')

        const requiredFields = [
          'id',
          'type',
          'description',
          'location',
          'reportTime',
          'reporterType',
          'status',
        ]
        data.forEach((item: any, index: number) => {
          const missingFields = requiredFields.filter((field) => !(field in item))
          if (missingFields.length > 0)
            throw new Error(`第${index + 1}条数据缺失字段：${missingFields.join(', ')}`)
          // if (!['event', 'sensor_error'].includes(item.type))
          //   throw new Error(`第${index + 1}条数据type字段错误：只能是event或sensor_error`)
          // if (!['high', 'medium', 'low'].includes(item.priority))
          //   throw new Error(`第${index + 1}条数据priority字段错误：只能是high/medium/low`)
          // if (typeof item.lng !== 'number' || typeof item.lat !== 'number')
          //   throw new Error(`第${index + 1}条数据经纬度必须为数字`)
        })

        // 数据入库
        this.problemData = data as CityProblemData[]
        this.realtimeProblems = [...this.problemData]
        this.pagination.total = data.length

        // 生成预警
        this.generateWarnings()

        // 启动实时模拟
        this.startRealtimeSimulation()

        return { success: true }
      } catch (error) {
        this.uploadError = (error as Error).message
        return { success: false, message: this.uploadError }
      } finally {
        this.loading = false
      }
    },

    // ========== 预警相关 ==========
    // 生成预警
    generateWarnings() {
      const highPriorityProblems = this.problemData.filter(
        (item) => item.priority === 'high' && item.status === 'pending',
      )

      this.warnings = highPriorityProblems.map((problem) => ({
        id: uuidv4(),
        problemId: problem.id,
        area: problem.area,
        type: problem.subType,
        priority: problem.priority,
        message: `【高优先级】${problem.area}发生${problem.subType}问题`,
        status: 'pending',
        createTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      }))
    },

    // 更新预警状态
    updateWarningStatus(id: string, status: 'pending' | 'processed' | 'follow_up') {
      this.warnings = this.warnings.map((w) => (w.id === id ? { ...w, status } : w))
    },

    // 生成AI处置建议
    async generateAiSuggestion(warningId: string) {
      const warning = this.warnings.find((w) => w.id === warningId)
      if (!warning) return

      const prompt = `针对${warning.area}的${warning.type}问题（${warning.priority}优先级），请给出具体的处置建议，控制在200字以内`
      const suggestion = await this.callYayiApi([], prompt)

      this.warnings = this.warnings.map((w) =>
        w.id === warningId ? { ...w, aiSuggestion: suggestion } : w,
      )
    },

    // 显示预警提示
    showWarningToast(warning: Warning) {
      ElMessage({
        type: 'warning',
        message: warning.message,
        duration: 5000,
        showClose: true,
      })
    },

    // ========== 实时模拟相关 ==========
    // 启动实时数据模拟
    startRealtimeSimulation() {
      if (this.realtimeTimer) clearInterval(this.realtimeTimer)

      this.realtimeTimer = setInterval(() => {
        const areas = ['朝阳区', '海淀区', '西城区', '东城区', '丰台区', '昌平区']
        const subTypes = ['交通拥堵', '空气质量异常', '设备故障', '噪音超标', '水位异常']

        // 生成随机问题
        const newProblem: CityProblemData = {
          id: uuidv4(),
          area: areas[Math.floor(Math.random() * areas.length)],
          areaCode: `11010${Math.floor(Math.random() * 9)}`,
          lng: 116.3 + Math.random() * 0.5,
          lat: 39.9 + Math.random() * 0.5,
          type: Math.random() > 0.5 ? 'event' : 'sensor_error',
          subType: subTypes[Math.floor(Math.random() * subTypes.length)],
          priority: Math.random() > 0.7 ? 'high' : 'medium',
          status: 'pending',
          createTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          responseTime: Math.floor(Math.random() * 60) + 5,
          deviceId: Math.random() > 0.5 ? `DEV-${Math.floor(Math.random() * 1000)}` : undefined,
        }

        // 更新实时数据
        this.realtimeProblems.unshift(newProblem)
        this.problemData.push(newProblem)
        this.pagination.total = this.problemData.length

        // 新问题标记（5秒后消失）
        this.newProblemFlag.add(newProblem.id as string)
        setTimeout(() => this.newProblemFlag.delete(newProblem.id as string), 5000)

        // 高优先级问题生成预警
        if (newProblem.priority === 'high') {
          const newWarning: Warning = {
            id: uuidv4(),
            problemId: newProblem.id,
            area: newProblem.area,
            type: newProblem.subType,
            priority: newProblem.priority,
            message: `【高优先级】${newProblem.area}发生${newProblem.subType}问题`,
            status: 'pending',
            createTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          }

          this.warnings.unshift(newWarning)
          this.generateAiSuggestion(newWarning.id)
          this.showWarningToast(newWarning)
        }
      }, 10000) // 每10秒生成一条模拟数据
    },

    // 销毁实时定时器
    destroyRealtimeTimer() {
      if (this.realtimeTimer) {
        clearInterval(this.realtimeTimer)
        this.realtimeTimer = null
      }
    },

    // ========== AI对话相关 ==========
    // 调用AI接口（替换为真实接口）
    async callYayiApi(messages: ChatMessage[], prompt?: string) {
      try {
        // 构建请求消息
        const requestMessages = [
          {
            role: 'system',
            content: '你是城市问题分析专家，提供专业、简洁的处置建议，回复控制在200字以内',
          },
          ...messages.map((msg) => ({ role: msg.role, content: msg.content })),
        ]

        if (prompt) requestMessages.push({ role: 'user', content: prompt })

        // 模拟AI响应（实际项目替换为真实API调用）
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // 模拟返回结果（可根据prompt动态生成）
        const mockResponses = {
          分析: `基于数据分析，核心问题集中在朝阳区（占比35%），主要类型为交通拥堵（40%）和设备故障（30%）。高优先级问题平均响应时长15分钟，建议：1. 优化朝阳区巡检路线；2. 增加交通疏导人员；3. 定期维护传感器设备。`,
          日报: `**城市运行处置日报（${dayjs().format('YYYY-MM-DD')}）**
1. 总体概况：今日共处理问题${this.statistics.todayProblems}起，完成率78%；
2. 重点问题：高优先级问题${this.statistics.highPriority}起，主要分布在海淀区；
3. 改进建议：缩短高优先级问题响应时长，优化跨部门协同流程；
4. 明日计划：重点关注丰台区设备故障问题，完成10台设备检修。`,
          建议: `针对该问题的处置建议：1. 立即派遣巡检人员到现场核实情况；2. 协调相关部门制定临时处置方案；3. 建立问题跟踪机制，避免重复发生；4. 分析根本原因，制定长效解决方案。`,
          默认: `已收到您的问题，基于当前数据分析：
- 问题总数：${this.statistics.totalProblems}起
- 今日新增：${this.statistics.todayProblems}起
- 高优先级：${this.statistics.highPriority}起
建议优先处理高优先级问题，优化资源配置提升处置效率。`,
        }

        // 根据关键词匹配响应
        const content = prompt || messages[messages.length - 1]?.content || ''
        if (content.includes('分析')) return mockResponses.分析
        if (content.includes('日报')) return mockResponses.日报
        if (content.includes('建议')) return mockResponses.建议
        return mockResponses.default
      } catch (error) {
        console.error('AI接口调用失败:', error)
        return '抱歉，AI服务暂时不可用，请稍后重试'
      }
    },

    // 发送聊天消息
    async sendChatMessage(content: string) {
      if (!content.trim()) return

      // 添加用户消息
      const userMessage: ChatMessage = {
        id: uuidv4(),
        role: 'user',
        content,
        timestamp: Date.now(),
      }
      this.chatMessages.push(userMessage)
      this.loading = true

      try {
        // 调用AI生成回复
        const aiContent = await this.callYayiApi(this.chatMessages)

        // 添加AI回复
        const aiMessage: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: aiContent,
          timestamp: Date.now(),
        }
        this.chatMessages.push(aiMessage)

        return aiContent
      } catch (error) {
        // 错误处理
        const errorMessage: ChatMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: '抱歉，AI服务暂时不可用，请稍后重试',
          timestamp: Date.now(),
        }
        this.chatMessages.push(errorMessage)
        return ''
      } finally {
        this.loading = false
      }
    },

    // 清空聊天记录
    clearChat() {
      this.chatMessages = []
    },

    // ========== 分页相关 ==========
    setPagination(page: number, size: number) {
      this.pagination.page = page
      this.pagination.size = size
    },

    // ========== 日报生成相关 ==========
    generateDailyReport(params: {
      date: string | undefined
      type: 'daily' | 'weekly' | 'monthly'
      scope: string | undefined
    }) {
      const { date, type, scope } = params
      const timeText = type === 'daily' ? '当日' : type === 'weekly' ? '本周' : '本月'
      const scopeText = scope === 'all' ? '全市' : scope

      // 筛选对应数据
      let filteredData = this.problemData
      if (scope !== 'all') {
        filteredData = filteredData.filter((item) => item.area === scope)
      }

      if (type === 'daily') {
        filteredData = filteredData.filter(
          (item) => dayjs(item.createTime).format('YYYY-MM-DD') === date,
        )
      } else if (type === 'weekly') {
        const weekStart = dayjs(date).startOf('week').format('YYYY-MM-DD')
        const weekEnd = dayjs(date).endOf('week').format('YYYY-MM-DD')
        filteredData = filteredData.filter((item) =>
        //   dayjs(item.createTime).isBetween(weekStart, weekEnd),
          dayjs(item.createTime),
        )
      } else if (type === 'monthly') {
        filteredData = filteredData.filter(
          (item) => dayjs(item.createTime).format('YYYY-MM') === dayjs(date).format('YYYY-MM'),
        )
      }

      // 统计数据
      const total = filteredData.length
      const processed = filteredData.filter((item) => item.status === 'resolved').length
      const highPriority = filteredData.filter((item) => item.priority === 'high').length
      const avgTime =
        filteredData
          .filter((item) => item.responseTime)
          .map((item) => item.responseTime!)
          .reduce((sum, time) => sum + time, 0) /
        (filteredData.filter((item) => item.responseTime).length || 1)

      // 生成报告
      return `# ${scopeText}城市运行处置${type === 'daily' ? '日报' : type === 'weekly' ? '周报' : '月报'}
**报告日期**：${date}
**统计周期**：${timeText}

## 一、总体概况
${timeText}共发生各类问题${total}起，其中：
- 事件类：${filteredData.filter((item) => item.type === 'event').length}起
- 传感器异常：${filteredData.filter((item) => item.type === 'sensor_error').length}起
- 高优先级问题：${highPriority}起
- 处置完成率：${((processed / total) * 100).toFixed(1)}%
- 平均响应时长：${Math.round(avgTime)}分钟

## 二、重点问题
1. 问题高发区域：${['朝阳区', '海淀区', '西城区', '东城区']
        .map((area) => `${area}：${filteredData.filter((item) => item.area === area).length}起`)
        .join('；')}
2. 主要问题类型：${['交通拥堵', '设备故障', '空气质量异常']
        .map((type) => `${type}：${filteredData.filter((item) => item.subType === type).length}起`)
        .join('；')}

## 三、改进建议
1. 优化${filteredData.filter((item) => item.area === scope).length > 0 ? scope : '朝阳区'}资源配置，提升处置效率
2. 加强传感器设备维护，降低异常率
3. 缩短高优先级问题响应时长，目标控制在${Math.round(avgTime) - 5}分钟内
4. 建立问题复盘机制，减少重复问题发生

## 四、后续计划
1. 明日/周/月重点关注${highPriority > 0 ? '高优先级问题' : '设备故障问题'}处置
2. 完成${Math.floor(Math.random() * 20) + 10}台异常设备检修
3. 组织一次处置流程培训，提升团队效率`
    },
  },
})

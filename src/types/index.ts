// 城市问题数据类型
export interface CityProblemData {
  id: string | number
  area: string // 区域名称
  areaCode: string // 区域编码
  lng: number // 经度
  lat: number // 纬度
  type: 'event' | 'sensor_error' // 问题类型
  subType: string // 子类型（如：交通、环境、设备故障等）
  priority: 'high' | 'medium' | 'low' // 优先级
  status: 'pending' | 'processing' | 'resolved' // 处理状态
  createTime: string // 创建时间
  responseTime?: number // 响应时长（分钟）
  deviceId?: string // 设备ID（传感器异常时）
}

// AI对话消息类型
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

// 分页参数
export interface Pagination {
  page: number
  size: number
  total: number
}

// 预警类型
export interface Warning {
  id: string
  problemId: string | number
  area: string
  type: string
  priority: 'high' | 'medium' | 'low'
  message: string
  status: 'pending' | 'processed' | 'follow_up' // 预警状态
  createTime: string
  aiSuggestion?: string // AI处置建议
}

// 统计概览
export interface Statistics {
  totalProblems: number // 总问题数
  todayProblems: number // 今日新增
  errorDevices: number // 异常设备数
  highPriority: number // 高优先级问题数
  avgResponseTime: number // 平均响应时长
  eventCount: number // 事件类数量
  sensorErrorCount: number // 传感器异常数量
  weeklyTrend: { date: string; count: number }[] // 近7天趋势
}

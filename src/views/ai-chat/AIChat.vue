<template>
  <div class="ai-chat-container">
    <el-card class="chat-card" shadow="hover">
      <template #header>
        <div class="chat-header">
          <span>AI智能对话助手</span>
          <div class="chat-actions">
            <el-button size="small" type="text" @click="clearChat">
              <el-icon><Delete /></el-icon>清空对话
            </el-button>
            <el-button size="small" type="text" @click="showTemplate = !showTemplate">
              <el-icon><Files /></el-icon>快捷模板
            </el-button>
          </div>
        </div>
      </template>

      <div class="chat-wrapper">
        <!-- 快捷模板 -->
        <div class="template-panel" v-if="showTemplate">
          <div class="template-title">常用分析模板</div>
          <div class="template-list">
            <el-button
              v-for="template in chatTemplates"
              :key="template.id"
              size="small"
              type="primary"
              plain
              @click="useTemplate(template.content)"
              class="template-btn"
            >
              {{ template.title }}
            </el-button>
          </div>
        </div>

        <!-- 对话内容 -->
        <div class="chat-content" ref="chatContentRef">
          <div v-if="chatMessages.length === 0" class="empty-chat">
            <el-empty description="开始与AI助手对话吧"></el-empty>
            <div class="chat-tips">
              <p>💡 可提问：</p>
              <ul>
                <li>分析朝阳区近7天的问题分布</li>
                <li>生成今日处置工作总结</li>
                <li>给出交通拥堵问题的解决方案</li>
              </ul>
            </div>
          </div>

          <div
            v-for="message in chatMessages"
            :key="message.id"
            class="message-item"
            :class="message.role"
          >
            <div class="avatar">
              <!-- <el-avatar :icon="message.role === 'user' ? <User /> : <Robot />"></el-avatar> -->
            </div>
            <div class="message-content">
              <div class="message-time">{{ formatTime(message.timestamp) }}</div>
              <div class="message-text" v-html="formatMessage(message.content)"></div>
              <div class="message-actions">
                <el-button size="small" type="text" @click="copyMessage(message.content)">
                  <el-icon><CopyDocument /></el-icon>
                </el-button>
              </div>
            </div>
          </div>

          <div v-if="loading" class="loading-message">
            <!-- <el-avatar icon="<Robot />"></el-avatar> -->
            <div class="loading-content">
              <el-skeleton :rows="3" width="200px" animated />
            </div>
          </div>
        </div>

        <!-- 输入框 -->
        <div class="chat-input">
          <el-input
            v-model="inputContent"
            type="textarea"
            placeholder="输入您的问题，例如：分析今日高优先级问题的处置情况..."
            :rows="4"
            @keyup.enter="sendMessage"
          ></el-input>
          <div class="input-actions">
            <el-upload
              class="upload-btn"
              :auto-upload="false"
              :on-change="handleFileUpload"
              accept=".txt,.json"
              show-file-list="false"
            >
              <el-button size="small" type="text">
                <el-icon><Upload /></el-icon>上传文件
              </el-button>
            </el-upload>
            <el-button
              type="primary"
              @click="sendMessage"
              :disabled="!inputContent.trim() || loading"
            >
              发送
              <!-- <el-icon><PaperPlane /></el-icon> -->
            </el-button>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Delete,
  Files,
  User,
//   Robot,
  CopyDocument,
  Upload,
  // PaperPlane,
} from '@element-plus/icons-vue'
import { useMainStore } from '@/store'
// import { ChatMessage } from '@/types'

const store = useMainStore()
const chatContentRef = ref<HTMLDivElement>()
const inputContent = ref('')
const loading = ref(false)
const showTemplate = ref(false)
const chatMessages = ref<[]>(store.chatMessages)

// 快捷模板
const chatTemplates = ref([
  {
    id: 1,
    title: '今日问题分析',
    content: '分析今日所有问题的类型分布、区域分布和处置情况，给出核心结论和改进建议',
  },
  {
    id: 2,
    title: '高优先级问题处置',
    content: '分析今日高优先级问题的处置进度，识别瓶颈并给出优化方案',
  },
  {
    id: 3,
    title: '传感器异常分析',
    content: '分析近期传感器异常的主要原因，给出设备维护和故障预防建议',
  },
  {
    id: 4,
    title: '生成处置日报',
    content: '基于今日数据生成一份完整的处置日报，包含概况、处置情况、重点问题和明日计划',
  },
  {
    id: 5,
    title: '区域对比分析',
    content: '对比朝阳区和海淀区的问题分布和处置效率，找出差异和改进方向',
  },
])

// 格式化时间
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString()
}

// 格式化消息内容（支持换行）
const formatMessage = (content: string) => {
  return content.replace(/\n/g, '<br>')
}

// 使用快捷模板
const useTemplate = (content: string) => {
  inputContent.value = content
  showTemplate.value = false
}

// 发送消息
const sendMessage = async () => {
  if (!inputContent.value.trim()) return

  // 添加用户消息
//   const userMessage: ChatMessage = {
//     id: Date.now().toString(),
//     role: 'user',
//     content: inputContent.value,
//     timestamp: Date.now(),
//   }

  chatMessages.value.push(userMessage)
  const tempContent = inputContent.value
  inputContent.value = ''
  loading.value = true

  // 滚动到底部
  scrollToBottom()

  try {
    // 调用AI接口
    await store.sendChatMessage(tempContent)
    // 更新本地消息列表
    chatMessages.value = [...store.chatMessages]
  } catch (error) {
    ElMessage.error('消息发送失败：' + (error as Error).message)
  } finally {
    loading.value = false
    // 滚动到底部
    scrollToBottom()
  }
}

// 上传文件
const handleFileUpload = (file: any) => {
  ElMessage.info(`暂不支持文件上传，您可以复制文件内容到输入框中提问`)
}

// 复制消息
const copyMessage = (content: string) => {
  navigator.clipboard.writeText(content)
  ElMessage.success('内容已复制到剪贴板')
}

// 清空对话
const clearChat = () => {
  store.clearChat()
  chatMessages.value = []
  inputContent.value = ''
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (chatContentRef.value) {
      chatContentRef.value.scrollTop = chatContentRef.value.scrollHeight
    }
  })
}

// 监听store中的消息变化
watch(
  () => store.chatMessages,
  (newVal) => {
    chatMessages.value = newVal
    scrollToBottom()
  },
  { deep: true },
)

// 初始化滚动到底部
scrollToBottom()
</script>

<style scoped>
.ai-chat-container {
  width: 100%;
  height: 100%;
}

.chat-card {
  background: linear-gradient(135deg, #1e293b, #0f172a);
  border: 1px solid #334155;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-actions {
  display: flex;
  gap: 10px;
}

.chat-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 10px 0;
}

.template-panel {
  padding: 10px;
  border-bottom: 1px solid #334155;
  margin-bottom: 10px;
}

.template-title {
  font-size: 14px;
  color: #00c6ff;
  margin-bottom: 10px;
}

.template-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.template-btn {
  margin-bottom: 8px;
}

.chat-content {
  flex: 1;
  overflow: auto;
  padding: 0 10px;
  margin-bottom: 10px;
}

.empty-chat {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.chat-tips {
  margin-top: 20px;
  text-align: left;
  color: #94a3b8;
}

.chat-tips ul {
  padding-left: 20px;
  margin-top: 10px;
}

.message-item {
  display: flex;
  margin-bottom: 20px;
  width: 100%;
}

.message-item.user {
  flex-direction: row-reverse;
}

.avatar {
  flex-shrink: 0;
  margin-right: 10px;
}

.message-item.user .avatar {
  margin-right: 0;
  margin-left: 10px;
}

.message-content {
  max-width: 70%;
}

.message-item.user .message-content {
  text-align: right;
}

.message-time {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 5px;
}

.message-text {
  padding: 10px 15px;
  border-radius: 8px;
  line-height: 1.6;
}

.message-item:not(.user) .message-text {
  background-color: #1e293b;
  border: 1px solid #334155;
}

.message-item.user .message-text {
  background-color: #00c6ff;
  color: #0f172a;
}

.message-actions {
  margin-top: 5px;
}

.loading-message {
  display: flex;
  margin-bottom: 20px;
}

.loading-content {
  margin-left: 10px;
  padding-top: 5px;
}

.chat-input {
  border-top: 1px solid #334155;
  padding-top: 10px;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

.upload-btn {
  flex-shrink: 0;
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

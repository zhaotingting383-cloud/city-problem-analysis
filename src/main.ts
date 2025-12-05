import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // 若选了 Vue Router 则有
import { createPinia } from 'pinia' // 若选了 Pinia 则有

// 1. 导入 Element Plus 及全局样式
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

// 2. 导入 Element Plus 图标（全局注册）
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

const app = createApp(App)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 挂载依赖
app.use(createPinia())
app.use(router)
app.use(ElementPlus) // 全局使用 Element Plus
app.mount('#app')

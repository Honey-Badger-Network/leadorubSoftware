import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css' // Основные стили
import 'element-plus/theme-chalk/dark/css-vars.css' // Стили темной темы
import './assets/app-theme.css'
import PageHeader from './components/PageHeader.vue'
import PagePanel from './components/PagePanel.vue'

// Импорт локализации
import localeRU from 'element-plus/dist/locale/ru'

const app = createApp(App)

app.component('PageHeader', PageHeader)
app.component('PagePanel', PagePanel)
app.use(router)
app.use(ElementPlus, { locale: localeRU })
app.use(store)

app.mount('#app')

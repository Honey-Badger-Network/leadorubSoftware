<template>
  <PageHeader eyebrow="Финансы команды" title="ЗП РОПа"
    description="Сводные показатели всех лидорубов за выбранную неделю." />

  <el-card shadow="never">
    <template #header>
      <el-space wrap>
        <el-text tag="b" size="large">Период расчёта</el-text>
        <el-tag type="info" effect="plain">Понедельник — воскресенье</el-tag>
      </el-space>
    </template>
    <el-space wrap :size="12">
      <el-button-group>
        <el-button :disabled="loading" @click="moveWeek(-1)">← Предыдущая</el-button>
        <el-button :disabled="loading" @click="moveWeek(1)">Следующая →</el-button>
      </el-button-group>
      <el-date-picker v-model="date" type="date" value-format="YYYY-MM-DD" format="DD.MM.YYYY"
        placeholder="Выберите день недели" aria-label="Дата недели" :clearable="false" :disabled="loading" />
      <el-button :disabled="loading" @click="currentWeek">Текущая неделя</el-button>
      <el-button type="primary" plain :loading="loading" @click="fetchData">Обновить</el-button>
    </el-space>
    <el-divider />
    <el-text type="info">При выборе даты итоги недели пересчитываются автоматически по актуальным данным зарплатной.</el-text>
  </el-card>

  <el-divider />

  <el-card shadow="never">
    <template #header>
      <el-space wrap :size="12">
        <el-text tag="b" size="large">Итоги РОПа</el-text>
        <el-tag v-if="report" effect="light">{{ formatDate(report.gte) }} — {{ formatDate(report.lte) }}</el-tag>
      </el-space>
    </template>
    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" />
    <el-table v-loading="loading" :data="tableRows" border size="large" empty-text="Нет данных для отображения">
      <el-table-column prop="name" label="Имя" min-width="100" fixed>
        <template #default="{ row }"><el-tag size="large">{{ row.name }}</el-tag></template>
      </el-table-column>
      <el-table-column v-for="metric in metrics" :key="metric.key" :label="metric.title" min-width="130" align="right">
        <template #default="{ row }">
          <el-text :tag="['salary', 'clear'].includes(metric.key) ? 'b' : 'span'"
            :type="metric.key === 'clear' ? (row.clear < 0 ? 'danger' : 'success') : metric.key === 'salary' ? 'primary' : undefined">
            {{ formatNumber(row[metric.key]) }}
          </el-text>
        </template>
      </el-table-column>
    </el-table>
    <el-divider />
    <el-descriptions :column="1" size="small">
      <el-descriptions-item label="Зарплата">3 400 ₽ × число дней пн–сб выбранной недели. Воскресенье — 0 ₽.</el-descriptions-item>
      <el-descriptions-item label="Начисление">За полную выбранную неделю, включая дни без статистики.</el-descriptions-item>
      <el-descriptions-item label="Чистая">Сумма чистой всех лидорубов за выбранную неделю.</el-descriptions-item>
    </el-descriptions>
  </el-card>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useStore } from 'vuex'
import dayjs from 'dayjs'

const store = useStore()
const date = ref(dayjs().format('YYYY-MM-DD'))
const report = ref(null)
const loading = ref(false)
const error = ref('')
let requestId = 0
const metrics = [
  { key: 'countCalls', title: 'Звонки' }, { key: 'countLeads', title: 'Лиды' },
  { key: 'countTargets', title: 'Целевые' }, { key: 'countHolds', title: 'Холды' },
  { key: 'sumHold', title: 'Сумма холдов, ₽' }, { key: 'salary', title: 'Зарплата, ₽' },
  { key: 'clear', title: 'Чистая, ₽' }
]
const tableRows = computed(() => report.value ? [report.value.total] : [])
const formatDate = value => dayjs(value).format('DD.MM.YYYY')
const formatNumber = value => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value || 0)
async function fetchData() {
  const id = ++requestId
  report.value = null
  error.value = ''
  if (!date.value) { error.value = 'Выберите дату недели'; loading.value = false; return }
  loading.value = true
  try {
    const response = await store.dispatch('getDataList', { col: 'api/salary/rop', params: { date: date.value } })
    if (id === requestId) report.value = response.data
  } catch (e) {
    if (id === requestId) error.value = e.response?.data?.msg || 'Не удалось загрузить зарплату РОПа'
  } finally { if (id === requestId) loading.value = false }
}
function moveWeek(direction) {
  date.value = dayjs(date.value).add(direction, 'week').format('YYYY-MM-DD')
}
function currentWeek() {
  const today = dayjs().format('YYYY-MM-DD')
  if (date.value === today) fetchData()
  else date.value = today
}
watch(date, fetchData, { immediate: true })
</script>

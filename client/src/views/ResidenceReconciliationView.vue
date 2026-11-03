<template>
  <PageHeader eyebrow="Аналитика" title="Сверка резиденции" description="Сравнение сохранённых лидов с актуальной информацией интеграции. Только просмотр — данные в БД не изменяются." />
  <el-card shadow="never">
    <template #header><el-text tag="b" size="large">Период сверки</el-text></template>
    <el-form label-position="top" @submit.prevent="reconcile">
      <el-form-item label="Тип периода">
        <el-radio-group v-model="mode" :disabled="loading" @change="resetReport">
          <el-radio-button value="week">Неделя</el-radio-button>
          <el-radio-button value="month">Месяц</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item :label="mode === 'week' ? 'Выберите неделю' : 'Выберите месяц'">
        <el-space wrap :size="12">
          <el-button :disabled="loading" @click="shiftPeriod(-1)">← Назад</el-button>
          <el-date-picker :key="mode" v-model="selectedDate" :type="mode" :format="mode === 'week' ? 'DD.MM.YYYY' : 'MM.YYYY'"
            value-format="YYYY-MM-DD" :clearable="false" :disabled="loading" @change="resetReport" />
          <el-button :disabled="loading" @click="shiftPeriod(1)">Вперёд →</el-button>
          <el-tag>{{ formatDate(period.gte) }} — {{ formatDate(period.lte) }}</el-tag>
        </el-space>
      </el-form-item>
      <el-button type="primary" native-type="submit" :loading="loading" :disabled="!period.gte">Сверить резиденцию</el-button>
    </el-form>
    <el-divider />
    <el-text type="info">Дополнительно проверяется следующий день после периода для запоздавших записей интеграции.</el-text>
  </el-card>
  <el-divider />
  <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" />
  <template v-if="report">
    <el-alert :title="message" type="info" show-icon :closable="false" />
    <el-divider />
    <el-card shadow="never">
      <template #header><el-text tag="b" size="large">Сводка по лидорубам</el-text></template>
      <el-table :data="userRows" row-key="userKey" border>
        <el-table-column prop="userName" label="Лидоруб" min-width="180" fixed>
          <template #default="{ row }">
            <el-space direction="vertical" alignment="start" :size="2">
              <el-text :tag="row.isTotal ? 'b' : 'span'">{{ row.userName }}</el-text>
              <el-text v-if="row.skipped" size="small" type="warning">Не сопоставлено: {{ row.skipped }}</el-text>
            </el-space>
          </template>
        </el-table-column>
        <el-table-column label="Лиды" align="center">
          <el-table-column prop="totalLeads" label="Всего" min-width="90" align="right" />
          <el-table-column prop="holdsBefore" label="С холдом: было" min-width="130" align="right" />
          <el-table-column label="С холдом: стало" min-width="165" align="right">
            <template #default="{ row }">
              {{ row.holdsAfter }}
              <el-text :type="deltaType(row.holdsDelta)">[{{ signed(row.holdsDelta) }}]</el-text>
            </template>
          </el-table-column>
        </el-table-column>
        <el-table-column label="Сумма холдов и чистая, ₽" align="center">
          <el-table-column label="Сумма: было" min-width="140" align="right">
            <template #default="{ row }">{{ number(row.sumBefore) }}</template>
          </el-table-column>
          <el-table-column label="Сумма: стало" min-width="140" align="right">
            <template #default="{ row }">{{ number(row.sumAfter) }}</template>
          </el-table-column>
          <el-table-column label="Прирост чистой от холдов*" min-width="190" align="right">
            <template #default="{ row }"><el-text tag="b" :type="deltaType(row.clearDelta)">{{ signed(row.clearDelta) }}</el-text></template>
          </el-table-column>
        </el-table-column>
      </el-table>
      <el-divider />
      <el-space direction="vertical" alignment="start">
        <el-text type="info">С холдом — число лидов со статусами hold, confirmed или refused. Несопоставленные лиды сохраняют в отчёте исходные значения.</el-text>
        <el-text type="info">* Прирост от холдов = (сумма после × 0.6 − ЗП брокера после) − (сумма до × 0.6 − ЗП брокера до). ЗП брокера = floor(сумма холдов × 0.6 × 0.15), рассчитывается по каждому дню. Показана только разница; зарплата лидоруба и постоянные расходы не меняются.</el-text>
      </el-space>
    </el-card>
    <el-divider />
    <el-card shadow="never">
      <template #header><el-text tag="b" size="large">Изменения лидов по сотрудникам</el-text></template>
      <el-empty v-if="!changeGroups.length" description="Отличий от сохранённых данных не найдено" />
      <el-collapse v-else v-model="expandedUsers">
        <el-collapse-item v-for="group in changeGroups" :key="group.userKey" :name="group.userKey" :title="`${group.userName} · ${group.changes.length} лидов с отличиями`">
          <el-table :data="group.changes" row-key="id" border max-height="520">
            <el-table-column label="Лид" min-width="170">
              <template #default="{ row }">
                <el-space direction="vertical" alignment="start" :size="2">
                  <el-text>{{ formatDate(row.date) }} · {{ row.leadProject || 'Без базы' }}</el-text>
                  <el-text type="info" size="small">ID: {{ row.id }}</el-text>
                </el-space>
              </template>
            </el-table-column>
            <el-table-column prop="phone" label="Телефон" min-width="140" />
            <el-table-column label="Статус: БД → резиденция" min-width="250">
              <template #default="{ row }">
                <el-space wrap>
                  <el-tag :type="statusType(row.fromStatus)">{{ row.fromStatus || 'Не указан' }}</el-tag>
                  <el-text>→</el-text>
                  <el-tag :type="statusType(row.toStatus)">{{ row.toStatus }}</el-tag>
                </el-space>
              </template>
            </el-table-column>
            <el-table-column label="Сумма: было → стало, ₽" min-width="190">
              <template #default="{ row }">{{ number(row.before.price) }} → {{ number(row.after.price) }}</template>
            </el-table-column>
            <el-table-column label="Офферы с холдом: было → стало" min-width="190">
              <template #default="{ row }">{{ row.before.countHold || 0 }} → {{ row.after.countHold || 0 }}</template>
            </el-table-column>
            <el-table-column label="Что отличается" min-width="180">
              <template #default="{ row }">{{ changedFields(row.changedFields) }}</template>
            </el-table-column>
          </el-table>
        </el-collapse-item>
      </el-collapse>
    </el-card>
  </template>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useStore } from 'vuex'
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'

dayjs.extend(isoWeek)
const store = useStore()
const mode = ref('week')
const selectedDate = ref(dayjs().format('YYYY-MM-DD'))
const loading = ref(false)
const report = ref(null)
const message = ref('')
const error = ref('')
const expandedUsers = ref([])
const period = computed(() => {
  if (!selectedDate.value || !dayjs(selectedDate.value).isValid()) return { gte: '', lte: '' }
  const unit = mode.value === 'week' ? 'isoWeek' : 'month'
  return { gte: dayjs(selectedDate.value).startOf(unit).format('YYYY-MM-DD'), lte: dayjs(selectedDate.value).endOf(unit).format('YYYY-MM-DD') }
})
const userRows = computed(() => report.value ? [...report.value.users, report.value.total] : [])
const changeGroups = computed(() => {
  if (!report.value) return []
  const groups = new Map(report.value.users.map(user => [user.userKey, { ...user, changes: [] }]))
  for (const change of report.value.changes) groups.get(change.userKey)?.changes.push(change)
  return [...groups.values()].filter(group => group.changes.length)
})
const number = value => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value || 0)
const signed = value => `${value >= 0 ? '+' : ''}${number(value)}`
const deltaType = value => value > 0 ? 'success' : value < 0 ? 'danger' : 'info'
const formatDate = date => date ? dayjs(date).format('DD.MM.YYYY') : '—'
const statusType = status => ({ breaked: 'primary', hold: 'success', invalid: 'danger', refused: 'danger', created: 'info', confirmed: 'warning' }[status] || 'info')
const changedFields = fields => fields.map(field => ({ residenceStatus: 'Статус', price: 'Сумма', countHold: 'Холды', offersList: 'Офферы', broker: 'Брокер' }[field] || field)).join(', ')
function resetReport() { report.value = null; message.value = ''; error.value = ''; expandedUsers.value = [] }
function shiftPeriod(direction) {
  selectedDate.value = dayjs(selectedDate.value).add(direction, mode.value).format('YYYY-MM-DD')
  resetReport()
}
async function reconcile() {
  if (loading.value || !period.value.gte) return
  resetReport()
  loading.value = true
  try {
    const response = await store.dispatch('createDataList', { col: 'api/residence/reconcile', data: { mode: mode.value, ...period.value } })
    report.value = response.data
    message.value = response.msg
    expandedUsers.value = changeGroups.value.map(group => group.userKey)
  } catch (e) {
    error.value = e.response?.data?.msg || e.message
  } finally { loading.value = false }
}
</script>

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
    <el-text type="info">В БД и резиденции используется один и тот же период. Из резиденции берутся все записи с телефонами лидов из БД.</el-text>
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
              <el-text v-if="row.sharedPhone" size="small" type="warning">Телефон у нескольких сотрудников — учтён один раз общей строкой.</el-text>
            </el-space>
          </template>
        </el-table-column>
        <el-table-column label="Лиды" align="center">
          <el-table-column prop="totalLeads" label="Всего в БД" min-width="100" align="right" />
          <el-table-column prop="holdsBefore" label="Холды в БД" min-width="130" align="right" />
          <el-table-column label="Холды в резиденции" min-width="175" align="right">
            <template #default="{ row }">
              <el-text :type="row.holdsAfter !== row.holdsBefore ? 'success' : undefined">{{ row.holdsAfter }}</el-text>
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
        <el-text type="info">Холды — количество записей со статусами hold, confirmed или refused на каждой стороне. Сумма — только по этим статусам: price в БД и price.offer в резиденции. Если совпадений по телефону нет, в резиденции учитывается 0. Повторные телефоны не умножают записи резиденции.</el-text>
        <el-text type="info">* Прирост от холдов = (сумма после × 0.6 − ЗП брокера после) − (сумма до × 0.6 − ЗП брокера до). ЗП брокера = floor(сумма холдов × 0.6 × 0.15), рассчитывается по каждому дню. Показана только разница; зарплата лидоруба и постоянные расходы не меняются.</el-text>
      </el-space>
    </el-card>
    <el-divider />
    <el-card shadow="never">
      <template #header><el-text tag="b" size="large">Изменения лидов</el-text></template>
      <el-table :data="report.changes" row-key="id" border max-height="600" empty-text="Отличий от сохранённых данных не найдено">
        <el-table-column prop="userName" label="Лидоруб" min-width="150" />
        <el-table-column prop="phone" label="Телефон" min-width="140" />
        <el-table-column label="Было в БД" min-width="190">
          <template #default="{ row }">
            <el-space direction="vertical" alignment="start" :size="4">
              <el-space wrap>
                <el-tag v-for="status in row.fromStatuses" :key="status" :type="statusType(status)">{{ status }}</el-tag>
              </el-space>
              <el-text>Холды: {{ row.before.countHold }} · {{ number(row.before.price) }} ₽</el-text>
            </el-space>
          </template>
        </el-table-column>
        <el-table-column label="Стало в резиденции" min-width="190">
          <template #default="{ row }">
            <el-space direction="vertical" alignment="start" :size="4">
              <el-space wrap>
                <el-tag v-for="status in row.toStatuses" :key="status" :type="statusType(status)">{{ status }}</el-tag>
                <el-text v-if="!row.toStatuses.length" type="info">Нет записей</el-text>
              </el-space>
              <el-text>Холды: <el-text :type="row.after.countHold !== row.before.countHold ? 'success' : undefined">{{ row.after.countHold }}</el-text> · {{ number(row.after.price) }} ₽</el-text>
            </el-space>
          </template>
        </el-table-column>
        <el-table-column label="Офферы резиденции" min-width="340">
          <template #default="{ row }">
            <el-space direction="vertical" alignment="start" :size="8">
              <el-space v-for="(offer, index) in row.offers" :key="offer.id || index" wrap :size="6">
                <el-tag v-if="offer.added" type="success" effect="plain" size="small">Добавился</el-tag>
                <el-text>{{ offer.offerName || 'Без названия' }} · {{ number(offer.offerPrice) }} ₽</el-text>
                <el-tag :type="statusType(offer.status)" size="small">{{ offer.status }}</el-tag>
              </el-space>
              <el-text v-if="!row.offers?.length" type="info">Нет офферов</el-text>
            </el-space>
          </template>
        </el-table-column>
      </el-table>
      <el-divider />
      <el-text type="info">«Добавился» — оффер отсутствует в сохранённом списке лидов. Сопоставляем по названию и брокеру, учитывая повторные офферы.</el-text>
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
const period = computed(() => {
  if (!selectedDate.value || !dayjs(selectedDate.value).isValid()) return { gte: '', lte: '' }
  const unit = mode.value === 'week' ? 'isoWeek' : 'month'
  return { gte: dayjs(selectedDate.value).startOf(unit).format('YYYY-MM-DD'), lte: dayjs(selectedDate.value).endOf(unit).format('YYYY-MM-DD') }
})
const userRows = computed(() => report.value ? [...report.value.users, report.value.total] : [])
const number = value => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value || 0)
const signed = value => `${value >= 0 ? '+' : ''}${number(value)}`
const deltaType = value => value > 0 ? 'success' : value < 0 ? 'danger' : 'info'
const formatDate = date => date ? dayjs(date).format('DD.MM.YYYY') : '—'
const statusType = status => ({ breaked: 'primary', hold: 'success', invalid: 'danger', refused: 'danger', created: 'info', confirmed: 'warning' }[status] || 'info')
function resetReport() { report.value = null; message.value = ''; error.value = '' }
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
  } catch (e) {
    error.value = e.response?.data?.msg || e.message
  } finally { loading.value = false }
}
</script>

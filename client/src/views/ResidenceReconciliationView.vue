<template>
  <PageHeader eyebrow="Аналитика" title="Сверка резиденции" description="Сравнение сохранённых лидов с актуальной информацией интеграции. Только просмотр — данные в БД не изменяются." />
  <el-card shadow="never">
    <template #header><el-text tag="b" size="large">Период сверки</el-text></template>
    <el-form label-position="top" @submit.prevent="reconcile">
      <el-form-item label="Тип периода">
        <el-radio-group v-model="mode" :disabled="loading" @change="resetReport">
          <el-radio-button value="week">Неделя</el-radio-button>
          <el-radio-button value="month">Месяц</el-radio-button>
          <el-radio-button value="custom">По дням / произвольный</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <template v-if="mode === 'custom'">
        <el-form-item label="Период лидов из БД">
          <el-date-picker v-model="localRange" type="daterange" format="DD.MM.YYYY" value-format="YYYY-MM-DD"
            start-placeholder="С даты" end-placeholder="По дату" range-separator="—" :disabled="loading" @change="resetReport" />
        </el-form-item>
        <el-form-item label="Период записей резиденции">
          <el-date-picker v-model="residenceRange" type="daterange" format="DD.MM.YYYY" value-format="YYYY-MM-DD"
            start-placeholder="С даты" end-placeholder="По дату" range-separator="—" :disabled="loading" @change="resetReport" />
        </el-form-item>
      </template>
      <el-form-item v-else :label="mode === 'week' ? 'Выберите неделю' : 'Выберите месяц'">
        <el-space wrap :size="12">
          <el-button :disabled="loading" @click="shiftPeriod(-1)">← Назад</el-button>
          <el-date-picker :key="mode" v-model="selectedDate" :type="mode" :format="mode === 'week' ? 'DD.MM.YYYY' : 'MM.YYYY'"
            value-format="YYYY-MM-DD" :clearable="false" :disabled="loading" @change="resetReport" />
          <el-button :disabled="loading" @click="shiftPeriod(1)">Вперёд →</el-button>
          <el-tag>{{ formatDate(period.gte) }} — {{ formatDate(period.lte) }}</el-tag>
        </el-space>
      </el-form-item>
      <el-button type="primary" native-type="submit" :loading="loading" :disabled="!isPeriodValid">Сверить резиденцию</el-button>
    </el-form>
    <el-divider />
    <el-text type="info">{{ mode === 'custom' ? 'Диапазоны независимы: в каждом можно выбрать один или несколько дней, включая обе даты.' : 'В БД и резиденции используется один и тот же период.' }} Из резиденции берутся все записи с телефонами выбранных лидов из БД.</el-text>
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
              <el-text :type="row.holdsAfter !== row.holdsBefore ? 'success' : undefined" :tag="row.holdsAfter !== row.holdsBefore ? 'b' : 'span'">{{ row.holdsAfter }}</el-text>
            </template>
          </el-table-column>
        </el-table-column>
        <el-table-column label="Сумма холдов и чистая, ₽" align="center">
          <el-table-column label="Сумма: было" min-width="140" align="right">
            <template #default="{ row }">{{ number(row.sumBefore) }}</template>
          </el-table-column>
          <el-table-column label="Сумма: стало" min-width="140" align="right">
            <template #default="{ row }">
              <el-text :type="row.sumAfter !== row.sumBefore ? 'success' : undefined" :tag="row.sumAfter !== row.sumBefore ? 'b' : 'span'">{{ number(row.sumAfter) }}</el-text>
            </template>
          </el-table-column>
          <el-table-column label="Прирост чистой от холдов*" min-width="190" align="right">
            <template #default="{ row }"><el-text tag="b" :type="deltaType(row.clearDelta)">{{ signed(row.clearDelta) }}</el-text></template>
          </el-table-column>
        </el-table-column>
      </el-table>
      <el-divider />
      <el-space direction="vertical" alignment="start">
        <el-text type="info">Холды в БД — сумма countHold выбранных лидов. В резиденции считаются все записи со статусами hold, confirmed или refused. Сумма холдов: price в БД и price.offer в резиденции. Если совпадений по телефону нет, в резиденции учитывается 0. Повторные телефоны не умножают записи резиденции.</el-text>
        <el-text type="info">* Прирост от холдов = (сумма после × 0.6 − ЗП брокера после) − (сумма до × 0.6 − ЗП брокера до). ЗП брокера = floor(сумма холдов × 0.6 × 0.15), рассчитывается по каждому дню. Показана только разница; зарплата лидоруба и постоянные расходы не меняются.</el-text>
      </el-space>
    </el-card>
    <el-divider />
    <el-card shadow="never">
      <template #header><el-text tag="b" size="large">Изменения лидов</el-text></template>
      <el-table :data="sortedChanges" row-key="id" border max-height="600" empty-text="Отличий от сохранённых данных не найдено">
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
              <el-space v-for="(offer, index) in row.newOffers" :key="offer.id || index" wrap :size="6">
                <el-tag type="success" effect="plain" size="small">Добавился</el-tag>
                <el-text>{{ offer.offerName || 'Без названия' }} · {{ number(offer.offerPrice) }} ₽</el-text>
                <el-tag :type="statusType(offer.status)" size="small">{{ offer.status }}</el-tag>
              </el-space>
              <el-text v-if="!row.offers?.length" type="info">Нет офферов</el-text>
              <el-text v-else-if="!row.newOffers?.length" type="primary">Всё без изменений</el-text>
            </el-space>
          </template>
        </el-table-column>
      </el-table>
      <el-divider />
      <el-text type="info">«Добавился» — оффер отсутствует в сохранённом списке лидов. Сопоставляем по названию и брокеру, учитывая повторные офферы.</el-text>
    </el-card>
  </template>
</template>

<script>
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
dayjs.extend(isoWeek)

export default {
  data() {
    const today = dayjs().format('YYYY-MM-DD')
    return { mode: 'week', selectedDate: today, localRange: [today, today], residenceRange: [today, today],
      loading: false, report: null, message: '', error: '' }
  },
  computed: {
    period() {
      if (this.mode === 'custom') return { gte: this.localRange?.[0], lte: this.localRange?.[1], residenceGte: this.residenceRange?.[0], residenceLte: this.residenceRange?.[1] }
      if (!this.selectedDate || !dayjs(this.selectedDate).isValid()) return { gte: '', lte: '' }
      const unit = this.mode === 'week' ? 'isoWeek' : 'month'
      return { gte: dayjs(this.selectedDate).startOf(unit).format('YYYY-MM-DD'), lte: dayjs(this.selectedDate).endOf(unit).format('YYYY-MM-DD') }
    },
    isPeriodValid() {
      const { gte, lte, residenceGte, residenceLte } = this.period
      return Boolean(gte && lte && gte <= lte && (this.mode !== 'custom' || (residenceGte && residenceLte && residenceGte <= residenceLte)))
    },
    userRows() { return this.report ? [...this.report.users, this.report.total] : [] },
    sortedChanges() { return [...(this.report?.changes || [])].sort((a, b) => this.offerSortOrder(a) - this.offerSortOrder(b)) }
  },
  methods: {
    offerSortOrder(row) { return row.newOffers?.length ? 0 : row.offers?.length ? 1 : 2 },
    number(value) { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value || 0) },
    signed(value) { return (value >= 0 ? '+' : '') + this.number(value) },
    deltaType(value) { return value > 0 ? 'success' : value < 0 ? 'danger' : 'info' },
    formatDate(date) { return date ? dayjs(date).format('DD.MM.YYYY') : '—' },
    statusType(status) { return ({ breaked: 'primary', hold: 'success', invalid: 'danger', refused: 'danger', created: 'info', confirmed: 'warning' }[status] || 'info') },
    resetReport() { this.report = null; this.message = ''; this.error = '' },
    shiftPeriod(direction) { this.selectedDate = dayjs(this.selectedDate).add(direction, this.mode).format('YYYY-MM-DD'); this.resetReport() },
    async reconcile() {
      if (this.loading || !this.isPeriodValid) return
      this.resetReport()
      this.loading = true
      try {
        const response = await this.$store.dispatch('createDataList', { col: 'api/residence/reconcile', data: { mode: this.mode, ...this.period } })
        this.report = response.data
        this.message = response.msg
      } catch (e) { this.error = e.response?.data?.msg || e.message }
      finally { this.loading = false }
    }
  }
}
</script>

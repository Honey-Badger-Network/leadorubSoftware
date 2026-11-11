<template>
  <PageHeader eyebrow="Аналитика" title="История сверок резиденции"
    description="Автоматическое обновление лидов каждый день в 21:00 по Москве, с понедельника по текущий день." />
  <el-card shadow="never">
    <el-form inline @submit.prevent="reload">
      <el-form-item label="Неделя создания лидов">
        <el-date-picker v-model="range" type="daterange" value-format="YYYY-MM-DD" format="DD.MM.YYYY"
          start-placeholder="С даты" end-placeholder="По дату" :clearable="false" />
      </el-form-item>
      <el-form-item><el-button type="primary" :loading="loading" native-type="submit">Показать</el-button></el-form-item>
    </el-form>
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    <el-table v-loading="loading" :data="rows" row-key="_id" border empty-text="За выбранный период изменений нет">
      <el-table-column label="Дата сверки" min-width="125">
        <template #default="{ row }">{{ date(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column label="Дата лида" min-width="125">
        <template #default="{ row }">{{ date(row.date) }}</template>
      </el-table-column>
      <el-table-column prop="leadId" label="Телефон лида" min-width="145" />
      <el-table-column label="Холды" min-width="110">
        <template #default="{ row }">{{ row.prevCountHold }} → <el-text tag="b" :type="row.prevCountHold !== row.currentCountHold ? 'success' : undefined">{{ row.currentCountHold }}</el-text></template>
      </el-table-column>
      <el-table-column label="Сумма холдов, ₽" min-width="170">
        <template #default="{ row }">{{ money(row.prevSumHold) }} → <el-text tag="b" :type="row.prevSumHold !== row.currentSumHold ? 'success' : undefined">{{ money(row.currentSumHold) }}</el-text></template>
      </el-table-column>
      <el-table-column label="Офферы" min-width="160">
        <template #default="{ row }">
          <el-space>{{ row.prevOffersList?.length || 0 }} → {{ row.currentOffersList?.length || 0 }}
            <el-button type="primary" link @click="openOffers(row)">Сравнить</el-button></el-space>
        </template>
      </el-table-column>
    </el-table>
    <el-divider />
    <el-pagination v-model:current-page="page" :page-size="30" :total="total" layout="total, prev, pager, next" @current-change="load" />
  </el-card>
  <el-dialog :model-value="Boolean(selected)" @update:model-value="value => { if (!value) selected = null }"
    :title="`Офферы · ${selected?.leadId || ''}`" width="min(900px, 94vw)" destroy-on-close>
    <el-row v-if="selected" :gutter="20">
      <el-col v-for="side in sides" :key="side.key" :xs="24" :sm="12">
        <el-card shadow="never">
          <template #header><el-text tag="b">{{ side.label }}</el-text></template>
          <el-empty v-if="!selected[side.key]?.length" description="Нет офферов" :image-size="60" />
          <div v-for="(offer, index) in selected[side.key]" :key="index">
            <el-space direction="vertical" alignment="start" :size="4">
              <el-text tag="b">{{ offer.offerName || 'Без названия' }}</el-text>
              <el-space><el-text>{{ money(offer.price) }} ₽</el-text><el-tag :type="statusType(offer.status)">{{ offer.status }}</el-tag></el-space>
              <el-text v-if="offer.broker" type="info">{{ offer.broker }}</el-text>
            </el-space>
            <el-divider v-if="index < selected[side.key].length - 1" />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </el-dialog>
</template>

<script>
import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
dayjs.extend(isoWeek)

export default {
  data() {
    return {
      range: [dayjs().startOf('isoWeek').format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')],
      rows: [], total: 0, page: 1, loading: false, error: '', selected: null, requestId: 0,
      sides: [{ key: 'prevOffersList', label: 'Было' }, { key: 'currentOffersList', label: 'Стало' }]
    }
  },
  methods: {
    date(value) { return dayjs(value).format('DD.MM.YYYY') },
    money(value) { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value || 0) },
    statusType(status) { return ({ breaked: 'primary', hold: 'success', confirmed: 'warning', invalid: 'danger', refused: 'danger', created: 'info' }[status] || 'info') },
    openOffers(row) { this.selected = row },
    async load() {
      if (!this.range?.length) return
      const id = ++this.requestId
      this.loading = true
      this.error = ''
      try {
        const result = await this.$store.dispatch('getDataList', { col: 'api/residence/sync-history', params: { gte: this.range[0], lte: this.range[1], page: this.page } })
        if (id !== this.requestId) return
        this.rows = result.data
        this.total = result.total
      } catch (e) {
        if (id !== this.requestId) return
        this.rows = []
        this.total = 0
        this.error = e.response?.data?.msg || e.message
      } finally { if (id === this.requestId) this.loading = false }
    },
    reload() { this.page = 1; this.load() }
  },
  mounted() { this.load() }
}
</script>

<template>
  <PageHeader
    eyebrow="Скорозвон"
    title="Лиды проектов"
    description="Новые лиды проектов, сохранённые без повторов по дате и телефону."
  />

  <el-card shadow="never">
    <el-form inline @submit.prevent="reload">
      <el-form-item label="Период лидов">
        <el-date-picker
          v-model="range"
          type="daterange"
          value-format="YYYY-MM-DD"
          format="DD.MM.YYYY"
          start-placeholder="С даты"
          end-placeholder="По дату"
          :clearable="false"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="loading" native-type="submit">Показать</el-button>
      </el-form-item>
    </el-form>

    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />

    <el-table
      v-loading="loading"
      :data="rows"
      border
      stripe
      empty-text="За выбранный период лидов нет"
    >
      <el-table-column prop="date" label="Дата" min-width="125" />
      <el-table-column prop="phone" label="Телефон" min-width="145" />
      <el-table-column prop="region" label="Регион" min-width="150" />
      <el-table-column prop="clientName" label="Клиент" min-width="180" />
      <el-table-column prop="clientAge" label="Возраст" min-width="100" />
    </el-table>

    <el-pagination
      v-model:current-page="page"
      :page-size="30"
      :total="total"
      layout="total, prev, pager, next"
      @current-change="load"
    />
  </el-card>
</template>

<script>
import dayjs from 'dayjs'
import PageHeader from '../components/PageHeader.vue'

export default {
  name: 'CallsProjectsView',
  components: { PageHeader },
  data() {
    return {
      range: [
        dayjs().startOf('month').format('YYYY-MM-DD'),
        dayjs().format('YYYY-MM-DD')
      ],
      rows: [],
      total: 0,
      page: 1,
      loading: false,
      error: '',
      requestId: 0
    }
  },
  methods: {
    async load() {
      if (!this.range || this.range.length !== 2) return

      const requestId = ++this.requestId
      this.loading = true
      this.error = ''

      try {
        const result = await this.$store.dispatch('getDataList', {
          col: 'api/calls-projects',
          params: { gte: this.range[0], lte: this.range[1], page: this.page }
        })

        if (requestId !== this.requestId) return
        this.rows = result.data || []
        this.total = result.total || 0
      } catch (error) {
        if (requestId !== this.requestId) return
        this.rows = []
        this.total = 0
        this.error = error.response?.data?.msg || error.message || 'Не удалось загрузить лидов'
      } finally {
        if (requestId === this.requestId) this.loading = false
      }
    },
    reload() {
      this.page = 1
      this.load()
    }
  },
  mounted() {
    this.load()
  }
}
</script>
